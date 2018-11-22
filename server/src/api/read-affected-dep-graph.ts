import { tmpdir } from 'os';
import { join } from 'path';
import { exists as _exists, mkdir as _mkdir, readFileSync } from 'fs';
import { promisify } from 'util';

const exists = promisify(_exists);
const mkdir = promisify(_mkdir);

// noinspection TsLint
// tslint:disable-next-line:no-var-requires
const spawn = require('node-pty-prebuilt').spawn;

export async function readAffectedDepGraph(
  cwd: string,
  base: string,
  head: string
) {
  const tmp = await getTmpDir();

  return new Promise((res, rej) => {
    const filePath = join(tmp, 'affected-graph.json');
    const angularJSON = require(join(cwd, 'angular.json'));
    const cmd = `${cwd}/node_modules/.bin/nx`;
    const args = ['affected:dep-graph', `--file=${filePath}`, `--base=${base}`];
    if (head) {
      args.push(`--head=${head}`);
    }
    const proc = spawn(cmd, args, {
      cwd,
      cols: 80
    });

    const collectedData = [];
    let lastError = null;

    proc.on('data', (data: Buffer) => {
      collectedData.push(data.toString());
    });

    proc.on('error', (err: Error) => {
      lastError = err;
    });

    proc.on('exit', (code: number) => {
      try {
        if (code === 0) {
          const result = JSON.parse(readFileSync(filePath).toString());
          const resultWithType = {
            ...result,
            projectTypes: Object.keys(angularJSON.projects).reduce((acc, k) => {
              acc[k] = angularJSON.projects[k].projectType;
              return acc;
            }, {})
          };
          res(JSON.stringify(resultWithType));
        } else {
          rej(lastError);
        }
      } catch (err) {
        rej(err);
      }
    });
  });
}

async function getTmpDir() {
  const path = join(tmpdir(), 'angular-console');

  if (!(await exists(path))) {
    await mkdir(path);
  }

  return path;
}
