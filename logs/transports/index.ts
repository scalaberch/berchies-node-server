import { format, transports } from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import { isProductionEnv, getEnvVariable } from "@server/env";
import { FormattedPayload, LoggingConfig } from "../config";
import path from "path";

// transports/TransportBase.ts
export interface LogPayload {
  level: string;
  message: string;
  meta?: any;
}

export abstract class TransportBase {
  abstract log(payload: LogPayload): void;

  // Optional: transports may emit errors
  onError?(err: Error): void;
}


/**
 * 
 * @deprecated
 */
export class RotatingFileTransport extends TransportBase {
  private transport: DailyRotateFile;

  constructor(directory: string, service: string, retentionDays: number, tag: string) {
    super();

    this.transport = new DailyRotateFile({
      dirname: directory,
      filename: `${service}-${tag}-%DATE%.log`,
      datePattern: "YYYY-MM-DD",
      maxFiles: `${retentionDays}d`,
      zippedArchive: true,
      handleExceptions: true,
      level: isProductionEnv() ? "info" : "debug",

      format: format.combine(
        format.timestamp(),
        format.printf((info) => {
          console.log(info);

          // Ensure message is present
          const msg = info.message || "";
          const meta = info.meta ? JSON.stringify(info.meta) : "";
          return `${info.timestamp} [${info.level}] ${msg} ${meta}`;
        })
      ),
    });

    this.transport.on("error", (err) => {
      if (this.onError) this.onError(err);
    });

    this.transport.on("rotate", (oldFilename, newFilename) => {
      // do something fun
    });
  }

  log(payload: LogPayload) {
    this.transport.log(payload, () => {});

    // this.transport.log(payload, (err: Error) => {
    //   if (err && this.onError) this.onError(err);
    // });
  }
}

/**
 * 
 * @deprecated
 */
export class FileTransport extends RotatingFileTransport {
  constructor(config: LoggingConfig, tag: string) {
    const serviceName = config?.serviceName;
    const logDirectory = config?.logDirectory;
    const retentionDays = config?.retentionDays;
    super(logDirectory, serviceName, retentionDays, tag);
  }
}