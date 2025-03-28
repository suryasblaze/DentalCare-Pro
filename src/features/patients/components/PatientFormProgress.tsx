import React from 'react';
import { Progress } from '@/components/ui/progress';

interface PatientFormProgressProps {
  steps: string[];
  currentStepIndex: number;
  onChange?: (stepIndex: number) => void;
}

export function PatientFormProgress({ 
  steps, 
  currentStepIndex,
  onChange 
}: PatientFormProgressProps) {
  const progress = ((currentStepIndex + 1) / steps.length) * 100;
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        {steps.map((step, index) => (
          <button
            key={step}
            className={`text-sm ${
              index === currentStepIndex
                ? 'font-bold text-primary'
                : index < currentStepIndex
                ? 'text-muted-foreground'
                : 'text-muted-foreground/60'
            } ${onChange ? 'cursor-pointer' : 'cursor-default'}`}
            onClick={() => onChange && onChange(index)}
            disabled={!onChange}
          >
            {step}
          </button>
        ))}
      </div>
      <Progress value={progress} className="h-2" />
    </div>
  );
}