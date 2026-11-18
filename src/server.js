import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { connectDatabase, disconnectDatabase } from "./config/db.js";
import { Doctor } from "./models/Doctor.js";
import { Patient } from "./models/Patient.js";
import { User } from "./models/User.js";

async function main() {
  await connectDatabase(env.mongoUri);
  await Promise.all([Doctor.init(), Patient.init(), User.init()]);
  console.log(`MongoDB connected: ${env.mongoUri.replace(/\/\/.*@/, "//***@")}`);

  const app = createApp();
  const server = app.listen(env.port, () => {
    console.log(`Doctor Tracker API listening on http://localhost:${env.port}`);
  });

  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down`);
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((error) => {
  console.error("Failed to start the API:", error);
  process.exit(1);
});
