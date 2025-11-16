/**
 * Main App Component
 */

import { WorkflowProvider, useWorkflow } from './context/WorkflowContext';
import { Header } from './components/layout/Header';
import { WorkflowStepper } from './components/layout/WorkflowStepper';
import { Step1_VideoSelect } from './components/steps/Step1_VideoSelect';
import { Step2_AutoDetect } from './components/steps/Step2_AutoDetect';
import { Step3_SearchSubtitles } from './components/steps/Step3_SearchSubtitles';
import { Step4_ClearImages } from './components/steps/Step4_ClearImages';
import { Step5_ManualCleanup } from './components/steps/Step5_ManualCleanup';
import { Step6_ApplyOCR } from './components/steps/Step6_ApplyOCR';
import { Step7_GenerateSubtitles } from './components/steps/Step7_GenerateSubtitles';
import { StepPlaceholder } from './components/steps/StepPlaceholder';

function AppContent() {
  const { state } = useWorkflow();

  const renderStep = () => {
    switch (state.currentStep) {
      case 'video-select':
        return <Step1_VideoSelect />;

      case 'auto-detect':
        return <Step2_AutoDetect />;

      case 'manual-adjust':
        return (
          <StepPlaceholder
            title="Manual Adjustment"
            description="Adjust the detected subtitle region boundaries manually."
          />
        );

      case 'search-subtitles':
        return <Step3_SearchSubtitles />;

      case 'clear-images':
        return <Step4_ClearImages />;

      case 'manual-cleanup':
        return <Step5_ManualCleanup />;

      case 'ocr':
        return <Step6_ApplyOCR />;

      case 'generate-subs':
        return <Step7_GenerateSubtitles />;

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <WorkflowStepper />
      <main className="py-8">{renderStep()}</main>
    </div>
  );
}

function App() {
  return (
    <WorkflowProvider>
      <AppContent />
    </WorkflowProvider>
  );
}

export default App;
