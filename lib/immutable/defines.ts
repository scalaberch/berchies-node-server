import { isProdEnv, env } from "../../env";
import _ from "lodash"
import Immutable from "@imtbl/sdk"

export const chains = {
  ZKEVM: {
    production: "imtbl-zkevm-mainnet",
    test: "imtbl-zkevm-testnet",
    dev: "imtbl-zkevm-testnet",
  },
  X: {
    production: "imtbl-zkevm-mainnet",
    test: "imtbl-zkevm-testnet",
    dev: "imtbl-zkevm-testnet",
  }
}

export const envs = Immutable.config.Environment
export const mintStatus = {
  PENDING: 'pending',
  SUCCESS: 'succeeded',
  FAILED: 'failed'
}

export const overrideEnvToProduction: boolean = (env.IMX_OVERRIDE_ENV_PRODUCTION === '1') || false;
export const isProductionEnv = overrideEnvToProduction ? true : isProdEnv();
export const passportRedirectUrl = _.get(env, 'IMX_PASSPORT_REDIRECT_URL', '');
export const passportClientId: string = _.get(env, 'IMX_PASSPORT_CLIENT_ID', '');
export const apiKey: string = _.get(env, 'IMX_API_KEY', '');
export const publishableKey: string = _.get(env, 'IMX_PUBLISHABLE_KEY', '');
export const privateKey: string = _.get(env, 'IMX_PRIVATE_KEY', '');
export const chainName: string = _.get(env, 'IMX_CHAIN_NAME', chains.ZKEVM.test);

export const defaultGasOverride = {
  maxPriorityFeePerGas: 10e9,
  maxFeePerGas: 15e9,
  gasLimit: 30000000, // gasLimit: 10e9,
};

// Immutable.config.Environment.PRODUCTION


