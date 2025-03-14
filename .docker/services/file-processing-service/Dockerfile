# Use the official Golang base image
FROM golang:1.23.3-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy the Go mod and sum files to the working directory
COPY ./file-processing-service/go.mod .

# Download the Go module dependencies
RUN go mod download

# Copy the source code from the current directory to the working directory inside the container
COPY ./file-processing-service .
#COPY ./.docker/services/file-processing-service/.env .

# Build the binary
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /go/bin/app cmd/consumer/main.go

ENTRYPOINT ["/go/bin/app"]