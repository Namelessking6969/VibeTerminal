import { describe, it, expect } from 'vitest';
import { runRules } from '../../src/main/rules/index';
import type { Rule } from '../../src/main/rules/index';

describe('runRules', () => {
  it('returns null when no rule matches', () => {
    expect(runRules('ls -la', 'total 0')).toBeNull();
  });

  it('returns the first matching rule fix', () => {
    const result = runRules('git psuh', "git: 'psuh' is not a git command\nDid you mean this?\n\tpush");
    expect(result).toBe('git push');
  });

  it('stops at the first matching rule and does not apply subsequent rules', () => {
    const result = runRules('git push', 'permission denied');
    expect(result).toBe('sudo git push');
  });
});
