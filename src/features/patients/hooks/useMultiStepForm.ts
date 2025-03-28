import { useState } from 'react';

interface UseMultiStepFormProps {
  steps: string[];
  initialStep?: number;
}

/**
 * Custom hook for managing multi-step forms
 */
export function useMultiStepForm({ steps, initialStep = 0 }: UseMultiStepFormProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(initialStep);

  function next() {
    setCurrentStepIndex(i => {
      if (i >= steps.length - 1) return i;
      return i + 1;
    });
  }

  function back() {
    setCurrentStepIndex(i => {
      if (i <= 0) return i;
      return i - 1;
    });
  }

  function goTo(index: number) {
    setCurrentStepIndex(index);
  }

  return {
    currentStepIndex,
    currentStep: steps[currentStepIndex],
    steps,
    isFirstStep: currentStepIndex === 0,
    isLastStep: currentStepIndex === steps.length - 1,
    goTo,
    next,
    back
  };
}