import type { VercelRequest, VercelResponse } from '@vercel/node';

const GITHUB_USERNAME = 'InfinityZero3000';

const PINNED_REPOS_QUERY = `
  query {
    user(login: "${GITHUB_USERNAME}") {
      pinnedItems(first: 6, types: [REPOSITORY]) {
        nodes {
          ... on Repository {
            name
            description
            url
            stargazerCount
            forkCount
            primaryLanguage {
              name
              color
            }
            homepageUrl
            updatedAt
            isPrivate
          }
        }
      }
    }
  }
`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token =
    process.env.GITHUB_TOKEN ||
    process.env.VITE_GITHUB_TOKEN;
  if (!token) {
    return res.status(500).json({
      error: 'GITHUB_TOKEN not configured',
      hint: 'Set GITHUB_TOKEN (recommended) or VITE_GITHUB_TOKEN in your deployment environment, then redeploy.',
    });
  }

  try {
    const response = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: PINNED_REPOS_QUERY }),
    });

    if (!response.ok) {
      throw new Error(`GitHub API responded with ${response.status}`);
    }

    const data = await response.json();

    if (data.errors) {
      throw new Error(data.errors[0]?.message || 'GraphQL error');
    }

    const repos = data?.data?.user?.pinnedItems?.nodes ?? [];

    // Cache for 10 minutes
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=300');
    return res.status(200).json(repos);
  } catch (err: any) {
    console.error('[pinned-repos]', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch pinned repos' });
  }
}
