import fs from "fs";

const readCSVFile = (path: string, fileOptions?: any) => {
  const content = fs.readFileSync(path, { encoding: "utf-8", ...fileOptions });
  const items = content
    .toString()
    .split("\n")
    .map((item) => item.split(","));
  return items;
};
