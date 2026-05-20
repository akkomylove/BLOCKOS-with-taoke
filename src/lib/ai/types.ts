export interface AnalyzeRequest {
  documentName: string;
  documentContent: string;
  workflow: string[];
  sourceType: 'canvas' | 'page' | 'upload' | 'preset';
  pageId?: string;
}

export interface RoleFlowStage {
  role: string;
  stageGoal: string;
  handoffToNext: string;
  stageInput?: string;
  watchPoints: string[];
  stageOutput?: string;
}

export interface RoleFlow {
  title: string;
  stages: RoleFlowStage[];
}

export interface BaseRoleAnalysis {
  role: string;
  task: string;
  focusPoints: string[];
  briefSummary: string;
}

export interface TaskScheduleItem {
  step: number;
  owner: string;
  goal: string;
  inputFrom: string[];
  output: string;
  priority: 'high' | 'medium' | 'low';
}

export interface AnalyzeResponse {
  documentSummary: string;
  roleFlow: RoleFlow;
  roles: BaseRoleAnalysis[];
  taskSchedule: TaskScheduleItem[];
}

export interface CopilotRequest {
  action: 'plan_next' | 'plan_finalize' | 'critique_generate';
  documentName: string;
  documentContent: string;
  documentSummary?: string;
  workflow: string[];
  currentRole?: string;
  userMessage?: string;
  qaHistory?: { question: string; answer: string }[];
  copilotDocumentContent?: string;
}

export interface CopilotIssueItem {
  id: string;
  title: string;
  severity: 'high' | 'medium' | 'low';
  reason: string;
  suggestion: string;
  targetHeading?: string;
  matchKeywords: string[];
}

export interface CopilotPlanNextResponse {
  action: 'plan_next';
  understandingSummary: string;
  nextQuestion?: string;
  readyToFinalize: boolean;
  draftMarkdown: string;
}

export interface CopilotPlanFinalizeResponse {
  action: 'plan_finalize';
  summary: string;
  finalMarkdown: string;
}

export interface CopilotCritiqueResponse {
  action: 'critique_generate';
  overview: string;
  issues: CopilotIssueItem[];
  reviewMarkdown: string;
}

export type CopilotResponse = CopilotPlanNextResponse | CopilotPlanFinalizeResponse | CopilotCritiqueResponse;

export interface CodeLabRequest {
  documentName: string;
  documentSummary?: string;
  workflow: string[];
  currentRole: string;
  language: 'html' | 'js' | 'python' | 'c' | 'java';
  code: string;
  selectionText?: string;
}

export interface CodeLabResponse {
  language: string;
  currentRole: string;
  runtimeMode: 'browser' | 'pseudo';
  explanation: string;
  completionSuggestions: string[];
  runNotes: string[];
  pseudoResult: string;
  browserPreviewHint?: string;
}

export interface VizAssistRequest {
  documentName: string;
  documentSummary?: string;
  workflow: string[];
  currentRole: string;
  dataSourceName?: string;
  dataSourceContent?: string;
  sourceType?: 'upload' | 'preset';
}

export interface VizAssistResponse {
  chartTitle: string;
  summary: string;
  preferredChartType: 'table' | 'bar' | 'line' | 'pie';
  tableHeaders: string[];
  tableRows: string[][];
  fieldNotes: string[];
  chartSuggestions: string[];
  sourceNote?: string;
  placeholderNotice?: string;
  dataStatus: 'linked' | 'preset';
}

export interface VersionSummaryRequest {
  documentName: string;
  workflow: string[];
  previousContent: string;
  currentContent: string;
  versionNumber: number;
}

export interface VersionSummaryResponse {
  versionNumber: number;
  changeSummary: string;
  selfConclusion: string;
  decisionTrace: string[];
  keyChanges: string[];
  affectedRoles: string[];
}

export interface ChatContextItem {
  id: string;
  label: string;
  text: string;
}

export interface ChatMessageItem {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  documentName: string;
  documentSummary?: string;
  workflow: string[];
  currentRole: string;
  rolePreset: string;
  personaNote?: string;
  selectedContexts: ChatContextItem[];
  messages: ChatMessageItem[];
  userMessage: string;
}

export interface ChatResponse {
  assistantMessage: string;
  rolePreset: string;
  selectedContextCount: number;
}

export interface ReviewEnrichRequest {
  documentName: string;
  documentContent: string;
  workflow: string[];
  roles: {
    role: string;
    task: string;
    focusPoints: string[];
    briefSummary: string;
  }[];
}

export interface ReviewEnrichRole {
  role: string;
  reviewSummary: string;
  reviewChecklist: string[];
  viewHints: {
    priorityTopics: string[];
    foldableTopics: string[];
    reviewKeywords: string[];
    note: string;
  };
}

export interface ReviewEnrichResponse {
  roles: ReviewEnrichRole[];
}

export interface FoldPlanRequest {
  documentName: string;
  workflow: string[];
  currentRole: string;
  roleTask: string;
  roleSummary: string;
  focusPoints: string[];
  priorityTopics: string[];
  foldableTopics: string[];
  reviewKeywords: string[];
  watchPoints: string[];
  stageGoal: string;
  sections: {
    index: number;
    heading: string;
    content: string;
  }[];
}

export interface FoldPlanSection {
  index: number;
  heading: string;
  relevance: 'high' | 'medium' | 'low';
  shouldFold: boolean;
  highlight: boolean;
  reason: string;
  matchedTopics: string[];
  previewQuote: string;
}

export interface FoldPlanResponse {
  role: string;
  note: string;
  sections: FoldPlanSection[];
}

export interface DocRelationsRequest {
  documentName: string;
  currentRole: string;
  workflow: string[];
  documentSummary: string;
  candidates: {
    documentId: string;
    documentName: string;
    summary: string;
    sourceType: string;
  }[];
}

export interface DocRelationItem {
  documentId: string;
  documentName: string;
  relationType: string;
  relationDescription: string;
  relationReason: string;
  confidence: 'high' | 'medium' | 'low';
  readingGuide?: {
    priority: number;
    readingOrder: number;
    keyPoints: string[];
    jumpToSection?: string;
  };
}

export interface DocRelationsResponse {
  overview: string;
  relations: DocRelationItem[];
  editableNote: string;
  readingGuide?: {
    title: string;
    description: string;
    documents: Array<{
      documentId: string;
      documentName: string;
      priority: number;
      readingOrder: number;
      keyPoints: string[];
      jumpToSection?: string;
      reason: string;
    }>;
  };
}
