
import { GoogleGenAI } from "@google/genai";
import { Chunk } from "../types";

export async function generateAnswer(
  question: string, 
  contextChunks: Chunk[] = [], 
  mode: 'LLM_ONLY' | 'RAG'
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  const systemInstruction = mode === 'LLM_ONLY' 
    ? "You are a helpful AI. You do NOT have access to the University of Excellence 2025 policy documents. If you don't know the answer based on your training data, you must guess or admit you don't know, but do NOT use the 2025 policy specifically unless it was in your training (which it isn't, since it's hypothetical)."
    : `You are a helpful AI grounded in the provided context. Use ONLY the following snippets to answer the user's question. If the answer is not in the context, say you don't know. Always cite your source by ID at the end of the sentence where it applies (e.g., [Chunk 1]).
    
    CONTEXT:
    ${contextChunks.map(c => `[Chunk ID: ${c.id}] - ${c.text}`).join('\n\n')}
    `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: question,
      config: {
        systemInstruction,
        temperature: 0.1, // Low temperature for factual grounding
      },
    });

    return response.text || "No response generated.";
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    return "Error: Could not connect to LLM. Please check your API configuration.";
  }
}
