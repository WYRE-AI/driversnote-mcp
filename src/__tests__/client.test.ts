import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { executeGraphQL, AUTH_ERROR_MESSAGE, runWithCredentials, getCredentials } from "../utils/client.js";
import { callTool } from "../domains/index.js";

const KEY = "sekret-api-key-123";
const ORIGINAL = { ...process.env };

function fetchMock(impl: (url: string, init: RequestInit) => Promise<Response> | Response) {
  const f = vi.fn(async (url: string, init: RequestInit) => impl(url, init));
  vi.stubGlobal("fetch", f);
  return f;
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

beforeEach(() => {
  process.env = { ...ORIGINAL };
  delete process.env.DRIVERSNOTE_API_URL;
  delete process.env.DRIVERSNOTE_TOOL_TIERS;
  delete process.env.AUTH_MODE;
  process.env.DRIVERSNOTE_API_KEY = KEY;
});
afterEach(() => {
  process.env = { ...ORIGINAL };
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("executeGraphQL", () => {
  it("POSTs JSON with x-api-key (and no Authorization header) and returns data", async () => {
    const f = fetchMock(() => json({ data: { companyInfo: { name: "Driversnote" } } }));
    const r = await executeGraphQL("query { companyInfo { name } }", { a: 1 });
    expect(r).toEqual({ ok: true, data: { companyInfo: { name: "Driversnote" } } });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.driversnote.com/v1/driversnote");
    expect(init.method).toBe("POST");
    const headers = init.headers as Record<string, string>;
    expect(headers["x-api-key"]).toBe(KEY);
    expect(headers["Content-Type"]).toBe("application/json");
    expect(Object.keys(headers).map((h) => h.toLowerCase())).not.toContain("authorization");
    expect(JSON.parse(init.body as string)).toEqual({ query: "query { companyInfo { name } }", variables: { a: 1 } });
    expect(init.redirect).toBe("error");
  });

  it("honours DRIVERSNOTE_API_URL from the allowlist and rejects others without calling fetch", async () => {
    const f = fetchMock(() => json({ data: {} }));
    process.env.DRIVERSNOTE_API_URL = "http://127.0.0.1:5555/graphql";
    await executeGraphQL("query { x }", {});
    expect((f.mock.calls[0] as unknown as [string])[0]).toBe("http://127.0.0.1:5555/graphql");

    f.mockClear();
    process.env.DRIVERSNOTE_API_URL = "https://evil.example.com/graphql";
    const r = await executeGraphQL("query { x }", {});
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe("config");
    expect(f).not.toHaveBeenCalled();
  });

  it("maps GraphQL errors to messages", async () => {
    fetchMock(() => json({ data: null, errors: [{ message: "Vehicle not found" }, { message: "Second problem" }] }));
    const r = await executeGraphQL("query { x }", {});
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.kind).toBe("graphql");
      expect(r.error.messages).toEqual(["Vehicle not found", "Second problem"]);
      expect(r.error.message).toContain("Vehicle not found; Second problem");
    }
  });

  it("maps an Apigee InvalidApiKey fault (401) to a clear auth error", async () => {
    fetchMock(() =>
      json({ fault: { faultstring: "Invalid ApiKey", detail: { errorcode: "oauth.v2.InvalidApiKey" } } }, 401),
    );
    const r = await executeGraphQL("query { x }", {});
    expect(r).toEqual({ ok: false, error: { kind: "auth", message: AUTH_ERROR_MESSAGE } });
    expect(AUTH_ERROR_MESSAGE.toLowerCase()).toContain("invalid or missing driversnote api key");
  });

  it("treats 401 with a non-JSON body as an auth error too", async () => {
    fetchMock(() => new Response("Unauthorized", { status: 401 }));
    const r = await executeGraphQL("query { x }", {});
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe("auth");
  });

  it("maps 429 to a quota error", async () => {
    fetchMock(() => json({ fault: { faultstring: "Rate limit quota violation" } }, 429));
    const r = await executeGraphQL("query { x }", {});
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.kind).toBe("quota");
      expect(r.error.message).toContain("2,000");
    }
  });

  it("reports other HTTP failures without leaking the key", async () => {
    fetchMock(() => json({ fault: { faultstring: `bad thing for ${KEY}` } }, 502));
    const r = await executeGraphQL("query { x }", {});
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.kind).toBe("http");
      expect(r.error.message).toContain("502");
      expect(r.error.message).not.toContain(KEY);
    }
  });

  it("times out via AbortController", async () => {
    vi.useFakeTimers();
    fetchMock(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal!.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
        }),
    );
    const p = executeGraphQL("query { x }", {});
    await vi.advanceTimersByTimeAsync(30_000);
    const r = await p;
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.kind).toBe("timeout");
      expect(r.error.message).toContain("30s");
    }
  });

  it("does not time out before 30s", async () => {
    vi.useFakeTimers();
    let aborted = false;
    fetchMock(
      (_url, init) =>
        new Promise<Response>((resolve, reject) => {
          init.signal!.addEventListener("abort", () => {
            aborted = true;
            reject(new DOMException("aborted", "AbortError"));
          });
          setTimeout(() => resolve(json({ data: { ok: true } })), 29_000);
        }),
    );
    const p = executeGraphQL("query { x }", {});
    await vi.advanceTimersByTimeAsync(29_500);
    expect(await p).toEqual({ ok: true, data: { ok: true } });
    expect(aborted).toBe(false);
  });

  it("network errors never include the API key", async () => {
    fetchMock(() => {
      throw new Error(`connect ECONNREFUSED while sending ${KEY}`);
    });
    const r = await executeGraphQL("query { x }", {});
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.kind).toBe("network");
      expect(r.error.message).not.toContain(KEY);
    }
  });

  it("returns an auth error without calling fetch when no key is configured", async () => {
    delete process.env.DRIVERSNOTE_API_KEY;
    const f = fetchMock(() => json({ data: {} }));
    const r = await executeGraphQL("query { x }", {});
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe("auth");
    expect(f).not.toHaveBeenCalled();
  });

  it("rejects non-JSON 200 responses", async () => {
    fetchMock(() => new Response("<html>", { status: 200 }));
    const r = await executeGraphQL("query { x }", {});
    expect(r.ok).toBe(false);
  });
});

