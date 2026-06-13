import { ServerModule } from '@server/modules/defines';
import Log from '@server/logs';
import { STRIPE_CALLBACK_URI } from './defines';
import Http, { Http as HttpClass } from '../http';
import { HttpRequest, HttpResponse } from '../http/defines';
import { createRoute } from '@server/modules/http/router';

const loadStripeHandler = () => {};

const setupEndpoint = async (httpModule: HttpClass) => {
  // const router = createRoute();
  // router.get(STRIPE_CALLBACK_URI, (req: HttpRequest, res: HttpResponse) => {
  //   return res.outputSuccess({ }, "hello")
  // });
  // httpModule.express.use(router);

  const routes = httpModule.getLoadedRoutes();
  console.log(routes);
};

export class Stripe extends ServerModule {
  override async onInit() {}

  override async onStart() {
    const loadedModules = this.server.modules;
    if (!loadedModules.isModuleEnabled('http')) {
      Log.warn(' ⚠️  HTTP module is not enabled! Stripe module requires http module to work.');
      return;
    }

    // otherwise, add the post handler.
    const httpModule: HttpClass = loadedModules.getModule('http') as HttpClass;
    await setupEndpoint(httpModule);
  }

  override async onStop() {}
}

export default new Stripe({
  requires: ['http']
});