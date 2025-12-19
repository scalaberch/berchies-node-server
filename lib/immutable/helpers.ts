import _ from "lodash";
import axios from "axios";
import { isProductionEnv, apiKey, publishableKey, envs } from "./defines";

/**
 * create rest api axios object
 *
 * @param overrideEnv
 * @param overrideApiKey
 * @returns {Axios}
 */
export const api = (overrideEnv = "", overrideApiKey = "") => {
  const useProductionUrl =
    overrideEnv === "" ? isProductionEnv : overrideEnv === envs.PRODUCTION;
  const baseURL = useProductionUrl
    ? "https://api.immutable.com/"
    : "https://api.sandbox.immutable.com/";
  const immutableApiKey = overrideApiKey.length > 0 ? overrideApiKey : apiKey;

  return axios.create({
    baseURL,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "x-immutable-api-key": immutableApiKey,
      "x-immutable-publishable-key": publishableKey,
    },
  });
};

export default {};
