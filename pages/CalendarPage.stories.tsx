
import type { Meta, StoryObj } from '@storybook/react';
import CalendarPage from './CalendarPage';
import { DEFAULT_EPISODES } from '../constants';
import { fn } from '@storybook/test';

const meta: Meta<typeof CalendarPage> = {
  title: 'Pages/CalendarPage',
  component: CalendarPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    addToast: { action: 'addToast' },
  }
};

export default meta;
type Story = StoryObj<typeof CalendarPage>;

export const Default: Story = {
  args: {
    episodes: DEFAULT_EPISODES,
    addToast: fn(),
  },
};

export const Empty: Story = {
  args: {
    episodes: [],
    addToast: fn(),
  },
};
