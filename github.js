import { Octokit } from "@octokit/rest";

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

export async function getPRDiff(owner, repo, pullNumber) {
  const { data } = await octokit.rest.pulls.listFiles({
    owner,
    repo,
    pull_number: pullNumber,
  });

  return data
    .filter(file => file.patch)
    .map(file => `--- ${file.filename}\n${file.patch}`)
    .join("\n\n");
}

export async function postComment(owner, repo, pullNumber, body) {
  await octokit.rest.issues.createComment({
    owner,
    repo,
    issue_number: pullNumber,
    body,
  });
}
