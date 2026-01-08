
export const algorithm = "HS256";
export const invalidAccessTokenPrefix = "invalidAccessTokens";
export const invalidRefreshTokenPrefix = "invalidRefreshTokens";

export enum JWTKind {
  access,
  refresh,
}

export interface BaseJWTPayload {
  sub: string | number; // Subject (user ID)
  iat: number; // Issued At (timestamp)
  exp: number; // Expiration time
  nbf: number; // Not Before
  iss: string; // Issuer - normally the url of the server
  aud: string; // Audience - who's intended for. could be random string or a url
  sid?: string; // session id
}