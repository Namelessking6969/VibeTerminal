import { describe, it, expect } from 'vitest';
import { wrongFlagRule } from '../../src/main/rules/wrongFlag';

describe('wrongFlagRule', () => {
  it('matches unknown option errors', () => {
    expect(wrongFlagRule.match('ls --foo', "ls: unknown option '--foo'")).toBe(true);
  });

  it('does not match git switch errors (different wording)', () => {
    expect(wrongFlagRule.match('git log --blah', "error: unknown switch 'b'\nusage: git log")).toBe(false);
  });

  it('matches invalid flag errors', () => {
    expect(wrongFlagRule.match('curl --nope url', "curl: invalid flag '--nope'")).toBe(true);
  });

  it('does not match unrelated errors', () => {
    expect(wrongFlagRule.match('ls', 'permission denied')).toBe(false);
  });

  it('strips the bad long flag from the command', () => {
    expect(wrongFlagRule.fix('ls --foo -la', "unknown option '--foo'")).toBe('ls -la');
  });

  it('strips the bad short flag from the command', () => {
    expect(wrongFlagRule.fix('curl -Z https://example.com', "curl: invalid flag '-Z'")).toBe('curl https://example.com');
  });
});
