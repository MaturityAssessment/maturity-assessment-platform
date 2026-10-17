ALTER TABLE questions ADD COLUMN dependency_condition TEXT;

UPDATE questions child
SET dependency_condition = '{"type":"boolean","answers":[true]}'
FROM questions parent
WHERE child.depends_on_question_id = parent.id AND lower(parent.type) = 'boolean';

-- Preserve order and scores: persisted choice_index continues to identify the same option.
UPDATE questions q
SET choice_options = (
    SELECT COALESCE(jsonb_agg(
        option.value || jsonb_build_object('id', COALESCE(NULLIF(option.value->>'id', ''),
            'option-' || q.id || '-' || option.ordinality)) ORDER BY option.ordinality
    ), '[]'::jsonb)::text
    FROM jsonb_array_elements(q.choice_options::jsonb) WITH ORDINALITY AS option(value, ordinality)
)
WHERE lower(q.type) = 'multiple_choice' AND q.choice_options IS NOT NULL
  AND jsonb_typeof(q.choice_options::jsonb) = 'array';
