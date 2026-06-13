import { format, transports } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { LogDirectory, ServiceName, FormattedPayload } from '../config';
import { isProductionEnv } from '@server/env';

const defaultPrintHandler = (info: FormattedPayload) => {
  const meta = info.meta ? JSON.stringify(info.meta) : '';
  const logEntry = [info.timestamp, `[${info.level}]`, info.message, meta];
  return logEntry.join(' ');
};

const CreateLogRotateFile = (
  tag = '',
  level: string = "debug",
  dirname = LogDirectory,
  retentionDays = 30,
  printf: (info: FormattedPayload) => string = defaultPrintHandler,
  errorHandler: (err: Error) => void = (err: Error) => {},
  onRotate: (oldFilename: string, newFilename: string) => void = (oldFilename: string, newFilename: string) => {}
) => {
  const filename = [ServiceName, tag, '%DATE%.log'].filter((s) => s.length > 0).join('-');
  const rotateFileConfig = {
    dirname,
    filename, // : `${ServiceName}-${tag}-%DATE%.log`
    datePattern: 'YYYY-MM-DD',
    maxFiles: `${retentionDays}d`,
    zippedArchive: true,
    handleExceptions: true,
    level,

    format: format.combine(
      format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
      format.printf(printf)
    ),
  };

  const transport = new DailyRotateFile(rotateFileConfig);
  transport.on("error", errorHandler);
  transport.on("rotate", onRotate);

  return transport;
};

export default CreateLogRotateFile