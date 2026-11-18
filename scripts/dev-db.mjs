import { MongoMemoryServer } from "mongodb-memory-server";

const port = Number(process.env.DEV_DB_PORT ?? 27017);

const server = await MongoMemoryServer.create({
  instance: { port, dbName: "doctor_tracker", storageEngine: "wiredTiger" },
});

console.log(`In-memory MongoDB running at ${server.getUri()}`);
console.log("Data is ephemeral. Run `npm run seed` after starting this process.");

const shutdown = async () => {
  await server.stop();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
setInterval(() => {}, 1 << 30);
