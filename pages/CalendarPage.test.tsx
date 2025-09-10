

import '@testing-library/jest-dom';

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import React from 'react';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CalendarPage from './CalendarPage';
import { ToastNotification, Episode } from '../types';
import useMediaQuery from '../hooks/useMediaQuery';
import { DEFAULT_EPISODES } from '../constants';


// Mock child components and dependencies
jest.mock('../hooks/useMediaQuery');
const mockedUseMediaQuery = useMediaQuery as jest.Mock;

jest.mock('../components/FilterDropdown', () => ({
  __esModule: true,
  default: ({ label, onSelect }: { label: string; onSelect: (value: string) => void }) => (
    <button onClick={() => onSelect('Filtered')}>Filter {label}</button>
  ),
}));

// Mock Icons to prevent SVG rendering issues
jest.mock('../components/Icons', () => ({
  __esModule: true,
  default: {
    ChevronLeft: () => <span>Prev</span>,
    ChevronRight: () => <span>Next</span>,
    ChevronDown: () => <span>Down</span>,
    Submissions: () => <span>Pipeline</span>,
    PlusCircle: () => <span>Add</span>,
    CloseLarge: () => <span>Close</span>,
  },
}));

describe('CalendarPage Drag and Drop', () => {
  const mockAddToast = jest.fn<(toast: Omit<ToastNotification, 'id' | 'duration'>) => void>();
  const mockDate = new Date('2024-08-15T12:00:00.000Z');

  beforeEach(() => {
    mockAddToast.mockClear();
    mockedUseMediaQuery.mockReturnValue(false);
    jest.useFakeTimers().setSystemTime(mockDate);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('allows dragging an unscheduled item to the calendar to schedule it', async () => {
    render(<CalendarPage addToast={mockAddToast} />);
    
    // FIX: The test was looking for a non-existent item. Updated to use an existing item from DEFAULT_UNSCHEDULED_IDEAS.
    const pipelineItem = screen.getByText('Podcast: The Psychology of High-Performance Teams');
    const day19Cell = screen.getByText('19').closest('div[class*="relative p-2"]');
    expect(day19Cell).toBeInTheDocument();

    expect(within(day19Cell as HTMLElement).queryByText('Podcast: The Psychology of High-Performance Teams')).not.toBeInTheDocument();

    fireEvent.dragStart(pipelineItem);
    fireEvent.dragEnter(day19Cell!);
    fireEvent.dragOver(day19Cell!);
    fireEvent.drop(day19Cell!);

    await waitFor(() => {
        expect(within(day19Cell as HTMLElement).getByText('Podcast: The Psychology of High-Performance Teams')).toBeInTheDocument();
    });
    
    const pipeline = screen.getByText('Content Pipeline').closest('aside');
    expect(within(pipeline as HTMLElement).queryByText('Podcast: The Psychology of High-Performance Teams')).not.toBeInTheDocument();
    
    expect(mockAddToast).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Content Scheduled!',
        message: expect.stringContaining('scheduled for 8/19/2024'),
    }));
  });

  it('opens a confirmation modal when dragging a scheduled event to a new date', async () => {
    render(<CalendarPage addToast={mockAddToast} episodes={DEFAULT_EPISODES} />);
    
    const eventItem = screen.getByText('EP 024 — Dr. Mehta on Longevity');
    const day29Cell = screen.getByText('29').closest('div[class*="relative p-2"]');
    const day22Cell = screen.getByText('22').closest('div[class*="relative p-2"]');

    expect(within(day29Cell as HTMLElement).getByText('EP 024 — Dr. Mehta on Longevity')).toBeInTheDocument();

    fireEvent.dragStart(eventItem);
    fireEvent.dragEnter(day22Cell!);
    fireEvent.drop(day22Cell!);
    fireEvent.dragEnd(eventItem);
    
    const modal = await screen.findByRole('dialog', { name: /reschedule content/i });
    expect(modal).toBeInTheDocument();
    expect(within(modal).getByText(/are you sure you want to move/i)).toBeInTheDocument();

    // Verify the event has not moved yet
    expect(within(day29Cell as HTMLElement).getByText('EP 024 — Dr. Mehta on Longevity')).toBeInTheDocument();
    
    // Confirm the reschedule
    const confirmButton = within(modal).getByRole('button', { name: 'Confirm' });
    await userEvent.click(confirmButton);

    await waitFor(() => {
        expect(within(day29Cell as HTMLElement).queryByText('EP 024 — Dr. Mehta on Longevity')).not.toBeInTheDocument();
        expect(within(day22Cell as HTMLElement).getByText('EP 024 — Dr. Mehta on Longevity')).toBeInTheDocument();
    });
    
    expect(mockAddToast).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Content Rescheduled!',
        message: expect.stringContaining('moved to 8/22/2024'),
    }));
  });
});
