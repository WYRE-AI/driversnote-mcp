/**
 * Domain handlers index.
 */

import type { CallToolResult, DomainHandler, Tool, ToolSpec } from "../utils/types.js";
import { tripsHandler } from "./trips.js";
import { vehiclesHandler } from "./vehicles.js";
import { reportsHandler } from "./reports.js";
import { teamReportsHandler } from "./team-reports.js";
import { teamsHandler } from "./teams.js";
import { organisationsHandler } from "./organisations.js";
import { locationsHandler } from "./locations.js";
import { odometerHandler } from "./odometer.js";
import { ratesHandler } from "./rates.js";
import { tagsHandler } from "./tags.js";
import { contactsHandler } from "./contacts.js";
import { csvImportHandler } from "./csv-import.js";
import { referenceHandler } from "./reference.js";

export const DOMAIN_HANDLERS: readonly DomainHandler[] = [
  tripsHandler,
  vehiclesHandler,
  reportsHandler,
  teamReportsHandler,
  teamsHandler,
  organisationsHandler,
  locationsHandler,
  odometerHandler,
  ratesHandler,
  tagsHandler,
  contactsHandler,
  csvImportHandler,
  referenceHandler,
];

/** Every ToolSpec, regardless of enabled tiers (used by tests and docs). */
export function getAllSpecs(): ToolSpec[] {
  return DOMAIN_HANDLERS.flatMap((h) => [...h.specs]);
}

const TOOL_TO_HANDLER = new Map<string, DomainHandler>(
  DOMAIN_HANDLERS.flatMap((h) => h.specs.map((s) => [s.tool.name, h] as const)),
);

/** Tools whose tier is enabled by DRIVERSNOTE_TOOL_TIERS (default: read). */
export function listEnabledTools(): Tool[] {
  return DOMAIN_HANDLERS.flatMap((h) => h.getTools());
}

export async function callTool(name: string, args: Record<string, unknown>): Promise<CallToolResult> {
  const handler = TOOL_TO_HANDLER.get(name);
  if (!handler) {
    return {
      content: [{ type: "text", text: `Unknown tool: ${name}.` }],
      isError: true,
    };
  }
  return handler.handleCall(name, args);
}
