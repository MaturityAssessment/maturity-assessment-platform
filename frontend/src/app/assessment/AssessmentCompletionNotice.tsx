import { CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getAssessmentCompletionIssueLabel,
  type AssessmentCompletionIssues,
} from "./assessmentFlowUtils";

export default function AssessmentCompletionNotice({
  issues,
  className,
}: {
  issues: AssessmentCompletionIssues;
  className?: string;
}) {
  const label = getAssessmentCompletionIssueLabel(issues);
  if (!label) return null;

  return (
    <span className={cn("flex items-start gap-1.5 text-xs font-medium leading-5 text-amber-700", className)}>
      <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
