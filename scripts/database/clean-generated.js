const fs = require('fs');
const definesFilePath = './src/database/schema.defines.ts';

if (!fs.existsSync(definesFilePath)) {
  console.warn('[db:generateModels] No schema.defines.ts to clean.');
  process.exit(0);
}

let content = fs.readFileSync(definesFilePath, 'utf8');

content = content.replace(/Generated<T>/g, 'GeneratedColumn<T>');
content = content.replace(/Generated<([^>]+)>/g, '$1');

fs.writeFileSync(definesFilePath, content, 'utf8');
