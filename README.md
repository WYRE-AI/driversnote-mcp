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
| `CONDUIT_S2S_SECRET` | Yes for HTTP | Service-to-service secret, at least 32 characters after trimming. Required for HTTP unless `MCP_ALLOW_INSECURE_DEV=1`. |
| `MCP_TRANSPORT` | No | `stdio` or `http`. Defaults to `stdio`. |
| `MCP_HTTP_HOST` | No | Bind address when a real `CONDUIT_S2S_SECRET` is set. Defaults to `127.0.0.1`; container sets `0.0.0.0`. |
| `MCP_ALLOWED_HOSTS` | No | When set (even empty), enforces localhost, 127.0.0.1 and [::1] plus these comma-separated Host names, without scheme or port. When unset, Host checks apply only to effective loopback binds (including insecure dev). Non-loopback binds with a real S2S secret rely on S2S HMAC without Host checks. Health endpoints are always exempt. |
| `MCP_HTTP_PORT` | No | HTTP port. Defaults to `8080`. |
| `MCP_ALLOW_INSECURE_DEV` | No | Set to exactly `1` for local development only. |
| `LOG_LEVEL` | No | `debug`, `info`, `warn`, or `error`. Defaults to `info`. |

`/health` and `/healthz` stay unauthenticated and do not read credentials.

HTTP POST bodies are limited to 1 MiB (413 when exceeded), including chunked uploads.

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

Aaron's 2026-11-03 decisions confirm report_create, report_update, report_replace, trip_bulk_update, trip_bulk_restore, location_import and csv_import_file_import as write. All 33 admin tools are approved and off by default; no tools are pending (37 read / 26 write / 33 admin).

`DRIVERSNOTE_TOOL_TIERS` is a comma-separated list of `read`, `write`, or `admin`. Defaults to `read`.

- Read tools are query operations.
- Write tools are mutations that create or update records.
- Admin tools are high-impact or access-management operations. The admin tier (33 tools) was approved by Aaron on 2026-11-03 and is off by default; enable it explicitly via `DRIVERSNOTE_TOOL_TIERS` (for example, `read,write,admin`).

Tools outside the enabled tiers are not listed and calling them returns an error result. Unknown tier names fail closed at startup.

## Available Tools

