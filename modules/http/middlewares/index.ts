import _ from 'lodash'
import { HttpNext, HttpRequest, HttpResponse } from "../defines";
import { output, outputSuccess, outputError, outputAsCsv, outputCreated, redirectToUrl } from "../utils/handlers";
export { default as AccessLog } from "./accessLog"

/**
 * override headers to include custom header that's required by amazon SNS
 * 
 * @param req 
 * @param res 
 * @param next 
 */
export const overrideSNSHeader = function (req: HttpRequest, res: HttpResponse, next: HttpNext) {
  if (req.headers["x-amz-sns-message-type"]) {
    req.headers["content-type"] = "application/json;charset=UTF-8";
  }

  // // if path is telegram/score decode body
  // if (req.path === "/telegram/score" || req.path === "/telegram/score/") {
  //   // change content type
  //   req.headers["content-type"] =
  //     "multipart/form-data; boundary=<calculated when request is sent>";
  // }

  next();
}

/**
 * 
 * @param req 
 * @param res 
 * @param next 
 */
export const applyRequestFunctions = (
  req: HttpRequest,
  res: HttpResponse,
  next: HttpNext
) => {
  // Get basic jwt data
  // req.getJWTData = () => _.get(req, "jwt", null);
  // req.getJWTString = () => getAuthBearerToken(req);

  // // Get cognito data from jwt
  // req.getCognitoData = () => {
  //   const jwt = req.getJWTData();
  //   if (jwt === null) {
  //     return null;
  //   }
  //   return getDataFromAccessTokenPayload(jwt);
  // };

  // Get fetchers
  req.getQuery = (key?: string, fallbackValue?: any) =>
    typeof key === "string" ? _.get(req.query, key, fallbackValue) : req.query;
  req.getParam = (key?: string, fallbackValue?: any) =>
    typeof key === "string" ? _.get(req.params, key, fallbackValue) : req.params;
  req.getBody = (key?: string, fallbackValue = null) =>
    typeof key === "string" ? _.get(req.body, key, fallbackValue) : req.body;

  // getModelPayloadFromBody
  // req.getModelPayloadFromBody = getModelPayloadFromBody(req);

  req.getBodyFromKeys = (keys: Array<string>, forcePrefillValue = false) => {
    const params = {};
    if (keys.length === 0) {
      return params;
    }

    for (const key of keys) {
      params[key] = _.get(req.body, key, forcePrefillValue ? '' : null);
    }

    return params;
  }

  req.metadata = {};

  next();
};

/**
 *
 * @param req
 * @param res
 * @param next
 */
export const applyResponseFunctions = (
  req: HttpRequest,
  res: HttpResponse,
  next: HttpNext
) => {
  res.outputSuccess = (payload: any, message?: string) => outputSuccess(res, message, payload, req.access);
  res.outputJson = (payload: any, code = 200) => output(res, payload, code);
  res.outputError = (message = "Error.", payload?: any, code = 200) => outputError(res, message, payload, code);
  res.outputAsCSV = (dataset: any, fileName?: string) => outputAsCsv(res, dataset, fileName);
  res.outputCreated = (payload: any, message?: string) => outputCreated(res, message, payload, req.access);
  // res.outputDiscordJson = (payload: any, responseType?: number, visibleOnlyToUser?: boolean) => outputAsJson(res, payload, responseType, visibleOnlyToUser);
  res.redirectToUrl = (url: string) => redirectToUrl(res, url)

  next();
};