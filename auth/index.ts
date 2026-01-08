import _ from 'lodash';
import { decodeBase64String } from '@server/lib/strings';
import { Request } from 'express';

interface BasicAuthData {
  user: string;
  pass: string;
}

export const URL_AUTH_QUERY_PARAM = 'accessToken';

/**
 * gets the auth bearer token from the headers
 *
 * @param request
 * @returns
 */
export const getAuthBearerToken = (request: Request): string => {
  const bearerString = (request.headers?.authorization || '').trim();
  if (bearerString.substring(0, 6).toLowerCase() !== 'bearer') {
    return '';
  }

  const bearerData = bearerString.split(' ');
  const bearer = bearerData.length > 1 ? bearerData[1].trim() : '';
  return bearer;
};

/**
 * gets the basic auth data from the headers
 *
 * @param request
 * @returns
 */
export const getBasicAuthData = (request: Request): BasicAuthData | null => {
  const bearerString = (request.headers?.authorization || '').trim();
  if (bearerString.substring(0, 6).toLowerCase() !== 'basic') {
    return null;
  }

  const bearerData = bearerString.split(' ');
  const base64Credentials = bearerData.length > 1 ? bearerData[1].trim() : '';
  const decoded = decodeBase64String(base64Credentials);
  const [user, ...passParts] = decoded.split(':');
  const pass = passParts.join(':'); // Handles passwords that contain colons

  if (!user || !pass) return null;
  return { user, pass };
};

/**
 * gets an auth token from url. (i.e. www.url.com/?token=SOMETHING_IS_HERE)
 *
 * @param request
 * @returns
 */
export const getAuthTokenFromUrl = (request: Request): string =>
  _.get(request.query, URL_AUTH_QUERY_PARAM, '') as string;
