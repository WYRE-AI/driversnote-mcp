/**
 * locations domain handler
 *
 * Saved locations: list, get, create, update, delete, import.
 *
 * One MCP tool per GraphQL operation. Every `document` is validated against
 * schema/driversnote.graphql by src/__tests__/schema-validation.test.ts.
 * Mutations take the GraphQL `input` fields as tool arguments.
 * Tier (read | write | admin) comes from src/tool-tiers.ts; descriptions carry
 * the matching prefix (checked by src/__tests__/tiers.test.ts).
 */

import type { DomainHandler, ToolSpec } from "../utils/types.js";
import { createDomainHandler } from "../utils/handler.js";

export const locationsSpecs: ToolSpec[] = [
  {
    tool: {
      name: "driversnote_location_get",
      description:
        "Get a saved location by UUID.",
      annotations: {
        title: "Driversnote: Location Get",
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
    operation: "location",
    kind: "query",
    document: "query Location($id: ID!) { location(id: $id) { id name address formattedAddress postalDistrictString lat lon isPinPosition dataSource sourceDataId organisationId parentTeamId homeUserId tripTypeId country { id name } } }",
  },
  {
    tool: {
      name: "driversnote_locations_list",
      description:
        "List saved locations (addresses). Filter by team and/or free-text search phrase. Paginated: defaults to first=100; pass after=<endCursor> for the next page.",
      annotations: {
        title: "Driversnote: Locations List",
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
          "parentTeamId": {
            "type": "string"
          },
          "searchPhrase": {
            "type": "string"
          }
        }
      },
    },
    operation: "locations",
    kind: "query",
    defaultFirst: 100,
    document: "query Locations($after: String, $before: String, $first: Int, $last: Int, $parentTeamId: ID, $searchPhrase: String) { locations(after: $after, before: $before, first: $first, last: $last, parentTeamId: $parentTeamId, searchPhrase: $searchPhrase) { totalCount pageInfo { hasNextPage hasPreviousPage startCursor endCursor } nodes { id name address formattedAddress postalDistrictString lat lon isPinPosition dataSource sourceDataId organisationId parentTeamId homeUserId tripTypeId country { id name } } } }",
  },
  {
    tool: {
      name: "driversnote_location_create",
      description:
        "[write] Create a saved location, optionally as the home location, or for a workplace/team. Arguments are the fields of the GraphQL mutation `input`.",
      annotations: {
        title: "Driversnote: Location Create",
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true
      },
      inputSchema: {
        "type": "object",
        "properties": {
          "asHomeLocation": {
            "type": "boolean"
          },
          "attributes": {
            "type": "object",
            "properties": {
              "address": {
                "type": "string"
              },
              "countryId": {
                "type": "string"
              },
              "dataSource": {
                "type": "string"
              },
              "formattedAddress": {
                "type": "string"
              },
              "isPinPosition": {
                "type": "boolean"
              },
              "lat": {
                "type": "number"
              },
              "lon": {
                "type": "number"
              },
              "name": {
                "type": "string"
              },
              "postalDistrictString": {
                "type": "string"
              },
              "sourceDataId": {
                "type": "string"
              },
              "tripTypeId": {
                "type": "string"
              }
            },
            "required": [
              "address",
              "countryId",
              "postalDistrictString"
            ]
          },
          "organisationId": {
            "type": "string"
          },
          "parentTeamId": {
            "type": "string"
          }
        },
        "required": [
          "attributes"
        ]
      },
    },
    operation: "locationCreate",
    kind: "mutation",
    document: "mutation LocationCreate($input: LocationCreateMutationInput!) { locationCreate(input: $input) { location { id name address organisationId parentTeamId } } }",
  },
  {
    tool: {
      name: "driversnote_location_delete",
      description:
        "⚠ DESTRUCTIVE — IRREVERSIBLE [admin] Delete a saved location. Arguments are the fields of the GraphQL mutation `input`. Pending tier sign-off.",
      annotations: {
        title: "Driversnote: Location Delete",
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
    operation: "locationDelete",
    kind: "mutation",
    document: "mutation LocationDelete($input: LocationDeleteMutationInput!) { locationDelete(input: $input) { location { id name address organisationId parentTeamId } } }",
  },
  {
    tool: {
      name: "driversnote_location_import",
      description:
        "[write] Import a saved location from coordinates/address; reuses a nearby existing location when one matches (reported in the result). Bulk-creates saved locations over repeated calls. Arguments are the fields of the GraphQL mutation `input`.",
      annotations: {
        title: "Driversnote: Location Import",
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
              "address": {
                "type": "string"
              },
              "countryId": {
                "type": "string"
              },
              "googlePlaceId": {
                "type": "string"
              },
              "lat": {
                "type": "number"
              },
              "lon": {
                "type": "number"
              },
              "name": {
                "type": "string"
              },
              "postalDistrictString": {
                "type": "string"
              },
              "tripTypeId": {
                "type": "string"
              }
            },
            "required": [
              "lat",
              "lon"
            ]
          }
        },
        "required": [
          "attributes"
        ]
      },
    },
    operation: "locationImport",
    kind: "mutation",
    document: "mutation LocationImport($input: LocationImportMutationInput!) { locationImport(input: $input) { reused reuseReason reuseDistance location { id name address organisationId parentTeamId } } }",
  },
  {
    tool: {
      name: "driversnote_location_update",
      description:
        "[write] Update a saved location. Arguments are the fields of the GraphQL mutation `input`.",
      annotations: {
        title: "Driversnote: Location Update",
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
              "address": {
                "type": "string"
              },
              "countryId": {
                "type": "string"
              },
              "dataSource": {
                "type": "string"
              },
              "formattedAddress": {
                "type": "string"
              },
              "isPinPosition": {
                "type": "boolean"
              },
              "lat": {
                "type": "number"
              },
              "lon": {
                "type": "number"
              },
              "name": {
                "type": "string"
              },
              "postalDistrictString": {
                "type": "string"
              },
              "sourceDataId": {
                "type": "string"
              },
              "tripTypeId": {
                "type": "string"
              }
            },
            "required": [
              "address",
              "countryId",
              "postalDistrictString"
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
    operation: "locationUpdate",
    kind: "mutation",
    document: "mutation LocationUpdate($input: LocationUpdateMutationInput!) { locationUpdate(input: $input) { location { id name address organisationId parentTeamId } } }",
  },
];

export const locationsHandler: DomainHandler = createDomainHandler("locations", locationsSpecs);
