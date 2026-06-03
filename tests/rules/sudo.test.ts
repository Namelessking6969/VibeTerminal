import { describe, it, expect } from 'vitest';
import { sudoRule } from '../../src/main/rules/sudo';

describe('sudoRule', () => {
  it('matches permission denied errors', () => {
    expect(sudoRule.match('cp file /etc/hosts', 'cp: /etc/hosts: Permission denied')).toBe(true);
  });

  it('is case-insensitive for permission denied', () => {
    expect(sudoRule.match('rm /usr/bin/foo', 'rm: cannot remove: PERMISSION DENIED')).toBe(true);
  });

  it('does not match unrelated errors', () => {
    expect(sudoRule.match('ls foo', 'ls: foo: No such file or directory')).toBe(false);
  });

  it('prepends sudo to the command', () => {
    expect(sudoRule.fix('cp file /etc/hosts', '')).toBe('sudo cp file /etc/hosts');
  });
});
