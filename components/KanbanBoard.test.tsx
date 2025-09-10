import '@testing-library/jest-dom';

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import KanbanBoard from './KanbanBoard';
import { DEFAULT_KANBAN_CARDS } from '../constants';
import { KanbanCard } from '../types';

// Mock child components
jest.mock('./FilterDropdown', () => ({
  __esModule: true,
  default: ({ label, options, selectedValue, onSelect }: { label: string, options: string[], selectedValue: string, onSelect: (value: string) => void}) => (
    <div>
      <label htmlFor={`filter-${label}`}>{label}</label>
      <select id={`filter-${label}`} data-testid={`filter-${label}`} value={selectedValue} onChange={(e) => onSelect(e.target.value)}>
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  )
}));
jest.mock('./Icons', () => ({
    __esModule: true,
    default: { Clock: () => <div /> }
}));


describe('KanbanBoard', () => {
  const mockOnCardClick = jest.fn();
  const mockSetOnboardingRef = jest.fn();
  
  const overdueCard: KanbanCard = {
    id: "card-overdue", title: "Overdue Task", type: "Podcast", dueDate: "2024-01-01", priority: "High",
    description: "This task is overdue.", assignees: [], links: []
  };
  const todayCard: KanbanCard = {
    id: "card-today", title: "Due Today Task", type: "Blog", dueDate: "2024-08-28",
    description: "This task is due today.", assignees: [], links: []
  };
   const thisWeekCard: KanbanCard = {
    id: "card-week", title: "Due This Week Task", type: "Shorts", dueDate: "2024-08-30",
    description: "This task is due this week.", assignees: [], links: []
  };
  const customCards = {
      ...DEFAULT_KANBAN_CARDS,
      INTAKE: [...DEFAULT_KANBAN_CARDS.INTAKE, overdueCard, todayCard, thisWeekCard]
  };

  beforeEach(() => {
    const today = new Date('2024-08-28T12:00:00.000Z');
    jest.useFakeTimers().setSystemTime(today);
  });

  afterEach(() => {
    jest.useRealTimers();
  });


  it('renders all columns and the correct number of cards in each', () => {
    render(<KanbanBoard cards={DEFAULT_KANBAN_CARDS} onCardClick={mockOnCardClick} activeFilter={null} setOnboardingRef={mockSetOnboardingRef} />);
    
    // Check INTAKE column
    const intakeColumn = screen.getByText(/INTAKE/);
    expect(within(intakeColumn.parentElement!).getByText('EP 025 — Future of AI')).toBeInTheDocument();

    // Check an empty column
    const distributionColumn = screen.getByText(/DISTRIBUTION/);
    expect(within(distributionColumn.parentElement!).getByText('No items')).toBeInTheDocument();
  });

  it('calls onCardClick with correct data when a card is clicked', async () => {
    render(<KanbanBoard cards={DEFAULT_KANBAN_CARDS} onCardClick={mockOnCardClick} activeFilter={null} setOnboardingRef={mockSetOnboardingRef} />);
    
    const cardElement = screen.getByText('EP 024 — Dr. Mehta on Longevity');
    await userEvent.click(cardElement);

    expect(mockOnCardClick).toHaveBeenCalledTimes(1);
    expect(mockOnCardClick).toHaveBeenCalledWith(DEFAULT_KANBAN_CARDS['EDITING'][0], 'EDITING');
  });

  it('filters cards by assignee', async () => {
    render(<KanbanBoard cards={DEFAULT_KANBAN_CARDS} onCardClick={mockOnCardClick} activeFilter={null} setOnboardingRef={mockSetOnboardingRef} />);
    
    const assigneeFilter = screen.getByTestId('filter-Assignee');
    await userEvent.selectOptions(assigneeFilter, 'Maria Garcia');

    // Should only see Maria's card
    expect(screen.getByText('EP 024 — Dr. Mehta on Longevity')).toBeInTheDocument();
    
    // Alex's card should be gone
    expect(screen.queryByText('EP 025 — Future of AI')).not.toBeInTheDocument();
  });
  
  it('highlights columns based on the activeFilter prop', () => {
    render(<KanbanBoard cards={DEFAULT_KANBAN_CARDS} onCardClick={mockOnCardClick} activeFilter="In Production" setOnboardingRef={mockSetOnboardingRef} />);
    
    // EDITING and DESIGN columns should be highlighted
    const editingColumn = screen.getByText(/EDITING/).parentElement!;
    const designColumn = screen.getByText(/DESIGN/).parentElement!;
    const intakeColumn = screen.getByText(/INTAKE/).parentElement!;
    
    expect(editingColumn.className).toContain('ring-2');
    expect(designColumn.className).toContain('ring-2');
    expect(intakeColumn.className).not.toContain('ring-2');
  });

  it('filters cards by due date: Overdue', async () => {
    render(<KanbanBoard cards={customCards} onCardClick={mockOnCardClick} activeFilter={null} setOnboardingRef={mockSetOnboardingRef} />);
    
    const dueDateFilter = screen.getByTestId('filter-Due Date');
    await userEvent.selectOptions(dueDateFilter, 'Overdue');

    expect(screen.getByText('Overdue Task')).toBeInTheDocument();
    expect(screen.queryByText('Due Today Task')).not.toBeInTheDocument();
    expect(screen.queryByText('Due This Week Task')).not.toBeInTheDocument();
  });
  
  it('filters cards by due date: Due Today', async () => {
    render(<KanbanBoard cards={customCards} onCardClick={mockOnCardClick} activeFilter={null} setOnboardingRef={mockSetOnboardingRef} />);
    
    const dueDateFilter = screen.getByTestId('filter-Due Date');
    await userEvent.selectOptions(dueDateFilter, 'Due Today');

    expect(screen.queryByText('Overdue Task')).not.toBeInTheDocument();
    expect(screen.getByText('Due Today Task')).toBeInTheDocument();
    expect(screen.queryByText('Due This Week Task')).not.toBeInTheDocument();
  });

  it('filters cards by due date: Due This Week', async () => {
    render(<KanbanBoard cards={customCards} onCardClick={mockOnCardClick} activeFilter={null} setOnboardingRef={mockSetOnboardingRef} />);
    
    const dueDateFilter = screen.getByTestId('filter-Due Date');
    await userEvent.selectOptions(dueDateFilter, 'Due This Week');

    expect(screen.queryByText('Overdue Task')).not.toBeInTheDocument();
    expect(screen.getByText('Due Today Task')).toBeInTheDocument();
    expect(screen.getByText('Due This Week Task')).toBeInTheDocument();
  });
});
