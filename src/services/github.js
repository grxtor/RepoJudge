const axios = require('axios');

const GITHUB_API_BASE = 'https://api.github.com';

/**
 * Creates an axios instance with optional auth token
 */
function createGithubClient(authToken = null) {
    const headers = {
        'Accept': 'application/vnd.github.v3+json'
    };

    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }

    return axios.create({
        baseURL: GITHUB_API_BASE,
        timeout: 15000,
        headers
    });
}

/**
 * Fetches the file structure of a repository.
 * @param {string} owner 
 * @param {string} repo 
 * @param {string|null} authToken - Optional auth token for private repos
 * @returns {Promise<Array>} List of file paths
 */
async function getRepoStructure(owner, repo, authToken = null) {
    const client = createGithubClient(authToken);

    try {
        // Get the default branch first
        const repoInfo = await client.get(`/repos/${owner}/${repo}`);
        const defaultBranch = repoInfo.data.default_branch;

        // Get the tree recursively
        const treeUrl = `/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`;
        const response = await client.get(treeUrl);

        // Filter for relevant files (ignore lock files, images, etc. to save context)
        return response.data.tree
            .filter(item => item.type === 'blob')
            .map(item => item.path)
            .filter(path => !path.match(/\.(png|jpg|jpeg|gif|svg|ico|lock|pdf)$/i));
    } catch (error) {
        console.error('Error fetching repo structure:', error.message);
        if (error.response?.status === 404) {
            throw new Error('Repository not found. Check the URL or login for private repos.');
        }
        throw new Error('Failed to fetch repository structure.');
    }
}

/**
 * Fetches the content of specific important files.
 * @param {string} owner 
 * @param {string} repo 
 * @param {Array<string>} filePaths 
 * @param {string|null} authToken - Optional auth token for private repos
 * @returns {Promise<string>} Concatenated file contents
 */
async function getFileContents(owner, repo, filePaths, authToken = null) {
    // Limit to fetching a few key files to avoid Token limits and Context window overload
    // Prioritize: package.json, main entry points, etc.
    const importantFiles = filePaths.filter(path => {
        return path.match(/(package\.json|requirements\.txt|main\.|index\.|app\.|server\.|Gemfile|cargo\.toml)/i) ||
            path.split('/').length < 3; // Top level files
    }).slice(0, 5); // Pick top 5 most relevant

    let context = "";

    const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};

    for (const path of importantFiles) {
        try {
            const url = `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${path}`;
            const response = await axios.get(url, {
                responseType: 'text',
                timeout: 10000,
                headers
            });
            context += `\n\n--- FILE: ${path} ---\n${response.data.slice(0, 5000)}`; // Truncate large files
        } catch (error) {
            console.warn(`Could not fetch ${path}:`, error.message);
        }
    }
    return context;
}

module.exports = { getRepoStructure, getFileContents };
