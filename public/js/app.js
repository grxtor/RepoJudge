// State
let selectedLang = localStorage.getItem('repojudge_lang') || (navigator.language.startsWith('tr') ? 'tr' : 'en');
let currentAnalysis = null;
let analysisHistory = [];
let currentFilter = 'all';

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
        markdown: 'Markdown'
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
        markdown: 'Markdown'
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
const sidebarStats = document.getElementById('sidebarStats');
const userSection = document.getElementById('userSection');
const reposSection = document.getElementById('reposSection'); // Should exist if we add repos listing later


// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Set initial active state for language buttons
    document.querySelectorAll('.lang-btn').forEach(btn => {
        if (btn.dataset.lang === selectedLang) btn.classList.add('active');
        else btn.classList.remove('active');
    });

    loadHistory();
    checkAuth();
    setupEventListeners();
    updateUI();
    checkAuth();
});

// Check authentication status
async function checkAuth() {
    try {
        const res = await fetch('/auth/user');
        const data = await res.json();

        const loginBtn = document.getElementById('loginBtn');
        const userInfo = document.getElementById('userInfo');
        const userAvatar = document.getElementById('userAvatar');
        const userName = document.getElementById('userName');
        const reposSection = document.getElementById('reposSection');

        if (data.authenticated) {
            loginBtn.classList.add('hidden');
            userInfo.classList.remove('hidden');
            userAvatar.src = data.user.avatar;
            userName.textContent = data.user.name || data.user.login;

            // Show and load user repos
            reposSection.classList.remove('hidden');
            loadUserRepos();
        } else {
            loginBtn.classList.remove('hidden');
            userInfo.classList.add('hidden');
            reposSection.classList.add('hidden');
        }
    } catch (err) {
        console.error('Auth check failed:', err);
    }
}

// Load user's GitHub repositories
async function loadUserRepos() {
    try {
        const res = await fetch('/auth/repos');
        const data = await res.json();
        const reposList = document.getElementById('reposList');

        if (data.repos.length === 0) {
            reposList.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem;">No repos found</p>';
            return;
        }

        reposList.innerHTML = data.repos.map(repo => `
            <div class="repo-item" data-url="https://github.com/${repo.full_name}">
                <i class='bx ${repo.private ? 'bx-lock-alt' : 'bx-git-repo-forked'}'></i>
                <span>${repo.name}</span>
                ${repo.private ? '<span class="private-badge">Private</span>' : ''}
            </div>
        `).join('');

        // Add click handlers
        reposList.querySelectorAll('.repo-item').forEach(item => {
            item.addEventListener('click', () => {
                repoUrlInput.value = item.dataset.url;
                startAnalysis();
            });
        });
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
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedLang = btn.dataset.lang;
            localStorage.setItem('repojudge_lang', selectedLang);
            updateUI();
        });
    });

    // Tab switching
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(`${tab.dataset.tab}-panel`).classList.add('active');
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

    setupChat();
    setupBadge();
}

// Chat Logic
function setupChat() {
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendChatBtn');
    const messages = document.getElementById('chatMessages');
    let history = [];

    async function send() {
        const text = chatInput.value.trim();
        if (!text) return;

        // Add user message
        addMessage(text, 'user');
        chatInput.value = '';

        // Show loading state
        const loadingId = addMessage('...', 'model');

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    repoUrl: currentAnalysis.repoUrl,
                    message: text,
                    history: history,
                    language: selectedLang
                })
            });
            const data = await res.json();

            // Remove loading, add response
            document.getElementById(loadingId).remove();

            if (data.success) {
                addMessage(data.response, 'model');
                history.push({ role: 'user', content: text });
                history.push({ role: 'model', content: data.response });
            } else {
                addMessage('Error: ' + data.error, 'system');
            }
        } catch (e) {
            document.getElementById(loadingId)?.remove();
            addMessage('Failed to send message.', 'system');
        }
    }

    sendBtn?.addEventListener('click', send);
    chatInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') send();
    });

    function addMessage(text, role) {
        const id = 'msg-' + Date.now();
        const div = document.createElement('div');
        div.className = `message ${role}`;
        div.id = id;

        // Render markdown for model messages
        const content = role === 'model' ? (typeof marked !== 'undefined' ? marked.parse(text) : text) : text;

        div.innerHTML = `<div class="message-content">${content}</div>`;
        messages.appendChild(div);
        messages.scrollTop = messages.scrollHeight;
        return id;
    }
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

function updateUI() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        if (translations[selectedLang][key]) {
            el.textContent = translations[selectedLang][key];
        }
    });
    renderHistory();
}

// Analysis Flow
async function startAnalysis() {
    const url = repoUrlInput.value.trim();
    if (!url) return;

    showLoadingScreen();

    try {
        // Fetch both README and analysis
        const [readmeRes, analysisRes] = await Promise.all([
            fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ repoUrl: url, language: selectedLang })
            }),
            fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ repoUrl: url, language: selectedLang })
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
    sidebarStats.innerHTML = '';
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
    document.getElementById('competitorsList').innerHTML = (analysis.competitors || [])
        .map(c => `<li>${c}</li>`).join('');

    // Errors tab (critical + high)
    const errors = issues.filter(i => ['critical', 'high'].includes(i.severity));
    document.getElementById('errorsList').innerHTML = errors.length
        ? errors.map(renderIssueCard).join('')
        : `<p style="color: var(--text-muted)">${translations[selectedLang].noIssues}</p>`;

    // Security tab
    document.getElementById('securityList').innerHTML = security.length
        ? security.map(renderIssueCard).join('')
        : `<p style="color: var(--text-muted)">${translations[selectedLang].noIssues}</p>`;

    // README - clean any code fences the AI might have added
    const cleanReadme = (readme || '')
        .replace(/^```(?:markdown|md)?\n/i, '')
        .replace(/\n```$/i, '')
        .trim();
    document.getElementById('readmePreview').innerHTML = marked.parse(cleanReadme);
    document.getElementById('readmeSource').textContent = cleanReadme;

    // Sidebar stats
    sidebarStats.innerHTML = `
        <div class="stat-row">
            <span class="stat-label">Health</span>
            <span class="stat-value" style="color: ${scoreColor}">${score}/100</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">Critical</span>
            <span class="stat-value" style="color: var(--danger)">${criticalCount}</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">Security</span>
            <span class="stat-value" style="color: var(--warning)">${securityCount}</span>
        </div>
    `;
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
    localStorage.setItem('analysisHistory', JSON.stringify(analysisHistory));
    renderHistory();
}

