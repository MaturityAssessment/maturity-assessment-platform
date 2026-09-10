"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NavButtonsProps {
  previousLabel: string;
  onPrevious: () => void;
  nextLabel: string;
  onNext: () => void;
  disablePrevious?: boolean;
  disableNext?: boolean;
}

export default function NavButtons({
  previousLabel,
  onPrevious,
  nextLabel,
  onNext,
  disablePrevious = false,
  disableNext = false,
}: NavButtonsProps) {
  return (
    <div className="mx-auto flex w-full flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <Button
        type="button"
        variant="outline"
        onClick={onPrevious}
        disabled={disablePrevious}
      >
        <ArrowLeft className="h-4 w-4" />
        {previousLabel}
      </Button>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          type="button"
          onClick={onNext}
          disabled={disableNext}
        >
          {nextLabel}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
