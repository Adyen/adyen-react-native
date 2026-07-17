// Copyright (c) 2026 Adyen N.V.

const fs = require('fs');

const MARKER = '<!-- public-api-diff -->';

function createCommentBody(summary, diff, changed) {
  const parts = [MARKER, summary];

  if (changed && diff.trim()) {
    const displayDiff =
      diff.length > 60000 ? diff.slice(0, 60000) + '\n\n... (truncated)' : diff;
    parts.push(
      '',
      '<details>',
      '<summary>API snapshot diff</summary>',
      '',
      '```diff',
      displayDiff,
      '```',
      '</details>'
    );
  }

  parts.push(
    '',
    changed
      ? 'Please review the changes and update `etc/api/adyen-react-native.api.md` if this public API change is intentional.'
      : 'No action needed — the public API snapshot matches the target branch.'
  );

  return parts.join('\n');
}

function readReport(path) {
  const report = JSON.parse(fs.readFileSync(path, 'utf8'));
  if (
    typeof report.changed !== 'boolean' ||
    typeof report.diff !== 'string' ||
    typeof report.summary !== 'string'
  ) {
    throw new Error('Invalid API report payload');
  }

  return report;
}

async function postApiReportComment({ github, context }) {
  const { changed, diff, summary } = readReport(process.env.REPORT);
  const body = createCommentBody(summary, diff, changed);
  const { owner, repo } = context.repo;
  const issue_number = context.issue.number;
  const comments = await github.paginate(github.rest.issues.listComments, {
    owner,
    repo,
    issue_number,
    per_page: 100,
  });
  const existingComment = comments.find(
    (comment) => comment.user.type === 'Bot' && comment.body.includes(MARKER)
  );

  if (existingComment) {
    await github.rest.issues.updateComment({
      owner,
      repo,
      comment_id: existingComment.id,
      body,
    });
  } else {
    await github.rest.issues.createComment({
      owner,
      repo,
      issue_number,
      body,
    });
  }
}

module.exports = postApiReportComment;
