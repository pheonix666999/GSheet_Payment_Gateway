import Stripe from "stripe";

import { AMOUNT_CENTS, CURRENCY } from "@/lib/constants";
import { env } from "@/lib/env";
import type { CheckoutSessionPayload, PaymentProvider } from "@/lib/paymentProvider";

export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20"
});

export const stripePaymentProvider: PaymentProvider = {
  async createCheckoutSession(mobileNumber: string): Promise<CheckoutSessionPayload> {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      phone_number_collection: {
        enabled: true
      },
      metadata: {
        mobileNumber
      },
      success_url: `${env.APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.APP_URL}/cancel`,
      line_items: [
        {
          price_data: {
            currency: CURRENCY,
            product_data: {
              name: "One-time payment"
            },
            unit_amount: AMOUNT_CENTS
          },
          quantity: 1
        }
      ]
    });

    if (!session.url) {
      throw new Error("Stripe Checkout Session URL was not returned.");
    }

    return {
      url: session.url,
      providerSessionId: session.id
    };
  }
};
