import '@testing-library/jest-dom';

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import React from 'react';
import { render, screen, waitFor, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DashboardContent from './DashboardContent';
import { AnalyticsProvider } from '../lib/AnalyticsProvider';
import { DEFAULT_USER_PROFILE, DEFAULT_KPI_DATA, DEFAULT_EPISODES, DEFAULT_KANBAN_CARDS, DEFAULT_QUICK_ACTIONS } from '../constants';
import { generatePerformanceData } from '../utils';

// Mock components that are not essential for this test's logic
jest.mock('./KanbanCardModal', () => ({ card, onClose }: { card: any, onClose: Function }) => (
    <div data-testid="kanban-modal">
        <h2>{card.title}</h2>
        <button onClick={() => onClose()}>Close Modal</button>
    </div>
));

describe('DashboardContent', () => {
    const mockSetIsFormOpen = jest.fn();
    const mockOnViewEpisodeDetails = jest.fn();
    const mockAddToast = jest.fn();
    
    const defaultProps = {
        user: DEFAULT_USER_PROFILE,
        kpiData: DEFAULT_KPI_DATA,
        episodes: DEFAULT_EPISODES,
        kanbanCards: DEFAULT_KANBAN_CARDS,
        performanceData: generatePerformanceData(DEFAULT_EPISODES, 30),
        setActivePage: jest.fn(),
        onViewEpisodeDetails: mockOnViewEpisodeDetails,
        addToast: mockAddToast,
        setIsFormOpen: mockSetIsFormOpen,
        setOnboardingRef: jest.fn(),
        quickActions: DEFAULT_QUICK_ACTIONS,
        currentTourStepId: null,
    };
    
    const renderComponent = (props = defaultProps) => {
        return render(
            <AnalyticsProvider>
                <DashboardContent {...props} />
            </AnalyticsProvider>
        );
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders all content widgets', async () => {
        renderComponent();
        expect(screen.getByText(/Welcome back, Alex Chen/)).toBeInTheDocument();
        expect(screen.getByText('Production Pipeline')).toBeInTheDocument();
        expect(screen.getByText('Episodes & Deliverables')).toBeInTheDocument();
    });

    it('filters episodes table when a KPI tile is clicked', async () => {
        renderComponent();
        
        const inProductionTile = screen.getByText('In Production').closest('div')!;
        await userEvent.click(inProductionTile);

        // A more robust test would involve checking the props passed to EpisodesTable,
        // but for now, we'll check the tile's active state.
        expect(inProductionTile.className).toContain('border-[#F1C87A]');
    });

    it('opens and closes the Kanban card modal on card click', async () => {
        renderComponent();
        
        expect(screen.queryByTestId('kanban-modal')).not.toBeInTheDocument();
        
        const cardElement = screen.getByText('EP 024 — Dr. Mehta on Longevity').closest('div')!;
        await userEvent.click(cardElement);
        
        const modal = await screen.findByTestId('kanban-modal');
        expect(modal).toBeInTheDocument();
        
        const closeModalButton = screen.getByRole('button', { name: 'Close Modal' });
        await userEvent.click(closeModalButton);
        
        await waitFor(() => {
            expect(screen.queryByTestId('kanban-modal')).not.toBeInTheDocument();
        });
    });
});


describe('DashboardContent Guided Tour', () => {
    const mockSetIsFormOpen = jest.fn();
    const mockOnViewEpisodeDetails = jest.fn();
    const mockAddToast = jest.fn();
    
    const defaultProps = {
        user: DEFAULT_USER_PROFILE,
        kpiData: DEFAULT_KPI_DATA,
        episodes: DEFAULT_EPISODES,
        kanbanCards: DEFAULT_KANBAN_CARDS,
        performanceData: generatePerformanceData(DEFAULT_EPISODES, 30),
        setActivePage: jest.fn(),
        onViewEpisodeDetails: mockOnViewEpisodeDetails,
        addToast: mockAddToast,
        setIsFormOpen: mockSetIsFormOpen,
        setOnboardingRef: jest.fn(),
        quickActions: DEFAULT_QUICK_ACTIONS,
        currentTourStepId: null,
    };
    
    const renderComponent = (props = defaultProps) => {
        return render(
            <AnalyticsProvider>
                <DashboardContent {...props} />
            </AnalyticsProvider>
        );
    };

    beforeEach(() => {
        // Mock localStorage for widget order
        Storage.prototype.getItem = jest.fn(() => null); // Start with default order
        Storage.prototype.setItem = jest.fn();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('should perform the drag-and-drop animation for tour step 7', async () => {
        
        const { rerender } = renderComponent();

        // Verify initial order by aria-label
        const widgets = screen.getAllByRole('region', { name: /widget/i });
        expect(widgets[0]).toHaveAccessibleName('Overview widget');
        expect(widgets[1]).toHaveAccessibleName('Production Pipeline widget');
        expect(widgets[2]).toHaveAccessibleName('Schedule & Actions widget');
        
        // Trigger tour step 7
        rerender(
             <AnalyticsProvider>
                <DashboardContent {...defaultProps} currentTourStepId="customize-layout" />
            </AnalyticsProvider>
        );

        // Check that the animation class is added
        const kanbanWidget = screen.getByTestId('widget-kanban');
        expect(kanbanWidget).toHaveClass('is-being-demo-dragged');
        
        // Fast-forward timers to the swap
        act(() => {
            jest.advanceTimersByTime(1500);
        });

        // Use waitFor to handle the state update and re-render
        await waitFor(() => {
            const newWidgets = screen.getAllByRole('region', { name: /widget/i });
            // Order should be swapped
            expect(newWidgets[0]).toHaveAccessibleName('Overview widget');
            expect(newWidgets[1]).toHaveAccessibleName('Schedule & Actions widget'); // Swapped
            expect(newWidgets[2]).toHaveAccessibleName('Production Pipeline widget'); // Swapped
        });
        
        // Fast-forward timers to the swap back
        act(() => {
            jest.advanceTimersByTime(2000); // 3500 - 1500
        });

        await waitFor(() => {
            const finalWidgets = screen.getAllByRole('region', { name: /widget/i });
            // Order should be back to original
            expect(finalWidgets[0]).toHaveAccessibleName('Overview widget');
            expect(finalWidgets[1]).toHaveAccessibleName('Production Pipeline widget');
            expect(finalWidgets[2]).toHaveAccessibleName('Schedule & Actions widget');
        });

        // Fast-forward to the end to remove the class
        act(() => {
            jest.advanceTimersByTime(500); // 4000 - 3500
        });
        
        await waitFor(() => {
            expect(kanbanWidget).not.toHaveClass('is-being-demo-dragged');
        });
    });
});
