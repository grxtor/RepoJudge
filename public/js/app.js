// State
let selectedLang = (() => {
    try {
        return localStorage.getItem('repojudge_lang');
    } catch (err) {
        return null;
    }
})() || (navigator.language.startsWith('tr') ? 'tr' : 'en');
let currentAnalysis = null;
let analysisHistory = [];
let analysisFolders = (() => {
    try {
        return JSON.parse(localStorage.getItem('analysisFolders')) || [];
    } catch (err) {
        return [];
    }
})();
let currentFilter = 'all';

const STORAGE_KEYS = {
    geminiKey: 'repojudge_gemini_key',
    githubClientId: 'repojudge_github_client_id',
    githubClientSecret: 'repojudge_github_client_secret',
    sessionSecret: 'repojudge_session_secret'
};

const memoryStore = {};
let backendStatus = {
    geminiConfigured: false,
    githubOAuthConfigured: false,
    loaded: false
};

function storageAvailable() {
    try {
        const testKey = '__repojudge_test__';
        localStorage.setItem(testKey, '1');
        localStorage.removeItem(testKey);
        return true;
    } catch (err) {
        return false;
    }
}

const hasStorage = storageAvailable();

function getStoredValue(key) {
    if (hasStorage) return (localStorage.getItem(key) || '').trim();
    return (memoryStore[key] || '').trim();
}

function setStoredValue(key, value) {
    if (hasStorage) {
        localStorage.setItem(key, value);
    } else {
        memoryStore[key] = value;
    }
}

function removeStoredValue(key) {
    if (hasStorage) {
        localStorage.removeItem(key);
    } else {
        delete memoryStore[key];
    }
}

function getApiBase() {
    return (window.__API_BASE__ || '').trim();
}

function getGeminiKey() {
    return getStoredValue(STORAGE_KEYS.geminiKey);
}

function getGithubClientId() {
    return getStoredValue(STORAGE_KEYS.githubClientId);
}

function getGithubClientSecret() {
    return getStoredValue(STORAGE_KEYS.githubClientSecret);
}

function getSessionSecret() {
    return getStoredValue(STORAGE_KEYS.sessionSecret);
}

function buildApiUrl(path) {
    const base = getApiBase();
    if (!base) return path;
    const normalized = base.replace(/\/+$/, '');
    const suffix = path.startsWith('/') ? path : `/${path}`;
    return `${normalized}${suffix}`;
}

function buildHeaders(extra = {}) {
    const headers = { ...extra };
    const geminiKey = getGeminiKey();
    const githubClientId = getGithubClientId();
    const githubClientSecret = getGithubClientSecret();
    const sessionSecret = getSessionSecret();

    if (geminiKey) headers['x-gemini-key'] = geminiKey;
    if (githubClientId) headers['x-github-client-id'] = githubClientId;
    if (githubClientSecret) headers['x-github-client-secret'] = githubClientSecret;
    if (sessionSecret) headers['x-session-secret'] = sessionSecret;

    return headers;
}

function isGithubPagesHost() {
    return window.location.hostname.endsWith('github.io');
}

async function refreshBackendStatus() {
    try {
        const res = await fetch(buildApiUrl('/api/status'), {
            headers: buildHeaders(),
            credentials: 'include'
        });
        if (!res.ok) throw new Error('Status fetch failed');
        const data = await res.json();
        backendStatus = {
            geminiConfigured: Boolean(data.geminiConfigured),
            githubOAuthConfigured: Boolean(data.githubOAuthConfigured),
            loaded: true
        };
        updateApiSettingsStatus();
    } catch (err) {
        backendStatus = { geminiConfigured: false, githubOAuthConfigured: false, loaded: false };
        updateApiSettingsStatus();
    }
}

function updateApiSettingsStatus() {
    const geminiStatus = document.getElementById('geminiKeyStatus');
    const githubStatus = document.getElementById('githubClientStatus');
    if (!geminiStatus || !githubStatus) return;

    if (backendStatus.loaded && backendStatus.geminiConfigured) {
        geminiStatus.textContent = 'Gemini key optional: backend already configured.';
        geminiStatus.classList.add('status-ok');
    } else {
        geminiStatus.textContent = 'Required on GitHub Pages if backend has no key.';
        geminiStatus.classList.remove('status-ok');
    }

    if (backendStatus.loaded && backendStatus.githubOAuthConfigured) {
        githubStatus.textContent = 'OAuth client optional: backend already configured.';
        githubStatus.classList.add('status-ok');
    } else {
        githubStatus.textContent = 'Required to enable GitHub login from the frontend.';
        githubStatus.classList.remove('status-ok');
    }
}

function ensureBackendConfigured() {
    return true;
}

function ensureGeminiConfigured() {
    if (getGeminiKey()) return true;
    if (backendStatus.geminiConfigured) return true;
    if (isGithubPagesHost()) {
        window.openApiSettingsModal?.();
        alert('Please set the Gemini API key in API Settings.');
        return false;
    }
    return true;
}

