/**
 * vehicles domain handler
 *
 * Vehicles: list, get, create, update, archive/unarchive, delete.
 *
 * One MCP tool per GraphQL operation. Every `document` is validated against
 * schema/driversnote.graphql by src/__tests__/schema-validation.test.ts.
 * Mutations take the GraphQL `input` fields as tool arguments.
 * Tier (read | write | admin) comes from src/tool-tiers.ts; descriptions carry
 * the matching prefix (checked by src/__tests__/tiers.test.ts).
 */

import type { DomainHandler, ToolSpec } from "../utils/types.js";
import { createDomainHandler } from "../utils/handler.js";

export const vehiclesSpecs: ToolSpec[] = [
  {
    tool: {
      name: "driversnote_vehicle_get",
      description:
        "Get a vehicle by id (the currently selected vehicle when id is omitted).",
      annotations: {
        title: "Driversnote: Vehicle Get",
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
        }
      },
    },
    operation: "vehicle",
    kind: "query",
    document: "query Vehicle($id: ID) { vehicle(id: $id) { id name licensePlate isArchived isCurrentlySelected country { id name } vehicleType { id name } odometerUsage { id name } } }",
  },
  {
    tool: {
      name: "driversnote_vehicles_list",
      description:
        "List vehicles. Pass isArchived to list archived (true) or active (false) vehicles. Paginated: defaults to first=100; pass after=<endCursor> for the next page.",
      annotations: {
        title: "Driversnote: Vehicles List",
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
          "isArchived": {
            "type": "boolean"
          },
          "last": {
            "type": "integer"
          }
        }
      },
    },
    operation: "vehicles",
    kind: "query",
    defaultFirst: 100,
    document: "query Vehicles($after: String, $before: String, $first: Int, $isArchived: Boolean, $last: Int) { vehicles(after: $after, before: $before, first: $first, isArchived: $isArchived, last: $last) { totalCount pageInfo { hasNextPage hasPreviousPage startCursor endCursor } nodes { id name licensePlate isArchived isCurrentlySelected country { id name } vehicleType { id name } odometerUsage { id name } } } }",
  },
  {
    tool: {
      name: "driversnote_vehicle_archive",
      description:
        "[write] ⚠ HIGH-IMPACT (reversible) Archive a vehicle. Reversible with driversnote_vehicle_unarchive. Arguments are the fields of the GraphQL mutation `input`.",
      annotations: {
        title: "Driversnote: Vehicle Archive",
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
    operation: "vehicleArchive",
    kind: "mutation",
    document: "mutation VehicleArchive($input: VehicleArchiveMutationInput!) { vehicleArchive(input: $input) { vehicle { id name licensePlate isArchived } } }",
  },
  {
    tool: {
      name: "driversnote_vehicle_create",
      description:
        "[write] Create a vehicle. Arguments are the fields of the GraphQL mutation `input`.",
      annotations: {
        title: "Driversnote: Vehicle Create",
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
              "countryId": {
                "type": "string"
              },
              "licensePlate": {
                "type": "string"
              },
              "name": {
                "type": "string"
              },
              "odometerUsage": {
                "type": "string"
              },
              "vehicleTypeId": {
                "type": "string"
              }
            },
            "required": [
              "countryId",
              "name",
              "odometerUsage",
              "vehicleTypeId"
            ]
          }
        },
        "required": [
          "attributes"
        ]
      },
    },
    operation: "vehicleCreate",
    kind: "mutation",
    document: "mutation VehicleCreate($input: VehicleCreateMutationInput!) { vehicleCreate(input: $input) { vehicle { id name licensePlate isArchived isCurrentlySelected country { id name } vehicleType { id name } odometerUsage { id name } } } }",
  },
  {
    tool: {
      name: "driversnote_vehicle_delete",
      description:
        "⚠ DESTRUCTIVE — IRREVERSIBLE [admin] Delete a vehicle. Arguments are the fields of the GraphQL mutation `input`.",
      annotations: {
        title: "Driversnote: Vehicle Delete",
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
    operation: "vehicleDelete",
    kind: "mutation",
    document: "mutation VehicleDelete($input: VehicleDeleteMutationInput!) { vehicleDelete(input: $input) { vehicle { id name licensePlate isArchived } } }",
  },
  {
    tool: {
      name: "driversnote_vehicle_unarchive",
      description:
        "[write] ⚠ HIGH-IMPACT (reversible) Unarchive a vehicle. Arguments are the fields of the GraphQL mutation `input`.",
      annotations: {
        title: "Driversnote: Vehicle Unarchive",
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
    operation: "vehicleUnarchive",
    kind: "mutation",
    document: "mutation VehicleUnarchive($input: VehicleUnarchiveMutationInput!) { vehicleUnarchive(input: $input) { vehicle { id name licensePlate isArchived } } }",
  },
  {
    tool: {
      name: "driversnote_vehicle_update",
      description:
        "[write] Update a vehicle. Arguments are the fields of the GraphQL mutation `input`.",
      annotations: {
        title: "Driversnote: Vehicle Update",
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
              "countryId": {
                "type": "string"
              },
              "licensePlate": {
                "type": "string"
              },
              "name": {
                "type": "string"
              },
              "odometerUsage": {
                "type": "string"
              },
              "reimbursementMethod": {
                "type": "string"
              },
              "vehicleTypeId": {
                "type": "integer"
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
    operation: "vehicleUpdate",
    kind: "mutation",
    document: "mutation VehicleUpdate($input: VehicleUpdateMutationInput!) { vehicleUpdate(input: $input) { vehicle { id name licensePlate isArchived isCurrentlySelected country { id name } vehicleType { id name } odometerUsage { id name } } } }",
  },
];

export const vehiclesHandler: DomainHandler = createDomainHandler("vehicles", vehiclesSpecs);
