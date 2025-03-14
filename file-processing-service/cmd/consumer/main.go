package main

import (
	"context"
	"encoding/json"
	"os"

	"github.com/Hyp9r/mp4-service/file-processing-service/domain"
	"github.com/Hyp9r/mp4-service/file-processing-service/infra/messanger"
	"github.com/Netflix/go-env"
	"github.com/nats-io/nats.go"
	"github.com/rs/zerolog"
)

const (
	PROCESSING_ERROR = "processing_error"
)

type AppConfig struct {
	NATS_URL string `env:"NATS_URL"`
	NATS_USER string `env:"NATS_USER"`
	NATS_PASS string `env:"NATS_PASS"`
	NATS_REQUEST_SUBJECT string `env:"NATS_REQUEST_SUBJECT"`
	NATS_COMPLETED_SUBJECT string `env:"NATS_COMPLETED_SUBJECT"`
}

func main() {
	// setup logger
	logger := zerolog.New(os.Stderr)

	// setup context
	ctx := context.Background()

	// load env variables
	var cfg AppConfig
	_, err := env.UnmarshalFromEnviron(&cfg)
	if err != nil {
		logger.Fatal().Err(err).Msg("error loading enviroment variables")
	}

	// init processing service which is doing the actual processing of the file
	processingService := domain.NewFileProcessorService(&logger)

	// init messenger
	natsMessenger := messanger.NewNatsMessenger(&logger)

	// connect to the nats server
	err = natsMessenger.Connect(cfg.NATS_URL, cfg.NATS_USER, cfg.NATS_PASS)
	if err != nil {
		logger.Fatal().Err(err).Msg("unable to connect to the nats server")
	}
	defer natsMessenger.Close()

	//subscribe to the file.processing.request subject
	err = natsMessenger.Subscribe(cfg.NATS_REQUEST_SUBJECT, func(msg *nats.Msg) {
		var startProcessingMessage domain.StartProcessingMessage
		if err := json.Unmarshal(msg.Data, &startProcessingMessage); err != nil {
			logger.Err(err).Msg("error decoding message")
			return
		}
		logger.Info().Str("path", startProcessingMessage.Path).Msg("recieved file path")

		outputFile, err := processingService.Process(startProcessingMessage.Path)
		if err != nil {
			// raspisati da mozemo error typesove napraviti i onda specificniji error vratiti
			data, err := createProcessingErrorResponse(startProcessingMessage, err, PROCESSING_ERROR,&logger)
			if err != nil {
				panic(0)
			}
			natsMessenger.Publish(cfg.NATS_COMPLETED_SUBJECT, data)
			return;
		}

		finishProcessingMessage := domain.FinishProcessMessage{
			ID: startProcessingMessage.ID,
			Path: startProcessingMessage.Path,
			ProcessedFilePath: outputFile,
			Status: "successful",
			Error: "",
		}
		data, err := json.Marshal(finishProcessingMessage)
		if err != nil {
			logger.Err(err).Msg("failed to serialize finish processing message")
			panic(0)
		}

		logger.Info().Msgf("successfully processed file %s", startProcessingMessage.Path)

		natsMessenger.Publish(cfg.NATS_COMPLETED_SUBJECT, data)
		logger.Info().Str("path", startProcessingMessage.Path).Msgf("published message to api service with success")

	})
	if err != nil {
		logger.Fatal().Err(err).Msgf("critical error, failed to subscribe to %s errror: %v", cfg.NATS_REQUEST_SUBJECT, err)
		panic(0)
	}

	<- ctx.Done()
}

func createProcessingErrorResponse(startProcessingMessage domain.StartProcessingMessage, err error, errorAction string, logger *zerolog.Logger,) ([]byte,error) {
	errMsg := domain.FinishProcessMessage {
		ID: startProcessingMessage.ID,
		Status: "failed",
		Path: startProcessingMessage.Path,
		ProcessedFilePath: "",
		Error: err.Error(),
	}
	data, err := json.Marshal(errMsg)
	if err != nil {
		logger.Fatal().Err(err).Msg("critical error encoding message while responding with failure")
		return nil, err
	}
	return data, nil
}