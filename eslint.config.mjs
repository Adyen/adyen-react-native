import { fixupConfigRules } from '@eslint/compat';
import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import prettier from 'eslint-plugin-prettier';
import { defineConfig } from 'eslint/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default defineConfig([
  {
    extends: fixupConfigRules(compat.extends('@react-native', 'prettier')),
    plugins: { prettier },
    rules: {
      'react/react-in-jsx-scope': 'off',
      'prettier/prettier': ['error'],
    },
  },
  {
    // Codegen types are imported from their React Native source modules so the
    // generated TurboModule specs compile consistently across the supported range.
    files: ['src/specs/**'],
    rules: {
      '@react-native/no-deep-imports': 'off',
    },
  },
  {
    // Build output is generated and gitignored; Gradle's HTML test report ships a bundled
    // report.js that would otherwise fail `yarn lint` after any Android test run.
    ignores: ['node_modules/', 'lib/', '**/build/', '**/Build/'],
  },
]);
