const express = require('express');
const router = express.Router();
const axios = require('axios');

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const CALLBACK_URL = process.env.GITHUB_CALLBACK_URL || 'http://localhost:3000/auth/github/callback';

function resolveGithubConfig(req) {
    const clientId = req.query.client_id || req.headers['x-github-client-id'] || GITHUB_CLIENT_ID;
    const clientSecret = req.query.client_secret || req.headers['x-github-client-secret'] || GITHUB_CLIENT_SECRET;
    const sessionSecret = req.query.session_secret || req.headers['x-session-secret'];

    const callbackParams = new URLSearchParams();
    if (req.query.client_id) callbackParams.set('client_id', clientId);
    if (req.query.client_secret) callbackParams.set('client_secret', clientSecret);
    if (sessionSecret) callbackParams.set('session_secret', sessionSecret);
    const callbackUrl = callbackParams.toString()
        ? `${CALLBACK_URL}?${callbackParams.toString()}`
        : CALLBACK_URL;

    return { clientId, clientSecret, callbackUrl };
}

// Redirect to GitHub OAuth
router.get('/github', (req, res) => {
    const scope = 'read:user user:email repo';
    const { clientId, callbackUrl } = resolveGithubConfig(req);

    if (!clientId) {
        return res.status(400).send('Missing GitHub Client ID');
    }

    const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(callbackUrl)}&scope=${encodeURIComponent(scope)}`;
    res.redirect(authUrl);
});

// Handle OAuth callback
router.get('/github/callback', async (req, res) => {
    const { code } = req.query;
    const { clientId, clientSecret } = resolveGithubConfig(req);

    if (!code) {
        return res.redirect('/dashboard.html?error=no_code');
    }

    if (!clientId || !clientSecret) {
        return res.redirect('/dashboard.html?error=missing_client');
    }

    try {
        // Exchange code for access token
        const tokenResponse = await axios.post('https://github.com/login/oauth/access_token', {
            client_id: clientId,
            client_secret: clientSecret,
            code
        }, {
            headers: { Accept: 'application/json' }
        });

        const accessToken = tokenResponse.data.access_token;

        if (!accessToken) {
            return res.redirect('/dashboard.html?error=no_token');
        }

        // Get user info
        const userResponse = await axios.get('https://api.github.com/user', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        // Store in session
        req.session.user = {
            id: userResponse.data.id,
            login: userResponse.data.login,
            name: userResponse.data.name,
            avatar: userResponse.data.avatar_url,
            accessToken
        };

        res.redirect('/dashboard.html');
    } catch (error) {
        console.error('OAuth Error:', error.message);
        res.redirect('/dashboard.html?error=oauth_failed');
    }
});

// Get current user
router.get('/user', (req, res) => {
    console.log('[Auth] /user request. Session User:', req.session?.user ? req.session.user.login : 'NONE');
    if (req.session.user) {
        const userData = {
            authenticated: true,
            user: {
                login: req.session.user.login,
                name: req.session.user.name,
                avatar: req.session.user.avatar
            }
        };
        console.log('[Auth] Returning User Data:', userData.user.login);
        res.json(userData);
    } else {
        console.log('[Auth] No session found. Returning authenticated: false');
        res.json({ authenticated: false });
    }
});

// Get access token (for API calls)
router.get('/token', (req, res) => {
    if (req.session.user?.accessToken) {
        res.json({ token: req.session.user.accessToken });
    } else {
        res.json({ token: null });
    }
});

// Logout
router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// Get user's repositories
router.get('/repos', async (req, res) => {
    if (!req.session.user?.accessToken) {
        return res.json({ repos: [] });
    }

    try {
        const response = await axios.get('https://api.github.com/user/repos', {
            headers: { Authorization: `Bearer ${req.session.user.accessToken}` },
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

module.exports = router;
