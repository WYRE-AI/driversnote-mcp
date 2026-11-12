/**
 * contacts domain handler
 *
 * Contacts: list, most recently used, create.
 *
 * One MCP tool per GraphQL operation. Every `document` is validated against
 * schema/driversnote.graphql by src/__tests__/schema-validation.test.ts.
 * Mutations take the GraphQL `input` fields as tool arguments.
 * Tier (read | write | admin) comes from src/tool-tiers.ts; descriptions carry
 * the matching prefix (checked by src/__tests__/tiers.test.ts).
 */

import type { DomainHandler, ToolSpec } from "../utils/types.js";
import { createDomainHandler } from "../utils/handler.js";

export const contactsSpecs: ToolSpec[] = [
  {
    tool: {
      name: "driversnote_contacts_list",
      description:
        "List the user's saved contacts (people reports are shared with). Paginated: defaults to first=100; pass after=<endCursor> for the next page.",
      annotations: {
        title: "Driversnote: Contacts List",
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
    operation: "contacts",
    kind: "query",
    defaultFirst: 100,
    document: "query Contacts($after: String, $before: String, $first: Int, $last: Int) { contacts(after: $after, before: $before, first: $first, last: $last) { totalCount pageInfo { hasNextPage hasPreviousPage startCursor endCursor } nodes { id name email role isTeamMember creationContext createdAt updatedAt } } }",
  },
  {
    tool: {
      name: "driversnote_contacts_recent",
      description:
        "List the user's most recently used contacts. Paginated: defaults to first=100; pass after=<endCursor> for the next page.",
      annotations: {
        title: "Driversnote: Contacts Recent",
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
    operation: "contactsMostRecentlyUsed",
    kind: "query",
    defaultFirst: 100,
    document: "query ContactsMostRecentlyUsed($after: String, $before: String, $first: Int, $last: Int) { contactsMostRecentlyUsed(after: $after, before: $before, first: $first, last: $last) { totalCount pageInfo { hasNextPage hasPreviousPage startCursor endCursor } nodes { id name email role isTeamMember creationContext createdAt updatedAt } } }",
  },
  {
    tool: {
      name: "driversnote_contact_create",
      description:
        "[write] Create a contact. Arguments are the fields of the GraphQL mutation `input`.",
      annotations: {
        title: "Driversnote: Contact Create",
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
              "creationContext": {
                "type": "string",
                "enum": [
                  "report_share",
                  "user_setup"
                ]
              },
              "email": {
                "type": "string"
              },
              "name": {
                "type": "string"
              },
              "role": {
                "type": "string"
              }
            },
            "required": [
              "creationContext",
              "email",
              "name"
            ]
          }
        },
        "required": [
          "attributes"
        ]
      },
    },
    operation: "contactCreate",
    kind: "mutation",
    document: "mutation ContactCreate($input: ContactCreateMutationInput!) { contactCreate(input: $input) { contact { id name email role isTeamMember creationContext createdAt updatedAt } } }",
  },
];

export const contactsHandler: DomainHandler = createDomainHandler("contacts", contactsSpecs);
