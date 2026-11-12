import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";
import { buildSchema, parse, validate, OperationTypeNode, type OperationDefinitionNode } from "graphql";
import { getAllSpecs } from "../domains/index.js";

const schemaPath = resolve(__dirname, "../../schema/driversnote.graphql");
const schema = buildSchema(readFileSync(schemaPath, "utf8"));
const specs = getAllSpecs();

describe("GraphQL documents validate against schema/driversnote.graphql", () => {
  it("covers 96 tools", () => {
    expect(specs).toHaveLength(96);
  });

  it.each(specs.map((s) => [s.tool.name, s] as const))("%s", (_name, spec) => {
    const doc = parse(spec.document);
    expect(validate(schema, doc)).toEqual([]);

    // exactly one operation, of the declared kind, selecting the declared root field
    const ops = doc.definitions.filter((d): d is OperationDefinitionNode => d.kind === "OperationDefinition");
    expect(ops).toHaveLength(1);
    expect(ops[0].operation).toBe(spec.kind === "query" ? OperationTypeNode.QUERY : OperationTypeNode.MUTATION);
    const rootFields = ops[0].selectionSet.selections.map((s) => (s.kind === "Field" ? s.name.value : ""));
    expect(rootFields).toEqual([spec.operation]);
  });

  it("selects no secret-bearing fields (share tokens, invitation links)", () => {
    for (const s of specs) {
      expect(s.document).not.toMatch(/\btoken\b/);
      expect(s.document).not.toMatch(/invitationLinks/);
    }
  });

  it("every query variable is declared by the tool input schema", () => {
    for (const s of specs.filter((x) => x.kind === "query")) {
      const props = Object.keys(s.tool.inputSchema.properties ?? {});
      const declared = [...s.document.matchAll(/\$(\w+):/g)].map((m) => m[1]);
      expect([...declared].sort()).toEqual([...props].sort());
    }
  });
});
