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

async function analyzeRepo(repoName, fileStructure, fileContents, language = 'en') {
    const langLine = language === 'tr'
        ? 'TÜM YANITINI TÜRKÇE YAZ. Her şey Türkçe olmalı.'
        : 'Respond in English.';

    const prompt = `
    ${langLine}
    
    You are an EXPERIENCED SENIOR SOFTWARE ENGINEER doing a CODE REVIEW.
    
    Your job is to provide FAIR, BALANCED, and USEFUL feedback.
    
    IMPORTANT SCORING GUIDELINES:
    - A mature, working project with good structure should score 60-80
    - A well-documented library with clear purpose should score 70-85
    - Only truly broken or dangerous code should score below 40
    - Missing tests or docs are NOT critical issues for working libraries
    - Focus on ACTUAL bugs and security issues, not stylistic preferences
    
    If the project:
    - Works as intended → +20 points base
    - Has clear structure → +15 points
    - Has documentation → +10 points
    - Has tests → +10 points
    - Has no critical security issues → +15 points
    - Is actively maintained → +10 points
    
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
    
    Return a JSON response with:
    
    1. "summary": One clear sentence about what this project does and its quality level.
    
    2. "issues": Array of REAL problems (not nitpicks). Each has:
       - "issue": Clear problem description
       - "category": "architecture" | "security" | "testing" | "documentation" | "performance" | "maintainability"
       - "description": Why this matters in practice
       - "severity": "low" | "medium" | "high" | "critical"
       - "impact": "developer" | "users" | "system" | "security"
       - "effort": "easy" | "medium" | "hard"
       - "production_risk": "none" | "potential" | "high"
       - "priority_score": 1-100
    
    3. "strengths": What the project does WELL. Be generous with working code.
    
    4. "competitors": Similar tools in the ecosystem.
    
    5. "overall_health_score": 0-100 using the balanced scoring above.
       - 80-100: Excellent, production-ready
       - 60-79: Good, solid project
       - 40-59: Needs improvement
       - 20-39: Significant issues
       - 0-19: Broken or dangerous
    
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

module.exports = { generateReadme, analyzeRepo };
