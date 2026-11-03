/**
 * tags domain handler
 *
 * Tag categories and tags: default categories, create, update, delete.
 *
 * One MCP tool per GraphQL operation. Every `document` is validated against
 * schema/driversnote.graphql by src/__tests__/schema-validation.test.ts.
 * Mutations take the GraphQL `input` fields as tool arguments.
 * Tier (read | write | admin) comes from src/tool-tiers.ts; descriptions carry
 * the matching prefix (checked by src/__tests__/tiers.test.ts).
 */

import type { DomainHandler, ToolSpec } from "../utils/types.js";
import { createDomainHandler } from "../utils/handler.js";

export const tagsSpecs: ToolSpec[] = [
  {
    tool: {
      name: "driversnote_tag_categories_default_list",
      description:
        "List default tag categories with their tags. Paginated: defaults to first=100; pass after=<endCursor> for the next page.",
      annotations: {
        title: "Driversnote: Tag Categories Default List",
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
    operation: "tagCategoriesDefault",
    kind: "query",
    defaultFirst: 100,
    document: "query TagCategoriesDefault($after: String, $before: String, $first: Int, $last: Int) { tagCategoriesDefault(after: $after, before: $before, first: $first, last: $last) { totalCount pageInfo { hasNextPage hasPreviousPage startCursor endCursor } nodes { id name organisationId createdAt updatedAt tags(first: 100) { totalCount nodes { id name isInUse } } } } }",
  },
  {
    tool: {
      name: "driversnote_tag_category_create",
      description:
        "[write] Create a tag category in a workplace. Arguments are the fields of the GraphQL mutation `input`.",
      annotations: {
        title: "Driversnote: Tag Category Create",
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true
      },
      inputSchema: {
        "type": "object",
        "properties": {
          "name": {
            "type": "string"
          },
          "organisationId": {
            "type": "string"
          }
        },
        "required": [
          "name",
          "organisationId"
        ]
      },
    },
    operation: "tagCategoryCreate",
    kind: "mutation",
    document: "mutation TagCategoryCreate($input: TagCategoryCreateMutationInput!) { tagCategoryCreate(input: $input) { tagCategory { id name organisationId } } }",
  },
  {
    tool: {
      name: "driversnote_tag_category_delete",
      description:
        "⚠ DESTRUCTIVE — IRREVERSIBLE [admin] Delete a tag category from a workplace. Arguments are the fields of the GraphQL mutation `input`. Pending tier sign-off.",
      annotations: {
        title: "Driversnote: Tag Category Delete",
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
          },
          "organisationId": {
            "type": "string"
          }
        },
        "required": [
          "id",
          "organisationId"
        ]
      },
    },
    operation: "tagCategoryDelete",
    kind: "mutation",
    document: "mutation TagCategoryDelete($input: TagCategoryDeleteMutationInput!) { tagCategoryDelete(input: $input) { tagCategory { id name organisationId } } }",
  },
  {
    tool: {
      name: "driversnote_tag_category_update",
      description:
        "[write] Rename a tag category. Arguments are the fields of the GraphQL mutation `input`.",
      annotations: {
        title: "Driversnote: Tag Category Update",
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
          },
          "name": {
            "type": "string"
          },
          "organisationId": {
            "type": "string"
          }
        },
        "required": [
          "id",
          "name",
          "organisationId"
        ]
      },
    },
    operation: "tagCategoryUpdate",
    kind: "mutation",
    document: "mutation TagCategoryUpdate($input: TagCategoryUpdateMutationInput!) { tagCategoryUpdate(input: $input) { tagCategory { id name organisationId } } }",
  },
  {
    tool: {
      name: "driversnote_tag_create",
      description:
        "[write] Create a tag in a tag category. Arguments are the fields of the GraphQL mutation `input`.",
      annotations: {
        title: "Driversnote: Tag Create",
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true
      },
      inputSchema: {
        "type": "object",
        "properties": {
          "name": {
            "type": "string"
          },
          "organisationId": {
            "type": "string"
          },
          "tagCategoryId": {
            "type": "string"
          }
        },
        "required": [
          "name",
          "organisationId",
          "tagCategoryId"
        ]
      },
    },
    operation: "tagCreate",
    kind: "mutation",
    document: "mutation TagCreate($input: TagCreateMutationInput!) { tagCreate(input: $input) { tag { id name tagCategoryId } } }",
  },
  {
    tool: {
      name: "driversnote_tag_delete",
      description:
        "⚠ DESTRUCTIVE — IRREVERSIBLE [admin] Delete a tag. Arguments are the fields of the GraphQL mutation `input`. Pending tier sign-off.",
      annotations: {
        title: "Driversnote: Tag Delete",
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
          },
          "organisationId": {
            "type": "string"
          }
        },
        "required": [
          "id",
          "organisationId"
        ]
      },
    },
    operation: "tagDelete",
    kind: "mutation",
    document: "mutation TagDelete($input: TagDeleteMutationInput!) { tagDelete(input: $input) { tag { id name tagCategoryId } } }",
  },
  {
    tool: {
      name: "driversnote_tag_update",
      description:
        "[write] Rename a tag or move it to another category. Arguments are the fields of the GraphQL mutation `input`.",
      annotations: {
        title: "Driversnote: Tag Update",
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
          },
          "name": {
            "type": "string"
          },
          "organisationId": {
            "type": "string"
          },
          "tagCategoryId": {
            "type": "string"
          }
        },
        "required": [
          "id",
          "name",
          "organisationId",
          "tagCategoryId"
        ]
      },
    },
    operation: "tagUpdate",
    kind: "mutation",
    document: "mutation TagUpdate($input: TagUpdateMutationInput!) { tagUpdate(input: $input) { tag { id name tagCategoryId } } }",
  },
];

export const tagsHandler: DomainHandler = createDomainHandler("tags", tagsSpecs);