// Translations
const translations = {
    en: {
        title: 'Analyze Your Code',
        subtitle: 'Paste a GitHub repository URL to get started',
        analyze: 'Analyze',
        newAnalysis: 'New Analysis',
        history: 'Analysis History',
        overview: 'Overview',
        errors: 'Errors',
        security: 'Security',
        readme: 'README',
        issues: 'Issues',
        strengths: 'Strengths',
        competitors: 'Competitors',
        loading: 'Analyzing repository...',
        noHistory: 'No analysis history yet',
        noIssues: 'No issues found in this category',
        healthScore: 'Health Score',
        totalIssues: 'Total Issues',
        critical: 'Critical',
        securityIssues: 'Security',
        summary: 'Summary',
        all: 'All',
        copy: 'Copy',
        download: 'Download',
        copied: 'Copied!',
        yourRepos: 'Your Repos',
        loginGithub: 'Login with GitHub',
        repoPlaceholder: 'https://github.com/username/repository',
        preview: 'Preview',
        preview: 'Preview',
        source: 'Source',
        getBadge: 'Get Badge',
        badgeTitle: 'Get Your Repository Badge',
        badgeDesc: 'Add this badge to your GitHub README.md to show off your code quality score!',
        markdown: 'Markdown',
        upgradePlan: 'Upgrade Plan',
        settings: 'Settings',
        aiChat: 'AI Chat'
    },
    tr: {
        title: 'Kodunuzu Analiz Edin',
        subtitle: 'Başlamak için bir GitHub repo URL yapıştırın',
        analyze: 'Analiz Et',
        newAnalysis: 'Yeni Analiz',
        history: 'Analiz Geçmişi',
        overview: 'Genel Bakış',
        errors: 'Hatalar',
        security: 'Güvenlik',
        readme: 'README',
        issues: 'Tespitler',
        strengths: 'Güçlü Yönler',
        competitors: 'Rakipler',
        loading: 'Depo analiz ediliyor (30sn sürebilir)...',
        noHistory: 'Henüz analiz geçmişi yok',
        noIssues: 'Bu kategoride sorun bulunamadı',
        healthScore: 'Sağlık Puanı',
        totalIssues: 'Toplam Sorun',
        critical: 'Kritik',
        securityIssues: 'Güvenlik',
        summary: 'Özet',
        all: 'Tümü',
        copy: 'Kopyala',
        download: 'İndir',
        copied: 'Kopyalandı!',
        yourRepos: 'Repolarınız',
        loginGithub: 'GitHub ile Giriş',
        repoPlaceholder: 'https://github.com/kullanici/repo',
        preview: 'Önizleme',
        source: 'Kaynak Kod',
        getBadge: 'Rozet Al',
        badgeTitle: 'Repo Rozetini Al',
        badgeDesc: 'Kod kalitesi puanınızı göstermek için bu rozeti GitHub README.md dosyanıza ekleyin!',
        markdown: 'Markdown',
        upgradePlan: 'Planı Yükselt',
        settings: 'Ayarlar',
        aiChat: 'AI Sohbeti'
    }
};

// DOM Elements
const welcomeScreen = document.getElementById('welcomeScreen');
const loadingScreen = document.getElementById('loadingScreen');
const analysisView = document.getElementById('analysisView');
const repoUrlInput = document.getElementById('repoUrl');
const analyzeBtn = document.getElementById('analyzeBtn');
const newAnalysisBtn = document.getElementById('newAnalysisBtn');
const historyList = document.getElementById('historyList');
const userSection = document.getElementById('userSection');
const reposSection = document.getElementById('reposSection');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendChatBtn = document.getElementById('sendChatBtn');


// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Set initial active state for language buttons
    document.querySelectorAll('.lang-btn').forEach(btn => {
        if (btn.dataset.lang === selectedLang) btn.classList.add('active');
        else btn.classList.remove('active');
    });

    // Initialize Model Selector
    const savedModel = hasStorage ? (localStorage.getItem('repojudge_model') || 'flash') : 'flash';
    const modelSelect = document.getElementById('modelSelect');
    if (modelSelect) {
        modelSelect.value = savedModel;
        modelSelect.addEventListener('change', () => {
            if (hasStorage) localStorage.setItem('repojudge_model', modelSelect.value);
        });
    }



    // Init Logic
    console.log('App Initializing...');
    loadHistory();
    setupEventListeners();
    setupFolderListeners();
    setupApiSettingsModal();
    refreshBackendStatus();
    updateUI();

    if (isGithubPagesHost() && (!getGeminiKey() || !getGithubClientId() || !getGithubClientSecret() || !getSessionSecret())) {
        window.openApiSettingsModal?.();
    }

    // Check auth last
    setTimeout(() => {
        console.log('Checking Auth...');
        checkAuth();
    }, 100);

    // Check for demo mode (?demo=owner/repo)
    const urlParams = new URLSearchParams(window.location.search);
    const demoRepo = urlParams.get('demo');
    if (demoRepo) {
        // Convert short form (facebook/react) to full URL
        const fullUrl = demoRepo.startsWith('http')
            ? demoRepo
            : `https://github.com/${demoRepo}`;
        repoUrlInput.value = fullUrl;
        // Small delay to ensure UI is ready
        setTimeout(() => startAnalysis(), 500);
    }
});

