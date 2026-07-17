#!/usr/bin/env node
// Copyright (c) 2026 Adyen N.V.

const fs = require('fs');
const { spawnSync } = require('child_process');
const ts = require('typescript');

const REPORT_DIR = '/tmp/public-api-report';

/*
 * Usage: node api-report-summary.js <base-report> <head-report> [out-dir]
 * Writes report.json to out-dir.
 */
function readFile(path) {
  try {
    return fs.readFileSync(path, 'utf8');
  } catch {
    return '';
  }
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeBody(body, name) {
  return normalizeDeclarationBody(body).replace(
    new RegExp(`\\b${escapeRegExp(name)}\\b`, 'g'),
    '__NAME__'
  );
}

function normalizeDeclarationBody(body) {
  return body
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim();
      return trimmed !== '' && !trimmed.startsWith('//');
    })
    .join('\n');
}

function splitBlocks(text) {
  const blocks = [];
  const lines = text.split(/\r?\n/);
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trimStart();
    if (line.startsWith('// @public')) {
      const releaseTag = line;
      i += 1;
      const start = i;
      while (i < lines.length) {
        const t = lines[i].trimStart();
        if (t.startsWith('// @public')) break;
        if (t === '```') break;
        i += 1;
      }
      const bodyLines = lines.slice(start, i);
      while (
        bodyLines.length > 0 &&
        bodyLines[bodyLines.length - 1].trim() === ''
      ) {
        bodyLines.pop();
      }
      blocks.push({ releaseTag, bodyLines });
    } else {
      i += 1;
    }
  }

  return blocks;
}

function parsePublicNames(releaseTag, bodyLines) {
  const body = bodyLines.join('\n');
  const results = [];
  const aliases = [];

  for (const match of body.matchAll(/export\s*\{\s*([^}\n]+)\s*\}/g)) {
    for (const pair of match[1].split(',')) {
      const trimmed = pair.trim();
      const m = trimmed.match(/^(\w+)\s+as\s+(\w+)$/);
      if (m) aliases.push({ local: m[1], public: m[2] });
    }
  }

  const directMatch = body.match(
    /^export\s+(interface|type|const|class|function|enum)\s+(\w+)/m
  );

  if (aliases.length > 0) {
    for (const { local, public: publicName } of aliases) {
      const localKindMatch = body.match(
        new RegExp(
          `^(interface|type|const|class|function|enum)\\s+${local}\\b`,
          'm'
        )
      );
      const kind = localKindMatch ? localKindMatch[1] : 'declaration';
      results.push({ releaseTag, kind, name: publicName, body });
    }
  } else if (directMatch) {
    results.push({
      releaseTag,
      kind: directMatch[1],
      name: directMatch[2],
      body,
    });
  }

  return results;
}

function readReport(path) {
  const declarations = [];
  for (const { releaseTag, bodyLines } of splitBlocks(readFile(path))) {
    declarations.push(...parsePublicNames(releaseTag, bodyLines));
  }
  return declarations;
}

function addSetDifference(target, base, head, format) {
  for (const value of head) {
    if (!base.has(value)) target.push(format(value));
  }
}

function declarationMembers(body) {
  const sourceFile = ts.createSourceFile(
    'api-report.d.ts',
    body,
    ts.ScriptTarget.Latest,
    true
  );
  const declaration = sourceFile.statements.find(
    (statement) =>
      ts.isClassDeclaration(statement) ||
      ts.isEnumDeclaration(statement) ||
      ts.isFunctionDeclaration(statement) ||
      ts.isInterfaceDeclaration(statement)
  );
  const methods = new Map();
  const parameters = new Set();
  const enumCases = new Set();

  if (!declaration) return { enumCases, methods, parameters };

  const addParameters = (methodName, methodParameters) => {
    const names = new Set(
      methodParameters.map((parameter) => parameter.name.getText(sourceFile))
    );
    methods.set(methodName, names);
    for (const parameterName of names) {
      parameters.add(`${methodName}(${parameterName})`);
    }
  };

  if (
    ts.isClassDeclaration(declaration) ||
    ts.isInterfaceDeclaration(declaration)
  ) {
    for (const member of declaration.members) {
      if (ts.isMethodDeclaration(member) || ts.isMethodSignature(member)) {
        addParameters(member.name.getText(sourceFile), member.parameters);
      }
    }
  } else if (ts.isFunctionDeclaration(declaration)) {
    addParameters('', declaration.parameters);
  } else if (ts.isEnumDeclaration(declaration)) {
    for (const member of declaration.members) {
      enumCases.add(member.name.getText(sourceFile));
    }
  }

  return { enumCases, methods, parameters };
}

