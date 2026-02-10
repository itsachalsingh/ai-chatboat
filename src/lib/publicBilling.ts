import { createHmac, randomUUID } from "crypto";
import { z } from "zod";
import { env } from "../env.js";

function normalizeBaseUrl(url: string) {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

const portalBaseUrl = normalizeBaseUrl(env.UTTARAJAL_PORTAL_BASE_URL ?? env.UTTARAJAL_API_BASE_URL);

const cachedClientId = env.UTTARAJAL_PUBLIC_CLIENT_ID ?? randomUUID();

function buildBillingPublicHeaders(rawBody = "") {
  const secret = env.UTTARAJAL_PUBLIC_API_SECRET ?? "";
  const ts = Math.floor(Date.now() / 1000).toString();
  const nonce = Math.random().toString(36).substring(2, 20);
  const message = `${ts}.${nonce}.${rawBody}`;
  const signature = secret ? createHmac("sha256", secret).update(message).digest("hex") : "";

  const headers: Record<string, string> = {
    "x-timestamp": ts,
    "x-nonce": nonce,
    "x-client-id": cachedClientId
  };
  if (signature) {
    headers["x-signature"] = signature;
  }
  return headers;
}

const publicBillingSchema = z
  .object({
    consumer: z
      .object({
        name: z.string().optional(),
        number: z.string().optional(),
        division: z.string().optional(),
        district: z.string().optional(),
        area: z.string().optional(),
        address: z.string().optional(),
        billType: z.string().optional(),
        phone_number: z.string().optional()
      })
      .passthrough()
      .optional(),
    bill: z
      .object({
        billNumber: z.string().optional(),
        demandNumber: z.string().optional(),
        dueDate: z.string().optional(),
        months: z.string().optional(),
        status: z.string().optional(),
        // Portal uses paise as integer.
        amount: z.number().optional()
      })
      .passthrough()
      .optional(),
    billDate: z.string().optional(),
    pdfPath: z.string().optional(),
    departmentId: z.string().optional()
  })
  .passthrough();

export type PublicBilling = z.infer<typeof publicBillingSchema>;

export type PublicBillingResult =
  | { ok: true; data: PublicBilling }
  | { ok: false; code: string; message: string };

export async function getPublicBillingById(id: string): Promise<PublicBillingResult> {
  const url = `${portalBaseUrl}/billing/api/public/billing/${encodeURIComponent(id)}`;
  const headers = buildBillingPublicHeaders("");

  const res = await fetch(url, { headers });
  const text = await res.text();

  if (!res.ok) {
    // Billing service tends to respond with JSON, but keep this defensive.
    try {
      const parsed = JSON.parse(text) as { code?: string; message?: string; error?: string };
      return {
        ok: false,
        code: parsed.code || "BILLING_FETCH_FAILED",
        message: parsed.message || parsed.error || "Failed to fetch billing details"
      };
    } catch {
      return { ok: false, code: "BILLING_FETCH_FAILED", message: `Failed to fetch billing details (${res.status})` };
    }
  }

  try {
    const json = JSON.parse(text);
    return { ok: true, data: publicBillingSchema.parse(json) };
  } catch (e) {
    return { ok: false, code: "BILLING_PARSE_FAILED", message: "Billing response was not in expected format" };
  }
}

export function formatRupeesFromPaise(paise: number) {
  return (paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function buildPayNowUrl(id: string) {
  // Public portal route used by quick payment flow.
  return `${portalBaseUrl}/public-quick-payment-details/${encodeURIComponent(id)}`;
}

