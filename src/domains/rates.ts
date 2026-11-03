/**
 * rates domain handler
 *
 * Reimbursement rates: custom workplace rates (create/update/delete) and standard statutory rates.
 *
 * One MCP tool per GraphQL operation. Every `document` is validated against
 * schema/driversnote.graphql by src/__tests__/schema-validation.test.ts.
 * Mutations take the GraphQL `input` fields as tool arguments.
 * Tier (read | write | admin) comes from src/tool-tiers.ts; descriptions carry
 * the matching prefix (checked by src/__tests__/tiers.test.ts).
 */

import type { DomainHandler, ToolSpec } from "../utils/types.js";
import { createDomainHandler } from "../utils/handler.js";

export const ratesSpecs: ToolSpec[] = [
  {
    tool: {
      name: "driversnote_rates_list",
      description:
        "List reimbursement rates in effect for a workplace and vehicle (optionally for a date and trip type). Paginated: defaults to first=100; pass after=<endCursor> for the next page.",
      annotations: {
        title: "Driversnote: Rates List",
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
          "date": {
            "type": "string",
            "description": "ISO 8601 date, YYYY-MM-DD"
          },
          "first": {
            "type": "integer"
          },
          "last": {
            "type": "integer"
          },
          "organisationId": {
            "type": "string"
          },
          "tripTypeId": {
            "type": "string"
          },
          "vehicleId": {
            "type": "string"
          }
        },
        "required": [
          "organisationId",
          "vehicleId"
        ]
      },
    },
    operation: "rates",
    kind: "query",
    defaultFirst: 100,
    document: "query Rates($after: String, $before: String, $date: ISO8601Date, $first: Int, $last: Int, $organisationId: ID!, $tripTypeId: String, $vehicleId: ID!) { rates(after: $after, before: $before, date: $date, first: $first, last: $last, organisationId: $organisationId, tripTypeId: $tripTypeId, vehicleId: $vehicleId) { totalCount pageInfo { hasNextPage hasPreviousPage startCursor endCursor } nodes { id name amount dateMin dateMax distanceMin distanceMax distanceName isProvisional country { id name } tripType { id name label } vehicleType { id name } organisation { id name } } } }",
  },
  {
    tool: {
      name: "driversnote_standard_rates_list",
      description:
        "List standard (statutory) mileage rates for a country and vehicle type, optionally on a given date. Paginated: defaults to first=100; pass after=<endCursor> for the next page.",
      annotations: {
        title: "Driversnote: Standard Rates List",
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
          "countryId": {
            "type": "string"
          },
          "date": {
            "type": "string",
            "description": "ISO 8601 date, YYYY-MM-DD"
          },
          "first": {
            "type": "integer"
          },
          "last": {
            "type": "integer"
          },
          "sortBy": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "dateMin": {
                  "type": "string",
                  "enum": [
                    "asc",
                    "desc"
                  ]
                },
                "distanceMin": {
                  "type": "string",
                  "enum": [
                    "asc",
                    "desc"
                  ]
                },
                "tripTypeId": {
                  "type": "string",
                  "enum": [
                    "asc",
                    "desc"
                  ]
                }
              }
            }
          },
          "vehicleTypeId": {
            "type": "string"
          }
        },
        "required": [
          "countryId",
          "vehicleTypeId"
        ]
      },
    },
    operation: "standardRates",
    kind: "query",
    defaultFirst: 100,
    document: "query StandardRates($after: String, $before: String, $countryId: ID!, $date: ISO8601Date, $first: Int, $last: Int, $sortBy: [QueryStandardRatesSortBy!], $vehicleTypeId: ID!) { standardRates(after: $after, before: $before, countryId: $countryId, date: $date, first: $first, last: $last, sortBy: $sortBy, vehicleTypeId: $vehicleTypeId) { totalCount pageInfo { hasNextPage hasPreviousPage startCursor endCursor } nodes { id name amount dateMin dateMax distanceMin distanceMax distanceName isProvisional country { id name } tripType { id name label } vehicleType { id name } organisation { id name } } } }",
  },
  {
    tool: {
      name: "driversnote_rate_create",
      description:
        "⚠ HIGH-IMPACT [admin] Create a custom reimbursement rate (affects reimbursement amounts). Arguments are the fields of the GraphQL mutation `input`. Pending tier sign-off.",
      annotations: {
        title: "Driversnote: Rate Create",
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true
      },
      inputSchema: {
        "type": "object",
        "properties": {
          "attributes": {
            "type": "object",
            "properties": {
              "amount": {
                "type": "number"
              },
              "countryId": {
                "type": "string"
              },
              "dateMax": {
                "type": "string"
              },
              "dateMin": {
                "type": "string"
              },
              "distanceMax": {
                "type": "integer"
              },
              "distanceMin": {
                "type": "integer"
              },
              "tripTypeId": {
                "type": "string"
              },
              "vehicleTypeId": {
                "type": "string"
              }
            },
            "required": [
              "countryId",
              "dateMax",
              "dateMin",
              "tripTypeId"
            ]
          },
          "organisationId": {
            "type": "string"
          }
        },
        "required": [
          "attributes"
        ]
      },
    },
    operation: "rateCreate",
    kind: "mutation",
    document: "mutation RateCreate($input: RateCreateMutationInput!) { rateCreate(input: $input) { rate { id name amount dateMin dateMax } } }",
  },
  {
    tool: {
      name: "driversnote_rate_delete",
      description:
        "⚠ DESTRUCTIVE — IRREVERSIBLE [admin] Delete a custom reimbursement rate (affects reimbursement amounts). Arguments are the fields of the GraphQL mutation `input`. Pending tier sign-off.",
      annotations: {
        title: "Driversnote: Rate Delete",
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
    operation: "rateDelete",
    kind: "mutation",
    document: "mutation RateDelete($input: RateDeleteMutationInput!) { rateDelete(input: $input) { rate { id name amount dateMin dateMax } } }",
  },
  {
    tool: {
      name: "driversnote_rate_update",
      description:
        "⚠ HIGH-IMPACT [admin] Update a custom reimbursement rate (affects reimbursement amounts). Arguments are the fields of the GraphQL mutation `input`. Pending tier sign-off.",
      annotations: {
        title: "Driversnote: Rate Update",
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
              "amount": {
                "type": "number"
              },
              "countryId": {
                "type": "string"
              },
              "dateMax": {
                "type": "string"
              },
              "dateMin": {
                "type": "string"
              },
              "distanceMax": {
                "type": "integer"
              },
              "distanceMin": {
                "type": "integer"
              },
              "tripTypeId": {
                "type": "string"
              },
              "vehicleTypeId": {
                "type": "string"
              }
            },
            "required": [
              "countryId",
              "dateMax",
              "dateMin",
              "tripTypeId"
            ]
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
    operation: "rateUpdate",
    kind: "mutation",
    document: "mutation RateUpdate($input: RateUpdateMutationInput!) { rateUpdate(input: $input) { rate { id name amount dateMin dateMax } } }",
  },
];

export const ratesHandler: DomainHandler = createDomainHandler("rates", ratesSpecs);
