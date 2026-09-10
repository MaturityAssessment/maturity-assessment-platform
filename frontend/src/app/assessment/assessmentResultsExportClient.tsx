"use client";

import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
} from "@react-pdf/renderer";
import * as XLSX from "xlsx";
import {
  getAssessmentExportFileName,
  type AssessmentExportAnswer,
  type AssessmentResultsExportData,
} from "./assessmentResultsExport";

export type AssessmentExportFormat = "pdf" | "xlsx";

export async function exportAssessmentResults(
  data: AssessmentResultsExportData,
  format: AssessmentExportFormat
) {
  if (format === "pdf") {
    await exportPdf(data);
    return;
  }
  exportWorkbook(data);
}

async function exportPdf(data: AssessmentResultsExportData) {
  const blob = await pdf(<AssessmentResultsDocument data={data} />).toBlob();
  downloadBlob(blob, getAssessmentExportFileName(data, "pdf"));
}

function exportWorkbook(data: AssessmentResultsExportData) {
  const workbook = XLSX.utils.book_new();
  workbook.Props = {
    Title: `${data.modelName} assessment results`,
    Subject: `Results and answer summary for assessment ${data.assessmentId}`,
    CreatedDate: new Date(),
  };

  const summaryRows: Array<[string, string | number]> = [
    ["Assessment ID", data.assessmentId],
    ["Maturity model", data.modelName],
    ["Model version", data.modelVersion ?? ""],
    ["Domain", data.domainName],
    ["Respondent", data.respondent],
    ["Completed", formatDate(data.completedAt)],
    ["Overall maturity level", data.overallMaturityLevel],
    ["Overall score", data.overallScore],
    ["Scale maximum", data.scaleMax],
    ["Evaluator recommendations", data.evaluatorInsight],
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet([
    ["Assessment results"],
    [],
    ...summaryRows,
  ]);
  summarySheet["!cols"] = [{ wch: 30 }, { wch: 90 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Results");

  const dimensionSheet = XLSX.utils.json_to_sheet(
    data.dimensions.map((dimension) => ({
      Dimension: dimension.name,
      Score: dimension.score,
      "Scale maximum": data.scaleMax,
      "Maturity level": dimension.maturityLevel,
      "Scored items": dimension.questionCount,
      "Difference from overall": dimension.differenceFromOverall,
    }))
  );
  dimensionSheet["!cols"] = [
    { wch: 32 },
    { wch: 12 },
    { wch: 16 },
    { wch: 24 },
    { wch: 14 },
    { wch: 24 },
  ];
  addAutoFilter(dimensionSheet);
  XLSX.utils.book_append_sheet(workbook, dimensionSheet, "Dimensions");

  const answerSheet = XLSX.utils.json_to_sheet(
    data.answers.map((answer) => ({
      Dimension: answer.dimension,
      Module: answer.module,
      Practice: answer.practice,
      "Question code": answer.questionCode,
      Question: answer.question,
      Type: answer.questionType,
      Answer: answer.answer,
      "Respondent justification": answer.respondentJustification,
      Evidence: answer.evidence,
      "Initial score": answer.initialScore ?? "",
      "Final score": answer.finalScore ?? "",
      "Review status": answer.reviewStatus,
      "Evaluator note": answer.evaluatorNote,
    }))
  );
  answerSheet["!cols"] = [
    { wch: 24 },
    { wch: 24 },
    { wch: 24 },
    { wch: 15 },
    { wch: 55 },
    { wch: 18 },
    { wch: 42 },
    { wch: 42 },
    { wch: 42 },
    { wch: 14 },
    { wch: 14 },
    { wch: 18 },
    { wch: 42 },
  ];
  addAutoFilter(answerSheet);
  XLSX.utils.book_append_sheet(workbook, answerSheet, "Answer summary");

  const distributionSheet = XLSX.utils.json_to_sheet(
    data.scoreDistribution.map((item) => ({
      Level: item.level,
      Name: item.name,
      "Scored items": item.count,
      Percentage: item.percentage / 100,
    }))
  );
  distributionSheet["!cols"] = [
    { wch: 10 },
    { wch: 26 },
    { wch: 16 },
    { wch: 16 },
  ];
  for (let row = 2; row <= data.scoreDistribution.length + 1; row += 1) {
    const cell = distributionSheet[`D${row}`];
    if (cell) cell.z = "0.0%";
  }
  addAutoFilter(distributionSheet);
  XLSX.utils.book_append_sheet(workbook, distributionSheet, "Score distribution");

  XLSX.writeFile(workbook, getAssessmentExportFileName(data, "xlsx"), {
    compression: true,
  });
}

function AssessmentResultsDocument({
  data,
}: {
  data: AssessmentResultsExportData;
}) {
  return (
    <Document
      title={`${data.modelName} assessment results`}
      subject={`Results and answer summary for assessment ${data.assessmentId}`}
      author="Maturity Assessment Platform"
    >
      <Page size="A4" style={styles.page}>
        <PdfHeader data={data} />

        <View style={styles.hero}>
          <Text style={styles.eyebrow}>FINAL ASSESSMENT RESULT</Text>
          <Text style={styles.resultLevel}>{data.overallMaturityLevel}</Text>
          <View style={styles.resultScoreRow}>
            <Text style={styles.resultScore}>
              {formatScore(data.overallScore)} / {data.scaleMax} overall score
            </Text>
          </View>
        </View>

        <SectionTitle>Assessment details</SectionTitle>
        <View style={styles.detailGrid}>
          <Detail label="Assessment ID" value={String(data.assessmentId)} />
          <Detail label="Completed" value={formatDate(data.completedAt)} />
          {data.modelVersion != null && (
            <Detail label="Model version" value={`v${data.modelVersion}`} />
          )}
          {data.domainName && <Detail label="Domain" value={data.domainName} />}
          {data.respondent && (
            <Detail label="Respondent" value={data.respondent} />
          )}
        </View>

        <SectionTitle>Dimension results</SectionTitle>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]} fixed>
            <Text style={[styles.tableCell, styles.dimensionColumn]}>
              Dimension
            </Text>
            <Text style={[styles.tableCell, styles.scoreColumn]}>Score</Text>
            <Text style={[styles.tableCell, styles.levelColumn]}>
              Maturity level
            </Text>
            <Text style={[styles.tableCell, styles.itemsColumn]}>Items</Text>
          </View>
          {data.dimensions.map((dimension) => (
            <View style={styles.tableRow} key={dimension.dimensionId} wrap={false}>
              <Text style={[styles.tableCell, styles.dimensionColumn]}>
                {dimension.name}
              </Text>
              <Text style={[styles.tableCell, styles.scoreColumn]}>
                {formatScore(dimension.score)} / {data.scaleMax}
              </Text>
              <Text style={[styles.tableCell, styles.levelColumn]}>
                {dimension.maturityLevel}
              </Text>
              <Text style={[styles.tableCell, styles.itemsColumn]}>
                {dimension.questionCount}
              </Text>
            </View>
          ))}
        </View>

        <SectionTitle>Evaluator recommendations</SectionTitle>
        <View style={styles.noteBox}>
          <Text style={styles.bodyText}>
            {data.evaluatorInsight ||
              "No final evaluator recommendations were recorded."}
          </Text>
        </View>

        <PdfFooter />
      </Page>

      <Page size="A4" style={styles.page}>
        <PdfHeader data={data} compact />
        <Text style={styles.answerTitle}>Answer summary</Text>
        <Text style={styles.answerIntro}>
          Submitted responses, supporting context, scoring, and evaluator notes.
        </Text>
        {data.answers.map((answer, index) => (
          <AnswerBlock
            answer={answer}
            index={index}
            scaleMax={data.scaleMax}
            key={answer.responseKey}
          />
        ))}
        <PdfFooter />
      </Page>
    </Document>
  );
}

function PdfHeader({
  data,
  compact = false,
}: {
  data: AssessmentResultsExportData;
  compact?: boolean;
}) {
  return (
    <View style={compact ? styles.compactHeader : styles.header} fixed>
      <View>
        <Text style={styles.brand}>MATURITY ASSESSMENT PLATFORM</Text>
        <Text style={styles.documentTitle}>{data.modelName}</Text>
      </View>
      <Text style={styles.headerMeta}>Assessment #{data.assessmentId}</Text>
    </View>
  );
}

function PdfFooter() {
  return (
    <View style={styles.footer} fixed>
      <Text>Assessment results export</Text>
      <Text
        render={({ pageNumber, totalPages }) =>
          `Page ${pageNumber} of ${totalPages}`
        }
      />
    </View>
  );
}

function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detail} wrap={false}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function AnswerBlock({
  answer,
  index,
  scaleMax,
}: {
  answer: AssessmentExportAnswer;
  index: number;
  scaleMax: number;
}) {
  return (
    <View style={styles.answerBlock} wrap={false}>
      <Text style={styles.answerPath}>
        {answer.dimension} / {answer.module} / {answer.practice}
      </Text>
      <Text style={styles.questionText}>
        {index + 1}. {answer.questionCode ? `[${answer.questionCode}] ` : ""}
        {answer.question}
      </Text>
      <View style={styles.answerMetaRow}>
        <Text style={styles.typePill}>{answer.questionType}</Text>
        <Text style={styles.reviewText}>{answer.reviewStatus}</Text>
        {answer.finalScore != null && (
          <Text style={styles.scoreText}>
            Final score: {formatScore(answer.finalScore)} / {scaleMax}
          </Text>
        )}
      </View>
      <Text style={styles.fieldLabel}>ANSWER</Text>
      <Text style={styles.answerText}>{answer.answer}</Text>
      {answer.respondentJustification && (
        <LabeledText
          label="RESPONDENT JUSTIFICATION"
          value={answer.respondentJustification}
        />
      )}
      {answer.evidence && <LabeledText label="EVIDENCE" value={answer.evidence} />}
      {answer.evaluatorNote && (
        <View style={styles.evaluatorNote}>
          <Text style={styles.fieldLabel}>EVALUATOR NOTE</Text>
          <Text style={styles.noteText}>{answer.evaluatorNote}</Text>
        </View>
      )}
    </View>
  );
}

