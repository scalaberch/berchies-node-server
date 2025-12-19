import { getEnvVariable } from "@server/env";

export const AWS_ACCESS_KEY_ID: string = getEnvVariable("AWS_ACCESS_KEY_ID");
export const AWS_SECRET_ACCESS_KEY: string = getEnvVariable("AWS_SECRET_ACCESS_KEY");
export const AWS_REGION: string = getEnvVariable("AWS_REGION");
