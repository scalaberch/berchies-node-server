import { IncomingMessage } from 'http';
import { AuthParamJwt } from './defines';
import { generateAccessToken, validateAccessToken, validateRefreshToken } from '@server/auth/jwt';
import { BaseJWTPayload } from '@server/auth/jwt/defines';
import { getCurrentTimestamp, DateTimeFormats } from '@server/lib/datetime';
import WebsocketClient from './client';
import { HttpRequest } from '../http/defines';

const getUrlParams = (req: IncomingMessage) => {
  const fullUrl = new URL(req.url, `http://${req.headers.host}`);
  const params = fullUrl.searchParams;
  return params;
};

export const jwt = async (req: IncomingMessage) => {
  const params = getUrlParams(req);
  const token = params.get(AuthParamJwt) || '';
  const validationResponse = await validateAccessToken(token);
  return validationResponse;
};

export const setupJwtTimeout = (client: WebsocketClient, jwtData: BaseJWTPayload, req: HttpRequest) => {
  const autoRefreshJwt = client.module.autoRefreshJwt;
  const now = Number(getCurrentTimestamp(DateTimeFormats.seconds));
  const { exp } = jwtData;
  const remaining = exp - now;

  return setTimeout(() => {
    if (autoRefreshJwt) {
      doRefreshJwt(req)
    } else {
      client.send({
        response: 'jwtExpired',
        data: { message: 'Your token has already expired.' },
      });

      client.close();
    }
  }, remaining * 1000);
};

const doRefreshJwt = async (req: HttpRequest) => {
  const refreshToken = req.getCookie("c_refresh_token");
  if (refreshToken === "") {
    return false;
  }

  const refreshTokenData = await validateRefreshToken(refreshToken);
  if (!refreshTokenData.valid) {
    return false;
  }

  const { jti, sub, iss, aud } = refreshTokenData.data;
  const { token: accessToken } = generateAccessToken(sub, { }, iss, aud);
  // req
  return true;
}

export default {
  jwt,
};
