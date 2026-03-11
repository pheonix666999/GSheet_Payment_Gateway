import { CheckoutButton } from "@/components/CheckoutButton";

export default function CheckoutPage() {
  return (
    <section className="card stack">
      <span className="eyebrow">Checkout</span>
      <h2>Pay $0.99 USD</h2>
      <p>
        The amount is fixed on the server and cannot be changed from the client.
        Stripe Checkout collects the payment details directly, so no card data is stored here.
      </p>
      <CheckoutButton />
    </section>
  );
}
