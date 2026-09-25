// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.

import { FIXTURE_KOTLIN_VERSION } from './release-validation-constants.mjs';

function normalize(text) {
  return text.replace(/`/g, '').replace(/\s+/g, ' ').trim();
}

function claimUnits(markdown) {
  const units = [];
  let paragraph = [];

  function flushParagraph() {
    const text = normalize(paragraph.join(' '));
    if (text) units.push(...text.split(/(?<=[.!?])\s+/));
    paragraph = [];
  }

  for (const line of markdown.split('\n')) {
    if (/^\s*\|/.test(line)) {
      flushParagraph();
      units.push(normalize(line));
    } else if (line.trim()) {
      paragraph.push(line);
    } else {
      flushParagraph();
    }
  }
  flushParagraph();
  return units;
}

function isExplicitInvalidTargetNegation(unit) {
  return (
    /\b(?:does not|doesn't|do not|don't|never)\s+(?:\w+\s+){0,4}(?:reject(?:s|ed|ion)?(?:\s+with)?|return(?:s|ed)?|resolve(?:s|d)?(?:\s+(?:to|with))?|use(?:s|d)?)?\s*invalidTarget\b/i.test(
      unit
    ) || /\b(?:is|are)\s+not\s+(?:an?\s+)?invalidTarget\b/i.test(unit)
  );
}

function isKnownValidUnavailableTargetClaim(unit) {
  return (
    /\bknown\s+valid(?:\s+\w+){0,3}\s+target\b/i.test(unit) &&
    /\bunavailable\b/i.test(unit) &&
    /\binvalidTarget\b/i.test(unit)
  );
}

export function unavailableTargetContradictions(markdown) {
  return claimUnits(markdown).filter(
    (unit) =>
      isKnownValidUnavailableTargetClaim(unit) &&
      !isExplicitInvalidTargetNegation(unit)
  );
}

export function kotlinRootSetupFailures(markdown) {
  const failures = [];
  const normalized = normalize(markdown);
  if (
    !/\b(?:set|configure|define)\b[\s\S]*?\b(?:consuming\s+)?Android root project\b/i.test(
      normalized
    ) ||
    !/\bpin\b[\s\S]*?\broot\s+(?:Kotlin\s+)?Gradle plugin\b/i.test(normalized)
  ) {
    failures.push(
      'Kotlin setup must prescribe the consuming Android root project and root Kotlin Gradle plugin.'
    );
  }

  const groovyBlocks = [
    ...markdown.matchAll(/```groovy\s*\n([\s\S]*?)```/gim),
  ].map(([, contents]) => contents);
  const matchingBlock = groovyBlocks.find((block) => {
    const kotlinVersion = block.match(
      /kotlinVersion\s*=\s*["']([^"']+)["']/
    )?.[1];
    const pluginVersion = block.match(
      /classpath\(\s*["']org\.jetbrains\.kotlin:kotlin-gradle-plugin:([^"']+)["']\s*\)/
    )?.[1];

    return (
      kotlinVersion === FIXTURE_KOTLIN_VERSION &&
      pluginVersion === '$kotlinVersion'
    );
  });
  if (!matchingBlock) {
    failures.push(
      `Kotlin setup must set kotlinVersion to ${FIXTURE_KOTLIN_VERSION} and pin kotlin-gradle-plugin to $kotlinVersion in one Groovy block.`
    );
  }
  return failures;
}
