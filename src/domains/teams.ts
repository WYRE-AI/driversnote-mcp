/**
 * teams domain handler
 *
 * Teams: teams, members and invitations (list, get, create, update, delete, invite, member upsert/role/delete).
 *
 * One MCP tool per GraphQL operation. Every `document` is validated against
 * schema/driversnote.graphql by src/__tests__/schema-validation.test.ts.
 * Mutations take the GraphQL `input` fields as tool arguments.
 * Tier (read | write | admin) comes from src/tool-tiers.ts; descriptions carry
 * the matching prefix (checked by src/__tests__/tiers.test.ts).
 */

import type { DomainHandler, ToolSpec } from "../utils/types.js";
import { createDomainHandler } from "../utils/handler.js";

export const teamsSpecs: ToolSpec[] = [
  {
    tool: {
      name: "driversnote_team_get",
      description:
        "Get a team by id (or the caller's team when id is omitted) with members, pending invitations and organisations (first 100 each).",
      annotations: {
        title: "Driversnote: Team Get",
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
    operation: "team",
    kind: "query",
    document: "query Team($id: ID) { team(id: $id) { id name permissions currentTeamMember { id role userName userEmail } teamSubscription { hasLicensesAvailable hasSubscription licensesCount licensesUsed } customerPermissions teamMembers(first: 100) { totalCount pageInfo { hasNextPage endCursor } nodes { id role userId userName userEmail isDeleted isLastAdmin isManagerOrAdmin userHasLicense userHasPassedMonthlyLimit userHasTeamLicense userLatestTripCreatedAt } } pendingTeamMembers(first: 100) { totalCount nodes { id recipientEmail recipientName roleTypeValue sentAt } } teamOrganisations(first: 100) { nodes { id organisationId teamId } } organisations(first: 100) { nodes { id name isArchived } } } }",
  },
  {
    tool: {
      name: "driversnote_teams_list",
      description:
        "List teams the caller belongs to. Paginated: defaults to first=100; pass after=<endCursor> for the next page.",
      annotations: {
        title: "Driversnote: Teams List",
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
    operation: "teams",
    kind: "query",
    defaultFirst: 100,
    document: "query Teams($after: String, $before: String, $first: Int, $last: Int) { teams(after: $after, before: $before, first: $first, last: $last) { totalCount pageInfo { hasNextPage hasPreviousPage startCursor endCursor } nodes { id name permissions currentTeamMember { id role userName userEmail } teamSubscription { hasLicensesAvailable hasSubscription licensesCount licensesUsed } } } }",
  },
  {
    tool: {
      name: "driversnote_team_create",
      description:
        "⚠ HIGH-IMPACT [admin] Create a team (the caller becomes its administrator). Arguments are the fields of the GraphQL mutation `input`.",
      annotations: {
        title: "Driversnote: Team Create",
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
              "name": {
                "type": "string"
              }
            },
            "required": [
              "name"
            ]
          },
          "organisationId": {
            "type": "string"
          },
          "parentTeamId": {
            "type": "string"
          },
          "reimbursementMethod": {
            "type": "string"
          }
        },
        "required": [
          "attributes"
        ]
      },
    },
    operation: "teamCreate",
    kind: "mutation",
    document: "mutation TeamCreate($input: TeamCreateMutationInput!) { teamCreate(input: $input) { team { id name } } }",
  },
  {
    tool: {
      name: "driversnote_team_delete",
      description:
        "⚠ DESTRUCTIVE — IRREVERSIBLE [admin] Delete a team. Removes team access for all members. Arguments are the fields of the GraphQL mutation `input`.",
      annotations: {
        title: "Driversnote: Team Delete",
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true
      },
      inputSchema: {
        "type": "object",
        "properties": {
          "parentTeamId": {
            "type": "string"
          },
          "teamId": {
            "type": "string"
          }
        },
        "required": [
          "parentTeamId",
          "teamId"
        ]
      },
    },
    operation: "teamDelete",
    kind: "mutation",
    document: "mutation TeamDelete($input: TeamDeleteMutationInput!) { teamDelete(input: $input) { team { id name } } }",
  },
  {
    tool: {
      name: "driversnote_team_invite",
      description:
        "⚠ HIGH-IMPACT [admin] Invite a person to a team by email (sends an invitation email). Arguments are the fields of the GraphQL mutation `input`.",
      annotations: {
        title: "Driversnote: Team Invite",
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
              "email": {
                "type": "string"
              },
              "name": {
                "type": "string"
              },
              "roleType": {
                "type": "string",
                "enum": [
                  "admin",
                  "manager",
                  "member"
                ]
              }
            },
            "required": [
              "email",
              "name"
            ]
          },
          "id": {
            "type": "string"
          }
        },
        "required": [
          "attributes"
        ]
      },
    },
    operation: "teamInvite",
    kind: "mutation",
    document: "mutation TeamInvite($input: TeamInviteMutationInput!) { teamInvite(input: $input) { invitation { id recipientEmail recipientName roleTypeValue sentAt } } }",
  },
  {
    tool: {
      name: "driversnote_team_invite_delete",
      description:
        "⚠ HIGH-IMPACT [admin] Delete a pending team invitation. Arguments are the fields of the GraphQL mutation `input`.",
      annotations: {
        title: "Driversnote: Team Invite Delete",
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
        }
      },
    },
    operation: "teamInviteDelete",
    kind: "mutation",
    document: "mutation TeamInviteDelete($input: TeamInviteDeleteMutationInput!) { teamInviteDelete(input: $input) { invitation { id recipientEmail recipientName roleTypeValue sentAt } } }",
  },
  {
    tool: {
      name: "driversnote_team_invite_resend",
      description:
        "⚠ HIGH-IMPACT [admin] Resend a pending team invitation email. Arguments are the fields of the GraphQL mutation `input`.",
      annotations: {
        title: "Driversnote: Team Invite Resend",
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
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
    operation: "teamInviteResend",
    kind: "mutation",
    document: "mutation TeamInviteResend($input: TeamInviteResendMutationInput!) { teamInviteResend(input: $input) { invitation { id recipientEmail recipientName roleTypeValue sentAt } } }",
  },
  {
    tool: {
      name: "driversnote_team_member_bulk_upsert",
      description:
        "⚠ HIGH-IMPACT [admin] Create or update several team memberships for one user (changes access). Arguments are the fields of the GraphQL mutation `input`.",
      annotations: {
        title: "Driversnote: Team Member Bulk Upsert",
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true
      },
      inputSchema: {
        "type": "object",
        "properties": {
          "attributesList": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "deleted": {
                  "type": "boolean"
                },
                "role": {
                  "type": "string"
                },
                "teamId": {
                  "type": "string"
                }
              },
              "required": [
                "deleted",
                "role",
                "teamId"
              ]
            }
          },
          "userId": {
            "type": "string"
          }
        },
        "required": [
          "attributesList",
          "userId"
        ]
      },
    },
    operation: "teamMemberBulkUpsert",
    kind: "mutation",
    document: "mutation TeamMemberBulkUpsert($input: TeamMemberBulkUpsertMutationInput!) { teamMemberBulkUpsert(input: $input) { teamMembers { id role userId userName userEmail isDeleted isLastAdmin isManagerOrAdmin userHasLicense userHasPassedMonthlyLimit userHasTeamLicense userLatestTripCreatedAt } } }",
  },
  {
    tool: {
      name: "driversnote_team_member_delete",
      description:
        "⚠ HIGH-IMPACT [admin] Remove a team member (soft delete; changes access). Arguments are the fields of the GraphQL mutation `input`.",
      annotations: {
        title: "Driversnote: Team Member Delete",
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
    operation: "teamMemberDelete",
    kind: "mutation",
    document: "mutation TeamMemberDelete($input: TeamMemberDeleteMutationInput!) { teamMemberDelete(input: $input) { teamMember { id role userId userName userEmail isDeleted isLastAdmin isManagerOrAdmin userHasLicense userHasPassedMonthlyLimit userHasTeamLicense userLatestTripCreatedAt } } }",
  },
  {
    tool: {
      name: "driversnote_team_member_update_role",
      description:
        "⚠ HIGH-IMPACT [admin] Change a team member's role (admin, manager, member). Arguments are the fields of the GraphQL mutation `input`.",
      annotations: {
        title: "Driversnote: Team Member Update Role",
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
          "role": {
            "type": "string"
          }
        },
        "required": [
          "id",
          "role"
        ]
      },
    },
    operation: "teamMemberUpdateRole",
    kind: "mutation",
    document: "mutation TeamMemberUpdateRole($input: TeamMemberUpdateRoleMutationInput!) { teamMemberUpdateRole(input: $input) { teamMember { id role userId userName userEmail isDeleted isLastAdmin isManagerOrAdmin userHasLicense userHasPassedMonthlyLimit userHasTeamLicense userLatestTripCreatedAt } } }",
  },
  {
    tool: {
      name: "driversnote_team_member_upsert",
      description:
        "⚠ HIGH-IMPACT [admin] Create or update a team membership for a user (set deleted=true to remove). Arguments are the fields of the GraphQL mutation `input`.",
      annotations: {
        title: "Driversnote: Team Member Upsert",
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
              "deleted": {
                "type": "boolean"
              },
              "role": {
                "type": "string"
              },
              "teamId": {
                "type": "string"
              }
            },
            "required": [
              "deleted",
              "role",
              "teamId"
            ]
          },
          "userId": {
            "type": "string"
          }
        },
        "required": [
          "attributes",
          "userId"
        ]
      },
    },
    operation: "teamMemberUpsert",
    kind: "mutation",
    document: "mutation TeamMemberUpsert($input: TeamMemberUpsertMutationInput!) { teamMemberUpsert(input: $input) { teamMember { id role userId userName userEmail isDeleted isLastAdmin isManagerOrAdmin userHasLicense userHasPassedMonthlyLimit userHasTeamLicense userLatestTripCreatedAt } } }",
  },
  {
    tool: {
      name: "driversnote_team_update",
      description:
        "⚠ HIGH-IMPACT [admin] Rename a team. Arguments are the fields of the GraphQL mutation `input`.",
      annotations: {
        title: "Driversnote: Team Update",
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
              "name": {
                "type": "string"
              }
            },
            "required": [
              "name"
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
    operation: "teamUpdate",
    kind: "mutation",
    document: "mutation TeamUpdate($input: TeamUpdateMutationInput!) { teamUpdate(input: $input) { team { id name } } }",
  },
];

export const teamsHandler: DomainHandler = createDomainHandler("teams", teamsSpecs);
