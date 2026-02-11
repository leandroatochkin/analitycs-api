import "dotenv/config";
import Fastify from "fastify";
import { gapOpportunitiesData } from "./routes/gapOpportunities.controller";


export const app = Fastify({
  logger: {
    level: "info",
  },
});

app.get("/health", async () => {
  console.log("API healthy")
});

const start = async () => {

  await app.register(gapOpportunitiesData, { prefix: "/api" });

  // 2. Register Error Handler (MUST BE BEFORE LISTEN)
  app.setErrorHandler((error: any, request, reply) => {
  if (error.code === "FST_ERR_RATE_LIMIT") {
    request.log.warn(
      { ip: request.ip, url: request.url },
      "Rate limit exceeded"
    );

    return reply.status(429).send({
      error: "Too many requests",
    });
  }

  request.log.error(error);
  reply.status(500).send({ error: "Internal Server Error" });
  });

  app.setErrorHandler((error: any, request, reply) => {
    request.log.error(
      {
        err: error,
        url: request.url,
        method: request.method,
      },
      "Unhandled error"
    );

    if (error?.code === "P2022") {
      return reply.status(500).send({
        error: "Database schema mismatch",
      });
    }

    reply.status(500).send({
      error: "Internal Server Error",
    });
  });

  app.setErrorHandler((error: any, request, reply) => {
  // Log the error details with Pino
    request.log.error({
      err: error,
      requestId: request.id,
      url: request.raw.url,
      query: request.query,
      // Add custom metadata to help debugging
      context: 'API_GLOBAL_ERROR'
    });

    // Send a clean response to the user
    reply.status(error.statusCode || 500).send({
      status: "ERROR",
      message: error.message || "An unexpected error occurred",
      requestId: request.id // Helpful for the user to report issues
    });
  });

  // 3. Finally, start listening
  try {
    await app.listen({ port: 3001 });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();

