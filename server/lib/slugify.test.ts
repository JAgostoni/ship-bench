import { test, expect } from 'vitest';
import { slugify } from './slugify';

test('slugify lowercases and replaces spaces', () => {
  expect(slugify('Hello World')).toBe('hello-world');
});

test('slugify strips special characters', () => {
  expect(slugify('Café & Co.!')).toBe('caf-co');
});

test('slugify trims hyphens', () => {
  expect(slugify('  Leading  ')).toBe('leading');
});
