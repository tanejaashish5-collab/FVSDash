
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import KPITile from './KPITile';

const meta: Meta<typeof KPITile> = {
  title: 'Components/KPITile',
  component: KPITile,
  tags: ['autodocs'],
  argTypes: {
    onClick: { action: 'clicked' },
  },
};

export default meta;
type Story = StoryObj<typeof KPITile>;

export const UpwardTrend: Story = {
  args: {
    title: "New Submissions",
    value: 12,
    subtitle: "last 7 days",
    trend: 'up',
    change: '+3',
    isActive: false,
    onClick: fn(),
  },
};

export const DownwardTrend: Story = {
  args: {
    title: "In Production",
    value: 8,
    trend: 'down',
    change: '-1',
    isActive: false,
    onClick: fn(),
  },
};

export const Active: Story = {
  args: {
    ...UpwardTrend.args,
    isActive: true,
  },
};

export const WithIndicator: Story = {
  args: {
    title: "Ready for Review",
    value: 4,
    hasIndicator: true,
    trend: 'up',
    change: '+2',
    isActive: false,
    onClick: fn(),
  },
};
