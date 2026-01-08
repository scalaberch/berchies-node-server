import { ErrorRequestHandler, NextFunction, Request, Response } from "express";
// import Log from "../logs";
import { getRequestIPAddress } from ".";
import { camelCaseToSentence } from "@server/lib/strings";
import { getCurrentTimestamp } from "@server/lib/datetime";
import { createObjectCsvStringifier as createCsv } from "csv-writer";
import {
  HttpRedirectCode,
  HttpError,
  HttpRequest,
  HttpResponse,
  HttpNext,
  DEFAULT_REDIRECT_URL
} from "../defines";

/**
 * output a generic json response
 *
 * @param res
 * @param payload
 * @param code
 * @returns
 */
export const output = (res: HttpResponse, payload: any, code: number = 200) => {
  res.jsonOutput = payload;
  res.status(code).json(payload);
}
  

/**
 * output a generic sucess json response
 *
 * @param res
 * @param message
 * @param payload
 * @param access
 */
export const outputSuccess = (
  res: HttpResponse,
  message: string,
  payload?: any,
  access?: Array<any>
) =>
  output(res, {
    success: true,
    message,
    data: payload,
    access: access,
  });

/**
 * output a "created" json response with 201 http code. good for POST create requests.
 *
 * @param res
 * @param message
 * @param payload
 * @param access
 */
export const outputCreated = (
  res: HttpResponse,
  message: string,
  payload?: any,
  access?: Array<any>
) =>
  output(
    res,
    {
      success: true,
      message,
      data: payload,
      access: access,
    },
    201
  );

/**
 *
 * @param res
 * @param message
 * @param payload
 * @param code
 * @returns
 */
export const outputError = (
  res: HttpResponse,
  message: string,
  payload?: any,
  code = 200
) => {
  return output(
    res,
    {
      success: false,
      message,
      error: payload,
    },
    code
  );
};

/**
 * output a redirect response
 *
 * @param res
 * @param url
 * @param code
 */
export const redirectToUrl = (
  res: HttpResponse,
  url: string,
  code: HttpRedirectCode = HttpRedirectCode.temporary
) => res.status(code).redirect(url);

/**
 * generate a redirect response to be used on a route
 *
 * @param targetUrl
 * @returns
 */
export const generateRouteRedirectToUrl = (targetUrl = DEFAULT_REDIRECT_URL) => {
  return (req: HttpRequest, res: HttpResponse) => {
    return redirectToUrl(res, targetUrl);
  };
};

/**
 * error handler [5xx]
 *
 * @param err
 * @param req
 * @param res
 * @param next
 */
export const errorHandler = (
  err: HttpError,
  req: HttpRequest,
  res: HttpResponse,
  next: HttpNext
): void => {
  const status = err.statusCode || 500; // Set default status code to 500 (Internal Server Error)
  const message = err.message || "Something went wrong."; // Set default message
  const errors: Array<{ field: string; message: string }> = []; // Empty array for collecting errors

  console.log('hahahah')

  // Send error response
  res.status(status).json({
    message,
    errors,
  });

  // If next is called, pass the error to the next error handler
  next(err);
};

/**
 * route not found handler [404]
 *
 * @param req
 * @param res
 * @param next
 */
export const notFoundHandler = (req: HttpRequest, res: HttpResponse, next?: HttpNext) => {
  res.status(404).json({
    message: `Route '${req.path}' not found.`,
  });
};

/**
 *
 * @param req
 * @param res
 * @param next
 */
export const tooManyRequestsHandler = (
  req: HttpRequest,
  res: HttpResponse,
  next: HttpNext,
  options: any
) => {
  res.status(options.statusCode).json({
    message: `Too many requests! Please try again in a few moments.`,
  });
};

/**
 * handler for non-authorized requests [401]
 * this means requests dont have authorization or not logged in
 *
 * @param req
 * @param res
 */
export const notAuthHandler = (
  req: HttpRequest,
  res: HttpResponse,
  customMsg: string = ""
) =>
  output(
    res,
    {
      message:
        customMsg === "" ? `Access to '${req.path}' requires authorization.` : customMsg,
      error: "unauthorized",
    },
    401
  );

/**
 * handler for not-allowed requests [403]
 * user *might* be logged in, but user doesn't have access required to the resource
 * (most likely resource has elevated privileges like admin, etc)
 *
 * @param req
 * @param res
 */
export const notAllowedHandler = (
  req: HttpRequest,
  res: HttpResponse,
  customMsg: string = ""
) =>
  output(
    res,
    {
      message: customMsg === "" ? `Access to '${req.path}' is not allowed.` : customMsg,
      error: "forbidden",
    },
    403
  );

/**
 * middleware for auto http requests logging :)
 *
 * @param req
 * @param res
 * @param next
 */
export const httpRequestLog = async (
  req: HttpRequest,
  res: HttpResponse,
  next: HttpNext
) => {
  const { originalUrl, method, headers } = req;
  const ipAddress = getRequestIPAddress(req);
  const userAgent: string = headers["user-agent"];

  if (userAgent === "ELB-HealthChecker/2.0") {
    return next();
  }

  // console.log("requesting...")
  const body = method === "POST" || method === "PUT" ? req.body : {};

  // Log.http(`${method} ${originalUrl}`, {
  //   ipAddress,
  //   userAgent,
  //   headers,
  //   body,
  // });

  next();
};

/**
 * output as a csv report
 *
 * @param res
 * @param dataset
 * @param outputName
 */
export const outputAsCsv = async (
  res: HttpResponse,
  dataset: Array<any>,
  outputName = ""
) => {
  // Auto generate the header
  const firstItem = dataset.length > 0 ? dataset[0] : {};
  const header = Object.keys(firstItem).map((key) => ({
    id: key,
    title: camelCaseToSentence(key),
  }));

  // Create csv dataset.
  const csvStringifier = createCsv({ header });
  const csvHeader = csvStringifier.getHeaderString();
  const csvRows = csvStringifier.stringifyRecords(dataset);
  const csvContent = csvHeader + csvRows;

  // Output the csv file.
  const fileName = outputName.length > 0 ? outputName : getCurrentTimestamp();
  res.header("Content-Type", "text/csv");
  res.header("Content-Disposition", `attachment; filename=${fileName}.csv`);
  return res.send(csvContent);
};

export default {};
