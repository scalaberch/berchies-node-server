

export const cronJobsPath = './src/jobs';

export interface CronConfig {

}

export interface CronJobConfig {
  job: Function;
  cron: string;
}