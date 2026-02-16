import { GoogleGenAI, Type } from "@google/genai";
import { WorldFact, Constraint, EidolonResponse } from "../types";

const getAiClient = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Please set VITE_GEMINI_API_KEY in .env");
  }
  return new GoogleGenAI({ apiKey });
};

export const analyzeAuthorStyle = async (sampleText: string): Promise<string> => {
  if (!sampleText.trim()) return "Standard Interactive Fiction tone: Descriptive, second-person, neutral.";

  try {
    const ai = getAiClient();
    const model = "gemini-3-flash-preview";

    const prompt = `
      You are an expert literary critic and linguistic analyst specializing in Interactive Fiction (IF).
      Analyze the following text sample from an IF game. 
      Describe the author's style, tone, vocabulary choice, and sentence structure in a concise paragraph.
      This description will be used to instruct an LLM to mimic this style.
      
      Sample Text:
      "${sampleText}"
    `;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });

    return response.text || "Unable to analyze style.";
  } catch (error) {
    console.error("Style analysis failed:", error);
    return "Error analyzing style. Defaulting to neutral IF tone.";
  }
};

export const queryEidolon = async (
  playerInput: string,
  history: string[],
  facts: WorldFact[],
  constraints: Constraint[],
  authorStyle: string
): Promise<EidolonResponse> => {
  try {
    const ai = getAiClient();
    const model = "gemini-3-flash-preview";

    const factList = facts.map(f => `${f.key}: ${f.value}`).join("\n");
    const constraintList = constraints.map(c => `- ${c.description}`).join("\n");
    const chatHistory = history.slice(-5).join("\n");

    const systemInstruction = `
      You are "Eidolon", a fallback logic engine for a text adventure game (Interactive Fiction).
      
      Your goal is to handle player commands that the standard hard-coded parser failed to understand.
      You act as a "Ghost in the Machine" Game Master.
      
      RULES:
      1. STYLE: You MUST write in the following author style: "${authorStyle}".
      2. PERSPECTIVE: Use second-person perspective ("You see...", "You take...").
      3. WORLD STATE: You must respect the existing 'World Facts'. 
      4. INVENTION: If a player asks about something undefined (e.g., looking at a specific object not in the facts), you should INVENT a detail about it unless it contradicts a Constraint.
      5. CONSTRAINTS: You must NEVER violate the 'Constraints'. If a player attempts a forbidden action, narrate a failure consistent with the world.
      6. MECHANICAL ACTIONS: If the player performs a real game action (drop, go, put, take, etc.), return it in mechanicalActions exactly as a valid IF command string.
      7. NARRATIVE FACTS: If you invent descriptive state (smells, stains, emotional tone), return it in narrativeFacts.      

      Current World Facts:
      ${factList}

      Hard Constraints (DO NOT VIOLATE):
      ${constraintList}
      
      Recent History:
      ${chatHistory}
    `;

    const response = await ai.models.generateContent({
      model,
      contents: `Player Command: "${playerInput}"`,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            narrative: {
              type: Type.STRING,
              description: "The response to show the player (in the author's style).",
            },
            reasoning: {
              type: Type.STRING,
              description: "Brief explanation of why you chose this response and any inventions made.",
            },
            mechanicalActions: {
              type: Type.ARRAY,
              description: "Canonical IF commands that must be executed in the real game world.",
              items: { type: Type.STRING }
            },
            narrativeFacts: {
              type: Type.ARRAY,
              description: "Narrative-only metadata facts to persist.",
              items: {
                type: Type.OBJECT,
                properties: {
                  object: { type: Type.STRING },
                  value: { type: Type.STRING }
                }
              }
            },
          },
          required: ["narrative", "reasoning", "mechanicalActions", "narrativeFacts"],
        },
      },
    });

    const jsonText = response.text || "{}";
    const parsed = JSON.parse(jsonText) as EidolonResponse;
    return parsed;

  } catch (error) {
    console.error("Eidolon query failed:", error);
    return {
      narrative: "The world flickers and fails to resolve.",
      reasoning: "API Failure",
      mechanicalActions: [],
      narrativeFacts: []
    };

  }
};