# My Stock Journal

个人美股投资日记：Watch List、Journal、买卖记录，以及 DCF / Reverse DCF / P/E 估值工作台。可选接入 AI 中转站，对 Journal 做结构化点评（Trade review）。

## 仓库结构

```
apps/web          Next.js 前端（默认 http://localhost:3000）
apps/api          Hono API（默认 http://localhost:3001）
packages/shared   共享类型与估值计算
```

前端通过 `/api/*` rewrite 代理到后端。

## 环境要求

- Node.js ≥ 20
- pnpm ≥ 10
- Docker（本地 Postgres）

## 快速开始

```bash
# 1. 安装依赖
pnpm install

# 2. 环境变量
cp .env.example .env
cp .env.development.example .env.development
# 按需编辑：`.env` 为共用配置；`.env.development` 为本地代理 / DEV_USER

# 3. 启动数据库
pnpm db:up

# 4. 同步表结构
pnpm db:push

# 5. 同时启动 Web + API
pnpm dev
```

打开 [http://localhost:3000](http://localhost:3000)。

单独启动：

```bash
pnpm dev:web   # 仅前端
pnpm dev:api   # 仅 API
```

健康检查：

```bash
curl http://localhost:3001/health
```

## 环境变量

根目录环境文件（勿提交）。`pnpm dev` 会加载 `.env` + `.env.development`；`pnpm start` / 生产只加载 `.env`（或托管平台注入的变量），并忽略本地代理。

| 变量 | 放哪 | 说明 |
|------|------|------|
| `DATABASE_URL` | `.env` / 平台 | Postgres 连接串 |
| `API_PORT` | `.env` / 平台 | API 端口，默认 `3001` |
| `API_ORIGIN` | 平台（可选） | Next 把 `/api` 转到该地址；本地默认 `http://localhost:3001` |
| `DEV_USER_ID` / `DEV_USER_EMAIL` / `DEV_USER_NAME` | `.env.development` | 仅本地、且未配 Clerk 时的开发用户。生产禁止 |
| `HTTP_PROXY` / `HTTPS_PROXY` / `NO_PROXY` | `.env.development` | 仅 `pnpm dev`（`NODE_USE_ENV_PROXY=1`）。生产默认忽略 |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` | `.env` / 平台 | Clerk 登录。**生产必须配置** |
| `SEC_USER_AGENT` | `.env` / 平台 | 访问 SEC EDGAR 时的 User-Agent（建议带联系邮箱） |
| `AI_BASE_URL` / `AI_API_KEY` / `AI_MODEL` | `.env` / 平台 | AI 中转站。未配置时估值与日记仍可用 |

AI 相关变量仅影响 Trade review；未配置时估值与日记仍可正常使用。

## 常用命令

```bash
pnpm db:up        # docker compose 启动 Postgres
pnpm db:down      # 停止 Postgres
pnpm db:push      # Drizzle push 表结构
pnpm db:migrate   # 跑迁移
pnpm db:studio    # Drizzle Studio
pnpm test         # packages/shared 单测
```

## 主要功能

- **Watch List**：行情、My Fair Value、相对估值差（vs Fair Value）
- **Stock Journal / Transaction**：笔记与买卖记录（买卖存在 `decisions` 表）
- **Valuation**：DCF、Reverse DCF、P/E（含 peer 对比与周/月/年图）
- **Trade review**（可选）：读取 Journal，输出五级俚语评级  
  `Clownery` → `Copeium` → `Midtake` → `Based` → `Oracle`

## 开发提示

- API 使用 `tsx watch`，改代码会热重载；**改 `.env` / `.env.development` 后需重启** 才会生效。
- 本地未配置 Clerk 时，用户由 `.env.development` 的 `DEV_USER_*` 注入。生产必须配置 Clerk，不会走开发用户，也不会走本地 HTTP 代理。
- 配好 Clerk 后：未登录会进 `/sign-in`；已登录点头像进入 `/settings`（Account 可改姓名/邮箱，没有换头像）。