function collectMemberChanges(base, head, changes) {
  const baseMembers = declarationMembers(base.body);
  const headMembers = declarationMembers(head.body);
  const declarationName = head.name;

  addSetDifference(
    changes.addedMethods,
    new Set(baseMembers.methods.keys()),
    new Set(headMembers.methods.keys()),
    (methodName) => `${declarationName}.${methodName}`
  );
  addSetDifference(
    changes.removedMethods,
    new Set(headMembers.methods.keys()),
    new Set(baseMembers.methods.keys()),
    (methodName) => `${declarationName}.${methodName}`
  );
  addSetDifference(
    changes.addedParameters,
    baseMembers.parameters,
    headMembers.parameters,
    (parameter) =>
      parameter.startsWith('(')
        ? `${declarationName}${parameter}`
        : `${declarationName}.${parameter}`
  );
  addSetDifference(
    changes.removedParameters,
    headMembers.parameters,
    baseMembers.parameters,
    (parameter) =>
      parameter.startsWith('(')
        ? `${declarationName}${parameter}`
        : `${declarationName}.${parameter}`
  );
  addSetDifference(
    changes.addedEnumCases,
    baseMembers.enumCases,
    headMembers.enumCases,
    (enumCase) => `${declarationName}.${enumCase}`
  );
  addSetDifference(
    changes.removedEnumCases,
    headMembers.enumCases,
    baseMembers.enumCases,
    (enumCase) => `${declarationName}.${enumCase}`
  );
}

function classify(base, head) {
  const baseMap = new Map(base.map((d) => [d.name, d]));
  const headMap = new Map(head.map((d) => [d.name, d]));

  const added = [];
  const removed = [];
  const modified = [];
  const renamed = [];
  const memberChanges = {
    addedEnumCases: [],
    addedMethods: [],
    addedParameters: [],
    removedEnumCases: [],
    removedMethods: [],
    removedParameters: [],
  };
  const usedAdded = new Set();
  const usedRemoved = new Set();

  for (const [name, h] of headMap) {
    if (!baseMap.has(name)) added.push(h);
  }
  for (const [name, b] of baseMap) {
    if (!headMap.has(name)) removed.push(b);
  }

  for (const r of removed) {
    for (const a of added) {
      if (usedAdded.has(a.name)) continue;
      if (r.releaseTag !== a.releaseTag) continue;
      if (normalizeBody(r.body, r.name) === normalizeBody(a.body, a.name)) {
        renamed.push({ old: r, new: a });
        usedAdded.add(a.name);
        usedRemoved.add(r.name);
        break;
      }
    }
  }

  const finalAdded = added.filter((a) => !usedAdded.has(a.name));
  const finalRemoved = removed.filter((r) => !usedRemoved.has(r.name));

  for (const [name, h] of headMap) {
    const b = baseMap.get(name);
    if (b) {
      const fullB = `${b.releaseTag}\n${normalizeDeclarationBody(b.body)}`;
      const fullH = `${h.releaseTag}\n${normalizeDeclarationBody(h.body)}`;
      if (fullB !== fullH) {
        modified.push({ base: b, head: h });
        collectMemberChanges(b, h, memberChanges);
      }
    }
  }

  const byName = (a, b) => a.name.localeCompare(b.name);

  return {
    added: finalAdded.sort(byName),
    removed: finalRemoved.sort(byName),
    modified: modified.sort((a, b) => a.head.name.localeCompare(b.head.name)),
    renamed: renamed.sort((a, b) => a.old.name.localeCompare(b.old.name)),
    ...Object.fromEntries(
      Object.entries(memberChanges).map(([key, value]) => [
        key,
        value.sort((a, b) => a.localeCompare(b)),
      ])
    ),
  };
}

