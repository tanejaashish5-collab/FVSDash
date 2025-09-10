

import '@testing-library/jest-dom';

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Header from './Header';
import { AnalyticsProvider } from '../lib/AnalyticsProvider';
import { DEFAULT_USER_PROFILE } from '../constants';

// Mock the Icons component to simplify testing and avoid SVG rendering complexities
jest.mock('./Icons', () => ({
  __esModule: true,
  default: {
    Menu: () => <div data-testid="menu-icon" />,
    Bell: () => <div data-testid="bell-icon" />,
    PlusCircle: () => <div data-testid="plus-icon" />,
    Eye: () => <div data-testid="eye-icon" />,
    Help: () => <div data-testid="help-icon" />,
    Search: () => <div data-testid="search-icon" />,
    ForgeVoiceLogo: () => <div data-testid="logo-icon" />,
  },
}));

describe('Header', () => {
  const mockOnMenuClick = jest.fn();
  const mockOnBellClick = jest.fn();
  const mockOnStartTour = jest.fn();
  const mockOnSubmitContentClick = jest.fn();
  const mockOnPreviewPublicPage = jest.fn();
  const mockOnSearchChange = jest.fn();

  const defaultProps = {
    user: DEFAULT_USER_PROFILE,
    unreadCount: 3,
    onMenuClick: mockOnMenuClick,
    onBellClick: mockOnBellClick,
    onStartTour: mockOnStartTour,
    onSubmitContentClick: mockOnSubmitContentClick,
    onPreviewPublicPage: mockOnPreviewPublicPage,
    bellRef: React.createRef<HTMLButtonElement>(),
    searchQuery: '',
    onSearchChange: mockOnSearchChange,
    onSearchFocus: jest.fn(),
    setSearchContainerRef: jest.fn(),
    setOnboardingRef: jest.fn(),
    isSearchResultsOpen: false,
    globalSearchResults: [],
    onGlobalResultClick: jest.fn(),
  };

  const renderComponent = (props = defaultProps) => {
    return render(
      <AnalyticsProvider>
        <Header {...props} />
      </AnalyticsProvider>
    );
  };
  
  beforeEach(() => {
      jest.clearAllMocks();
  });

  it('renders user initials and unread notification count', () => {
    renderComponent();
    expect(screen.getByText(DEFAULT_USER_PROFILE.initials)).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });
  
  it('does not render notification count when it is zero', () => {
    renderComponent({ ...defaultProps, unreadCount: 0 });
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('calls onMenuClick when the mobile menu button is clicked', async () => {
    renderComponent();
    const menuButton = screen.getByTestId('menu-icon').closest('button');
    expect(menuButton).toBeInTheDocument();
    await userEvent.click(menuButton!);
    expect(mockOnMenuClick).toHaveBeenCalledTimes(1);
  });
  
  it('calls onBellClick when the notification bell is clicked', async () => {
    renderComponent();
    const bellButton = screen.getByTestId('bell-icon').closest('button');
    expect(bellButton).toBeInTheDocument();
    await userEvent.click(bellButton!);
    expect(mockOnBellClick).toHaveBeenCalledTimes(1);
  });
  
  it('calls onSubmitContentClick when the "Submit Content" button is clicked', async () => {
    renderComponent();
    const submitButton = screen.getByRole('button', { name: /submit content/i });
    await userEvent.click(submitButton);
    expect(mockOnSubmitContentClick).toHaveBeenCalledTimes(1);
  });
  
  it('calls onStartTour when the help/tour button is clicked', async () => {
    renderComponent();
    const tourButton = screen.getByRole('button', { name: /start onboarding tour/i });
    await userEvent.click(tourButton);
    expect(mockOnStartTour).toHaveBeenCalledTimes(1);
  });

  it('calls onPreviewPublicPage when the public view button is clicked', async () => {
    renderComponent();
    const publicPageButton = screen.getByRole('button', { name: /public view/i });
    await userEvent.click(publicPageButton);
    expect(mockOnPreviewPublicPage).toHaveBeenCalledTimes(1);
  });

  it('calls onSearchChange when the search input value changes', async () => {
    renderComponent();
    const searchInput = screen.getByPlaceholderText(/search episodes, tasks, assets.../i);
    fireEvent.change(searchInput, { target: { value: 'New Query' } });
    expect(mockOnSearchChange).toHaveBeenCalledTimes(1);
    expect(mockOnSearchChange).toHaveBeenCalledWith('New Query');
  });

});
