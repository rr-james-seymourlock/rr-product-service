import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import regexpPlugin from 'eslint-plugin-regexp';
import unicornPlugin from 'eslint-plugin-unicorn';

/** @type {import('eslint').Linter.Config[]} */
export default [
  // Ignore patterns
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      ".serverless/**",
      ".esbuild/**",
      "coverage/**",
      ".vscode/**",
      ".git/**",
      ".DS_Store",
      ".env",
      ".env.local",
      "src/**/*.test.{js,mjs,cjs,ts}"
    ]
  },
  
  // Base config for all JavaScript files
  pluginJs.configs.recommended,
  
  // Config for JavaScript config files (not TypeScript source)
  {
    files: ["*.js", "*.mjs", "*.cjs", ".*.js", ".*.mjs", ".*.cjs"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser
      },
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module"
      }
    }
  },
  
  // TypeScript-specific config (only for src files)
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser
      },
      parser: tseslint.parser,
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
        ecmaVersion: "latest",
        sourceType: "module"
      }
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      regexp: regexpPlugin,
      unicorn: unicornPlugin,
    },
    rules: {
      ...tseslint.configs.recommended[0].rules,
      
      // TypeScript specific rules
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      '@typescript-eslint/no-floating-promises': 'error',
      
      // General rules
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      'eqeqeq': ['error', 'always'],
      'curly': ['error', 'all'],
      
      // Plugin rules
      'regexp/no-contradiction-with-assertion': 'error',
      // Add other regexp and unicorn rules as needed
    }
  },
  
  // Add globals for browser environment
  { 
    files: ["src/**/*.ts"],
    languageOptions: { 
      globals: globals.browser 
    } 
  }
];