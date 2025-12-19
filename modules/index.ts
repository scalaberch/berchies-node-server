import path from "path";
import Files, { currentDir } from "@server/lib/files";
import { Module } from "./defines";
import { Server } from "../index";
import { inArray } from "@server/helpers";

const ModulesFolder = `${currentDir}/server/modules`;

/**
 * load all modules.
 * 
 * @deprecated
 * @param server 
 * @param loadedModules 
 * @returns 
 */
export const loadAllModules = async (server: Server, loadedModules: Array<Module>) => {
  const modules = {};
  const folders = Files.getFolders(ModulesFolder);

  // If no folders exists, then there are no modules in your server so you can't select them.
  if (folders.length === 0) {
    return modules;
  }

  // Then load the module if it's defined in the configuration.
  for (const selectedModule of loadedModules) {
    if (!inArray(selectedModule, folders)) {
      continue;
    }

    const entry = path.join(ModulesFolder, selectedModule, "index");
    try {
      const mod = (await import(entry)).default;
      console.log(mod);


      modules[selectedModule] = mod;
    } catch (error) {
      console.error(`Module import error: `, error);
    }
  }

  return modules;
};

/**
 * 
 * @deprecated
 * @param name 
 * @param setup 
 * @returns 
 */
export default function Module(
  name: string,
  setup: (hooks: {
    // onInit(cb: ModuleLifecycle["onInit"]): void;
    // onStart(cb: ModuleLifecycle["onStart"]): void;
    // onShutdown(cb: ModuleLifecycle["onShutdown"]): void;
  }) => void
) {
  // const lifecycle: ModuleLifecycle = {};

  const module: any = setup({
    // onInit(cb) {
    //   lifecycle.onInit = cb;
    // },
    // onStart(cb) {
    //   lifecycle.onStart = cb;
    // },
    // onShutdown(cb) {
    //   lifecycle.onShutdown = cb;
    // },
  });

  return { name, ...module };
}
