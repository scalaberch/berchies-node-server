import { FileTransport, LogPayload, RotatingFileTransport, TransportBase } from './transports';
import { LoggingConfig, DefaultLogType, FormattedPayload } from './config';
import { getEnvVariable } from '@server/env';
import { createLogger, Logger } from 'winston';
import ConsoleTransport from './transports/console';
import CreateLogRotateFile from './transports/file';
import type TransportStream from 'winston-transport';

export class LogGroup {
  private name: string;
  private logger: Logger;

  constructor(name: string, transports: TransportStream[]) {
    this.name = name;

    this.logger = createLogger({
      level: DefaultLogType,
      transports,
    });
  }

  public log(payload: LogPayload) {
    this.logger.log(payload?.level, payload?.message, payload?.meta);
  }

  public getLogGroupName() {
    return this.name;
  }
}

export default {
}
