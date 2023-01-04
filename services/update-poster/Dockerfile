FROM rust:alpine AS builder
RUN apk add gcc musl-dev openssl-dev
WORKDIR /app
COPY ./services/update-poster/. .
RUN cargo build --release

FROM alpine AS runtime
RUN apk add libc6-compat
COPY --from=builder /app/target/release/update-poster /usr/bin
CMD ["/usr/bin/update-poster"]
