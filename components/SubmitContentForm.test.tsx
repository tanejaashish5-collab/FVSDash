
import '@testing-library/jest-dom';

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SubmitContentForm from './SubmitContentForm';

// Mock the DatePicker component to simplify testing the form's logic
// without depending on the date picker's internal implementation.
jest.mock('./DatePicker', () => ({ selectedDate, onDateChange, placeholder }: { selectedDate: string, onDateChange: (date: string) => void, placeholder: string }) => (
  <input
    data-testid="datepicker"
    placeholder={placeholder}
    value={selectedDate}
    onChange={(e) => onDateChange(e.target.value)}
    aria-label="Release Date"
  />
));

// Mock Icons to prevent SVG rendering issues in test environment
jest.mock('./Icons', () => ({
    __esModule: true,
    default: {
        CloseLarge: () => <div data-testid="close-icon">Close</div>,
        CloudUpload: () => <div data-testid="upload-icon">Upload</div>,
        Sparkles: () => <div data-testid="sparkles-icon">Sparkles</div>,
        Info: () => <div data-testid="info-icon">Info</div>,
    },
}));


describe('SubmitContentForm', () => {
  const mockOnSubmit = jest.fn();
  const mockOnClose = jest.fn();
  const mockAddToast = jest.fn();

  beforeEach(() => {
    // Reset mocks before each test
    mockOnSubmit.mockClear();
    mockOnClose.mockClear();
    mockAddToast.mockClear();
  });

  it('should not render when isOpen is false', () => {
    const { container } = render(
      <SubmitContentForm isOpen={false} onClose={mockOnClose} onSubmit={mockOnSubmit} addToast={mockAddToast} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('should render the form when isOpen is true', () => {
    render(<SubmitContentForm isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} addToast={mockAddToast} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Submit New Content')).toBeInTheDocument();
  });

  it('should call onClose when the close button is clicked', () => {
    render(<SubmitContentForm isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} addToast={mockAddToast} />);
    userEvent.click(screen.getByTestId('close-icon'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when the cancel button is clicked', () => {
    render(<SubmitContentForm isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} addToast={mockAddToast} />);
    userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
  
  it('should display validation errors for all required fields on submit', async () => {
    render(<SubmitContentForm isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} addToast={mockAddToast} />);
    
    // Attempt to submit without filling any fields
    userEvent.click(screen.getByRole('button', { name: /submit content/i }));

    // Check for all expected validation messages
    expect(await screen.findByText('Episode Name is required.')).toBeInTheDocument();
    expect(screen.getByText('Guest Name is required.')).toBeInTheDocument();
    expect(screen.getByText('Episode Description is required.')).toBeInTheDocument();
    expect(screen.getByText('Release Date is required.')).toBeInTheDocument();
    expect(screen.getByText("You must confirm the file upload.")).toBeInTheDocument();
    
    // Ensure submit handler was not called
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('should allow a user to fill out and submit the form successfully', async () => {
    render(<SubmitContentForm isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} addToast={mockAddToast} />);

    const episodeNameInput = screen.getByLabelText(/episode name/i);
    const guestNameInput = screen.getByLabelText(/guest name/i);
    const descriptionTextarea = screen.getByLabelText(/episode description/i);
    const datePickerInput = screen.getByLabelText('Release Date');
    const confirmationCheckbox = screen.getByLabelText(/i confirm that i've uploaded the file/i);
    
    // Fill the form with valid data
    await userEvent.type(episodeNameInput, 'Test Episode');
    await userEvent.type(guestNameInput, 'Test Guest');
    await userEvent.type(descriptionTextarea, 'This is a test description.');
    
    // Simulate date change via our mock input
    fireEvent.change(datePickerInput, { target: { value: '2024-12-25' } });
    
    await userEvent.click(confirmationCheckbox);
    
    // Submit the form
    await userEvent.click(screen.getByRole('button', { name: /submit content/i }));

    // Assert that the submit handler was called with the correct data
    expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    expect(mockOnSubmit).toHaveBeenCalledWith({
      title: 'Test Episode',
      guestName: 'Test Guest',
      description: 'This is a test description.',
      tags: '',
      hashtags: '',
      type: 'Podcast',
      dueDate: '2024-12-25',
    });

    // Check that error messages are not visible
    expect(screen.queryByText('Episode Name is required.')).not.toBeInTheDocument();
    expect(screen.queryByText('Guest Name is required.')).not.toBeInTheDocument();
  });
});