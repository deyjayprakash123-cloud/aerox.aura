// @ts-nocheck
import { parseGitHubTree, parseJsonUpload, generateData } from './mockData';
import type { TemporalData } from './mockData';

// ─────────────────────────────────────────────────────────────────
// URL parser — handles all common GitHub URL formats:
//   https://github.com/owner/repo
//   https://github.com/owner/repo.git
//   https://github.com/owner/repo/tree/branch
//   https://github.com/owner/repo/tree/branch/subdir
//   git@github.com:owner/repo.git
// ─────────────────────────────────────────────────────────────────
function extractOwnerRepo(url: string): { owner: string; repo: string } | null {
  const clean = url.trim();

  // SSH format: git@github.com:owner/repo.git
  const sshMatch = clean.match(/git@github\.com:([^/]+)\/([^/.]+)/);
  if (sshMatch) return { owner: sshMatch[1], repo: sshMatch[2] };

  // HTTPS format — extract first two path segments after github.com
  const httpsMatch = clean.match(/github\.com\/([^/\s]+)\/([^/\s?#.]+)/);
  if (httpsMatch) return { owner: httpsMatch[1], repo: httpsMatch[2].replace(/\.git$/, '') };

  return null;
}

// ─────────────────────────────────────────────────────────────────
// Safe fetch wrapper — surfaces GitHub-specific errors clearly
// ─────────────────────────────────────────────────────────────────
async function ghFetch(url: string): Promise<any> {
  const res = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (res.status === 403 || res.status === 429) {
    const remaining = res.headers.get('x-ratelimit-remaining');
    const reset = res.headers.get('x-ratelimit-reset');
    const resetTime = reset ? new Date(Number(reset) * 1000).toLocaleTimeString() : 'soon';
    throw new Error(
        remaining === '0'
        ? `RATE_LIMIT_RESET:${resetTime}`
        : 'RATE_LIMIT'
    );
  }
  if (res.status === 404) throw new Error('NOT_FOUND');
  if (res.status === 401) throw new Error('UNAUTHORIZED');
  if (!res.ok) throw new Error(`API_ERROR:${res.status}`);

  return res.json();
}

// ─────────────────────────────────────────────────────────────────
// Main GitHub fetch function
// ─────────────────────────────────────────────────────────────────
export async function fetchGitHubRepo(url: string): Promise<TemporalData[]> {
  const parsed = extractOwnerRepo(url);
  if (!parsed) {
    throw new Error(
      'Invalid GitHub URL.\nExpected: https://github.com/owner/repository'
    );
  }

  const { owner, repo } = parsed;

  // 1. Get repo metadata (default branch, stars, description)
  let info: any;
  try {
    info = await ghFetch(`https://api.github.com/repos/${owner}/${repo}`);
  } catch (e: any) {
    if (e.message === 'NOT_FOUND') {
      throw new Error(`Repository "${owner}/${repo}" not found.\nCheck if the repo is public.`);
    }
    throw e;
  }

  const branch = info.default_branch || 'main';
  const repoName = info.full_name || `${owner}/${repo}`;

  // 2. Fetch the full recursive file tree
  let treeData: any;
  try {
    treeData = await ghFetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`
    );
  } catch (e: any) {
    if (e.message === 'NOT_FOUND') {
      // Branch might not be 'main' — try 'master'
      try {
        treeData = await ghFetch(
          `https://api.github.com/repos/${owner}/${repo}/git/trees/master?recursive=1`
        );
      } catch {
        throw new Error(`Could not fetch file tree for "${repoName}".`);
      }
    } else {
      throw e;
    }
  }

  // 3. Handle truncated trees (>100k items GitHub refuses to recurse)
  const tree = treeData.tree || [];
  const wasTruncated = treeData.truncated === true;

  if (tree.length === 0) {
    throw new Error(`"${repoName}" appears to be empty or has no readable files.`);
  }

  // 4. Parse tree → DataNodes
  const nodes = parseGitHubTree(tree, repoName);

  if (nodes.length === 0) {
    throw new Error(
      `"${repoName}" has no code files to visualize.\n` +
      `Only binary/asset files were found (images, fonts, etc.).`
    );
  }

  // 5. Compute system health
  const systemHealth = nodes.reduce((a, n) => a + n.healthScalar, 0) / nodes.length;

  // 6. Return as single temporal snapshot
  const snapshot: TemporalData = {
    timestamp: new Date().toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    }),
    repoName,
    nodes,
    systemHealth: parseFloat(systemHealth.toFixed(3)),
    totalFiles: tree.filter((i: any) => i.type === 'blob').length,
    totalSize: nodes.reduce((a, n) => a + n.value, 0),
  };

  // Surface truncation as a warning (we still render what we got)
  if (wasTruncated) {
    console.warn(
      `[AEROX.AURA] GitHub tree was truncated for "${repoName}". ` +
      `Showing the ${nodes.length} largest code files.`
    );
  }

  return [snapshot];
}

// ─────────────────────────────────────────────────────────────────
// JSON upload handler
// ─────────────────────────────────────────────────────────────────
export async function loadFromJson(file: File): Promise<TemporalData[]> {
  let raw: any;
  try {
    const text = await file.text();
    raw = JSON.parse(text);
  } catch {
    throw new Error(`"${file.name}" is not valid JSON. Please check the file format.`);
  }

  const nodes = parseJsonUpload(raw);
  if (nodes.length === 0) {
    throw new Error(
      `No nodes found in "${file.name}".\n` +
      `Expected an array or an object with a "nodes" / "files" key.`
    );
  }

  const systemHealth = nodes.reduce((a, n) => a + n.healthScalar, 0) / nodes.length;

  return [{
    timestamp: `Uploaded · ${file.name}`,
    repoName: file.name.replace(/\.json$/, ''),
    nodes,
    systemHealth: parseFloat(systemHealth.toFixed(3)),
    totalFiles: nodes.length,
    totalSize: nodes.reduce((a, n) => a + n.value, 0),
  }];
}

// ─────────────────────────────────────────────────────────────────
// Demo mode fallback
// ─────────────────────────────────────────────────────────────────
export function loadMockData(): TemporalData[] {
  return generateData(120, 8);
}

// ─────────────────────────────────────────────────────────────────
// Error message formatter — converts internal codes to user strings
// ─────────────────────────────────────────────────────────────────
export function formatApiError(err: any): string {
  const msg: string = err?.message || String(err);

  if (msg.startsWith('RATE_LIMIT_RESET:')) {
    const resetAt = msg.slice('RATE_LIMIT_RESET:'.length);
    return `GitHub API rate limit hit. Resets at ${resetAt}. Try again then, or use a JSON file.`;
  }
  if (msg === 'RATE_LIMIT') {
    return 'GitHub API rate limit reached (60 req/hour for unauthenticated users). Wait ~60 seconds or upload a JSON file.';
  }
  if (msg === 'NOT_FOUND') {
    return 'Repository not found. Make sure it is public and the URL is correct.';
  }
  if (msg === 'UNAUTHORIZED') {
    return 'GitHub returned 401. The repository may be private.';
  }
  if (msg.startsWith('API_ERROR:')) {
    return `GitHub API error (HTTP ${msg.split(':')[1]}). Try again later.`;
  }
  return msg;
}
