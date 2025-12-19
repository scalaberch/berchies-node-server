import { api } from "./helpers";
import _ from "lodash";
import { getEnvVariable } from "../../env";
import { ERC721Client } from "@imtbl/contracts";
import Imx, { blockchainData } from "@imtbl/sdk";
import { ethers, getDefaultProvider, Wallet, Contract, Signer } from "ethers";
import { Provider, TransactionResponse } from "@ethersproject/providers";
import {
  envs,
  isProductionEnv,
  passportRedirectUrl,
  passportClientId,
  apiKey,
  publishableKey,
  chainName,
  chains,
  privateKey,
  mintStatus,
} from "./defines";

import { sleep } from "../../helpers";
import { generateRandomString } from "../strings";

const providerUrl: string = isProductionEnv
  ? "https://rpc.immutable.com"
  : "https://rpc.testnet.immutable.com";

export const provider: Provider = getDefaultProvider(providerUrl);
const ATTEMPT_TICK_TIME = 5000; // 5 seconds
const MAX_ATTEMPTS = 60; // 12 for 1 minute, so this is 5 minutes

/**
 * create a signer
 *
 */
const createSigner = (): Wallet => {
  return new Wallet(privateKey, provider);
};

/**
 * execute a metadata refresh
 *
 * @param contractAddress
 * @param tokenId
 */
const refreshTokenMetadata = async (
  contractAddress: string,
  tokenId: number | string,
  newMetadata?: {}
) => {
  // Prepare objects
  const _api = api();

  // Send request
  const metadata = { ...newMetadata, token_id: `${tokenId}` };
  const refreshPath = `v1/chains/${chainName}/collections/${contractAddress}/nfts/refresh-metadata`;
  const result = await _api.post(refreshPath, { nft_metadata: [metadata] });

  // console.log(result);

  return {};
};

/**
 * make a ethers.Contract instance
 *
 * @param signer
 * @returns
 */
const makeContractInstance = async (
  contractAddress: string,
  contractInterface: ethers.ContractInterface,
  signer: Signer
) => {
  return new ethers.Contract(contractAddress, contractInterface, signer);
};

/**
 * mint a single token
 *
 * @param contractAddress
 * @param recipient
 * @param referenceId
 * @param metadata
 */
const mintSingle = async (
  contractAddress: string,
  recipient: string,
  metadata = {},
  referenceId = ""
) => {
  // Prepare objects
  const _api = api();
  let attempts = MAX_ATTEMPTS;
  let tokenId = "";
  let transactionHash = "";

  if (referenceId.length === 0) {
    referenceId = generateRandomReferenceId();
  }

  // Create asset payload
  const payload = {
    owner_address: recipient,
    reference_id: referenceId,
    metadata,
  };

  // Send mint request
  const mintPath = `v1/chains/${chainName}/collections/${contractAddress}/nfts/mint-requests`;
  try {
    const result = await _api.post(mintPath, { assets: [payload] });
  } catch (err) {
    console.error(err);
  }

  // Then attempt to poll immutable if request has been successful.
  const statusPath = `v1/chains/${chainName}/collections/${contractAddress}/nfts/mint-requests/${referenceId}`;
  while (attempts > 0) {
    await sleep(ATTEMPT_TICK_TIME);

    // Check api for mint request status
    try {
      const statusRequest = await _api.get(statusPath);
      const { data: statusData } = statusRequest;
      const result = _.get(statusData, "result", []);

      if (result.length > 0) {
        const token = result[0];
        if (token.status === mintStatus.SUCCESS) {
          tokenId = token.token_id;
          transactionHash = token.transaction_hash;
          break;
        }
      }
    } catch (err) {
      console.error(err);
    }

    // console.log(`attempt: ${attempts}`)
    attempts--;
  }

  return {
    tokenId,
    transactionHash,
    referenceId,
  };
};

/**
 * mint a *lot* of tokens
 *
 * @param contractAddress
 * @param assets
 */
const mintBatch = async (contractAddress: string, assets: Array<any>) => {
  // Prepare objects
  const _api = api();

  // Send mint request
  const mintPath = `v1/chains/${chainName}/collections/${contractAddress}/nfts/mint-requests`;
  return _api.post(mintPath, { assets });
};

/**
 * refresh a *lot* of tokens
 *
 * @param contractAddress
 * @param assets
 */
const batchRefreshMetadata = async (
  contractAddress: string,
  nft_metadata: Array<any>
) => {
  // Prepare objects
  const _api = api();

  // Send mint request
  const mintPath = `v1/chains/${chainName}/collections/${contractAddress}/nfts/refresh-metadata`;
  return _api.post(mintPath, { nft_metadata });
};

/**
 *
 * @param contractAddress
 */
const getMintRequests = async (contractAddress: string, cursor = "") => {
  const _api = api();

  // Send mint request
  let mintPath = `v1/chains/${chainName}/collections/${contractAddress}/nfts/mint-requests`;
  if (cursor.length > 0) {
    mintPath += `?page_cursor=${cursor}`;
  }

  try {
    const apiResult = await _api.get(mintPath);
    const { data } = apiResult;

    // Get dataset
    return data;
  } catch (err) {
    console.error(err);
    return [];
  }
};

/**
 * generate a random 32-character string to be used as reference id
 *
 * @returns
 */
const generateRandomReferenceId = () =>
  `${getEnvVariable("PROJ_NAME")}-${generateRandomString(32)}`;

/**
 *
 * @param contractAddress
 * @param walletAddress
 */
const burnAllTokensFromWallet = async (
  contractAddress: string,
  walletAddress: string
) => {
  // First get all tokens from the wallet.
  // If no tokens exist from this wallet address then skip
  // Otherwise create a payload to send all tokens listed to burn
};

/**
 *
 * @param contractAddress
 * @param walletAddress
 * @param tokenId
 */
const burnSingleTokenFromWallet = async (
  contractAddress: string,
  walletAddress: string,
  tokenId: number | string
) => {};

const requestBurnToken = async (
  signer: Signer,
  contractAddress: string,
  tokenIds: Array<number | string | bigint>
) => {
  if (tokenIds.length === 0) {
    return null;
  }

  const sender = await signer.getAddress();
  // console.log(`sender: ${sender}`);

  const contract = await makeContractInstance(
    contractAddress,
    ["function burnBatch(uint256[] tokenIds)"],
    signer
  );

  // const transaction = await contract.burnBatch(tokenIds);
  // return transaction.wait();
};

export default {
  provider,
  providerUrl,
  createSigner,
  mintSingle,
  refreshTokenMetadata,
  requestBurnToken,
  getMintRequests,
  mintBatch,
  batchRefreshMetadata,
};
