FROM golang:1.25-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/bin/server main.go

FROM alpine:3.21

RUN adduser -D -u 10001 appuser
WORKDIR /app
COPY --from=builder /app/bin/server /app/server

USER appuser
EXPOSE 8080

CMD ["/app/server"]
