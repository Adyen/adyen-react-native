// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, extname, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const canonicalDocuments = [
  'README.md',
  'docs/Architecture.md',
  'docs/Compatibility.md',
  'docs/Configuration.md',
  'docs/Error codes.md',
  'docs/FeatureSupport.md',
  'docs/MigrationGuide.md',
  'docs/js-architecture.md',
  'docs/native-architecture.md',
  'docs/public-api-flows.md',
];

// These phrases identify active claims from the retired bridge. Historical documents under
// docs/archive are deliberately outside this check. Every canonical match must be reviewed here.
const staleTerms = [
  { term: /legacy-backed/gi, expected: 0 },
  { term: /dropin\.old/gi, expected: 0 },
  { term: /DropInService/gi, expected: 0 },
  { term: /getReturnURL/gi, expected: 0 },
  { term: /removeStored/gi, expected: 0 },
  { term: /provideBalance/gi, expected: 0 },
  { term: /provideOrder/gi, expected: 0 },
  { term: /NativeModules\.AdyenComponent/gi, expected: 0 },
  { term: /Checkout\.configuration/gi, expected: 0 },
];

const requiredFacts = [
  'React Native 0.82 or newer',
  'TurboModule-only',
  'CheckoutTarget',
  'storedPaymentMethod',
  'replacement disposes',
  'failed replacement leaves idle',
  'operationBusy',
  'AdyenDropIn.start(checkout)',
  'Android session Drop-in',
  'Android advanced Drop-in',
  'iOS Drop-in',
  'address lookup',
  'partial payments',
  'stored-method removal',
];

const requiredDocumentationAssertions = [
  {
    document: 'docs/public-api-flows.md',
    text: 'A known valid target that is unavailable resolves `false` from `isAvailable`.',
  },
  {
    document: 'docs/Error codes.md',
    text: 'A known valid target that is unavailable resolves `false` from `isAvailable`.',
  },
  {
    document: 'docs/Compatibility.md',
    text: 'classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlinVersion")',
  },
];

const requiredFixtureAssertions = [
  'kotlinVersion = "2.3.21"',
  'classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlinVersion")',
];

const failures = [];
const documentContents = new Map();

for (const document of canonicalDocuments) {
  const absolutePath = resolve(root, document);
  if (!existsSync(absolutePath)) {
    failures.push(`Missing canonical document: ${document}`);
    continue;
  }
  documentContents.set(document, readFileSync(absolutePath, 'utf8'));
}

const combined = [...documentContents.values()].join('\n');
for (const fact of requiredFacts) {
  if (!combined.toLowerCase().includes(fact.toLowerCase())) {
    failures.push(`Canonical documentation is missing required fact: ${fact}`);
  }
}

for (const { document, text } of requiredDocumentationAssertions) {
  const normalizedContents = documentContents
    .get(document)
    ?.replace(/\s+/g, ' ');
  if (!normalizedContents?.includes(text)) {
    failures.push(`${document} is missing required release assertion: ${text}`);
  }
}

const fixtureContents = readFileSync(
  resolve(root, 'scripts/validate-rn-fixtures.mjs'),
  'utf8'
);
for (const text of requiredFixtureAssertions) {
  if (!fixtureContents.includes(text)) {
    failures.push(
      `scripts/validate-rn-fixtures.mjs is missing required Kotlin fixture assertion: ${text}`
    );
  }
}

for (const { term, expected } of staleTerms) {
  let count = 0;
  for (const [document, contents] of documentContents) {
    const matches = contents.match(term) ?? [];
    count += matches.length;
    if (matches.length > 0) {
      failures.push(
        `${document}: ${term} has ${matches.length} unreviewed match(es), expected ${expected}.`
      );
    }
  }
  if (count !== expected) {
    failures.push(`${term} matched ${count} time(s), expected ${expected}.`);
  }
}

function markdownFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return markdownFiles(path);
    return extname(entry.name) === '.md' ? [path] : [];
  });
}

for (const file of [
  ...markdownFiles(resolve(root, 'docs')),
  resolve(root, 'README.md'),
]) {
  const contents = readFileSync(file, 'utf8');
  const links = contents.matchAll(/\[[^\]]*\]\(([^)#]+)(?:#[^)]+)?\)/g);
  for (const link of links) {
    const target = link[1];
    if (/^(?:https?:|mailto:)/.test(target)) continue;
    const destination = resolve(dirname(file), decodeURIComponent(target));
    if (!existsSync(destination)) {
      failures.push(`${relative(root, file)} has broken local link: ${target}`);
    }
  }
}

const examples = spawnSync(
  'yarn',
  ['tsc', '--noEmit', '--project', 'docs/examples/tsconfig.json'],
  { cwd: root, encoding: 'utf8' }
);
if (examples.status !== 0) {
  failures.push(
    `Public documentation examples did not compile:\n${examples.stdout}${examples.stderr}`
  );
}

if (failures.length > 0) {
  throw new Error(failures.join('\n'));
}

console.log(
  `Validated ${canonicalDocuments.length} canonical documents, local links, stale terms, and public TypeScript examples.`
);
