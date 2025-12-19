import { FormattedPayload } from "../config";
import { format, transports } from "winston";

export interface TransportsConsole extends transports.ConsoleTransportInstance {}

const defaultPrintHandler = (info: FormattedPayload) => {
  const meta = info.meta ? JSON.stringify(info.meta) : "";
  // const logEntry = [info.timestamp, info.message, meta]
  const logEntry = [info.message, meta];
  return logEntry.join(" ");
};

const CreateConsoleTransport = (
  level: string = "debug",
  printf: (info: FormattedPayload) => string = defaultPrintHandler
) => {
  return new transports.Console({
    level,
    format: format.combine(
      format.colorize({ all: true }),
      format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
      format.printf(printf)
    ),
  });
};

export default CreateConsoleTransport