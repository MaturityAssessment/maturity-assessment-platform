import type { Meta, StoryObj } from "@storybook/react";
import { Input } from "./input";

const meta = { title: "UI/Input", component: Input, tags: ["autodocs"] } satisfies Meta<typeof Input>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { placeholder: "Enter a value" } };
export const WithValue: Story = { args: { value: "Maturity model", readOnly: true } };
export const Disabled: Story = { args: { placeholder: "Unavailable", disabled: true } };
