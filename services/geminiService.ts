import { GoogleGenAI } from "@google/genai";

export interface AnalysePayload {
  subject: string;
  problem: string;
  reasoning: string;
  imageBase64?: string;
  audioBase64?: string;
  isKidFriendly?: boolean;
}

const cleanBase64 = (base64: string) => base64.replace(/^data:(image\/(png|jpeg|jpg|webp)|audio\/(mp3|wav|webm|mp4));base64,/, "");

export const analyseMisconception = async (payload: AnalysePayload): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key is missing");

  const ai = new GoogleGenAI({ apiKey });
  const systemInstruction = payload.isKidFriendly
    ? "You are Misconception Surgeon. You are a fun, gentle, and enthusiastic tutor for kids (approx. 10 years old). Use simple words, fun analogies (like pizza, video games, or sports), and avoid complex terminology. Be very encouraging! When explaining the misconception and repair, focus on the 'why' in a way a child would understand."
    : "You are Misconception Surgeon. You are a supportive, concise, and precise STEM educator. Your goal is to identify the root error using cognitive science principles and fix it with clear mental models. Your tone is warm, professional, and encouraging.";

  const promptText = `
SYSTEM:
${systemInstruction}

USER SUBMISSION:
Subject: ${payload.subject}
Problem: ${payload.problem}
Reasoning: ${payload.reasoning}
Image: ${payload.imageBase64 ? "[Image included]" : "None"}
Audio: ${payload.audioBase64 ? "[Audio included]" : "None"}

INSTRUCTIONS:
Analyze the student's submission and produce a diagnostic report.
You MUST output the response in the EXACT Markdown format below. Do not deviate from the headers.

--- RESPONSE FORMAT START ---

# [Root Misconception Headline]
[Provide a short diagnostic headline summarizing the core misconception in fewer than 15 words. Example: "Partial Distribution: You multiplied only the first term, not the entire bracket."]

### 1. What I Observed
[Write 2–4 sentences describing: 1. What the student attempted correctly. 2. Exactly where the reasoning diverged. 3. The visible evidence for the error. Avoid scolding. Use a warm, supportive tone.]

### 2. Detected Misconceptions
[Bullet points only. Use the following format:]
- **[Name of Misconception]** ([Conceptual / Procedural / Arithmetic]): [Short, crisp explanation (1–2 lines max)]

### 3. Why This Misconception Happens
[Explain why the brain makes this error using cognitive science concepts (e.g., attentional blink, surface-feature bias, working memory overload, left-to-right momentum, over-generalization). Use simple metaphors. Keep this section distinct from section 2.]

### 4. Concept Repair
**Rule:** [One bold sentence summarizing the correct rule]
**Mental Model:** [Provide a mental model (e.g., delivery driver, handshake, house, rainbow arrows). Describe how to visualize the process.]

### 5. Worked Correct Example
**Before (Incorrect):**
\`[Show the student's mistaken version in a single line]\`

**After (Correct):**
\`[Show the corrected structure in one line]\`

[Provide a concise 4-step derivation. Use clear comments. Use LaTeX format for math expressions where needed.]

### 6. Check Yourself
[Include 3 questions:]
- ① [One conceptual question]
- ② [One procedural question]
- ③ [One mini-solve equation]

[Provide an Answer Key at the very bottom of this section]

[Final Line: "Great work—every misconception you fix makes you stronger at maths."]

### 7. AI Reasoning Log
**Confidence Score:** [0-100]%
**Cognitive Principles:** [List comma separated, e.g. Chunking, Transfer Learning]
**Strategy:** [e.g. Scaffolding, Socratic Method]
**Analysis Trace:**
- [Step 1: Input Analysis]
- [Step 2: Error Pattern Matching]
- [Step 3: Strategy Selection]

--- RESPONSE FORMAT END ---
`;

  const parts: any[] = [{ text: promptText }];
  if (payload.imageBase64) parts.push({ inlineData: { mimeType: "image/jpeg", data: cleanBase64(payload.imageBase64) } });
  if (payload.audioBase64) parts.push({ inlineData: { mimeType: "audio/webm", data: cleanBase64(payload.audioBase64) } });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: { parts },
      config: { systemInstruction },
    });
    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    return text;
  } catch (error) {
    console.error("Gemini Diagnosis Error:", error);
    throw error;
  }
};

export const extractHandwriting = async (imageBase64: string): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key is missing");
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `You are an OCR engine. Task: Read image. Transcribe ALL visible text exactly. Preserve formatting. No extra text. Output: Raw text only.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts: [{ text: prompt }, { inlineData: { mimeType: "image/jpeg", data: cleanBase64(imageBase64) } }] },
    });
    return response.text?.trim() || "No text extracted";
  } catch (error) { throw error; }
};

export const verifySubjectContent = async (subject: string, transcribedText: string): Promise<any> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key is missing");
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `Check subject: "${subject}". Text: "${transcribedText.substring(0, 1500)}". Rules: 1. Trust subject. 2. CS code sets "contains_math_symbols" FALSE. 3. Output JSON: { "subject": string, "contains_math_symbols": bool, "notes": string }`;
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts: [{ text: prompt }] },
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || "{}");
  } catch { return { subject, contains_math_symbols: false, notes: "" }; }
};

export const generateConceptDiagram = async (conceptExplanation: string): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key is missing");
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `Generate a simple, clear, educational diagram to explain: "${conceptExplanation.substring(0, 400)}". Style: Textbook illustration, flat vector, white background.`;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: { imageConfig: { aspectRatio: "16:9" } }
    });
    
    // Iterate through parts to find the image, as it might not be the first part
    if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
    }
    throw new Error("No image generated");
  } catch (error) { throw error; }
};

export const generateRecommendations = async (subjects: string[], patterns: any[]): Promise<any[]> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key is missing");
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `Student subjects: ${subjects.join(', ')}. Recurring errors: ${patterns.map(p => p.name).join(', ')}. Task: Generate 3 actionable study recommendations. Output JSON: [{ "title": string, "description": string, "action": string }]`;
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts: [{ text: prompt }] },
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || "[]");
  } catch { return []; }
};

export const askFollowUpQuestion = async (context: any, question: string): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key is missing");
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `Context: Problem="${context.problem}", Misconception="${context.misconception}", Repair="${context.repair}". Student Question: "${question}". Task: Answer clearly as a patient tutor. Keep it short.`;
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: { parts: [{ text: prompt }] },
    });
    return response.text || "I couldn't generate an answer.";
  } catch { return "Error connecting to AI tutor."; }
};

export const explainWorkedExampleStep = async (step: string, context: any): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key is missing");
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `Context: Subject="${context.subject}". Step="${step}". Task: Explain WHY this mathematical/logical step was taken in 1 simple sentence.`;
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts: [{ text: prompt }] },
    });
    return response.text || "Explanation unavailable.";
  } catch { return "Error."; }
};

export const evaluateQuizAnswer = async (question: string, answer: string, subject: string): Promise<{isCorrect: boolean, feedback: string}> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key is missing");
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `Subject: ${subject}. Question: "${question}". Student Answer: "${answer}". Task: Evaluate if correct. Output JSON: { "isCorrect": boolean, "feedback": "Short hint or confirmation" }`;
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts: [{ text: prompt }] },
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || `{"isCorrect": false, "feedback": "Could not evaluate."}`);
  } catch { return { isCorrect: false, feedback: "Error checking answer." }; }
};
