import { createSign } from "crypto";

import { env } from "@/lib/env";

type GoogleSheetTransactionRow = {
  timestamp: string;
  mobileNumber: string | null;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  providerSessionId: string | null;
  providerPaymentIntentId: string | null;
  customerEmail: string | null;
};

const GOOGLE_SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

function base64UrlEncode(value: string) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function getGoogleServiceAccountConfig() {
  const serviceAccountEmail = env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const sheetId = env.GOOGLE_SHEET_ID;

  if (!serviceAccountEmail || !privateKey || !sheetId) {
    throw new Error(
      "Google Sheets env vars are missing. Expected GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, and GOOGLE_SHEET_ID."
    );
  }

  return { serviceAccountEmail, privateKey, sheetId };
}

async function getGoogleAccessToken() {
  const { serviceAccountEmail, privateKey } = getGoogleServiceAccountConfig();
  const now = Math.floor(Date.now() / 1000);

  const header = base64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64UrlEncode(
    JSON.stringify({
      iss: serviceAccountEmail,
      scope: GOOGLE_SHEETS_SCOPE,
      aud: GOOGLE_TOKEN_ENDPOINT,
      exp: now + 3600,
      iat: now
    })
  );

  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${payload}`);
  signer.end();

  const signature = signer
    .sign(privateKey, "base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

  const assertion = `${header}.${payload}.${signature}`;
  const tokenResponse = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion
    })
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new Error(`Google token request failed: ${tokenResponse.status} ${errorText}`);
  }

  const tokenData = (await tokenResponse.json()) as { access_token?: string };

  if (!tokenData.access_token) {
    throw new Error("Google token response did not include an access_token.");
  }

  return tokenData.access_token;
}

export async function appendTransactionToGoogleSheet(row: GoogleSheetTransactionRow) {
  const { sheetId } = getGoogleServiceAccountConfig();
  const accessToken = await getGoogleAccessToken();

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A:I:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        values: [
          [
            row.timestamp,
            row.mobileNumber ?? "",
            (row.amount / 100).toFixed(2),
            row.currency.toUpperCase(),
            row.status,
            row.provider,
            row.providerSessionId ?? "",
            row.providerPaymentIntentId ?? "",
            row.customerEmail ?? ""
          ]
        ]
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Sheets append failed: ${response.status} ${errorText}`);
  }
}
