import { test, describe } from 'node:test'
import assert from 'node:assert'
import { generateSlug } from '../../src/actions/article.actions'

describe('Article Actions - generateSlug', () => {
  test('converts basic title to URL-safe slug', async () => {
    assert.strictEqual(await generateSlug('Hello World!'), 'hello-world')
  })

  test('handles extra spaces and uppercase', async () => {
    assert.strictEqual(await generateSlug('  Testing 123...  '), 'testing-123')
  })

  test('replaces special characters with hyphens', async () => {
    assert.strictEqual(await generateSlug('A-B_C@D'), 'a-b-c-d')
  })
})
