# 🏆 RepoJudge Scoring System

RepoJudge uses an **AI-powered analysis engine** (Google Gemini 2.0) to evaluate codebases. Unlike traditional linters that only count syntax errors, RepoJudge understands the **context, purpose, and quality** of your code.

## 🎯 How Scores Are Calculated

We start with a **perfect score of 100** and deduct points based on identified issues. We do **not** penalize for stylistic choices or missing "nice-to-have" features if the core project works well.

### 📊 Score Ranges

| Score | Rating | Description |
|-------|--------|-------------|
| **90-100** | 💎 **Elite** | Production-ready, secure, and well-architected. Examples: Popular libraries like React, Spicetify, Axios. |
| **75-89** | 🚀 **Solid** | Good quality code. May have minor technical debt or missing documentation, but safe to use. |
| **50-74** | ⚠️ **Average** | Functional but messy. Needs refactoring, better security practices, or tests. |
| **0-49** | 🚨 **Critical** | Broken, dangerous, or fundamentally flawed architecture. Avoid using in production. |

### 🔻 Penalty System (Deductions)

| Issue Type | Deduction | Description |
|------------|-----------|-------------|
| **Critical Security** | **-20 pts** | Hardcoded API keys, SQL injection, XSS vulnerabilities. |
| **Major Bugs** | **-15 pts** | Crashes, broken core features, race conditions. |
| **Architecture** | **-10 pts** | Spaghetti code, massive files (God Class), no separation of concerns. |
| **Documentation** | **-10 pts** | Zero README or instructions (only if the project is complex). |

### 🎁 Bonuses & Mercy Rule

- **Context Matters:** A hackathon project isn't judged as harshly as a banking app.
- **Functionality > Perfection:** If a project solves a complex problem elegantly, we overlook minor issues.
- **"It Works" Bonus:** Popular, widely used tools get the benefit of the doubt.

## ⚖️ Fairness Policy

We believe that **working code is good code**. We do not deduct points for:
- Not having 100% test coverage (unless it's a critical library).
- Indentation styles (Tabs vs Spaces).
- Missing comments on obvious code.
- Using older but stable technologies.
