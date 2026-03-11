import { NextResponse } from "next/server";

import { createCheckoutSession } from "@/lib/payments/service";

export async function POST() {
  try {
    const session = await createCheckoutSession();
    return NextResponse.json(session);
  } catch (error) {
    console.error("Failed to create checkout session", error);

    return NextResponse.json(
      { error: "Unable to create checkout session." },
      { status: 500 }
    );
  }
}
