/**
 * Workflow state management using React Context
 */

import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { WorkflowState, WorkflowAction, WorkflowStep } from '../types/workflow.types';
import { DEFAULT_DETECTION_SETTINGS, DEFAULT_CLUSTERING_SETTINGS, DEFAULT_OCR_SETTINGS } from '../config/settings';
import { BoundingBox } from '../types/video.types';

const initialState: WorkflowState = {
  currentStep: 'video-select',
  completedSteps: [],
  videoFile: null,
  videoMetadata: null,
  videoUrl: null,
  detectedRegion: null,
  adjustedRegion: null,
  subtitleFrames: [],
  searchProgress: 0,
  isSearching: false,
  clearProgress: 0,
  isClearing: false,
  acceptedFrames: new Set(),
  rejectedFrames: new Set(),
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
      return { ...state, currentStep: action.payload };

    case 'COMPLETE_STEP':
      return {
        ...state,
        completedSteps: [...state.completedSteps, action.payload],
      };

    case 'SET_VIDEO_FILE':
      return {
        ...state,
        videoFile: action.payload.file,
        videoMetadata: action.payload.metadata,
        videoUrl: action.payload.url,
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
  setDetectedRegion: (region: BoundingBox) => void;
  setAdjustedRegion: (region: BoundingBox) => void;
}

const WorkflowContext = createContext<WorkflowContextType | undefined>(undefined);

export function WorkflowProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(workflowReducer, initialState);

  const goToStep = (step: WorkflowStep) => {
    dispatch({ type: 'SET_STEP', payload: step });
  };

  const completeCurrentStep = () => {
    dispatch({ type: 'COMPLETE_STEP', payload: state.currentStep });
  };

  const completeStep = (step: WorkflowStep) => {
    dispatch({ type: 'COMPLETE_STEP', payload: step });
  };

  const setDetectedRegion = (region: BoundingBox) => {
    dispatch({ type: 'SET_DETECTED_REGION', payload: region });
  };

  const setAdjustedRegion = (region: BoundingBox) => {
    dispatch({ type: 'SET_ADJUSTED_REGION', payload: region });
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
