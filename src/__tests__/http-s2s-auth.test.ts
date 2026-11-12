/**
 * HTTP transport: S2S gate, gateway credentials, health endpoints, and an
 * end-to-end tool call against a local mock of the Driversnote API.
 */
import { createHmac } from "node:crypto";
import { createServer, IncomingMessage, request, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { logger } from "../utils/logger.js";
import { parseHttpPort, startHttpTransport } from "../index.js";

const S2S_SECRET = "test-only-s2s-value-at-least-32-chars";
const ENV_KEY = "env-key-must-not-be-used";
const ENV_KEYS = [
  "MCP_ALLOWED_HOSTS", "CONDUIT_S2S_SECRET", "MCP_ALLOW_INSECURE_DEV", "MCP_HTTP_PORT", "MCP_HTTP_HOST", "AUTH_MODE",
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
  const portProbe = createServer();
  await new Promise<void>((resolve) => portProbe.listen(0, "127.0.0.1", resolve));
  process.env.MCP_HTTP_PORT = String((portProbe.address() as AddressInfo).port);
  await new Promise<void>((resolve) => portProbe.close(() => resolve()));
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
  it.each(["0", "65536", "abc", "8080abc", "1.5", ""])("rejects invalid MCP_HTTP_PORT=%s", async (port) => {
    process.env.CONDUIT_S2S_SECRET = S2S_SECRET;
    process.env.MCP_HTTP_PORT = port;
    vi.spyOn(process, "exit").mockImplementation((() => { throw new Error("exit"); }) as never);
    const error = vi.spyOn(logger, "error").mockImplementation(() => {});
    await expect(startHttpTransport()).rejects.toThrow("exit");
    expect(error).toHaveBeenCalledWith(expect.stringContaining("MCP_HTTP_PORT must be an integer between 1 and 65535"));
  });

  it("accepts MCP_HTTP_PORT=8080", () => {
    expect(parseHttpPort("8080")).toBe(8080);
  });

  it("warns about allowlist entries that will never match", async () => {
    process.env.CONDUIT_S2S_SECRET = S2S_SECRET;
    process.env.MCP_ALLOWED_HOSTS = "example.com:443,[::1]:8080,::1,fe80::1,example.com,[::1]";
    const warn = vi.spyOn(logger, "warn").mockImplementation(() => {});
    await listen();
    for (const entry of ["example.com:443", "[::1]:8080", "::1", "fe80::1"]) {
      expect(warn).toHaveBeenCalledWith(expect.stringContaining(`entry "${entry}"`));
      expect(warn).toHaveBeenCalledWith(expect.stringMatching(new RegExp(`will never match`)));
    }
    expect(warn.mock.calls.filter(([message]) => message.includes("will never match"))).toHaveLength(4);
  });

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

describe("HTTP hardening", () => {
  beforeEach(() => {
    process.env.CONDUIT_S2S_SECRET = S2S_SECRET;
  });

  it("rejects short secrets even in insecure dev mode without logging them", async () => {
    process.env.CONDUIT_S2S_SECRET = "x".repeat(31);
    process.env.MCP_ALLOW_INSECURE_DEV = "1";
    vi.spyOn(process, "exit").mockImplementation((() => { throw new Error("exit"); }) as never);
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(startHttpTransport()).rejects.toThrow("exit");
    expect(JSON.stringify(log.mock.calls)).toContain("at least 32 characters");
    expect(JSON.stringify(log.mock.calls)).not.toContain("x".repeat(31));
  });

  function hostStatus(port: number, path: string, host: string) {
    return new Promise<number | undefined>((resolve, reject) => {
      const req = request(`http://127.0.0.1:${port}${path}`, { headers: { Host: host } }, (res) => {
        res.resume();
        resolve(res.statusCode);
      });
      req.on("error", reject);
      req.end();
    });
  }

  it.each([undefined, "mcp.example.com"])("exempts health probes from Host checks (allowlist=%s)", async (allowed) => {
    if (allowed !== undefined) process.env.MCP_ALLOWED_HOSTS = allowed;
    const port = await listen();
    for (const path of ["/health", "/healthz"]) {
      for (const host of ["internal.azure.local", "10.0.0.5:8080", "invalid:port"]) {
        expect(await hostStatus(port, path, host)).toBe(200);
      }
    }
    expect(upstreamKeys).toHaveLength(0);
  });

  it.each(["127.0.0.1", "0.0.0.0"])("enforces configured hosts on MCP when bound to %s", async (bind) => {
    process.env.MCP_HTTP_HOST = bind;
    process.env.MCP_ALLOWED_HOSTS = " mcp.example.com, OTHER.example.com ";
    const port = await listen();
    for (const host of ["attacker.example", "mcp.example.com.evil", "localhost:bad", "localhost:0", "localhost:65536", "localhost:abc"]) {
      expect(await hostStatus(port, "/mcp", host)).toBe(403);
    }
    for (const host of ["localhost", "127.0.0.1", "[::1]:8080", "MCP.example.com:8080", "other.example.com"]) {
      expect(await hostStatus(port, "/mcp", host)).toBe(401);
    }
  });

  it.each([false, true])("defaults to loopback-only hosts on effective loopback binds (insecure=%s)", async (insecure) => {
    if (insecure) {
      delete process.env.CONDUIT_S2S_SECRET;
      process.env.MCP_ALLOW_INSECURE_DEV = "1";
      process.env.MCP_HTTP_HOST = "0.0.0.0";
      vi.spyOn(console, "error").mockImplementation(() => {});
    }
    const port = await listen();
    expect(await hostStatus(port, "/mcp", "attacker.example")).toBe(403);
    // An allowed host reaches normal routing, without needing credentials.
    expect(await hostStatus(port, "/unknown", "localhost:8080")).toBe(404);
  });

  it("enforces an explicitly empty allowlist on a non-loopback bind", async () => {
    process.env.MCP_HTTP_HOST = "0.0.0.0";
    process.env.MCP_ALLOWED_HOSTS = "";
    const port = await listen();
    expect(await hostStatus(port, "/mcp", "internal.azure.local")).toBe(403);
    expect(await hostStatus(port, "/mcp", "127.0.0.1")).toBe(401);
  });

  it("allows internal hosts on non-loopback binds with S2S and no allowlist", async () => {
    process.env.MCP_HTTP_HOST = "0.0.0.0";
    process.env.AUTH_MODE = "gateway";
    const port = await listen();
    for (const host of ["sidecar.internal.azure.local:8080", "10.0.0.5"]) {
      expect(await hostStatus(port, "/mcp", host)).toBe(401);
      const response = await rpc(port, {
        Host: host,
        "X-Gateway-S2S": mint(S2S_SECRET),
        "X-Driversnote-Api-Key": "gateway-key",
      }, "tools/call", { name: "driversnote_company_info", arguments: {} });
      expect(response.status).toBe(200);
    }
    expect(upstreamKeys).toEqual(["gateway-key", "gateway-key"]);
  });

  it("returns a JSON error only for malformed JSON", async () => {
    const warn = vi.spyOn(logger, "warn").mockImplementation(() => {});
    const port = await listen();
    warn.mockClear();
    const response = await fetch(`http://127.0.0.1:${port}/mcp`, {
      method: "POST",
      headers: { "X-Gateway-S2S": mint(S2S_SECRET) },
      body: "{",
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid JSON request body" });
    expect(warn).not.toHaveBeenCalled();
  });

  it.each([Error, SyntaxError])("logs stream failures without exposing their contents (%s)", async (ErrorType) => {
    const warn = vi.spyOn(logger, "warn").mockImplementation(() => {});
    const port = await listen();
    warn.mockClear();
    vi.spyOn(IncomingMessage.prototype, "iterator").mockImplementationOnce(() => {
      const iterator = {
        [Symbol.asyncIterator]() {
          return iterator;
        },
        async next(): Promise<IteratorResult<Buffer>> {
          throw new ErrorType("sensitive request content");
        },
        async [Symbol.asyncDispose]() {},
      };
      return iterator;
    });
    const response = await rpc(port, { "X-Gateway-S2S": mint(S2S_SECRET) });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Failed to read request body" });
    expect(warn).toHaveBeenCalledExactlyOnceWith("Failed to read HTTP request body");
    expect(upstreamKeys).toHaveLength(0);
  });

  it("accepts a small chunked JSON body", async () => {
    const port = await listen();
    const status = await new Promise<number | undefined>((resolve, reject) => {
      const req = request(`http://127.0.0.1:${port}/mcp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json", Accept: "application/json, text/event-stream",
          "Transfer-Encoding": "chunked", "X-Gateway-S2S": mint(S2S_SECRET),
        },
      }, (res) => {
        res.resume();
        res.on("end", () => resolve(res.statusCode));
        res.on("error", reject);
      });
      req.on("error", reject);
      req.write('{"jsonrpc":"2.0",');
      req.end('"id":1,"method":"tools/list","params":{}}');
    });
    expect(status).toBe(200);
  });

  it.each([false, true])("rejects oversized POST bodies (chunked=%s)", async (chunked) => {
    const port = await listen();
    const { request } = await import("node:http");
    const status = await new Promise<number | undefined>((resolve, reject) => {
      const req = request(`http://127.0.0.1:${port}/mcp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Gateway-S2S": mint(S2S_SECRET),
          ...(chunked ? { "Transfer-Encoding": "chunked" } : { "Content-Length": String(1024 * 1024 + 1) }),
        },
      }, (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => { body += chunk; });
        res.on("error", reject);
        res.on("end", () => {
          expect(JSON.parse(body)).toEqual({ error: "Request body exceeds 1 MiB" });
          resolve(res.statusCode);
        });
      });
      req.on("error", reject);
      for (let i = 0; i < 17; i++) req.write(Buffer.alloc(64 * 1024, "x"));
      req.end();
    });
    expect(status).toBe(413);
    expect(upstreamKeys).toHaveLength(0);
  });
});
