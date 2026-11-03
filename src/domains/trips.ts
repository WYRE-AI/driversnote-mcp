/**
 * trips domain handler
 *
 * Trips: list, create, update, soft-delete/restore (single and bulk), unreported-trips overview.
 *
 * One MCP tool per GraphQL operation. Every `document` is validated against
 * schema/driversnote.graphql by src/__tests__/schema-validation.test.ts.
 * Mutations take the GraphQL `input` fields as tool arguments.
 * Tier (read | write | admin) comes from src/tool-tiers.ts; descriptions carry
 * the matching prefix (checked by src/__tests__/tiers.test.ts).
 */

import type { DomainHandler, ToolSpec } from "../utils/types.js";
import { createDomainHandler } from "../utils/handler.js";

export const tripsSpecs: ToolSpec[] = [
  {
    tool: {
      name: "driversnote_trips_list",
      description:
        "List trips between startDate and endDate (both required, ISO 8601 dates), optionally filtered by vehicle, workplace and trip type. Returns amounts, locations, tags and report issues. Route polylines are omitted. Paginated: defaults to first=100; pass after=<endCursor> for the next page.",
      annotations: {
        title: "Driversnote: Trips List",
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
          "endDate": {
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
          "startDate": {
            "type": "string",
            "description": "ISO 8601 date, YYYY-MM-DD"
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
          "startDate"
        ]
      },
    },
    operation: "trips",
    kind: "query",
    defaultFirst: 100,
    document: "query Trips($after: String, $before: String, $endDate: ISO8601Date!, $first: Int, $last: Int, $organisationId: ID, $startDate: ISO8601Date!, $tripTypeId: ID, $vehicleId: ID) { trips(after: $after, before: $before, endDate: $endDate, first: $first, last: $last, organisationId: $organisationId, startDate: $startDate, tripTypeId: $tripTypeId, vehicleId: $vehicleId) { totalCount pageInfo { hasNextPage hasPreviousPage startCursor endCursor } nodes { id amount comment distance createdAt updatedAt deletedAt startAt stopAt isArchived isDeleted isGpsTracked isPendingReview hasDuplicateTeamReportTrip monthlyLimitPassed reviewStatus reviewedAt routeOrigin startOdometerReading stopOdometerReading startLocationPlaceholder stopLocationPlaceholder startLocation { id name address } stopLocation { id name address } vehicle { id name licensePlate } tripType { id name label } organisation { id name } tags { id name tagCategoryId } reimbursements { amount distance rate { id name amount } } tripReportIssues { key kind description } } } }",
  },
  {
    tool: {
      name: "driversnote_unreported_trips_overview",
      description:
        "Summarise trips not yet in a report: total distance, amount and latest date.",
      annotations: {
        title: "Driversnote: Unreported Trips Overview",
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
    operation: "unreportedTripsOverview",
    kind: "query",
    document: "query UnreportedTripsOverview { unreportedTripsOverview { amount date distance } }",
  },
  {
    tool: {
      name: "driversnote_trip_bulk_delete",
      description:
        "⚠ HIGH-IMPACT [admin] Soft-delete several trips by id. Reversible with driversnote_trip_bulk_restore. Arguments are the fields of the GraphQL mutation `input`.",
      annotations: {
        title: "Driversnote: Trip Bulk Delete",
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true
      },
      inputSchema: {
        "type": "object",
        "properties": {
          "ids": {
            "type": "array",
            "items": {
              "type": "string"
            }
          }
        },
        "required": [
          "ids"
        ]
      },
    },
    operation: "tripBulkDelete",
    kind: "mutation",
    document: "mutation TripBulkDelete($input: TripBulkDeleteMutationInput!) { tripBulkDelete(input: $input) { trips(first: 100) { totalCount nodes { id startAt stopAt distance isDeleted isArchived reviewStatus vehicle { id name } tripType { id name } } } } }",
  },
  {
    tool: {
      name: "driversnote_trip_bulk_restore",
      description:
        "[write] Restore several soft-deleted trips by id. Arguments are the fields of the GraphQL mutation `input`.",
      annotations: {
        title: "Driversnote: Trip Bulk Restore",
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      },
      inputSchema: {
        "type": "object",
        "properties": {
          "ids": {
            "type": "array",
            "items": {
              "type": "string"
            }
          }
        },
        "required": [
          "ids"
        ]
      },
    },
    operation: "tripBulkRestore",
    kind: "mutation",
    document: "mutation TripBulkRestore($input: TripBulkRestoreMutationInput!) { tripBulkRestore(input: $input) { trips(first: 100) { totalCount nodes { id startAt stopAt distance isDeleted isArchived reviewStatus vehicle { id name } tripType { id name } } } } }",
  },
  {
    tool: {
      name: "driversnote_trip_bulk_update",
      description:
        "[write] Update several trips at once (vehicle, workplace, locations, trip type, comment, tag); optionally mark as reviewed. Arguments are the fields of the GraphQL mutation `input`.",
      annotations: {
        title: "Driversnote: Trip Bulk Update",
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
              "comment": {
                "type": "string"
              },
              "organisationId": {
                "type": "string"
              },
              "startLocationId": {
                "type": "string"
              },
              "stopLocationId": {
                "type": "string"
              },
              "tagId": {
                "type": "string"
              },
              "tagOrganisationId": {
                "type": "string"
              },
              "tripTypeId": {
                "type": "string"
              },
              "vehicleId": {
                "type": "string"
              }
            }
          },
          "ids": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "markAsReviewed": {
            "type": "boolean"
          }
        },
        "required": [
          "attributes",
          "ids"
        ]
      },
    },
    operation: "tripBulkUpdate",
    kind: "mutation",
    document: "mutation TripBulkUpdate($input: TripBulkUpdateMutationInput!) { tripBulkUpdate(input: $input) { trips(first: 100) { totalCount nodes { id startAt stopAt distance isDeleted isArchived reviewStatus vehicle { id name } tripType { id name } } } } }",
  },
  {
    tool: {
      name: "driversnote_trip_create",
      description:
        "[write] Create a trip. Attributes include vehicleId, tripTypeId, startAt/stopAt, locations or placeholders, distance, tagIds. Arguments are the fields of the GraphQL mutation `input`.",
      annotations: {
        title: "Driversnote: Trip Create",
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
              "appVersion": {
                "type": "integer"
              },
              "comment": {
                "type": "string"
              },
              "distance": {
                "type": "integer"
              },
              "organisationId": {
                "type": "string"
              },
              "os": {
                "type": "string"
              },
              "osVersion": {
                "type": "integer"
              },
              "phoneModel": {
                "type": "string"
              },
              "reviewStatus": {
                "type": "string",
                "enum": [
                  "done",
                  "not_ready",
                  "pending"
                ]
              },
              "route": {
                "type": "array",
                "items": {
                  "type": "object",
                  "properties": {
                    "accuracy": {
                      "type": "number"
                    },
                    "invalid": {
                      "type": "integer"
                    },
                    "lat": {
                      "type": "number"
                    },
                    "lon": {
                      "type": "number"
                    },
                    "note": {
                      "type": "string"
                    },
                    "speed": {
                      "type": "number"
                    },
                    "time": {
                      "type": "string"
                    }
                  },
                  "required": [
                    "lat",
                    "lon"
                  ]
                }
              },
              "routeOrigin": {
                "type": "string"
              },
              "startAt": {
                "type": "string",
                "description": "ISO 8601 date-time"
              },
              "startLocationId": {
                "type": "string"
              },
              "startLocationPlaceholder": {
                "type": "string"
              },
              "startedBy": {
                "type": "integer"
              },
              "stopAt": {
                "type": "string",
                "description": "ISO 8601 date-time"
              },
              "stopLocationId": {
                "type": "string"
              },
              "stopLocationPlaceholder": {
                "type": "string"
              },
              "stoppedBy": {
                "type": "integer"
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
            }
          }
        },
        "required": [
          "attributes"
        ]
      },
    },
    operation: "tripCreate",
    kind: "mutation",
    document: "mutation TripCreate($input: TripCreateMutationInput!) { tripCreate(input: $input) { trip { id amount comment distance createdAt updatedAt deletedAt startAt stopAt isArchived isDeleted isGpsTracked isPendingReview hasDuplicateTeamReportTrip monthlyLimitPassed reviewStatus reviewedAt routeOrigin startOdometerReading stopOdometerReading startLocationPlaceholder stopLocationPlaceholder startLocation { id name address } stopLocation { id name address } vehicle { id name licensePlate } tripType { id name label } organisation { id name } tags { id name tagCategoryId } reimbursements { amount distance rate { id name amount } } tripReportIssues { key kind description } } } }",
  },
  {
    tool: {
      name: "driversnote_trip_delete",
      description:
        "⚠ HIGH-IMPACT [admin] Soft-delete a trip. Reversible with driversnote_trip_restore. Arguments are the fields of the GraphQL mutation `input`.",
      annotations: {
        title: "Driversnote: Trip Delete",
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
    operation: "tripDelete",
    kind: "mutation",
    document: "mutation TripDelete($input: TripDeleteMutationInput!) { tripDelete(input: $input) { trip { id startAt stopAt distance isDeleted isArchived reviewStatus vehicle { id name } tripType { id name } } } }",
  },
  {
    tool: {
      name: "driversnote_trip_restore",
      description:
        "[write] Restore a soft-deleted trip. Arguments are the fields of the GraphQL mutation `input`.",
      annotations: {
        title: "Driversnote: Trip Restore",
        readOnlyHint: false,
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
    operation: "tripRestore",
    kind: "mutation",
    document: "mutation TripRestore($input: TripRestoreMutationInput!) { tripRestore(input: $input) { trip { id startAt stopAt distance isDeleted isArchived reviewStatus vehicle { id name } tripType { id name } } } }",
  },
  {
    tool: {
      name: "driversnote_trip_update",
      description:
        "[write] Update a trip; optionally mark it as reviewed. Arguments are the fields of the GraphQL mutation `input`.",
      annotations: {
        title: "Driversnote: Trip Update",
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
              "appVersion": {
                "type": "integer"
              },
              "comment": {
                "type": "string"
              },
              "distance": {
                "type": "integer"
              },
              "organisationId": {
                "type": "string"
              },
              "os": {
                "type": "string"
              },
              "osVersion": {
                "type": "integer"
              },
              "phoneModel": {
                "type": "string"
              },
              "reviewStatus": {
                "type": "string",
                "enum": [
                  "done",
                  "not_ready",
                  "pending"
                ]
              },
              "route": {
                "type": "array",
                "items": {
                  "type": "object",
                  "properties": {
                    "accuracy": {
                      "type": "number"
                    },
                    "invalid": {
                      "type": "integer"
                    },
                    "lat": {
                      "type": "number"
                    },
                    "lon": {
                      "type": "number"
                    },
                    "note": {
                      "type": "string"
                    },
                    "speed": {
                      "type": "number"
                    },
                    "time": {
                      "type": "string"
                    }
                  },
                  "required": [
                    "lat",
                    "lon"
                  ]
                }
              },
              "routeOrigin": {
                "type": "string"
              },
              "startAt": {
                "type": "string",
                "description": "ISO 8601 date-time"
              },
              "startLocationId": {
                "type": "string"
              },
              "startLocationPlaceholder": {
                "type": "string"
              },
              "startedBy": {
                "type": "integer"
              },
              "stopAt": {
                "type": "string",
                "description": "ISO 8601 date-time"
              },
              "stopLocationId": {
                "type": "string"
              },
              "stopLocationPlaceholder": {
                "type": "string"
              },
              "stoppedBy": {
                "type": "integer"
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
            }
          },
          "id": {
            "type": "string"
          },
          "markAsReviewed": {
            "type": "boolean"
          }
        },
        "required": [
          "attributes",
          "id"
        ]
      },
    },
    operation: "tripUpdate",
    kind: "mutation",
    document: "mutation TripUpdate($input: TripUpdateMutationInput!) { tripUpdate(input: $input) { trip { id amount comment distance createdAt updatedAt deletedAt startAt stopAt isArchived isDeleted isGpsTracked isPendingReview hasDuplicateTeamReportTrip monthlyLimitPassed reviewStatus reviewedAt routeOrigin startOdometerReading stopOdometerReading startLocationPlaceholder stopLocationPlaceholder startLocation { id name address } stopLocation { id name address } vehicle { id name licensePlate } tripType { id name label } organisation { id name } tags { id name tagCategoryId } reimbursements { amount distance rate { id name amount } } tripReportIssues { key kind description } } } }",
  },
];

export const tripsHandler: DomainHandler = createDomainHandler("trips", tripsSpecs);
