import { describe, it, expect } from 'vitest';
import { cdNotADirRule } from '../../src/main/rules/cdNotADir';

describe('cdNotADirRule', () => {
  it('matches cd into a file', () => {
    expect(cdNotADirRule.match('cd README.md', 'cd: not a directory: README.md')).toBe(true);
  });

  it('is case-insensitive for not a directory', () => {
    expect(cdNotADirRule.match('cd foo.txt', 'cd: Not A Directory: foo.txt')).toBe(true);
  });

  it('does not match non-cd commands', () => {
    expect(cdNotADirRule.match('ls README.md', 'Not a directory')).toBe(false);
  });

  it('replaces cd with ls', () => {
    expect(cdNotADirRule.fix('cd src/main/main.ts', '')).toBe('ls src/main/main.ts');
  });
});