// Check authentication status
async function checkAuth() {
    console.log('[Auth] Fetching user status...');
    const avatarImg = document.getElementById('sidebarUserAvatar');
    const avatarPlaceholder = document.getElementById('sidebarDefaultAvatar');
    const nameEl = document.getElementById('sidebarUserName');
    const planEl = document.getElementById('sidebarUserPlan');
    const settingsEmailEl = document.getElementById('settingsUserEmail');

    const loginItem = document.getElementById('loginMenuItem');
    const profileItem = document.getElementById('profileMenuItem');
    const logoutItem = document.getElementById('logoutMenuItem');
    const upgradeBtn = document.getElementById('upgradePlanBtn');
    const reposSection = document.getElementById('reposSection');
    const isGhPages = isGithubPagesHost();

    try {
        const res = await fetch(buildApiUrl('/api/user'), {
            headers: buildHeaders(),
            credentials: 'include'
        });
        const data = res.ok ? await res.json() : { authenticated: false };
        console.log('[Auth] Response:', data);
        const hasClientConfig = Boolean(getGithubClientId() && getGithubClientSecret());

        if (data.authenticated && data.user) {
            console.log('[Auth] SUCCESS: Logged in as', data.user.login);

            // 1. Update Profile Information
            if (nameEl) nameEl.textContent = data.user.name || data.user.login || 'User';
            if (planEl) planEl.textContent = hasClientConfig ? 'OAuth Ready' : 'Pro Plan';
            if (settingsEmailEl) settingsEmailEl.textContent = data.user.email || `${data.user.login}@github.com`;

            if (avatarImg) {
                avatarImg.src = data.user.avatar || '';
                avatarImg.classList.remove('hidden');
            }
            if (avatarPlaceholder) avatarPlaceholder.classList.add('hidden');

            // 2. Update Menu Items
            if (loginItem) loginItem.classList.add('hidden');
            if (profileItem) profileItem.classList.remove('hidden');
            if (logoutItem) logoutItem.classList.remove('hidden');
            if (upgradeBtn) upgradeBtn.classList.remove('hidden');

            // 3. Show and Load Repos
            if (reposSection) {
                reposSection.classList.remove('hidden');
                loadUserRepos();
            }
        } else {
            console.log('[Auth] GUEST: No active session.');

            if (nameEl) nameEl.textContent = hasClientConfig ? 'OAuth Ready' : 'Guest';
            if (planEl) planEl.textContent = hasClientConfig ? 'Ready to Login' : 'Free Plan';
            if (settingsEmailEl) settingsEmailEl.textContent = hasClientConfig ? 'oauth@repojudge.yongdohyun.org.tr' : 'guest@repojudge.yongdohyun.org.tr';

            if (avatarImg) avatarImg.classList.add('hidden');
            if (avatarPlaceholder) avatarPlaceholder.classList.remove('hidden');

            if (loginItem) loginItem.classList.toggle('hidden', isGhPages && !hasClientConfig);
            if (profileItem) profileItem.classList.add('hidden');
            if (logoutItem) logoutItem.classList.add('hidden');
            if (upgradeBtn) upgradeBtn.classList.add('hidden');

            if (reposSection) reposSection.classList.toggle('hidden', true);
        }
    } catch (err) {
        console.error('[Auth] Critical Error:', err);
        const hasClientConfig = Boolean(getGithubClientId() && getGithubClientSecret());

        if (nameEl) nameEl.textContent = hasClientConfig ? 'OAuth Ready' : 'Guest';
        if (planEl) planEl.textContent = hasClientConfig ? 'Ready to Login' : 'Free Plan';
        if (settingsEmailEl) settingsEmailEl.textContent = hasClientConfig ? 'oauth@repojudge.yongdohyun.org.tr' : 'guest@repojudge.yongdohyun.org.tr';

        if (avatarImg) avatarImg.classList.add('hidden');
        if (avatarPlaceholder) avatarPlaceholder.classList.remove('hidden');

        if (loginItem) loginItem.classList.toggle('hidden', isGhPages && !hasClientConfig);
        if (profileItem) profileItem.classList.add('hidden');
        if (logoutItem) logoutItem.classList.add('hidden');
        if (upgradeBtn) upgradeBtn.classList.add('hidden');

        if (reposSection) reposSection.classList.add('hidden');
    }
}

function renderReposList(repos) {
    const reposList = document.getElementById('reposList');
    if (!reposList) return;

    if (!repos || repos.length === 0) {
        reposList.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem;">No repos found</p>';
        return;
    }

    reposList.innerHTML = repos.map((repo, i) => `
        <div class="repo-item" data-url="https://github.com/${repo.full_name}" data-index="${i}">
            <i class='bx ${repo.private ? 'bx-lock-alt' : 'bx-git-repo-forked'}'></i>
            <span>${repo.name}</span>
            ${repo.private ? '<span class="private-badge">Private</span>' : ''}
            <i class='bx bx-dots-vertical-rounded repo-menu-trigger' data-index="${i}"></i>
            <div class="menu-dropdown repo-menu" data-index="${i}">
                <div class="menu-item" data-action="analyze"><i class='bx bx-analyse'></i> Analiz Et</div>
                <div class="menu-item" data-action="github"><i class='bx bx-link-external'></i> GitHub'da Aç</div>
            </div>
        </div>
    `).join('');

    // Menu trigger click
    reposList.querySelectorAll('.repo-menu-trigger').forEach(trigger => {
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = trigger.dataset.index;
            const dropdown = reposList.querySelector(`.repo-menu[data-index="${index}"]`);

            // Close all other dropdowns
            document.querySelectorAll('.repo-menu.active').forEach(d => {
                if (d !== dropdown) d.classList.remove('active');
            });

            dropdown.classList.toggle('active');
        });
    });

    // Entire repo item click (except menu trigger)
    reposList.querySelectorAll('.repo-item').forEach(item => {
        item.addEventListener('click', () => {
            repoUrlInput.value = item.dataset.url;
            startAnalysis();
        });
    });

    // Menu item actions
    reposList.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const dropdown = item.closest('.repo-menu');
            const repoItem = item.closest('.repo-item');
            const action = item.dataset.action;
            const url = repoItem.dataset.url;

            dropdown.classList.remove('active');

            if (action === 'analyze') {
                repoUrlInput.value = url;
                startAnalysis();
            } else if (action === 'github') {
                window.open(url, '_blank');
            }
        });
    });

    // Close dropdown when clicking outside
    if (!window.repoMenuListenerAdded) {
        document.addEventListener('click', () => {
            document.querySelectorAll('.repo-menu.active').forEach(d => d.classList.remove('active'));
        });
        window.repoMenuListenerAdded = true;
    }
}

// Load user's GitHub repositories
async function loadUserRepos() {
    try {
        const res = await fetch(buildApiUrl('/api/repos'), {
            headers: buildHeaders(),
            credentials: 'include'
        });
        const data = await res.json();
        renderReposList(data.repos);
    } catch (err) {
        console.error('Failed to load repos:', err);
    }
}

