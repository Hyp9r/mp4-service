import { ProcessingStatus } from "FileMetadata";

export interface StartProcessingMessage {
  id: Number;
  path: string;
  status: ProcessingStatus;
}
