# Question cards

`AssessmentQuestionCard` selects the input using `question.type`, supplies
validation and review state, and binds value changes to the assessment field.
`QuestionCard` renders the frame, actions, guidance, and feedback.

Each input is controlled and can also be used directly:

```tsx
import { BooleanQuestionInput } from "@/components/assessment/question-card";

<BooleanQuestionInput value={answer} onChange={setAnswer} disabled={readOnly} />
```

- Boolean and scale inputs have their own files.
- Choice inputs share a file; multiple selection uses numeric option values
  and preserves `[]` as an explicit “None of the above” answer.
- Numeric and percentage inputs share a private implementation.
- Open answers accept their character limit and optional helper text as props.
- The shell receives visual `status` and `interactionDisabled` separately.

Inputs emit values. Field keys, dependency rules, review decisions, persistence,
and assistant context belong to their caller. Stories demonstrate each input
and card appearance.
