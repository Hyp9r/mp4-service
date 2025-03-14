package messanger

import (
	"fmt"

	"github.com/Hyp9r/mp4-service/file-processing-service/domain"
	"github.com/nats-io/nats.go"
	"github.com/rs/zerolog"
)

type NatsMessenger struct {
	connection *nats.Conn
	logger *zerolog.Logger
}

func NewNatsMessenger(logger *zerolog.Logger) *NatsMessenger{
	return &NatsMessenger{
		logger: logger,
	}
}

var _ domain.MessangerService = (*NatsMessenger)(nil)

func (m *NatsMessenger) Connect(natsURL, user, pass string) error {
	conn, err := nats.Connect(natsURL, nats.UserInfo("admin", "password"))
	if err != nil {
		fmt.Printf("error while trying to connect to nats server %v\n", err)
		return err
	}
	m.connection = conn

	return nil
}

func (m *NatsMessenger) Publish(subject string, msg []byte) error {
	err := m.connection.Publish(subject, msg)
	if err != nil {
		fmt.Printf("error while publishing a message %v\n", err)
		return err
	}

	return nil
}

func (m *NatsMessenger) Subscribe(subject string, callback func (msg *nats.Msg)) error{
	_, err := m.connection.Subscribe(subject, callback)
	if err != nil {
		m.logger.Err(err).Msgf("failed to subscribe to subject %s: %v\n", subject, err)
		return err
	}
	return nil
}

func (m *NatsMessenger) Close() {
	m.connection.Close()
}