import { StartProcessingMessage } from "StartProcessingMessage";

export interface INatsService {
  connect(
    natsServerUrl: string,
    username: string,
    password: string
  ): Promise<void>;
  publish(subject: string, message: StartProcessingMessage): Promise<void>;
  subscribe(subject: string): Promise<void>;
  close(): Promise<void>;
}
