// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.

import { execFileSync } from 'node:child_process';
import { describe, expect, it } from '@jest/globals';
import { resolve } from 'node:path';

const script = resolve(__dirname, '../check-example-pod-toolchain.mjs');

describe('check-example-pod-toolchain.mjs', () => {
  it('requires the repository Ruby, Bundler, xcframework preparation, and Xcode', () => {
    const output = execFileSync('node', [script], { encoding: 'utf8' });

    expect(output).toContain(
      'Example pod command uses the repository Ruby/Bundler toolchain.'
    );
  });
});
