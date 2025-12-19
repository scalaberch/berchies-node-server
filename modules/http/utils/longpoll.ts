import { sleep } from "@server/helpers";

export const DEFAULT_MAX_TRIES = 30;
export const DEFAULT_INTERVAL = 1000;

export default async (handler: () => any, override?: any) => {
  // Fetch initial dataset.
  let initialData: any = await handler();
  const initDataStr = JSON.stringify(initialData);

  // Then probably get stuff.
  let maxTries = (override?.maxTries) ? override.maxTries : DEFAULT_MAX_TRIES;
  const waitInterval = (override?.waitInterval) ? override.waitInterval : DEFAULT_INTERVAL;

  do {
    const newData = await handler();
    const newDataStr = JSON.stringify(newData);

    if (newDataStr !== initDataStr) {
      initialData = newData;
      break;
    }

    maxTries--;
    await sleep(waitInterval);
  } while (maxTries > 0);

  // nothing else, just output the initial data
  return initialData;
}