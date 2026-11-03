# Changelog

## [Unreleased]

- Aaron's tier decisions of 2026-11-03: report_create, report_update and report_replace are write; trip_bulk_update, trip_bulk_restore, location_import and csv_import_file_import stay write. All 33 admin tools approved, off by default; no tools pending.

- The admin tier (33 tools) was approved by Aaron on 2026-11-03 and is off by default; enable it explicitly via `DRIVERSNOTE_TOOL_TIERS`. Cleared pending approval metadata and description notices while preserving admin classifications and reason notes.
