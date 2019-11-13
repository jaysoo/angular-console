const shell = require('shelljs');
const tmp = require('tmp').dirSync().name;
const path = require('path');
const fs = require('fs');

if (fs.existsSync(path.join('tmp', 'proj', 'angular.json'))) {
  console.log('Reusing existing E2E test fixtures...');
} else {
  console.log('Setting up E2E test fixtures...');
  shell.rm('-rf', 'tmp');
  shell.mkdir('tmp');

  shell.mkdir(path.join(tmp, 'proj'));
  shell.mkdir(path.join(tmp, 'ng'));

  shell.exec('yarn add @angular/cli@7.3.6', { cwd: path.join(tmp, 'ng') });
  shell.exec('yarn add @nrwl/schematics@7.7.2', { cwd: path.join(tmp, 'ng') });
  shell.exec('ng config -g cli.packageManager yarn');

  shell.exec(
    `${path.join(
      tmp,
      'ng'
    )}/node_modules/.bin/ng new proj --collection=@schematics/angular --directory=proj --skip-git --no-interactive`,
    { cwd: tmp, stdio: [0, 1, 2] }
  );

  const angularJson = JSON.parse(
    fs.readFileSync(path.join(tmp, 'proj', 'angular.json')).toString()
  );
  angularJson.schematics = {
    '@schematics/angular:service': {
      flat: false
    }
  };
  fs.writeFileSync(
    path.join(tmp, 'proj', 'angular.json'),
    JSON.stringify(angularJson, null, 2)
  );

  // add a custom task that will invoke lint
  const parsedAngularJson = JSON.parse(
    fs.readFileSync(path.join(tmp, 'proj', 'angular.json')).toString()
  );
  const configForProj = parsedAngularJson.projects.proj;
  configForProj.architect.custom = configForProj.architect.lint;
  fs.writeFileSync(
    path.join(tmp, 'proj', 'angular.json'),
    JSON.stringify(parsedAngularJson, null, 2)
  );

  shell.mv(path.join(tmp, 'proj'), './tmp/proj');
}
