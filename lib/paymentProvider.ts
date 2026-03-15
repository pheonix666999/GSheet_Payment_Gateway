import { stripePaymentProvider } from "@/lib/stripe";
import type { TransactionStatus } from "@/lib/payments/status";

export type CheckoutSessionPayload = {
  url: string;
  providerSessionId: string;
};

export type PaymentProvider = {
  createCheckoutSession(mobileNumber: string): Promise<CheckoutSessionPayload>;
};

export type UpsertTransactionInput = {
  mobileNumber?: string | null;
  providerSessionId: string;
  providerPaymentIntentId?: string | null;
  customerEmail?: string | null;
  status: TransactionStatus;
  stripeEventId?: string | null;
};

export function getPaymentProvider(): PaymentProvider {
  return stripePaymentProvider;
}
