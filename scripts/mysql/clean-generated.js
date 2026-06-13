const fs = require("fs");
const definesFilePath = "./src/database/mysql.defines.ts";

let content = fs.readFileSync(definesFilePath, "utf8");

// clean up the 'Generated'
content = content.replace(/Generated<T>/g, "GeneratedColumn<T>");
content = content.replace(/Generated<([^>]+)>/g, "$1");

// // append Buffer object with string for "safety"
// content = content.replace(/Buffer\;/g, "Uuid;");

// // add a new "type"
// content = content.replace(/"kysely";/g, `"kysely";\n\nexport type Uuid = Buffer | string;`);

fs.writeFileSync(definesFilePath, content, "utf8");


