"use client";

import { useState } from "react";

export function CheckoutButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/payments/checkout-session", {
        method: "POST"
      });

      const data = (await response.json()) as { error?: string; url?: string };

      if (!response.ok || !data.url) {
        throw new Error(data.error ?? "Failed to create checkout session.");
      }

      window.location.href = data.url;
    } catch (err) {
      setLoading(false);
      setError(err instanceof Error ? err.message : "Unexpected checkout error.");
    }
  }

  return (
    <div className="stack">
      <button type="button" className="button" onClick={handleCheckout} disabled={loading}>
        {loading ? "Redirecting..." : "Pay $0.99"}
      </button>
      {error ? <p>{error}</p> : null}
    </div>
  );
}
