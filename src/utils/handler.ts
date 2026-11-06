/**
 * Shared domain-handler factory.
 *
 * Turns a list of ToolSpecs (one per GraphQL operation) into a DomainHandler
 * with getTools()/handleCall(). Tier gating is enforced here, so a tool outside
 * the enabled tiers is neither listed nor callable, whichever entry point is used.
 */

import type { CallToolResult, DomainHandler, DomainName, ToolSpec } from "./types.js";
import { executeGraphQL } from "./client.js";
import { getEnabledTiers, isToolEnabled } from "../tiers.js";
import { TOOL_TIERS } from "../tool-tiers.js";
import { logger } from "./logger.js";

function errorResult(text: string): CallToolResult {
  return { content: [{ type: "text", text }], isError: true };
}

function schemaProps(spec: ToolSpec): Record<string, unknown> {
  return (spec.tool.inputSchema.properties ?? {}) as Record<string, unknown>;
}

export function buildVariables(spec: ToolSpec, args: Record<string, unknown>): Record<string, unknown> {
  if (spec.kind === "mutation") return { input: args };
  const vars: Record<string, unknown> = { ...args };
  if (spec.defaultFirst !== undefined && vars.first === undefined && vars.last === undefined) {
    vars.first = spec.defaultFirst;
  }
  return vars;
}

export function createDomainHandler(domain: DomainName, specs: ToolSpec[]): DomainHandler {
  const byName = new Map(specs.map((s) => [s.tool.name, s]));

  return {
    domain,
    specs,

    getTools() {
      const enabled = getEnabledTiers();
      return specs.filter((s) => isToolEnabled(s.tool.name, enabled)).map((s) => s.tool);
    },

    async handleCall(name, rawArgs) {
      const spec = byName.get(name);
      if (!spec) return errorResult(`Unknown tool: ${name}`);

      // SECURITY-REVIEW: tier gate on the call path (not only on tools/list).
      let enabledTiers;
      try {
        enabledTiers = getEnabledTiers();
      } catch (e) {
        return errorResult(e instanceof Error ? e.message : "Invalid DRIVERSNOTE_TOOL_TIERS");
      }
      if (!isToolEnabled(name, enabledTiers)) {
        const tier = TOOL_TIERS[name]?.tier ?? "unknown";
        return errorResult(
          `Tool ${name} requires the "${tier}" tier, which is not enabled. Enabled tiers: ${[...enabledTiers].join(", ")}. ` +
            `Set DRIVERSNOTE_TOOL_TIERS (comma list of read, write, admin) to enable it.`,
        );
      }

      const args = rawArgs ?? {};
      const props = schemaProps(spec);
      const unknown = Object.keys(args).filter((k) => !(k in props));
      if (unknown.length > 0) {
        return errorResult(`Unknown argument(s) for ${name}: ${unknown.join(", ")}. Allowed: ${Object.keys(props).join(", ") || "(none)"}.`);
      }
      const required = (spec.tool.inputSchema.required ?? []) as string[];
      const missing = required.filter((k) => args[k] === undefined || args[k] === null);
      if (missing.length > 0) {
        return errorResult(`Missing required argument(s) for ${name}: ${missing.join(", ")}.`);
      }

      logger.debug("Executing Driversnote operation", { tool: name, operation: spec.operation });
      const result = await executeGraphQL(spec.document, buildVariables(spec, args));
      if (!result.ok) return errorResult(result.error.message);

      const payload = result.data[spec.operation];
      return { content: [{ type: "text", text: JSON.stringify(payload ?? null) }] };
    },
  };
}
