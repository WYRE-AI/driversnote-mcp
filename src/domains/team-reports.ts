/**
 * team_reports domain handler
 *
 * Team reports: reviewer workflow (list, get, states, tab counts; submit, withdraw, approve, reject, process, bulk variants).
 *
 * One MCP tool per GraphQL operation. Every `document` is validated against
 * schema/driversnote.graphql by src/__tests__/schema-validation.test.ts.
 * Mutations take the GraphQL `input` fields as tool arguments.
 * Tier (read | write | admin) comes from src/tool-tiers.ts; descriptions carry
 * the matching prefix (checked by src/__tests__/tiers.test.ts).
 */

import type { DomainHandler, ToolSpec } from "../utils/types.js";
import { createDomainHandler } from "../utils/handler.js";

export const teamReportsSpecs: ToolSpec[] = [
  {
    tool: {
      name: "driversnote_team_report_get",
      description:
        "Get a team report (a report submitted to a reviewer) by id.",
      annotations: {
        title: "Driversnote: Team Report Get",
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
    operation: "teamReport",
    kind: "query",
    document: "query TeamReport($id: ID!) { teamReport(id: $id) { id state stateLabel team { id name } teamMember { id userId userName userEmail } reviewer { id userName } report { id name title state startDate endDate totalAmount totalDistance currency organisationName vehicleName userName pdfUrl excelUrl } } }",
  },
  {
    tool: {
      name: "driversnote_team_report_states_list",
      description:
        "List team report states (ids accepted by the state filter of team reports list).",
      annotations: {
        title: "Driversnote: Team Report States List",
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
    operation: "teamReportStates",
    kind: "query",
    document: "query TeamReportStates { teamReportStates { id label } }",
  },
  {
    tool: {
      name: "driversnote_team_report_tab_counts",
      description:
        "Count team reports per state for a team, reviewer, member and/or date range.",
      annotations: {
        title: "Driversnote: Team Report Tab Counts",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      },
      inputSchema: {
        "type": "object",
        "properties": {
          "endDate": {
            "type": "string",
            "description": "ISO 8601 date, YYYY-MM-DD"
          },
          "includeNotSubmittedCounts": {
            "type": "boolean"
          },
          "reviewerId": {
            "type": "string"
          },
          "startDate": {
            "type": "string",
            "description": "ISO 8601 date, YYYY-MM-DD"
          },
          "teamId": {
            "type": "string"
          },
          "teamMemberId": {
            "type": "string"
          }
        }
      },
    },
    operation: "teamReportTabCounts",
    kind: "query",
    document: "query TeamReportTabCounts($endDate: ISO8601Date, $includeNotSubmittedCounts: Boolean, $reviewerId: ID, $startDate: ISO8601Date, $teamId: ID, $teamMemberId: ID) { teamReportTabCounts(endDate: $endDate, includeNotSubmittedCounts: $includeNotSubmittedCounts, reviewerId: $reviewerId, startDate: $startDate, teamId: $teamId, teamMemberId: $teamMemberId) { state count } }",
  },
  {
    tool: {
      name: "driversnote_team_reports_list",
      description:
        "List team reports (submitted reports) filtered by team, member, reviewer, state and dates. Requires team admin/manager access. Paginated: defaults to first=100; pass after=<endCursor> for the next page.",
      annotations: {
        title: "Driversnote: Team Reports List",
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
          "reviewerId": {
            "type": "string"
          },
          "startDate": {
            "type": "string",
            "description": "ISO 8601 date, YYYY-MM-DD"
          },
          "state": {
            "type": "string"
          },
          "teamId": {
            "type": "string"
          },
          "teamMemberId": {
            "type": "string"
          }
        }
      },
    },
    operation: "teamReports",
    kind: "query",
    defaultFirst: 100,
    document: "query TeamReports($after: String, $before: String, $endDate: ISO8601Date, $first: Int, $last: Int, $reviewerId: ID, $startDate: ISO8601Date, $state: String, $teamId: ID, $teamMemberId: ID) { teamReports(after: $after, before: $before, endDate: $endDate, first: $first, last: $last, reviewerId: $reviewerId, startDate: $startDate, state: $state, teamId: $teamId, teamMemberId: $teamMemberId) { totalCount pageInfo { hasNextPage hasPreviousPage startCursor endCursor } nodes { id state stateLabel team { id name } teamMember { id userId userName userEmail } reviewer { id userName } report { id name title state startDate endDate totalAmount totalDistance currency organisationName vehicleName userName pdfUrl excelUrl } } } }",
  },
  {
    tool: {
      name: "driversnote_team_report_approve",
      description:
        "⚠ HIGH-IMPACT [admin] Approve a submitted team report (approves reimbursement). Arguments are the fields of the GraphQL mutation `input`. Pending tier sign-off.",
      annotations: {
        title: "Driversnote: Team Report Approve",
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
              "note": {
                "type": "string"
              },
              "reviewerId": {
                "type": "string"
              }
            }
          },
          "id": {
            "type": "string"
          }
        }
      },
    },
    operation: "teamReportApprove",
    kind: "mutation",
    document: "mutation TeamReportApprove($input: TeamReportApproveMutationInput!) { teamReportApprove(input: $input) { teamReport { id state stateLabel } } }",
  },
  {
    tool: {
      name: "driversnote_team_report_bulk_approve",
      description:
        "⚠ HIGH-IMPACT [admin] Approve several submitted team reports (approves reimbursement). Arguments are the fields of the GraphQL mutation `input`. Pending tier sign-off.",
      annotations: {
        title: "Driversnote: Team Report Bulk Approve",
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
              "note": {
                "type": "string"
              },
              "reviewerId": {
                "type": "string"
              }
            }
          },
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
    operation: "teamReportBulkApprove",
    kind: "mutation",
    document: "mutation TeamReportBulkApprove($input: TeamReportBulkApproveMutationInput!) { teamReportBulkApprove(input: $input) { teamReports { id state stateLabel } } }",
  },
  {
    tool: {
      name: "driversnote_team_report_bulk_process",
      description:
        "⚠ HIGH-IMPACT [admin] Mark several approved team reports as processed/paid. Arguments are the fields of the GraphQL mutation `input`. Pending tier sign-off.",
      annotations: {
        title: "Driversnote: Team Report Bulk Process",
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
              "note": {
                "type": "string"
              },
              "reviewerId": {
                "type": "string"
              }
            }
          },
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
    operation: "teamReportBulkProcess",
    kind: "mutation",
    document: "mutation TeamReportBulkProcess($input: TeamReportBulkProcessMutationInput!) { teamReportBulkProcess(input: $input) { teamReports { id state stateLabel } } }",
  },
  {
    tool: {
      name: "driversnote_team_report_bulk_reject",
      description:
        "⚠ HIGH-IMPACT [admin] Reject several submitted team reports. Arguments are the fields of the GraphQL mutation `input`. Pending tier sign-off.",
      annotations: {
        title: "Driversnote: Team Report Bulk Reject",
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
              "note": {
                "type": "string"
              },
              "reviewerId": {
                "type": "string"
              }
            }
          },
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
    operation: "teamReportBulkReject",
    kind: "mutation",
    document: "mutation TeamReportBulkReject($input: TeamReportBulkRejectMutationInput!) { teamReportBulkReject(input: $input) { teamReports { id state stateLabel } } }",
  },
  {
    tool: {
      name: "driversnote_team_report_process",
      description:
        "⚠ HIGH-IMPACT [admin] Mark an approved team report as processed/paid. Arguments are the fields of the GraphQL mutation `input`. Pending tier sign-off.",
      annotations: {
        title: "Driversnote: Team Report Process",
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
              "note": {
                "type": "string"
              },
              "reviewerId": {
                "type": "string"
              }
            }
          },
          "id": {
            "type": "string"
          }
        }
      },
    },
    operation: "teamReportProcess",
    kind: "mutation",
    document: "mutation TeamReportProcess($input: TeamReportProcessMutationInput!) { teamReportProcess(input: $input) { teamReport { id state stateLabel } } }",
  },
  {
    tool: {
      name: "driversnote_team_report_reject",
      description:
        "⚠ HIGH-IMPACT [admin] Reject a submitted team report. Arguments are the fields of the GraphQL mutation `input`. Pending tier sign-off.",
      annotations: {
        title: "Driversnote: Team Report Reject",
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
              "note": {
                "type": "string"
              },
              "reviewerId": {
                "type": "string"
              }
            }
          },
          "id": {
            "type": "string"
          }
        }
      },
    },
    operation: "teamReportReject",
    kind: "mutation",
    document: "mutation TeamReportReject($input: TeamReportRejectMutationInput!) { teamReportReject(input: $input) { teamReport { id state stateLabel } } }",
  },
  {
    tool: {
      name: "driversnote_team_report_submit",
      description:
        "⚠ HIGH-IMPACT [admin] Submit a report to a team reviewer for reimbursement. Arguments are the fields of the GraphQL mutation `input`. Pending tier sign-off.",
      annotations: {
        title: "Driversnote: Team Report Submit",
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
              "note": {
                "type": "string"
              },
              "reviewerId": {
                "type": "string"
              }
            }
          },
          "reportId": {
            "type": "string"
          },
          "teamId": {
            "type": "string"
          }
        },
        "required": [
          "reportId",
          "teamId"
        ]
      },
    },
    operation: "teamReportSubmit",
    kind: "mutation",
    document: "mutation TeamReportSubmit($input: TeamReportSubmitMutationInput!) { teamReportSubmit(input: $input) { teamReport { id state stateLabel } } }",
  },
  {
    tool: {
      name: "driversnote_team_report_withdraw",
      description:
        "⚠ HIGH-IMPACT [admin] Withdraw a submitted team report. Arguments are the fields of the GraphQL mutation `input`. Pending tier sign-off.",
      annotations: {
        title: "Driversnote: Team Report Withdraw",
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
    operation: "teamReportWithdraw",
    kind: "mutation",
    document: "mutation TeamReportWithdraw($input: TeamReportWithdrawMutationInput!) { teamReportWithdraw(input: $input) { teamReport { id state stateLabel } } }",
  },
];

export const teamReportsHandler: DomainHandler = createDomainHandler("team_reports", teamReportsSpecs);
