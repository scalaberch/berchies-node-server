import { HttpNext, HttpRequest, HttpResponse } from "../defines";
import { Log } from "@server/logs"
import { getRequestIPAddress } from "../utils";

const healthCheckUserAgents = [
  'ELB-HealthChecker/2.0'
]

const sensitiveHeaders = []
const sensitiveBodyFields = [];

/**
 * 
 * @param req 
 * @param res 
 * @param next 
 */
export default function (req: HttpRequest, res: HttpResponse, next: HttpNext) {
  const start = process.hrtime.bigint();
  
  res.on("finish", () => {
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1_000_000;

    // Prepare parameters for logging.
    const { method, originalUrl, headers } = req;
    const { statusCode } = res;
    const ipAddress = getRequestIPAddress(req);
    const userAgent: string = headers['user-agent'];
    const responseTime = `${durationMs.toFixed(2)}ms`

    if (healthCheckUserAgents.indexOf(userAgent) >= 0) {
      return;
    }

    // handle body data if POST/PUT/DELETE
    const body = req?.body ?? {}; // @todo: redact all PII found in body

    // get response data

    Log.http({
      ipAddress,
      method,
      originalUrl,
      statusCode,
      responseTime,
      userAgent,
      headers,
      body
    });
  });

  next();
}
