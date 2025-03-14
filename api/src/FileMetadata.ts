export type ProcessingStatus = "successful" | "failed" | "processing";

export interface FileMetadata {
  id?: Number;
  path: string;
  processedFilePath?: string;
  status: ProcessingStatus;
  error?: string;
}
