-- Migration: Drop unused columns from prompt_versions
-- These columns are legacy from a previous schema and not used by current code
-- Created: 2026-02-18

-- Drop unused modular prompt columns
-- Keeping: id, created_at, is_active, version_label, updated_by, and all 9 goal content columns
ALTER TABLE prompt_versions
DROP COLUMN IF EXISTS methodology_content,
DROP COLUMN IF EXISTS categories_content,
DROP COLUMN IF EXISTS rules_content,
DROP COLUMN IF EXISTS structure_content;

-- Verify the table now only has necessary columns
SELECT
    column_name,
    data_type,
    is_nullable
FROM
    information_schema.columns
WHERE
    table_name = 'prompt_versions'
ORDER BY
    ordinal_position;
