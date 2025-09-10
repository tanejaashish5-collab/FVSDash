import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import OnboardingTooltip from './OnboardingTooltip';
import { OnboardingStep } from '../types';

// Mock Icons
jest.mock('./Icons', () => ({
  __esModule: true,
  default: {},
}));

describe('OnboardingTooltip', () => {
    const mockOnNext = jest.fn();
    const mockOnPrev = jest.fn();
    const mockOnSkip = jest.fn();

    const mockStep: OnboardingStep = {
        id: 'step-1',
        title: 'Welcome!',
        description: 'This is a test description.',
        target: 'test-target',
        position: 'bottom',
    };
    
    let targetElement: HTMLDivElement;

    beforeEach(() => {
        mockOnNext.mockClear();
        mockOnPrev.mockClear();
        mockOnSkip.mockClear();
        
        // Create a fake target element in the body
        targetElement = document.createElement('div');
        targetElement.id = 'test-target';
        // Mock getBoundingClientRect as JSDOM doesn't do layout
        targetElement.getBoundingClientRect = jest.fn(() => ({
            width: 100,
            height: 50,
            top: 100,
            left: 100,
            right: 200,
            bottom: 150,
            x: 100,
            y: 100,
            toJSON: () => {},
        }));
        // Mock scrollIntoView
        targetElement.scrollIntoView = jest.fn();
        document.body.appendChild(targetElement);

        // Mock requestAnimationFrame for deterministic positioning
        window.requestAnimationFrame = (cb) => {
            cb(0);
            return 1;
        };
    });
    
    afterEach(() => {
        document.body.removeChild(targetElement);
    });

    it('renders step content correctly', () => {
        render(
            <OnboardingTooltip
                step={mockStep}
                targetElement={targetElement}
                onNext={mockOnNext}
                onPrev={mockOnPrev}
                onSkip={mockOnSkip}
                isLastStep={false}
                currentStep={1}
                totalSteps={5}
            />
        );

        expect(screen.getByText('Welcome!')).toBeInTheDocument();
        expect(screen.getByText('This is a test description.')).toBeInTheDocument();
        expect(screen.getByText('Step 1 of 5')).toBeInTheDocument();
    });

    it('calls onNext when the "Next" button is clicked', async () => {
        render(
            <OnboardingTooltip step={mockStep} targetElement={targetElement} onNext={mockOnNext} onPrev={mockOnPrev} onSkip={mockOnSkip} isLastStep={false} currentStep={2} totalSteps={5} />
        );
        await userEvent.click(screen.getByRole('button', { name: 'Next' }));
        expect(mockOnNext).toHaveBeenCalledTimes(1);
    });

    it('calls onPrev when the "Previous" button is clicked', async () => {
        render(
            <OnboardingTooltip step={mockStep} targetElement={targetElement} onNext={mockOnNext} onPrev={mockOnPrev} onSkip={mockOnSkip} isLastStep={false} currentStep={2} totalSteps={5} />
        );
        await userEvent.click(screen.getByRole('button', { name: 'Previous' }));
        expect(mockOnPrev).toHaveBeenCalledTimes(1);
    });

    it('calls onSkip when the "Skip Tour" button is clicked', async () => {
        render(
            <OnboardingTooltip step={mockStep} targetElement={targetElement} onNext={mockOnNext} onPrev={mockOnPrev} onSkip={mockOnSkip} isLastStep={false} currentStep={1} totalSteps={5} />
        );
        await userEvent.click(screen.getByRole('button', { name: 'Skip Tour' }));
        expect(mockOnSkip).toHaveBeenCalledTimes(1);
    });
    
    it('disables the "Previous" button on the first step', () => {
        render(
            <OnboardingTooltip step={mockStep} targetElement={targetElement} onNext={mockOnNext} onPrev={mockOnPrev} onSkip={mockOnSkip} isLastStep={false} currentStep={1} totalSteps={5} />
        );
        expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    });

    it('displays "Finish Tour" on the last step', () => {
        render(
            <OnboardingTooltip step={mockStep} targetElement={targetElement} onNext={mockOnNext} onPrev={mockOnPrev} onSkip={mockOnSkip} isLastStep={true} currentStep={5} totalSteps={5} />
        );
        expect(screen.getByRole('button', { name: 'Finish Tour' })).toBeInTheDocument();
    });

    it('calls scrollIntoView on the target element', () => {
        render(
            <OnboardingTooltip step={mockStep} targetElement={targetElement} onNext={mockOnNext} onPrev={mockOnPrev} onSkip={mockOnSkip} isLastStep={false} currentStep={1} totalSteps={5} />
        );
        expect(targetElement.scrollIntoView).toHaveBeenCalledWith({
            behavior: 'auto',
            block: 'center',
            inline: 'center',
        });
    });
});
