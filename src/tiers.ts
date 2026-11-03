/**
 * Tier gating.
 *
 * DRIVERSNOTE_TOOL_TIERS is a comma list of read | write | admin (default
 * "read"). Tools outside the enabled tiers are not listed and calling them
 * returns an error result. Fails closed: an unknown tier name is a startup
 * error rather than being silently ignored, and a tool with no tier entry is
 * never enabled.
 */

import { TOOL_TIERS, type ToolTier } from "./tool-tiers.js";

export const ALL_TIERS: readonly ToolTier[] = ["read", "write", "admin"];
export const DEFAULT_TIERS: readonly ToolTier[] = ["read"];

export function parseEnabledTiers(raw: string | undefined): Set<ToolTier> {
  // SECURITY-REVIEW: authorization gate. Default is read-only; unknown values throw.
  const tokens = (raw ?? "")
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 0);
  if (tokens.length === 0) return new Set(DEFAULT_TIERS);
  const enabled = new Set<ToolTier>();
  for (const token of tokens) {
    if (!(ALL_TIERS as readonly string[]).includes(token)) {
      throw new Error(
        `Invalid DRIVERSNOTE_TOOL_TIERS value "${token}". Allowed: ${ALL_TIERS.join(", ")} (comma separated).`,
      );
    }
    enabled.add(token as ToolTier);
  }
  return enabled;
}

export function getEnabledTiers(env: NodeJS.ProcessEnv = process.env): Set<ToolTier> {
  return parseEnabledTiers(env.DRIVERSNOTE_TOOL_TIERS);
}

export function isToolEnabled(toolName: string, enabled: ReadonlySet<ToolTier>): boolean {
  // SECURITY-REVIEW: authorization gate. Unknown tool => not enabled.
  const info = TOOL_TIERS[toolName];
  return info !== undefined && enabled.has(info.tier);
}
