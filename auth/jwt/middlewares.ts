import _ from 'lodash';
import { HttpResponse, HttpRequest, HttpNext } from '@server/modules/http/defines';
import { getAuthBearerToken } from '..';
import { ACCESS_SECRET, REFRESH_SECRET, isAccessTokenInvalid } from '.';
import jwt, { TokenExpiredError } from 'jsonwebtoken';

/**
 * express middleware to parse jwt refresh tokens during route calls.
 * most likely being used on token refresh action
 *
 * @param req
 * @param res
 * @param next
 * @returns
 */
export const preflightRefreshTokenMiddleware = (req: HttpRequest, res: HttpResponse, next: HttpNext) => {
  const refreshToken = getAuthBearerToken(req);
  if (refreshToken === '') {
    return res.status(401).json({ message: 'Token is required.', error: 'missing_token' });
  }

  try {
    const decoded = jwt.verify(refreshToken, REFRESH_SECRET);
    _.set(req, 'refreshTokenData', decoded);
    _.set(req, 'refreshToken', refreshToken);
    next();
  } catch (error) {
    console.error(error);
    return res.status(401).json({ message: error.message, error: 'jwt_decode_error' });
  }
};

/**
 * express middleware to parse jwt access tokens during route calls
 *
 * @param req
 * @param res
 * @param next
 * @returns
 */
export const preflightAccessTokenMiddleware = async (req: HttpRequest, res: HttpResponse, next: HttpNext) => {
  const accessToken = getAuthBearerToken(req);
  if (accessToken === '') {
    return res.status(401).json({ message: 'Token is required.', error: 'missing_token' });
  }

  try {
    const decoded = jwt.verify(accessToken, ACCESS_SECRET);

    // check first if token is force validated.
    const isInvalidated = await isAccessTokenInvalid(accessToken);
    if (isInvalidated) {
      return res
        .status(401)
        .json({ message: 'Token is already invalidated.', error: 'token_invalidated' });
    }

    // assign to request
    _.set(req, 'accessTokenData', decoded);
    _.set(req, 'accessToken', accessToken);
    next();
  } catch (error) {
    let errorType = 'jwt_decode_error';
    let message = error.message;

    if (error instanceof TokenExpiredError) {
      errorType = 'token_expired';
      message = 'Token has already expired.';
    }

    // console.error(error);
    return res.status(401).json({ message, error: errorType });
  }
};
