package domain

import (
	"encoding/binary"
	"fmt"
	"io"
	"os"

	"github.com/rs/zerolog"
)

type Box struct {
	Size uint32
	Type string
	Offset int64
}

type ProcessingService struct {
	logger *zerolog.Logger
}

func NewFileProcessorService(logger *zerolog.Logger) *ProcessingService {
	return &ProcessingService{logger: logger}
}

func readBox(file *os.File) (*Box, error){
	header := make([]byte, 8)
	offset, err := file.Seek(0, io.SeekCurrent)
	if err != nil {
		return nil, err
	}

	_, err = file.Read(header)
	if err != nil {
		return nil, err
	}

	boxSize := binary.BigEndian.Uint32(header[:4])
	boxType := string(header[4:8])

	return &Box{Size: boxSize, Type: boxType, Offset: offset}, nil
}

func (fps *ProcessingService) Process(filePath string) (string,error) {
	file, err := os.Open(filePath)
	if err != nil {
		fps.logger.Err(err).Str("original_file_path", filePath).Msg("failed to open newly uploaded file")
		return "", fmt.Errorf("failed to open file")
	}
	defer file.Close()

	var startOffset, endOffset int64
	var foundMoov, foundFtyp bool

	for {
		box, err := readBox(file)
		if err != nil {
			return "", fmt.Errorf("failed to read next box, invalid type not an mp4")
		}

		if box.Type == "ftyp" {
			startOffset = box.Offset
			foundFtyp = true
		}

		if box.Type == "moov" {
			endOffset = box.Offset + int64(box.Size)
			foundMoov = true
			break
		}

		file.Seek(int64(box.Size)-8, io.SeekCurrent)
	}

	if !foundFtyp || !foundMoov {
		return "", fmt.Errorf("could not find ftyp or moov box")
	}

	// Extract the segment
	file.Seek(startOffset, io.SeekStart)
	initSegment := make([]byte, endOffset-startOffset)
	_, err = file.Read(initSegment)
	if err != nil {
		fps.logger.Err(err).Str("original_file_path", filePath).Msg("failed to read file")
		return "",err
	}

	// Write to new file
	outputFile := fmt.Sprintf("%s_processed", filePath)
	outFile, err := os.Create(outputFile)
	if err != nil {
		fps.logger.Err(err).Str("original_file_path", filePath).Msg("failed to create initialization segment file")
		return "",err
	}
	defer outFile.Close()

	_, err = outFile.Write(initSegment)
	if err != nil {
		fps.logger.Err(err).Str("original_file_path", filePath).Msg("failed to write initialization segment")
		return "",err
	}

	fps.logger.Info().Str("original_file_path", filePath).Str("processed_file_path", outputFile).Msg("Initialization segment extracted successfully!")

	return outputFile, nil
}