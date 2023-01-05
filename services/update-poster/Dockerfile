FROM rust:slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y openssl libssl-dev pkg-config
COPY ./services/update-poster/. .
RUN cargo build --release

FROM debian:stable-slim AS runtime
RUN apt-get update && apt-get install -y ca-certificates
COPY --from=builder /app/target/release/update-poster /usr/bin
CMD ["/usr/bin/update-poster"]
