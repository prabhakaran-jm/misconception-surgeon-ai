import { GoogleGenAI } from "@google/genai";

export interface AnalysePayload {
  subject: string;
  problem: string;
  reasoning: string;
  imageBase64?: string;
  isKidFriendly?: boolean;
}

// Helper to clean base64 string
const cleanBase64 = (base64: string) => {
  return base64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
};

export const analyseMisconception = async (
  payload: AnalysePayload
): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing");
  }

  const ai = new GoogleGenAI({ apiKey });

  // Define the persona and strict output rules
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

--- RESPONSE FORMAT END ---
`;

  const parts: any[] = [{ text: promptText }];

  if (payload.imageBase64) {
    parts.push({
      inlineData: {
        mimeType: "image/jpeg", // Assuming jpeg for simplicity or auto-detection from input
        data: cleanBase64(payload.imageBase64),
      },
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: { parts },
      config: {
        systemInstruction: systemInstruction,
      },
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
  if (!apiKey) {
    throw new Error("API Key is missing");
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `You are an OCR engine.

Task:
- Read the attached image.
- Transcribe ALL visible text exactly as written.
- Preserve line breaks and indentation.
- Do not correct spelling or grammar.
- Do not explain, summarise, or classify the content.
- Do not add any extra text.

Output:
Return ONLY the raw text, nothing else.`;

  const parts = [
    { text: prompt },
    {
      inlineData: {
        mimeType: "image/jpeg",
        data: cleanBase64(imageBase64),
      },
    },
  ];

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", // Using Flash for faster OCR
      contents: { parts },
    });

    const text = response.text;
    if (!text) throw new Error("No text extracted");
    return text.trim();
  } catch (error) {
    console.error("Gemini OCR Error:", error);
    throw error;
  }
};

export const verifySubjectContent = async (
  subject: string,
  transcribedText: string
): Promise<{ subject: string; contains_math_symbols: boolean; notes: string }> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key is missing");

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
You are checking the subject of a student’s work.

You are given:
- selected_subject: "${subject}"
- transcribed_work: "${transcribedText.replace(/"/g, '\\"').substring(0, 1500)}"

Rules:
1. Always trust selected_subject as the primary subject.
2. Only use transcribed_work to refine the description inside that subject.
3. If the work is Computer Science code (Python, Java, etc), set "contains_math_symbols" to FALSE, even if it contains operators like +, -, *, /, =.
4. "contains_math_symbols" should be TRUE only for explicit mathematical notation, equations, or physics/chemistry formulas.
5. Your job is only to confirm that the work fits under the selected_subject.

Output format (JSON only):
{
  "subject": "<exactly the selected_subject>",
  "contains_math_symbols": true/false,
  "notes": "short note if helpful"
}
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", // Using Flash for faster classification
      contents: { parts: [{ text: prompt }] },
      config: { responseMimeType: "application/json" }
    });

    const text = response.text;
    if (!text) return { subject, contains_math_symbols: false, notes: "" };
    return JSON.parse(text);
  } catch (error) {
    console.error("Content Verification Error:", error);
    return { subject, contains_math_symbols: false, notes: "" };
  }
};

export const generateConceptDiagram = async (conceptExplanation: string): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key is missing");

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    Generate a simple, clear, educational diagram to visually explain this concept repair:
    "${conceptExplanation.substring(0, 400)}"
    
    Style: High-quality textbook illustration, flat vector style, white background, easy to understand. 
    Focus on the visual representation of the logic or math or science concept.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: {
        imageConfig: {
            aspectRatio: "16:9",
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
    }
    throw new Error("No image generated");
  } catch (error) {
    console.error("Diagram Gen Error:", error);
    throw error;
  }
};