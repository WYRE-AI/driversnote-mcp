/**
 * Driversnote GraphQL client.
 *
 * POST https://api.driversnote.com/v1/driversnote with header `x-api-key`.
 * Bearer tokens are rejected on this endpoint (Apigee InvalidApiKey -> 401 with
 * a JSON {"fault": ...} body). The key is per user and inherits that user's
 * permissions. The key is never logged, echoed in errors, or placed in a URL.
 */

import { AsyncLocalStorage } from "node:async_hooks";
import type { DriversnoteCredentials } from "./types.js";

export const DEFAULT_BASE_URL = "https://api.driversnote.com/v1/driversnote";
export const DEFAULT_TIMEOUT_MS = 30_000;
export const API_KEY_HEADER = "x-api-key";
/** Gateway-mode request header carrying the user's Driversnote API key. */
export const GATEWAY_API_KEY_HEADER = "x-driversnote-api-key";

const MAX_API_KEY_LENGTH = 512;

// ──────────────────────────────────────────────────────────
// Base URL allowlist
// ──────────────────────────────────────────────────────────

/**
 * Validate the API URL. The API key is sent to this URL, so an override that
 * could point at an attacker host would exfiltrate the key.
 * Allowed: https://<anything>.driversnote.com (default port, no userinfo) and
 * http://127.0.0.1 / http://localhost (tests and local mocks only).
 * Throws on anything else.
 */
export function resolveBaseUrl(raw?: string): string {
  // SECURITY-REVIEW: allowlist guarding where the API key is sent (credential exfiltration / SSRF).
  const value = (raw ?? "").trim();
  if (!value) return DEFAULT_BASE_URL;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Invalid DRIVERSNOTE_API_URL: not a valid URL.");
  }
  const fail = (): never => {
    throw new Error(
      "Invalid DRIVERSNOTE_API_URL: only https://*.driversnote.com, http://127.0.0.1 and http://localhost are allowed.",
    );
  };
  if (url.username || url.password || url.hash) fail();
  const host = url.hostname.toLowerCase();
  if (url.protocol === "https:") {
    if (!host.endsWith(".driversnote.com") || url.port !== "") fail();
  } else if (url.protocol === "http:") {
    if (host !== "127.0.0.1" && host !== "localhost") fail();
  } else {
    fail();
  }
  return value;
}

export function getBaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  return resolveBaseUrl(env.DRIVERSNOTE_API_URL);
}

// ──────────────────────────────────────────────────────────
// Credentials
// ──────────────────────────────────────────────────────────

// SECURITY-REVIEW: per-request credential store; keeps concurrent gateway requests from leaking keys across users.
const credentialStore = new AsyncLocalStorage<DriversnoteCredentials>();

export function runWithCredentials<T>(creds: DriversnoteCredentials, fn: () => T): T {
  // SECURITY-REVIEW: binds a request-scoped API key.
  return credentialStore.run(creds, fn);
}

function isPlausibleApiKey(value: string): boolean {
  // SECURITY-REVIEW: rejects whitespace/control characters (header injection) and oversize values.
  return value.length > 0 && value.length <= MAX_API_KEY_LENGTH && /^[\x21-\x7e]+$/.test(value);
}

/**
 * Credential lookup order:
 *  1. request-scoped credentials (HTTP gateway mode),
 *  2. DRIVERSNOTE_API_KEY - unless AUTH_MODE=gateway, which never falls back to env.
 */
export function getCredentials(env: NodeJS.ProcessEnv = process.env): DriversnoteCredentials | null {
  // SECURITY-REVIEW: credential resolution; gateway mode must never read the env key.
  const scoped = credentialStore.getStore();
  if (scoped) return scoped;
  if (env.AUTH_MODE?.trim() === "gateway") return null;
  const apiKey = (env.DRIVERSNOTE_API_KEY ?? "").trim();
  return isPlausibleApiKey(apiKey) ? { apiKey } : null;
}

/**
 * Gateway mode: read the API key from `X-Driversnote-Api-Key` only.
 * No environment fallback. The key value is never included in the error.
 */
export function resolveGatewayCredentials(getHeader: (name: string) => string | undefined): {
  credentials?: DriversnoteCredentials;
  error?: string;
} {
  // SECURITY-REVIEW: gateway credential extraction (header only, no env fallback).
  const raw = getHeader(GATEWAY_API_KEY_HEADER);
  const apiKey = typeof raw === "string" ? raw.trim() : "";
  if (!apiKey) {
    return { error: "Missing X-Driversnote-Api-Key header (gateway mode requires the user's Driversnote API key on every request)." };
  }
  if (!isPlausibleApiKey(apiKey)) {
    return { error: "Invalid X-Driversnote-Api-Key header value." };
  }
  return { credentials: { apiKey } };
}

