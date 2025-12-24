# RepoJudge 🔍

> AI-powered code analysis that reviews your GitHub repositories like a senior engineer.

![RepoJudge](https://img.shields.io/badge/RepoJudge-AI%20Code%20Review-6366f1?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js)
![Gemini AI](https://img.shields.io/badge/Powered%20by-Google%20Gemini-4285F4?style=flat-square&logo=google)

## ✨ Features

- **🐛 Bug Detection** - AI scans your code for bugs, logic errors, and edge cases
- **🛡️ Security Scanning** - Identify vulnerabilities, SQL injection risks, XSS vectors
- **🏗️ Architecture Review** - Feedback on code structure and design patterns
- **📊 Priority Scoring** - Every issue scored by severity, effort, and production risk
- **📝 README Generation** - Auto-generate professional README.md files
- **🔐 Private Repo Support** - Login with GitHub to analyze your private repositories

## 🖼️ Screenshots

| Landing Page | Dashboard |
|--------------|-----------|
| Modern landing with login options | Full analysis dashboard with tabs |

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- GitHub OAuth App (for private repos)
- Google Gemini API Key

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/repojudge.git
cd repojudge

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your API keys

# Start the server
npm start
```

### Environment Variables

```env
PORT=3000
GEMINI_API_KEY=your_gemini_api_key
GITHUB_CLIENT_ID=your_github_oauth_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_client_secret
SESSION_SECRET=your_random_session_secret
```

## 🔧 GitHub OAuth Setup

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in:
   - **Application name:** RepoJudge
   - **Homepage URL:** http://localhost:3000
   - **Authorization callback URL:** http://localhost:3000/auth/github/callback
4. Copy Client ID and Client Secret to your `.env` file

## 📦 Tech Stack

- **Backend:** Node.js, Express.js
- **AI:** Google Gemini 2.0 Flash
- **Frontend:** Vanilla HTML/CSS/JavaScript
- **Auth:** GitHub OAuth 2.0
- **Styling:** Custom CSS with dark theme

## 🎯 How It Works

1. **Paste a GitHub URL** or select from your repos
2. **AI analyzes** the codebase structure and key files
3. **Get a detailed report** with:
   - Health score (0-100)
   - Prioritized issues by severity
   - Security vulnerabilities
   - Auto-generated README
   - Competitor suggestions

## 📄 License

MIT License - feel free to use this project however you want!

## 🙏 Acknowledgments

- [Google Gemini AI](https://ai.google.dev/) for the powerful analysis engine
- [Boxicons](https://boxicons.com/) for beautiful icons
- [Inter Font](https://fonts.google.com/specimen/Inter) for clean typography

---

**Made with ❤️ by Abdullah**
