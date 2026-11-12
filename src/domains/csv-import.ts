/**
 * csv_import domain handler
 *
 * CSV import: get import file status, upload CSV content, run the import.
 *
 * One MCP tool per GraphQL operation. Every `document` is validated against
 * schema/driversnote.graphql by src/__tests__/schema-validation.test.ts.
 * Mutations take the GraphQL `input` fields as tool arguments.
 * Tier (read | write | admin) comes from src/tool-tiers.ts; descriptions carry
 * the matching prefix (checked by src/__tests__/tiers.test.ts).
 */

import type { DomainHandler, ToolSpec } from "../utils/types.js";
import { createDomainHandler } from "../utils/handler.js";

export const csvImportSpecs: ToolSpec[] = [
  {
    tool: {
      name: "driversnote_csv_import_file_get",
      description:
        "Get a CSV import file by UUID: status, progress, error code and the first 100 parsed rows with validation errors.",
      annotations: {
        title: "Driversnote: Csv Import File Get",
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
    operation: "csvImportFile",
    kind: "query",
    document: "query CsvImportFile($id: ID!) { csvImportFile(id: $id) { id createdAt updatedAt creatorId errorCode parentTeamId progress resource status rows(first: 100) { totalCount pageInfo { hasNextPage endCursor } nodes { id rowIndex status localizedErrors processedData rawData } } } }",
  },
  {
    tool: {
      name: "driversnote_csv_import_file_create",
      description:
        "[write] Upload CSV content (as a string) to create a CSV import file for trips, locations, etc. Validation runs asynchronously; poll driversnote_csv_import_file_get, then run driversnote_csv_import_file_import. Arguments are the fields of the GraphQL mutation `input`.",
      annotations: {
        title: "Driversnote: Csv Import File Create",
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true
      },
      inputSchema: {
        "type": "object",
        "properties": {
          "fileContent": {
            "type": "string"
          },
          "parentTeamId": {
            "type": "string"
          },
          "resource": {
            "type": "string"
          }
        },
        "required": [
          "fileContent",
          "resource"
        ]
      },
    },
    operation: "csvImportFileCreate",
    kind: "mutation",
    document: "mutation CsvImportFileCreate($input: CsvImportFileCreateMutationInput!) { csvImportFileCreate(input: $input) { csvImportFile { id createdAt updatedAt creatorId errorCode parentTeamId progress resource status } } }",
  },
  {
    tool: {
      name: "driversnote_csv_import_file_import",
      description:
        "[write] Import a validated CSV file. Bulk-creates records (e.g. trips) from the uploaded rows. Arguments are the fields of the GraphQL mutation `input`.",
      annotations: {
        title: "Driversnote: Csv Import File Import",
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
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
    operation: "csvImportFileImport",
    kind: "mutation",
    document: "mutation CsvImportFileImport($input: CsvImportFileImportMutationInput!) { csvImportFileImport(input: $input) { csvImportFile { id createdAt updatedAt creatorId errorCode parentTeamId progress resource status } } }",
  },
];

export const csvImportHandler: DomainHandler = createDomainHandler("csv_import", csvImportSpecs);
