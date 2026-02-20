import { headers } from "next/headers";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";
import type { InsertTables, UpdateTables } from "@/types/database";
import { completeReferralOnSubscription } from "@/lib/referral/service";
import { getPlanByPriceId } from "@/lib/plans/service";

type SubscriptionStatus = InsertTables<"subscriptions">["status"];

function mapStripeStatus(status: Stripe.Subscription["status"]): SubscriptionStatus {
  const statusMap: Record<string, SubscriptionStatus> = {
    active: "active",
    canceled: "canceled",
    incomplete: "incomplete",
    incomplete_expired: "incomplete_expired",
    past_due: "past_due",
    trialing: "trialing",
    unpaid: "unpaid",
    paused: "paused",
  };
  return statusMap[status] ?? "incomplete";
}

async function resolvePlanId(priceId: string, metadata?: { planId?: string }): Promise<string | null> {
  if (metadata?.planId) {
    return metadata.planId;
  }
  const plan = await getPlanByPriceId(priceId);
  return plan?.id ?? null;
}

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  const supabase = createAdminClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.mode === "subscription" && session.subscription) {
          const subscriptionId = typeof session.subscription === "string"
            ? session.subscription
            : session.subscription.id;

          const subscriptionResponse = await stripe.subscriptions.retrieve(subscriptionId);

          const userId = session.metadata?.userId;

          if (!userId) {
            console.error("No userId in session metadata");
            break;
          }

          // Handle both old and new Stripe API response formats
          const sub = subscriptionResponse as unknown as {
            id: string;
            customer: string | { id: string };
            status: Stripe.Subscription["status"];
            metadata?: { planId?: string };
            items: { data: Array<{ price: { id: string } }> };
            current_period_start?: number;
            current_period_end?: number;
            cancel_at_period_end?: boolean;
          };

          const priceId = sub.items.data[0].price.id;
          const planId = await resolvePlanId(priceId, session.metadata as { planId?: string });

          const subscriptionData: InsertTables<"subscriptions"> = {
            id: sub.id,
            user_id: userId,
            plan_id: planId,
            stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
            stripe_price_id: priceId,
            status: mapStripeStatus(sub.status),
            current_period_start: sub.current_period_start
              ? new Date(sub.current_period_start * 1000).toISOString()
              : null,
            current_period_end: sub.current_period_end
              ? new Date(sub.current_period_end * 1000).toISOString()
              : null,
            cancel_at_period_end: sub.cancel_at_period_end ?? false,
          };

          await supabase.from("subscriptions").upsert(subscriptionData);

          // Complete pending referral and award credits
          try {
            await completeReferralOnSubscription(userId);
          } catch (err) {
            console.error("Failed to complete referral:", err);
          }

          console.log("Subscription created:", sub.id);
        }
        break;
      }

      case "customer.subscription.created": {
        // Handle subscriptions created via Customer Portal
        const newSub = event.data.object as unknown as {
          id: string;
          customer: string | { id: string };
          status: Stripe.Subscription["status"];
          metadata?: { userId?: string; planId?: string };
          items: { data: Array<{ price: { id: string } }> };
          current_period_start?: number;
          current_period_end?: number;
          cancel_at_period_end?: boolean;
        };

        const customerId = typeof newSub.customer === "string"
          ? newSub.customer
          : newSub.customer.id;

        // Try to get userId from subscription metadata first
        let userId = newSub.metadata?.userId;

        // If not in metadata, look up from Stripe customer metadata
        if (!userId) {
          const customer = await stripe.customers.retrieve(customerId);
          if (customer && !customer.deleted) {
            userId = (customer as Stripe.Customer).metadata?.user_id;
          }
        }

        // If still no userId, look up from existing subscriptions in DB
        if (!userId) {
          const { data: existingSub } = await supabase
            .from("subscriptions")
            .select("user_id")
            .eq("stripe_customer_id", customerId)
            .single();
          userId = existingSub?.user_id ?? undefined;
        }

        if (!userId) {
          console.error("Could not determine userId for subscription:", newSub.id);
          break;
        }

        const priceId = newSub.items.data[0].price.id;
        const planId = await resolvePlanId(priceId, newSub.metadata);

        const subscriptionData: InsertTables<"subscriptions"> = {
          id: newSub.id,
          user_id: userId,
          plan_id: planId,
          stripe_customer_id: customerId,
          stripe_price_id: priceId,
          status: mapStripeStatus(newSub.status),
          current_period_start: newSub.current_period_start
            ? new Date(newSub.current_period_start * 1000).toISOString()
            : null,
          current_period_end: newSub.current_period_end
            ? new Date(newSub.current_period_end * 1000).toISOString()
            : null,
          cancel_at_period_end: newSub.cancel_at_period_end ?? false,
        };

        await supabase.from("subscriptions").upsert(subscriptionData);
        console.log("Subscription created via portal:", newSub.id);
        break;
      }

      case "customer.subscription.updated": {
        const eventSub = event.data.object as unknown as {
          id: string;
          customer: string | { id: string };
          status: Stripe.Subscription["status"];
          metadata?: { userId?: string; planId?: string };
          items: { data: Array<{ price: { id: string } }> };
          current_period_start?: number;
          current_period_end?: number;
          cancel_at_period_end?: boolean;
        };

        const priceId = eventSub.items.data[0].price.id;
        const planId = await resolvePlanId(priceId, eventSub.metadata);

        // Check if subscription exists in DB
        const { data: existingSub } = await supabase
          .from("subscriptions")
          .select("id")
          .eq("id", eventSub.id)
          .single();

        if (!existingSub) {
          // Subscription doesn't exist, create it (might have been created via portal)
          const customerId = typeof eventSub.customer === "string"
            ? eventSub.customer
            : eventSub.customer.id;

          let userId = eventSub.metadata?.userId;

          if (!userId) {
            const customer = await stripe.customers.retrieve(customerId);
            if (customer && !customer.deleted) {
              userId = (customer as Stripe.Customer).metadata?.user_id;
            }
          }

          if (userId) {
            const subscriptionData: InsertTables<"subscriptions"> = {
              id: eventSub.id,
              user_id: userId,
              plan_id: planId,
              stripe_customer_id: customerId,
              stripe_price_id: priceId,
              status: mapStripeStatus(eventSub.status),
              current_period_start: eventSub.current_period_start
                ? new Date(eventSub.current_period_start * 1000).toISOString()
                : null,
              current_period_end: eventSub.current_period_end
                ? new Date(eventSub.current_period_end * 1000).toISOString()
                : null,
              cancel_at_period_end: eventSub.cancel_at_period_end ?? false,
            };

            await supabase.from("subscriptions").upsert(subscriptionData);
            console.log("Subscription created from update event:", eventSub.id);
            break;
          }
        }

        const updateData: UpdateTables<"subscriptions"> = {
          status: mapStripeStatus(eventSub.status),
          stripe_price_id: priceId,
          plan_id: planId,
          current_period_start: eventSub.current_period_start
            ? new Date(eventSub.current_period_start * 1000).toISOString()
            : undefined,
          current_period_end: eventSub.current_period_end
            ? new Date(eventSub.current_period_end * 1000).toISOString()
            : undefined,
          cancel_at_period_end: eventSub.cancel_at_period_end,
        };

        await supabase
          .from("subscriptions")
          .update(updateData)
          .eq("id", eventSub.id);

        console.log("Subscription updated:", eventSub.id);
        break;
      }

      case "customer.subscription.deleted": {
        const deletedSub = event.data.object as { id: string };

        await supabase
          .from("subscriptions")
          .update({ status: "canceled" as const })
          .eq("id", deletedSub.id);

        console.log("Subscription canceled:", deletedSub.id);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as { subscription?: string };
        console.log(
          "Payment failed for subscription:",
          invoice.subscription ?? "unknown"
        );
        // TODO: Send notification to user
        break;
      }

      default:
        console.log("Unhandled event type:", event.type);
    }
  } catch (error) {
    console.error("Error processing webhook:", error);
    return new Response("Error processing webhook", { status: 500 });
  }

  return new Response("OK", { status: 200 });
}
