import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { listEnabledTools, callTool } from "../domains/index.js";
import { parseEnabledTiers } from "../tiers.js";
import { TOOL_TIERS } from "../tool-tiers.js";

const ORIGINAL = { ...process.env };

function mockFetchOk(data: unknown = { vehicles: { totalCount: 0, pageInfo: {}, nodes: [] } }) {
  const f = vi.fn(async () => new Response(JSON.stringify({ data }), { status: 200 }));
  vi.stubGlobal("fetch", f);
  return f;
}

beforeEach(() => {
  process.env = { ...ORIGINAL };
  delete process.env.DRIVERSNOTE_TOOL_TIERS;
  delete process.env.AUTH_MODE;
  process.env.DRIVERSNOTE_API_KEY = "test-key";
  delete process.env.DRIVERSNOTE_API_URL;
});
afterEach(() => {
  process.env = { ...ORIGINAL };
  vi.unstubAllGlobals();
});

describe("parseEnabledTiers", () => {
  it("defaults to read", () => {
    expect([...parseEnabledTiers(undefined)]).toEqual(["read"]);
    expect([...parseEnabledTiers("")]).toEqual(["read"]);
    expect([...parseEnabledTiers(" , ")]).toEqual(["read"]);
  });
  it("parses a comma list, trimming and lowercasing", () => {
    expect([...parseEnabledTiers("read, WRITE ,admin")].sort()).toEqual(["admin", "read", "write"]);
  });
  it("rejects unknown tiers (fail closed)", () => {
    expect(() => parseEnabledTiers("read,superuser")).toThrow(/Invalid DRIVERSNOTE_TOOL_TIERS/);
  });
});

describe("tool listing by tier", () => {
  it("lists only read tools by default", () => {
    const tools = listEnabledTools();
    expect(process.env.DRIVERSNOTE_TOOL_TIERS).toBeUndefined();
    expect(tools.filter((t) => TOOL_TIERS[t.name].tier === "admin")).toHaveLength(0);
    expect(tools.filter((t) => TOOL_TIERS[t.name].tier === "write")).toHaveLength(0);
    expect(tools).toHaveLength(37);
    expect(tools.every((t) => TOOL_TIERS[t.name].tier === "read")).toBe(true);
    expect(tools.every((t) => t.annotations?.readOnlyHint === true)).toBe(true);
  });
  it("read,write lists 63 tools", () => {
    process.env.DRIVERSNOTE_TOOL_TIERS = "read,write";
    const tools = listEnabledTools();
    expect(tools).toHaveLength(63);
    expect(tools.some((t) => TOOL_TIERS[t.name].tier === "admin")).toBe(false);
  });
  it("write alone lists only write tools", () => {
    process.env.DRIVERSNOTE_TOOL_TIERS = "write";
    const tools = listEnabledTools();
    expect(tools).toHaveLength(26);
    expect(tools.every((t) => TOOL_TIERS[t.name].tier === "write")).toBe(true);
  });
  it("read,write,admin lists all 96", () => {
    process.env.DRIVERSNOTE_TOOL_TIERS = "read,write,admin";
    const tools = listEnabledTools();
    expect(tools).toHaveLength(96);
    expect(tools.filter((t) => TOOL_TIERS[t.name].tier === "admin")).toHaveLength(33);
  });
});

describe("calling tools outside the enabled tiers", () => {
  it("rejects a write tool at default tiers without calling the API", async () => {
    const f = mockFetchOk();
    const r = await callTool("driversnote_vehicle_create", { attributes: { name: "x" } });
    expect(r.isError).toBe(true);
    expect((r.content[0] as { text: string }).text).toMatch(/requires the "write" tier/);
    expect(f).not.toHaveBeenCalled();
  });
  it("rejects an admin tool when only read,write are enabled", async () => {
    process.env.DRIVERSNOTE_TOOL_TIERS = "read,write";
    const f = mockFetchOk();
    const r = await callTool("driversnote_vehicle_delete", { id: "1" });
    expect(r.isError).toBe(true);
    expect((r.content[0] as { text: string }).text).toMatch(/requires the "admin" tier/);
    expect(f).not.toHaveBeenCalled();
  });
  it("rejects an unknown tool", async () => {
    const r = await callTool("driversnote_nope", {});
    expect(r.isError).toBe(true);
  });
  it("returns an error (not a throw) when DRIVERSNOTE_TOOL_TIERS is invalid", async () => {
    process.env.DRIVERSNOTE_TOOL_TIERS = "bogus";
    const f = mockFetchOk();
    const r = await callTool("driversnote_vehicles_list", {});
    expect(r.isError).toBe(true);
    expect(f).not.toHaveBeenCalled();
  });
  it("allows the call once the tier is enabled and sends the mutation input", async () => {
    process.env.DRIVERSNOTE_TOOL_TIERS = "write";
    const f = mockFetchOk({ vehicleCreate: { vehicle: { id: "v1", name: "Car" } } });
    const r = await callTool("driversnote_vehicle_create", {
      attributes: { countryId: "SE", name: "Car", odometerUsage: "km", vehicleTypeId: "1" },
    });
    expect(r.isError).toBeUndefined();
    expect(JSON.parse((r.content[0] as { text: string }).text)).toEqual({ vehicle: { id: "v1", name: "Car" } });
    const body = JSON.parse((f.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body.variables).toEqual({
      input: { attributes: { countryId: "SE", name: "Car", odometerUsage: "km", vehicleTypeId: "1" } },
    });
  });
});

describe("argument handling", () => {
  it("rejects missing required arguments (trips need startDate/endDate)", async () => {
    const f = mockFetchOk();
    const r = await callTool("driversnote_trips_list", { startDate: "2026-01-01" });
    expect(r.isError).toBe(true);
    expect(JSON.stringify(r.content)).toMatch(/endDate/);
    expect(f).not.toHaveBeenCalled();
  });
  it("rejects unknown arguments instead of silently dropping them", async () => {
    const f = mockFetchOk();
    const r = await callTool("driversnote_vehicles_list", { archived: true });
    expect(r.isError).toBe(true);
    expect(JSON.stringify(r.content)).toMatch(/Unknown argument/);
    expect(f).not.toHaveBeenCalled();
  });
  it("applies first=100 to connections unless first/last is given", async () => {
    const f = mockFetchOk();
    await callTool("driversnote_vehicles_list", {});
    await callTool("driversnote_vehicles_list", { first: 5 });
    await callTool("driversnote_vehicles_list", { last: 5 });
    const vars = f.mock.calls.map((c) => JSON.parse((c as unknown as [string, RequestInit])[1].body as string).variables);
    expect(vars).toEqual([{ first: 100 }, { first: 5 }, { last: 5 }]);
  });
});
