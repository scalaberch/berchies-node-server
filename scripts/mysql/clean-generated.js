const fs = require("fs");
const path = require("path");

// Adjust path to wherever your Kysely-generated file lives:
const definesFilePath = "./src/models/mysql.defines.ts";

let content = fs.readFileSync(definesFilePath, "utf8");

// replace the base Generated<T>
content = content.replace(/Generated<T>/g, "GeneratedColumn<T>");

// Replace Generated<T> with just T
content = content.replace(/Generated<([^>]+)>/g, "$1");

fs.writeFileSync(definesFilePath, content, "utf8");

console.log("✅ Removed Generated<> wrappers from db types");


