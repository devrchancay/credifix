import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent, clerkClient } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ROLES } from "@/types/roles";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error("Please add CLERK_WEBHOOK_SECRET to your .env.local");
  }

  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  const supabase = createAdminClient();
  const eventType = evt.type;

  try {
    switch (eventType) {
      case "user.created": {
        const { id, email_addresses, first_name, last_name, image_url } = evt.data;
        const email = email_addresses[0]?.email_address;
        const fullName = `${first_name ?? ""} ${last_name ?? ""}`.trim();

        // Assign default role
        const clerk = await clerkClient();
        await clerk.users.updateUserMetadata(id, {
          publicMetadata: {
            role: ROLES.USER,
          },
        });

        await supabase.from("profiles").insert({
          id,
          email: email ?? "",
          full_name: fullName || null,
          avatar_url: image_url ?? null,
        });

        console.log("User created in Supabase with role:", { id, email, role: ROLES.USER });
        break;
      }

      case "user.updated": {
        const { id, email_addresses, first_name, last_name, image_url } = evt.data;
        const email = email_addresses[0]?.email_address;
        const fullName = `${first_name ?? ""} ${last_name ?? ""}`.trim();

        await supabase
          .from("profiles")
          .update({
            email: email ?? "",
            full_name: fullName || null,
            avatar_url: image_url ?? null,
          })
          .eq("id", id);

        console.log("User updated in Supabase:", { id, email });
        break;
      }

      case "user.deleted": {
        const { id } = evt.data;

        if (id) {
          await supabase.from("profiles").delete().eq("id", id);
          console.log("User deleted from Supabase:", { id });
        }
        break;
      }

      default:
        console.log("Unhandled webhook event:", eventType);
    }
  } catch (error) {
    console.error("Error processing webhook:", error);
    return new Response("Error processing webhook", { status: 500 });
  }

  return new Response("OK", { status: 200 });
}
