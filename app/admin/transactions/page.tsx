import { prisma } from "@/lib/db";

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase()
  }).format(amount / 100);
}

export default async function AdminTransactionsPage() {
  const transactions = await prisma.transaction.findMany({
    orderBy: { createdAt: "desc" },
    take: 50
  });

  return (
    <section className="card stack">
      <span className="eyebrow">Admin</span>
      <h2>Latest 50 transactions</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Created</th>
              <th>Mobile Number</th>
              <th>Amount</th>
              <th>Currency</th>
              <th>Status</th>
              <th>Provider</th>
              <th>Provider Session ID</th>
              <th>Payment Intent ID</th>
              <th>Customer Email</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={9}>No transactions yet.</td>
              </tr>
            ) : (
              transactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td>{transaction.createdAt.toLocaleString()}</td>
                  <td>{transaction.mobileNumber ?? "-"}</td>
                  <td>{formatAmount(transaction.amount, transaction.currency)}</td>
                  <td>{transaction.currency.toUpperCase()}</td>
                  <td>
                    <span className={`status ${transaction.status}`}>{transaction.status}</span>
                  </td>
                  <td>{transaction.provider}</td>
                  <td>
                    <code>{transaction.providerSessionId ?? "-"}</code>
                  </td>
                  <td>
                    <code>{transaction.providerPaymentIntentId ?? "-"}</code>
                  </td>
                  <td>{transaction.customerEmail ?? "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
