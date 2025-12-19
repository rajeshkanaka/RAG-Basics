
import React, { useState, useEffect, useCallback } from 'react';
import { 
  SimulationMode, 
  PipelineStep, 
  Chunk, 
  SimulationState 
} from './types';
import { 
  PRIVATE_DOCUMENT, 
  SAMPLE_QUESTIONS, 
  STEP_METADATA, 
  PIPELINE_FLOW 
} from './constants';
import { generateAnswer } from './services/gemini';
import { 
  ArrowRight, 
  CheckCircle2, 
  Info, 
  Cpu, 
  Database, 
  Settings, 
  MessageSquare, 
  ChevronRight, 
  Search,
  BookOpen,
  Zap,
  LayoutGrid,
  FileText
} from 'lucide-react';

const App: React.FC = () => {
  const [state, setState] = useState<SimulationState>({
    mode: SimulationMode.MODE_A,
    currentStep: PipelineStep.QUESTION,
    question: "",
    chunks: [],
    retrievedChunks: [],
    isRerankingEnabled: true,
    chunkSize: 500,
    chunkOverlap: 50,
    topK: 3,
    llmOnlyAnswer: "",
    ragAnswer: ""
  });

  const [isLoading, setIsLoading] = useState(false);

  // Simulation Logic: Step through the pipeline
  const nextStep = () => {
    const currentIndex = PIPELINE_FLOW.indexOf(state.currentStep);
    
    if (state.mode === SimulationMode.MODE_A) {
      if (state.currentStep === PipelineStep.QUESTION) {
        setState(prev => ({ ...prev, currentStep: PipelineStep.GENERATE }));
      } else if (state.currentStep === PipelineStep.GENERATE) {
        setState(prev => ({ ...prev, currentStep: PipelineStep.COMPARE }));
      }
      return;
    }

    if (currentIndex < PIPELINE_FLOW.length - 1) {
      const next = PIPELINE_FLOW[currentIndex + 1];
      setState(prev => ({ ...prev, currentStep: next }));
    } else {
      setState(prev => ({ ...prev, currentStep: PipelineStep.COMPARE }));
    }
  };

  const jumpToStep = (step: PipelineStep) => {
    setState(prev => ({ ...prev, currentStep: step }));
  };

  // Logic to process data as we move through steps
  useEffect(() => {
    if (state.currentStep === PipelineStep.CHUNK) {
      // Simple logic to create chunks based on current text
      const text = PRIVATE_DOCUMENT.content;
      const fakeChunks: Chunk[] = text.match(new RegExp(`.{1,${state.chunkSize}}`, 'g'))?.map((t, i) => ({
        id: `c-${i+1}`,
        text: t,
        source: PRIVATE_DOCUMENT.name
      })) || [];
      setState(prev => ({ ...prev, chunks: fakeChunks }));
    }

    if (state.currentStep === PipelineStep.RETRIEVAL) {
      // Simple keyword matching for simulation purposes
      const keywords = state.question.toLowerCase().split(' ');
      const scored = state.chunks.map(c => {
        let score = 0;
        keywords.forEach(kw => { if (c.text.toLowerCase().includes(kw)) score += 0.2; });
        return { ...c, score: Math.min(score, 0.98) };
      }).sort((a, b) => (b.score || 0) - (a.score || 0));
      
      setState(prev => ({ ...prev, retrievedChunks: scored.slice(0, state.topK) }));
    }

    if (state.currentStep === PipelineStep.GENERATE) {
      handleGeneration();
    }
  }, [state.currentStep, state.question, state.chunkSize, state.topK]);

  const handleGeneration = async () => {
    if (state.mode === SimulationMode.MODE_A && !state.llmOnlyAnswer) {
      setIsLoading(true);
      const ans = await generateAnswer(state.question, [], 'LLM_ONLY');
      setState(prev => ({ ...prev, llmOnlyAnswer: ans }));
      setIsLoading(false);
    } else if (state.mode === SimulationMode.MODE_B && !state.ragAnswer) {
      setIsLoading(true);
      const ans = await generateAnswer(state.question, state.retrievedChunks, 'RAG');
      setState(prev => ({ ...prev, ragAnswer: ans }));
      setIsLoading(false);
    }
  };

  const resetSimulation = (newMode: SimulationMode) => {
    setState({
      mode: newMode,
      currentStep: PipelineStep.QUESTION,
      question: "",
      chunks: [],
      retrievedChunks: [],
      isRerankingEnabled: true,
      chunkSize: 500,
      chunkOverlap: 50,
      topK: 3,
      llmOnlyAnswer: "",
      ragAnswer: ""
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg text-white">
            <Cpu size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-none">RAG Simulation</h1>
            <p className="text-xs text-slate-500 font-medium">Rajesh Pandhare, Kanaka Software Consulting</p>
          </div>
        </div>

        <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1">
          <button 
            onClick={() => resetSimulation(SimulationMode.MODE_A)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${state.mode === SimulationMode.MODE_A ? 'bg-white shadow-sm text-blue-600' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Mode A: LLM Only
          </button>
          <button 
            onClick={() => resetSimulation(SimulationMode.MODE_B)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${state.mode === SimulationMode.MODE_B ? 'bg-white shadow-sm text-blue-600' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Mode B: LLM + RAG
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-50">
        
        {/* Sidebar: Pipeline Diagram */}
        <aside className="w-full md:w-72 border-r border-slate-200 bg-white p-6 overflow-y-auto hidden md:block">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6">Pipeline Flow</h2>
          <div className="space-y-4">
            {state.mode === SimulationMode.MODE_A ? (
               <div className="space-y-4">
                 <PipelineBlock 
                    step={PipelineStep.QUESTION} 
                    current={state.currentStep} 
                    completed={false} 
                    onClick={() => jumpToStep(PipelineStep.QUESTION)} 
                  />
                 <PipelineBlock 
                    step={PipelineStep.GENERATE} 
                    current={state.currentStep} 
                    completed={false} 
                    onClick={() => jumpToStep(PipelineStep.GENERATE)} 
                  />
               </div>
            ) : (
              PIPELINE_FLOW.map((step, idx) => (
                <PipelineBlock 
                  key={step} 
                  step={step} 
                  current={state.currentStep} 
                  completed={PIPELINE_FLOW.indexOf(state.currentStep) > idx}
                  onClick={() => jumpToStep(step)}
                />
              ))
            )}
            <PipelineBlock 
              step={PipelineStep.COMPARE} 
              current={state.currentStep} 
              completed={false}
              onClick={() => jumpToStep(PipelineStep.COMPARE)}
            />
          </div>
        </aside>

        {/* Workspace: Content Panel */}
        <section className="flex-1 overflow-y-auto p-6 md:p-10 pb-24">
          <div className="max-w-4xl mx-auto space-y-8">
            
            {/* Context Info */}
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-4">
              <span>{state.mode === SimulationMode.MODE_A ? "Standard LLM Baseline" : "Advanced RAG Pipeline"}</span>
              <ArrowRight size={14} />
              <span className="font-semibold text-blue-600">{STEP_METADATA[state.currentStep].title}</span>
            </div>

            <StepView 
              state={state} 
              setState={setState} 
              isLoading={isLoading} 
            />

            {/* Navigation Controls */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 flex justify-center items-center gap-4 z-40 md:left-72 shadow-lg">
              <button 
                disabled={state.currentStep === PipelineStep.QUESTION}
                onClick={() => {
                  if (state.mode === SimulationMode.MODE_A) {
                    jumpToStep(PipelineStep.QUESTION);
                  } else {
                    const currentIndex = PIPELINE_FLOW.indexOf(state.currentStep);
                    if (currentIndex > 0) jumpToStep(PIPELINE_FLOW[currentIndex - 1]);
                  }
                }}
                className="px-6 py-2 border border-slate-200 rounded-lg text-slate-600 font-medium hover:bg-slate-50 disabled:opacity-30 flex items-center gap-2"
              >
                Previous
              </button>
              <button 
                disabled={state.currentStep === PipelineStep.COMPARE || (state.currentStep === PipelineStep.QUESTION && !state.question)}
                onClick={nextStep}
                className="px-10 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-md flex items-center gap-2 transition-transform active:scale-95"
              >
                {state.currentStep === PipelineStep.GENERATE ? "View Results" : "Next Step"} <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </section>

        {/* Explanation Panel */}
        <aside className="w-full md:w-80 border-l border-slate-200 bg-white p-6 overflow-y-auto hidden lg:block">
           <div className="bg-blue-50 rounded-xl p-5 border border-blue-100 mb-6">
              <div className="flex items-center gap-2 text-blue-700 font-bold mb-3">
                <Info size={18} />
                <span>What's Happening?</span>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed mb-4">
                {STEP_METADATA[state.currentStep].description}
              </p>
              <div className="pt-4 border-t border-blue-200">
                <h4 className="text-xs font-bold text-blue-800 uppercase tracking-tight mb-2">Tools / Technologies:</h4>
                <div className="flex flex-wrap gap-1.5">
                  {STEP_METADATA[state.currentStep].tools.map(tool => (
                    <span key={tool} className="text-[10px] bg-white border border-blue-200 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                      {tool}
                    </span>
                  ))}
                </div>
              </div>
           </div>

           <div className="p-4 rounded-xl border border-slate-100 bg-slate-50">
             <h3 className="text-xs font-bold text-slate-400 uppercase mb-4 tracking-widest">Target Audience</h3>
             <div className="space-y-3">
               <div className="flex gap-3">
                 <BookOpen className="text-blue-500 shrink-0" size={16} />
                 <p className="text-xs text-slate-600">Perfect for educators from Civil, Mechanical, or Electrical engineering.</p>
               </div>
               <div className="flex gap-3">
                 <CheckCircle2 className="text-green-500 shrink-0" size={16} />
                 <p className="text-xs text-slate-600">Visualizes the "hidden" middle steps of AI retrieval.</p>
               </div>
             </div>
           </div>
        </aside>
      </main>
    </div>
  );
};

// Sub-components

const PipelineBlock: React.FC<{
  step: PipelineStep;
  current: PipelineStep;
  completed: boolean;
  onClick: () => void;
}> = ({ step, current, completed, onClick }) => {
  const isActive = step === current;
  const isComplete = completed;

  return (
    <div 
      onClick={onClick}
      className={`relative flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${
        isActive 
          ? 'bg-blue-50 border-blue-200 shadow-sm' 
          : isComplete 
            ? 'bg-white border-green-100' 
            : 'bg-white border-transparent hover:bg-slate-50'
      }`}
    >
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 ${
        isActive 
          ? 'bg-blue-600 border-blue-600 text-white' 
          : isComplete 
            ? 'bg-green-500 border-green-500 text-white' 
            : 'bg-white border-slate-200 text-slate-400'
      }`}>
        {isComplete ? <CheckCircle2 size={16} /> : <span className="text-xs font-bold tracking-tighter">?</span>}
      </div>
      <span className={`text-xs font-bold truncate ${isActive ? 'text-blue-700' : isComplete ? 'text-slate-600' : 'text-slate-400'}`}>
        {STEP_METADATA[step].title}
      </span>
      {isActive && (
        <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-2 h-2 bg-blue-600 rounded-full animate-pulse shadow-lg"></div>
      )}
    </div>
  );
};

const StepView: React.FC<{
  state: SimulationState;
  setState: React.Dispatch<React.SetStateAction<SimulationState>>;
  isLoading: boolean;
}> = ({ state, setState, isLoading }) => {
  
  switch (state.currentStep) {
    case PipelineStep.QUESTION:
      return (
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
            <label className="block text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
              <MessageSquare size={18} className="text-blue-600" />
              Ask a question about University Policy
            </label>
            <input 
              type="text"
              value={state.question}
              onChange={(e) => setState(prev => ({ ...prev, question: e.target.value }))}
              placeholder="e.g., How much is the AI innovation grant?"
              className="w-full p-4 text-lg border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {SAMPLE_QUESTIONS.map(q => (
              <button 
                key={q}
                onClick={() => setState(prev => ({ ...prev, question: q }))}
                className="text-left p-4 bg-white border border-slate-100 rounded-xl text-sm text-slate-600 hover:border-blue-200 hover:bg-blue-50 transition-all shadow-sm"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      );

    case PipelineStep.INGEST:
      return (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
           <h3 className="text-lg font-bold text-slate-800 mb-4">Select Source Documents</h3>
           <div className="p-4 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 flex flex-col items-center justify-center gap-4 text-center">
             <div className="bg-blue-100 p-4 rounded-full text-blue-600">
               <FileText size={32} />
             </div>
             <div>
               <p className="font-bold text-slate-700">{PRIVATE_DOCUMENT.name}</p>
               <p className="text-xs text-slate-500 uppercase font-bold tracking-widest">{PRIVATE_DOCUMENT.type} • Loaded</p>
             </div>
             <p className="text-sm text-slate-500 max-w-md italic">
               "This document contains data that public LLMs don't know yet because it's private and was released in 2025."
             </p>
           </div>
        </div>
      );

    case PipelineStep.CLEAN:
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200">
            <h4 className="text-xs font-black text-slate-400 uppercase mb-4 tracking-widest">Raw Input</h4>
            <div className="bg-slate-50 p-4 rounded-xl font-mono text-xs text-slate-400 h-64 overflow-hidden blur-[1px]">
              {PRIVATE_DOCUMENT.content}
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 relative overflow-hidden">
            <div className="absolute inset-0 bg-blue-600/5 pointer-events-none"></div>
            <h4 className="text-xs font-black text-blue-600 uppercase mb-4 tracking-widest">Cleaned Output</h4>
            <div className="bg-white p-4 rounded-xl font-mono text-xs text-slate-700 h-64 overflow-y-auto border border-blue-50 shadow-inner">
              {PRIVATE_DOCUMENT.content.trim().replace(/\s+/g, ' ')}
            </div>
          </div>
        </div>
      );

    case PipelineStep.CHUNK:
      return (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center gap-8 shadow-sm">
            <div className="flex-1 space-y-4">
               <label className="block text-sm font-bold text-slate-700">Chunk Size (Characters): {state.chunkSize}</label>
               <input 
                 type="range" min="100" max="1000" step="100" 
                 value={state.chunkSize} 
                 onChange={(e) => setState(prev => ({ ...prev, chunkSize: Number(e.target.value) }))}
                 className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
               />
               <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                 <span>TINY (MANY)</span>
                 <span>HUGE (FEW)</span>
               </div>
            </div>
            <div className="shrink-0 bg-blue-50 border border-blue-100 p-4 rounded-xl text-center">
              <span className="block text-xs font-bold text-blue-400 uppercase tracking-widest">Total Chunks</span>
              <span className="text-4xl font-black text-blue-600">{state.chunks.length}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {state.chunks.map(c => (
              <div key={c.id} className="bg-white p-4 rounded-xl border border-slate-200 hover:border-blue-400 transition-colors shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase">{c.id}</span>
                  <BookOpen size={12} className="text-slate-300" />
                </div>
                <p className="text-[11px] leading-relaxed text-slate-600 line-clamp-4">
                  {c.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      );

    case PipelineStep.EMBED:
      return (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center">
          <h3 className="text-lg font-bold text-slate-800 mb-8">Meaning → Numbers</h3>
          <div className="flex flex-wrap justify-center gap-12">
            <div className="space-y-4">
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-left w-64 h-40 flex flex-col justify-center">
                <p className="text-xs italic text-slate-500 mb-2">Text Chunk:</p>
                <p className="text-sm font-bold text-slate-800">"...Smart-Scan biometric attendance system..."</p>
              </div>
              <ArrowRight className="mx-auto text-slate-300 rotate-90 md:rotate-0" />
              <div className="bg-blue-600 p-6 rounded-2xl text-left w-64 h-40 flex flex-col justify-center shadow-lg">
                <p className="text-xs text-blue-200 mb-4">Semantic Vector:</p>
                <div className="flex gap-1 items-end h-16">
                  {[0.4, 0.8, 0.2, 0.9, 0.5, 0.7, 0.3, 0.6].map((v, i) => (
                    <div key={i} className="flex-1 bg-white/20 rounded-t-sm" style={{ height: `${v * 100}%` }}></div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="max-w-xs text-left self-center space-y-4">
              <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                <p className="text-xs text-amber-800 leading-relaxed font-medium">
                  <strong>The Professor's Analogy:</strong> Imagine giving every concept a coordinate on a giant map. Similar meanings end up as neighbors!
                </p>
              </div>
              <ul className="text-xs text-slate-500 space-y-2">
                <li className="flex gap-2"><CheckCircle2 className="text-blue-500" size={14} /> Higher dimension (often 768 or 1536 numbers)</li>
                <li className="flex gap-2"><CheckCircle2 className="text-blue-500" size={14} /> Captures context, not just keywords</li>
              </ul>
            </div>
          </div>
        </div>
      );

    case PipelineStep.STORE:
      return (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4 mb-8">
            <Database size={32} className="text-blue-600" />
            <h3 className="text-xl font-bold text-slate-800">Vector Database</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="pb-4 font-black text-slate-400 uppercase tracking-widest text-[10px]">ID</th>
                  <th className="pb-4 font-black text-slate-400 uppercase tracking-widest text-[10px]">Vector Preview</th>
                  <th className="pb-4 font-black text-slate-400 uppercase tracking-widest text-[10px]">Metadata</th>
                  <th className="pb-4 font-black text-slate-400 uppercase tracking-widest text-[10px]">Source Text</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {state.chunks.slice(0, 4).map(c => (
                  <tr key={c.id}>
                    <td className="py-4 font-bold text-slate-700">{c.id}</td>
                    <td className="py-4">
                      <div className="flex gap-0.5">
                        {Array.from({length: 8}).map((_, i) => (
                          <div key={i} className="w-2 h-4 bg-blue-200 rounded-full" style={{ opacity: Math.random() + 0.2 }}></div>
                        ))}
                      </div>
                    </td>
                    <td className="py-4">
                      <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500">university_policy_2025</span>
                    </td>
                    <td className="py-4 text-xs text-slate-400 truncate max-w-[200px]">{c.text}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-8 text-center bg-slate-50 p-4 rounded-xl border border-slate-100">
            <p className="text-xs text-slate-500">Indexing complete. Your knowledge base is now searchable.</p>
          </div>
        </div>
      );

    case PipelineStep.QUERY_EMBED:
      return (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-8">
           <div className="flex flex-col md:flex-row items-center justify-between gap-12">
              <div className="flex-1 space-y-4">
                 <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Question</h4>
                 <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-slate-700 font-bold">
                   "{state.question}"
                 </div>
              </div>
              <div className="shrink-0">
                <ArrowRight className="text-blue-500 rotate-90 md:rotate-0" size={32} />
              </div>
              <div className="flex-1 space-y-4">
                 <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest">Question Vector</h4>
                 <div className="bg-blue-600 p-4 rounded-xl flex gap-1 items-center h-14 overflow-hidden">
                    {Array.from({length: 24}).map((_, i) => (
                      <div key={i} className="flex-1 bg-white/20 rounded-full" style={{ height: `${Math.random() * 80 + 20}%` }}></div>
                    ))}
                 </div>
              </div>
           </div>
           <p className="text-center text-sm text-slate-500">
             To find the answer, we compare the "Question Vector" against all "Chunk Vectors" in the database.
           </p>
        </div>
      );

    case PipelineStep.RETRIEVAL:
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex-1 max-w-xs space-y-4">
              <label className="block text-sm font-bold text-slate-700">Top-K Results: {state.topK}</label>
              <input 
                type="range" min="1" max="5" step="1" 
                value={state.topK} 
                onChange={(e) => setState(prev => ({ ...prev, topK: Number(e.target.value) }))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>
            <div className="flex items-center gap-4">
               <div className="text-right">
                 <span className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Algorithm</span>
                 <span className="text-sm font-bold text-slate-700">Cosine Similarity</span>
               </div>
               <div className="bg-green-100 p-2 rounded-lg text-green-600">
                 <Search size={24} />
               </div>
            </div>
          </div>

          <div className="space-y-4">
            {state.retrievedChunks.map((c, i) => (
              <div key={c.id} className="bg-white p-5 rounded-2xl border-l-4 border-l-blue-500 border-slate-200 shadow-sm flex gap-6 items-center hover:bg-blue-50/30 transition-colors">
                <div className="shrink-0 text-center">
                   <span className="block text-[10px] font-black text-slate-400 uppercase tracking-tighter">Rank</span>
                   <span className="text-2xl font-black text-blue-600">#{i+1}</span>
                </div>
                <div className="flex-1">
                   <div className="flex items-center gap-2 mb-1">
                     <span className="text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-500">{c.id}</span>
                     <span className="text-[10px] font-bold text-green-600">Similarity: {((c.score || 0) * 100).toFixed(1)}%</span>
                   </div>
                   <p className="text-sm text-slate-700 italic">"{c.text}"</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    case PipelineStep.RERANK:
      return (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-8">
           <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">Precision Improvement</h3>
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-500">Enable Reranker</span>
                <button 
                  onClick={() => setState(prev => ({ ...prev, isRerankingEnabled: !prev.isRerankingEnabled }))}
                  className={`w-12 h-6 rounded-full transition-colors relative ${state.isRerankingEnabled ? 'bg-blue-600' : 'bg-slate-200'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${state.isRerankingEnabled ? 'left-7' : 'left-1'}`}></div>
                </button>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest text-center">Initial Retrieval (Fast)</h4>
                <div className="space-y-2 opacity-60">
                  {state.retrievedChunks.map((c, i) => (
                    <div key={i} className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-[10px] truncate">{c.text}</div>
                  ))}
                </div>
              </div>
              
              {state.isRerankingEnabled ? (
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest text-center">Reranked Results (Accurate)</h4>
                  <div className="space-y-2">
                    {state.retrievedChunks.map((c, i) => (
                      <div key={i} className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-[10px] truncate shadow-sm font-bold text-blue-700">
                        {c.text}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center border-2 border-dashed border-slate-100 rounded-2xl">
                  <p className="text-sm text-slate-300 font-bold">Reranking Disabled</p>
                </div>
              )}
           </div>

           <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 text-xs text-indigo-700 flex gap-3">
             <Zap size={16} className="shrink-0" />
             <p><strong>Why rerank?</strong> Traditional vector search can sometimes pull chunks that are semantically close but not actually useful. Rerankers are smarter "editors" that fix the order.</p>
           </div>
        </div>
      );

    case PipelineStep.PROMPT:
      return (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
           <h3 className="text-lg font-bold text-slate-800 mb-4">The Augmented Prompt</h3>
           <div className="font-mono text-[11px] leading-relaxed border border-blue-100 rounded-2xl overflow-hidden shadow-inner">
              <div className="bg-blue-600 text-white p-3 font-bold uppercase tracking-widest text-[10px]">System Instruction</div>
              <div className="p-4 bg-blue-50 text-blue-800 border-b border-blue-100">
                You are a helpful AI assistant. Answer the user question based ONLY on the provided context. If not found, say you don't know. Cite sources.
              </div>
              
              <div className="bg-green-600 text-white p-3 font-bold uppercase tracking-widest text-[10px]">Context (The Evidence)</div>
              <div className="p-4 bg-green-50 text-green-800 border-b border-green-100 max-h-48 overflow-y-auto">
                {state.retrievedChunks.map(c => `[ID: ${c.id}] ${c.text}`).join('\n\n')}
              </div>

              <div className="bg-amber-600 text-white p-3 font-bold uppercase tracking-widest text-[10px]">User Query</div>
              <div className="p-4 bg-amber-50 text-amber-800">
                {state.question}
              </div>
           </div>
           <p className="text-xs text-slate-400 text-center">
             This is what is actually sent to the LLM. It now has the "cheat sheet" it needs!
           </p>
        </div>
      );

    case PipelineStep.GENERATE:
      return (
        <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-xl space-y-8 relative overflow-hidden">
           {isLoading && (
             <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-4">
               <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
               <p className="font-bold text-blue-600 animate-pulse">LLM is thinking...</p>
             </div>
           )}

           <div className="flex items-center gap-4 mb-6">
              <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg">
                <Cpu size={28} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">LLM Generation</h3>
                <p className="text-sm text-slate-500">
                  {state.mode === SimulationMode.MODE_A ? "Zero-Shot (Training Data Only)" : "Context-Grounded (RAG)"}
                </p>
              </div>
           </div>

           <div className="space-y-4">
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 min-h-[160px]">
                <p className="text-slate-800 leading-relaxed font-medium">
                  {state.mode === SimulationMode.MODE_A ? state.llmOnlyAnswer : state.ragAnswer}
                </p>
              </div>
              
              {state.mode === SimulationMode.MODE_B && (
                <div className="flex flex-wrap gap-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest self-center mr-2">Citations:</span>
                  {state.retrievedChunks.map(c => (
                    <span key={c.id} className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold">{c.id}</span>
                  ))}
                </div>
              )}
           </div>

           <div className="bg-slate-50 p-4 rounded-xl flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <p className="text-xs text-slate-500">Response generated using <strong>{state.mode === SimulationMode.MODE_A ? "Standard training parameters" : "Retrieved Context Injection"}</strong></p>
           </div>
        </div>
      );

    case PipelineStep.COMPARE:
      return (
        <div className="space-y-8">
           <div className="text-center space-y-2">
             <h2 className="text-2xl font-black text-slate-900">The RAG Verdict</h2>
             <p className="text-slate-500">Comparison of the same question across both workflows.</p>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6 flex flex-col">
                <div className="flex items-center justify-between">
                  <span className="bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">Mode A: LLM Only</span>
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                    <Info size={14} />
                  </div>
                </div>
                <div className="flex-1 space-y-4">
                  <h4 className="text-sm font-bold text-slate-400 italic">"{state.question}"</h4>
                  <p className="text-slate-600 leading-relaxed text-sm">
                    {state.llmOnlyAnswer || "Wait for Mode A generation..."}
                  </p>
                </div>
                <div className="pt-6 border-t border-slate-50">
                   <div className="bg-red-50 p-3 rounded-xl border border-red-100 flex gap-2">
                     <div className="shrink-0 text-red-500">⚠️</div>
                     <p className="text-[11px] text-red-700">Might hallucinate or admit ignorance for private data.</p>
                   </div>
                </div>
              </div>

              <div className="bg-white p-8 rounded-3xl border-2 border-blue-100 shadow-xl space-y-6 flex flex-col ring-4 ring-blue-50 ring-opacity-50">
                <div className="flex items-center justify-between">
                  <span className="bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">Mode B: LLM + RAG</span>
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 animate-pulse">
                    <CheckCircle2 size={14} />
                  </div>
                </div>
                <div className="flex-1 space-y-4">
                  <h4 className="text-sm font-bold text-slate-400 italic">"{state.question}"</h4>
                  <p className="text-slate-900 leading-relaxed text-sm font-medium">
                    {state.ragAnswer || "Wait for Mode B generation..."}
                  </p>
                </div>
                <div className="pt-6 border-t border-blue-50">
                   <div className="bg-green-50 p-3 rounded-xl border border-green-100 flex gap-2">
                     <div className="shrink-0 text-green-500">✅</div>
                     <p className="text-[11px] text-green-700 font-bold">Grounded in University of Excellence 2025 Policy.</p>
                   </div>
                </div>
              </div>
           </div>

           <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                <LayoutGrid size={20} className="text-blue-600" />
                Key Takeaways for Faculty
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <TakeawayCard 
                  title="Accuracy" 
                  desc="RAG provides 'open-book' access to your private files, reducing guessing." 
                />
                <TakeawayCard 
                  title="Citations" 
                  desc="Answers are traceable back to specific pages and sections of source files." 
                />
                <TakeawayCard 
                  title="Security" 
                  desc="You can use internal documents without training a public model on them." 
                />
                <TakeawayCard 
                  title="Up-to-Date" 
                  desc="No need to re-train the model; just add new chunks to the Vector DB." 
                />
              </div>
           </div>
        </div>
      );

    default:
      return null;
  }
};

const TakeawayCard: React.FC<{ title: string; desc: string }> = ({ title, desc }) => (
  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
    <h4 className="font-bold text-slate-800 text-sm mb-2">{title}</h4>
    <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
  </div>
);

export default App;
