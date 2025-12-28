import { analyzeRepo, chatWithRepo, generateReadme } from './services/gemini.mjs';
import { fetchRepoContent } from './services/github.mjs';

const SESSION_COOKIE = 'repojudge_session';
const SESSION_TTL = 60 * 60 * 24; // 24 hours
const CACHE_TTL = 60 * 60; // 1 hour

function jsonResponse(data, init = {}) {
    const headers = new Headers(init.headers || {});
    headers.set('Content-Type', 'application/json; charset=utf-8');
    return new Response(JSON.stringify(data), { ...init, headers });
}

function parseCookies(cookieHeader) {
    if (!cookieHeader) return {};
    return cookieHeader.split(';').reduce((acc, part) => {
        const [key, ...rest] = part.trim().split('=');
        if (!key) return acc;
        acc[key] = rest.join('=');
        return acc;
    }, {});
}

function base64UrlEncode(bytes) {
    let binary = '';
    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function signSession(sessionId, sessionSecret) {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
        'raw',
        enc.encode(sessionSecret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', key, enc.encode(sessionId));
    return base64UrlEncode(new Uint8Array(signature));
}

function safeEqual(a, b) {
    if (!a || !b || a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i += 1) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
}

function getOrigin(request) {
    return request.headers.get('Origin') || '';
}

function withCors(response, request) {
    const origin = getOrigin(request);
    const headers = new Headers(response.headers);
    headers.set('Access-Control-Allow-Credentials', 'true');
    if (origin) {
        headers.set('Access-Control-Allow-Origin', origin);
        headers.set('Vary', 'Origin');
    } else {
        headers.set('Access-Control-Allow-Origin', '*');
    }
    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
    });
}

function handleOptions(request) {
    const origin = getOrigin(request);
    const headers = new Headers();
    headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type, X-Gemini-Key, X-Github-Client-Id, X-Github-Client-Secret, X-Session-Secret, X-Frontend-Url');
    headers.set('Access-Control-Allow-Credentials', 'true');
    headers.set('Access-Control-Max-Age', '86400');
    if (origin) {
        headers.set('Access-Control-Allow-Origin', origin);
        headers.set('Vary', 'Origin');
    } else {
        headers.set('Access-Control-Allow-Origin', '*');
    }
    return new Response(null, { status: 204, headers });
}

async function readJson(request) {
    try {
        return await request.json();
    } catch (err) {
        return {};
    }
}

