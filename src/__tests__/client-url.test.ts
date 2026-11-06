import { describe, it, expect } from "vitest";
import { DEFAULT_BASE_URL, resolveBaseUrl, getBaseUrl } from "../utils/client.js";

describe("resolveBaseUrl allowlist", () => {
  it("defaults to the production endpoint", () => {
    expect(resolveBaseUrl(undefined)).toBe(DEFAULT_BASE_URL);
    expect(resolveBaseUrl("")).toBe(DEFAULT_BASE_URL);
    expect(resolveBaseUrl("   ")).toBe(DEFAULT_BASE_URL);
    expect(getBaseUrl({})).toBe("https://api.driversnote.com/v1/driversnote");
  });

  it.each([
    "https://api.driversnote.com/v1/driversnote",
    "https://sandbox.driversnote.com/v1/driversnote",
    "https://API.DRIVERSNOTE.COM/graphql",
    "http://127.0.0.1:4010/graphql",
    "http://127.0.0.1/graphql",
    "http://localhost:3000/graphql",
  ])("accepts %s", (url) => {
    expect(resolveBaseUrl(url)).toBe(url);
  });

  it.each([
    "https://evil.example.com/v1/driversnote",
    "https://driversnote.com.evil.com/v1",
    "https://evil.com/.driversnote.com",
    "https://notdriversnote.com/v1",
    "https://driversnote.com/v1", // apex is not *.driversnote.com
    "http://api.driversnote.com/v1/driversnote", // https required for the real host
    "https://api.driversnote.com@evil.com/v1",
    "https://user:pw@api.driversnote.com/v1",
    "https://api.driversnote.com:8443/v1",
    "http://127.0.0.1.evil.com/graphql",
    "http://192.168.1.10/graphql",
    "http://[::1]:4000/graphql",
    "https://localhost/graphql",
    "ftp://api.driversnote.com/v1",
    "file:///etc/passwd",
    "not a url",
  ])("rejects %s", (url) => {
    expect(() => resolveBaseUrl(url)).toThrow(/DRIVERSNOTE_API_URL/);
  });

  it("getBaseUrl throws for a bad DRIVERSNOTE_API_URL (startup check)", () => {
    expect(() => getBaseUrl({ DRIVERSNOTE_API_URL: "https://evil.example.com" })).toThrow();
  });
});
