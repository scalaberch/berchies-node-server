import Moralis from "moralis";
import { getEnvVariable } from "@server/env";

let _started: boolean = false;
const MORALIS_API_KEY: string = getEnvVariable("MORALIS_API_KEY");
const EvmChains = Moralis.EvmUtils.EvmChain;
const chain = EvmChains.CRONOS;

/**
 * initialize moralis
 * 
 */
const init = async () => {
  await Moralis.start({
    apiKey: MORALIS_API_KEY,
  });

  _started = true;
  return Moralis;
};

/**
 * Checks if a transaction hash is successful/confirmed.
 * Note: on the free plan in Moralis, you have 4000 daily CUs (150 CU/sec)
 *  and this request costs 5 CUs per call.
 *
 * @param transactionHash
 * @returns
 */
const getTransactionData = async (transactionHash: string) => {
  try {
    const response = await Moralis.EvmApi.transaction.getTransactionVerbose({
      chain,
      transactionHash,
    });

    return response === null ? null : response.result;
  } catch (err) {
    // console.error(err);
    return null;
  }
};

/**
 * Checks if a transaction hash is successful/confirmed
 *
 * @param transactionHash
 * @returns
 */
const isTransactionSuccess = async (transactionHash: string) => {
  try {
    const response = await Moralis.EvmApi.transaction.getTransactionVerbose({
      chain,
      transactionHash,
    });

    if (response === null) {
      return false;
    }

    const result = response.result;
    const isSuccess = result.blockHash && result.receiptStatus === 1;

    return isSuccess;
  } catch (err) {
    console.error(err);
    return false;
  }
};

/**
 * Checks if the token is already owned by the wallet address.
 *
 * @param tokenId
 * @param tokenAddress
 * @param walletAddress
 */
const isTokenAlreadyInAddress = async (
  tokenId: string,
  tokenAddress: string,
  walletAddress: string
) => {
  try {
    const response = await Moralis.EvmApi.nft.getWalletNFTs({
      chain,
      format: "decimal",
      address: walletAddress,
    });
    const filtered = response.result.filter(
      (nft) => nft.tokenId === tokenId && nft.tokenAddress.equals(tokenAddress)
    );
    return filtered.length > 0;
  } catch (err) {
    console.error(err);
    return false;
  }
};

/**
 *
 * @param transactionHash
 * @param tokens
 */
const matchTransactionTokens = async (
  transactionHash: string,
  contractAddress: string,
  tokens: string[] | number[]
) => {
  try {
    const response = await Moralis.EvmApi.transaction.getTransactionVerbose({
      chain,
      transactionHash,
    });

    const result = response.result;
    const isSuccess = result.blockHash && result.receiptStatus === 1;

    const { logs } = result;
    const tokenIds = findTokenIdsInLogData(logs);

    return isSuccess;
  } catch (err) {
    console.error(err);
    return false;
  }
};

/**
 * 
 * @param logs 
 * @returns 
 */
const findTokenIdsInLogData = (logs: any[]) => {
  if (logs === undefined) {
    return {};
  }

  // sift through the dataset
  const logDataset = logs
    .map((log) => ({
      contract: log.address.toJSON(),
      decodedEvent: log.decodedEvent,
    }))
    .filter(
      (ev) =>
        ev.decodedEvent &&
        ev.decodedEvent.label.toLowerCase() === "transfer" &&
        ev.decodedEvent.type === "event"
    )
    .map((item: any) => {
      const { contract, decodedEvent } = item;
      const filtered = decodedEvent?.params.filter(
        (param) => param.name === "tokenId" || param.name === "value"
      );
      const tokenId = filtered.length > 0 ? filtered[0].value : "";

      return {
        contract,
        tokenId,
      };
    })
    .reduce((acc, obj) => {
      const key = obj?.contract;
      acc[key] = acc[key] || [];
      acc[key].push(parseInt(obj?.tokenId));
      return acc;
    }, {});

  return logDataset;
};

export default {
  init,
  isTransactionSuccess,
  isTokenAlreadyInAddress,
  matchTransactionTokens,
  getTransactionData,
  findTokenIdsInLogData,
};
