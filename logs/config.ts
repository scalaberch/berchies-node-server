import { getEnvVariable, isProductionEnv } from "@server/env";
import { AWS_ACCESS_KEY_ID, AWS_REGION, AWS_SECRET_ACCESS_KEY } from "@server/lib/aws";
import { TransformableInfo } from 'logform';
import winston from "winston";

export const ServiceName = getEnvVariable("PROJ_NAME", false, "node-app")
export const LogStore: string = getEnvVariable("LOG_STORE", false, "file");
export const LogRetentionDays: number = getEnvVariable("LOG_RETENTION_DAYS", true, 30);
export const DefaultLogType = isProductionEnv() ? "info" : "debug"
export const LogDirectory = "./resources/logs/";

export interface LoggingConfig {
  serviceName: string;
  logDirectory: string;
  retentionDays: number;
  transport: string;
  defaultLogType: string;
  

  awsRegion?: string;
  cloudwatchGroup?: string;
  cloudwatchStream?: string;
  datadogApiKey?: string;
}

export const DefaultLoggingConfig: LoggingConfig = {
  serviceName: ServiceName,
  logDirectory: LogDirectory,
  retentionDays: LogRetentionDays,
  transport: LogStore,
  defaultLogType: DefaultLogType,

  awsRegion: AWS_REGION,
  cloudwatchGroup: '', // process.env.CLOUDWATCH_GROUP,
  cloudwatchStream: '', // process.env.CLOUDWATCH_STREAM,
  datadogApiKey: '', // process.env.DATADOG_API_KEY,
};

export interface FormattedPayload extends TransformableInfo {
  meta?: any;
}

winston.addColors({
  critical: "red bold",
  error: "red",
  warn: "yellow",
  info: "green",
  http: "white",
  debug: "white",
  ws: "magenta",
});