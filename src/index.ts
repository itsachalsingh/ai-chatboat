import { buildApp } from "./app.js";
import { env } from "./env.js";
import { logger } from "./logger.js";

const app = buildApp();

app.listen({ port: env.PORT, host: "0.0.0.0" })
  .then((address) => {
    logger.info(`Server listening at ${address}`);
  })
  .catch((error) => {
    logger.error(error);
    process.exit(1);
  });
