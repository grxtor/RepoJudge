const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

async function generateReadme(repoName, fileStructure, fileContents, language = 'en') {
    const langInstruction = language === 'tr'
        ? 'IMPORTANT: Write EVERYTHING in Turkish (Türkçe). All text, descriptions, and section headers must be in Turkish.'
        : 'Write the README in English.';

    const prompt = `
    ${langInstruction}
    
    You are an expert developer tool. Your task is to generate a comprehensive, professional, and visually appealing README.md for a GitHub repository.

    Project Name: ${repoName}

    File Structure (partial):
    ${fileStructure.slice(0, 50).join('\n')}

    Key File Contents:
    ${fileContents}

    Instructions:
    1. Analyze the file structure and code to understand the project's purpose, tech stack, and features.
    2. Write a README.md in Markdown format.
    3. Include sections: Title, Description, Key Features (bullet points), Tech Stack, Installation (guess based on files), Usage, and "Who is this for?".
    4. Be enthusiastic but professional.
    5. Use emojis where appropriate.
    
    Output ONLY the Markdown code.
    `;

    try {
        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (error) {
        console.error("Gemini Error:", error);
        throw new Error("Failed to generate content with Gemini.");
    }
}

async function analyzeRepo(repoName, fileStructure, fileContents) {
    const prompt = `
    You are an EXPERIENCED SENIOR SOFTWARE ENGINEER doing a CODE REVIEW.
    
    Your job is to provide FAIR, BALANCED, and USEFUL feedback.
    
    IMPORTANT SCORING GUIDELINES (DEDUCTION MODEL):
    - **START WITH 100 POINTS.**
    - DEDUCT points ONLY for REAL issues that affect production or maintenance.
    - **DO NOT DEDUCT** for stylistic choices, missing comments on obvious code, or missing 100% test coverage if it's a hobby/utility project.
    
    Scoring Calibration:
    - **90-100 (Excellent):** Works well, clear purpose, safe. (e.g., Popular tools like Spicetify, React, etc.)
    - **75-89 (Good):** Solid code, maybe some minor debt or missing docs. Production ready.
    - **50-74 (Average):** Messy but works. Needs refactoring or better security.
    - **0-49 (Poor):** Broken, dangerous, or empty.

    DEDUCTIONS:
    - Critical Security Vuln: -20 points per issue
    - Major Bug/Crash Risk: -15 points per issue
    - Spaghetti Code / No Structure: -10 to -20 points
    - Zero Documentation: -10 points
    
    If the project is a popular, working tool, be GENEROUS. Functionality > Perfection.
    
    ---
    
    Project: ${repoName}
    
    File Structure:
    ${fileStructure.slice(0, 50).join('\n')}
    
    Key File Contents:
    ${fileContents}
    
    ---
    
    Analyze from these perspectives:
    - Does it do what it claims? (most important)
    - Are there real security vulnerabilities?
    - Is the code reasonably organized?
    - Are there actual bugs (not theoretical issues)?
    
    BE FAIR: Don't penalize a working library for not having 100% test coverage or perfect docs.
    
    ---
    
    Return a JSON response with MULTI-LANGUAGE SUPPORT (English and Turkish).
    
    Response Format:
    
    1. "summary": {
        "en": "One clear sentence about what this project does and its quality level in English.",
        "tr": "Bu projenin ne yaptığı ve kalite seviyesi hakkında Türkçe net bir cümle."
    }
    
    2. "issues": Array of REAL problems. Each object must have:
       - "issue": { "en": "Problem description", "tr": "Sorun tanımı" }
       - "category": "architecture" | "security" | "testing" | "documentation" | "performance" | "maintainability" (KEEP IN ENGLISH)
       - "description": { "en": "Why this matters", "tr": "Bunun neden önemli olduğu" }
       - "severity": "low" | "medium" | "high" | "critical" (KEEP IN ENGLISH)
       - "priority_score": 1-100
    
    3. "strengths": {
        "en": ["Strength 1 in English", "Strength 2 in English"],
        "tr": ["Türkçe güçlü yön 1", "Türkçe güçlü yön 2"]
    }
    
    4. "competitors": Similar tools in the ecosystem (Names are global).
    
    5. "overall_health_score": 0-100 using the balanced scoring above.
    
    Return ONLY valid JSON. No markdown blocks.
    `;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const analysis = JSON.parse(cleanText);

        // Sort issues by priority_score descending
        if (analysis.issues && Array.isArray(analysis.issues)) {
            analysis.issues.sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0));
        }

        return analysis;
    } catch (error) {
        console.error("Gemini Analysis Error:", error);
        return { error: "Analysis failed", issues: [], strengths: [], competitors: [] };
    }
}

async function chatWithRepo(repoName, fileStructure, fileContents, chatHistory, userMessage, language = 'en') {
    const langInstruction = language === 'tr'
        ? 'Answer in Turkish (Türkçe).'
        : 'Answer in English.';

    const systemPrompt = `
    ${langInstruction}
    
    You are an expert developer assisting a user with understanding a GitHub repository.
    
    Repo: ${repoName}
    
    File Structure:
    ${fileStructure.slice(0, 50).join('\n')}
    
    Key File Contents:
    ${fileContents}
    
    Instructions:
    - Answer the user's question based strictly on the provided code context.
    - Be concise and technical.
    - If the answer isn't in the code, say you don't know but can guess based on conventions.
    - If the user asks for code, provide it in markdown blocks.
    `;

    try {
        const chat = model.startChat({
            history: [
                {
                    role: "user",
                    parts: [{ text: systemPrompt }],
                },
                {
                    role: "model",
                    parts: [{ text: language === 'tr' ? "Anlaşıldı. Bu depo hakkında ne bilmek istiyorsun?" : "Understood. What would you like to know about this repository?" }],
                },
                ...chatHistory.map(msg => ({
                    role: msg.role === 'user' ? 'user' : 'model',
                    parts: [{ text: msg.content }]
                }))
            ],
            generationConfig: {
                maxOutputTokens: 1000,
            },
        });

        const result = await chat.sendMessage(userMessage);
        return result.response.text();
    } catch (error) {
        console.error("Gemini Chat Error:", error);
        throw new Error("Chat failed.");
    }
}

module.exports = { generateReadme, analyzeRepo, chatWithRepo };
