import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./button";
import { Modal } from "./modal";

const meta = { title: "UI/Modal", component: Modal, args: { isOpen: false, onClose: () => undefined, children: null }, tags: ["autodocs"] } satisfies Meta<typeof Modal>;
export default meta;
type Story = StoryObj<typeof meta>;

function ModalExample() {
  const [isOpen, setIsOpen] = useState(true);
  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Open modal</Button>
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Confirm changes" footer={<Button onClick={() => setIsOpen(false)}>Save</Button>}>
        <p className="text-sm text-gray-600">Review the changes before continuing.</p>
      </Modal>
    </>
  );
}

export const Default: Story = { render: () => <ModalExample /> };
