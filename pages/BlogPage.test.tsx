

import '@testing-library/jest-dom';

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BlogPage from './BlogPage';
import { DEFAULT_BLOG_POSTS } from '../constants';

// Mock child components
jest.mock('../components/FilterDropdown', () => ({
  __esModule: true,
  default: ({ label, options, selectedValue, onSelect }: { label: string, options: readonly string[], selectedValue: string, onSelect: (value: string) => void}) => (
    <div>
      <label htmlFor={`filter-${label}`}>{label}</label>
      <select data-testid={`filter-${label}`} id={`filter-${label}`} value={selectedValue} onChange={(e) => onSelect(e.target.value)}>
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  )
}));
jest.mock('../components/ErrorDisplay', () => ({
  __esModule: true,
  default: ({ message, onRetry }: { message: string, onRetry: () => void }) => (
    <div>
      <p>{message}</p>
      <button onClick={onRetry}>Retry</button>
    </div>
  ),
}));

describe('BlogPage', () => {
  const mockOnEditPost = jest.fn();
  
  beforeEach(() => {
    mockOnEditPost.mockClear();
  });

  it('displays a loading state', () => {
    render(<BlogPage posts={[]} onEditPost={mockOnEditPost} isLoading={true} error={null} onRetry={() => {}} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('displays an error message and a retry button on failure', async () => {
    const mockOnRetry = jest.fn();
    render(<BlogPage posts={[]} onEditPost={mockOnEditPost} isLoading={false} error="Failed to load posts" onRetry={mockOnRetry} />);
    
    expect(screen.getByText('Failed to load posts')).toBeInTheDocument();
    
    const retryButton = screen.getByRole('button', { name: 'Retry' });
    await userEvent.click(retryButton);
    
    expect(mockOnRetry).toHaveBeenCalledTimes(1);
  });

  it('renders a list of blog posts correctly', () => {
    render(<BlogPage posts={DEFAULT_BLOG_POSTS} onEditPost={mockOnEditPost} isLoading={false} error={null} onRetry={() => {}} />);
    
    expect(screen.getByText(DEFAULT_BLOG_POSTS[0].title)).toBeInTheDocument();
    expect(screen.getByText(DEFAULT_BLOG_POSTS[1].title)).toBeInTheDocument();
  });

  it('filters posts by search term', async () => {
    render(<BlogPage posts={DEFAULT_BLOG_POSTS} onEditPost={mockOnEditPost} isLoading={false} error={null} onRetry={() => {}} />);
    
    const searchInput = screen.getByPlaceholderText('Search posts...');
    await userEvent.type(searchInput, 'Longevity');
    
    expect(screen.getByText(/Longevity/)).toBeInTheDocument();
    expect(screen.queryByText(/Artificial Intelligence/)).not.toBeInTheDocument();
  });

  it('filters posts by status', async () => {
    render(<BlogPage posts={DEFAULT_BLOG_POSTS} onEditPost={mockOnEditPost} isLoading={false} error={null} onRetry={() => {}} />);
    
    const statusFilter = screen.getByTestId('filter-Status');
    await userEvent.selectOptions(statusFilter, 'Published');
    
    expect(screen.getByText(/EP 022 Highlights/)).toBeInTheDocument();
    expect(screen.queryByText(/Artificial Intelligence/)).not.toBeInTheDocument();
  });

  it('calls onEditPost when the review/edit button is clicked', async () => {
    render(<BlogPage posts={DEFAULT_BLOG_POSTS} onEditPost={mockOnEditPost} isLoading={false} error={null} onRetry={() => {}} />);
    
    const editButtons = screen.getAllByRole('button', { name: /review & edit/i });
    await userEvent.click(editButtons[0]);
    
    expect(mockOnEditPost).toHaveBeenCalledTimes(1);
    expect(mockOnEditPost).toHaveBeenCalledWith(DEFAULT_BLOG_POSTS[0]);
  });

  it('sorts the table by title when the header is clicked', async () => {
    render(<BlogPage posts={DEFAULT_BLOG_POSTS} onEditPost={mockOnEditPost} isLoading={false} error={null} onRetry={() => {}} />);
    const titleHeader = screen.getByText('Title');
    const getTableRows = () => screen.getAllByRole('row').slice(1); // Exclude header row

    // Initial order (by generatedAt desc)
    let rows = getTableRows();
    expect(within(rows[0]).getByText(/The Hidden Benefits of Longevity/)).toBeInTheDocument();
    
    // Sort descending by title
    await userEvent.click(titleHeader);
    rows = getTableRows();
    expect(within(rows[0]).getByText(/The Hidden Benefits of Longevity/)).toBeInTheDocument();
    expect(within(rows[1]).getByText(/EP 022 Highlights/)).toBeInTheDocument();
    expect(within(rows[2]).getByText(/Decoding the Future of Artificial Intelligence/)).toBeInTheDocument();

    // Sort ascending by title
    await userEvent.click(titleHeader);
    rows = getTableRows();
    expect(within(rows[0]).getByText(/Decoding the Future of Artificial Intelligence/)).toBeInTheDocument();
    expect(within(rows[1]).getByText(/EP 022 Highlights/)).toBeInTheDocument();
    expect(within(rows[2]).getByText(/The Hidden Benefits of Longevity/)).toBeInTheDocument();
  });
});