function LabeledText({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.labeledText}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.secondaryText}>{value}</Text>
    </View>
  );
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

function addAutoFilter(sheet: XLSX.WorkSheet) {
  if (sheet["!ref"]) sheet["!autofilter"] = { ref: sheet["!ref"] };
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(date);
}

function formatScore(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 42,
    paddingRight: 44,
    paddingBottom: 52,
    paddingLeft: 44,
    backgroundColor: "#ffffff",
    color: "#0f172a",
    fontFamily: "Helvetica",
    fontSize: 9,
    lineHeight: 1.45,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 22,
  },
  compactHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingBottom: 10,
    marginBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  brand: {
    color: "#4f46e5",
    fontSize: 7,
    fontWeight: 700,
    letterSpacing: 1.1,
  },
  documentTitle: {
    marginTop: 3,
    fontSize: 15,
    fontWeight: 700,
  },
  headerMeta: {
    color: "#64748b",
    fontSize: 8,
  },
  hero: {
    padding: 24,
    marginBottom: 22,
    borderRadius: 10,
    backgroundColor: "#0f172a",
    color: "#ffffff",
  },
  eyebrow: {
    color: "#a5b4fc",
    fontSize: 7,
    fontWeight: 700,
    letterSpacing: 1.3,
  },
  resultLevel: {
    marginTop: 8,
    fontSize: 28,
    fontWeight: 700,
    lineHeight: 1.15,
  },
  resultScoreRow: {
    marginTop: 12,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#334155",
  },
  resultScore: {
    color: "#cbd5e1",
    fontSize: 10,
    lineHeight: 1.3,
  },
  sectionTitle: {
    marginTop: 8,
    marginBottom: 8,
    fontSize: 12,
    fontWeight: 700,
  },
  detailGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginRight: -8,
    marginBottom: 12,
  },
  detail: {
    width: "33.333%",
    paddingRight: 8,
    marginBottom: 8,
  },
  detailLabel: {
    color: "#64748b",
    fontSize: 7,
    fontWeight: 700,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  detailValue: {
    marginTop: 2,
    fontSize: 9,
    fontWeight: 700,
  },
  table: {
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 5,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  tableHeader: {
    backgroundColor: "#f1f5f9",
    color: "#475569",
    fontSize: 7,
    fontWeight: 700,
    textTransform: "uppercase",
  },
  tableCell: {
    paddingTop: 7,
    paddingRight: 7,
    paddingBottom: 7,
    paddingLeft: 7,
  },
  dimensionColumn: { width: "42%" },
  scoreColumn: { width: "18%" },
  levelColumn: { width: "28%" },
  itemsColumn: { width: "12%", textAlign: "right" },
  noteBox: {
    padding: 12,
    borderRadius: 6,
    backgroundColor: "#eef2ff",
    borderWidth: 1,
    borderColor: "#c7d2fe",
  },
  bodyText: { color: "#334155", fontSize: 9 },
  answerTitle: { fontSize: 20, fontWeight: 700 },
  answerIntro: { marginTop: 4, marginBottom: 16, color: "#64748b" },
  answerBlock: {
    paddingTop: 11,
    paddingRight: 12,
    paddingBottom: 11,
    paddingLeft: 12,
    marginBottom: 9,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 6,
    backgroundColor: "#ffffff",
  },
  answerPath: { color: "#6366f1", fontSize: 7, fontWeight: 700 },
  questionText: { marginTop: 4, fontSize: 10, fontWeight: 700 },
  answerMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    marginBottom: 8,
  },
  typePill: {
    paddingTop: 2,
    paddingRight: 5,
    paddingBottom: 2,
    paddingLeft: 5,
    marginRight: 6,
    borderRadius: 4,
    color: "#475569",
    backgroundColor: "#f1f5f9",
    fontSize: 7,
    textTransform: "uppercase",
  },
  reviewText: { color: "#64748b", fontSize: 7, textTransform: "capitalize" },
  scoreText: { marginLeft: "auto", color: "#0f172a", fontSize: 7, fontWeight: 700 },
  fieldLabel: {
    color: "#64748b",
    fontSize: 6.5,
    fontWeight: 700,
    letterSpacing: 0.6,
  },
  answerText: { marginTop: 2, color: "#0f172a", fontSize: 9 },
  labeledText: { marginTop: 7 },
  secondaryText: { marginTop: 2, color: "#475569", fontSize: 8 },
  evaluatorNote: {
    marginTop: 7,
    padding: 7,
    borderRadius: 4,
    backgroundColor: "#f8fafc",
  },
  noteText: { marginTop: 2, color: "#334155", fontSize: 8 },
  footer: {
    position: "absolute",
    right: 44,
    bottom: 22,
    left: 44,
    flexDirection: "row",
    justifyContent: "space-between",
    color: "#94a3b8",
    fontSize: 7,
  },
});
