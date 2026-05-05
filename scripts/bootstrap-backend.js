#!/usr/bin/env node

const fs = require('fs/promises');
const path = require('path');

const rootDir = path.resolve(__dirname, '..', '..');
const dockerDir = path.join(rootDir, 'docker');

const filesToBootstrap = [
  {
    relativePath: 'Dockerfile.dev',
    content: `FROM node:22
WORKDIR /usr/src/app
COPY package*.json ./
COPY server ./server
RUN npm install
COPY . .
CMD ["npm", "run", "dev"]
`,
  },
];

async function writeIfChanged(filePath, content) {
  try {
    const current = await fs.readFile(filePath, 'utf8');
    if (current === content) {
      console.log(`unchanged: ${path.relative(rootDir, filePath)}`);
      return;
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  await fs.writeFile(filePath, content, 'utf8');
  console.log(`updated: ${path.relative(rootDir, filePath)}`);
}

async function bootstrapBackend() {
  await fs.mkdir(dockerDir, { recursive: true });

  for (const file of filesToBootstrap) {
    const absolutePath = path.join(dockerDir, file.relativePath);
    await writeIfChanged(absolutePath, file.content);
  }
}

bootstrapBackend().catch((error) => {
  console.error('Failed to bootstrap backend docker files.');
  console.error(error);
  process.exitCode = 1;
});
