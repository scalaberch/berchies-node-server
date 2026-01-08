import { IncomingMessage } from 'http';
import { AuthParamJwt } from './defines';
import { validateAccessToken } from '@server/auth/jwt';
import { BaseJWTPayload } from '@server/auth/jwt/defines';
import { getCurrentTimestamp, DateTimeFormats } from '@server/lib/datetime';
import WebsocketClient from './client';

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

export const setupJwtTimeout = (client: WebsocketClient, jwtData: BaseJWTPayload) => {
  const now = Number(getCurrentTimestamp(DateTimeFormats.seconds));
  const { exp } = jwtData;
  const remaining = exp - now;

  return setTimeout(() => {
    client.send({
      response: 'jwtExpired',
      data: { message: 'Your token has already expired.' },
    });
  }, remaining * 1000);
};

export default {
  jwt,
};
