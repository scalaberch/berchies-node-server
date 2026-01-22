import { getEnvVariable } from '@server/env';

const awsRegion: string = getEnvVariable('AWS_DEFAULT_REGION', false, 'eu-central-1');
const cognitoPoolId: string = getEnvVariable('AWS_COGNITO_POOL_ID', false, '');

export const jwkSources = {
  IMMUTABLE: 'https://auth.immutable.com/.well-known/jwks.json',
  COGNITO: `https://cognito-idp.${awsRegion}.amazonaws.com/${cognitoPoolId}/.well-known/jwks.json`,
};
