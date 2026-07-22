#!/usr/bin/env node
// Copyright (c) 2026 Adyen N.V.

const fs = require('node:fs');
const path = require('node:path');

const packageJson = require('../package.json');
const libDirectory = path.resolve(__dirname, '../lib');

fs.mkdirSync(libDirectory, { recursive: true });
fs.writeFileSync(
  path.join(libDirectory, 'package.json'),
  `${JSON.stringify({ version: packageJson.version })}\n`
);
