import { execSync } from 'child_process';

export function readGitBranches(cwd: string) {
  const branches = execSync('git for-each-ref refs/heads | cut -d/ -f3-', {
    cwd
  }).toString();
  return branches.split('\n').filter(x => !!x);
}
