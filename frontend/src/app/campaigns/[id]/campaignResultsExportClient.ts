"use client";

import * as XLSX from "xlsx";
import type { CampaignDetail, CampaignResults } from "@/api/types";

export function exportCampaignResults(
  campaign: CampaignDetail,
  results: CampaignResults,
  scaleMax: number
) {
  const workbook = XLSX.utils.book_new();
  workbook.Props = {
    Title: `${campaign.name} aggregate results`,
    Subject: "Aggregated final campaign assessment results",
    CreatedDate: new Date(),
  };

  const summary = XLSX.utils.aoa_to_sheet([
    ["Campaign aggregate results"],
    [],
    ["Campaign", campaign.name],
    ["Maturity model", campaign.maturityModelName],
    ["Model version", campaign.maturityModelVersion],
    ["Participants", results.participantCount],
    ["Submitted responses", results.submittedParticipantCount],
    ["Evaluated responses", results.evaluatedParticipantCount],
    ["Overall average", results.overallAverage ?? ""],
    ["Scale maximum", scaleMax],
  ]);
  summary["!cols"] = [{ wch: 28 }, { wch: 65 }];
  XLSX.utils.book_append_sheet(workbook, summary, "Summary");

  const participantSheet = XLSX.utils.json_to_sheet(
    results.participants.map((participant) => ({
      Participant: participant.email,
      "Assessment ID": participant.assessmentId,
      "Maturity level": participant.overallMaturityLevel || "Not available",
      "Final score": participant.overallScore,
      "Scale maximum": scaleMax,
      Evaluated: participant.evaluatedAt
        ? new Date(participant.evaluatedAt).toLocaleString()
        : "",
    }))
  );
  participantSheet["!cols"] = [
    { wch: 38 },
    { wch: 16 },
    { wch: 24 },
    { wch: 14 },
    { wch: 16 },
    { wch: 24 },
  ];
  XLSX.utils.book_append_sheet(workbook, participantSheet, "Participants");

  const dimensionSheet = XLSX.utils.json_to_sheet(
    results.dimensions.map((dimension) => ({
      Dimension: dimension.dimensionName,
      "Average score": dimension.averageScore,
      "Scale maximum": scaleMax,
      "Evaluated responses": dimension.responseCount,
    }))
  );
  dimensionSheet["!cols"] = [
    { wch: 32 },
    { wch: 16 },
    { wch: 16 },
    { wch: 22 },
  ];
  XLSX.utils.book_append_sheet(workbook, dimensionSheet, "Dimensions");

  const levelSheet = XLSX.utils.json_to_sheet(
    results.maturityLevels.map((level) => ({
      "Maturity level": level.maturityLevel,
      Participants: level.participantCount,
      Percentage: level.percentage / 100,
    }))
  );
  levelSheet["!cols"] = [{ wch: 28 }, { wch: 16 }, { wch: 16 }];
  for (let row = 2; row <= results.maturityLevels.length + 1; row += 1) {
    const cell = levelSheet[`C${row}`];
    if (cell) cell.z = "0.0%";
  }
  XLSX.utils.book_append_sheet(workbook, levelSheet, "Maturity levels");

  XLSX.writeFile(
    workbook,
    `${slug(campaign.name)}-campaign-results.xlsx`,
    { compression: true }
  );
}

function slug(value: string) {
  return (
    value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "campaign"
  );
}
