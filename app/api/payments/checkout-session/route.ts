import { NextResponse } from "next/server";

import { createCheckoutSession } from "@/lib/payments/service";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { mobileNumber?: string };

    if (!body.mobileNumber) {
      return NextResponse.json({ error: "Mobile number is required." }, { status: 400 });
    }

    const session = await createCheckoutSession(body.mobileNumber);
    return NextResponse.json(session);
  } catch (error) {
    console.error("Failed to create checkout session", error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create checkout session." },
      { status: 500 }
    );
  }
}
