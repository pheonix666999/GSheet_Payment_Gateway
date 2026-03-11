export const transactionStatuses = {
  pending: "pending",
  paid: "paid",
  expired: "expired",
  failed: "failed"
} as const;

export type TransactionStatus =
  (typeof transactionStatuses)[keyof typeof transactionStatuses];