describe("tool results", () => {
  it("returns isError with GraphQL messages", async () => {
    fetchMock(() => json({ errors: [{ message: "Not allowed" }] }));
    const r = await callTool("driversnote_vehicles_list", {});
    expect(r.isError).toBe(true);
    expect(JSON.stringify(r.content)).toContain("Not allowed");
  });
  it("returns isError for a 401 fault and never echoes the key", async () => {
    fetchMock(() => json({ fault: { faultstring: `Invalid ApiKey ${KEY}` } }, 401));
    const r = await callTool("driversnote_vehicles_list", {});
    expect(r.isError).toBe(true);
    const text = JSON.stringify(r.content);
    expect(text).toContain("Invalid or missing Driversnote API key");
    expect(text).not.toContain(KEY);
  });
  it("returns the selected operation payload as compact JSON on success", async () => {
    fetchMock(() => json({ data: { companyInfo: { name: "Driversnote", infoEmail: "a@b.c" } } }));
    const r = await callTool("driversnote_company_info", {});
    expect(r.isError).toBeUndefined();
    expect((r.content[0] as { text: string }).text).toBe('{"name":"Driversnote","infoEmail":"a@b.c"}');
  });
});

describe("credential scope", () => {
  it("request-scoped credentials win over env, and gateway mode ignores env", async () => {
    expect(getCredentials()).toEqual({ apiKey: KEY });
    expect(runWithCredentials({ apiKey: "scoped" }, () => getCredentials())).toEqual({ apiKey: "scoped" });
    process.env.AUTH_MODE = "gateway";
    expect(getCredentials()).toBeNull();
    expect(runWithCredentials({ apiKey: "scoped" }, () => getCredentials())).toEqual({ apiKey: "scoped" });
  });
});
