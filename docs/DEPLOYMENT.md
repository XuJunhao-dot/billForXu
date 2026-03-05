# 部署与运维方案（MVP）

## 目标与假设（MVP 取舍）
面向“个人财务记录 Web（手机/电脑）”MVP，部署方案优先：**可在本地快速开发**、**一键 Docker 启动**、**最小预发/生产区分**、**可迁移/备份**、**最小监控可观测**。

默认三层：**前端（SPA）+ 后端（API）+ 数据库（PostgreSQL）**（同构可替换 MySQL/SQLite）。

---

## 1) 本地开发方案（不依赖 Docker / 可选 Docker）
### 目录建议
```
repo/
  frontend/
  backend/
  infra/
    compose/
  .github/workflows/
```

### 本地开发（推荐）
- DB：本机 Postgres（或 Docker 起 db 容器）
- 后端：`npm run dev` / `uvicorn --reload`
- 前端：`npm run dev`（Vite/Next dev server），本地代理到后端

注意：本地与容器的**环境变量命名**、**迁移方式**保持一致。

---

## 2) Docker 化（开发 / 预发 / 生产）
### 镜像策略
- 前端：MVP 推荐“构建静态资源 → Nginx 托管”（若 SSR 再用 Node 运行时）
- 后端：单镜像；启动时执行 DB migration（或独立 migrate job）
- DB：官方 postgres 镜像，volume 持久化

### Compose 分层
- `docker-compose.yml`：开发/通用
- `docker-compose.prod.yml`：生产覆盖（更严格资源、只暴露必要端口、关 debug）
- `docker-compose.staging.yml`（可选）：预发覆盖

---

## 3) 环境变量与配置管理
原则：
- 不把密钥写进镜像/仓库：本地 `.env`，线上用 CI/CD Secrets
- 后端配置从 env 读取（12-factor）

建议 env：
- `APP_ENV=development|staging|production`
- `LOG_LEVEL=info|debug`
- `DATABASE_URL=...`
- `JWT_SECRET=...`（如有登录）
- `CORS_ORIGINS=...`
- `SENTRY_DSN`（可选）

`.env.example`（示例）：
```
APP_ENV=development
DATABASE_URL=postgresql://app:app@db:5432/app?schema=public
JWT_SECRET=change_me
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

---

## 4) 数据库迁移（MVP 也必须有）
推荐顺序：
1) 独立 migrate job：发布先跑 migrate，成功后更新 api（最佳可控）
2) api 启动时自动 migrate：MVP 快捷，但多副本并发时需锁

工具示例：
- Node：Prisma / Knex / TypeORM migration
- Python：Alembic / Django migrations

---

## 5) 预发 / 生产最小实践
- 预发与生产同构（版本、配置结构一致）
- 生产仅暴露 80/443；DB 不对公网暴露
- 单机 VPS/NAS：Docker Compose + Caddy/Nginx 反代 + Let’s Encrypt

---

## 6) 备份方案（必须落地）
- 每日一次 `pg_dump` 全量 + 压缩 + 远端存储（对象存储/网盘/另一台机器）
- 至少每月演练一次恢复

---

## 7) 监控最小集（MVP）
必做：
1) 健康检查：API `/healthz`（进程+DB连通性）
2) 日志：stdout/stderr；MVP 可先 `docker compose logs`
3) 错误追踪：推荐 Sentry（前后端）

---

## 8) 最小可用 docker-compose 草案（前端 + 后端 + db）
> 说明：这是“能跑起来”的最小模板；需要你后续补全 `frontend/`、`backend/` 的 Dockerfile 与启动命令。

见仓库：`infra/compose/docker-compose.yml`。

---

## 9) GitHub Actions CI 建议（lint / test / build）
目标：PR 期间快速给质量信号。

示例工作流见：`.github/workflows/ci.yml`。

---

## 10) 生产上线最小清单
- [ ] 密钥走 Secret 注入，不落仓库
- [ ] DB 不对公网暴露端口
- [ ] 备份可恢复（有演练）
- [ ] API 有 `/healthz`
- [ ]（推荐）Sentry 前后端接入
