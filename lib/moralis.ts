import Moralis from "moralis";
import { getEnvVariable } from "@server/env";
import Log from "@server/logs";

const MORALIS_API_KEY: string = getEnvVariable("MORALIS_API_KEY");
const EvmChains = Moralis.EvmUtils.EvmChain;
const chain = EvmChains.CRONOS;

let moralisStarted = false;

/**
 * Initializes the Moralis SDK if it hasn't been started yet.
 * This function ensures Moralis.start is only called once.
 */
const startMoralis = async () => {
  if (!moralisStarted) {
    if (!MORALIS_API_KEY) {
      throw new Error("MORALIS_API_KEY environment variable is not set.");
    }
    await Moralis.start({
      apiKey: MORALIS_API_KEY,
    });
    moralisStarted = true;
  }
};

/**
 * Fetches verbose transaction data for a given hash.
 * This is the base function for other transaction-related checks.
 * Note: on the free plan in Moralis, you have 4000 daily CUs (150 CU/sec)
 *  and this request costs 5 CUs per call.
 *
 * @param transactionHash
 * @returns
 */
const getTransactionData = async (transactionHash: string) => {
  await startMoralis();

  try {
    const response = await Moralis.EvmApi.transaction.getTransactionVerbose({
      chain,
      transactionHash,
    });

    return response === null ? null : response.result;
  } catch (err) {
    Log.error(`Moralis: Failed to get transaction data for hash ${transactionHash}`, err);
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
  const transactionData = await getTransactionData(transactionHash);

  if (!transactionData) {
    return false;
  }

  // A transaction is successful if it has been included in a block
  // and its receipt status is 1 (success).
  const isSuccess = transactionData.blockHash && transactionData.receiptStatus === 1;
  return isSuccess;
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
  await startMoralis();

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
    Log.error(`Moralis: Failed to check token ownership for wallet ${walletAddress}`, err);
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
  const transactionData = await getTransactionData(transactionHash);

  if (!transactionData) {
    return false;
  }

  const isSuccess = transactionData.blockHash && transactionData.receiptStatus === 1;
  if (!isSuccess) {
    return false;
  }

  const { logs } = transactionData;
  const tokenIdsByContract = findTokenIdsInLogData(logs);

  // Check if the specific contract address has the expected tokens
  const foundTokens = tokenIdsByContract[contractAddress.toLowerCase()] || [];
  return tokens.every((token) => foundTokens.includes(Number(token)));
};

/**
 * Parses transaction logs to find 'Transfer' events and extracts the token IDs, grouped by contract address.
 * @param logs 
 * @returns 
 */
const findTokenIdsInLogData = (logs: any[]) => {
  if (logs === undefined) {
    return {};
  }

  // sift through the dataset
  return logs.reduce((acc, log) => {
    const { decodedEvent, address } = log;

    // We only care about 'Transfer' events from ERC721/ERC1155 contracts
    if (
      !decodedEvent ||
      decodedEvent.label.toLowerCase() !== "transfer" ||
      decodedEvent.type !== "event"
    ) {
      return acc;
    }

    const tokenIdParam = decodedEvent.params.find(
      (param: any) => param.name === "tokenId" || param.name === "value"
    );

    if (tokenIdParam) {
      const contractAddress = address.toLowerCase();
      if (!acc[contractAddress]) {
        acc[contractAddress] = [];
      }
      acc[contractAddress].push(parseInt(tokenIdParam.value, 10));
    }

    return acc;
  }, {} as Record<string, number[]>);
};

export default {
  start: startMoralis,
  isTransactionSuccess,
  isTokenAlreadyInAddress,
  matchTransactionTokens,
  getTransactionData,
  findTokenIdsInLogData,
};