function setupEventListeners() {
    // Analyze button
    analyzeBtn.addEventListener('click', startAnalysis);
    repoUrlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') startAnalysis();
    });

    // New analysis button
    newAnalysisBtn.addEventListener('click', showWelcomeScreen);

    // Language toggle
    // Settings Menu Logic
    const userMenuBtn = document.getElementById('userMenuBtn');
    const settingsMenu = document.getElementById('settingsMenu');

    // Toggle Menu
    userMenuBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        settingsMenu.classList.toggle('active');
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
        if (settingsMenu && !settingsMenu.contains(e.target) && !userMenuBtn.contains(e.target)) {
            settingsMenu.classList.remove('active');
        }
    });

    // Language Toggle
    const langToggle = document.getElementById('langToggleItem');
    if (langToggle) {
        // Initialize display
        const display = document.getElementById('currentLangDisplay');
        if (display) display.textContent = selectedLang.toUpperCase();

        langToggle.addEventListener('click', () => {
            selectedLang = selectedLang === 'en' ? 'tr' : 'en';
            if (hasStorage) localStorage.setItem('repojudge_lang', selectedLang);
            updateUI();
        });
    }

    // Login/Logout Actions
    document.getElementById('loginMenuItem')?.addEventListener('click', () => {
        if (!ensureBackendConfigured()) return;
        const clientId = getGithubClientId();
        const clientSecret = getGithubClientSecret();
        const sessionSecret = getSessionSecret();
        if (!clientId || !clientSecret) {
            window.openApiSettingsModal?.();
            alert('Please set GitHub Client ID/Secret in API Settings.');
            return;
        }
        const params = new URLSearchParams();
        params.set('client_id', clientId);
        params.set('client_secret', clientSecret);
        if (sessionSecret) params.set('session_secret', sessionSecret);
        params.set('frontend_url', window.location.href.split('#')[0]);
        window.location.href = `${buildApiUrl('/auth/github')}?${params.toString()}`;
    });
    document.getElementById('logoutMenuItem')?.addEventListener('click', () => {
        const params = new URLSearchParams();
        const sessionSecret = getSessionSecret();
        if (sessionSecret) params.set('session_secret', sessionSecret);
        params.set('frontend_url', window.location.href.split('#')[0]);
        const suffix = params.toString() ? `?${params.toString()}` : '';
        window.location.href = `${buildApiUrl('/auth/logout')}${suffix}`;
    });

    // Tab switching
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            const panelId = `${tab.dataset.tab}-panel`;
            const panel = document.getElementById(panelId);
            if (panel) panel.classList.add('active');

            // If chat tab, load history
            if (tab.dataset.tab === 'chat') {
                if (typeof loadChatHistory === 'function') loadChatHistory();
            }
        });
    });

    // Issue filters
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            if (currentAnalysis) renderIssues();
        });
    });

    // README view toggle
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const preview = document.getElementById('readmePreview');
            const source = document.getElementById('readmeSource');

            if (btn.dataset.view === 'preview') {
                preview.classList.add('active');
                source.classList.remove('active');
            } else {
                preview.classList.remove('active');
                source.classList.add('active');
            }
        });
    });

    // README actions
    // README actions (Updated IDs to match dashboard.html)
    document.getElementById('copyReadmeBtn')?.addEventListener('click', () => {
        if (currentAnalysis?.readme) {
            navigator.clipboard.writeText(currentAnalysis.readme);
            const btn = document.getElementById('copyReadmeBtn');
            const originalHTML = btn.innerHTML;
            btn.innerHTML = `<i class='bx bx-check'></i> ${translations[selectedLang].copied}`;
            setTimeout(() => btn.innerHTML = originalHTML, 2000);
        }
    });

    document.getElementById('downloadReadmeBtn')?.addEventListener('click', () => {
        if (currentAnalysis?.readme) {
            const blob = new Blob([currentAnalysis.readme], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'README.md';
            a.click();
        }
    });

    setupIntegratedChat();
    setupBadge();
    setupScoringInfo();
}

function setupApiSettingsModal() {
    const modal = document.getElementById('apiSettingsModal');
    const openBtn = document.getElementById('apiSettingsItem');
    const closeBtn = modal?.querySelector('.close-modal');
    const geminiKeyInput = document.getElementById('geminiKeyInput');
    const githubClientIdInput = document.getElementById('githubClientIdInput');
    const githubClientSecretInput = document.getElementById('githubClientSecretInput');
    const sessionSecretInput = document.getElementById('sessionSecretInput');
    const storageNote = document.getElementById('storageNote');
    const saveBtn = document.getElementById('saveApiSettings');
    const clearBtn = document.getElementById('clearApiSettings');

    if (!modal || !openBtn) return;

    function openModal() {
        if (geminiKeyInput) geminiKeyInput.value = getGeminiKey();
        if (githubClientIdInput) githubClientIdInput.value = getGithubClientId();
        if (githubClientSecretInput) githubClientSecretInput.value = getGithubClientSecret();
        if (sessionSecretInput) sessionSecretInput.value = getSessionSecret();
        if (storageNote) storageNote.classList.toggle('hidden', hasStorage);
        updateApiSettingsStatus();
        modal.classList.remove('hidden');
    }

    function closeModal() {
        modal.classList.add('hidden');
    }

    function saveSettings() {
        const geminiKey = geminiKeyInput?.value.trim() || '';
        const githubClientId = githubClientIdInput?.value.trim() || '';
        const githubClientSecret = githubClientSecretInput?.value.trim() || '';
        const sessionSecret = sessionSecretInput?.value.trim() || '';

        if (geminiKey) setStoredValue(STORAGE_KEYS.geminiKey, geminiKey);
        else removeStoredValue(STORAGE_KEYS.geminiKey);

        if (githubClientId) setStoredValue(STORAGE_KEYS.githubClientId, githubClientId);
        else removeStoredValue(STORAGE_KEYS.githubClientId);

        if (githubClientSecret) setStoredValue(STORAGE_KEYS.githubClientSecret, githubClientSecret);
        else removeStoredValue(STORAGE_KEYS.githubClientSecret);

        if (sessionSecret) setStoredValue(STORAGE_KEYS.sessionSecret, sessionSecret);
        else removeStoredValue(STORAGE_KEYS.sessionSecret);

        closeModal();
        checkAuth();
        loadUserRepos();
        refreshBackendStatus();
    }

    function clearSettings() {
        removeStoredValue(STORAGE_KEYS.geminiKey);
        removeStoredValue(STORAGE_KEYS.githubClientId);
        removeStoredValue(STORAGE_KEYS.githubClientSecret);
        removeStoredValue(STORAGE_KEYS.sessionSecret);

        if (geminiKeyInput) geminiKeyInput.value = '';
        if (githubClientIdInput) githubClientIdInput.value = '';
        if (githubClientSecretInput) githubClientSecretInput.value = '';
        if (sessionSecretInput) sessionSecretInput.value = '';

        closeModal();
        checkAuth();
        loadUserRepos();
        refreshBackendStatus();
    }

    openBtn.addEventListener('click', openModal);
    saveBtn?.addEventListener('click', saveSettings);
    clearBtn?.addEventListener('click', clearSettings);
    closeBtn?.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    window.openApiSettingsModal = openModal;
}

