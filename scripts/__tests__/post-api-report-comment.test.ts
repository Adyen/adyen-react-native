// Copyright (c) 2026 Adyen N.V.

import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const postApiReportComment = require('../post-api-report-comment');

const environmentKeys = ['REPORT'] as const;
const originalEnvironment = Object.fromEntries(
  environmentKeys.map((key) => [key, process.env[key]])
);

function setReportFile(summary: string, diff: string, changed: boolean) {
  const directory = mkdtempSync(join(tmpdir(), 'api-report-comment-'));
  const reportPath = join(directory, 'report.json');

  writeFileSync(reportPath, JSON.stringify({ changed, diff, summary }));
  process.env.REPORT = reportPath;

  return () => rmSync(directory, { force: true, recursive: true });
}

afterEach(() => {
  for (const key of environmentKeys) {
    const value = originalEnvironment[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

const context = {
  issue: { number: 42 },
  repo: { owner: 'Adyen', repo: 'sdk' },
};

function createGithub(comments: unknown[]) {
  const createComment = jest.fn().mockResolvedValue(undefined);
  const updateComment = jest.fn().mockResolvedValue(undefined);

  return {
    createComment,
    updateComment,
    github: {
      paginate: jest.fn().mockResolvedValue(comments),
      rest: {
        issues: { createComment, listComments: jest.fn(), updateComment },
      },
    },
  };
}

const changedSummary = '## 🟡 Public API changes detected\n\n## Summary';
const unchangedSummary = '## 🟢 Public API is unchanged';
const botMarkerComment = {
  body: '<!-- public-api-diff -->',
  id: 7,
  user: { type: 'Bot' },
};

describe('post-api-report-comment.js', () => {
  describe('when the API is unchanged', () => {
    it('makes no write when no marker comment exists', async () => {
      const removeFiles = setReportFile(unchangedSummary, '', false);
      const { github, createComment, updateComment } = createGithub([
        { body: 'unrelated', id: 1, user: { type: 'Bot' } },
        { body: '<!-- public-api-diff -->', id: 2, user: { type: 'User' } },
      ]);

      try {
        await postApiReportComment({ github, context });

        expect(createComment).not.toHaveBeenCalled();
        expect(updateComment).not.toHaveBeenCalled();
      } finally {
        removeFiles();
      }
    });

    it('updates a stale bot comment to the unchanged body', async () => {
      const removeFiles = setReportFile(unchangedSummary, '', false);
      const { github, createComment, updateComment } = createGithub([
        botMarkerComment,
      ]);

      try {
        await postApiReportComment({ github, context });

        expect(createComment).not.toHaveBeenCalled();
        expect(updateComment).toHaveBeenCalledTimes(1);
        const call = updateComment.mock.calls[0][0] as {
          body: string;
          comment_id: number;
        };
        expect(call.comment_id).toBe(7);
        expect(call.body).toContain('<!-- public-api-diff -->');
        expect(call.body).toContain('🟢 Public API is unchanged');
        expect(call.body).toContain('No action needed');
        expect(call.body).not.toContain('API snapshot diff');
        expect(call.body).not.toContain('```diff');
      } finally {
        removeFiles();
      }
    });
  });

  describe('when the API is changed', () => {
    it('creates a comment with the API summary and diff when none exists', async () => {
      const removeFiles = setReportFile(changedSummary, '@@ -1 +1 @@', true);
      const { github, createComment, updateComment } = createGithub([]);

      try {
        await postApiReportComment({ github, context });

        expect(updateComment).not.toHaveBeenCalled();
        expect(createComment).toHaveBeenCalledTimes(1);
        const call = createComment.mock.calls[0][0] as {
          body: string;
          issue_number: number;
          owner: string;
          repo: string;
        };
        expect(call).toMatchObject({
          issue_number: 42,
          owner: 'Adyen',
          repo: 'sdk',
        });
        expect(call.body).toContain('<!-- public-api-diff -->');
        expect(call.body).toContain('API snapshot diff');
        expect(call.body).toContain('```diff\n@@ -1 +1 @@\n```');
        expect(call.body).toContain('Please review the changes');
        expect(
          call.body.match(/## 🟡 Public API changes detected/g)
        ).toHaveLength(1);
      } finally {
        removeFiles();
      }
    });

    it('updates the existing bot comment instead of creating one', async () => {
      const removeFiles = setReportFile(changedSummary, '@@ -1 +1 @@', true);
      const { github, createComment, updateComment } = createGithub([
        botMarkerComment,
      ]);

      try {
        await postApiReportComment({ github, context });

        expect(createComment).not.toHaveBeenCalled();
        expect(updateComment).toHaveBeenCalledTimes(1);
        expect(updateComment).toHaveBeenCalledWith(
          expect.objectContaining({
            body: expect.stringContaining('```diff\n@@ -1 +1 @@\n```'),
            comment_id: 7,
          })
        );
      } finally {
        removeFiles();
      }
    });
  });

  it('rejects an invalid report payload', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'api-report-comment-'));
    const reportPath = join(directory, 'report.json');
    writeFileSync(reportPath, JSON.stringify({ changed: 'false' }));
    process.env.REPORT = reportPath;

    try {
      await expect(
        postApiReportComment({ github: {}, context: {} })
      ).rejects.toThrow('Invalid API report payload');
    } finally {
      rmSync(directory, { force: true, recursive: true });
    }
  });
});
