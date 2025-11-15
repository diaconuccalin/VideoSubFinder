/**
 * Workflow Stepper Component - Shows 8-step progress
 */

import { useWorkflow } from '../../context/WorkflowContext';
import { WorkflowStep } from '../../types/workflow.types';

interface Step {
  id: WorkflowStep;
  label: string;
  shortLabel: string;
}

const STEPS: Step[] = [
  { id: 'video-select', label: 'Select Video', shortLabel: '1. Video' },
  { id: 'auto-detect', label: 'Auto-Detect Position', shortLabel: '2. Detect' },
  { id: 'manual-adjust', label: 'Adjust Region', shortLabel: '3. Adjust' },
  { id: 'search-subtitles', label: 'Search Subtitles', shortLabel: '4. Search' },
  { id: 'clear-images', label: 'Clear Images', shortLabel: '5. Clear' },
  { id: 'manual-cleanup', label: 'Manual Cleanup', shortLabel: '6. Cleanup' },
  { id: 'ocr', label: 'Apply OCR', shortLabel: '7. OCR' },
  { id: 'generate-subs', label: 'Generate Subtitles', shortLabel: '8. Generate' },
];

export function WorkflowStepper() {
  const { state, goToStep } = useWorkflow();

  const currentIndex = STEPS.findIndex(step => step.id === state.currentStep);

  return (
    <div className="bg-white border-b-2 border-submarine-ocean px-6 py-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => {
            const isCompleted = state.completedSteps.includes(step.id);
            const isCurrent = step.id === state.currentStep;
            const isAccessible = index <= currentIndex || isCompleted;

            return (
              <div key={step.id} className="flex items-center">
                {/* Step Circle */}
                <button
                  onClick={() => isAccessible && goToStep(step.id)}
                  disabled={!isAccessible}
                  className={`
                    flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors font-bold
                    ${isCurrent ? 'border-submarine-ocean bg-submarine-ocean text-white' : ''}
                    ${isCompleted && !isCurrent ? 'border-submarine-coral bg-submarine-coral text-white' : ''}
                    ${!isCurrent && !isCompleted ? 'border-gray-400 bg-white text-gray-600' : ''}
                    ${isAccessible ? 'cursor-pointer hover:bg-opacity-90' : 'cursor-not-allowed opacity-50'}
                  `}
                >
                  {isCompleted && !isCurrent ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <span className="text-sm font-bold">{index + 1}</span>
                  )}
                </button>

                {/* Step Label */}
                <div className="ml-2 hidden md:block">
                  <div className={`text-sm font-semibold ${isCurrent ? 'text-submarine-ocean' : 'text-submarine-deep-blue'}`}>
                    {step.label}
                  </div>
                </div>

                {/* Connector Line */}
                {index < STEPS.length - 1 && (
                  <div
                    className={`
                      h-1 w-8 mx-2 transition-colors
                      ${index < currentIndex ? 'bg-submarine-coral' : 'bg-gray-300'}
                    `}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
