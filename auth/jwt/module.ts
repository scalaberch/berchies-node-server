import { DateTimeFormats, getCurrentTimestamp } from '@server/lib/datetime';
import { BaseJWTPayload } from './defines';

export class JWTAuthClass {
  private accessToken: string;
  private refreshToken: string;
  private valid: boolean;

  constructor() {
    this.accessToken = '';
    this.refreshToken = '';
    this.valid = false;
  }

  getAccessToken() {
    return this.accessToken;
  }

  getRefreshToken() {
    return this.refreshToken;
  }

  toObject() {}

  isAccessTokenExpired() {}

  isRefreshTokenExpired() {}

  generate(payload = {}) {}

  refresh(payload = {}) {
    // const { jti, sub, iss, player, aud } = refreshTokenData;
    // // Issue access token.
    // const { token: accessToken, jti: accessJti } = generateAccessToken(
    //   sub,
    //   payload,
    //   iss,
    //   aud,
    // );
    // return accessToken;
  }

  private calculateRemainingTime(jwtData: BaseJWTPayload) {
    const now = Number(getCurrentTimestamp(DateTimeFormats.seconds));
    const { exp } = jwtData;
    const remaining = exp - now;
    return remaining > 0 ? remaining : 0;
  }
}
