export default function SuccessPage({
  searchParams
}: {
  searchParams: { session_id?: string };
}) {
  return (
    <section className="card stack">
      <span className="eyebrow">Success</span>
      <div className="notice">
        <h2>Payment submitted</h2>
        <p>
          Stripe redirected back successfully. Final payment confirmation still depends on the
          webhook, which updates the transaction status in the database.
        </p>
      </div>
      {searchParams.session_id ? (
        <p>
          Session ID: <code>{searchParams.session_id}</code>
        </p>
      ) : null}
    </section>
  );
}
