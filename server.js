const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
require('dotenv').config();

const { getRepoStructure, getFileContents } = require('./src/services/github');
const { generateReadme, analyzeRepo } = require('./src/services/gemini');
const authRoutes = require('./src/routes/auth');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Session middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true in production with HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

app.use(express.static('public'));

// Auth routes
app.use('/auth', authRoutes);

// Helper to get auth token from session
function getAuthToken(req) {
    return req.session?.user?.accessToken || null;
}

// API Routes
app.post('/api/generate', async (req, res) => {
    const { repoUrl, language } = req.body;
    const authToken = getAuthToken(req);

    if (!repoUrl) {
        return res.status(400).json({ error: 'Repository URL is required' });
    }

    try {
        // Parse URL
        // Expected format: https://github.com/owner/repo or owner/repo
        let owner, repo;
        if (repoUrl.includes('github.com')) {
            const parts = repoUrl.split('github.com/')[1].split('/');
            owner = parts[0];
            repo = parts[1]?.replace('.git', '');
        } else {
            const parts = repoUrl.split('/');
            owner = parts[0];
            repo = parts[1];
        }

        if (!owner || !repo) {
            return res.status(400).json({ error: 'Invalid repository URL format' });
        }

        console.log(`Fetching structure for ${owner}/${repo}...`);
        const fileStructure = await getRepoStructure(owner, repo, authToken);

        console.log(`Fetching content for ${owner}/${repo}...`);
        const fileContents = await getFileContents(owner, repo, fileStructure, authToken);

        console.log(`Generating README via Gemini...`);
        const readme = await generateReadme(repo, fileStructure, fileContents, language || 'en');

        res.json({ success: true, readme });

    } catch (error) {
        console.error('SERVER ERROR in /api/generate:', error);
        res.status(500).json({
            error: error.message || 'Failed to generate README',
            details: error.response?.data || error.cause
        });
    }
});

app.post('/api/analyze', async (req, res) => {
    const { repoUrl, language } = req.body;
    const authToken = getAuthToken(req);

    if (!repoUrl) return res.status(400).json({ error: 'Repository URL is required' });

    try {
        let owner, repo;
        if (repoUrl.includes('github.com')) {
            const parts = repoUrl.split('github.com/')[1].split('/');
            owner = parts[0];
            repo = parts[1]?.replace('.git', '');
        } else {
            const parts = repoUrl.split('/');
            owner = parts[0];
            repo = parts[1];
        }

        const fileStructure = await getRepoStructure(owner, repo, authToken);
        const fileContents = await getFileContents(owner, repo, fileStructure, authToken);

        const analysis = await analyzeRepo(repo, fileStructure, fileContents, language || 'en');

        res.json({ success: true, analysis });
    } catch (error) {
        console.error('Error in /api/analyze:', error.message);
        res.status(500).json({ error: 'Failed to analyze repository' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
