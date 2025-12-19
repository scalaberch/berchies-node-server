#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { builtinModules } = require("module");
const { execSync } = require("child_process");

// project root (where package.json lives)
const projectRoot = path.resolve(__dirname, "../../");
const serverDir = path.join(projectRoot, "server");

const packageJsonPath = path.join(projectRoot, "package.json");
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

function walk(dir, callback) {
  for (const item of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      walk(fullPath, callback);
    } else if (stat.isFile() && /\.(js|ts|mjs|cjs)$/.test(item)) {
      callback(fullPath);
    }
  }
}

// Detect imports and requires
const importRegex = /(?:from\s+['"]([^'"]+)['"]|require\(\s*['"]([^'"]+)['"]\s*\))/g;
const builtins = new Set(builtinModules);

const usedPackages = new Set();

walk(serverDir, (file) => {
  const content = fs.readFileSync(file, "utf8");
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const pkg = match[1] || match[2];
    if (!pkg || pkg.startsWith(".") || pkg.startsWith("/") || builtins.has(pkg)) continue;

    const normalized = pkg.startsWith("@")
      ? pkg.split("/").slice(0, 2).join("/")
      : pkg.split("/")[0];

    usedPackages.add(normalized);
  }
});

const installedDeps = Object.keys(packageJson.dependencies || {});
const installedDevDeps = Object.keys(packageJson.devDependencies || {});

const unusedDeps = installedDeps.filter(dep => !usedPackages.has(dep));
const unusedDevDeps = installedDevDeps.filter(dep => !usedPackages.has(dep));

function removePackages(packages, isDev) {
  if (packages.length === 0) return;
  console.log(`Removing unused ${isDev ? "devDependencies" : "dependencies"}:`, packages.join(", "));
  execSync(`npm uninstall ${packages.join(" ")}`, { cwd: projectRoot, stdio: "inherit" });
}

removePackages(unusedDeps, false);
removePackages(unusedDevDeps, true);

console.log("✅ Dependency cleanup complete");