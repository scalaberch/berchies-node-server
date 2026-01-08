import _ from 'lodash';
import moment from 'moment-timezone';
import { cache, isCacheActive } from '@server/modules/cache';
import { getEnvVariable as getEnv, getEnvVariable, isDevEnv } from '../../env';
import jwt, { TokenExpiredError, JsonWebTokenError, NotBeforeError } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { JWTKind, algorithm, invalidRefreshTokenPrefix, invalidAccessTokenPrefix } from './defines';
import { Log } from '@server/logs';

// tokens and expiry configuration
export const ACCESS_SECRET: string = getEnv('JWT_ACCESS_SECRET', false, '');
export const REFRESH_SECRET: string = getEnv('JWT_REFRESH_SECRET', false, '');
export const ACCESS_EXPIRY: number = getEnv('ACCESS_TOKEN_EXPIRY', true, 1800);
export const REFRESH_EXPIRY: number = getEnv('REFRESH_TOKEN_EXPIRY', true, 2592000);

// some configuration
export const FORCE_ISSUER_HTTPS = getEnv('JWT_FORCE_ISSUER_HTTPS', true, 0) === 1;

export enum JWTErrors {
  expired = 'JWTExpired',
  notActive = 'JWTNotActive',
  invalid = 'JWTInvalid',
  loggedOut = 'JWTLoggedOut',

  // generic errors
  error = 'JWTError',
}

interface ValidationResult {
  valid: boolean;
  data: any | null;
  message: string;
  errorType?: string;
  error?: any;
}

/**
 * validate a token. this handles everything so that you don't need to do try/catch
 *
 * @param token
 * @param secret
 * @returns
 */
export const validateToken = async (token: string, secret = ''): Promise<ValidationResult> => {
  try {
    // 1. Verify Signature and Expiration
    const jwtData = jwt.verify(token, secret);

    // 2. Check Blacklist/Invalidation
    const isInvalid =
      secret === REFRESH_SECRET
        ? await isRefreshTokenInvalid(token)
        : await isAccessTokenInvalid(token);

    if (isInvalid) {
      return {
        valid: false,
        data: null,
        errorType: JWTErrors.loggedOut,
        message: 'Token has already been signed out.',
      };
    }

    // 3. Success
    return {
      valid: true,
      data: jwtData,
      message: 'Token is valid.',
    };
  } catch (err) {
    // 4. Map JWT errors to internal types
    const errorMap: Record<string, { type: string; msg: string }> = {
      TokenExpiredError: { type: JWTErrors.expired, msg: 'Token has already expired.' },
      JsonWebTokenError: {
        type: JWTErrors.invalid,
        msg: 'Token is malformed or signature failed.',
      },
      NotBeforeError: { type: JWTErrors.notActive, msg: 'Token not active yet.' },
    };

    const mapped = errorMap[(err as Error).name] || {
      type: JWTErrors.error,
      msg: 'Token validation failed.',
    };

    return {
      valid: false,
      data: null,
      error: err,
      errorType: mapped.type,
      message: mapped.msg,
    };
  }
};

/**
 * validates the access token and returns the relevant data on validation
 *
 * @param token
 * @returns
 */
export const validateAccessToken = (token: string) => validateToken(token, ACCESS_SECRET);

/**
 * validates the refresh token and returns the relevant data on validation
 *
 * @param token
 * @returns
 */
export const validateRefreshToken = (token: string) => validateToken(token, REFRESH_SECRET);

/**
 * do the actual verification of access token. this is just a wrapper of jwt.verify
 *
 * @param token
 * @returns
 */
export const verifyAccessToken = (token: string) => jwt.verify(token, ACCESS_SECRET);

/**
 * do the actual verification of refresh token. this is just a wrapper of jwt.verify
 *
 * @param token
 * @returns
 */
export const verifyRefreshToken = (token: string) => jwt.verify(token, REFRESH_SECRET);

/**
 * generates a jwt access token
 *
 * @param sub - the user id
 * @param payload - extra payload data. force it to be {} if nothing
 * @param issuer - issuer url
 * @param audience - target audience
 * @returns
 */
