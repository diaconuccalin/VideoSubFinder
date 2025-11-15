/**
 * Main App Component
 */

import { WorkflowProvider, useWorkflow } from './context/WorkflowContext';
import { Header } from './components/layout/Header';
import { WorkflowStepper } from './components/layout/WorkflowStepper';
import { Step1_VideoSelect } from './components/steps/Step1_VideoSelect';
import { Step2_AutoDetect } from './components/steps/Step2_AutoDetect';
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
        return (
          <StepPlaceholder
            title="Search Subtitles"
            description="Search the entire video for subtitle frames."
          />
        );

      case 'clear-images':
        return (
          <StepPlaceholder
            title="Clear Images"
            description="Remove background from subtitle images using K-means clustering."
          />
        );

      case 'manual-cleanup':
        return (
          <StepPlaceholder
            title="Manual Cleanup"
            description="Review and manually edit the cleared subtitle images."
          />
        );

      case 'ocr':
        return (
          <StepPlaceholder
            title="Apply OCR"
            description="Recognize text from subtitle images using OCR."
          />
        );

      case 'generate-subs':
        return (
          <StepPlaceholder
            title="Generate Subtitles"
            description="Generate subtitle file in SRT, VTT, or ASS format."
          />
        );

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
