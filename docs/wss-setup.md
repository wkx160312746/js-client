# WebSocket Secure (WSS) 配置指南

当前端通过 HTTPS 访问时，浏览器会阻止 `ws://` 混合内容连接，因此生产环境必须使用 `wss://`。

## Zeabur

1. 给后端服务生成一个公开域名。
2. 确认后端的 `/healthz` 可以访问。
3. 在前端服务中设置变量：

```env
RATEL_WS_URL=wss://你的后端域名/ws
```

4. 重新部署前端服务，然后访问 `/js/config.js` 确认地址已经更新。

不要填写 Zeabur 的内部私有域名。WebSocket 连接由用户浏览器发起，只能使用浏览器可访问的公开域名。

## 分项配置

如果不使用完整 URL，也可以设置：

```env
RATEL_SERVER_HOST=game.example.com
RATEL_SERVER_PORT=443
BACKEND_USE=wss
```

容器会生成 `wss://game.example.com/ws`。非标准端口会保留在生成的 URL 中。

## 排查

- 浏览器提示 Mixed Content：地址仍为 `ws://`，改用 `wss://`。
- 返回 404：确认后端 WebSocket 路径是 `/ws`。
- 无法解析域名：确认使用后端公开域名，不是平台内部服务名。
- 修改变量后仍是旧地址：重新部署前端，并检查 `/js/config.js` 的内容。
