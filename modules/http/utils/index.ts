import { HttpRequest } from "../defines";

/**
 * get a request's ip address.
 *
 * @param req
 */
export const getRequestIPAddress = (req: HttpRequest) => {
  let ips =
    req.headers["cf-connecting-ip"] ||
    req.headers["x-real-ip"] ||
    req.headers["x-forwarded-for"] ||
    req.socket.remoteAddress ||
    req.ip ||
    "";

  return ips;
};
