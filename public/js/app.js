// State
let selectedLang = 'en';
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
        copied: 'Copied!'
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
        issues: 'Sorunlar',
        strengths: 'Güçlü Yönler',
        competitors: 'Rakipler',
        loading: 'Depo analiz ediliyor...',
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
        copied: 'Kopyalandı!'
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

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadHistory();
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
    document.getElementById('copyReadme').addEventListener('click', () => {
        if (currentAnalysis?.readme) {
            navigator.clipboard.writeText(currentAnalysis.readme);
            const btn = document.getElementById('copyReadme');
            const originalHTML = btn.innerHTML;
            btn.innerHTML = `<i class='bx bx-check'></i> ${translations[selectedLang].copied}`;
            setTimeout(() => btn.innerHTML = originalHTML, 2000);
        }
    });

    document.getElementById('downloadReadme').addEventListener('click', () => {
        if (currentAnalysis?.readme) {
            const blob = new Blob([currentAnalysis.readme], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'README.md';
            a.click();
        }
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
    if (score >= 70) scoreColor = 'var(--success)';
    else if (score >= 50) scoreColor = 'var(--warning)';
    document.getElementById('healthScore').style.color = scoreColor;

    // Summary
    document.getElementById('summaryText').textContent = analysis.summary || '';

    // Issues
    renderIssues();

    // Strengths
    document.getElementById('strengthsList').innerHTML = (analysis.strengths || [])
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
}

function renderIssueCard(issue) {
    return `
        <div class="issue-item ${issue.severity}">
            <div class="issue-header">
                <span class="issue-title">${issue.issue}</span>
                <div class="issue-meta">
                    <span class="issue-badge">${issue.category || 'general'}</span>
                    <span class="issue-badge severity ${issue.severity}">${issue.severity}</span>
                </div>
            </div>
            <p class="issue-desc">${issue.description}</p>
        </div>
    `;
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
        <div class="history-item ${currentAnalysis?.url === a.url ? 'active' : ''}" data-index="${i}">
            <i class='bx bxl-github'></i>
            <span>${a.repoName}</span>
        </div>
    `).join('');

    // Add click handlers
    historyList.querySelectorAll('.history-item').forEach(item => {
        item.addEventListener('click', () => {
            const index = parseInt(item.dataset.index);
            currentAnalysis = analysisHistory[index];
            renderAnalysis();
            showAnalysisView();
            renderHistory();
        });
    });
}
