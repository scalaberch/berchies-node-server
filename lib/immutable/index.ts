import _ from "lodash";
import axios, { Axios } from "axios";
import { env } from "../../env";
import { getDefaultProvider, Wallet, Contract } from "ethers";
import { Provider, TransactionResponse } from "@ethersproject/providers";
import { ERC721Client } from "@imtbl/contracts";
import Imx, { blockchainData } from "@imtbl/sdk";
import {
  ImxTraitInterface,
  ImxMetadataInterfaceObject,
  ImxMetadataMapInterfaceObject,
} from "./interfaces";
import {
  isProductionEnv,
  passportRedirectUrl,
  passportClientId,
  apiKey,
  publishableKey,
  chainName,
  defaultGasOverride,
  chains,
} from "./defines";
// import Legacy from "./legacy"
import Tokens from "./tokens";

// interface export shortcuts
export interface ImxTrait extends ImxTraitInterface {}
export interface ImxMetadataInterface extends ImxMetadataInterfaceObject {}
export interface ImxMetadataMap<T extends object>
  extends ImxMetadataMapInterfaceObject<T> {}
export const Chains = chains;

export const providerUrl: string = isProductionEnv
  ? "https://rpc.immutable.com"
  : "https://rpc.testnet.immutable.com";

export const provider: Provider = getDefaultProvider(providerUrl);

const { config, passport, x, orderbook, checkout } = Imx;

/**
 * initialize an SDK client
 *
 * @returns {blockchainData.BlockchainData}
 */
const init = () => {
  const blockchainClient = createBlockChainClient(apiKey, publishableKey);

  return {
    blockchainClient,
  };
};

/**
 * creates an instance of imx's blockchain client
 *
 * @param apiKey
 * @param publishableKey
 * @returns {blockchainData.BlockchainData}
 */
const createBlockChainClient = (
  apiKey: string,
  publishableKey: string
): blockchainData.BlockchainData => {
  return new blockchainData.BlockchainData({
    baseConfig: {
      environment: isProductionEnv
        ? config.Environment.PRODUCTION
        : config.Environment.SANDBOX,
      apiKey,
      publishableKey,
    },
  });
};

/**
 * create rest api axios object
 *
 * @returns {Axios}
 */
export const restApi = axios.create({
  baseURL: isProductionEnv
    ? `https://api.immutable.com/v1/chains/${chainName}/`
    : `https://api.sandbox.immutable.com/v1/chains/${chainName}/`,
  headers: {
    "x-immutable-api-key": apiKey,
  },
});

/**
 * DO NOT USE. as of 17/09 listActivites has a bug on `activityType` not accepting "mint" as a value for some reason.
 *
 * @deprecated
 * @param txHash
 */
const getMintTransaction = async (
  contractAddress: string,
  transactionHash: string
) => {
  const client = createBlockChainClient(apiKey, publishableKey);

  const response = await client.listActivities({
    chainName,
    contractAddress,
    // activityType: "mint",
    transactionHash, 
  });

  const { result } = response;
  const verified = result.length > 0;
  const entries = result.map((item) => item.details);

  return {
    verified,
    entries: entries,
    response
  };
};

/**
 * @todo to implement
 */
const refreshMetadata = async (
  contractAddress: string,
  tokenId: string,
  metadata: string
) => {
  //const blockchainClient = createBlockChainClient(apiKey, publishableKey);

  const newMetadata = [
    typeof metadata === "string" ? JSON.parse(metadata) : metadata,
  ];
  /*
  const updatedNft = await blockchainClient.refreshNFTMetadata({
    chainName
    contractAddress,
    refreshNFTMetadataByTokenIDRequest: {
      nft_metadata: newMetadata,
    },
  });
   */

  const { data } = await restApi.post(
    `collections/${contractAddress}/nfts/refresh-metadata`,
    { nft_metadata: newMetadata }
  );
  return data;
};

/**
 * checks if a contract has a minter role, given a wallet address
 *
 * @param contract
 * @param wallet
 * @returns
 */
const doesContractHasMinterRole = async (
  contract: ERC721Client,
  wallet: Wallet
) => {
  const minterRole = await contract.MINTER_ROLE(provider);
  const hasMinterRole = await contract.hasRole(
    provider,
    minterRole,
    wallet.address
  );

  return hasMinterRole;
};

/**
 * calls immutable to do a batch mint with given token id's
 *
 * @param contractAddress
 * @param walletPrivateKey
 * @param payload
 * @param gasOverride
 * @returns
 */
const mintBatchWithTokenId = async (
  contractAddress: string,
  walletPrivateKey: string,
  payload: Array<any>,
  confirmations?: number,
  gasOverride?: any
) => {
  const contract = new ERC721Client(contractAddress);
  const wallet = new Wallet(walletPrivateKey, provider);
  const hasRole = await doesContractHasMinterRole(contract, wallet);

  if (!hasRole) {
    return Promise.reject(
      new Error("Account doesnt have permissions to mint.")
    );
  }

  const gasOverrides = { ...defaultGasOverride, ...gasOverride };
  const populatedTransaction = await contract.populateMintBatch(
    payload,
    gasOverrides
  );

  const result = await wallet.sendTransaction(populatedTransaction);

  // then listen if there's something
  if (confirmations === undefined) {
    return Promise.resolve(result);
  }

  const { wait } = result; // hash is the transaction hash,
  try {
    await wait(confirmations);
    return Promise.resolve(result);
  } catch (err) {
    return Promise.reject(err);
  }
};

/**
 * calls immutable to do a mint batch with given quantity.
 *
 * @param contractAddress
 * @param walletPrivateKey
 * @param recipient
 * @param mintCount
 * @param gasOverride
 * @returns
 */
