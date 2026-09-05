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
# 按需编辑 .env（见下方说明）

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

根目录 `.env`（勿提交；模板见 `.env.example`）：

| 变量 | 说明 |
|------|------|
| `DATABASE_URL` | Postgres 连接串 |
| `API_PORT` | API 端口，默认 `3001` |
| `DEV_USER_ID` / `DEV_USER_EMAIL` / `DEV_USER_NAME` | 本地开发用户（暂无正式登录） |
| `SEC_USER_AGENT` | 访问 SEC EDGAR 时的 User-Agent（建议带联系邮箱） |
| `AI_BASE_URL` | AI 中转站 Base，例如 `https://www.micuapi.ai/v1`（实际请求 `${AI_BASE_URL}/chat/completions`） |
| `AI_API_KEY` | 中转站 Bearer Token |
| `AI_MODEL` | 模型名，默认 `claude-sonnet-5` |
| `AI_JSON_MODE` | 设为 `1` 时发送 `response_format: json_object`（多数 Claude 中转可不设） |

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

- API 使用 `tsx watch`，改代码会热重载；**改 `.env` 后需重启 API** 才会生效。
- 本地用户由 `DEV_USER_*` 注入，所有数据挂在该用户下。
