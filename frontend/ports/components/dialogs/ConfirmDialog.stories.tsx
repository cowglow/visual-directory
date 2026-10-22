import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
import ConfirmDialog from "ports/components/dialogs/ConfirmDialog.tsx";

const meta: Meta<typeof ConfirmDialog> = {
  title: "ports/dialogs/ConfirmDialog",
  component: ConfirmDialog,
  args: {
    title: "Remove Member?",
    message: "Remove Anna Keller? This cannot be undone.",
    onConfirm: fn(),
    onCancel: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof ConfirmDialog>;

export const Default: Story = {};

export const CustomLabels: Story = {
  args: {
    title: "Remove Organization?",
    message:
      "Delete the District organization? Members assigned to it will become unassigned.",
    confirmLabel: "Delete",
    cancelLabel: "Keep it",
  },
};

export const ConfirmClicked: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Delete" }));
    await expect(args.onConfirm).toHaveBeenCalled();
  },
};

export const CancelClicked: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Cancel" }));
    await expect(args.onCancel).toHaveBeenCalled();
  },
};
