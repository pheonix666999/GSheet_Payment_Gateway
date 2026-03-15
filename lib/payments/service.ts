import { Prisma } from "@prisma/client";
import Stripe from "stripe";

import { AMOUNT_CENTS, CURRENCY, PAYMENT_PROVIDER } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { appendTransactionToGoogleSheet } from "@/lib/googleSheets";
import { getPaymentProvider } from "@/lib/paymentProvider";
import { transactionStatuses } from "@/lib/payments/status";
import { stripe } from "@/lib/stripe";
import type { UpsertTransactionInput } from "@/lib/paymentProvider";

function normalizeMobileNumber(mobileNumber: string) {
  const trimmed = mobileNumber.trim();
  const normalized = trimmed.startsWith("+")
    ? `+${trimmed.slice(1).replace(/\D/g, "")}`
    : trimmed.replace(/\D/g, "");

  const digitCount = normalized.replace(/\D/g, "").length;

  if (digitCount < 7 || digitCount > 15) {
    throw new Error("Please enter a valid mobile number.");
  }

  return normalized;
}

export async function createCheckoutSession(mobileNumber: string) {
  const normalizedMobileNumber = normalizeMobileNumber(mobileNumber);
  const provider = getPaymentProvider();
  const { providerSessionId, url } = await provider.createCheckoutSession(normalizedMobileNumber);

  await prisma.transaction.upsert({
    where: { providerSessionId },
    update: {
      mobileNumber: normalizedMobileNumber,
      amount: AMOUNT_CENTS,
      currency: CURRENCY,
      provider: PAYMENT_PROVIDER,
      status: transactionStatuses.pending
    },
    create: {
      mobileNumber: normalizedMobileNumber,
      amount: AMOUNT_CENTS,
      currency: CURRENCY,
      provider: PAYMENT_PROVIDER,
      providerSessionId,
      status: transactionStatuses.pending
    }
  });

  return { url };
}

export async function hasProcessedStripeEvent(eventId: string) {
  const processedEvent = await prisma.processedWebhookEvent.findUnique({
    where: { eventId },
    select: { id: true }
  });

  return Boolean(processedEvent);
}

export async function recordStripeEventProcessed(
  eventId: string,
  type: string,
  sessionId?: string | null
) {
  try {
    await prisma.processedWebhookEvent.create({
      data: {
        eventId,
        type,
        sessionId: sessionId ?? null
      }
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return;
    }

    throw error;
  }
}

export async function upsertTransactionFromStripeEvent(input: UpsertTransactionInput) {
  const baseData = {
    mobileNumber: input.mobileNumber ?? null,
    amount: AMOUNT_CENTS,
    currency: CURRENCY,
    provider: PAYMENT_PROVIDER,
    providerSessionId: input.providerSessionId,
    providerPaymentIntentId: input.providerPaymentIntentId ?? null,
    customerEmail: input.customerEmail ?? null,
    stripeEventId: input.stripeEventId ?? null,
    status: input.status
  };

  return prisma.transaction.upsert({
    where: { providerSessionId: input.providerSessionId },
    update: baseData,
    create: baseData
  });
}

export async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
  eventId: string
) {
  const mobileNumber =
    typeof session.metadata?.mobileNumber === "string"
      ? normalizeMobileNumber(session.metadata.mobileNumber)
      : session.customer_details?.phone ?? null;

  const transaction = await upsertTransactionFromStripeEvent({
    mobileNumber,
    providerSessionId: session.id,
    providerPaymentIntentId:
      typeof session.payment_intent === "string" ? session.payment_intent : null,
    customerEmail: session.customer_details?.email ?? session.customer_email ?? null,
    stripeEventId: eventId,
    status: transactionStatuses.paid
  });

  try {
    await appendTransactionToGoogleSheet({
      timestamp: transaction.updatedAt.toISOString(),
      mobileNumber: transaction.mobileNumber ?? null,
      amount: transaction.amount,
      currency: transaction.currency,
      status: transaction.status,
      provider: transaction.provider,
      providerSessionId: transaction.providerSessionId ?? null,
      providerPaymentIntentId: transaction.providerPaymentIntentId ?? null,
      customerEmail: transaction.customerEmail ?? null
    });
  } catch (error) {
    console.error("Google Sheets logging failed for checkout.session.completed", {
      providerSessionId: transaction.providerSessionId,
      message: error instanceof Error ? error.message : "Unknown Google Sheets error"
    });
  }
}

export async function handleCheckoutSessionExpired(
  session: Stripe.Checkout.Session,
  eventId: string
) {
  const existing = await prisma.transaction.findUnique({
    where: { providerSessionId: session.id }
  });

  if (!existing) {
    return;
  }

  await prisma.transaction.update({
    where: { providerSessionId: session.id },
    data: {
      status: transactionStatuses.expired,
      stripeEventId: eventId
    }
  });
}

export async function handlePaymentIntentFailed(
  paymentIntent: Stripe.PaymentIntent,
  eventId: string
) {
  let sessionId =
    typeof paymentIntent.metadata?.checkout_session_id === "string"
      ? paymentIntent.metadata.checkout_session_id
      : null;

  if (!sessionId) {
    const sessions = await stripe.checkout.sessions.list({
      payment_intent: paymentIntent.id,
      limit: 1
    });

    sessionId = sessions.data[0]?.id ?? null;
  }

  if (sessionId) {
    await prisma.transaction.updateMany({
      where: { providerSessionId: sessionId },
      data: {
        status: transactionStatuses.failed,
        providerPaymentIntentId: paymentIntent.id,
        stripeEventId: eventId
      }
    });

    return;
  }

  await prisma.transaction.updateMany({
    where: { providerPaymentIntentId: paymentIntent.id },
    data: {
      status: transactionStatuses.failed,
      stripeEventId: eventId
    }
  });
}
