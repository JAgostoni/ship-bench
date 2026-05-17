import { describe, it, expect } from 'vitest';
import { slugify, formatSearchQuery } from './text';

describe('Text Utilities', () => {
  describe('slugify', () => {
    it('should convert strings to lowercase-kebab-case', () => {
      expect(slugify('Hello World')).toBe('hello-world');
      expect(slugify('React 19 Features')).toBe('react-19-features');
    });

    it('should handle special characters', () => {
      expect(slugify('What? Is (This)!')).toBe('what-is-this');
    });

    it('should trim and handle multiple spaces', () => {
      expect(slugify('  Too   Many   Spaces  ')).toBe('too-many-spaces');
    });

    it('should handle non-alphanumeric characters', () => {
      expect(slugify('slugify & processing')).toBe('slugify-processing');
    });
  });

  describe('formatSearchQuery', () => {
    it('should join words with | for FTS', () => {
      expect(formatSearchQuery('hello world')).toBe('hello | world');
    });

    it('should handle multiple spaces', () => {
      expect(formatSearchQuery('  react    testing  ')).toBe('react | testing');
    });

    it('should handle single words', () => {
      expect(formatSearchQuery('vitest')).toBe('vitest');
    });
  });
});