function parseGitHubUrl(repoUrl) {
    let owner;
    let repo;
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

function getSessionSecret(request) {
    const url = new URL(request.url);
    return request.headers.get('x-session-secret') || url.searchParams.get('session_secret') || '';
}

function getFrontendUrl(request) {
    const url = new URL(request.url);
    return request.headers.get('x-frontend-url') || url.searchParams.get('frontend_url') || '';
}

function buildSessionCookie(value, request, clear = false) {
    const url = new URL(request.url);
    const secure = url.protocol === 'https:';
    const sameSite = secure ? 'None' : 'Lax';

    let cookie = `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; SameSite=${sameSite}`;
    if (secure) cookie += '; Secure';
    if (clear) cookie += '; Max-Age=0';
    else cookie += `; Max-Age=${SESSION_TTL}`;
    return cookie;
}

async function getSession(request, env) {
    if (!env.SESSIONS) return { sessionId: null, session: null };

    const cookies = parseCookies(request.headers.get('Cookie'));
    const cookieValue = cookies[SESSION_COOKIE];
    if (!cookieValue) return { sessionId: null, session: null };

    const sessionSecret = getSessionSecret(request);
    let sessionId = cookieValue;

    if (cookieValue.includes('.')) {
        const [id, signature] = cookieValue.split('.');
        if (!sessionSecret) return { sessionId: null, session: null };
        const expected = await signSession(id, sessionSecret);
        if (!safeEqual(signature, expected)) {
            return { sessionId: null, session: null };
        }
        sessionId = id;
    }

    const data = await env.SESSIONS.get(`session:${sessionId}`, { type: 'json' });
    if (!data) return { sessionId: null, session: null };

    return { sessionId, session: data };
}

async function setSession(env, sessionId, sessionData) {
    if (!env.SESSIONS) return;
    await env.SESSIONS.put(`session:${sessionId}`, JSON.stringify(sessionData), {
        expirationTtl: SESSION_TTL
    });
}

async function clearSession(env, sessionId) {
    if (!env.SESSIONS || !sessionId) return;
    await env.SESSIONS.delete(`session:${sessionId}`);
}

async function getCache(env, key) {
    if (!env.CACHE) return null;
    return env.CACHE.get(key, { type: 'json' });
}

async function setCache(env, key, value, ttlSeconds = CACHE_TTL) {
    if (!env.CACHE) return;
    await env.CACHE.put(key, JSON.stringify(value), {
        expirationTtl: ttlSeconds
    });
}

function resolveGithubConfig(request) {
    const url = new URL(request.url);
    const clientId = url.searchParams.get('client_id') || request.headers.get('x-github-client-id');
    const clientSecret = url.searchParams.get('client_secret') || request.headers.get('x-github-client-secret');
    const sessionSecret = getSessionSecret(request);
    const frontendUrl = getFrontendUrl(request);

    const baseCallbackUrl = `${url.origin}/auth/github/callback`;
    const callbackParams = new URLSearchParams();
    if (url.searchParams.get('client_id')) callbackParams.set('client_id', clientId);
    if (url.searchParams.get('client_secret')) callbackParams.set('client_secret', clientSecret);
    if (sessionSecret) callbackParams.set('session_secret', sessionSecret);
    if (frontendUrl) callbackParams.set('frontend_url', frontendUrl);

    const callbackUrl = callbackParams.toString()
        ? `${baseCallbackUrl}?${callbackParams.toString()}`
        : baseCallbackUrl;

    return { clientId, clientSecret, sessionSecret, frontendUrl, callbackUrl };
}

function appendErrorParam(target, error, requestUrl) {
    try {
        const url = new URL(target, requestUrl.origin);
        url.searchParams.set('error', error);
        return url.toString();
    } catch (err) {
        return `${requestUrl.origin}/dashboard.html?error=${encodeURIComponent(error)}`;
    }
}

async function handleAuth(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/auth/github') {
        const scope = 'read:user user:email repo';
        const { clientId, callbackUrl, frontendUrl } = resolveGithubConfig(request);

        if (!clientId) {
            const fallback = frontendUrl || '/dashboard.html';
            return new Response(null, {\n+                status: 302,\n+                headers: {\n+                    Location: appendErrorParam(fallback, 'missing_client', url)\n+                }\n+            });
        }

        const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(callbackUrl)}&scope=${encodeURIComponent(scope)}`;
        return new Response(null, {\n+            status: 302,\n+            headers: {\n+                Location: authUrl\n+            }\n+        });
    }

    if (url.pathname === '/auth/github/callback') {
        const code = url.searchParams.get('code');
        const { clientId, clientSecret, sessionSecret, frontendUrl } = resolveGithubConfig(request);
        const fallback = frontendUrl || '/dashboard.html';

        if (!code) {
            return new Response(null, {\n+                status: 302,\n+                headers: {\n+                    Location: appendErrorParam(fallback, 'no_code', url)\n+                }\n+            });
        }

        if (!clientId || !clientSecret) {
            return new Response(null, {\n+                status: 302,\n+                headers: {\n+                    Location: appendErrorParam(fallback, 'missing_client', url)\n+                }\n+            });
        }

        try {
            const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    client_id: clientId,
                    client_secret: clientSecret,
                    code
                })
            });

            const tokenData = await tokenRes.json();
            const accessToken = tokenData?.access_token;

            if (!accessToken) {
                return new Response(null, {\n+                    status: 302,\n+                    headers: {\n+                        Location: appendErrorParam(fallback, 'no_token', url)\n+                    }\n+                });
            }

            const userRes = await fetch('https://api.github.com/user', {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    Accept: 'application/vnd.github.v3+json'
                }
            });

            const user = await userRes.json();
            const sessionId = crypto.randomUUID();
            const sessionData = {
                user: {
                    id: user.id,
                    login: user.login,
                    name: user.name,
                    avatar: user.avatar_url,
                    email: user.email,
                    accessToken
                }
            };

            await setSession(env, sessionId, sessionData);

            let cookieValue = sessionId;
            if (sessionSecret) {
                const signature = await signSession(sessionId, sessionSecret);
                cookieValue = `${sessionId}.${signature}`;
            }

            const headers = new Headers();
            headers.append('Set-Cookie', buildSessionCookie(cookieValue, request));
            headers.set('Location', fallback);

            return new Response(null, { status: 302, headers });
        } catch (error) {
            console.error('OAuth Error:', error.message);
            return new Response(null, {\n+                status: 302,\n+                headers: {\n+                    Location: appendErrorParam(fallback, 'oauth_failed', url)\n+                }\n+            });
        }
    }

    if (url.pathname === '/auth/logout') {
        const { sessionId } = await getSession(request, env);
        await clearSession(env, sessionId);

        const frontendUrl = getFrontendUrl(request);
        const fallback = frontendUrl || '/';

        const headers = new Headers();
        headers.append('Set-Cookie', buildSessionCookie('', request, true));
        headers.set('Location', fallback);

        return new Response(null, { status: 302, headers });
    }

    return new Response('Not Found', { status: 404 });
}

async function handleApi(request, env) {
    const url = new URL(request.url);
    const { session } = await getSession(request, env);
    const authToken = session?.user?.accessToken || null;
    const geminiKey = request.headers.get('x-gemini-key') || '';

    if (url.pathname === '/api/status') {
        const headerClientId = request.headers.get('x-github-client-id');
        const headerClientSecret = request.headers.get('x-github-client-secret');
        return jsonResponse({
            geminiConfigured: Boolean(geminiKey),
            githubOAuthConfigured: Boolean(headerClientId && headerClientSecret)
        });
    }

    if (url.pathname === '/api/user') {
        if (!session?.user) {
            return jsonResponse({ authenticated: false });
        }

        return jsonResponse({
            authenticated: true,
            user: {
                login: session.user.login,
                name: session.user.name,
                avatar: session.user.avatar,
                email: session.user.email
            }
        });
    }

    if (url.pathname === '/api/repos') {
        if (!authToken) {
            return jsonResponse({ repos: [] });
        }

        try {
            const res = await fetch('https://api.github.com/user/repos?sort=updated&per_page=20&affiliation=owner', {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                    Accept: 'application/vnd.github.v3+json'
                }
            });
            const data = await res.json();
            const repos = Array.isArray(data)
                ? data.map(repo => ({
                    name: repo.name,
                    full_name: repo.full_name,
                    private: repo.private,
                    url: repo.html_url,
                    description: repo.description,
                    language: repo.language,
                    updated_at: repo.updated_at
                }))
                : [];

            return jsonResponse({ repos });
        } catch (error) {
            console.error('Error fetching repos:', error.message);
            return jsonResponse({ repos: [] });
        }
    }

    if (url.pathname === '/api/generate' && request.method === 'POST') {
        const body = await readJson(request);
        const { repoUrl, language, forceRefresh, model } = body;

        if (!repoUrl) {
            return jsonResponse({ error: 'Repository URL is required' }, { status: 400 });
        }
        if (!geminiKey) {
            return jsonResponse({ error: 'Missing Gemini API key.' }, { status: 400 });
        }

        try {
            const { owner, repo } = parseGitHubUrl(repoUrl);
            if (!owner || !repo) {
                return jsonResponse({ error: 'Invalid repository URL format' }, { status: 400 });
            }

            const cacheKey = `readme:${owner}:${repo}:${language || 'en'}`;
            if (!forceRefresh) {
                const cached = await getCache(env, cacheKey);
                if (cached) {
                    return jsonResponse({ success: true, readme: cached });
                }
            }

            const { fileStructure, fileContents } = await fetchRepoContent(owner, repo, authToken);
            const readme = await generateReadme(repo, fileStructure, fileContents, language || 'en', model || 'flash', geminiKey);
            await setCache(env, cacheKey, readme, CACHE_TTL);

            return jsonResponse({ success: true, readme });
        } catch (error) {
            console.error('SERVER ERROR in /api/generate:', error);
            return jsonResponse({
                error: error.message || 'Failed to generate README'
            }, { status: 500 });
        }
    }

    if (url.pathname === '/api/analyze' && request.method === 'POST') {
        const body = await readJson(request);
        const { repoUrl, language, forceRefresh, model } = body;

        if (!repoUrl) {
            return jsonResponse({ error: 'GitHub repository URL is required' }, { status: 400 });
        }
        if (!geminiKey) {
            return jsonResponse({ error: 'Missing Gemini API key.' }, { status: 400 });
        }

        try {
            const { owner, repo } = parseGitHubUrl(repoUrl);
            if (!owner || !repo) {
                return jsonResponse({ error: 'Invalid repository URL format' }, { status: 400 });
            }

            const cacheKey = `analysis:${owner}:${repo}:${language || 'en'}:${model || 'flash'}`;
            if (!forceRefresh) {
                const cached = await getCache(env, cacheKey);
                if (cached) {
                    return jsonResponse({ success: true, analysis: cached, cached: true });
                }
            }

            const { fileStructure, fileContents } = await fetchRepoContent(owner, repo, authToken);
            const analysis = await analyzeRepo(repo, fileStructure, fileContents, language || 'en', model || 'flash', geminiKey);
            await setCache(env, cacheKey, analysis, CACHE_TTL);

            return jsonResponse({ success: true, analysis, cached: false });
        } catch (error) {
            console.error('Error in /api/analyze:', error.message);
            return jsonResponse({ error: 'Failed to analyze repository' }, { status: 500 });
        }
    }

    if (url.pathname === '/api/chat' && request.method === 'POST') {
        const body = await readJson(request);
        const { repoUrl, message, history, language, model } = body;

        if (!repoUrl || !message) {
            return jsonResponse({ error: 'Missing repository URL or message' }, { status: 400 });
        }
        if (!geminiKey) {
            return jsonResponse({ error: 'Missing Gemini API key.' }, { status: 400 });
        }

        try {
            const { owner, repo } = parseGitHubUrl(repoUrl);
            if (!owner || !repo) {
                return jsonResponse({ error: 'Invalid repository URL format' }, { status: 400 });
            }

            const { fileStructure, fileContents } = await fetchRepoContent(owner, repo, authToken);
            const response = await chatWithRepo(`${owner}/${repo}`, fileStructure, fileContents, history || [], message, language || 'en', model || 'flash', geminiKey);

            return jsonResponse({ success: true, response });
        } catch (error) {
            console.error('Chat Error:', error.message);
            return jsonResponse({ success: false, error: error.message }, { status: 500 });
        }
    }

    return new Response('Not Found', { status: 404 });
}

export default {
    async fetch(request, env) {
        if (request.method === 'OPTIONS') {
            return handleOptions(request);
        }

        const url = new URL(request.url);
        let response;

        if (url.pathname.startsWith('/auth/')) {
            response = await handleAuth(request, env);
        } else if (url.pathname.startsWith('/api/')) {
            response = await handleApi(request, env);
        } else {
            response = new Response('Not Found', { status: 404 });
        }

        return withCors(response, request);
    }
};
