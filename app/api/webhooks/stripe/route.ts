import { headers } from "next/headers";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";
import type { InsertTables, UpdateTables } from "@/types/database";

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
            items: { data: Array<{ price: { id: string } }> };
            current_period_start?: number;
            current_period_end?: number;
            cancel_at_period_end?: boolean;
          };

          const subscriptionData: InsertTables<"subscriptions"> = {
            id: sub.id,
            user_id: userId,
            stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
            stripe_price_id: sub.items.data[0].price.id,
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

          console.log("Subscription created:", sub.id);
        }
        break;
      }

      case "customer.subscription.updated": {
        const eventSub = event.data.object as unknown as {
          id: string;
          status: Stripe.Subscription["status"];
          items: { data: Array<{ price: { id: string } }> };
          current_period_start?: number;
          current_period_end?: number;
          cancel_at_period_end?: boolean;
        };

        const updateData: UpdateTables<"subscriptions"> = {
          status: mapStripeStatus(eventSub.status),
          stripe_price_id: eventSub.items.data[0].price.id,
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