| Tool | Tier | GraphQL operation | On by default |
|---|---|---|---|
| driversnote_company_info | read | companyInfo | yes |
| driversnote_contact_create | write | contactCreate | no |
| driversnote_contacts_list | read | contacts | yes |
| driversnote_contacts_recent | read | contactsMostRecentlyUsed | yes |
| driversnote_countries_list | read | countries | yes |
| driversnote_country_get | read | country | yes |
| driversnote_csv_import_file_create | write | csvImportFileCreate | no |
| driversnote_csv_import_file_get | read | csvImportFile | yes |
| driversnote_csv_import_file_import | write | csvImportFileImport | no |
| driversnote_locales_list | read | locales | yes |
| driversnote_location_create | write | locationCreate | no |
| driversnote_location_delete | admin | locationDelete | no |
| driversnote_location_get | read | location | yes |
| driversnote_location_import | write | locationImport | no |
| driversnote_location_update | write | locationUpdate | no |
| driversnote_locations_list | read | locations | yes |
| driversnote_odometer_reading_create | write | odometerReadingCreate | no |
| driversnote_odometer_reading_delete | admin | odometerReadingDelete | no |
| driversnote_odometer_reading_get | read | odometerReading | yes |
| driversnote_odometer_reading_update | write | odometerReadingUpdate | no |
| driversnote_odometer_readings_list | read | odometerReadings | yes |
| driversnote_odometer_usages_list | read | odometerUsages | yes |
| driversnote_organisation_archive | admin | organisationArchive | no |
| driversnote_organisation_create | write | organisationCreate | no |
| driversnote_organisation_delete | admin | organisationDelete | no |
| driversnote_organisation_get | read | organisation | yes |
| driversnote_organisation_unarchive | write | organisationUnarchive | no |
| driversnote_organisation_update | admin | organisationUpdate | no |
| driversnote_organisations_list | read | organisations | yes |
| driversnote_previous_period_reports | read | previousPeriodReports | yes |
| driversnote_rate_create | admin | rateCreate | no |
| driversnote_rate_delete | admin | rateDelete | no |
| driversnote_rate_update | admin | rateUpdate | no |
| driversnote_rates_list | read | rates | yes |
| driversnote_reimbursement_methods_list | read | reimbursementMethods | yes |
| driversnote_report_create | write | reportCreate | no |
| driversnote_report_delete | admin | reportDelete | no |
| driversnote_report_get | read | report | yes |
| driversnote_report_preview | read | previewReport | yes |
| driversnote_report_public_get | read | reportPublic | yes |
| driversnote_report_replace | write | reportReplace | no |
| driversnote_report_update | write | reportUpdate | no |
| driversnote_reporting_period_calculate | read | reportingPeriodCalculation | yes |
| driversnote_reporting_period_intervals_list | read | reportingPeriodIntervals | yes |
| driversnote_reporting_setting_update | admin | reportingSettingUpdate | no |
| driversnote_reports_list | read | reports | yes |
| driversnote_standard_rates_list | read | standardRates | yes |
| driversnote_stored_attachment_get | read | storedAttachment | yes |
| driversnote_tag_categories_default_list | read | tagCategoriesDefault | yes |
| driversnote_tag_category_create | write | tagCategoryCreate | no |
| driversnote_tag_category_delete | admin | tagCategoryDelete | no |
| driversnote_tag_category_update | write | tagCategoryUpdate | no |
| driversnote_tag_create | write | tagCreate | no |
| driversnote_tag_delete | admin | tagDelete | no |
| driversnote_tag_update | write | tagUpdate | no |
| driversnote_team_create | admin | teamCreate | no |
| driversnote_team_delete | admin | teamDelete | no |
| driversnote_team_get | read | team | yes |
| driversnote_team_invite | admin | teamInvite | no |
| driversnote_team_invite_delete | admin | teamInviteDelete | no |
| driversnote_team_invite_resend | admin | teamInviteResend | no |
| driversnote_team_member_bulk_upsert | admin | teamMemberBulkUpsert | no |
| driversnote_team_member_delete | admin | teamMemberDelete | no |
| driversnote_team_member_update_role | admin | teamMemberUpdateRole | no |
| driversnote_team_member_upsert | admin | teamMemberUpsert | no |
| driversnote_team_report_approve | admin | teamReportApprove | no |
| driversnote_team_report_bulk_approve | admin | teamReportBulkApprove | no |
| driversnote_team_report_bulk_process | admin | teamReportBulkProcess | no |
| driversnote_team_report_bulk_reject | admin | teamReportBulkReject | no |
| driversnote_team_report_get | read | teamReport | yes |
| driversnote_team_report_process | admin | teamReportProcess | no |
| driversnote_team_report_reject | admin | teamReportReject | no |
| driversnote_team_report_states_list | read | teamReportStates | yes |
| driversnote_team_report_submit | admin | teamReportSubmit | no |
| driversnote_team_report_tab_counts | read | teamReportTabCounts | yes |
| driversnote_team_report_withdraw | admin | teamReportWithdraw | no |
| driversnote_team_reports_list | read | teamReports | yes |
| driversnote_team_update | admin | teamUpdate | no |
| driversnote_teams_list | read | teams | yes |
| driversnote_time_zones_list | read | timeZones | yes |
| driversnote_trip_bulk_delete | admin | tripBulkDelete | no |
| driversnote_trip_bulk_restore | write | tripBulkRestore | no |
| driversnote_trip_bulk_update | write | tripBulkUpdate | no |
| driversnote_trip_create | write | tripCreate | no |
| driversnote_trip_delete | admin | tripDelete | no |
| driversnote_trip_restore | write | tripRestore | no |
| driversnote_trip_update | write | tripUpdate | no |
| driversnote_trips_list | read | trips | yes |
| driversnote_unreported_trips_overview | read | unreportedTripsOverview | yes |
| driversnote_vehicle_archive | write | vehicleArchive | no |
| driversnote_vehicle_create | write | vehicleCreate | no |
| driversnote_vehicle_delete | admin | vehicleDelete | no |
| driversnote_vehicle_get | read | vehicle | yes |
| driversnote_vehicle_unarchive | write | vehicleUnarchive | no |
| driversnote_vehicle_update | write | vehicleUpdate | no |
| driversnote_vehicles_list | read | vehicles | yes |

Live testing requires a Driversnote API key (team admin/manager key for team reports), created at <https://www.driversnote.com/app/api-keys> and stored in 1Password, never in the repo.
