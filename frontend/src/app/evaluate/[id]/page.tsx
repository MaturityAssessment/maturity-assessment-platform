import { redirect } from "next/navigation";

export default function EvaluateAssessmentPage({ params }: { params: { id: string } }) {
  redirect(`/assessment?draftId=${encodeURIComponent(params.id)}&tab=evaluation`);
}
