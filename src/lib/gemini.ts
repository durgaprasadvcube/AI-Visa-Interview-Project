import { GoogleGenAI } from '@google/genai';

export interface EvaluationResult {
    score: number;
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
    summary: string;
}

export async function evaluateAnswer(
    question: string,
    transcript: string
): Promise<EvaluationResult> {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not configured in .env.local");
    }

    const ai = new GoogleGenAI({ apiKey: apiKey });

    const prompt = `You are an expert visa interview evaluator. A student has answered a visa interview question. Evaluate their response strictly and constructively.

QUESTION: ${question}

STUDENT'S ANSWER: ${transcript}

Evaluate the answer and respond ONLY with a valid JSON object in this exact format (no markdown, no extra text):
{
  "score": <integer 1-10>,
  "strengths": ["<strength 1>", "<strength 2>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>"],
  "suggestions": ["<suggestion 1>", "<suggestion 2>"],
  "summary": "<One-sentence overall summary>"
}

Evaluation criteria:
- Clarity (1-10): Is the answer clear and easy to understand?
- Relevance (1-10): Does the answer directly address the visa interview question?
- Grammar (1-10): Is the language grammatically correct and professional?
- Interview Quality (1-10): Would this answer impress a visa officer?

The final score should be the average of these four criteria.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: "You are an expert visa interview evaluator. Always respond with only raw JSON.",
                temperature: 0.2, // Low temperature for consistent JSON
                responseMimeType: "application/json",
            }
        });

        const responseText = response.text || '';

        // Clean up markdown markers if Gemini ignores the json instruction
        const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

        const parsed = JSON.parse(cleanJson);

        return {
            score: Math.min(10, Math.max(1, Number(parsed.score) || 5)),
            strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
            weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
            suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
            summary: parsed.summary || 'Evaluation complete.',
        };
    } catch (error) {
        console.error('Gemini evaluation error:', error);
        return {
            score: 5,
            strengths: ['Answer was captured successfully'],
            weaknesses: ['AI evaluation unavailable — Gemini request failed'],
            suggestions: ['Ensure your GEMINI_API_KEY is valid in .env.local'],
            summary: 'Could not connect to AI evaluator. Score defaulted to 5.',
        };
    }
}
