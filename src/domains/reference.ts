/**
 * reference domain handler
 *
 * Reference data: company info, countries, locales, time zones, reimbursement methods, reporting period helpers, stored attachments.
 *
 * One MCP tool per GraphQL operation. Every `document` is validated against
 * schema/driversnote.graphql by src/__tests__/schema-validation.test.ts.
 * Mutations take the GraphQL `input` fields as tool arguments.
 * Tier (read | write | admin) comes from src/tool-tiers.ts; descriptions carry
 * the matching prefix (checked by src/__tests__/tiers.test.ts).
 */

import type { DomainHandler, ToolSpec } from "../utils/types.js";
import { createDomainHandler } from "../utils/handler.js";

export const referenceSpecs: ToolSpec[] = [
  {
    tool: {
      name: "driversnote_company_info",
      description:
        "Get Driversnote company contact info (name, info email, phone number).",
      annotations: {
        title: "Driversnote: Company Info",
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
    operation: "companyInfo",
    kind: "query",
    document: "query CompanyInfo { companyInfo { name infoEmail phoneNumber phoneNumberRaw } }",
  },
  {
    tool: {
      name: "driversnote_countries_list",
      description:
        "List countries supported by Driversnote (currency, distance unit, tax year, VAT, date format). Paginated: defaults to first=100; pass after=<endCursor> for the next page.",
      annotations: {
        title: "Driversnote: Countries List",
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
    operation: "countries",
    kind: "query",
    defaultFirst: 100,
    document: "query Countries($after: String, $before: String, $first: Int, $last: Int) { countries(after: $after, before: $before, first: $first, last: $last) { totalCount pageInfo { hasNextPage hasPreviousPage startCursor endCursor } nodes { id name currency distanceUnit defaultLocale taxYearStart taxYearEnd vatChargingEnabled vatRate allowRegistrationNoAlt requiresCustomerRegistrationNo requiresUserAddress requiresUserRegistrationNo currencyFormat { currency symbol showSymbolFirst } dateFormat { js } } } }",
  },
  {
    tool: {
      name: "driversnote_country_get",
      description:
        "Get one country by country code, including its trip types and vehicle types (use these ids when creating trips, vehicles or rates).",
      annotations: {
        title: "Driversnote: Country Get",
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
    operation: "country",
    kind: "query",
    document: "query Country($id: ID!) { country(id: $id) { id name currency distanceUnit defaultLocale taxYearStart taxYearEnd vatChargingEnabled vatRate allowRegistrationNoAlt requiresCustomerRegistrationNo requiresUserAddress requiresUserRegistrationNo currencyFormat { currency symbol showSymbolFirst } dateFormat { js } tripTypes(first: 100) { nodes { id name label position hasReimbursementMethod } } vehicleTypes(first: 100) { nodes { id name position } } } }",
  },
  {
    tool: {
      name: "driversnote_locales_list",
      description:
        "List supported locales.",
      annotations: {
        title: "Driversnote: Locales List",
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
    operation: "locales",
    kind: "query",
    document: "query Locales { locales { id name default } }",
  },
  {
    tool: {
      name: "driversnote_reimbursement_methods_list",
      description:
        "List available reimbursement methods.",
      annotations: {
        title: "Driversnote: Reimbursement Methods List",
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
    operation: "reimbursementMethods",
    kind: "query",
    document: "query ReimbursementMethods { reimbursementMethods { id name title description default ratesEmpty } }",
  },
  {
    tool: {
      name: "driversnote_reporting_period_calculate",
      description:
        "Calculate the reporting period (start/end dates) for an interval and start date.",
      annotations: {
        title: "Driversnote: Reporting Period Calculate",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      },
      inputSchema: {
        "type": "object",
        "properties": {
          "interval": {
            "type": "string"
          },
          "startOn": {
            "type": "string",
            "description": "ISO 8601 date, YYYY-MM-DD"
          }
        },
        "required": [
          "interval",
          "startOn"
        ]
      },
    },
    operation: "reportingPeriodCalculation",
    kind: "query",
    document: "query ReportingPeriodCalculation($interval: String!, $startOn: ISO8601Date!) { reportingPeriodCalculation(interval: $interval, startOn: $startOn) { periodStartOn periodEndOn } }",
  },
  {
    tool: {
      name: "driversnote_reporting_period_intervals_list",
      description:
        "List supported reporting period intervals (ids accepted by reporting setting update).",
      annotations: {
        title: "Driversnote: Reporting Period Intervals List",
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
    operation: "reportingPeriodIntervals",
    kind: "query",
    document: "query ReportingPeriodIntervals { reportingPeriodIntervals { id name default } }",
  },
  {
    tool: {
      name: "driversnote_stored_attachment_get",
      description:
        "Get the download URL of a stored attachment (e.g. report PDF) for a report, report share or team report.",
      annotations: {
        title: "Driversnote: Stored Attachment Get",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      },
      inputSchema: {
        "type": "object",
        "properties": {
          "attachmentName": {
            "type": "string",
            "enum": [
              "pdf_file"
            ]
          },
          "scopeId": {
            "type": "string"
          },
          "scopeName": {
            "type": "string",
            "enum": [
              "Report",
              "ReportShare",
              "TeamReport"
            ]
          }
        },
        "required": [
          "attachmentName",
          "scopeId",
          "scopeName"
        ]
      },
    },
    operation: "storedAttachment",
    kind: "query",
    document: "query StoredAttachment($attachmentName: StoredAttachmentName!, $scopeId: ID!, $scopeName: StoredAttachmentModel!) { storedAttachment(attachmentName: $attachmentName, scopeId: $scopeId, scopeName: $scopeName) { attachmentName attachmentUrl scopeId scopeName report { id name } } }",
  },
  {
    tool: {
      name: "driversnote_time_zones_list",
      description:
        "List supported time zones.",
      annotations: {
        title: "Driversnote: Time Zones List",
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
    operation: "timeZones",
    kind: "query",
    document: "query TimeZones { timeZones { id name default } }",
  },
];

export const referenceHandler: DomainHandler = createDomainHandler("reference", referenceSpecs);
