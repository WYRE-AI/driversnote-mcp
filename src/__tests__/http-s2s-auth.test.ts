/**
 * HTTP transport: S2S gate, gateway credentials, health endpoints, and an
 * end-to-end tool call against a local mock of the Driversnote API.
 */
import { createHmac } from "node:crypto";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { startHttpTransport } from "../index.js";

const S2S_SECRET = "s2s-do-not-log-7f3a";
const ENV_KEY = "env-key-must-not-be-used";
const ENV_KEYS = [
  "CONDUIT_S2S_SECRET", "MCP_ALLOW_INSECURE_DEV", "MCP_HTTP_PORT", "MCP_HTTP_HOST", "AUTH_MODE",
  "DRIVERSNOTE_API_KEY", "DRIVERSNOTE_API_URL", "DRIVERSNOTE_TOOL_TIERS", "LOG_LEVEL",
] as const;

const saved = new Map<string, string | undefined>();
const servers: Server[] = [];
let upstreamKeys: Array<string | undefined> = [];
let upstream: Server;
let upstreamPort: number;

function mint(secret: string, t = Math.floor(Date.now() / 1000)): string {
  const msg = `t=${t}`;
  return `${msg},v1=${createHmac("sha256", secret).update(msg).digest("hex")}`;
}

async function listen(): Promise<number> {
  const s = await startHttpTransport();
  servers.push(s);
  return (s.address() as AddressInfo).port;
}

function rpc(port: number, headers: Record<string, string>, method = "tools/call", params: unknown = {}) {
  return fetch(`http://127.0.0.1:${port}/mcp`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream", ...headers },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
}

beforeEach(async () => {
  for (const k of ENV_KEYS) {
    saved.set(k, process.env[k]);
    delete process.env[k];
  }
  process.env.LOG_LEVEL = "error";
  process.env.MCP_HTTP_PORT = "0";
  process.env.MCP_HTTP_HOST = "127.0.0.1";
  upstreamKeys = [];
  upstream = createServer((req, res) => {
    upstreamKeys.push(req.headers["x-api-key"] as string | undefined);
    req.resume();
    req.on("end", () => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ data: { companyInfo: { name: "Driversnote" } } }));
    });
  });
  await new Promise<void>((r) => upstream.listen(0, "127.0.0.1", r));
  upstreamPort = (upstream.address() as AddressInfo).port;
  process.env.DRIVERSNOTE_API_URL = `http://127.0.0.1:${upstreamPort}/graphql`;
});

