import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/roles";
import { getStripe } from "@/lib/stripe/client";
import type Stripe from "stripe";

export async function GET() {
  const hasAccess = await isAdmin();

  if (!hasAccess) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const stripe = getStripe();
    const pricesList = await stripe.prices.list({
      active: true,
      expand: ["data.product"],
      limit: 100,
    });

    const prices = pricesList.data
      .filter((price) => price.type === "recurring" && price.recurring)
      .map((price) => {
        const product = price.product as Stripe.Product;
        return {
          id: price.id,
          product_name: product.name,
          amount: (price.unit_amount ?? 0) / 100,
          currency: price.currency,
          interval: price.recurring!.interval,
          interval_count: price.recurring!.interval_count,
        };
      });

    return NextResponse.json({ prices });
  } catch (error) {
    console.error("Error fetching Stripe prices:", error);
    return NextResponse.json(
      { error: "Failed to fetch Stripe prices" },
      { status: 500 }
    );
  }
}
