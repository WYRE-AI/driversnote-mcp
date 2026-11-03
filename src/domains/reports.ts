/**
 * reports domain handler
 *
 * Reports: list/get/preview reports, shared reports, previous-period reports; create, update, replace, delete.
 *
 * One MCP tool per GraphQL operation. Every `document` is validated against
 * schema/driversnote.graphql by src/__tests__/schema-validation.test.ts.
 * Mutations take the GraphQL `input` fields as tool arguments.
 * Tier (read | write | admin) comes from src/tool-tiers.ts; descriptions carry
 * the matching prefix (checked by src/__tests__/tiers.test.ts).
 */

import type { DomainHandler, ToolSpec } from "../utils/types.js";
import { createDomainHandler } from "../utils/handler.js";

export const reportsSpecs: ToolSpec[] = [
  {
    tool: {
      name: "driversnote_report_preview",
      description:
        "Preview a report for a workplace/vehicle/date range without creating it: summary lines, warnings (odometer gaps, double-reported trips, provisional rates).",
      annotations: {
        title: "Driversnote: Report Preview",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      },
      inputSchema: {
        "type": "object",
        "properties": {
          "endDate": {
            "type": "string",
            "description": "ISO 8601 date, YYYY-MM-DD"
          },
          "organisationId": {
            "type": "string"
          },
          "showOdometer": {
            "type": "boolean"
          },
          "startDate": {
            "type": "string",
            "description": "ISO 8601 date, YYYY-MM-DD"
          },
          "tagIds": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "tripTypeId": {
            "type": "string"
          },
          "vehicleId": {
            "type": "string"
          }
        },
        "required": [
          "endDate",
          "organisationId",
          "showOdometer",
          "startDate",
          "vehicleId"
        ]
      },
    },
    operation: "previewReport",
    kind: "query",
    document: "query PreviewReport($endDate: ISO8601Date!, $organisationId: ID!, $showOdometer: Boolean!, $startDate: ISO8601Date!, $tagIds: [ID!], $tripTypeId: String, $vehicleId: ID!) { previewReport(endDate: $endDate, organisationId: $organisationId, showOdometer: $showOdometer, startDate: $startDate, tagIds: $tagIds, tripTypeId: $tripTypeId, vehicleId: $vehicleId) { startDate endDate showOdometer reimbursementMethod hasArchivedTrips hasDoubleReportedTrips hasOdometerInconsistencies hasOdometerMissing hasPassedMonthlyLimit hasProvisionalRate hasReimbursementMethod organisation { id name } vehicle { id name licensePlate } tripType { id name label } odometerInconsistencies { distanceDeviation startReading { id readAt reading } stopReading { id readAt reading } } summaryItems(first: 100) { totalCount nodes { type description distance amount percentage priority rate { id name amount } } } } }",
  },
  {
    tool: {
      name: "driversnote_previous_period_reports",
      description:
        "List reports for previous reporting periods with submission deadline status.",
      annotations: {
        title: "Driversnote: Previous Period Reports",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      },
      inputSchema: {
        "type": "object",
        "properties": {}
      },
    },
    operation: "previousPeriodReports",
    kind: "query",
    document: "query PreviousPeriodReports { previousPeriodReports { daysUntilSubmissionDeadline submissionDeadlineOn submissionDeadlineStatus organisation { id name } report { id name title state startDate endDate totalAmount totalDistance currency } } }",
  },
  {
    tool: {
      name: "driversnote_report_get",
      description:
        "Get a report by id with summary lines, tags and the first 100 report items. Includes PDF/Excel URLs when generated.",
      annotations: {
        title: "Driversnote: Report Get",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      },
      inputSchema: {
        "type": "object",
        "properties": {
          "id": {
            "type": "string"
          }
        },
        "required": [
          "id"
        ]
      },
    },
    operation: "report",
    kind: "query",
    document: "query Report($id: ID!) { report(id: $id) { id name title state createdAt updatedAt deletedAt startDate endDate currency distanceUnit totalAmount totalDistance showOdometer isReplaced replacedReportId reimbursementMethod hasProvisionalRate tripReportIssuesCount duplicateTeamReportTripCount pdfUrl excelUrl timeZone organisationName vehicleName vehicleLicensePlate userName organisation { id name } vehicle { id name } tripTypes { id name label } organisationAddress userAddress userRegistrationNo reportSettings { id tripOriginEnabled tripRouteEnabled tripTimesEnabled tripMaskingEnabled } tags(first: 100) { nodes { id name } } reportSummaryItems(first: 100) { totalCount nodes { id summaryType description distance amount percentage priority rateName rateAmount tripTypeName tripTypeLabel } } reportItems(first: 100) { totalCount pageInfo { hasNextPage endCursor } nodes { id startAt stopAt distance totalAmount comment tripTypeName tripTypeLabel startLocationName startLocationAddress stopLocationName stopLocationAddress startOdometerReading stopOdometerReading outOfScope outdated tripIssues { key kind description } } } } }",
  },
  {
    tool: {
      name: "driversnote_report_public_get",
      description:
        "Get a shared (public) report by its share token id.",
      annotations: {
        title: "Driversnote: Report Public Get",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      },
      inputSchema: {
        "type": "object",
        "properties": {
          "tokenId": {
            "type": "string"
          }
        },
        "required": [
          "tokenId"
        ]
      },
    },
    operation: "reportPublic",
    kind: "query",
    document: "query ReportPublic($tokenId: ID!) { reportPublic(tokenId: $tokenId) { id excelUrl isDeleted isReplaced report { id name title state createdAt updatedAt deletedAt startDate endDate currency distanceUnit totalAmount totalDistance showOdometer isReplaced replacedReportId reimbursementMethod hasProvisionalRate tripReportIssuesCount duplicateTeamReportTripCount pdfUrl excelUrl timeZone organisationName vehicleName vehicleLicensePlate userName organisation { id name } vehicle { id name } tripTypes { id name label } } reportShare { id name email note sharedAt createdAt isDeleted isReplaced } } }",
  },
  {
    tool: {
      name: "driversnote_reports_list",
      description:
        "List the user's reports (without items; use driversnote_report_get for detail). Paginated: defaults to first=100; pass after=<endCursor> for the next page.",
      annotations: {
        title: "Driversnote: Reports List",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      },
      inputSchema: {
        "type": "object",
        "properties": {
          "after": {
            "type": "string"
          },
          "before": {
            "type": "string"
          },
          "first": {
            "type": "integer"
          },
          "last": {
            "type": "integer"
          }
        }
      },
    },
    operation: "reports",
    kind: "query",
    defaultFirst: 100,
    document: "query Reports($after: String, $before: String, $first: Int, $last: Int) { reports(after: $after, before: $before, first: $first, last: $last) { totalCount pageInfo { hasNextPage hasPreviousPage startCursor endCursor } nodes { id name title state createdAt updatedAt deletedAt startDate endDate currency distanceUnit totalAmount totalDistance showOdometer isReplaced replacedReportId reimbursementMethod hasProvisionalRate tripReportIssuesCount duplicateTeamReportTripCount pdfUrl excelUrl timeZone organisationName vehicleName vehicleLicensePlate userName organisation { id name } vehicle { id name } tripTypes { id name label } } } }",
  },
  {
    tool: {
      name: "driversnote_report_create",
      description:
        "[write] Create a reimbursement/tax report for a vehicle and date range (amounts are calculated from trips and rates). Arguments are the fields of the GraphQL mutation `input`.",
      annotations: {
        title: "Driversnote: Report Create",
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true
      },
      inputSchema: {
        "type": "object",
        "properties": {
          "endDate": {
            "type": "string",
            "description": "ISO 8601 date, YYYY-MM-DD"
          },
          "organisationId": {
            "type": "string"
          },
          "showOdometer": {
            "type": "boolean"
          },
          "startDate": {
            "type": "string",
            "description": "ISO 8601 date, YYYY-MM-DD"
          },
          "tagIds": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "tripTypeId": {
            "type": "string"
          },
          "vehicleId": {
            "type": "string"
          }
        },
        "required": [
          "endDate",
          "organisationId",
          "showOdometer",
          "startDate",
          "vehicleId"
        ]
      },
    },
    operation: "reportCreate",
    kind: "mutation",
    document: "mutation ReportCreate($input: ReportCreateMutationInput!) { reportCreate(input: $input) { report { id name title state startDate endDate totalAmount totalDistance currency } } }",
  },
  {
    tool: {
      name: "driversnote_report_delete",
      description:
        "⚠ DESTRUCTIVE — IRREVERSIBLE [admin] Delete a report. Reimbursement documents are removed. Arguments are the fields of the GraphQL mutation `input`. Pending tier sign-off.",
      annotations: {
        title: "Driversnote: Report Delete",
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true
      },
      inputSchema: {
        "type": "object",
        "properties": {
          "id": {
            "type": "string"
          }
        },
        "required": [
          "id"
        ]
      },
    },
    operation: "reportDelete",
    kind: "mutation",
    document: "mutation ReportDelete($input: ReportDeleteMutationInput!) { reportDelete(input: $input) { report { id name title state startDate endDate totalAmount totalDistance currency } } }",
  },
  {
    tool: {
      name: "driversnote_report_replace",
      description:
        "[write] Regenerate (replace) a report with current trips and rates. Arguments are the fields of the GraphQL mutation `input`.",
      annotations: {
        title: "Driversnote: Report Replace",
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true
      },
      inputSchema: {
        "type": "object",
        "properties": {
          "id": {
            "type": "string"
          }
        },
        "required": [
          "id"
        ]
      },
    },
    operation: "reportReplace",
    kind: "mutation",
    document: "mutation ReportReplace($input: ReportReplaceMutationInput!) { reportReplace(input: $input) { report { id name title state startDate endDate totalAmount totalDistance currency } } }",
  },
  {
    tool: {
      name: "driversnote_report_update",
      description:
        "[write] Update a report's attributes (title). Arguments are the fields of the GraphQL mutation `input`.",
      annotations: {
        title: "Driversnote: Report Update",
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true
      },
      inputSchema: {
        "type": "object",
        "properties": {
          "attributes": {
            "type": "object",
            "properties": {
              "title": {
                "type": "string"
              }
            }
          },
          "id": {
            "type": "string"
          }
        },
        "required": [
          "attributes",
          "id"
        ]
      },
    },
    operation: "reportUpdate",
    kind: "mutation",
    document: "mutation ReportUpdate($input: ReportUpdateMutationInput!) { reportUpdate(input: $input) { report { id name title state startDate endDate totalAmount totalDistance currency } } }",
  },
];

export const reportsHandler: DomainHandler = createDomainHandler("reports", reportsSpecs);
