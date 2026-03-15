# Stripe Checkout + Prisma + Google Sheets

This project is a Next.js 14 App Router application that implements a fixed-price Stripe Checkout flow for a `$0.99 USD` payment.

It includes:

- Stripe Checkout session creation
- Stripe webhook verification as the payment source of truth
- Mobile number capture before payment
- Prisma transaction storage
- Prisma Postgres database support for deployment
- Google Sheets logging for successful payments
- Checkout, success, cancel, and admin transaction pages

The system is designed so the payment provider can be swapped later without rewriting the entire app.

## Features

- Fixed server-side amount only: `AMOUNT_CENTS = 99`
- Client never sends the amount
- No card data is stored anywhere in the app
- Stripe Checkout is used for payment collection
- Webhook verifies payment outcome
- Successful transactions are mirrored to Google Sheets
- Duplicate webhook events are handled safely
- Admin page shows the latest 50 transactions
- Mobile number is stored and mirrored to Google Sheets on successful payment

## Project structure

Key files:

- `app/api/payments/checkout-session/route.ts`
  Creates Stripe Checkout Sessions
- `app/api/stripe/webhook/route.ts`
  Verifies and processes Stripe webhook events
- `app/checkout/page.tsx`
  Checkout page with pay button
- `app/success/page.tsx`
  Success/submitted page
- `app/cancel/page.tsx`
  Cancel page
- `app/admin/transactions/page.tsx`
  Admin transaction table
- `lib/stripe.ts`
  Stripe SDK initialization and Stripe provider implementation
- `lib/paymentProvider.ts`
  Payment abstraction
- `lib/payments/service.ts`
  Payment transaction lifecycle logic
- `lib/googleSheets.ts`
  Google Sheets append helper
- `lib/db.ts`
  Prisma client
- `prisma/schema.prisma`
  Database schema

## How the flow works

### Checkout flow

1. User opens `/checkout`
2. User enters a mobile number
3. User clicks `Pay $0.99`
4. Frontend calls `POST /api/payments/checkout-session`
5. Server validates and normalizes the mobile number
6. Server creates a Stripe Checkout Session
7. Server creates or updates a `pending` transaction row
8. Browser redirects to Stripe Checkout

### Success flow

1. Stripe redirects user to `/success`
2. This page is informational only
3. Payment is not trusted from redirect alone
4. Final status is determined by webhook processing

### Webhook flow

Stripe sends events to:

```text
/api/stripe/webhook
```

The webhook:

- verifies the `stripe-signature`
- reads raw request body using `req.text()`
- handles only trusted Stripe events
- prevents duplicate processing using the stored event id

Handled events:

- `checkout.session.completed`
  - marks transaction `paid`
  - stores the mobile number
  - saves session id
  - saves payment intent id
  - saves customer email if available
  - appends one row to Google Sheets
- `checkout.session.expired`
  - marks matching transaction `expired`
- `payment_intent.payment_failed`
  - marks matching transaction `failed`

### Google Sheets logging flow

Google Sheets logging only happens from the webhook on:

```text
checkout.session.completed
```

If Google Sheets logging fails:

- the webhook still returns success
- the database transaction still remains saved
- an error is logged safely

## Environment variables

Create `.env.local` for local use and keep `.env` available for Prisma CLI commands if needed.

Required variables:

```env
DATABASE_URL="prisma+postgres://accelerate.prisma-data.net/?api_key=YOUR_PRISMA_POSTGRES_API_KEY"
STRIPE_SECRET_KEY="sk_live_or_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_or_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
APP_URL="http://localhost:3000"
GOOGLE_SERVICE_ACCOUNT_EMAIL="service-account@project-id.iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEET_ID="your_google_sheet_id"
```

The mobile number is collected from the checkout page and validated server-side before the Stripe session is created.

### What each variable is for

- `DATABASE_URL`
  Prisma Postgres connection string
- `STRIPE_SECRET_KEY`
  Server-side Stripe secret key
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
  Public Stripe publishable key
- `STRIPE_WEBHOOK_SECRET`
  Stripe webhook signing secret
- `APP_URL`
  Base URL for success and cancel redirects
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
  Google service account email for Sheets access
- `GOOGLE_PRIVATE_KEY`
  Google service account private key
- `GOOGLE_SHEET_ID`
  Target Google Sheet ID

## Local development

Install dependencies:

```bash
npm install
```

Generate Prisma client:

```bash
npm run prisma:generate
```

Push schema to the database:

```bash
npx prisma db push
```

Start development server:

```bash
npm run dev
```

Build production bundle locally:

```bash
npm run build
```

## Stripe setup

### Local Stripe webhook testing

Authenticate Stripe CLI:

```bash
stripe login
```

Forward Stripe webhooks to the local app:

```bash
stripe listen --forward-to http://localhost:3000/api/stripe/webhook
```

