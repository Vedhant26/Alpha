// ============================================
// ALPHA — GitHub Issues Scraper
// ============================================
const db = require('../db/database');
// node-fetch is built-in for Node 18+, but if older we'd use the package

function parseRepoUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== 'github.com') return null;
    
    const parts = parsed.pathname.split('/').filter(Boolean);
    if (parts.length >= 2) {
      return { owner: parts[0], repo: parts[1] };
    }
  } catch (e) {
    // Also try simple "owner/repo" string
    const parts = url.split('/');
    if (parts.length === 2) {
      return { owner: parts[0], repo: parts[1] };
    }
  }
  return null;
}

async function fetchIssuesPage(owner, repo, page = 1) {
  const url = `https://api.github.com/repos/${owner}/${repo}/issues?state=open&per_page=100&page=${page}`;
  
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'Alpha-Kanban-App'
  };
  
  const response = await fetch(url, { headers });
  if (!response.ok) {
    if (response.status === 403) throw new Error('GitHub API rate limit exceeded');
    if (response.status === 404) throw new Error('Repository not found or is private');
    throw new Error(`GitHub API Error: ${response.statusText}`);
  }
  
  const issues = await response.json();
  
  // Check for pagination via Link header
  const linkHeader = response.headers.get('Link');
  const hasNextPage = linkHeader && linkHeader.includes('rel="next"');
  
  return { issues, hasNextPage };
}

async function fetchAllOpenIssues(repoUrl) {
  const repoData = parseRepoUrl(repoUrl);
  if (!repoData) throw new Error('Invalid GitHub repository URL');
  
  let allIssues = [];
  let page = 1;
  let hasNext = true;
  
  // Limit to 5 pages (500 issues) to prevent abuse/timeouts
  while (hasNext && page <= 5) {
    const result = await fetchIssuesPage(repoData.owner, repoData.repo, page);
    
    // Filter out pull requests (GitHub API returns PRs as issues)
    const pureIssues = result.issues.filter(issue => !issue.pull_request);
    
    allIssues = allIssues.concat(pureIssues);
    hasNext = result.hasNextPage;
    page++;
  }
  
  return {
    repoString: `${repoData.owner}/${repoData.repo}`,
    issues: allIssues.map(issue => ({
      id: issue.id,
      number: issue.number,
      title: issue.title,
      body: issue.body || '',
      html_url: issue.html_url,
      labels: issue.labels.map(l => l.name),
      assignee_login: issue.assignee ? issue.assignee.login : null,
      milestone: issue.milestone ? issue.milestone.title : ''
    }))
  };
}

async function importIssuesToBoard(boardId, repoUrl, targetColumnId) {
  const board = db.getBoardFull(boardId);
  if (!board) throw new Error('Board not found');
  
  const data = await fetchAllOpenIssues(repoUrl);
  
  let importedCount = 0;
  let skippedCount = 0;
  
  // For AI complexity inference
  const { infer } = require('../ai/complexity');
  
  for (const issue of data.issues) {
    // Dedup check
    const existing = db.cardQueries.getByGithubIssue.get(issue.id, data.repoString);
    if (existing) {
      skippedCount++;
      continue;
    }
    
    // Map assignee
    let assigneeId = null;
    if (issue.assignee_login) {
      const member = db.memberQueries.getByGithubUsername.get(boardId, issue.assignee_login);
      if (member) assigneeId = member.id;
    }
    
    // AI Complexity Inference
    const complexity = infer(issue.title, issue.body, issue.labels);
    
    // Create card
    const cardId = db.generateId();
    const maxPos = db.cardQueries.getMaxPosition.get(targetColumnId).max_pos;
    
    db.cardQueries.createGithub.run(
      cardId, targetColumnId, boardId, 
      `#${issue.number} ${issue.title}`, 
      issue.body, 
      assigneeId, 
      complexity, 
      maxPos + 1, 
      JSON.stringify(issue.labels), 
      issue.id, 
      data.repoString,
      issue.milestone
    );
    
    // Update reference URL separately since createGithub doesn't have it in the prepared statement
    db.db.prepare('UPDATE cards SET reference_url = ? WHERE id = ?').run(issue.html_url, cardId);
    
    db.logActivity(cardId, boardId, 'card-imported', `Imported from GitHub: ${data.repoString}#${issue.number}`);
    importedCount++;
  }
  
  return { importedCount, skippedCount, repo: data.repoString };
}

module.exports = {
  fetchAllOpenIssues,
  importIssuesToBoard
};
