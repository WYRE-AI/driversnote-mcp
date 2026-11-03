/**
 * Gateway-mode credential resolution: the API key comes from
 * X-Driversnote-Api-Key only, never from the process environment.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveGatewayCredentials, getCredentials } from "../utils/client.js";

describe("resolveGatewayCredentials", () => {
  const originalEnv = process.env;
  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.DRIVERSNOTE_API_KEY = "env-key-must-not-be-used";
  });
  afterEach(() => {
    process.env = originalEnv;
  });

  const getter = (headers: Record<string, string>) => (name: string) => headers[name];

  it("reads x-driversnote-api-key", () => {
    expect(resolveGatewayCredentials(getter({ "x-driversnote-api-key": "abc123" }))).toEqual({
      credentials: { apiKey: "abc123" },
    });
  });

  it("trims surrounding whitespace", () => {
    expect(resolveGatewayCredentials(getter({ "x-driversnote-api-key": "  abc123  " })).credentials?.apiKey).toBe("abc123");
  });

  it("does not fall back to DRIVERSNOTE_API_KEY when the header is absent", () => {
    const r = resolveGatewayCredentials(getter({}));
    expect(r.credentials).toBeUndefined();
    expect(r.error).toMatch(/X-Driversnote-Api-Key/);
    expect(JSON.stringify(r)).not.toContain("env-key-must-not-be-used");
  });

  it("ignores other vendor-style headers (x-api-key, authorization)", () => {
    const r = resolveGatewayCredentials(getter({ "x-api-key": "k", authorization: "Bearer t" }));
    expect(r.credentials).toBeUndefined();
  });

  it("rejects empty, whitespace-containing and oversize values without echoing them", () => {
    for (const bad of ["", "   ", "has space", "tab\tkey", "x".repeat(513)]) {
      const r = resolveGatewayCredentials(getter({ "x-driversnote-api-key": bad }));
      expect(r.credentials).toBeUndefined();
      expect(r.error).toBeDefined();
      if (bad.trim()) expect(r.error).not.toContain(bad);
    }
  });

  it("AUTH_MODE=gateway makes getCredentials ignore the env key", () => {
    process.env.AUTH_MODE = "gateway";
    expect(getCredentials()).toBeNull();
    process.env.AUTH_MODE = "env";
    expect(getCredentials()).toEqual({ apiKey: "env-key-must-not-be-used" });
  });
});