// Chat Logic
// Integrated AI Chat Logic
function setupIntegratedChat() {
    async function send() {
        const text = chatInput.value.trim();
        if (!text) return;

        if (!currentAnalysis) {
            addChatMessage('Lütfen önce bir repository analiz edin.', 'system');
            return;
        }
        if (!ensureBackendConfigured()) {
            addChatMessage('API ayarlarını kontrol edin.', 'system');
            return;
        }
        await refreshBackendStatus();
        if (!ensureGeminiConfigured()) {
            addChatMessage('API ayarlarını kontrol edin.', 'system');
            return;
        }

        console.log('[Chat] Sending message:', text, 'Repo:', currentAnalysis.url);

        // Add user message
        addChatMessage(text, 'user');
        chatInput.value = '';

        // Initialize chatHistory if it doesn't exist
        if (!currentAnalysis.chatHistory) currentAnalysis.chatHistory = [];
        currentAnalysis.chatHistory.push({ role: 'user', content: text });
        saveHistory();

        // Show loading state
        const loadingId = addChatMessage('...', 'model');

        try {
            const res = await fetch(buildApiUrl('/api/chat'), {
                method: 'POST',
                headers: buildHeaders({ 'Content-Type': 'application/json' }),
                credentials: 'include',
                body: JSON.stringify({
                    repoUrl: currentAnalysis.url,
                    message: text,
                    history: currentAnalysis.chatHistory.slice(0, -1), // Send history before this message
                    language: selectedLang,
                    model: document.getElementById('modelSelect')?.value || 'flash'
                })
            });
            const data = await res.json();
            console.log('[Chat] Response:', data);

            // Remove loading
            const loadingEl = document.getElementById(loadingId);
            if (loadingEl) loadingEl.remove();

            if (data.success) {
                addChatMessage(data.response, 'model');
                currentAnalysis.chatHistory.push({ role: 'model', content: data.response });
                saveHistory();
            } else {
                console.error('[Chat] Server Error:', data.error);
                addChatMessage('Hata: ' + data.error, 'system');
            }
        } catch (e) {
            console.error('[Chat] Fetch Error:', e);
            const loadingEl = document.getElementById(loadingId);
            if (loadingEl) loadingEl.remove();
            addChatMessage('Mesaj gönderilemedi: ' + e.message, 'system');
        }
    }

    sendChatBtn?.addEventListener('click', send);
    chatInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') send();
    });

    window.addChatMessage = function (text, role) {
        const id = 'msg-' + Date.now();
        const div = document.createElement('div');
        div.className = `message ${role}`;
        div.id = id;

        // Render markdown for model messages
        const content = role === 'model' ? (typeof marked !== 'undefined' ? marked.parse(text) : text) : text;

        div.innerHTML = `<div class="message-content">${content}</div>`;
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return id;
    };

    // Load history for current analysis
    window.loadChatHistory = function () {
        chatMessages.innerHTML = '';
        if (currentAnalysis && currentAnalysis.chatHistory) {
            currentAnalysis.chatHistory.forEach(msg => {
                addChatMessage(msg.content, msg.role);
            });
        } else {
            addChatMessage('Bu analiz için sohbet başlatın...', 'system');
        }
    };

    // Expose a way to open chat with a prompt
    window.openAIChat = function (prompt) {
        // Manually switch to chat panel
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));

        const chatPanel = document.getElementById('chat-panel');
        if (chatPanel) {
            chatPanel.classList.add('active');
            if (typeof loadChatHistory === 'function') loadChatHistory();
        }

        if (prompt) {
            chatInput.value = prompt;
            chatInput.focus();
        }
    };
}

// Badge Logic
function setupBadge() {
    const modal = document.getElementById('badgeModal');
    const btn = document.getElementById('getBadgeBtn');
    const close = modal.querySelector('.close-modal');
    const badgeImg = document.getElementById('badgeImage');
    const badgeCode = document.getElementById('badgeCode');
    const copyBtn = modal.querySelector('.copy-code-btn');

    btn?.addEventListener('click', () => {
        const score = currentAnalysis?.analysis?.overall_health_score || 0;
        let color = 'red';
        if (score >= 90) color = 'blue';
        else if (score >= 70) color = 'green';
        else if (score >= 50) color = 'yellow';

        const url = `https://img.shields.io/badge/RepoJudge-${score}-${color}?style=for-the-badge&logo=github`;
        const code = `![RepoJudge Score](${url})`;

        badgeImg.src = url;
        badgeCode.textContent = code;
        modal.classList.remove('hidden');
    });

    close?.addEventListener('click', () => modal.classList.add('hidden'));
    modal?.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.add('hidden');
    });

    copyBtn?.addEventListener('click', () => {
        navigator.clipboard.writeText(badgeCode.textContent);
        const icon = copyBtn.querySelector('i');
        icon.className = 'bx bx-check';
        setTimeout(() => icon.className = 'bx bx-copy', 2000);
    });
}