function renderHistory() {
    if (analysisHistory.length === 0) {
        historyList.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem; padding: 10px 0;">${translations[selectedLang].noHistory}</p>`;
        return;
    }

    historyList.innerHTML = analysisHistory.map((a, i) => `
        <div class="history-item ${currentAnalysis?.url === a.url ? 'active' : ''}" data-index="${i}" data-url="${a.url}">
            <i class='bx bxl-github'></i>
            <span>${a.repoName}</span>
            <i class='bx bx-dots-vertical-rounded menu-trigger' data-index="${i}"></i>
            <div class="menu-dropdown" data-index="${i}">
                <div class="menu-item" data-action="reanalyze"><i class='bx bx-refresh'></i> Yeniden Analiz</div>
                <div class="menu-item" data-action="github"><i class='bx bx-link-external'></i> GitHub'da Aç</div>
                <div class="menu-item danger" data-action="delete"><i class='bx bx-trash'></i> Sil</div>
            </div>
        </div>
    `).join('');

    // Click on item to view analysis
    historyList.querySelectorAll('.history-item').forEach(item => {
        item.addEventListener('click', (e) => {
            // Don't trigger if clicking on menu
            if (e.target.closest('.menu-trigger') || e.target.closest('.menu-dropdown')) return;

            const index = parseInt(item.dataset.index);
            currentAnalysis = analysisHistory[index];
            renderAnalysis();
            showAnalysisView();
            renderHistory();
        });
    });

    // Menu trigger click
    historyList.querySelectorAll('.menu-trigger').forEach(trigger => {
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = trigger.dataset.index;
            const dropdown = historyList.querySelector(`.menu-dropdown[data-index="${index}"]`);

            // Close all other dropdowns
            historyList.querySelectorAll('.menu-dropdown').forEach(d => d.classList.remove('active'));
            dropdown.classList.toggle('active');
        });
    });

    // Menu item actions
    historyList.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const dropdown = item.closest('.menu-dropdown');
            const index = parseInt(dropdown.dataset.index);
            const action = item.dataset.action;
            const entry = analysisHistory[index];

            dropdown.classList.remove('active');

            if (action === 'delete') {
                analysisHistory.splice(index, 1);
                localStorage.setItem('analysisHistory', JSON.stringify(analysisHistory));
                renderHistory();
            } else if (action === 'reanalyze') {
                repoUrlInput.value = entry.url;
                startAnalysis();
            } else if (action === 'github') {
                window.open(entry.url, '_blank');
            }
        });
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
        historyList.querySelectorAll('.menu-dropdown').forEach(d => d.classList.remove('active'));
    });
}
// Auth & User Management
async function checkAuth() {
    try {
        const res = await fetch('/auth/user');
        const data = await res.json();

        if (data.authenticated) {
            renderUser(data.user);
            if (reposSection) {
                reposSection.classList.remove('hidden');
                loadUserRepos();
            }
        } else {
            renderLoginButton();
        }
    } catch (err) {
        console.error('Auth check failed:', err);
        renderLoginButton();
    }
}

function renderUser(user) {
    if (!userSection) return;

    userSection.innerHTML = `
        <div class="user-info">
            <img src="${user.avatar}" alt="${user.login}" class="user-avatar">
            <div class="user-details" style="flex:1; overflow:hidden;">
                <div class="user-name" title="${user.name || user.login}">${user.name || user.login}</div>
                <div style="font-size: 0.75rem; color: var(--text-secondary);">@${user.login}</div>
            </div>
            <a href="/auth/logout" class="logout-btn" title="Logout">
                <i class='bx bx-log-out'></i>
            </a>
        </div>
    `;
}

function renderLoginButton() {
    if (!userSection) return;

    userSection.innerHTML = `
        <a href="/auth/github" class="github-login-btn">
            <i class='bx bxl-github'></i>
            <span>${translations[selectedLang].loginGithub}</span>
        </a>
    `;
}

// Load user's GitHub repositories
async function loadUserRepos() {
    try {
        const res = await fetch('/auth/repos');
        const data = await res.json();
        const reposList = document.querySelector('.repos-list');

        if (!reposList) return;

        if (data.repos.length === 0) {
            reposList.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem;">No repos found</p>';
            return;
        }

        reposList.innerHTML = data.repos.map(repo => `
            <div class="repo-item" data-url="https://github.com/${repo.full_name}">
                <i class='bx ${repo.private ? 'bx-lock-alt' : 'bx-git-repo-forked'}'></i>
                <span>${repo.name}</span>
                ${repo.private ? '<span class="private-badge">Private</span>' : ''}
            </div>
        `).join('');

        // Add click handlers
        reposList.querySelectorAll('.repo-item').forEach(item => {
            item.addEventListener('click', () => {
                repoUrlInput.value = item.dataset.url;
                startAnalysis();
            });
        });
    } catch (err) {
        console.error('Failed to load repos:', err);
    }
}