function renderItem(item, oldName) {
  return oldName
    ? `- \`${oldName}\` → \`${item.name}\` — ${item.kind}`
    : `- \`${item.name}\` — ${item.kind}`;
}

function renderCategory(title, items, transform) {
  if (items.length === 0) return '';
  const list = items
    .map((d) => renderItem(d, transform ? transform(d) : undefined))
    .join('\n');
  return `### ${title} (${items.length})\n\n${list}`;
}

function renderNamesCategory(title, names) {
  if (names.length === 0) return '';
  return `### ${title} (${names.length})\n\n${names
    .map((name) => `- \`${name}\``)
    .join('\n')}`;
}

function renderSummary(changes) {
  const changed =
    changes.added.length +
      changes.removed.length +
      changes.modified.length +
      changes.renamed.length +
      changes.addedMethods.length +
      changes.removedMethods.length +
      changes.addedParameters.length +
      changes.removedParameters.length +
      changes.addedEnumCases.length +
      changes.removedEnumCases.length >
    0;

  if (!changed) {
    return {
      changed: false,
      markdown:
        '## 🟢 Public API is unchanged\n\nNo public declarations were added, removed, or modified.',
    };
  }

  const renamedItems = changes.renamed.map((r) => ({
    ...r.new,
    oldName: r.old.name,
  }));

  const parts = [
    '## 🟡 Public API changes detected',
    renderCategory('🆕 Added', changes.added),
    renderCategory('❌ Removed', changes.removed),
    renderCategory(
      '✏️ Modified',
      changes.modified.map((m) => m.head)
    ),
    renderCategory('🏷️ Renamed', renamedItems, (d) => d.oldName),
    renderNamesCategory('🆕 Methods added', changes.addedMethods),
    renderNamesCategory('❌ Methods removed', changes.removedMethods),
    renderNamesCategory('🆕 Parameters added', changes.addedParameters),
    renderNamesCategory('❌ Parameters removed', changes.removedParameters),
    renderNamesCategory('🆕 Enum cases added', changes.addedEnumCases),
    renderNamesCategory('❌ Enum cases removed', changes.removedEnumCases),
  ];

  return { changed: true, markdown: parts.filter(Boolean).join('\n\n') };
}

function produceDiff(basePath, headPath) {
  const result = spawnSync('diff', ['-u', basePath, headPath], {
    encoding: 'utf8',
  });
  if (result.status === 0) {
    return '';
  } else if (result.status === 1) {
    return result.stdout;
  }

  return `diff failed (status ${result.status}):\n${result.stderr || ''}`;
}

function main() {
  const [basePath, headPath, outDir = REPORT_DIR] = process.argv.slice(2);

  if (!basePath || !headPath) {
    console.error(
      'Usage: api-report-summary.js <base-report> <head-report> [out-dir]'
    );
    process.exit(1);
  }

  fs.mkdirSync(outDir, { recursive: true });

  let baseReportPath = basePath;
  if (!fs.existsSync(baseReportPath)) {
    baseReportPath = `${outDir}/base-api-report.md`;
    fs.writeFileSync(baseReportPath, '');
  }

  const base = readReport(baseReportPath);
  const head = readReport(headPath);
  const changes = classify(base, head);
  const { changed, markdown } = renderSummary(changes);
  const diff = produceDiff(baseReportPath, headPath);
  fs.writeFileSync(
    `${outDir}/report.json`,
    JSON.stringify({ changed, diff, summary: markdown })
  );

  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${markdown}\n\n`);
  }
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `changed=${changed}\n`);
  }
}

main();
