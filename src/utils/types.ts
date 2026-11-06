/**
 * Shared types for the Driversnote MCP server.
 */

import type { Tool, CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export type { Tool, CallToolResult };

/** Domain files under src/domains. */
export const DOMAIN_NAMES = [
  "trips",
  "vehicles",
  "reports",
  "team_reports",
  "teams",
  "organisations",
  "locations",
  "odometer",
  "rates",
  "tags",
  "contacts",
  "csv_import",
  "reference",
] as const;

export type DomainName = (typeof DOMAIN_NAMES)[number];

/** One MCP tool backed by exactly one GraphQL operation. */
export interface ToolSpec {
  tool: Tool;
  /** GraphQL root field name, e.g. "vehicles" or "tripCreate". */
  operation: string;
  kind: "query" | "mutation";
  /** Complete GraphQL document. Validated against schema/driversnote.graphql in tests. */
  document: string;
  /** Connection queries: `first` used when the caller passes neither first nor last. */
  defaultFirst?: number;
}

export interface DomainHandler {
  readonly domain: DomainName;
  readonly specs: readonly ToolSpec[];
  /** Tools of this domain whose tier is enabled via DRIVERSNOTE_TOOL_TIERS. */
  getTools(): Tool[];
  handleCall(name: string, args: Record<string, unknown>): Promise<CallToolResult>;
}

/** Per-user Driversnote API key (inherits that user's permissions). */
export interface DriversnoteCredentials {
  apiKey: string;
}
