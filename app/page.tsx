import Link from "next/link";

import { AMOUNT_CENTS } from "@/lib/constants";

const amount = (AMOUNT_CENTS / 100).toFixed(2);

export default function HomePage() {
  return (
    <section className="hero">
      <span className="eyebrow">Production-ready baseline</span>
      <h1>Fixed-price Stripe Checkout with webhook-backed confirmation.</h1>
      <p>
        This app creates a server-side Stripe Checkout Session for exactly ${amount} USD,
        stores transactions with Prisma, and uses the webhook as the payment source of truth.
      </p>
      <div>
        <Link href="/checkout" className="button">
          Open checkout
        </Link>
      </div>
    </section>
  );
}
