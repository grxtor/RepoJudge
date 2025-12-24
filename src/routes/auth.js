const express = require('express');
const router = express.Router();
const axios = require('axios');

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const CALLBACK_URL = 'http://localhost:3000/auth/github/callback';

// Redirect to GitHub OAuth
router.get('/github', (req, res) => {
    const scope = 'read:user user:email repo';
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(CALLBACK_URL)}&scope=${encodeURIComponent(scope)}`;
    res.redirect(authUrl);
});

// Handle OAuth callback
router.get('/github/callback', async (req, res) => {
    const { code } = req.query;

    if (!code) {
        return res.redirect('/dashboard.html?error=no_code');
    }

    try {
        // Exchange code for access token
        const tokenResponse = await axios.post('https://github.com/login/oauth/access_token', {
            client_id: GITHUB_CLIENT_ID,
            client_secret: GITHUB_CLIENT_SECRET,
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
    if (req.session.user) {
        res.json({
            authenticated: true,
            user: {
                login: req.session.user.login,
                name: req.session.user.name,
                avatar: req.session.user.avatar
            }
        });
    } else {
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
