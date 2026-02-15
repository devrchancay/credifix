import { NextResponse } from "next/server";
import { getPlans } from "@/lib/plans/service";
import { handleApiError } from "@/lib/api/errors";

export async function GET() {
  try {
    const plans = await getPlans();

    return NextResponse.json({ plans });
  } catch (error) {
    return handleApiError(error);
  }
}
