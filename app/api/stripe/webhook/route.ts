import { NextResponse } from "next/server";
import Stripe from "stripe";

import {
  hasProcessedStripeEvent,
  handleCheckoutSessionCompleted,
  handleCheckoutSessionExpired,
  handlePaymentIntentFailed,
  recordStripeEventProcessed
} from "@/lib/payments/service";
import { env } from "@/lib/env";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header." }, { status: 400 });
  }

  const rawBody = await req.text();

  try {
    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      env.STRIPE_WEBHOOK_SECRET
    );

    let sessionId: string | null = null;

    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.expired"
    ) {
      sessionId = (event.data.object as Stripe.Checkout.Session).id;
    }

    if (event.type === "payment_intent.payment_failed") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      sessionId =
        typeof paymentIntent.metadata?.checkout_session_id === "string"
          ? paymentIntent.metadata.checkout_session_id
          : null;
    }

    console.info("Stripe webhook received", {
      eventId: event.id,
      type: event.type,
      sessionId
    });

    const alreadyProcessed = await hasProcessedStripeEvent(event.id);

    if (alreadyProcessed) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event.data.object, event.id);
        break;
      case "checkout.session.expired":
        await handleCheckoutSessionExpired(event.data.object, event.id);
        break;
      case "payment_intent.payment_failed":
        await handlePaymentIntentFailed(event.data.object, event.id);
        break;
      default:
        break;
    }

    await recordStripeEventProcessed(event.id, event.type, sessionId);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook error", error);
    return NextResponse.json({ error: "Webhook Error" }, { status: 400 });
  }
}
