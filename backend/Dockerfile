# Build stage
FROM ubuntu:22.04 AS builder

RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    git \
    wget \
    curl \
    ca-certificates \
    libboost-all-dev \
    libssl-dev \
    libcurl4-openssl-dev \
    zlib1g-dev \
    libasio-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Google OR-Tools
RUN wget https://github.com/google/or-tools/releases/download/v9.8/or-tools_amd64_ubuntu-22.04_cpp_v9.8.3296.tar.gz \
    && tar -xzf or-tools_*.tar.gz \
    && rm or-tools_*.tar.gz \
    && mv or-tools_* /opt/or-tools

WORKDIR /app
COPY . .

RUN mkdir -p build && cd build \
    && cmake -DCMAKE_BUILD_TYPE=Release \
        -DCMAKE_PREFIX_PATH="/opt/or-tools" \
        -DBUILD_LAMBDA=OFF .. \
    && make cashcage-backend -j$(nproc)

# Runtime stage
FROM ubuntu:22.04

RUN apt-get update && apt-get install -y \
    ca-certificates \
    libboost-system1.74.0 \
    libssl3 \
    libcurl4 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/build/cashcage-backend /usr/local/bin/cashcage-backend
COPY --from=builder /opt/or-tools/lib /usr/local/lib/ortools/

ENV LD_LIBRARY_PATH=/usr/local/lib/ortools
ENV PORT=8080

EXPOSE 8080

ENTRYPOINT ["/usr/local/bin/cashcage-backend"]
