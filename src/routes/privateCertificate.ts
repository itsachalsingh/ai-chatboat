import type { FastifyInstance } from "fastify";
import { Readable } from "stream";
import { env } from "../env.js";

export async function registerPrivateCertificateRoutes(app: FastifyInstance) {
  app.get("/private-chat/certificate/download/:applicationNumber", async (request, reply) => {
    const { applicationNumber } = request.params as { applicationNumber: string };

    const response = await fetch(
      `${env.E_DISTRICT_API_BASE_URL}/certificate/public/${applicationNumber}`
    );

    if (!response.ok || !response.body) {
      return reply.status(502).send({ error: "Failed to download certificate" });
    }

    reply.header("Content-Type", "application/pdf");
    reply.header(
      "Content-Disposition",
      `attachment; filename=certificate-${applicationNumber}.pdf`
    );

    Readable.fromWeb(response.body).pipe(reply.raw);
    return reply;
  });
}
