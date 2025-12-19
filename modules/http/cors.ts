import cors from "cors";
import { Express } from "express";
import { isDevEnv } from "../../env";
import { HttpConfig } from "./defines";

const applyCors = (server: Express, config: HttpConfig) => {
  if (isDevEnv()) {
    return server.use(cors());
  }

  const corsDomainList = config?.corsDomainList ?? [];

  server.use(
    cors({
      credentials: true,
      origin: function (origin, callback) {
        // allow requests with no origin
        // (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        // check on cors domain list
        if (corsDomainList.indexOf(origin) === -1) {
          var msg = `The CORS policy for this site does not allow access from the specified origin: ${origin}.`;
          return callback(new Error(msg), false);
        }

        return callback(null, true);
      },
    })
  );
};

export default applyCors;
