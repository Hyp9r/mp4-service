import FileRepository from "./FileRepository";
import { Server } from "./Server";
import mysql from "mysql2/promise";
import NatsService from "./NatsService";

const connectionPool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "user",
  password: process.env.DB_PASSWORD || "password",
  database: process.env.DB_NAME || "db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});
const fileRepository = new FileRepository(connectionPool);
const natsService = new NatsService(fileRepository);
const server = new Server(fileRepository, natsService);

async function start() {
  try {
    await natsService.connect(
      process.env.NATS_URL || "nats://nats:4222",
      process.env.NATS_USER || "admin",
      process.env.NATS_PASS || "password"
    );

    natsService.subscribe(
      process.env.NATS_COMPLETED_SUBJECT || "file.processing.completed"
    );

    server.start();
  } catch (error) {
    console.error("Error during startup:", error);
  }
}

start();

process.on("SIGINT", async () => {
  await natsService.close();
  process.exit(0);
});
