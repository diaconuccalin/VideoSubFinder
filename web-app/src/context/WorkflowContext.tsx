/**
 * Workflow state management using React Context
 */

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { WorkflowState, WorkflowAction, WorkflowStep } from '../types/workflow.types';
import { DEFAULT_DETECTION_SETTINGS, DEFAULT_CLUSTERING_SETTINGS, DEFAULT_OCR_SETTINGS } from '../config/settings';
import { BoundingBox } from '../types/video.types';
import { saveWorkflowState, loadWorkflowState } from '../utils/workflowCache';

const initialState: WorkflowState = {
  currentStep: 'video-select',
  completedSteps: [],
  visitedSteps: [],
  videoFile: null,
  videoMetadata: null,
  videoUrl: null,
  detectedRegion: null,
  adjustedRegion: null,
  subtitleFrames: [],
  searchProgress: 0,
  isSearching: false,
  clearedImages: [],
  clearProgress: 0,
  isClearing: false,
  acceptedFrames: new Set(),
  rejectedFrames: new Set(),
  ocrResults: [],
  ocrProgress: 0,
  isProcessingOCR: false,
  subtitleContent: null,
  detectionSettings: DEFAULT_DETECTION_SETTINGS,
  clusteringSettings: DEFAULT_CLUSTERING_SETTINGS,
  ocrSettings: DEFAULT_OCR_SETTINGS,
};

function workflowReducer(state: WorkflowState, action: WorkflowAction): WorkflowState {
  switch (action.type) {
    case 'SET_STEP':
      // Add step to visitedSteps if not already there
      const visitedSteps = state.visitedSteps.includes(action.payload)
        ? state.visitedSteps
        : [...state.visitedSteps, action.payload];
      return { ...state, currentStep: action.payload, visitedSteps };

    case 'COMPLETE_STEP':
      return {
        ...state,
        completedSteps: [...state.completedSteps, action.payload],
      };

    case 'SET_VIDEO_FILE':
      // Reset all workflow state when a new video is selected
      // Mark video-select as completed and visited since we have a valid video
      return {
        ...initialState,
        currentStep: 'video-select',
        completedSteps: ['video-select'],
        visitedSteps: ['video-select'],
        videoFile: action.payload.file,
        videoMetadata: action.payload.metadata,
        videoUrl: action.payload.url,
      };

    case 'RESTORE_CACHED_STATE':
      // Restore workflow state from cache
      return {
        ...state,
        ...action.payload,
        // Keep video file and URL from current state
        videoFile: state.videoFile,
        videoMetadata: state.videoMetadata,
        videoUrl: state.videoUrl,
      };

    case 'CLEAR_VIDEO':
      // Clear video and reset workflow to initial state
      return {
        ...initialState,
      };

    case 'SET_DETECTED_REGION':
      return { ...state, detectedRegion: action.payload };

    case 'SET_ADJUSTED_REGION':
      return { ...state, adjustedRegion: action.payload };

    case 'SET_SUBTITLE_FRAMES':
      return { ...state, subtitleFrames: action.payload };

    case 'UPDATE_SEARCH_PROGRESS':
      return { ...state, searchProgress: action.payload };

    case 'SET_SEARCHING':
      return { ...state, isSearching: action.payload };

    case 'SET_CLEARED_IMAGES':
      return { ...state, clearedImages: action.payload };

    case 'UPDATE_CLEAR_PROGRESS':
      return { ...state, clearProgress: action.payload };

    case 'SET_CLEARING':
      return { ...state, isClearing: action.payload };

    case 'ACCEPT_FRAME':
      return {
        ...state,
        acceptedFrames: new Set(state.acceptedFrames).add(action.payload),
        rejectedFrames: new Set([...state.rejectedFrames].filter(id => id !== action.payload)),
      };

    case 'REJECT_FRAME':
      return {
        ...state,
        rejectedFrames: new Set(state.rejectedFrames).add(action.payload),
        acceptedFrames: new Set([...state.acceptedFrames].filter(id => id !== action.payload)),
      };

    case 'SET_OCR_RESULTS':
      return { ...state, ocrResults: action.payload };

    case 'UPDATE_OCR_PROGRESS':
      return { ...state, ocrProgress: action.payload };

    case 'SET_PROCESSING_OCR':
      return { ...state, isProcessingOCR: action.payload };

    case 'SET_SUBTITLE_CONTENT':
      return { ...state, subtitleContent: action.payload };

    case 'UPDATE_DETECTION_SETTINGS':
      return {
        ...state,
        detectionSettings: { ...state.detectionSettings, ...action.payload },
      };

    case 'UPDATE_CLUSTERING_SETTINGS':
      return {
        ...state,
        clusteringSettings: { ...state.clusteringSettings, ...action.payload },
      };

    case 'UPDATE_OCR_SETTINGS':
      return {
        ...state,
        ocrSettings: { ...state.ocrSettings, ...action.payload },
      };

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

interface WorkflowContextType {
  state: WorkflowState;
  dispatch: React.Dispatch<WorkflowAction>;
  goToStep: (step: WorkflowStep) => void;
  completeCurrentStep: () => void;
  completeStep: (step: WorkflowStep) => void;
  setDetectedRegion: (region: BoundingBox | null) => void;
  setAdjustedRegion: (region: BoundingBox) => void;
  loadCachedState: (file: File, metadata: any) => Promise<boolean>;
}

const WorkflowContext = createContext<WorkflowContextType | undefined>(undefined);

export function WorkflowProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(workflowReducer, initialState);

  // Auto-save state to cache whenever it changes (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (state.videoFile) {
        saveWorkflowState(state).catch((error) => {
          console.error('Failed to save workflow state:', error);
        });
      }
    }, 1000); // Debounce 1 second

    return () => clearTimeout(timer);
  }, [state]);

  const goToStep = (step: WorkflowStep) => {
    dispatch({ type: 'SET_STEP', payload: step });
  };

  const completeCurrentStep = () => {
    dispatch({ type: 'COMPLETE_STEP', payload: state.currentStep });
  };

  const completeStep = (step: WorkflowStep) => {
    dispatch({ type: 'COMPLETE_STEP', payload: step });
  };

  const setDetectedRegion = (region: BoundingBox | null) => {
    dispatch({ type: 'SET_DETECTED_REGION', payload: region });
  };

  const setAdjustedRegion = (region: BoundingBox) => {
    dispatch({ type: 'SET_ADJUSTED_REGION', payload: region });
  };

  const loadCachedState = async (file: File, metadata: any): Promise<boolean> => {
    try {
      const cached = await loadWorkflowState(file, metadata);
      if (cached) {
        dispatch({ type: 'RESTORE_CACHED_STATE', payload: cached });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to load cached state:', error);
      return false;
    }
  };

  return (
    <WorkflowContext.Provider
      value={{
        state,
        dispatch,
        goToStep,
        completeCurrentStep,
        completeStep,
        setDetectedRegion,
        setAdjustedRegion,
        loadCachedState,
      }}
    >
      {children}
    </WorkflowContext.Provider>
  );
}

export function useWorkflow() {
  const context = useContext(WorkflowContext);
  if (context === undefined) {
    throw new Error('useWorkflow must be used within a WorkflowProvider');
  }
  return context;
}
