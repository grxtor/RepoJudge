const GITHUB_API_BASE = 'https://api.github.com';

function buildGithubHeaders(authToken) {
    const headers = {
        'Accept': 'application/vnd.github.v3+json'
    };

    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }

    return headers;
}

async function githubRequest(path, authToken) {
    const res = await fetch(`${GITHUB_API_BASE}${path}`, {
        headers: buildGithubHeaders(authToken)
    });

    let data = null;
    try {
        data = await res.json();
    } catch (err) {
        data = null;
    }

    if (!res.ok) {
        const error = new Error(data?.message || 'GitHub request failed');
        error.status = res.status;
        throw error;
    }

    return data;
}

function decodeBase64(base64) {
    const normalized = base64.replace(/\s/g, '');
    const binary = atob(normalized);
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
    return new TextDecoder('utf-8').decode(bytes);
}

/**
 * Fetches the file structure of a repository.
 */
export async function getRepoStructure(owner, repo, authToken = null) {
    try {
        const repoInfo = await githubRequest(`/repos/${owner}/${repo}`, authToken);
        const defaultBranch = repoInfo.default_branch || 'main';
        const tree = await githubRequest(`/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`, authToken);

        return tree.tree
            .filter(item => item.type === 'blob')
            .map(item => item.path)
            .filter(path => !path.match(/\.(png|jpg|jpeg|gif|svg|ico|lock|pdf)$/i));
    } catch (error) {
        console.error('Error fetching repo structure:', error.message);
        if (error.status === 404) {
            throw new Error('Repository not found. Check the URL or login for private repos.');
        }
        if (error.status === 409) {
            throw new Error('Repository is empty (no commits). Please add some code first.');
        }
        throw new Error('Failed to fetch repository structure.');
    }
}

/**
 * Fetches the content of specific important files.
 */
export async function getFileContents(owner, repo, filePaths, authToken = null) {
    const importantFiles = filePaths.filter(path => {
        return path.match(/(package\.json|requirements\.txt|main\.|index\.|app\.|server\.|Gemfile|cargo\.toml)/i) ||
            path.split('/').length < 3;
    }).slice(0, 5);

    let context = '';

    for (const path of importantFiles) {
        try {
            const data = await githubRequest(`/repos/${owner}/${repo}/contents/${path}`, authToken);
            if (!data?.content) {
                continue;
            }
            const content = decodeBase64(data.content);
            context += `\n\n--- FILE: ${path} ---\n${content.slice(0, 5000)}`;
        } catch (error) {
            console.warn(`Could not fetch ${path}:`, error.message);
        }
    }

    return context;
}

export async function fetchRepoContent(owner, repo, authToken = null) {
    const fileStructure = await getRepoStructure(owner, repo, authToken);
    const fileContents = await getFileContents(owner, repo, fileStructure, authToken);
    return { fileStructure, fileContents };
}