// Scoring Info Modal
function setupScoringInfo() {
    const btn = document.getElementById('scoringInfoBtn');
    const modal = document.getElementById('scoringModal');
    const closeBtn = modal?.querySelector('.close-modal');

    btn?.addEventListener('click', () => {
        modal.classList.remove('hidden');
    });

    closeBtn?.addEventListener('click', () => {
        modal.classList.add('hidden');
    });

    modal?.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.add('hidden');
    });
}

function updateUI() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        if (translations[selectedLang][key]) {
            el.textContent = translations[selectedLang][key];
        }
    });

    // Update Lang Display
    const display = document.getElementById('currentLangDisplay');
    if (display) display.textContent = selectedLang.toUpperCase();

    renderHistory();
}

// Analysis Flow
async function startAnalysis(options = {}) {
    const url = repoUrlInput.value.trim();
    const { forceRefresh = false } = options;
    const model = document.getElementById('modelSelect')?.value || 'flash';

    if (!url) return;
    if (!ensureBackendConfigured()) return;
    await refreshBackendStatus();
    if (!ensureGeminiConfigured()) return;

    showLoadingScreen();

    try {
        // Fetch both README and analysis
        const [readmeRes, analysisRes] = await Promise.all([
            fetch(buildApiUrl('/api/generate'), {
                method: 'POST',
                headers: buildHeaders({ 'Content-Type': 'application/json' }),
                credentials: 'include',
                body: JSON.stringify({ repoUrl: url, language: selectedLang, forceRefresh, model })
            }),
            fetch(buildApiUrl('/api/analyze'), {
                method: 'POST',
                headers: buildHeaders({ 'Content-Type': 'application/json' }),
                credentials: 'include',
                body: JSON.stringify({ repoUrl: url, language: selectedLang, forceRefresh, model })
            })
        ]);

        const readmeData = await readmeRes.json();
        const analysisData = await analysisRes.json();

        if (!readmeRes.ok || !analysisRes.ok) {
            throw new Error(readmeData.error || analysisData.error || 'Analysis failed');
        }

        // Store result
        currentAnalysis = {
            url,
            repoName: extractRepoName(url),
            readme: readmeData.readme,
            analysis: analysisData.analysis,
            timestamp: Date.now()
        };

        saveToHistory(currentAnalysis);
        renderAnalysis();
        showAnalysisView();

    } catch (err) {
        console.error(err);
        alert('Error: ' + err.message);
        showWelcomeScreen();
    }
}

function extractRepoName(url) {
    const match = url.match(/github\.com\/([^\/]+\/[^\/]+)/);
    return match ? match[1] : url;
}

// Screen transitions
function showWelcomeScreen() {
    welcomeScreen.classList.remove('hidden');
    loadingScreen.classList.add('hidden');
    analysisView.classList.add('hidden');
    repoUrlInput.value = '';
}

function showLoadingScreen() {
    welcomeScreen.classList.add('hidden');
    loadingScreen.classList.remove('hidden');
    analysisView.classList.add('hidden');
    document.getElementById('loadingText').textContent = translations[selectedLang].loading;
}

function showAnalysisView() {
    welcomeScreen.classList.add('hidden');
    loadingScreen.classList.add('hidden');
    analysisView.classList.remove('hidden');
}

// Helper for localized text
function getText(data) {
    if (!data) return '';
    if (typeof data === 'string') return data;
    return data[selectedLang] || data['en'] || '';
}

// Render Analysis
function renderAnalysis() {
    const { repoName, readme, analysis } = currentAnalysis;
    const issues = analysis.issues || [];
    const security = issues.filter(i => i.category === 'security');

    // Header
    document.getElementById('repoName').textContent = repoName;

    // Metrics
    const score = analysis.overall_health_score || 0;
    const criticalCount = issues.filter(i => i.severity === 'critical').length;
    const securityCount = security.length;

    document.getElementById('healthScore').textContent = score;
    document.getElementById('totalIssues').textContent = issues.length;
    document.getElementById('criticalCount').textContent = criticalCount;
    document.getElementById('securityCount').textContent = securityCount;

    // Color the health score
    let scoreColor = 'var(--danger)';
    if (score >= 90) scoreColor = '#3b82f6'; // Elite (Blue)
    else if (score >= 70) scoreColor = 'var(--success)';
    else if (score >= 50) scoreColor = 'var(--warning)';

    document.getElementById('healthScore').style.color = scoreColor;

    // Summary (Localized)
    document.getElementById('summaryText').textContent = getText(analysis.summary);

    // Issues
    renderIssues();

    // Strengths (Localized)
    const strengths = Array.isArray(analysis.strengths)
        ? analysis.strengths
        : (analysis.strengths?.[selectedLang] || analysis.strengths?.['en'] || []);

    document.getElementById('strengthsList').innerHTML = strengths
        .map(s => `<li>${s}</li>`).join('');

    // Competitors
    const competitors = analysis.competitors || [];
    document.getElementById('competitorsList').innerHTML = competitors
        .map(c => {
            const name = typeof c === 'string' ? c : c.name;
            const category = c.category ? `(${c.category})` : '';
            return `<li>${name} <span style="font-size: 0.8em; color: var(--text-muted)">${category}</span></li>`;
        }).join('');

    // Errors tab (critical + high)
    const errors = issues.filter(i => ['critical', 'high'].includes(i.severity));
    document.getElementById('errorsList').innerHTML = errors.length
        ? errors.map(renderIssueCard).join('')
        : `<p style="color: var(--text-muted)">${translations[selectedLang].noIssues}</p>`;

    // Security tab
    document.getElementById('securityList').innerHTML = security.length
        ? security.map(renderIssueCard).join('')
        : `<p style="color: var(--text-muted)">${translations[selectedLang].noIssues}</p>`;

    // Recommendations
    const recommendations = analysis.recommendations || [];
    document.getElementById('recommendationsList').innerHTML = recommendations.length
        ? recommendations.map(renderRecommendationCard).join('')
        : `<p style="color: var(--text-muted)">Harika! Şu an için önerimiz yok.</p>`;
    setupRecommendationPrompts();

    // README - clean any code fences the AI might have added
    const cleanReadme = (readme || '')
        .replace(/^```(?:markdown|md)?\n/i, '')
        .replace(/\n```$/i, '')
        .trim();
    document.getElementById('readmePreview').innerHTML = marked.parse(cleanReadme);
    document.getElementById('readmeSource').textContent = cleanReadme;

    // Load chat history for this analysis
    if (typeof loadChatHistory === 'function') loadChatHistory();
}

