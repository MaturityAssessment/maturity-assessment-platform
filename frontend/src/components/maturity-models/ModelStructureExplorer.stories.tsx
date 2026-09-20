import type { Meta, StoryObj } from "@storybook/react";
import type { MaturityModel } from "@/api/types";
import ModelStructureExplorer from "./ModelStructureExplorer";

const model: MaturityModel = {
  id: 10,
  name: "Security maturity model",
  description: "A model for assessing security capabilities.",
  isActive: true,
  levels: [
    { number: 1, name: "Initial" },
    { number: 2, name: "Managed" },
    { number: 3, name: "Defined" },
  ],
  dimensions: [
    {
      id: "governance",
      name: "Governance",
      description: "How security decisions are directed and measured.",
      modules: [
        {
          code: "GOV",
          name: "Security strategy",
          description: "Strategic security planning.",
          practices: [
            {
              code: "GOV-01",
              name: "Security objectives",
              description: "Define measurable objectives.",
              questions: [
                {
                  code: "GOV-01-Q1",
                  text: "Are security objectives documented?",
                  type: "boolean",
                  help: "Consider the current policy and planning process.",
                  weight: 1,
                  required: true,
                },
                {
                  code: "GOV-01-Q2",
                  text: "How often are objectives reviewed?",
                  type: "likert",
                  help: "",
                  weight: 1,
                  scalePointCount: 5,
                  scaleMinLabel: "Never",
                  scaleMaxLabel: "Continuously",
                  dependsOnQuestionCode: "GOV-01-Q1",
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

const meta = {
  title: "Maturity models/Structure explorer",
  component: ModelStructureExplorer,
  args: { model },
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
} satisfies Meta<typeof ModelStructureExplorer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
