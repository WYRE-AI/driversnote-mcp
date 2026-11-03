/**
 * odometer domain handler
 *
 * Odometer readings and odometer usage options.
 *
 * One MCP tool per GraphQL operation. Every `document` is validated against
 * schema/driversnote.graphql by src/__tests__/schema-validation.test.ts.
 * Mutations take the GraphQL `input` fields as tool arguments.
 * Tier (read | write | admin) comes from src/tool-tiers.ts; descriptions carry
 * the matching prefix (checked by src/__tests__/tiers.test.ts).
 */

import type { DomainHandler, ToolSpec } from "../utils/types.js";
import { createDomainHandler } from "../utils/handler.js";

export const odometerSpecs: ToolSpec[] = [
  {
    tool: {
      name: "driversnote_odometer_reading_get",
      description:
        "Get one odometer reading by id.",
      annotations: {
        title: "Driversnote: Odometer Reading Get",
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
    operation: "odometerReading",
    kind: "query",
    document: "query OdometerReading($id: ID!) { odometerReading(id: $id) { id readAt reading isInconsistent vehicle { id name licensePlate } } }",
  },
  {
    tool: {
      name: "driversnote_odometer_readings_list",
      description:
        "List odometer readings, optionally for one vehicle. Paginated: defaults to first=100; pass after=<endCursor> for the next page.",
      annotations: {
        title: "Driversnote: Odometer Readings List",
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
          },
          "vehicleId": {
            "type": "string"
          }
        }
      },
    },
    operation: "odometerReadings",
    kind: "query",
    defaultFirst: 100,
    document: "query OdometerReadings($after: String, $before: String, $first: Int, $last: Int, $vehicleId: ID) { odometerReadings(after: $after, before: $before, first: $first, last: $last, vehicleId: $vehicleId) { totalCount pageInfo { hasNextPage hasPreviousPage startCursor endCursor } nodes { id readAt reading isInconsistent vehicle { id name licensePlate } } } }",
  },
  {
    tool: {
      name: "driversnote_odometer_usages_list",
      description:
        "List odometer usage options for vehicles (ids accepted by vehicle create/update).",
      annotations: {
        title: "Driversnote: Odometer Usages List",
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
    operation: "odometerUsages",
    kind: "query",
    document: "query OdometerUsages { odometerUsages { id name default } }",
  },
  {
    tool: {
      name: "driversnote_odometer_reading_create",
      description:
        "[write] Create an odometer reading for a vehicle. Arguments are the fields of the GraphQL mutation `input`.",
      annotations: {
        title: "Driversnote: Odometer Reading Create",
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true
      },
      inputSchema: {
        "type": "object",
        "properties": {
          "attributes": {
            "type": "object",
            "properties": {
              "readAt": {
                "type": "string"
              },
              "reading": {
                "type": [
                  "integer",
                  "string"
                ]
              },
              "vehicleId": {
                "type": "string"
              }
            },
            "required": [
              "readAt",
              "reading",
              "vehicleId"
            ]
          }
        },
        "required": [
          "attributes"
        ]
      },
    },
    operation: "odometerReadingCreate",
    kind: "mutation",
    document: "mutation OdometerReadingCreate($input: OdometerReadingCreateMutationInput!) { odometerReadingCreate(input: $input) { odometerReading { id readAt reading isInconsistent vehicle { id name licensePlate } } } }",
  },
  {
    tool: {
      name: "driversnote_odometer_reading_delete",
      description:
        "⚠ DESTRUCTIVE — IRREVERSIBLE [admin] Delete an odometer reading. Readings feed reimbursement odometer checks. Arguments are the fields of the GraphQL mutation `input`.",
      annotations: {
        title: "Driversnote: Odometer Reading Delete",
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
    operation: "odometerReadingDelete",
    kind: "mutation",
    document: "mutation OdometerReadingDelete($input: OdometerReadingDeleteMutationInput!) { odometerReadingDelete(input: $input) { odometerReading { id readAt reading isInconsistent vehicle { id name licensePlate } } } }",
  },
  {
    tool: {
      name: "driversnote_odometer_reading_update",
      description:
        "[write] Update an odometer reading. Arguments are the fields of the GraphQL mutation `input`.",
      annotations: {
        title: "Driversnote: Odometer Reading Update",
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      },
      inputSchema: {
        "type": "object",
        "properties": {
          "attributes": {
            "type": "object",
            "properties": {
              "readAt": {
                "type": "string"
              },
              "reading": {
                "type": [
                  "integer",
                  "string"
                ]
              },
              "vehicleId": {
                "type": "string"
              }
            },
            "required": [
              "readAt",
              "reading",
              "vehicleId"
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
    operation: "odometerReadingUpdate",
    kind: "mutation",
    document: "mutation OdometerReadingUpdate($input: OdometerReadingUpdateMutationInput!) { odometerReadingUpdate(input: $input) { odometerReading { id readAt reading isInconsistent vehicle { id name licensePlate } } } }",
  },
];

export const odometerHandler: DomainHandler = createDomainHandler("odometer", odometerSpecs);
