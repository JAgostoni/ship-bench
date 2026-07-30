#!/usr/bin/env bash
set -e

# Run lint
npm run lint

# Run typecheck
npm run typecheck

# Run unit tests
npm test

# Run Playwright end-to-end tests
npm run test:e2e