function renderIssues() {
    const issues = currentAnalysis.analysis.issues || [];
    let filtered = issues;

    if (currentFilter !== 'all') {
        filtered = issues.filter(i => i.severity === currentFilter);
    }

    document.getElementById('issuesList').innerHTML = filtered.length
        ? filtered.map(renderIssueCard).join('')
        : `<p style="color: var(--text-muted); padding: 20px;">${translations[selectedLang].noIssues}</p>`;

    // Setup fix prompt button handlers
    setupFixPromptButtons();
}

function renderRecommendationCard(rec) {
    const title = getText(rec.title);
    const desc = getText(rec.description);
    const priorityColors = {
        high: 'var(--danger)',
        medium: 'var(--warning)',
        low: 'var(--success)'
    };
    const categoryIcons = {
        testing: 'bx-test-tube',
        documentation: 'bx-file',
        security: 'bx-shield',
        ci_cd: 'bx-git-branch',
        performance: 'bx-rocket'
    };

    return `
        <div class="recommendation-card">
            <div class="rec-icon">
                <i class='bx ${categoryIcons[rec.category] || 'bx-bulb'}'></i>
            </div>
            <div class="rec-content">
                <h4>${title}</h4>
                <p>${desc}</p>
                <div class="rec-meta">
                    <span class="rec-priority" style="color: ${priorityColors[rec.priority]}">${rec.priority}</span>
                    <button class="rec-prompt-btn" data-title="${encodeURIComponent(title)}" data-desc="${encodeURIComponent(desc)}">
                        <i class='bx bx-copy'></i> Prompt Al
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Setup recommendation prompt buttons
function setupRecommendationPrompts() {
    document.querySelectorAll('.rec-prompt-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const title = decodeURIComponent(btn.dataset.title);
            const desc = decodeURIComponent(btn.dataset.desc);
            const repoName = currentAnalysis?.repoName || 'my project';

            const prompt = `Projeme (${repoName}) şu özelliği eklemek istiyorum:

**Öneri:** ${title}
**Açıklama:** ${desc}

Bunu nasıl yapabilirim? Adım adım rehber ve örnek kod ver.`;

            navigator.clipboard.writeText(prompt);
            btn.innerHTML = `<i class='bx bx-check'></i> Kopyalandı!`;
            setTimeout(() => btn.innerHTML = `<i class='bx bx-copy'></i> Prompt Al`, 2000);
        });
    });
}

function renderIssueCard(issue, index) {
    const issueText = getText(issue.issue);
    const descText = getText(issue.description);

    return `
        <div class="issue-item ${issue.severity}">
            <div class="issue-header">
                <span class="issue-title">${issueText}</span>
                <div class="issue-meta">
                    <span class="issue-badge">${issue.category || 'general'}</span>
                    <span class="issue-badge severity ${issue.severity}">${issue.severity}</span>
                </div>
            </div>
            <p class="issue-desc">${descText}</p>
            <div class="issue-actions">
                <button class="fix-prompt-btn" data-issue="${encodeURIComponent(issueText)}" data-desc="${encodeURIComponent(descText)}" data-category="${issue.category}">
                    <i class='bx bx-code-alt'></i> Düzeltme Prompt'u Al
                </button>
            </div>
        </div>
    `;
}

// Generate and copy fix prompt
function setupFixPromptButtons() {
    document.querySelectorAll('.fix-prompt-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const issue = decodeURIComponent(btn.dataset.issue);
            const desc = decodeURIComponent(btn.dataset.desc);
            const category = btn.dataset.category;
            const repoName = currentAnalysis?.repoName || 'my project';

            const prompt = `Projemde (${repoName}) şu sorunu tespit ettim:

**Sorun:** ${issue}
**Kategori:** ${category}
**Açıklama:** ${desc}

Bu sorunu nasıl düzeltebilirim? Lütfen adım adım çözüm ve örnek kod ver.`;

            navigator.clipboard.writeText(prompt);

            // Visual feedback
            const originalHTML = btn.innerHTML;
            btn.innerHTML = `<i class='bx bx-check'></i> Kopyalandı!`;
            btn.classList.add('copied');
            setTimeout(() => {
                btn.innerHTML = originalHTML;
                btn.classList.remove('copied');
            }, 2000);
        });
    });
}

// History Management
function loadHistory() {
    try {
        const saved = localStorage.getItem('analysisHistory');
        analysisHistory = saved ? JSON.parse(saved) : [];
    } catch {
        analysisHistory = [];
    }
    renderHistory();
}

function saveToHistory(analysis) {
    // Remove duplicates
    analysisHistory = analysisHistory.filter(a => a.url !== analysis.url);
    // Add to front
    analysisHistory.unshift(analysis);
    // Limit to 10
    analysisHistory = analysisHistory.slice(0, 10);
    if (hasStorage) localStorage.setItem('analysisHistory', JSON.stringify(analysisHistory));
    renderHistory();
}

function setupFolderListeners() {
    const newFolderBtn = document.getElementById('newFolderBtn');
    newFolderBtn?.addEventListener('click', () => {
        const name = prompt('Folder Name:');
        if (name) {
            const folder = {
                id: 'folder-' + Date.now(),
                name: name,
                items: [],
                collapsed: false
            };
            analysisFolders.push(folder);
            saveFolders();
            renderHistory();
        }
    });

    // Delegated listener for folder toggle
    document.getElementById('historyList').addEventListener('click', (e) => {
        const header = e.target.closest('.folder-header');
        if (header) {
            const folderId = header.parentElement.dataset.id;
            const folder = analysisFolders.find(f => f.id === folderId);
            if (folder) {
                folder.collapsed = !folder.collapsed;
                saveFolders();
                renderHistory();
            }
        }
    });
}

function saveFolders() {
    if (hasStorage) localStorage.setItem('analysisFolders', JSON.stringify(analysisFolders));
}

function renderHistory() {
    if (analysisHistory.length === 0 && analysisFolders.length === 0) {
        historyList.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem; padding: 10px 0;">${translations[selectedLang].noHistory}</p>`;
        return;
    }

    // Separate items that are in folders vs root
    const itemsInFolders = new Set();
    analysisFolders.forEach(f => f.items.forEach(url => itemsInFolders.add(url)));
    const rootItems = analysisHistory.filter(a => !itemsInFolders.has(a.url));

    let html = '';

    // 1. Render Folders
    analysisFolders.forEach(folder => {
        const folderItems = analysisHistory.filter(a => folder.items.includes(a.url));
        html += `
            <div class="history-folder ${folder.collapsed ? 'collapsed' : ''}" data-id="${folder.id}">
                <div class="folder-header">
                    <i class='bx bx-chevron-down arrow'></i>
                    <i class='bx bx-folder'></i>
                    <span>${folder.name}</span>
                </div>
                <div class="folder-content">
                    ${folderItems.length ? folderItems.map(a => renderHistoryItem(a)).join('') : '<div style="padding: 10px; font-size: 0.8rem; color: var(--text-muted)">Klasöre sürükleyin</div>'}
                </div>
            </div>
        `;
    });

    // 2. Render Root Items
    html += rootItems.map(a => renderHistoryItem(a)).join('');

    historyList.innerHTML = html;

    // Re-attach listeners for all items
    setupHistoryItemListeners();
}

