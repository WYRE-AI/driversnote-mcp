# Driversnote MCP Server

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)

A Model Context Protocol (MCP) server for the Driversnote Public API. Enables AI assistants to investigate trips, vehicles, reports, teams, organisations, locations, odometer readings, rates and tags.

This is a [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server that connects Claude (or any MCP-compatible AI) to your Driversnote environment.

> **Part of the [MSP Claude Plugins](https://github.com/WYRE-AI) ecosystem** — a growing suite of AI integrations for the MSP stack. Built by MSPs, for MSPs.

## Installation

```bash
npm install @wyre-ai/driversnote-mcp
```

## Configuration

Copy [`.env.example`](.env.example) and set the variables below. The stdio transport reads `DRIVERSNOTE_API_KEY` from the environment and does not use HTTP service-to-service auth.

| Variable | Required | Description |
|----------|----------|-------------|
| `DRIVERSNOTE_API_KEY` | For stdio and `AUTH_MODE=env` | Driversnote Public API key. Gateway mode reads `X-Driversnote-Api-Key` per request. |
| `DRIVERSNOTE_API_URL` | No | API host. Defaults to `https://api.driversnote.com/v1/driversnote`. Not a credential. |
| `DRIVERSNOTE_TOOL_TIERS` | No | Comma-separated `read`, `write`, or `admin`. Defaults to `read`. |
| `AUTH_MODE` | No | `env` or `gateway`. Defaults to `env`. |
| `CONDUIT_S2S_SECRET` | Yes for HTTP | Service-to-service secret. Required for HTTP unless `MCP_ALLOW_INSECURE_DEV=1`. |
| `MCP_TRANSPORT` | No | `stdio` or `http`. Defaults to `stdio`. |
| `MCP_HTTP_HOST` | No | Bind address when a real `CONDUIT_S2S_SECRET` is set. Defaults to `127.0.0.1`; container sets `0.0.0.0`. |
| `MCP_HTTP_PORT` | No | HTTP port. Defaults to `8080`. |
| `MCP_ALLOW_INSECURE_DEV` | No | Set to exactly `1` for local development only. |
| `LOG_LEVEL` | No | `debug`, `info`, `warn`, or `error`. Defaults to `info`. |

`/health` and `/healthz` stay unauthenticated and do not read credentials.

### HTTP authentication

With `MCP_TRANSPORT=http` and `CONDUIT_S2S_SECRET` set, every `/mcp` request must include `X-Gateway-S2S`. The check is `verifyS2sHeader` in [`src/s2s-verify.ts`](src/s2s-verify.ts): the header value is `t=<unix seconds>,v1=<hex>`, where the hex is HMAC-SHA256 of the literal string `t=<unix seconds>` keyed with `CONDUIT_S2S_SECRET` (64 lowercase hex characters). The timestamp must be within 300 seconds of the server clock. A missing or invalid header is HTTP 401, before the API key is read.

In `AUTH_MODE=gateway`, `/mcp` also requires `X-Driversnote-Api-Key`. A missing key returns 401 and does not fall back to `DRIVERSNOTE_API_KEY`.

## Usage

### Running with Claude Desktop

Add to your Claude Desktop `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "driversnote-mcp": {
      "command": "npx",
      "args": ["@wyre-ai/driversnote-mcp"],
      "env": {
        "DRIVERSNOTE_API_KEY": "your-driversnote-api-key"
      }
    }
  }
}
```

### Running with Claude Code (CLI)

```bash
claude mcp add driversnote-mcp \
  -e DRIVERSNOTE_API_KEY=your-value \
  -- npx -y @wyre-ai/driversnote-mcp
```

### Docker

The image listens on `0.0.0.0` inside the container (`MCP_HTTP_HOST`) and defaults to `AUTH_MODE=gateway`. Publish the port on loopback and pass a real `CONDUIT_S2S_SECRET`.

```bash
docker build -t driversnote-mcp .
docker run \
  -e CONDUIT_S2S_SECRET="$CONDUIT_S2S_SECRET" \
  -p 127.0.0.1:8080:8080 \
  driversnote-mcp
```

Compose refuses to start when `CONDUIT_S2S_SECRET` is unset.

```bash
CONDUIT_S2S_SECRET="$(openssl rand -hex 32)" docker compose up
```

Local HTTP without a secret is development-only. It binds `127.0.0.1` and logs a warning.

```bash
MCP_TRANSPORT=http MCP_ALLOW_INSECURE_DEV=1 npm start
```

## Tool tiers

`DRIVERSNOTE_TOOL_TIERS` is a comma-separated list of `read`, `write`, or `admin`. Defaults to `read`.

- Read tools are query operations.
- Write tools are mutations that create or update records.
- Admin tools are high-impact or access-management operations.

Tools outside the enabled tiers are not listed and calling them returns an error result. Unknown tier names fail closed at startup.

## Available Tools

| Tool | Tier | GraphQL operation | Pending Aaron |
|---|---|---|---|
| driversnote_company_info | read | companyInfo | false |
| driversnote_contact_create | write | contactCreate | false |
| driversnote_contacts_list | read | contacts | false |
| driversnote_contacts_recent | read | contactsMostRecentlyUsed | false |
| driversnote_countries_list | read | countries | false |
| driversnote_country_get | read | country | false |
| driversnote_csv_import_file_create | write | csvImportFileCreate | false |
| driversnote_csv_import_file_get | read | csvImportFile | false |
| driversnote_csv_import_file_import | write | csvImportFileImport | false |
| driversnote_locales_list | read | locales | false |
| driversnote_location_create | write | locationCreate | false |
| driversnote_location_delete | admin | locationDelete | true |
| driversnote_location_get | read | location | false |
| driversnote_location_import | write | locationImport | false |
| driversnote_location_update | write | locationUpdate | false |
| driversnote_locations_list | read | locations | false |
| driversnote_odometer_reading_create | write | odometerReadingCreate | false |
| driversnote_odometer_reading_delete | admin | odometerReadingDelete | true |
| driversnote_odometer_reading_get | read | odometerReading | false |
| driversnote_odometer_reading_update | write | odometerReadingUpdate | false |
| driversnote_odometer_readings_list | read | odometerReadings | false |
| driversnote_odometer_usages_list | read | odometerUsages | false |
| driversnote_organisation_archive | admin | organisationArchive | true |
| driversnote_organisation_create | write | organisationCreate | false |
| driversnote_organisation_delete | admin | organisationDelete | true |
| driversnote_organisation_get | read | organisation | false |
| driversnote_organisation_unarchive | write | organisationUnarchive | false |
| driversnote_organisation_update | admin | organisationUpdate | true |
| driversnote_organisations_list | read | organisations | false |
| driversnote_previous_period_reports | read | previousPeriodReports | false |
| driversnote_rate_create | admin | rateCreate | true |
| driversnote_rate_delete | admin | rateDelete | true |
| driversnote_rate_update | admin | rateUpdate | true |
| driversnote_rates_list | read | rates | false |
| driversnote_reimbursement_methods_list | read | reimbursementMethods | false |
| driversnote_report_create | write | reportCreate | false |
| driversnote_report_delete | admin | reportDelete | true |
| driversnote_report_get | read | report | false |
| driversnote_report_preview | read | previewReport | false |
| driversnote_report_public_get | read | reportPublic | false |
| driversnote_report_replace | write | reportReplace | false |
| driversnote_report_update | write | reportUpdate | false |
| driversnote_reporting_period_calculate | read | reportingPeriodCalculation | false |
| driversnote_reporting_period_intervals_list | read | reportingPeriodIntervals | false |
| driversnote_reporting_setting_update | admin | reportingSettingUpdate | true |
| driversnote_reports_list | read | reports | false |
| driversnote_standard_rates_list | read | standardRates | false |
| driversnote_stored_attachment_get | read | storedAttachment | false |
| driversnote_tag_categories_default_list | read | tagCategoriesDefault | false |
| driversnote_tag_category_create | write | tagCategoryCreate | false |
| driversnote_tag_category_delete | admin | tagCategoryDelete | true |
| driversnote_tag_category_update | write | tagCategoryUpdate | false |
| driversnote_tag_create | write | tagCreate | false |
| driversnote_tag_delete | admin | tagDelete | true |
| driversnote_tag_update | write | tagUpdate | false |
| driversnote_team_create | admin | teamCreate | true |
| driversnote_team_delete | admin | teamDelete | true |
| driversnote_team_get | read | team | false |
| driversnote_team_invite | admin | teamInvite | true |
| driversnote_team_invite_delete | admin | teamInviteDelete | true |
| driversnote_team_invite_resend | admin | teamInviteResend | true |
| driversnote_team_member_bulk_upsert | admin | teamMemberBulkUpsert | true |
| driversnote_team_member_delete | admin | teamMemberDelete | true |
| driversnote_team_member_update_role | admin | teamMemberUpdateRole | true |
| driversnote_team_member_upsert | admin | teamMemberUpsert | true |
| driversnote_team_report_approve | admin | teamReportApprove | true |
| driversnote_team_report_bulk_approve | admin | teamReportBulkApprove | true |
| driversnote_team_report_bulk_process | admin | teamReportBulkProcess | true |
| driversnote_team_report_bulk_reject | admin | teamReportBulkReject | true |
| driversnote_team_report_get | read | teamReport | false |
| driversnote_team_report_process | admin | teamReportProcess | true |
| driversnote_team_report_reject | admin | teamReportReject | true |
| driversnote_team_report_states_list | read | teamReportStates | false |
| driversnote_team_report_submit | admin | teamReportSubmit | true |
| driversnote_team_report_tab_counts | read | teamReportTabCounts | false |
| driversnote_team_report_withdraw | admin | teamReportWithdraw | true |
| driversnote_team_reports_list | read | teamReports | false |
| driversnote_team_update | admin | teamUpdate | true |
| driversnote_teams_list | read | teams | false |
| driversnote_time_zones_list | read | timeZones | false |
| driversnote_trip_bulk_delete | admin | tripBulkDelete | true |
| driversnote_trip_bulk_restore | write | tripBulkRestore | false |
| driversnote_trip_bulk_update | write | tripBulkUpdate | false |
| driversnote_trip_create | write | tripCreate | false |
| driversnote_trip_delete | admin | tripDelete | true |
| driversnote_trip_restore | write | tripRestore | false |
| driversnote_trip_update | write | tripUpdate | false |
| driversnote_trips_list | read | trips | false |
| driversnote_unreported_trips_overview | read | unreportedTripsOverview | false |
| driversnote_vehicle_archive | write | vehicleArchive | false |
| driversnote_vehicle_create | write | vehicleCreate | false |
| driversnote_vehicle_delete | admin | vehicleDelete | true |
| driversnote_vehicle_get | read | vehicle | false |
| driversnote_vehicle_unarchive | write | vehicleUnarchive | false |
| driversnote_vehicle_update | write | vehicleUpdate | false |
| driversnote_vehicles_list | read | vehicles | false |

Live testing requires a Driversnote API key (team admin/manager key for team reports), created at <https://www.driversnote.com/app/api-keys> and stored in 1Password, never in the repo.
