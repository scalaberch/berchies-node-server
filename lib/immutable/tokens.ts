import axios from "axios";
import _ from "lodash";
import { isProductionEnv, chainName, chains } from "./defines";

/**
 * get list of nfts
 *
 * @param walletAddress
 * @param collection
 * @param countPerPage
 * @param nextCursor
 * @param overrideProduction
 * @returns
 */
const getNfts = async (
  walletAddress: string,
  contractAddress: string,
  countPerPage = 10,
  nextCursor = "",
  overrideProduction = false
) => {
  const isProd = overrideProduction ? true : isProductionEnv;
  const chain = overrideProduction ? chains.ZKEVM.production : chainName;

  const endpointUrl = isProd
    ? `https://api.immutable.com/v1/chains/${chain}/accounts/${walletAddress}/nfts`
    : `https://api.sandbox.immutable.com/v1/chains/${chain}/accounts/${walletAddress}/nfts`;

  if (!contractAddress) {
    return null;
  }

  const params = {
    contract_address: contractAddress,
    page_size: countPerPage,
  };

  if (nextCursor.length > 0) {
    params["page_cursor"] = nextCursor;
  }

  const options = {
    method: "GET",
    url: endpointUrl,
    params,
  };

  try {
    const { data } = await axios.request(options);
    return data;
  } catch (error) {
    return null;
  }
};

/**
 * gets ALL of the tokens of a wallet.
 * basically iterates through the api and fetch all data since as of (6/26/2024)
 *
 * @param contractAddress
 * @param walletAddress
 */
const getAllTokens = async (
  contractAddress: string,
  walletAddress: string,
  overrideProduction = false,
  perPage = 50
) => {
  let tokens = [];
  let nextCursor = "";

  do {
    const nfts = await getNfts(
      walletAddress,
      contractAddress,
      perPage,
      nextCursor,
      overrideProduction
    );
    if (nfts === null) {
      break;
    }

    const { page, result } = nfts;
    tokens = tokens.concat(result);
    nextCursor = page.next_cursor === null ? "" : page.next_cursor;
  } while (nextCursor.length > 0);

  return tokens;
};

/**
 * get token information by token id
 *
 * @param tokenId
 * @param walletAddress
 * @param contractAddress
 */
const getTokenById = async (
  tokenId: string | number,
  contractAddress: string,
  overrideProduction = false
) => {
  const isProd = overrideProduction ? true : isProductionEnv;
  const chain = overrideProduction ? chains.ZKEVM.production : chainName;

  const endpointUrl = isProd
    ? `https://api.immutable.com/v1/chains/${chain}/collections/${contractAddress}/nfts/${tokenId}`
    : `https://api.sandbox.immutable.com/v1/chains/${chain}/collections/${contractAddress}/nfts/${tokenId}`;

  const options = {
    method: "GET",
    url: endpointUrl,
  };

  try {
    const { data } = await axios.request(options);
    return _.get(data, "result", null);
  } catch (error) {
    return null;
  }
};

/**
 *
 * @param passportAddress
 * @param token
 * @param collection
 * @param overrideProduction
 */
const isTokenOwnedByWallet = async (
  passportAddress: string,
  token: string | number,
  collection: string,
  overrideProduction = false
) => {
  const isProd = overrideProduction ? true : isProductionEnv;
  const chain = overrideProduction ? chains.ZKEVM.production : chainName;

  const endpointUrl = isProd
    ? `https://api.immutable.com/v1/chains/${chain}/collections/${collection}/nfts/${token}/owners`
    : `https://api.sandbox.immutable.com/v1/chains/${chain}/collections/${collection}/nfts/${token}/owners`;

  const options = {
    method: "GET",
    url: endpointUrl,
  };

  try {
    const { data } = await axios.request(options);
    const result = _.get(data, "result", []) as Array<any>;
    if (result.length === 0) {
      return false;
    }

    const [account] = result;
    return (
      account.account_address.toLowerCase() === passportAddress.toLowerCase()
    );
  } catch (error) {
    return false;
  }
};

/**
 *
 * @param passportAddress
 * @param overrideProduction
 */
const getWalletCollections = async (
  passportAddress: string,
  overrideProduction = false
) => {
  const isProd = overrideProduction ? true : isProductionEnv;
  const chain = overrideProduction ? chains.ZKEVM.production : chainName;

  const endpointUrl = isProd
    ? `https://api.immutable.com/v1/chains/${chain}/accounts/${passportAddress}/collections`
    : `https://api.sandbox.immutable.com/v1/chains/${chain}/accounts/${passportAddress}/collections`;

  const options = {
    method: "GET",
    url: endpointUrl,
  };

  try {
    const { data } = await axios.request(options);
    const result = _.get(data, "result", []) as Array<any>;
    return result;
  } catch (error) {
    return [];
  }
};

export default {
  getNfts,
  getAllTokens,
  getTokenById,
  isTokenOwnedByWallet,
  getWalletCollections
};
