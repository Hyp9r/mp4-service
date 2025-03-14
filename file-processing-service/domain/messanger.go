package domain

import "github.com/nats-io/nats.go"

type MessangerService interface{
	Connect(natsURL, user, pass string) error
	Publish(subject string, msg []byte) error
	Subscribe(subject string, callback func (msg *nats.Msg)) error
	Close()
}