import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";
import { TOOL_TIERS, OPERATION_TO_TOOL } from "../tool-tiers.js";
import { getAllSpecs } from "../domains/index.js";

const tiersJson = JSON.parse(readFileSync(resolve(__dirname, "../../schema/tiers.json"), "utf8")) as Record<
  string,
  { kind: string; tier: string; pendingAaron: boolean; note: string }
>;
const opsJson = JSON.parse(readFileSync(resolve(__dirname, "../../schema/operations.json"), "utf8")) as Record<string, unknown>;
const specs = getAllSpecs();

describe("tier map", () => {
  it("pins Aaron's 2026-11-03 write decisions in both tier maps", () => {
    for (const name of ["report_create", "report_update", "report_replace", "trip_bulk_update", "trip_bulk_restore", "location_import", "csv_import_file_import"]) {
      const info = TOOL_TIERS[`driversnote_${name}`];
      expect(info).toMatchObject({ tier: "write", pendingAaron: false });
      expect(tiersJson[info.operation]).toMatchObject({ tier: "write", pendingAaron: false });
    }
  });
  it("has 37 read / 26 write / 33 admin tools", () => {
    const counts = { read: 0, write: 0, admin: 0 };
    for (const t of Object.values(TOOL_TIERS)) counts[t.tier]++;
    expect(counts).toEqual({ read: 37, write: 26, admin: 33 });
    expect(Object.keys(TOOL_TIERS)).toHaveLength(96);
  });

  it("has no pending approvals and preserves reasons for all 33 admin tools", () => {
    const admins = Object.values(TOOL_TIERS).filter((info) => info.tier === "admin");
    expect(admins).toHaveLength(33);
    for (const info of Object.values(TOOL_TIERS)) {
      expect(info.pendingAaron).toBe(false);
      expect(info.note).not.toContain("PENDING AARON");
    }
    for (const info of admins) expect(info.note.trim().length).toBeGreaterThan(0);
  });

  it("matches schema/tiers.json exactly (tier, pendingAaron, note)", () => {
    for (const [tool, info] of Object.entries(TOOL_TIERS)) {
      const src = tiersJson[info.operation];
      expect(src, `${tool} -> ${info.operation}`).toBeDefined();
      expect(info.tier).toBe(src.tier);
      expect(info.pendingAaron).toBe(src.pendingAaron);
      expect(info.note).toBe(src.note);
    }
    expect(new Set(Object.values(TOOL_TIERS).map((t) => t.operation))).toEqual(new Set(Object.keys(tiersJson)));
  });

  it("covers every operation in operations.json once, with the right kind", () => {
    const ops = Object.keys(opsJson);
    expect(ops).toHaveLength(96);
    for (const key of ops) {
      const [kind, op] = key.split(".");
      const tool = OPERATION_TO_TOOL[op];
      expect(tool, key).toBeDefined();
      expect(tiersJson[op].kind).toBe(kind);
    }
    expect(new Set(Object.values(OPERATION_TO_TOOL)).size).toBe(96);
  });

  it("every spec has a tier entry for the same operation, and names are well formed", () => {
    expect(new Set(specs.map((s) => s.tool.name)).size).toBe(96);
    for (const s of specs) {
      expect(s.tool.name).toMatch(/^driversnote_[a-z0-9_]+$/);
      const info = TOOL_TIERS[s.tool.name];
      expect(info, s.tool.name).toBeDefined();
      expect(info.operation).toBe(s.operation);
      expect(tiersJson[s.operation].kind).toBe(s.kind);
    }
  });
});

describe("descriptions and annotations carry the tier", () => {
  for (const s of specs) {
    const info = TOOL_TIERS[s.tool.name];
    const desc = s.tool.description ?? "";
    const a = s.tool.annotations ?? {};
    const isDelete = s.tool.name.endsWith("_delete");
    const isArchive = /archive/.test(s.tool.name);

    it(`${s.tool.name} [${info.tier}]`, () => {
      if (info.tier === "read") {
        expect(desc).not.toMatch(/^(\[write\]|⚠)/);
        expect(a.readOnlyHint).toBe(true);
        expect(a.destructiveHint).toBe(false);
      } else {
        expect(a.readOnlyHint).toBe(false);
      }
      if (info.tier === "write") {
        expect(desc.startsWith("[write] ")).toBe(true);
        expect(desc).not.toContain("[admin]");
      }
      if (info.tier === "admin") {
        expect(/^⚠ (HIGH-IMPACT|DESTRUCTIVE — IRREVERSIBLE) \[admin\] /.test(desc)).toBe(true);
        expect(a.destructiveHint).toBe(true);
        if (isDelete && /irreversible/i.test(info.note)) {
          expect(desc.startsWith("⚠ DESTRUCTIVE — IRREVERSIBLE [admin] ")).toBe(true);
        }
      }
      if (isDelete || isArchive) {
        expect(a.destructiveHint).toBe(true);
        expect(desc).toMatch(/⚠ (DESTRUCTIVE|HIGH-IMPACT)/);
      }
      expect(desc).not.toContain("Pending tier sign-off.");
      expect(a.openWorldHint).toBe(true);
      expect(typeof a.idempotentHint).toBe("boolean");
    });
  }
});
