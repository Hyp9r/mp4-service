package domain

type FinishProcessMessage struct{
	ID int `json:"id"`
	Path string `json:"path"`
	ProcessedFilePath string `json:"processedFilePath"`
	Status string `json:"status"`
	Error string `json:"error"`
}