
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import FilterDropdown from './FilterDropdown';

const meta: Meta<typeof FilterDropdown> = {
  title: 'Components/FilterDropdown',
  component: FilterDropdown,
  tags: ['autodocs'],
  argTypes: {
    onSelect: { action: 'selected' },
  },
};

export default meta;
type Story = StoryObj<typeof FilterDropdown>;

export const Default: Story = {
  args: {
    label: "Status",
    options: ["All", "New", "In Production", "Review", "Published"],
    selectedValue: "All",
    tooltip: "Filter by episode status",
    onSelect: fn(),
  },
};
