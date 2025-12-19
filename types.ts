
export enum SimulationMode {
  MODE_A = 'MODE_A', // LLM Only
  MODE_B = 'MODE_B'  // LLM + RAG
}

export enum PipelineStep {
  QUESTION = 'QUESTION',
  // Mode B Ingestion Steps
  INGEST = 'INGEST',
  CLEAN = 'CLEAN',
  CHUNK = 'CHUNK',
  EMBED = 'EMBED',
  STORE = 'STORE',
  // Live Pipeline
  QUERY_EMBED = 'QUERY_EMBED',
  RETRIEVAL = 'RETRIEVAL',
  RERANK = 'RERANK',
  PROMPT = 'PROMPT',
  GENERATE = 'GENERATE',
  COMPARE = 'COMPARE'
}

export interface Chunk {
  id: string;
  text: string;
  source: string;
  score?: number;
}

export interface Document {
  id: string;
  name: string;
  content: string;
  type: 'PDF' | 'DOCX' | 'Policy';
}

export interface SimulationState {
  mode: SimulationMode;
  currentStep: PipelineStep;
  question: string;
  chunks: Chunk[];
  retrievedChunks: Chunk[];
  isRerankingEnabled: boolean;
  chunkSize: number;
  chunkOverlap: number;
  topK: number;
  llmOnlyAnswer: string;
  ragAnswer: string;
}
