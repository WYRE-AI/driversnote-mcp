/**
 * organisations domain handler
 *
 * Organisations (workplaces in the Driversnote UI): list, get, create, update, archive/unarchive, delete, reporting settings.
 *
 * One MCP tool per GraphQL operation. Every `document` is validated against
 * schema/driversnote.graphql by src/__tests__/schema-validation.test.ts.
 * Mutations take the GraphQL `input` fields as tool arguments.
 * Tier (read | write | admin) comes from src/tool-tiers.ts; descriptions carry
 * the matching prefix (checked by src/__tests__/tiers.test.ts).
 */

import type { DomainHandler, ToolSpec } from "../utils/types.js";
import { createDomainHandler } from "../utils/handler.js";

export const organisationsSpecs: ToolSpec[] = [
  {
    tool: {
      name: "driversnote_organisation_get",
      description:
        "Get one workplace (API name: organisation) by id, including reporting settings and the current reporting period.",
      annotations: {
        title: "Driversnote: Organisation Get",
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
    operation: "organisation",
    kind: "query",
    document: "query Organisation($id: ID!) { organisation(id: $id) { id name address isArchived isCalculatingReimbursement isCurrentlySelected reimbursementMethodValue reimbursementMethod { id name title } permissions currentUserRole { id roleType isLastAdmin } location { id name address } reportingSetting { id periodIntervalValue periodInterval { id name } periodStartOn enforcePeriodsEnabled submissionDeadlineEnabled submissionDeadlineDays approvalDeadlineEnabled approvalDeadlineDays periodEmailReminderEnabled customDetailsEnabled customName customAddress tripEditLogEnabled tripIssueDistanceMaxExceededEnabled tripIssueDistanceMaxExceededValue tripIssueHomeLocationEnabled tripIssueOutsideWorkhoursEnabled tripIssueOutsideWorkhoursStartTime tripIssueOutsideWorkhoursEndTime tripMaskingEnabled tripOriginEnabled tripRequireCommentsEnabled tripRequireTagsEnabled tripRouteEnabled tripTimesEnabled currentPeriod { periodStartOn periodEndOn } } } }",
  },
  {
    tool: {
      name: "driversnote_organisations_list",
      description:
        "List workplaces (API name: organisation). Filter by archived state, reimbursement method, role type and team scope. Paginated: defaults to first=100; pass after=<endCursor> for the next page.",
      annotations: {
        title: "Driversnote: Organisations List",
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
          "excludeTeamOrganisationsIfAdmin": {
            "type": "boolean"
          },
          "first": {
            "type": "integer"
          },
          "hasReimbursementMethod": {
            "type": "boolean"
          },
          "includeParentTeamOrganisations": {
            "type": "boolean"
          },
          "isArchived": {
            "type": "boolean"
          },
          "last": {
            "type": "integer"
          },
          "roleType": {
            "type": "string"
          }
        }
      },
    },
    operation: "organisations",
    kind: "query",
    defaultFirst: 100,
    document: "query Organisations($after: String, $before: String, $excludeTeamOrganisationsIfAdmin: Boolean, $first: Int, $hasReimbursementMethod: Boolean, $includeParentTeamOrganisations: Boolean, $isArchived: Boolean, $last: Int, $roleType: String) { organisations(after: $after, before: $before, excludeTeamOrganisationsIfAdmin: $excludeTeamOrganisationsIfAdmin, first: $first, hasReimbursementMethod: $hasReimbursementMethod, includeParentTeamOrganisations: $includeParentTeamOrganisations, isArchived: $isArchived, last: $last, roleType: $roleType) { totalCount pageInfo { hasNextPage hasPreviousPage startCursor endCursor } nodes { id name address isArchived isCalculatingReimbursement isCurrentlySelected reimbursementMethodValue reimbursementMethod { id name title } permissions currentUserRole { id roleType isLastAdmin } location { id name address } } } }",
  },
  {
    tool: {
      name: "driversnote_organisation_archive",
      description:
        "⚠ HIGH-IMPACT [admin] Archive a workplace (API name: organisation). Reversible with driversnote_organisation_unarchive. Arguments are the fields of the GraphQL mutation `input`.",
      annotations: {
        title: "Driversnote: Organisation Archive",
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
    operation: "organisationArchive",
    kind: "mutation",
    document: "mutation OrganisationArchive($input: OrganisationArchiveMutationInput!) { organisationArchive(input: $input) { organisation { id name isArchived reimbursementMethodValue } } }",
  },
  {
    tool: {
      name: "driversnote_organisation_create",
      description:
        "[write] Create a workplace (API name: organisation). Arguments are the fields of the GraphQL mutation `input`.",
      annotations: {
        title: "Driversnote: Organisation Create",
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
              "locationId": {
                "type": "string"
              },
              "name": {
                "type": "string"
              },
              "reimbursementMethod": {
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
    operation: "organisationCreate",
    kind: "mutation",
    document: "mutation OrganisationCreate($input: OrganisationCreateMutationInput!) { organisationCreate(input: $input) { organisation { id name isArchived reimbursementMethodValue } } }",
  },
  {
    tool: {
      name: "driversnote_organisation_delete",
      description:
        "⚠ DESTRUCTIVE — IRREVERSIBLE [admin] Delete a workplace (API name: organisation). Arguments are the fields of the GraphQL mutation `input`.",
      annotations: {
        title: "Driversnote: Organisation Delete",
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
    operation: "organisationDelete",
    kind: "mutation",
    document: "mutation OrganisationDelete($input: OrganisationDeleteMutationInput!) { organisationDelete(input: $input) { organisation { id name isArchived reimbursementMethodValue } } }",
  },
  {
    tool: {
      name: "driversnote_organisation_unarchive",
      description:
        "[write] ⚠ HIGH-IMPACT (reversible) Unarchive a workplace (API name: organisation). Arguments are the fields of the GraphQL mutation `input`.",
      annotations: {
        title: "Driversnote: Organisation Unarchive",
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
    operation: "organisationUnarchive",
    kind: "mutation",
    document: "mutation OrganisationUnarchive($input: OrganisationUnarchiveMutationInput!) { organisationUnarchive(input: $input) { organisation { id name isArchived reimbursementMethodValue } } }",
  },
  {
    tool: {
      name: "driversnote_organisation_update",
      description:
        "⚠ HIGH-IMPACT [admin] Update a workplace (API name: organisation). Can change the reimbursement method used to calculate reimbursements. Arguments are the fields of the GraphQL mutation `input`.",
      annotations: {
        title: "Driversnote: Organisation Update",
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
              "address": {
                "type": "string"
              },
              "locationId": {
                "type": "string"
              },
              "name": {
                "type": "string"
              },
              "reimbursementMethod": {
                "type": "string"
              }
            }
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
    operation: "organisationUpdate",
    kind: "mutation",
    document: "mutation OrganisationUpdate($input: OrganisationUpdateMutationInput!) { organisationUpdate(input: $input) { organisation { id name isArchived reimbursementMethodValue } } }",
  },
  {
    tool: {
      name: "driversnote_reporting_setting_update",
      description:
        "⚠ HIGH-IMPACT [admin] Update a workplace's reporting settings: period interval, deadlines, trip issue rules, masking. Takes the reporting setting id (see reportingSetting.id in driversnote_organisation_get). Arguments are the fields of the GraphQL mutation `input`.",
      annotations: {
        title: "Driversnote: Reporting Setting Update",
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
              "approvalDeadlineDays": {
                "type": "integer"
              },
              "approvalDeadlineEnabled": {
                "type": "boolean"
              },
              "customAddress": {
                "type": "string"
              },
              "customDetailsEnabled": {
                "type": "boolean"
              },
              "customName": {
                "type": "string"
              },
              "enforcePeriodsEnabled": {
                "type": "boolean"
              },
              "periodEmailReminderEnabled": {
                "type": "boolean"
              },
              "periodInterval": {
                "type": "string"
              },
              "periodStartOn": {
                "type": "string",
                "description": "ISO 8601 date, YYYY-MM-DD"
              },
              "submissionDeadlineDays": {
                "type": "integer"
              },
              "submissionDeadlineEnabled": {
                "type": "boolean"
              },
              "tripEditLogEnabled": {
                "type": "boolean"
              },
              "tripIssueDistanceMaxExceededEnabled": {
                "type": "boolean"
              },
              "tripIssueDistanceMaxExceededValue": {
                "type": "integer"
              },
              "tripIssueHomeLocationEnabled": {
                "type": "boolean"
              },
              "tripIssueOutsideWorkhoursEnabled": {
                "type": "boolean"
              },
              "tripIssueOutsideWorkhoursEndTime": {
                "type": "string"
              },
              "tripIssueOutsideWorkhoursStartTime": {
                "type": "string"
              },
              "tripMaskingEnabled": {
                "type": "boolean"
              },
              "tripOriginEnabled": {
                "type": "boolean"
              },
              "tripRequireCommentsEnabled": {
                "type": "boolean"
              },
              "tripRequireTagsEnabled": {
                "type": "boolean"
              },
              "tripRouteEnabled": {
                "type": "boolean"
              },
              "tripTimesEnabled": {
                "type": "boolean"
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
    operation: "reportingSettingUpdate",
    kind: "mutation",
    document: "mutation ReportingSettingUpdate($input: ReportingSettingUpdateMutationInput!) { reportingSettingUpdate(input: $input) { reportingSetting { id periodIntervalValue periodStartOn enforcePeriodsEnabled submissionDeadlineEnabled approvalDeadlineEnabled currentPeriod { periodStartOn periodEndOn } } } }",
  },
];

export const organisationsHandler: DomainHandler = createDomainHandler("organisations", organisationsSpecs);
