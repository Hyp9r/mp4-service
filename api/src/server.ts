import FileRepository from "./FileRepository";
import express from "express";
import { FileMetadata } from "FileMetadata";
import { INatsService } from "INatsService";
import multer from "multer";
import { StartProcessingMessage } from "StartProcessingMessage";

export class Server {
  private express: express.Application;
  private multer: multer.Multer;
  private fileRepository: FileRepository;
  private natsService: INatsService;

  constructor(fileRepository: FileRepository, natsService: INatsService) {
    this.express = express();
    this.multer = multer({ dest: "/app/shared-data" });
    this.fileRepository = fileRepository;
    this.natsService = natsService;
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.express.get("/files", async (req, res) => {
      try {
        const metadatas = await this.fileRepository.findAll();

        res.json(metadatas);
      } catch (error) {
        console.log("error while fetching metadata", error);
        res.status(500).send("Failed to fetch all files metadata");
      }
    });

    this.express.delete("/files/:id", async (req, res) => {
      try {
        const userId = req.params.id;
        const result = await this.fileRepository.delete(Number(userId));
        if (result) {
          res.status(200).send({ message: "File deleted successfully" });
        } else {
          res.status(500).send({ message: "Failed deleting file" });
        }
      } catch (error) {
        console.log("error while deleting");
      }
    });

    this.express.get("/files/:id", async (req, res) => {
      try {
        const userId = req.params.id;
        const fileMetadata = await this.fileRepository.findOneById(
          Number(userId)
        );
        res.json(fileMetadata);
      } catch (error) {
        console.log("error while fetching ${userId}");
        // TODO: retries, validate userId is a number, read from the cache
      }
    });

    this.express.post(
      "/files/process",
      this.multer.single("file"),
      async (req, res) => {
        if (!req.file) {
          res.status(400).send({ message: "File upload failed" });
        }

        console.log("File uploaded successfully");

        if (req.file?.destination) {
          // create file in database
          const fileMetadata: FileMetadata = {
            path: req.file?.path,
            status: "processing",
          };
          const id = await this.fileRepository.create(fileMetadata);

          const startProcessingMessage: StartProcessingMessage = {
            id: id,
            path: req.file.path,
            status: "processing",
          };

          // publish a message
          this.natsService.publish(
            "file.processing.request",
            startProcessingMessage
          );

          res.status(200).send({
            id: id,
            message: "File uploaded successfully",
            file: req.file,
          });
        }
      }
    );
  }

  public start(): void {
    this.express.listen(4000, () => console.log("listening on port 4000"));
  }
}
