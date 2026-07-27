FROM rust:1.94-slim-bookworm AS builder

WORKDIR /app

COPY Cargo.toml Cargo.lock ./
COPY queries ./queries
COPY src ./src

RUN cargo build --release

FROM debian:bookworm-slim AS runtime

WORKDIR /app

COPY --from=builder /app/target/release/backend /app/backend

ENV PORT=3000

CMD ["/app/backend"]
