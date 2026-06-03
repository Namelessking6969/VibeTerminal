import type { Rule } from './index';

export const cdNotADirRule: Rule = {
  match(command: string, errorOutput: string): boolean {
    return command.trimStart().startsWith('cd ') && /not a directory/i.test(errorOutput);
  },
  fix(command: string): string {
    return `ls ${command.trimStart().slice(3).trim()}`;
  },
};
