import winston from 'winston';
import type TransportStream from 'winston-transport';
import { FileTransport, LogPayload, RotatingFileTransport, TransportBase } from './transports';

import { LogGroup } from './logger';
import { ServerConfig } from '@server/defines';
import { LoggingConfig, DefaultLogType, FormattedPayload, DefaultLoggingConfig } from './config';
import ConsoleTransport from './transports/console';
import CreateLogRotateFile from './transports/file';

import { Server } from '../index';
import { AppEnvironments, NodeEnvironments } from '@server/env';

/**
 * application logging system
 *
 */
class AppLog {
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

  // overrides
  private suppressLogs: boolean;

  constructor(config: LoggingConfig) {
    this.suppressLogs = false;

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
      CreateLogRotateFile(
        'http',
        config.defaultLogType,
        config.logDirectory,
        14,
        (info: FormattedPayload) => {
          const payload = info?.payload ?? {};
          return JSON.stringify(payload);
        },
      ),
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

  /**
   * trigger all logging initalization, and if needed to connect to remote do it.
   *
   * @returns {void}
   */
  public initialize(config: ServerConfig, server: Server) {
    // set colors here!!!
    winston.addColors({
      critical: 'red bold',
      error: 'red',
      warn: 'yellow',
      info: 'green',
      http: 'white',
      debug: 'white',
      ws: 'magenta',
    });

    const serverEnv = server.environment;
    if (
      serverEnv.getNodeEnv() === NodeEnvironments.test ||
      serverEnv.getEnv() === AppEnvironments.ci
    ) {
      this.suppressLogs = true;
    }

    // console.log(config);
  }

  /**
   * handle log transport errors
   *
   * @param transport
   * @param err
   */
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

  /**
   * shutdown the logging system. disconnect stuff if needed.
   *
   * @returns {void}
   */
  public async shutdown() {
    // @todo
  }

  /**
   * this is the base method to write to the log
   *
   * @param logGroup
   * @param level
   * @param message
   * @param meta
   * @param showTimestamp
   */
  private writeToLog(
    logGroup: LogGroup,
    level: string,
    message: string,
    meta: any = {},
    showTimestamp = false,
  ) {
    // override if we write the logs
    if (this.suppressLogs) {
      return;
    }

    const payload = { level, message, meta };
    logGroup.log(payload);
  }

  /**
   * log an error message
   *
   * @param message
   * @param error
   * @param throwAsError
   * @returns
   */
  public error(message: string, error: any = {}, throwAsError = true) {
    const log = this.writeToLog(this.errorLog, 'error', message, error);

    if (throwAsError) {
      throw Error(message);
    }

    return log;
  }

  /**
   * log an info message
   *
   * @param message
   * @param data
   * @returns
   */
  public info(message: string, data: any = {}) {
    return this.writeToLog(this.appLog, 'info', message, data);
  }

  /**
   * log a warning message
   *
   * @param message
   * @param data
   * @returns
   */
  public warn(message: string, data: any = {}) {
    return this.writeToLog(this.appLog, 'warn', message, data);
  }

  /**
   * log a system message. which must be clean?
   *
   * @param message
   * @param data
   * @returns
   */
  public system(message: string, data: any = {}) {
    return this.writeToLog(this.appLog, 'debug', message, data);
  }

  /**
   * log an http connection
   *
   * @param payload
   * @returns
   */
  public http(payload: any) {
    return this.writeToLog(this.httpLog, 'debug', '', { payload });
  }
}

export default new AppLog(DefaultLoggingConfig);
