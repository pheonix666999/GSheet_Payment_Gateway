# Stripe Checkout Demo

Minimal Next.js 14 App Router project with a fixed-price Stripe Checkout flow, verified webhooks, Prisma transaction logging, and an admin transaction view.

## Environment variables

Create `.env.local` in the project root:

```env
DATABASE_URL="prisma+postgres://accelerate.prisma-data.net/?api_key=YOUR_PRISMA_POSTGRES_API_KEY"
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
APP_URL="http://localhost:3000"
GOOGLE_SERVICE_ACCOUNT_EMAIL="service-account@project-id.iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEET_ID="your_google_sheet_id"
```

For Prisma Postgres:

1. Create a free Prisma Postgres database from the Prisma Data Platform.
2. Copy the provided Prisma Postgres connection string.
3. Paste it into `DATABASE_URL` in `.env.local` and `.env`.

## Install and run

```bash
npm install
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run dev
```

App URLs:

- Checkout page: `http://localhost:3000/checkout`
- Admin transactions: `http://localhost:3000/admin/transactions`

## Prisma commands

Generate Prisma client:

```bash
npm run prisma:generate
```

Create/apply local migration:

```bash
npm run prisma:migrate -- --name init
```

If you just want to sync the schema quickly instead of creating a migration:

```bash
npx prisma db push
```

## Stripe CLI

Authenticate and forward webhook events to the local app:

```bash
stripe login
stripe listen --forward-to http://localhost:3000/api/stripe/webhook
```

Copy the printed webhook signing secret into `STRIPE_WEBHOOK_SECRET`.

## Google Sheets logging

Google Sheets logging runs only from the Stripe webhook on `checkout.session.completed`.
If Google Sheets append fails, the webhook still returns success and the database transaction remains saved.

### Setup

1. Create a Google Cloud service account.
2. Enable the Google Sheets API for that project.
3. Create or open the target Google Sheet.
4. Share the sheet with `GOOGLE_SERVICE_ACCOUNT_EMAIL` as an editor.
5. Add these env vars to `.env.local`, `.env`, and Vercel:
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_PRIVATE_KEY`
   - `GOOGLE_SHEET_ID`

### Expected columns

Create the sheet header row in this order:

```text
timestamp | amount | currency | status | provider | providerSessionId | providerPaymentIntentId | customerEmail
```

## Deploy to Vercel

Set these environment variables in Vercel:

- `DATABASE_URL`
- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `APP_URL`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PRIVATE_KEY`
- `GOOGLE_SHEET_ID`

Set `APP_URL` to your Vercel production domain, then create a Stripe webhook endpoint at:

```text
https://your-domain.com/api/stripe/webhook
```

Use that production webhook secret in Vercel. Do not reuse the local Stripe CLI webhook secret in production.

## Test payment

Use the checkout button on `/checkout`, then complete payment in Stripe Checkout with:

```text
4242 4242 4242 4242
```

Use any valid future expiry date, any CVC, and any ZIP/postal code Stripe accepts in test mode.

## Verify transactions

1. Open `/admin/transactions`.
2. Confirm a new row is created as `pending` when the checkout session is created.
3. Complete or fail the payment in Stripe Checkout.
4. Confirm the webhook updates the row to `paid`, `expired`, or `failed`.

## Notes

- The charged amount is fixed server-side at `AMOUNT_CENTS = 99`.
- The client never sends or controls the amount.
- Card details are handled only by Stripe Checkout and are never stored in this app.
- The success page is informational only; webhook processing is the payment source of truth.
