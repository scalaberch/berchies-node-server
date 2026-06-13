import { generateAccessToken, generateRefreshToken } from '.';

export const generateTokens = (
  sub = '',
  payload = {},
  issuer = 'http://api.localhost',
  audience = '',
) => {
  // generate access token
  const { token: accessToken } = generateAccessToken(sub, payload, issuer, audience);

  // generate refresh token
  const { token: refreshToken } = generateRefreshToken(sub, payload, issuer, audience);

  // output both
  return {
    accessToken,
    refreshToken,
  };
};
