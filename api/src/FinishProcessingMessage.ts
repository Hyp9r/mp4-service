import { ProcessingStatus } from "FileMetadata";

export interface FinishProcessingMessage {
  id: Number;
  path: string;
  processedFilePath: string;
  status: ProcessingStatus;
  error: string;
}
