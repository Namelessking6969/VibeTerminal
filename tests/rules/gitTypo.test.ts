import { describe, it, expect } from 'vitest';
import { gitTypoRule } from '../../src/main/rules/gitTypo';

const GIT_ERROR = `git: 'psuh' is not a git command. See 'git --help'.

The most similar command is
\tpush`;

describe('gitTypoRule', () => {
  it('matches git commands with did-you-mean output', () => {
    expect(gitTypoRule.match('git psuh', GIT_ERROR)).toBe(true);
  });

  it('does not match non-git commands', () => {
    expect(gitTypoRule.match('npm psuh', GIT_ERROR)).toBe(false);
  });

  it('does not match git errors without a suggestion', () => {
    expect(gitTypoRule.match('git psuh', "git: 'psuh' is not a git command")).toBe(false);
  });

  it('extracts the suggested git subcommand', () => {
    expect(gitTypoRule.fix('git psuh', GIT_ERROR)).toBe('git push');
  });
});
