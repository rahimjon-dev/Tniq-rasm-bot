# Multi-stage production Dockerfile
FROM node:22-slim AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
COPY tsconfig.json ./
COPY prisma ./prisma/

RUN npm ci

COPY src ./src/

# Generate Prisma Client & compile TypeScript
RUN npx prisma generate
RUN npm run build

# ------------------------------------------------------------------------------
# Production Runner
# ------------------------------------------------------------------------------
FROM node:22-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install system dependencies & Vulkan runtime for Real-ESRGAN
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    ca-certificates \
    curl \
    wget \
    unzip \
    libvulkan1 \
    libgomp1 \
    mesa-vulkan-drivers \
    && rm -rf /var/lib/apt/lists/*

# Download native Linux Real-ESRGAN AI engine & models
RUN mkdir -p /app/realesrgan && \
    wget -q https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesrgan-ncnn-vulkan-20220424-ubuntu.zip -O /tmp/realesrgan.zip && \
    unzip -q /tmp/realesrgan.zip -d /app/realesrgan && \
    chmod +x /app/realesrgan/realesrgan-ncnn-vulkan && \
    rm /tmp/realesrgan.zip

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --only=production
RUN npx prisma generate

COPY --from=builder /app/dist ./dist/
COPY public ./public/

# Create persistent storage directories
RUN mkdir -p storage/temp storage/outputs

EXPOSE 3000

CMD ["node", "dist/server.js"]
