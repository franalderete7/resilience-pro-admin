-- Migration: Add methodology_content for editable base prompt (metodología/estilo)
-- Created: 2026-02-20
-- Trainer can edit role, phases, nomenclature, universal rules via admin UI

ALTER TABLE prompt_versions
ADD COLUMN IF NOT EXISTS methodology_content TEXT;

COMMENT ON COLUMN prompt_versions.methodology_content IS 'Editable methodology/style section: role, phases, nomenclature, universal rules. Technical constraints (JSON format, exercise_id) remain in code.';
