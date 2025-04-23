import React from 'react';

interface Step {
  id: number | string;
  title: string;
  description?: string;
}

interface TreatmentProgressBarProps {
  steps: Step[];
  currentStepId: number | string;
  completedStepIds: (number | string)[];
}

// Define the colors
const activeColor = '#0060df'; // Blue for active/completed intermediate steps
const finalCompletedColor = '#22c55e'; // Green for the final completed state
const pendingColor = '#e0e0e0'; // Gray for pending steps/lines
const iconTextColor = '#ffffff'; // White for text/icons inside colored circles

const TreatmentProgressBar: React.FC<TreatmentProgressBarProps> = ({
  steps,
  currentStepId,
  completedStepIds,
}) => {
  const getStepStatus = (stepId: number | string, index: number) => {
    const isFinalStep = index === steps.length - 1;
    const isPlanCompleted = currentStepId === 'completed'; // Check if the overall plan is completed

    if (completedStepIds.includes(stepId)) {
        // If the plan is fully completed and this is the final step, it's 'finalComplete'
        if (isPlanCompleted && isFinalStep) return 'finalComplete';
        // Otherwise, it's just 'completed'
        return 'completed';
    }
    if (stepId === currentStepId) {
        // If the plan is fully completed and this is the final step, it's 'finalComplete'
         if (isPlanCompleted && isFinalStep) return 'finalComplete';
        // Otherwise, it's the 'current' step
        return 'current';
    }
    return 'pending';
  };


  return (
    <div className="flex items-start w-full px-2 py-4 bg-white rounded-lg shadow-sm overflow-x-auto"> {/* Reduced padding, items-start */}
      {steps.map((step, index) => {
        const status = getStepStatus(step.id, index);
        const isLastStep = index === steps.length - 1; // Keep only one declaration

        // Derive boolean flags from status
        const isCompleted = status === 'completed';
        const isCurrent = status === 'current';
        const isFinalComplete = status === 'finalComplete';

        // Determine colors based on status
        const currentIconBgColor = isFinalComplete ? finalCompletedColor : (isCompleted || isCurrent) ? activeColor : pendingColor;
        const currentLineColor = isFinalComplete ? finalCompletedColor : isCompleted ? activeColor : pendingColor; // Line color depends on the *source* step's completion

        return (
          <React.Fragment key={step.id}>
            {/* Step Item */}
            <div className="flex flex-col items-center min-w-[100px] px-1"> {/* Reduced min-width and padding */}
              {/* Icon */}
              <div
                className="flex items-center justify-center w-6 h-6 rounded-full transition-colors duration-500 mb-1" // Reduced size & margin
                style={{ backgroundColor: currentIconBgColor }}
              >
                {isCompleted || isFinalComplete ? (
                  // Checkmark for completed/finalComplete steps
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke={iconTextColor} className="w-4 h-4"> {/* Reduced icon size */}
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                ) : isCurrent ? (
                   // Checkmark for current step as well (matching image)
                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke={iconTextColor} className="w-4 h-4"> {/* Reduced icon size */}
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                ) : (
                  // Small square/dot for pending (or could be empty)
                  <div className="w-2 h-2 bg-gray-400 rounded-sm"></div>
                )}
              </div>
              {/* Text */}
              <div className="text-center">
                <div className={`text-xs font-medium ${isCompleted || isCurrent || isFinalComplete ? 'text-gray-700' : 'text-gray-400'}`}> {/* Reduced font size */}
                  {step.title}
                </div>
                {step.description && (
                  <div className="text-[10px] text-gray-400">{step.description}</div> // Further reduced font size
                )}
              </div>
            </div>

            {/* Connecting Line */}
            {!isLastStep && (
              <div className="flex-1 h-1 mx-1 relative transition-colors duration-500" style={{ backgroundColor: pendingColor }}> {/* Base color is pending */}
                 {/* Animated fill overlay */}
                <div
                  className="absolute top-0 left-0 h-full transition-all duration-1000 ease-out"
                  style={{
                    width: isCompleted ? '100%' : '0%', // Use isCompleted for width
                    backgroundColor: activeColor // Use activeColor (blue) for the fill animation
                  }}
                ></div>
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default TreatmentProgressBar;
