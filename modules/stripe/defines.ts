import _ from 'lodash';
import { getEnvVariable } from '@server/env';

export const STRIPE_PUBLIC_KEY = getEnvVariable('STRIPE_PUB_KEY', false, '');
export const STRIPE_SECRET_KEY = getEnvVariable('STRIPE_SECRET_KEY', false, '');
export const STRIPE_CALLBACK_URI = getEnvVariable('STRIPE_CALLBACK_URI', false, '/stripe/callback');