// --- CONFIGURATION ---
// PASTE YOUR API KEY HERE TO SKIP THE MANUAL POPUP
const HARDCODED_KEY = "AIzaSyCdh2GH9knwIMV5l8m6_ATq8szwUaYQxXw";

const MODELS_TO_TRY = [
    'gemini-2.0-flash',
    'gemini-2.5-flash',
    'gemini-1.5-flash',
    'gemini-pro'
];

class AIService {
    constructor() {
        // Use hardcoded key if available, otherwise check local storage
        const rawKey = HARDCODED_KEY || localStorage.getItem('commercio_api_key') || '';
        this.apiKey = rawKey.trim();
    }

    setKey(key) {
        this.apiKey = key;
        localStorage.setItem('commercio_api_key', key);
    }

    hasKey() {
        return !!this.apiKey;
    }

    async callGemini(systemPrompt, userPrompt) {
        if (!this.apiKey) throw new Error("API Key missing");

        const fullPrompt = `${systemPrompt}\n\nUser Question: ${userPrompt}`;
        let lastError = null;

        // Try models in order until one works
        for (const model of MODELS_TO_TRY) {
            try {
                console.log(`Trying model: ${model}...`);
                const baseUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

                const response = await fetch(`${baseUrl}?key=${this.apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{ text: fullPrompt }]
                        }]
                    })
                });

                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.error?.message || `Failed to fetch from ${model}`);
                }

                const data = await response.json();
                return data.candidates[0].content.parts[0].text;

            } catch (error) {
                console.warn(`Model ${model} failed:`, error.message);
                lastError = error;
                // Continue to next model
            }
        }

        // If all failed
        throw new Error(`All AI models failed. Last error: ${lastError?.message}`);
    }

    // --- Module Specific Prompts ---

    async solveGeneral(query, grade) {
        const systemPrompt = `
You are an expert CBSE Class ${grade} Commerce Tutor.
The user has asked a general question: "${query}".
Provide a clear, concise explanation suitable for a ${grade}th grader.
If it involves calculations, show steps.
If it involves theory, use bullet points.
Return HTML.
        `;
        return this.callGemini(systemPrompt, query);
    }

    async solveAccounts(transaction, grade) {
        const systemPrompt = `
You are an expert CBSE Class ${grade} Accountancy Teacher. 
The user will give you a transaction. 
1. **Generate the Journal Entry Table** (HTML).
2. **"Deep Logic" Section**: For EACH Debit and Credit, explain EXACTLY which Golden Rule or Modern Rule was applied.
3. **"Exam Tip"**: Warn about common mistakes students make with this specific transaction.
${grade === '11' ? 'Focus on: Basic Journal entries, Cash Book, Ledger.' : 'Focus on: Partnership, Shares, Debentures, Cash Flow.'}

Format:
- Use standard HTML tags.
- The Table should be styled with Tailwind (w-full, border-collapse, etc.). **Use text-white for strict legibility.**
- The "Deep Logic" should be a bulleted list (text-slate-200).
- Wrap the "Exam Tip" in a yellow alert box (bg-yellow-900/40 border-l-4 border-yellow-500 p-4 rounded text-yellow-100).
Do not use markdown code blocks.
        `;
        return await this.callGemini(systemPrompt, transaction);
    }

    async solveBST(caseStudy, grade) {
        const systemPrompt = `
You are an expert CBSE Class ${grade} Business Studies Teacher.
Analyze the case study provided.
1. **The Answer**: Identify the Principle/Concept.
2. **"Link the Line"**: Quote the exact line from the question and explain *why* it implies that principle.
3. **"Keywords to Watch"**: List 3-4 keywords that are strong indicators for this concept.
4. **"Mnemonic"**: Give a fun memory aid.
${grade === '11' ? 'Focus on: Nature of Business, Forms of Org, Emerging Modes.' : 'Focus on: Principles of Mgmt, Marketing, Consumer Protection.'}

Format:
- Use <h3> for headings (text-amber-300 font-bold text-lg mb-2).
- Use distinct colors for sections (text-slate-200).
- Return raw HTML.
        `;
        return await this.callGemini(systemPrompt, caseStudy);
    }

    async solveEco(question, grade) {
        const systemPrompt = `
You are an expert CBSE Class ${grade} Economics Teacher.
1. **Concept Explanation**: Simple, clear definition (text-slate-200).
2. **"Graph Logic"**: Describe how the graph would look.
3. **"Real World Example"**: Relate it to a real Indian market scenario.
4. **"Marks Gainer"**: Mention one technical keyword that examiners look for.
${grade === '11' ? 'Focus on: Microeconomics (Consumer Eq, Demand) and Statistics.' : 'Focus on: Macroeconomics (National Income, AD-AS) and Indian Eco Dev.'}

Format:
- Return raw HTML (ensure high contrast text).
        `;
        return await this.callGemini(systemPrompt, question);
    }
}
