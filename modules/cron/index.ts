import { getEnvVariable } from '@server/env';
import { ServerModule } from '@server/modules/defines';
// import parser from 'cron-parser';

export const isMultiInstance = getEnvVariable('CRON_MULTI_INSTANCE', true, 0) === true;

export class Cron extends ServerModule {
  public isMultiInstance;

  override async onInit() {
    this.isMultiInstance = isMultiInstance;
  }

  override async onStart() {
    if (this.isMultiInstance) {
      // this.initClusterMode();
    } else {
      // this.initLocalMode();
    }
  }

  override async onStop(): Promise<void> {}

  async loadJobs() {
    // const jobsPath = path.join(__dirname, '../../../src/jobs');
    // const files = fs.readdirSync(jobsPath).filter((f) => f.endsWith('.job.ts'));

    const files = []
    for (const file of files) {
      // const { default: JobClass } = await import(path.join(jobsPath, file));
      // const instance = new JobClass();
      // JOBS.push(instance);
    }
  }
}

export default new Cron();