ALTER TABLE questions ADD COLUMN selection_options TEXT;
COMMENT ON COLUMN questions.selection_options IS
    'Multiple Selection options: JSON array of {label, rawValue}. Responses store unique zero-based option indexes; score is selected raw sum divided by all-option raw sum.';
ALTER TABLE questions ADD CONSTRAINT questions_multiple_selection_options_required
    CHECK (type <> 'multiple_selection' OR selection_options IS NOT NULL);