function renderHistoryItem(a) {
    const index = analysisHistory.findIndex(item => item.url === a.url);
    const active = currentAnalysis?.url === a.url ? 'active' : '';
    return `
        <div class="history-group">
            <div class="history-item ${active}" data-index="${index}" data-url="${a.url}">
                <i class='bx bxl-github'></i>
                <span>${a.repoName}</span>
                <i class='bx bx-dots-vertical-rounded menu-trigger' data-index="${index}"></i>
                <div class="menu-dropdown" data-index="${index}">
                    <div class="menu-item" data-action="reanalyze"><i class='bx bx-refresh'></i> Yeniden Analiz</div>
                    <div class="menu-item" data-action="github"><i class='bx bx-link-external'></i> GitHub'da Aç</div>
                    <div class="menu-divider"></div>
                    <div class="menu-item" data-action="move-to-folder"><i class='bx bx-folder-plus'></i> Klasöre Taşı...</div>
                    <div class="menu-item danger" data-action="delete"><i class='bx bx-trash'></i> Sil</div>
                </div>
            </div>
            <div class="history-sub-item" data-index="${index}" data-action="chat">
                <i class='bx bx-subdirectory-right'></i>
                <span>${translations[selectedLang].aiChat || 'AI Sohbeti'}</span>
            </div>
        </div>
    `;
}

function setupHistoryItemListeners() {
    historyList.querySelectorAll('.history-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.target.closest('.menu-trigger') || e.target.closest('.menu-dropdown')) return;
            const index = parseInt(item.dataset.index);
            currentAnalysis = analysisHistory[index];
            renderAnalysis();
            showAnalysisView();
            renderHistory();

            // Default to overview tab
            const overviewTab = document.querySelector('.tab[data-tab="overview"]');
            if (overviewTab) overviewTab.click();
        });
    });

    historyList.querySelectorAll('.history-sub-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const index = parseInt(item.dataset.index);
            currentAnalysis = analysisHistory[index];
            renderAnalysis();
            showAnalysisView();
            window.openAIChat();
        });
    });

    historyList.querySelectorAll('.menu-trigger').forEach(trigger => {
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = trigger.dataset.index;
            const dropdown = historyList.querySelector(`.menu-dropdown[data-index="${index}"]`);
            document.querySelectorAll('.menu-dropdown').forEach(d => d.classList.remove('active'));
            dropdown.classList.toggle('active');
        });
    });

    historyList.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = item.dataset.action;
            const index = parseInt(item.closest('.menu-dropdown').dataset.index);
            const entry = analysisHistory[index];

            if (action === 'chat') {
                currentAnalysis = entry;
                renderAnalysis();
                showAnalysisView();
                window.openAIChat();
            } else if (action === 'delete') {
                analysisHistory.splice(index, 1);
                // Also remove from folders
                analysisFolders.forEach(f => f.items = f.items.filter(url => url !== entry.url));
                saveHistory();
                saveFolders();
                renderHistory();
            } else if (action === 'reanalyze') {
                repoUrlInput.value = entry.url;
                startAnalysis({ forceRefresh: true });
            } else if (action === 'github') {
                window.open(entry.url, '_blank');
            } else if (action === 'move-to-folder') {
                const folderId = prompt('Kayıtlı Klasörler:\n' + analysisFolders.map(f => `- ${f.name} (id: ${f.id})`).join('\n') + '\n\nKlasör ID girin:');
                const folder = analysisFolders.find(f => f.id === folderId);
                if (folder) {
                    // Remove from other folders first
                    analysisFolders.forEach(f => f.items = f.items.filter(url => url !== entry.url));
                    folder.items.push(entry.url);
                    saveFolders();
                    renderHistory();
                }
            }
            item.closest('.menu-dropdown').classList.remove('active');
        });
    });
}

function saveHistory() {
    if (hasStorage) localStorage.setItem('analysisHistory', JSON.stringify(analysisHistory));
}
