const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const session = require('express-session');

const { redisClient, connectRedis, getCache, setCache } = require('./src/services/redis');
const RedisStore = require('connect-redis').RedisStore;

const { getRepoStructure, getFileContents } = require('./src/services/github');
const { generateReadme, analyzeRepo, chatWithRepo } = require('./src/services/gemini');
const authRoutes = require('./src/routes/auth');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);

// Connect to Redis
connectRedis().catch(console.error);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Request logger middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Session middleware with Redis
const sessionStore = new RedisStore({ client: redisClient });
app.use((req, res, next) => {
    const headerSecret = req.headers['x-session-secret'];
    const querySecret = req.query?.session_secret;
    const secret = headerSecret || querySecret || 'fallback-secret';
    const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';

    return session({
        store: sessionStore,
        secret,
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: isSecure,
            sameSite: isSecure ? 'none' : 'lax',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        }
    })(req, res, next);
});

app.use(express.static('public'));

// Auth routes
app.use('/auth', authRoutes);

// Helper to get auth token from session
function getGithubToken(req) {
    return req.session?.user?.accessToken || null;
}

function getGeminiKey(req) {
    return req.headers['x-gemini-key'] || null;
}

// API Routes
app.post('/api/generate', async (req, res) => {
    const { repoUrl, language, forceRefresh, model } = req.body;
    const authToken = getGithubToken(req);
    const geminiKey = getGeminiKey(req);

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

        // Cache Check
        const cacheKey = `readme:${owner}:${repo}:${language || 'en'}`;

        if (!forceRefresh) {
            const cachedResult = await getCache(cacheKey);
            if (cachedResult) {
                console.log(`[Cache Hit] Serving README for ${owner}/${repo}`);
                return res.json({ success: true, readme: cachedResult });
            }
        }

        console.log(`Fetching structure for ${owner}/${repo}...`);
        const fileStructure = await getRepoStructure(owner, repo, authToken);

        console.log(`Fetching content for ${owner}/${repo}...`);
        const fileContents = await getFileContents(owner, repo, fileStructure, authToken);

        console.log(`Generating README via Gemini...`);
        const readme = await generateReadme(repo, fileStructure, fileContents, language || 'en', model || 'flash', geminiKey);

        // Set Cache (Expire in 1 hour)
        await setCache(cacheKey, readme, 3600);

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

    const { repoUrl, language, forceRefresh, model } = req.body;
    const authToken = getGithubToken(req);
    const geminiKey = getGeminiKey(req);

    if (!repoUrl) {
        return res.status(400).json({ error: 'GitHub repository URL is required' });
    }

    try {
        const { owner, repo } = parseGitHubUrl(repoUrl);

        // Cache Check
        const cacheKey = `analysis:${owner}:${repo}:${language || 'en'}:${model || 'flash'}`;

        if (!forceRefresh) {
            const cachedAnalysis = await getCache(cacheKey);
            if (cachedAnalysis) {
                console.log(`[Cache Hit] Serving Analysis for ${owner}/${repo}`);
                return res.json({ success: true, analysis: cachedAnalysis, cached: true });
            }
        }

        const { fileStructure, fileContents } = await fetchRepoContent(owner, repo, authToken);

        const analysis = await analyzeRepo(repo, fileStructure, fileContents, language || 'en', model, geminiKey);

        // Set Cache
        await setCache(cacheKey, analysis, 3600);

        res.json({ success: true, analysis, cached: false });
    } catch (error) {
        console.error('Error in /api/analyze:', error.message);
        res.status(500).json({ error: 'Failed to analyze repository' });
    }
});

app.post('/api/chat', async (req, res) => {
    const { repoUrl, message, history, language, model } = req.body;
    const authToken = getGithubToken(req);
    const geminiKey = getGeminiKey(req);

    if (!repoUrl || !message) return res.status(400).json({ error: 'Missing repository URL or message' });

    try {
        const { owner, repo } = parseGitHubUrl(repoUrl);
        const { fileStructure, fileContents } = await fetchRepoContent(owner, repo, authToken);

        const response = await chatWithRepo(`${owner}/${repo}`, fileStructure, fileContents, history || [], message, language || 'en', model, geminiKey);

        res.json({ success: true, response });
    } catch (err) {
        console.error('Chat Error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/user', async (req, res) => {
    const token = getGithubToken(req);
    if (!token) return res.json({ authenticated: false });

    try {
        const response = await axios.get('https://api.github.com/user', {
            headers: { Authorization: `Bearer ${token}` }
        });

        const user = response.data;
        res.json({
            authenticated: true,
            user: {
                login: user.login,
                name: user.name,
                avatar: user.avatar_url,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Error fetching user:', error.message);
        res.status(401).json({ authenticated: false });
    }
});

app.get('/api/repos', async (req, res) => {
    const token = getGithubToken(req);
    if (!token) return res.json({ repos: [] });

    try {
        const response = await axios.get('https://api.github.com/user/repos', {
            headers: { Authorization: `Bearer ${token}` },
            params: {
                sort: 'updated',
                per_page: 20,
                affiliation: 'owner'
            }
        });

        const repos = response.data.map(repo => ({
            name: repo.name,
            full_name: repo.full_name,
            private: repo.private,
            url: repo.html_url,
            description: repo.description,
            language: repo.language,
            updated_at: repo.updated_at
        }));

        res.json({ repos });
    } catch (error) {
        console.error('Error fetching repos:', error.message);
        res.json({ repos: [] });
    }
});

app.get('/api/status', (req, res) => {
    const headerGemini = req.headers['x-gemini-key'];
    const headerClientId = req.headers['x-github-client-id'];
    const headerClientSecret = req.headers['x-github-client-secret'];

    res.json({
        geminiConfigured: Boolean(headerGemini),
        githubOAuthConfigured: Boolean(headerClientId && headerClientSecret)
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

// --- HELPER FUNCTIONS ---

function parseGitHubUrl(repoUrl) {
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
    return { owner, repo };
}

async function fetchRepoContent(owner, repo, authToken) {
    const fileStructure = await getRepoStructure(owner, repo, authToken);
    const fileContents = await getFileContents(owner, repo, fileStructure, authToken);
    return { fileStructure, fileContents };
}
