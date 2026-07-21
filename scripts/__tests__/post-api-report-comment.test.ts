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

describe('post-api-report-comment.js', () => {
  it('creates a comment with the API summary and diff', async () => {
    const summary = '## 🟡 Public API changes detected\n\n## Summary';
    const removeFiles = setReportFile(summary, '@@ -1 +1 @@', true);
    const createComment = jest.fn().mockResolvedValue(undefined);
    const github = {
      paginate: jest.fn().mockResolvedValue([]),
      rest: {
        issues: {
          createComment,
          listComments: jest.fn(),
          updateComment: jest.fn(),
        },
      },
    };

    try {
      await postApiReportComment({
        github,
        context: {
          issue: { number: 42 },
          repo: { owner: 'Adyen', repo: 'sdk' },
        },
      });

      expect(createComment).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.stringContaining('```diff\n@@ -1 +1 @@\n```'),
          issue_number: 42,
          owner: 'Adyen',
          repo: 'sdk',
        })
      );
      expect(
        createComment.mock.calls[0][0].body.match(
          /## 🟡 Public API changes detected/g
        )
      ).toHaveLength(1);
    } finally {
      removeFiles();
    }
  });

  it('updates the existing bot comment for an unchanged API', async () => {
    const removeFiles = setReportFile('## Summary', '', false);
    const updateComment = jest.fn().mockResolvedValue(undefined);
    const github = {
      paginate: jest
        .fn()
        .mockResolvedValue([
          { body: '<!-- public-api-diff -->', id: 7, user: { type: 'Bot' } },
        ]),
      rest: {
        issues: {
          createComment: jest.fn(),
          listComments: jest.fn(),
          updateComment,
        },
      },
    };

    try {
      await postApiReportComment({
        github,
        context: {
          issue: { number: 42 },
          repo: { owner: 'Adyen', repo: 'sdk' },
        },
      });

      expect(updateComment).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.not.stringContaining('```diff'),
          comment_id: 7,
        })
      );
      expect(github.rest.issues.createComment).not.toHaveBeenCalled();
    } finally {
      removeFiles();
    }
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
