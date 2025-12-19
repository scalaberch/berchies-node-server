#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { builtinModules } = require("module");
const { execSync } = require("child_process");

const projectRoot = path.resolve(__dirname, "../../");
const serverDir = path.join(projectRoot, "server");
const outputFile = path.join(serverDir, "packages.txt");

// Load package.json dependencies
const packageJson = JSON.parse(
  fs.readFileSync(path.join(projectRoot, "package.json"), "utf8")
);
const installedDeps = new Set([
  ...Object.keys(packageJson.dependencies || {}),
  ...Object.keys(packageJson.devDependencies || {}),
]);

// Built-in Node modules to ignore
const builtins = new Set(builtinModules);

// Regex for import/require
const importRegex =
  /\bimport(?:\s+[\w*{} ,]+)?\s*from\s*['"]([^'"]+)['"]|require\(\s*['"]([^'"]+)['"]\s*\)|\bimport\(\s*['"]([^'"]+)['"]\s*\)/g;

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

const usedPackages = new Set();

// Collect used packages from code
walk(serverDir, (file) => {
  const contents = fs.readFileSync(file, "utf8");

  let match;
  while ((match = importRegex.exec(contents)) !== null) {
    const pkg = match[1] || match[2] || match[3];
    if (!pkg) continue;

    if (/^[.@/#~]/.test(pkg)) continue;

    const cleaned = pkg.startsWith("node:") ? pkg.slice(5) : pkg;
    if (builtins.has(cleaned)) continue;

    const normalized = cleaned.startsWith("@")
      ? cleaned.split("/").slice(0, 2).join("/")
      : cleaned.split("/")[0];

    usedPackages.add(normalized);
  }
});

const packages = [...usedPackages].sort();
console.log("Detected used packages:", packages);

// Determine which packages need to be installed
const toInstall = packages.filter((pkg) => !installedDeps.has(pkg));

if (toInstall.length > 0) {
  console.log("Installing missing packages:", toInstall.join(", "));
  execSync(`npm install ${toInstall.join(" ")}`, { cwd: projectRoot, stdio: "inherit" });
} else {
  console.log("✅ No new packages need installing");
}

// Get installed versions
const versions = packages.map((pkg) => {
  try {
    const pkgJsonPath = require.resolve(path.join(pkg, "package.json"), {
      paths: [projectRoot],
    });
    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));
    return `${pkg}@${pkgJson.version}`;
  } catch {
    return `${pkg}@UNKNOWN`;
  }
});

// Write output
fs.writeFileSync(outputFile, versions.join("\n") + "\n", "utf8");
console.log(`✅ Saved package list to: ${outputFile}`);
