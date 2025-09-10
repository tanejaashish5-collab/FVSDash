
import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent, expect } from '@storybook/test';
import { fn } from '@storybook/test';
import SubmitContentForm from './SubmitContentForm';

const meta: Meta<typeof SubmitContentForm> = {
  title: 'Components/SubmitContentForm',
  component: SubmitContentForm,
  tags: ['autodocs'],
  argTypes: {
    onClose: { action: 'closed' },
    onSubmit: { action: 'submitted' },
  },
  parameters: {
    // Center the component on the page
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof SubmitContentForm>;

export const DefaultOpen: Story = {
  args: {
    isOpen: true,
    onClose: fn(),
    onSubmit: fn(),
  },
};

export const WithValidationErrors: Story = {
  args: {
    ...DefaultOpen.args,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Find the submit button and click it without filling any fields
    const submitButton = await canvas.getByRole('button', { name: /submit content/i });
    await userEvent.click(submitButton);

    // Check that all error messages are now visible
    await expect(canvas.getByText('Episode Name is required.')).toBeInTheDocument();
    await expect(canvas.getByText('Guest Name is required.')).toBeInTheDocument();
    await expect(canvas.getByText('Episode Description is required.')).toBeInTheDocument();
    await expect(canvas.getByText('Release Date is required.')).toBeInTheDocument();
    await expect(canvas.getByText("You must confirm the file upload.")).toBeInTheDocument();
  },
};
