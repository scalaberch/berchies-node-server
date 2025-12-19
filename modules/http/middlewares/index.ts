import { HttpNext, HttpRequest, HttpResponse } from "../defines";
export { default as AccessLog } from "./accessLog"

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