function redact(text: string, apiKey: string): string {
  // SECURITY-REVIEW: scrubs the API key from any text that may reach logs or tool output.
  return apiKey ? text.split(apiKey).join("[redacted]") : text;
}

// ──────────────────────────────────────────────────────────
// Requests
// ──────────────────────────────────────────────────────────

export type ClientErrorKind = "config" | "auth" | "quota" | "graphql" | "http" | "timeout" | "network";

export interface ClientError {
  kind: ClientErrorKind;
  message: string;
  /** GraphQL error messages, when kind === "graphql". */
  messages?: string[];
}

export type ClientResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; error: ClientError };

export interface RequestOptions {
  timeoutMs?: number;
  /** Override credentials (otherwise getCredentials()). */
  apiKey?: string;
  baseUrl?: string;
}

export const AUTH_ERROR_MESSAGE =
  "Invalid or missing Driversnote API key. Create a key at https://www.driversnote.com/app/api-keys and pass it as x-api-key (Bearer tokens are not accepted on this endpoint).";

function tryParseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Execute one GraphQL document. Never throws: failures are returned as
 * { ok: false, error } so tool handlers can map them to isError results.
 */
export async function executeGraphQL(
  document: string,
  variables: Record<string, unknown>,
  options: RequestOptions = {},
): Promise<ClientResult> {
  // SECURITY-REVIEW: attaches the API key to the outbound request; the key only travels in the x-api-key header.
  let apiKey = options.apiKey;
  if (!apiKey) {
    const creds = getCredentials();
    if (!creds) {
      return {
        ok: false,
        error: {
          kind: "auth",
          message:
            "No Driversnote API key configured. Set DRIVERSNOTE_API_KEY (stdio / AUTH_MODE=env) or send X-Driversnote-Api-Key (AUTH_MODE=gateway).",
        },
      };
    }
    apiKey = creds.apiKey;
  }

  let url: string;
  try {
    url = options.baseUrl ? resolveBaseUrl(options.baseUrl) : getBaseUrl();
  } catch (e) {
    return { ok: false, error: { kind: "config", message: e instanceof Error ? e.message : "Invalid API URL" } };
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  let bodyText: string;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        [API_KEY_HEADER]: apiKey,
      },
      body: JSON.stringify({ query: document, variables }),
      signal: controller.signal,
      redirect: "error", // never forward the key to a redirect target
    });
    bodyText = await response.text();
  } catch (e) {
    if (controller.signal.aborted) {
      return { ok: false, error: { kind: "timeout", message: `Driversnote API request timed out after ${Math.round(timeoutMs / 1000)}s.` } };
    }
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: { kind: "network", message: `Driversnote API request failed: ${redact(msg, apiKey)}` } };
  } finally {
    clearTimeout(timer);
  }

  const body = tryParseJson(bodyText);

  // Apigee faults: {"fault": {"faultstring": ..., "detail": {"errorcode": ...}}}
  const fault = isRecord(body) && isRecord(body.fault) ? body.fault : undefined;
  if (response.status === 401 || (fault && response.status === 403)) {
    return { ok: false, error: { kind: "auth", message: AUTH_ERROR_MESSAGE } };
  }
  if (response.status === 429) {
    return {
      ok: false,
      error: {
        kind: "quota",
        message: "Driversnote API quota or rate limit exceeded (the public API allows 2,000 requests per month). Try again later.",
      },
    };
  }
  if (!response.ok) {
    const detail = fault && typeof fault.faultstring === "string" ? `: ${redact(fault.faultstring, apiKey).slice(0, 300)}` : "";
    return { ok: false, error: { kind: "http", message: `Driversnote API returned HTTP ${response.status}${detail}` } };
  }

  if (!isRecord(body)) {
    return { ok: false, error: { kind: "http", message: "Driversnote API returned a non-JSON response." } };
  }

  if (Array.isArray(body.errors) && body.errors.length > 0) {
    const messages = body.errors.map((err) =>
      redact(isRecord(err) && typeof err.message === "string" ? err.message : "Unknown GraphQL error", apiKey),
    );
    return {
      ok: false,
      error: { kind: "graphql", message: `Driversnote GraphQL error: ${messages.join("; ")}`, messages },
    };
  }

  if (!isRecord(body.data)) {
    return { ok: false, error: { kind: "http", message: "Driversnote API response contained no data." } };
  }
  return { ok: true, data: body.data };
}
