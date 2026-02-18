-- Migration: Add new goal prompt columns for Pre Match and Strength goals
-- Created: 2026-02-18

-- Add new columns for the 3 new goals
ALTER TABLE prompt_versions
ADD COLUMN IF NOT EXISTS pre_match_content TEXT,
ADD COLUMN IF NOT EXISTS fuerza_general_miembro_superior_content TEXT,
ADD COLUMN IF NOT EXISTS fuerza_general_miembro_inferior_content TEXT;

-- Add comments to document the new columns
COMMENT ON COLUMN prompt_versions.pre_match_content IS 'Prompt content for pre_match goal (activation before competition)';
COMMENT ON COLUMN prompt_versions.fuerza_general_miembro_superior_content IS 'Prompt content for fuerza_general_miembro_superior goal (upper body strength)';
COMMENT ON COLUMN prompt_versions.fuerza_general_miembro_inferior_content IS 'Prompt content for fuerza_general_miembro_inferior goal (lower body strength)';

-- Verify columns were added
SELECT
    column_name,
    data_type,
    is_nullable
FROM
    information_schema.columns
WHERE
    table_name = 'prompt_versions'
    AND column_name IN (
        'pre_match_content',
        'fuerza_general_miembro_superior_content',
        'fuerza_general_miembro_inferior_content'
    )
ORDER BY
    column_name;
