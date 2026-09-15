# AI Media Upscaler Telegram Bot (Production Edition)

A high-performance, commercial-grade Telegram Bot that enhances images and videos using cutting-edge deep neural network AI super-resolution (Real-ESRGAN, Vulkan GPU acceleration, and FFmpeg frame pipelines).

Built with **Node.js, TypeScript, Telegraf, PostgreSQL, Prisma ORM, Redis, BullMQ, FFmpeg, and Docker**.

---

## 🌟 Key Capabilities

### 🖼 AI Image Upscaling
- **2x HD** and **4x Ultra HD** super-resolution.
- Deep neural pixel reconstruction using **Real-ESRGAN** (`realesrgan-x4plus`).
- Facial detail and skin texture restoration, noise reduction, and de-blurring.
- Uncompressed Document file delivery to prevent Telegram lossy re-compression.

### 🎬 AI Video Upscaling
- Super-resolution video pipeline (`720p HD`, `1080p Full HD`, `2K Quad HD`, and `4K Ultra HD`).
- Frame-by-frame super-resolution with bicubic temporal stability.
- **100% Native Audio Synchronization** (no audio drift or quality degradation).
- Faststart H.264 streamable MP4 encoding.

### ⚡ Infrastructure & Architecture
- **Asynchronous Queue Engine**: Heavy AI workloads are separated from Telegram message handling via **BullMQ & Redis**.
- **Anti-Abuse Rate Limiting**: Token-bucket cooldown protection against spam floods and concurrent job locks.
- **Automated Storage Janitor**: Periodically cleans up orphaned frames and temporary files older than 1 hour.
- **HTTP Healthcheck Server**: Native `/health` endpoint on port `3000` for container orchestrators and cloud monitoring.
- **Admin Dashboard**: Live system analytics, user management, ban/unban, and broadcast messaging to all users.
- **Multi-Tier Subscriptions**: Free tier, Pro tier, and Business tier architecture.
- **Telegram Stars (XTR) Billing**: Official in-app Telegram monetization ready to activate whenever desired.

---

## 📂 Project Architecture

```
my-first-tg-bot/
├── .env.example                 # Environment variable template
├── Dockerfile                   # Multi-stage production container build
├── docker-compose.yml           # Postgres, Redis, App, and Worker orchestration
├── package.json
├── tsconfig.json                # Strict TypeScript configuration
├── prisma/
│   └── schema.prisma            # User, MediaJob, Subscription, Usage, Payment, Admin
├── storage/
│   ├── temp/                    # Temporary input media
│   └── outputs/                 # Enhanced output media
├── src/
│   ├── app.ts                   # Subsystem bootstrap and graceful shutdown
│   ├── server.ts                # Application entrypoint
│   ├── config/
│   │   └── index.ts             # Zod-validated environment config
│   ├── database/
│   │   └── prisma.ts            # Prisma singleton with pooling
│   ├── types/
│   │   ├── job.types.ts         # Job payload and status types
│   │   └── user.types.ts        # Plan and session types
│   ├── utils/
│   │   └── logger.ts            # Winston structured JSON logger
│   ├── ai/
│   │   ├── interfaces/          # AI provider abstractions
│   │   └── providers/           # Real-ESRGAN implementations
│   ├── queue/
│   │   ├── queue.client.ts      # BullMQ connection manager
│   │   ├── queues/              # Producers (image.queue, video.queue)
│   │   └── workers/             # Background workers
│   ├── services/
│   │   ├── user.service.ts      # User registration and plan upgrades
│   │   ├── usage.service.ts     # Daily quota enforcement
│   │   ├── admin.service.ts     # Admin stats and broadcast system
│   │   ├── health.service.ts    # HTTP /health monitoring server
│   │   ├── payments/            # Telegram Stars billing provider
│   │   └── media/
│   │       ├── image.service.ts # Image validation and download
│   │       ├── ffmpeg.service.ts# FFprobe & FFmpeg demux/muxing
│   │       └── cleanup.service.ts# Storage sweeper
│   └── bot/
│       ├── bot.instance.ts      # Telegraf bot gateway
│       ├── keyboards/           # Main and inline keyboards
│       ├── middleware/          # Rate-limiting and logging
│       ├── commands/            # Admin commands
│       └── handlers/            # Image, video, and callback handlers
```

---

## 🚀 Quickstart Guide

### 1. Prerequisites
- **Node.js**: v20.x or higher (v22/v24 recommended).
- **Telegram Bot Token**: Created via [@BotFather](https://t.me/BotFather).

### 2. Configuration
Copy `.env.example` to `.env` and fill in your credentials:

```env
NODE_ENV=development
PORT=3000
BOT_TOKEN=your_telegram_bot_token_here
ADMIN_TELEGRAM_IDS=your_numeric_telegram_id_here
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ai_upscaler?schema=public
REDIS_URL=redis://localhost:6379
```

### 3. Install Dependencies & Build
```bash
npm install
npm run prisma:generate
npm run build
```

### 4. Run the Bot
```bash
npm start
```

---

## 🐳 Docker Deployment (Recommended for Production)

Run the complete multi-container stack (Postgres, Redis, Main Bot, and Worker) in one command:

```bash
docker compose up -d --build
```

To view logs:
```bash
docker compose logs -f app
```

---

## 💎 Monetization & Free Launch Mode

### Current State (100% Free Public Beta)
Currently, all users can tap **`[🎁 Bepul Beta Pro-ni Faollashtirish (100% Tekin)]`** in the `💎 Plans` menu to get full `PRO` tier access (50 images/day, 4K videos) for free.

### How to Turn on Paid Monetization (When Ready)
1. Open [@BotFather](https://t.me/BotFather) on Telegram.
2. Select your bot $\rightarrow$ **Bot Settings** $\rightarrow$ **Payments** $\rightarrow$ Select **Telegram Stars**.
3. In `src/bot/keyboards/main.keyboard.ts`, simply remove the `activate_free_beta` button line.
4. Users will now purchase subscriptions using native Telegram Stars (`XTR`), and funds will be automatically credited to your Telegram account!

---

## 👑 Administrator Commands

Only Telegram IDs specified in `ADMIN_TELEGRAM_IDS` have access:

- `/admin` — Opens the interactive Admin Dashboard.
- `/stats` — Displays live user count, total jobs, BullMQ queue depth, uptime, and memory usage.
- `/broadcast <message>` — Safely broadcasts an announcement to all registered users.
- `/ban <telegramId>` — Bans abusive users.
- `/unban <telegramId>` — Unbans users.
- `/setplan <telegramId> <FREE|PRO|BUSINESS>` — Manually assigns subscription plans.

---

## 📄 License
MIT License. Built for production commercial use.
