# billForXu

个人财务记录 Web（MVP）：单用户免登录，**快照录入（首次全量 + 后续基于上次修改）**，以及趋势图。

## 目录
- `frontend/`：Next.js（App Router）前端
- `backend/`：Express + SQLite（better-sqlite3）后端
- `docs/`：PRD / 架构 / 测试 / 部署 文档
- `infra/compose/`：docker-compose（后续可用）

## 本地启动（推荐开发方式）
### 1) 启动后端
```bash
cd backend
npm i
npm run dev
# API: http://localhost:8080
```

### 2) 启动前端
```bash
cd frontend
npm i
NEXT_PUBLIC_API_BASE=http://localhost:8080 npm run dev
# Web: http://localhost:3000
```

## MVP 页面
- `/snapshots/new`：新增快照（可从上一次快照复制再修改）
- `/snapshots`：快照列表
- `/trends`：趋势图（资产/负债/净资产）
- `/categories`：分类管理（MVP 先做新增/查看）

## API（MVP）
- `GET /healthz`
- `GET /api/categories?direction=ASSET|LIABILITY`
- `POST /api/categories`
- `GET /api/snapshots`
- `GET /api/snapshots/latest`
- `GET /api/snapshots/:id`
- `POST /api/snapshots`
- `GET /api/trends/net-worth`

## 说明
- SQLite 数据文件默认在 `backend/data/app.db`
- 目前简化：无登录、无鉴权、无多币种换算、无分类删除/移动
