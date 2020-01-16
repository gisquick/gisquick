FROM golang:alpine as builder
COPY ./main.go /go/src
RUN go build -ldflags="-s -w" -o /go/bin/copy-assets /go/src/main.go

FROM alpine:latest
COPY --from=builder /go/bin/copy-assets /usr/local/bin/