export const generateAccessToken = (
  sub: string | number,
  payload = {},
  issuer = 'http://localhost',
  audience = '',
) => {
  const jti = uuidv4();
  const token = jwt.sign(
    {
      jti,
      sub,
      iss: issuer,
      aud: audience,
      ...payload,
    },
    ACCESS_SECRET,
    {
      algorithm,
      expiresIn: ACCESS_EXPIRY,
      notBefore: '0s',
    },
  );

  return { jti, token };
};

/**
 * generates a jwt refresh token
 *
 * @param sub - the user id
 * @param payload - extra payload data. force it to be {} if nothing
 * @param issuer - issuer url
 * @param audience - target audience
 * @returns
 */
export const generateRefreshToken = (
  sub: string | number,
  payload = {},
  issuer = 'http://api.localhost',
  audience = '',
) => {
  const jti = uuidv4();
  const token = jwt.sign(
    {
      jti,
      sub,
      iss: issuer,
      aud: audience,
      ...payload,
    },
    REFRESH_SECRET,
    {
      algorithm,
      expiresIn: REFRESH_EXPIRY,
      notBefore: '0s',
    },
  );

  return { jti, token };
};

/**
 * generates the issuer data based on current domain data.
 *
 * @returns
 */
export const getIssuer = () => {
  const domain = getEnvVariable('DOMAIN', false, 'localhost') as string;
  if (isDevEnv()) {
    return `http${FORCE_ISSUER_HTTPS ? 's' : ''}://creeperbot-node.localhost`;
  }

  return `https://${domain}`;
};

/**
 * checks if a given jwt is inside the invalid list in cache.
 * if cache is not enabled, then automatically it's assumed valid.
 *
 * @param token
 * @param tokenType
 * @returns
 */
const isTokenInvalid = async (token: string, tokenType: JWTKind) => {
  if (!isCacheActive()) {
    // Cache is inactive — assume token is valid
    return false;
  }

  const prefix =
    tokenType === JWTKind.refresh ? invalidRefreshTokenPrefix : invalidAccessTokenPrefix;

  const Cache = cache();
  const keyExists = await Cache.keyExists(`${prefix}:${token}`);
  return keyExists;
};

/**
 * add a token to the invalidated list.
 *
 * @param token
 * @param tokenType
 * @returns
 */
const makeTokenInvalid = async (token: string, tokenType: JWTKind) => {
  if (!isCacheActive()) {
    // Cache is inactive — assume token is valid
    return false;
  }

  try {
    const prefix =
      tokenType === JWTKind.refresh ? invalidRefreshTokenPrefix : invalidAccessTokenPrefix;
    const secret = tokenType === JWTKind.access ? ACCESS_SECRET : REFRESH_SECRET;
    const decoded = jwt.verify(token, secret);

    // get important information
    const jti = _.get(decoded, 'jti', '');
    // const sub = _.get(decoded, 'sub', '');
    const now = Number(moment().format('X'));
    const exp = _.get(decoded, 'exp', 0);
    const remainingTime = exp - now;

    const Cache = cache();
    await Cache.set(`${prefix}:${token}`, jti, { EX: remainingTime });
  } catch (error) {
    Log.error('Token invalidation error: ', error);
    return false;
  }
  return true;
};

/**
 * checks if access token is in the invalidated list.
 *
 * @param accessToken
 * @returns
 */
export const isAccessTokenInvalid = (accessToken: string) =>
  isTokenInvalid(accessToken, JWTKind.access);

/**
 * checks if refresh token is in the invalidated list.
 *
 * @param refreshToken
 * @returns
 */
export const isRefreshTokenInvalid = async (refreshToken: string) =>
  isTokenInvalid(refreshToken, JWTKind.refresh);

/**
 * make access token invalid by adding it to the invalid list
 *
 * @param accessToken
 * @returns
 */
export const makeAccessTokenInvalid = (accessToken: string) =>
  makeTokenInvalid(accessToken, JWTKind.access);

/**
 * make refresh token invalid by adding it to the invalid list
 *
 * @param refreshToken
 * @returns
 */
export const makeRefreshTokenInvalid = (refreshToken: string) =>
  makeTokenInvalid(refreshToken, JWTKind.access);
