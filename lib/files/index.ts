import _ from 'lodash'
import fs from 'fs';
import path from 'path';
import axios from 'axios';
// export { default as S3Files } from "./s3";

const downloadFile = async (remotePath: string, downloadPath: string) => {
  if (fs.existsSync(downloadPath)) {
    fs.unlinkSync(downloadPath);
  }

  const response = await axios({
    url: remotePath,
    method: 'GET',
    responseType: 'stream',
  });

  const writer = fs.createWriteStream(downloadPath);
  response.data.pipe(writer);

  return new Promise((resolve: any, reject: any) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
};

////////////////////////////////

export const Path = path;

/**
 * gets the current directory
 *
 */
export const currentDir = process.cwd();

/**
 * Resolve `src/...` in dev; `dist/src/...` in production (artifact has no top-level `src/`).
 * Prefers `src/` when both exist so nodemon edits are not shadowed by an old `dist/` build.
 */
export const resolveSrcPath = (...parts: string[]): string => {
  const srcPath = path.join(currentDir, 'src', ...parts);
  const distPath = path.join(currentDir, 'dist', 'src', ...parts);
  if (fs.existsSync(srcPath)) {
    return srcPath;
  }
  if (fs.existsSync(distPath)) {
    return distPath;
  }
  return srcPath;
};

/**
 * check if a folder exists
 *
 * @param folderPath
 * @returns
 */
const folderExists = (folderPath: string = '') => fs.existsSync(folderPath);

/**
 * check if path is a directory
 *
 * @param name
 * @returns
 */
const isPathADirectory = (name: string) => fs.statSync(name).isDirectory();

/**
 * creates a folder
 *
 * @param folderPath
 * @returns
 */
const createFolder = (folderPath: string = '') => fs.mkdirSync(folderPath, { recursive: true });

/**
 * get folders of a folder
 *
 * @param dir
 * @returns
 */
const getFolders = (dir: string = '/') => {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
};

/**
 * get all file paths of a folder.
 *
 * @param dir
 * @param includeSubFolders
 */
const getFiles = (dir: string = '/', includeSubFolders = false): string[] => {
  const files = [];
  const fileList = fs.readdirSync(dir);

  if (fileList.length === 0) {
    return files;
  }

  for (const file of fileList) {
    const filePath = path.join(dir, file);

    if (!isPathADirectory(filePath)) {
      files.push(filePath);
      continue;
    }

    const subfiles = getFiles(filePath);
    files.push(...subfiles);
  }

  return files;
};

/**
 * check if `filepath` is either one of these file extensions defined in `extension`
 *
 * @param filepath
 * @param extension
 * @param checkActualFileStats
 * @returns
 */
const isFileExtension = (
  filepath: string,
  extension: string | Array<string>,
  checkActualFileStats?: boolean,
) => {
  if (filepath.length === 0) {
    return false;
  }
  const dotIndex = filepath.lastIndexOf('.');
  if (dotIndex < 0 || dotIndex === 0) {
    return false;
  }
  const fetchedExtension = filepath.slice(dotIndex + 1).toLowerCase();
  if (typeof extension === 'string') {
    return extension.toLowerCase() === fetchedExtension;
  }
  const filtered = extension
    .map((ext) => ext.toLowerCase())
    .filter((ext) => ext === fetchedExtension);

  return filtered.length > 0;
};

/**
 * check if running executable is running on typescript or on plain javascript
 * @todo: move this to some helper library?
 *
 * @returns
 */
export const isRunningInTypeScript = () => {
  const args = process.argv;
  const files = args
    .filter((arg) => arg.includes('index'))
    .map((arg) => {
      const split = arg.split('/');
      return split[split.length - 1];
    });

  const indexFiles = _.uniq(files);
  const indexFile = indexFiles.length > 0 ? indexFiles[0] : '';
  const indexFileSplit = indexFile.split('.');
  const ext = indexFileSplit[indexFileSplit.length - 1];
  return ext.toLowerCase() === 'ts';
};

export default {
  currentDir,
  resolveSrcPath,
  isFileExtension,
  downloadFile,
  folderExists,
  createFolder,
  getFolders,
  getFiles,
  isRunningInTypeScript,
};
