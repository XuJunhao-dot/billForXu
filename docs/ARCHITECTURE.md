# 个人财务记录 Web（MVP）技术架构与数据模型

## 1) 技术架构方案与选型建议（MVP→可扩展）

### 目标与边界（MVP两个功能）
1. **资产/负债录入**：支持资产类型、多级分类；支持金额、备注。
2. **趋势图**：按日/周/月展示净资产、资产/负债分项趋势；可按分类筛选（后续可做）。

> 设计原则：以“估值记录（valuation）”为事实表，趋势图直接来源于估值时间序列；后续“账单/预算”走“交易（transaction）”模型，互不冲突但可汇总到同一套报表。

---

### 推荐架构（Web 手机/电脑自适应）
**前端**
- Next.js（React）+ TypeScript
- UI：Ant Design / MUI（二选一）
- 图表：ECharts / Recharts（二选一）

**后端**
- NestJS（Node.js）+ TypeScript 或 FastAPI（Python）
- API：REST（MVP）

**数据库**
- PostgreSQL
  - 分类树存储：推荐 `ltree`（若不想用扩展，则用 materialized path 字符串）

**为什么不选纯前端本地存储？**
- 趋势图与历史记录需要一致性与跨设备同步；未来预算/账单需要更复杂查询与约束，直接上 Postgres 省返工。

---

### 关键业务建模建议
- “资产/负债”统一为 **Account（账户/标的）**，用 `account_kind = ASSET | LIABILITY` 区分。
- 每次录入不是“余额覆盖”，而是插入一条 **AccountValuation（估值记录）**，天然支持趋势图。
- 分类树（Category）用于标记账户的类型/细分（如：资产>现金>银行卡；负债>信用卡>招行信用卡）。

---

## 2) ER / 表设计（含分类树方案）

### 核心 ER（文本版）
- `users` 1—N `accounts`
- `categories` 自关联（多级树），并可被 `accounts` 引用
- `accounts` 1—N `account_valuations`
- （预留）`transactions`（账单）可关联 `accounts`、`categories`
- （预留）`budgets` / `budget_lines` 可关联 `categories`

---

### 表结构（PostgreSQL 示例）

#### 2.1 users
| 字段 | 类型 | 说明 |
|---|---|---|
| id | uuid pk | |
| email | text unique | |
| password_hash | text | 若自建账号 |
| created_at | timestamptz | |

#### 2.2 categories（分类树）
| 字段 | 类型 | 说明 |
|---|---|---|
| id | uuid pk | |
| user_id | uuid fk users | 多用户隔离（或做系统预置分类 user_id = null） |
| name | text | 分类名 |
| kind | text | `ASSET` / `LIABILITY` / `INCOME` / `EXPENSE`（预留） |
| parent_id | uuid fk categories | 邻接表 |
| path | ltree 或 text | 树路径（推荐 ltree） |
| level | int | 冗余层级 |
| sort_order | int | 同级排序 |
| is_active | boolean | |
| created_at | timestamptz | |

**树存储方案推荐：`ltree` + 邻接表**
- 子树查询：`path <@ 'asset.cash'`
- 祖先查询：`'asset.cash.bank' @> path`

若不想依赖 `ltree` 扩展：用 `path` 存字符串（如 `/asset/cash/bank/`），子树查询用 `LIKE '/asset/cash/%'`。

索引建议：
- `gin(path)`（ltree）
- `btree(user_id, kind)`，`btree(parent_id)`

#### 2.3 accounts（资产/负债标的）
| 字段 | 类型 | 说明 |
|---|---|---|
| id | uuid pk | |
| user_id | uuid fk users | |
| name | text | 如“支付宝余额”“招行信用卡” |
| account_kind | text | `ASSET` / `LIABILITY` |
| category_id | uuid fk categories | 绑定到某个分类节点 |
| currency | char(3) | ISO，如 CNY |
| institution | text | 可选 |
| note | text | |
| is_archived | boolean | |
| created_at | timestamptz | |

索引：
- `(user_id, account_kind)`
- `(user_id, category_id)`

