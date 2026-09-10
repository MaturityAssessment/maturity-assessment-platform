import { Layers3 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components";

export default function ModelPageState({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl items-center px-6 py-12">
      <section className="w-full rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm">
        <Layers3 className="mx-auto h-9 w-9 text-slate-300" aria-hidden="true" />
        <h1 className="mt-4 text-xl font-bold text-slate-950">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">{message}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {onRetry && (
            <Button
              type="button"
              onClick={onRetry}
              className="bg-indigo-600 text-white hover:bg-indigo-700"
            >
              Try again
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link href="/maturity-models">Back to models</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

export function getModelErrorMessage(error: unknown, fallback: string) {
  const candidate = error as {
    response?: { data?: unknown };
    errorMessage?: unknown;
  };
  const responseData = candidate?.response?.data;
  if (typeof responseData === "string" && responseData.trim()) {
    return responseData;
  }
  if (responseData && typeof responseData === "object") {
    const message = (responseData as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  if (
    typeof candidate?.errorMessage === "string" &&
    candidate.errorMessage.trim()
  ) {
    return candidate.errorMessage;
  }
  return fallback;
}
