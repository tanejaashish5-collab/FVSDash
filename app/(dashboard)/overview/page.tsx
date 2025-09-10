
'use client';

import React, { useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToasts } from '@/lib/ToastProvider';
import { DEFAULT_EPISODES, DEFAULT_KANBAN_CARDS, DEFAULT_KPI_DATA, DEFAULT_QUICK_ACTIONS, DEFAULT_USER_PROFILE } from "@/constants";
import DashboardContent from "@/components/DashboardContent";
import { generatePerformanceData } from '@/utils';
import { ContentPerformanceData } from '@/types';

interface OverviewPageProps {
  setOnboardingRef?: (node: HTMLElement | null) => void;
  currentTourStepId?: string | null;
}

// The `startTour` prop is passed down from the layout if the ?tour=true query param is present
export default function OverviewPage({ setOnboardingRef = () => {}, currentTourStepId }: OverviewPageProps) {
  // Data is from constants, as was the case in the original async function.
  const data = {
      kpiData: DEFAULT_KPI_DATA,
      episodes: DEFAULT_EPISODES,
      kanbanCards: DEFAULT_KANBAN_CARDS,
      quickActions: DEFAULT_QUICK_ACTIONS,
  };
  const user = DEFAULT_USER_PROFILE;

  const performanceData = useMemo(() => generatePerformanceData(data.episodes, 30), [data.episodes]);

  const router = useRouter();
  const { addToast } = useToasts();

  const setActivePage = useCallback((page: string) => {
    router.push(`/${page}`);
  }, [router]);

  const onViewEpisodeDetails = useCallback((episode: ContentPerformanceData) => {
    router.push(`/analytics/${episode.id}`);
  }, [router]);

  const setIsFormOpen = useCallback((isOpen: boolean) => {
      if (isOpen) {
          // Workaround: The state for the form modal is in the parent layout.
          // We find the header's submit button and click it programmatically
          // to trigger the state change in the layout.
          const submitButton = document.querySelector('[data-onboarding-id="submit-button"]') as HTMLButtonElement;
          if (submitButton) {
              submitButton.click();
          } else {
              console.error("Could not find the submit button in the header to open the form.");
          }
      }
      // NOTE: Closing the form is handled by the form component itself, which is also in the layout.
  }, []);

  return (
    <DashboardContent
      user={user}
      kpiData={data.kpiData}
      episodes={data.episodes}
      kanbanCards={data.kanbanCards}
      performanceData={performanceData}
      quickActions={data.quickActions}
      setActivePage={setActivePage}
      onViewEpisodeDetails={onViewEpisodeDetails}
      addToast={addToast}
      setIsFormOpen={setIsFormOpen}
      setOnboardingRef={setOnboardingRef}
      // Replaced invalid 'startTourRequest' prop with 'currentTourStepId' for tour UI updates.
      currentTourStepId={currentTourStepId}
    />
  );
}
