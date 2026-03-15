"use client";

import { useState } from "react";

export function CheckoutButton() {
  const [loading, setLoading] = useState(false);
  const [mobileNumber, setMobileNumber] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout() {
    setLoading(true);
    setError(null);

    try {
      if (!mobileNumber.trim()) {
        throw new Error("Mobile number is required.");
      }

      const response = await fetch("/api/payments/checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ mobileNumber })
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
      <label className="field">
        <span>Mobile Number</span>
        <input
          className="input"
          type="tel"
          name="mobileNumber"
          placeholder="+1 555 123 4567"
          autoComplete="tel"
          value={mobileNumber}
          onChange={(event) => setMobileNumber(event.target.value)}
          disabled={loading}
        />
      </label>
      <button type="button" className="button" onClick={handleCheckout} disabled={loading}>
        {loading ? "Redirecting..." : "Pay $0.99"}
      </button>
      {error ? <p>{error}</p> : null}
    </div>
  );
}
