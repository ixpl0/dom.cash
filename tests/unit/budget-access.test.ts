import assert from 'node:assert/strict'
import { test } from 'node:test'
import { allowsAccessLevel } from '../../server/services/budget/access'

const accessCases = [
  { access: 'owner', level: 'read', expected: true },
  { access: 'owner', level: 'write', expected: true },
  { access: 'write', level: 'read', expected: true },
  { access: 'write', level: 'write', expected: true },
  { access: 'read', level: 'read', expected: true },
  { access: 'read', level: 'write', expected: false },
  { access: null, level: 'read', expected: false },
  { access: null, level: 'write', expected: false },
] as const

accessCases.forEach(({ access, level, expected }) => {
  test(`allowsAccessLevel ${expected ? 'allows' : 'denies'} ${level} with ${access ?? 'no'} access`, () => {
    assert.equal(allowsAccessLevel(access, level), expected)
  })
})
