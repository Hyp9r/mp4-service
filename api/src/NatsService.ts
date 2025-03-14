import FileRepository from "FileRepository";
import { INatsService } from "./INatsService";
import { StartProcessingMessage } from "./StartProcessingMessage";
import { Codec, connect, JSONCodec, NatsConnection, Subscription } from "nats";
import { FinishProcessingMessage } from "FinishProcessingMessage";
import { FileMetadata } from "FileMetadata";

class NatsService implements INatsService {
  private connection!: NatsConnection;
  private codec: Codec<StartProcessingMessage>;
  private finishProcessingCodec: Codec<FinishProcessingMessage>;
  private subscriptions: Map<string, Subscription> = new Map();
  private fileRepository: FileRepository;

  constructor(fileRepository: FileRepository) {
    this.codec = JSONCodec();
    this.finishProcessingCodec = JSONCodec<FinishProcessingMessage>();
    this.fileRepository = fileRepository;
  }

  async connect(
    natsServerUrl: string,
    username: string,
    password: string
  ): Promise<void> {
    this.connection = await connect({
      servers: natsServerUrl,
      user: username,
      pass: password,
    });
    console.log(`Connected to the NATS at ${this.connection.getServer()}`);
  }

  async publish(
    subject: string,
    message: StartProcessingMessage
  ): Promise<void> {
    if (!this.connection) throw new Error("NATS connection not established.");
    this.connection.publish(subject, this.codec.encode(message));
    console.log(
      `Published a message on subscription: ${subject} message: ${message}`
    );
  }

  async subscribe(subject: string) {
    if (!this.connection) throw new Error("NATS connection not established.");
    const sub: Subscription = this.connection.subscribe(subject);
    this.subscriptions.set(subject, sub);

    console.log(`Subscribed to "${subject}"`);

    // Process messages asynchronously
    for await (const msg of sub) {
      const finishProcessingMessage = this.finishProcessingCodec.decode(
        msg.data
      );
      const fileMetadata: FileMetadata = {
        id: finishProcessingMessage.id,
        path: finishProcessingMessage.path,
        status: finishProcessingMessage.status,
        processedFilePath: finishProcessingMessage.processedFilePath,
        error: finishProcessingMessage.error,
      };

      if (fileMetadata.error !== "") {
        // handle the error in some cases maybe retries are going to help
      }

      await this.fileRepository.update(fileMetadata);
      console.log(
        `Received on ${subject}: ${JSON.stringify(finishProcessingMessage)}`
      );
    }
  }

  async close(): Promise<void> {
    if (this.connection) {
      console.log("Closing NATS connection");
      await this.connection.close();
      console.log("NATS Connection closed");
    }
  }
}

export default NatsService;