#### 2.4 account_valuations（估值/余额快照，趋势事实表）
| 字段 | 类型 | 说明 |
|---|---|---|
| id | uuid pk | |
| user_id | uuid fk users | 可冗余（便于过滤） |
| account_id | uuid fk accounts | |
| as_of_date | date | 建议用 date（按天趋势稳定） |
| amount | numeric(18,2) | 余额/欠款（统一正数） |
| source | text | `MANUAL` / `IMPORT`（预留） |
| note | text | |
| created_at | timestamptz | |

约束建议：
- `unique (account_id, as_of_date)`：同一账户同一天一条

索引建议：
- `(user_id, as_of_date)`
- `(account_id, as_of_date)`

> 负债的 `amount` 仍存正数；净资产计算时负债做减法，避免展示/录入混乱。

---

### （可选）趋势预聚合表（后期优化）
#### 2.5 daily_portfolio_snapshots
| 字段 | 类型 | 说明 |
|---|---|---|
| user_id | uuid | |
| as_of_date | date | |
| total_assets | numeric | |
| total_liabilities | numeric | |
| net_worth | numeric | |
| breakdown | jsonb | 按分类/币种预聚合（可选） |

主键：`(user_id, as_of_date)`

---

## 3) API 列表与请求/响应示例（REST）

### 分类（Category）
1) 创建分类：`POST /api/categories`
```json
{
  "name": "银行卡",
  "kind": "ASSET",
  "parentId": "3d2c...uuid",
  "sortOrder": 10
}
```

2) 获取分类树：`GET /api/categories?kind=ASSET`

3) 移动/改父节点：`PATCH /api/categories/{id}`
```json
{ "parentId": "new-parent-uuid", "sortOrder": 20 }
```

---

### 资产/负债标的（Account）
1) 创建账户：`POST /api/accounts`
```json
{
  "name": "招行信用卡",
  "accountKind": "LIABILITY",
  "categoryId": "cc-category-uuid",
  "currency": "CNY",
  "institution": "招商银行",
  "note": "账单日15号"
}
```

2) 列出账户：`GET /api/accounts?accountKind=ASSET&categoryId=...`

---

### 估值记录（Valuation）
1) 录入/更新某天余额：`POST /api/accounts/{accountId}/valuations`
```json
{
  "asOfDate": "2026-03-05",
  "amount": "12345.67",
  "note": "手动更新"
}
```

> 若要“同日覆盖”，后端可实现 upsert。

2) 获取某账户时间序列：`GET /api/accounts/{accountId}/valuations?from=...&to=...&granularity=day`

---

### 趋势图（Trend）
1) 净资产趋势（总览）：`GET /api/trends/net-worth?from=...&to=...&groupBy=day`
```json
{
  "from": "2026-01-01",
  "to": "2026-03-05",
  "series": [
    { "date": "2026-03-01", "assets": "10000.00", "liabilities": "2000.00", "netWorth": "8000.00" }
  ],
  "currency": "CNY"
}
```

2) 按分类趋势：`GET /api/trends/by-category?kind=ASSET&categoryId=...&from=...&to=...&groupBy=month`

**趋势计算口径（MVP简单合理）**
- 对每个账户，在每个日期取“该日期及之前最近的一条估值”作为当日余额（forward-fill）。
- 然后按账户 kind 加总；分类维度按账户 category 归类。

---

## 4) 风险与权衡
1) **趋势缺失日期口径**：建议 forward-fill，并在前端提示“非当日真实更新”。
2) **分类树移动节点成本**：materialized path/ltree 移动需更新子树 path；但分类变更不频繁，可接受。
3) **多币种汇总**：MVP建议单币种；后续若做需汇率表与换算逻辑。
4) **负债存正数 vs 负数**：推荐正数存储，计算净资产时统一做减法。

---

## 5) 最小实现清单（给研发）
- 分类：CRUD + 树查询（kind 维度）
- 账户：CRUD + 绑定分类
- 估值：按日 upsert + 列表查询
- 趋势：净资产总览 + 按分类（基于 forward-fill）
- 权限：user_id 贯穿所有表/查询
- 索引与唯一约束：保证趋势查询性能与防重复