const mintByQuantity = async (
  contractAddress: string,
  walletPrivateKey: string,
  recipient: string,
  mintCount: number,
  confirmations?: number,
  gasOverride?: any
) => {
  const contract = new ERC721Client(contractAddress);
  const wallet = new Wallet(walletPrivateKey, provider);
  const hasRole = await doesContractHasMinterRole(contract, wallet);

  if (!hasRole) {
    return Promise.reject(
      new Error("Account doesnt have permissions to mint.")
    );
  }

  const gasOverrides = { ...defaultGasOverride, ...gasOverride };
  const populatedTransaction = await contract.populateMintByQuantity(
    recipient,
    mintCount,
    gasOverrides
  );
  const result = await wallet.sendTransaction(populatedTransaction);

  // then listen if there's something
  if (confirmations === undefined) {
    return Promise.resolve(result);
  }

  const { wait } = result; // hash is the transaction hash,
  await wait(confirmations);
  return Promise.resolve(result);
};

/**
 * get token information by token id
 *
 * @param tokenId
 * @param contractAddress
 */
const getTokenById = async (tokenId: string, contractAddress: string, overrideProduction = false) => {
  const client = createBlockChainClient(apiKey, publishableKey);

  const token = await client.getNFT({
    chainName,
    contractAddress,
    tokenId,
  });

  return token?.result || null;
};

/**
 * gets all owned nft's of an account/wallet address
 *
 * @param accountAddress - The account/wallet address
 * @param contractAddress
 */
const getWalletAddressNfts = async (
  accountAddress: string,
  contractAddress: string,
  perPage?: number,
  nextCursor?: string
) => {
  const client = createBlockChainClient(apiKey, publishableKey);
  const params = {
    accountAddress,
    chainName,
    contractAddress,

    // pageCursor: ""
    pageSize: isNaN(perPage) ? 10 : perPage,
  };

  const data = await client.listNFTsByAccountAddress(params);
  return data;
};

/**
 * get list of nfts
 *
 * @param walletAddress
 * @param collection
 * @param countPerPage
 * @param nextCursor
 * @returns
 */
const getPlayerNfts = async (
  player: any,
  collection: string,
  countPerPage = 10,
  nextCursor?: string
) => {
  const endpointUrl = isProductionEnv
    ? `https://api.immutable.com/v1/chains/${chainName}/accounts/${player}/nfts`
    : `https://api.sandbox.immutable.com/v1/chains/${chainName}/accounts/${player}/nfts`;

  if (!collection) {
    return null;
  }

  const params = {
    contract_address: collection,
    page_size: countPerPage,
  };

  if (typeof nextCursor === 'string' && nextCursor.length > 0) {
    params["page_cursor"] = nextCursor;
  }

  const options = {
    method: "GET",
    url: endpointUrl,
    params,
    headers: { Accept: "application/json" },
  };

  try {
    const { data } = await axios.request(options);
    return data;
  } catch (error) {
    return null;
  }
};

/**
 * gets an immutable user's details using his jwt token
 *
 * @param jwtInput
 * @returns
 */
const getUserDetailsByJwt = async (jwtInput: string) => {
  const endpointUrl = isProductionEnv
    ? "https://api.immutable.com/passport-profile/v1/user/info"
    : "https://api.sandbox.immutable.com/passport-profile/v1/user/info";

  const options = {
    method: "GET",
    url: endpointUrl,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${jwtInput}`,
    },
  };

  try {
    const { data } = await axios.request(options);
    return data;
  } catch (error) {
    return null;
  }
};

const isTokenOwnedByPlayer = async (
  passportAddress: string,
  token: string | number,
  collection: string
) => {
  const url = `collections/${collection}/nfts/${token}/owners`;
  const { data } = await restApi.get(url);
  const result = _.get(data, "result", []) as Array<any>;
  if (result.length === 0) {
    return false;
  }

  const [account] = result;
  return (
    account.account_address.toLowerCase() === passportAddress.toLowerCase()
  );
};

/**
 * get list of nfts with the given parameters
 *
 * @param walletAddress
 * @param collection
 * @param countPerPage
 * @param nextCursor
 * @returns
 */
const getNfts = async (
  walletAddress: string,
  contractAddress: string,
  countPerPage = 10,
  nextCursor = ""
) => {
  const endpointUrl = isProductionEnv
    ? `https://api.immutable.com/v1/chains/${chainName}/accounts/${walletAddress}/nfts`
    : `https://api.sandbox.immutable.com/v1/chains/${chainName}/accounts/${walletAddress}/nfts`;

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
const getAllTokens = async (contractAddress: string, walletAddress: string) => {
  let tokens = [];
  let nextCursor = "";

  do {
    const nfts = await getNfts(walletAddress, contractAddress, 50, nextCursor);
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
 * 
 * @param chainData 
 * @returns 
 */
const isChainZkevm = async (chainName: any) => {
  return chainName === Chains.ZKEVM.production || chainName === Chains.ZKEVM.test
}

/**
 * 
 * @param envKey
 * @returns
 */
const getTokenFromEnv = (envKey: string) => _.get(env, envKey, "") as string;

export default {
  init,
  getNfts,
  getAllTokens,
  mintBatchWithTokenId,
  mintByQuantity,
  refreshMetadata,
  getMintTransaction,

  getTokenById,
  getWalletAddressNfts,
  getUserDetailsByJwt,
  getPlayerNfts,
  isTokenOwnedByPlayer,
  isChainZkevm,

  // legacy: Legacy,
  tokens: Tokens,
  getTokenFromEnv
};
