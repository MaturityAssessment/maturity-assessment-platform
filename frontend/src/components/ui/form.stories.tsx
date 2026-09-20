import { useForm } from "react-hook-form";
import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "./form";

function FormExample() {
  const form = useForm<{ name: string }>({ defaultValues: { name: "" } });
  return <Form {...form}><form onSubmit={form.handleSubmit(() => undefined)} className="w-80 space-y-4"><FormField control={form.control} name="name" rules={{ required: "A model name is required" }} render={({ field }) => <FormItem><FormLabel>Model name</FormLabel><FormControl><Input placeholder="Enter a model name" {...field} /></FormControl><FormDescription>Choose a clear name for this assessment framework.</FormDescription><FormMessage /></FormItem>} /><Button type="submit">Save</Button></form></Form>;
}

const meta = { title: "UI/Form", render: () => <FormExample />, tags: ["autodocs"] } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
