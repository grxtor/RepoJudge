const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

async function generateReadme(repoName, fileStructure, fileContents, language = 'en') {
    const langInstruction = language === 'tr'
        ? 'IMPORTANT: Write EVERYTHING in Turkish (Türkçe). All text, descriptions, and section headers must be in Turkish.'
        : 'Write the README in English.';

    // Note: Backticks in the prompt template are escaped to avoid syntax errors
    const prompt = `
    ${langInstruction}
    
    You are an expert Senior Developer and Technical Writer. Your task is to generate a **"Business Ready" Professional README.md** for a GitHub repository.
    
    Target Audience: Developers, Hiring Managers, and Open Source Contributors.
    Tone: Professional, Clear, Enthusiastic, and Structured.
    
    Project Name: ${repoName}

    File Structure (partial):
    ${fileStructure.slice(0, 50).join('\n')}

    Key File Contents:
    ${fileContents}

    ---
    
    ### STRICT README GENERATION RULES:

    1.  **VISUAL HEADER:**
        - Start with a centered HTML <div> containing:
            - A placeholder image for the banner: \`<img src="path/to/banner.png" alt="${repoName} Banner" width="100%">\` (Instruct user to replace this).
            - The Project Title (H1).
            - A concise, powerful tagline.
            - Shields.io badges for: License, Language (Node/Python/etc), and Status.
    
    2.  **TABLES REPLACING LISTS:**
        - **"Key Features"** must be a Markdown Table with columns: Feature | Description.
        - **"Tech Stack"** must be a Markdown Table with columns: Technology | Purpose.
        - **"API Endpoints"** (if applicable) must be a Table: Method | Endpoint | Description.

    3.  **PRODUCT SHOWCASE (MANDATORY):**
        - Create a section called \`## 📸 Product Showcase\` (or equivalent in Turkish).
        - Include 2-3 visual placeholders for screenshots with descriptions.
        - Format: \`![Screenshot Description](path/to/screenshot.png) - *Optional caption*\`.

    4.  **DEEP ANALYSIS:**
        - Don't just guess. Look at the file structure and key code.
        - Explain *what* the project actually does and *why* it's useful.
    
    5.  **STANDARD SECTIONS:**
        - Overview
        - Key Features (Table)
        - Product Showcase (Images)
        - Tech Stack (Table)
        - 🚀 Getting Started (Prerequisites, Installation, Usage)
        - 🤝 Contributing
        - 📄 License
        - 👨‍💻 Author

    6.  **FORMATTING:**
        - Use emojis for section headers (e.g., 🚀, 🛠️, 📄).
        - Keep descriptions concise.
        - Use code blocks for installation commands.

    Output ONLY the Markdown code. Do not include "Here is your README" or markdown block markers like \`\`\`markdown.
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
    
    IMPORTANT SCORING GUIDELINES (REALISTIC & SECURITY FOCUSED):
    - **START WITH 95 POINTS.**
    - **PRIORITY:** CHECK FOR SECURITY VULNERABILITIES & DEAD CODE.
    - If the code works and is secure, it deserves a good score (80+).
    - Deduct points significantly for:
        1. Security risks (SQLi, XSS, Secrets in code).
        2. Redundant/Dead code (Unused files, commented blocks).
        3. Poor structure (Spaghetti code).

    Scoring Calibration:
    - **95-100 (Elite):** Flawless, highly optimized, secure.
    - **80-94 (Professional):** Solid, secure, production-ready. Minor issues allowed.
    - **60-79 (Average):** Works but has debts (dead code, slight mess, minor security risks).
    - **0-59 (Critical):** Major security flaws or broken code.

    DEDUCTIONS:
    - Security Vulnerabilities: -20 points (CRITICAL)
    - Dead/Unused Code: -5 to -10 points
    - Crash/Logic Errors: -15 points
    - Zero Structure/Chaos: -15 points
    
    Target Logic:
    - Secure + Clean + Working = 90+
    - Secure + Messy + Working = 75-85
    - Insecure = < 60
    
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
    
    6. "recommendations": Array of improvement suggestions. Each object:
       - "title": { "en": "Add unit tests", "tr": "Birim testleri ekle" }
       - "description": { "en": "Why this helps", "tr": "Bunun neden faydalı olduğu" }
       - "priority": "high" | "medium" | "low"
       - "category": "testing" | "documentation" | "security" | "ci_cd" | "performance"
       Include 3-5 actionable recommendations based on what's missing in the project.
    
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
