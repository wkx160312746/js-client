# 环境变量配置说明

客户端容器会在每次启动时读取环境变量并生成 `js/config.js`。因此修改变量后只需重启或重新部署容器，不需要重新构建镜像。

## 推荐配置

直接设置完整的 WebSocket 地址最可靠：

```env
RATEL_WS_URL=wss://game.example.com/ws
```

Zeabur 和其他 HTTPS 托管平台必须使用后端的公开域名和 `wss://`。浏览器无法访问平台内部私有域名。

## 支持的变量

| 环境变量 | 默认值 | 说明 |
| --- | --- | --- |
| `RATEL_WS_URL` | 空 | 完整 WebSocket 地址；设置后优先于分项地址变量 |
| `RATEL_SERVER_HOST` | `ratel-be.youdomain.com` | 后端主机名，不带协议和路径 |
| `RATEL_SERVER_PORT` | WSS 为 `443`，WS 为 `80` | 后端公开端口 |
| `BACKEND_USE` | `wss` | WebSocket 协议，可选 `ws` 或 `wss` |
| `RATEL_SERVER_NAME` | `Nico` | 客户端显示的服务器名称 |
| `RATEL_SERVER_VERSION` | `v1.3.0` | 客户端显示的服务器版本 |
| `RATEL_SERVER_ADDRESS` | 自动生成 | 完整的客户端服务器描述，通常无需设置 |
| `RATEL_IS_DEVELOPMENT` | `false` | 是否启用开发模式，只接受 `true` 或 `false` |
| `PORT` | `8080` | 前端 HTTP 监听端口；Zeabur 会自动注入 |

## Docker Compose

复制示例环境变量并启动：

```bash
cp env.example .env
docker compose up -d --build
```

也可以仅对单次启动传入变量：

```bash
RATEL_WS_URL=wss://game.example.com/ws docker compose up -d
```

## Docker

```bash
docker build -t ratel-client:latest .
docker run -d \
  -e RATEL_WS_URL=wss://game.example.com/ws \
  -e PORT=8080 \
  -p 8080:8080 \
  ratel-client:latest
```

## 验证

```bash
curl http://localhost:8080/health
curl http://localhost:8080/js/config.js
```

`/health` 应返回 `healthy`，`js/config.js` 应显示当前容器的 WebSocket 地址。该配置文件带有禁止缓存响应头，变量更新并重启后浏览器会获取新配置。
