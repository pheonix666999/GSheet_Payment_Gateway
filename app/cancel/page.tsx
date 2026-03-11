import Link from "next/link";

export default function CancelPage() {
  return (
    <section className="card stack">
      <span className="eyebrow">Canceled</span>
      <div className="notice cancel">
        <h2>Payment canceled</h2>
        <p>The Stripe Checkout session was canceled or abandoned before payment completed.</p>
      </div>
      <div>
        <Link href="/checkout" className="button secondary">
          Try again
        </Link>
      </div>
    </section>
  );
}
