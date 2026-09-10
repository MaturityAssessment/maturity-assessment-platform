"use client";

import { useParams } from "next/navigation";
import EvaluationWorkspace from "./EvaluationWorkspace";

export default function EvaluateAssessmentPage() {
  const params = useParams();
  return <EvaluationWorkspace assessmentId={params.id as string} />;
}
