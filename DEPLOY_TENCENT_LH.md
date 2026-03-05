# billForXu 部署到腾讯云轻量（最短路径）

目标：在腾讯云轻量服务器上用 Docker Compose 一键跑起来，数据持久化（SQLite），并可随时访问。

## 0. 你需要准备
- 一台腾讯云轻量应用服务器（建议：2C2G 起步，系统 Ubuntu 22.04）
- 一个公网 IP
- （可选）域名：想用 HTTPS + 域名访问更舒服

> 不绑定域名也能先用 `http://<公网IP>` 访问。

---

## 1. 服务器初始化（只做一次）
SSH 登录你的轻量服务器：

```bash
# 更新
sudo apt-get update -y

# 安装 docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER

# 安装 compose plugin
sudo apt-get install -y docker-compose-plugin

# 重新登录让 docker 组生效
exit
```

重新 SSH 登录后验证：
```bash
docker --version
docker compose version
```

---

## 2. 拉代码并启动（最快）
```bash
# 选一个目录
mkdir -p ~/apps && cd ~/apps

# 拉仓库
git clone https://github.com/XuJunhao-dot/billForXu.git
cd billForXu

# 进入部署目录
cd infra/compose

# 构建并启动
docker compose -f docker-compose.prod.yml up -d --build

# 看日志
docker compose -f docker-compose.prod.yml logs -f --tail=200
```

启动后访问：
- http://<你的公网IP>

---

## 3. （推荐）绑定域名 + HTTPS
把域名 A 记录指向你的公网 IP，然后把 `Caddyfile` 改成：

```caddy
YOUR_DOMAIN {
  encode gzip
  reverse_proxy /api/* api:8080
  reverse_proxy /healthz api:8080
  reverse_proxy / * web:3000
}
```

然后重载：
```bash
cd ~/apps/billForXu/infra/compose
docker compose -f docker-compose.prod.yml up -d
```

---

## 4. 数据在哪里（持久化）
SQLite 数据在 Docker volume：`api_data`，容器路径 `/app/data/app.db`。

你可以备份：
```bash
cd ~/apps/billForXu/infra/compose
# 导出 DB
docker compose -f docker-compose.prod.yml exec -T api sh -lc 'ls -lah /app/data && cp /app/data/app.db /app/data/app.db.bak'
```

---

## 5. 常用运维命令
```bash
cd ~/apps/billForXu/infra/compose

# 状态
docker compose -f docker-compose.prod.yml ps

# 重启
docker compose -f docker-compose.prod.yml restart

# 更新代码后重新构建
cd ~/apps/billForXu
git pull
cd infra/compose
docker compose -f docker-compose.prod.yml up -d --build
```

---

## 6. 安全提醒（强烈建议）
现在是“单用户免登录”，如果直接暴露公网，会有隐私风险。

最低成本做法：
- 用域名 + HTTPS
- 再加一个最简单的访问保护（后续我可以给你加：Caddy basic auth / 或 APP_TOKEN）。

你告诉我：是否要“仅你自己可访问”？如果要，我下一步就加上最小鉴权。
