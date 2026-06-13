const fs = require('fs');
const path = require('path');
const { spawn } = require("child_process");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

const pwd = process.cwd();
const args = process.argv || [];
const targetFolder = args[2] === undefined ? '' : args[2];
const targetPath = path.join(pwd, targetFolder);

const cleanAll = true;

// do clean all if ever.
if (cleanAll) {
  if (targetFolder === '') {
    for (const entry of fs.readdirSync(pwd)) {
      fs.rmSync(path.join(pwd, entry), {
        recursive: true,
        force: true,
      });
    }
  } else {
    fs.rmSync(targetPath, {
      recursive: true,
      force: true,
    });
  }
}

// root folders to create
const rootFolders = ['public', 'resources', 'tests'];
for (const folder of rootFolders) {
  fs.mkdirSync(path.join(targetPath, `${folder}`), { recursive: true });
}

// src folders to create
const srcFolders = ['controllers', 'models', 'routes', 'services'];
for (const folder of srcFolders) {
  fs.mkdirSync(path.join(targetPath, `src/${folder}`), { recursive: true });
}

// copy files
const fileMap = {
  'index.template': 'index.ts',
  'tsconfig.json.template': 'tsconfig.json',
  'src-config.template': 'src/config.ts',
  'src-main.template': 'src/main.ts',
  'src-README.md.template': 'src/README.md',
  'prettierrc': '.prettierrc',
}

for (const srcFile in fileMap) {
  const tgtFile = fileMap[srcFile]
  fs.copyFileSync(path.join(__dirname, srcFile), path.join(targetPath, tgtFile))
}

// then run npm init
const child = spawn(npm, ["init", "-y"], {
  cwd: targetPath,
  stdio: "inherit"
});
child.on("exit", code => {
  console.log("npm init exited with code", code);
});

// console.log(__dirname);