Stripe CLI will print a webhook secret like:

```text
whsec_...
```

Put that value into:

- `STRIPE_WEBHOOK_SECRET` in `.env.local`
- `STRIPE_WEBHOOK_SECRET` in `.env`

Then restart the app.

### Test card

Use this Stripe test card:

```text
4242 4242 4242 4242
```

Use:

- any future expiry date
- any CVC
- any ZIP/postal code

## Google Sheets setup

Google Sheets logging requires all three Google env vars.

### Step 1: Create a Google Cloud service account

In Google Cloud Console:

1. Create or select a project
2. Enable the Google Sheets API
3. Create a service account
4. Create a JSON key for that service account

From the JSON file:

- `client_email` -> `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `private_key` -> `GOOGLE_PRIVATE_KEY`

### Step 2: Share the Google Sheet

Open the target Google Sheet and share it with:

```text
GOOGLE_SERVICE_ACCOUNT_EMAIL
```

Grant `Editor` access.

### Step 3: Get the Sheet ID

From a Google Sheet URL like:

```text
https://docs.google.com/spreadsheets/d/SHEET_ID/edit#gid=0
```

Copy the part between `/d/` and `/edit` into:

```text
GOOGLE_SHEET_ID
```

### Step 4: Create the header row

Create the first row in this exact order:

```text
timestamp | mobile number | amount | currency | status | provider | providerSessionId | providerPaymentIntentId | customerEmail
```

## Admin page

The admin page is:

```text
/admin/transactions
```

It shows the latest 50 transactions with:

- createdAt
- mobileNumber
- amount
- currency
- status
- provider
- providerSessionId
- providerPaymentIntentId
- customerEmail

## Deployment on Vercel

### 1. Push the project to GitHub

Make sure `.env` and `.env.local` are not committed.

### 2. Import into Vercel

Import the GitHub repo into Vercel.

Framework should auto-detect as:

```text
Next.js
```

### 3. Add Vercel environment variables

Add all of these in Vercel Project Settings -> Environment Variables:

- `DATABASE_URL`
- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `APP_URL`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PRIVATE_KEY`
- `GOOGLE_SHEET_ID`

### 4. Set APP_URL

Set:

```text
APP_URL=https://your-project.vercel.app
```

### 5. Create Stripe production webhook

In Stripe Dashboard, create a webhook endpoint:

```text
https://your-project.vercel.app/api/stripe/webhook
```

Subscribe to:

- `checkout.session.completed`
- `checkout.session.expired`
- `payment_intent.payment_failed`

Copy the webhook signing secret and set it as:

```text
STRIPE_WEBHOOK_SECRET
```

in Vercel.

### 6. Redeploy

After env vars and webhook are configured, redeploy the project.

## How to test locally

1. Start app on `http://localhost:3000`
2. Start Stripe webhook forwarding
3. Open:

```text
http://localhost:3000/checkout
```

4. Click `Pay $0.99`
5. Complete payment on Stripe Checkout
6. Confirm the mobile number was captured in the admin table after webhook processing
7. Confirm redirect to:

```text
/success
```

8. Open:

```text
http://localhost:3000/admin/transactions
```

9. Verify transaction status becomes `paid`
10. Check Google Sheet for one appended row including the mobile number

## How to test in production

1. Open:

```text
https://your-project.vercel.app/checkout
```

2. Click `Pay $0.99`
3. Enter a mobile number
4. Complete the payment
5. Confirm redirect to `/success`
6. Open:

```text
https://your-project.vercel.app/admin/transactions
```

7. Verify the transaction row exists, includes the mobile number, and status is `paid`
8. Open the connected Google Sheet
9. Verify one new row was added including the mobile number

## Verification checklist

- Checkout page loads
- Checkout button redirects to Stripe
- Mobile number is required before checkout starts
- Session is created server-side only
- Amount stays fixed at `$0.99`
- Success page is reached after payment
- Webhook marks transaction `paid`
- Cancel flow reaches `/cancel`
- Cancel flow does not mark the payment `paid`
- Failed payment webhook marks transaction `failed`
- Duplicate webhook events do not duplicate processing
- Admin page shows latest transactions
- Successful payments append one row to Google Sheets including the mobile number

## Security notes

- Card details are never stored in the app
- Payment amount is never accepted from the client
- Stripe webhook is the source of truth
- Google Sheets logging happens only on the server
- Secrets must never be committed to Git

## Operational notes

- Rotate exposed keys before client handoff
- If Stripe CLI webhook secret changes, update local env files
- If production webhook secret changes, update Vercel env vars
- If Google Sheets append fails, payment processing still succeeds

## Recommended client handoff checks

Before delivering to the client, confirm:

- Vercel deployment is green
- Stripe production webhook is active
- Google Sheet is shared with the service account
- One live or test transaction completes successfully
- Admin page shows the recorded transaction
- Google Sheet contains the appended row
