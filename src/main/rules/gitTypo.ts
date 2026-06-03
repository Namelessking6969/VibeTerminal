import type { Rule } from './index';

export const gitTypoRule: Rule = {
  match(command: string, errorOutput: string): boolean {
    return command.startsWith('git ') && /did you mean|most similar/i.test(errorOutput);
  },
  fix(_command: string, errorOutput: string): string {
    const m = errorOutput.match(/\n\s+(\S+)\s*$/m);
    return m ? `git ${m[1].trim()}` : _command;
  },
};
