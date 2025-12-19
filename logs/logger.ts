import { FileTransport, LogPayload, RotatingFileTransport, TransportBase } from './transports';
import { LoggingConfig, DefaultLogType, FormattedPayload } from './config';
import { getEnvVariable } from '@server/env';
import { createLogger, Logger } from 'winston';
import ConsoleTransport from './transports/console';
import CreateLogRotateFile from './transports/file';
import type TransportStream from 'winston-transport';

class LogGroup {
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

export class AppLogger {
  protected selectedTransport: string;

  // log groups
  private appLog: LogGroup;
  private errorLog: LogGroup;
  private httpLog: LogGroup;
  private wsLog: LogGroup;

  // transports
  private consoleTransport: TransportStream;
  private fileTransport: TransportStream;
  private remoteTransport;

  constructor(config: LoggingConfig) {

    // set base transports
    this.consoleTransport = ConsoleTransport(config.defaultLogType);

    // setup separate logs
    this.appLog = new LogGroup('app', [
      this.consoleTransport,
      CreateLogRotateFile('app', config.defaultLogType, config.logDirectory, config.retentionDays),
    ]);
    this.errorLog = new LogGroup('error', [
      this.consoleTransport,
      CreateLogRotateFile(
        'error',
        config.defaultLogType,
        config.logDirectory,
        config.retentionDays,
      ),
    ]);
    this.httpLog = new LogGroup('http', [
      CreateLogRotateFile('http', config.defaultLogType, config.logDirectory, 14, (info: FormattedPayload) => {
        const payload = info?.payload ?? {};
        return JSON.stringify(payload);
      }),
    ]);

    // Then check selected transport mode
    this.selectedTransport = config?.transport ?? 'file';
    switch (
      this.selectedTransport
      //   case "datadog":
      //     // const dd = new DatadogTransport(config.datadogApiKey);
      //     // dd.onError = (err) => this.handleTransportError(dd, err);
      //     // this.transports.push(dd);
      //     break;
      //   case "aws":
      //   case "aws-cloudwatch":
      //     // const cloud = new CloudWatchTransport({
      //     //   region: config.awsRegion,
      //     //   group: config.cloudwatchGroup,
      //     //   stream: config.cloudwatchStream,
      //     // });
      //     // cloud.onError = (err) => this.handleTransportError(cloud, err);
      //     // this.transports.push(cloud);
      //     break;
    ) {
    }
  }

  private handleTransportError(transport: TransportBase, err: Error) {
    // // Fallback behavior:
    // this.fileTransport.log({
    //   level: "error",
    //   message: `Transport failed: ${err.message}`,
    //   meta: { transport: transport.constructor.name },
    // });
    // // Remove the broken cloud transport
    // this.transports = this.transports.filter((t) => t !== transport);
  }

  public async shutdown() {
    // @todo
  }

  ///////

  private writeToLog(
    logGroup: LogGroup,
    level: string,
    message: string,
    meta: any = {},
    showTimestamp = false,
  ) {
    const payload = { level, message, meta };
    logGroup.log(payload);
  }

  public error(message: string, error: any = {}) {
    return this.writeToLog(this.errorLog, 'error', message, error);
  }

  public info(message: string, data: any = {}) {
    return this.writeToLog(this.appLog, 'info', message, data);
  }

  public warn(message: string, data: any = {}) {
    return this.writeToLog(this.appLog, 'warn', message, data);
  }

  public system(message: string, data: any = {}) {
    return this.writeToLog(this.appLog, 'debug', message, data);
  }

  public http(payload: any) {
    return this.writeToLog(this.httpLog, 'debug', '', { payload });
  }
}
