import { AppLogger } from "./logger";
import { ServerConfig } from "@server/defines";
import { DefaultLoggingConfig } from "./config";

export let Log: AppLogger = null;
export const initializeLogger = (config: ServerConfig) => {
  Log = new AppLogger(DefaultLoggingConfig);
};
export const shutdownLogger = () => {
  if (Log !== null) {
    Log.shutdown(); // do shutdown process
  }
};

export default Log;