afterEach(async () => {
  await Promise.all(servers.splice(0).map((s) => new Promise((r) => s.close(() => r(null)))));
  await new Promise((r) => upstream.close(() => r(null)));
  for (const k of ENV_KEYS) {
    const v = saved.get(k);
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  vi.restoreAllMocks();
});
afterAll(() => vi.unstubAllGlobals());

describe("startup", () => {
  it("refuses to start without CONDUIT_S2S_SECRET", async () => {
    const exit = vi.spyOn(process, "exit").mockImplementation((() => {
      throw new Error("exit");
    }) as never);
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(startHttpTransport()).rejects.toThrow("exit");
    expect(exit).toHaveBeenCalledWith(1);
  });

  it("refuses a placeholder secret, even with MCP_ALLOW_INSECURE_DEV=1", async () => {
    process.env.CONDUIT_S2S_SECRET = "changeme";
    process.env.MCP_ALLOW_INSECURE_DEV = "1";
    const exit = vi.spyOn(process, "exit").mockImplementation((() => {
      throw new Error("exit");
    }) as never);
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(startHttpTransport()).rejects.toThrow("exit");
    expect(exit).toHaveBeenCalledWith(1);
  });

  it("refuses an unknown AUTH_MODE", async () => {
    process.env.CONDUIT_S2S_SECRET = S2S_SECRET;
    process.env.AUTH_MODE = "anything";
    const exit = vi.spyOn(process, "exit").mockImplementation((() => {
      throw new Error("exit");
    }) as never);
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(startHttpTransport()).rejects.toThrow("exit");
    expect(exit).toHaveBeenCalledWith(1);
  });
});

describe("/health", () => {
  it("is unauthenticated and does not need credentials", async () => {
    process.env.CONDUIT_S2S_SECRET = S2S_SECRET;
    process.env.AUTH_MODE = "gateway";
    const port = await listen();
    for (const p of ["/health", "/healthz"]) {
      const r = await fetch(`http://127.0.0.1:${port}${p}`);
      expect(r.status).toBe(200);
      expect(await r.json()).toEqual({ status: "ok" });
    }
    expect(upstreamKeys).toHaveLength(0);
  });
});

describe("X-Gateway-S2S", () => {
  beforeEach(() => {
    process.env.CONDUIT_S2S_SECRET = S2S_SECRET;
    process.env.AUTH_MODE = "env";
    process.env.DRIVERSNOTE_API_KEY = ENV_KEY;
  });

  it("rejects /mcp with no header, a wrong secret, or a stale timestamp", async () => {
    const port = await listen();
    expect((await rpc(port, {})).status).toBe(401);
    expect((await rpc(port, { "X-Gateway-S2S": mint("wrong-secret") })).status).toBe(401);
    expect((await rpc(port, { "X-Gateway-S2S": mint(S2S_SECRET, Math.floor(Date.now() / 1000) - 3600) })).status).toBe(401);
    expect(upstreamKeys).toHaveLength(0);
  });

  it("accepts a valid header and uses DRIVERSNOTE_API_KEY in env mode", async () => {
    process.env.DRIVERSNOTE_TOOL_TIERS = "read";
    const port = await listen();
    const r = await rpc(port, { "X-Gateway-S2S": mint(S2S_SECRET) }, "tools/call", {
      name: "driversnote_company_info",
      arguments: {},
    });
    expect(r.status).toBe(200);
    const body = (await r.json()) as { result: { content: { text: string }[]; isError?: boolean } };
    expect(body.result.isError).toBeUndefined();
    expect(JSON.parse(body.result.content[0].text)).toEqual({ name: "Driversnote" });
    expect(upstreamKeys).toEqual([ENV_KEY]);
  });

  it("404s unknown paths", async () => {
    const port = await listen();
    expect((await fetch(`http://127.0.0.1:${port}/nope`)).status).toBe(404);
  });
});

describe("AUTH_MODE=gateway", () => {
  beforeEach(() => {
    process.env.CONDUIT_S2S_SECRET = S2S_SECRET;
    process.env.AUTH_MODE = "gateway";
    process.env.DRIVERSNOTE_API_KEY = ENV_KEY; // must never be used
  });

  it("S2S is checked before credentials", async () => {
    const port = await listen();
    const r = await rpc(port, { "X-Driversnote-Api-Key": "user-key" });
    expect(r.status).toBe(401);
    expect(((await r.json()) as { error: string }).error).toMatch(/X-Gateway-S2S/);
  });

  it("rejects a request without X-Driversnote-Api-Key and does not fall back to env", async () => {
    const port = await listen();
    const r = await rpc(port, { "X-Gateway-S2S": mint(S2S_SECRET) });
    expect(r.status).toBe(401);
    const body = (await r.json()) as { error: string; required: string[] };
    expect(body.error).toBe("Missing credentials");
    expect(body.required).toEqual(["x-driversnote-api-key"]);
    expect(upstreamKeys).toHaveLength(0);
  });

  it("forwards each request's own key upstream (no cross-request leakage)", async () => {
    const port = await listen();
    const call = (key: string) =>
      rpc(port, { "X-Gateway-S2S": mint(S2S_SECRET), "X-Driversnote-Api-Key": key }, "tools/call", {
        name: "driversnote_company_info",
        arguments: {},
      });
    const [a, b] = await Promise.all([call("user-a-key"), call("user-b-key")]);
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect([...upstreamKeys].sort()).toEqual(["user-a-key", "user-b-key"]);
    expect(upstreamKeys).not.toContain(ENV_KEY);
  });
});
