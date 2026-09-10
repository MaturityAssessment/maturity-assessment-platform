"use client";

import { useParams, useSearchParams } from "next/navigation";
import MaturityModelEditorPage from "../../editor/MaturityModelEditorPage";

export default function EditMaturityModelPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const requestedReturnHref = searchParams.get("returnTo");
  const returnHref = requestedReturnHref?.startsWith("/maturity-models/")
    ? requestedReturnHref
    : undefined;
  return (
    <MaturityModelEditorPage
      sourceModelId={params.id}
      returnHref={returnHref}
    />
  );
}
