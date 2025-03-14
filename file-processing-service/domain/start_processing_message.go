package domain

type StartProcessingMessage struct{
	ID int `json:"id"`
	Path string `json:"path"`
	Status string `json:"status"`
}