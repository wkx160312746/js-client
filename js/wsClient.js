; (function (window, Utils, Protocol, Panel, ClientEventCodes) {
	'use strict';

	var HandlerLoader = Utils.HandlerLoader;
	var log = new Utils.Logger();

	function WsClient(url) {
		console.log("=== WsClient 构造函数调试 ===");
		console.log("传入的 URL:", url);
		console.log("当前 RatelConfig:", window.RatelConfig);
		console.log("=== 调试结束 ===");

		this.url = url;
		this.panel = new Panel();
		this.game = { user: {}, room: { lastPokers: null, lastSellClientNickname: null, lastSellClientType: null }, clientId: -1 };
		this.reconnectAttempts = 0;
		this.maxReconnectAttempts = 3;
		this.reconnectDelay = 2000;
	}

	WsClient.version = "1.0.0";
	WsClient.prototype.init = function () {
		return new Promise((resolve, reject) => {
			this.loadHandler()
				.then(() =>
					this.initProtobuf()
						.then(() => this.initWebsocketConnect(resolve, reject)));
		});
	};

	var handlerPath = [
		"./js/handler/clientNicknameSetEventHandler.js",
		"./js/handler/clientExitEventHandler.js",
		"./js/handler/clientKickEventHandler.js",
		"./js/handler/clientConnectEventHandler.js",
		"./js/handler/showOptionsEventHandler.js",
		"./js/handler/showOptionsSettingEventHandler.js",
		"./js/handler/showOptionsPvpEventHandler.js",
		"./js/handler/showOptionsPveEventHandler.js",
		"./js/handler/showRoomsEventHandler.js",
		"./js/handler/showPokersEventHandler.js",
		"./js/handler/roomCreateSuccessEventHandler.js",
		"./js/handler/roomJoinSuccessEventHandler.js",
		"./js/handler/roomJoinFailByFullEventHandler.js",
		"./js/handler/roomJoinFailByInexistEventHandler.js",
		"./js/handler/roomPlayFailByInexist1EventHandler.js",
		"./js/handler/gameStartingEventHandler.js",
		"./js/handler/gameLandlordElectEventHandler.js",
		"./js/handler/gameLandlordConfirmEventHandler.js",
		"./js/handler/gameLandlordCycleEventHandler.js",
		"./js/handler/gamePokerPlayEventHandler.js",
		"./js/handler/gamePokerPlayRedirectEventHandler.js",
		"./js/handler/gamePokerPlayMismatchEventHandler.js",
		"./js/handler/gamePokerPlayLessEventHandler.js",
		"./js/handler/gamePokerPlayPassEventHandler.js",
		"./js/handler/gamePokerPlayCantPassEventHandler.js",
		"./js/handler/gamePokerPlayInvalidEventHandler.js",
		"./js/handler/gamePokerPlayOrderErrorEventHandler.js",
		"./js/handler/gameOverEventHandler.js",
		"./js/handler/pveDifficultyNotSupportEventHandler.js",
		"./js/handler/gameWatchEventHandler.js",
		"./js/handler/gameWatchSuccessfulEventHandler.js"
	]

	WsClient.prototype.loadHandler = function () {
		var loader = new HandlerLoader();
		var promise = loader.load(handlerPath);

		promise.then(() => {
			this.handlerMap = new Map();
			loader.getHandlers().forEach(handler => {
				var code = handler.getCode();
				if (code != null) this.handlerMap.set(code, handler);
			});
		});

		this.panel.waitInput()

		return promise;
	};

	WsClient.prototype.updateConnectionStatus = function (status, text) {
		var statusIcon = document.getElementById('status-icon');
		var statusText = document.getElementById('status-text');
		if (statusIcon && statusText) {
			switch (status) {
				case 'connecting':
					statusIcon.textContent = '🟡';
					statusText.textContent = text || '连接中...';
					statusText.style.color = '#ff9800';
					break;
				case 'connected':
					statusIcon.textContent = '🟢';
					statusText.textContent = text || '已连接';
					statusText.style.color = '#4CAF50';
					break;
				case 'disconnected':
					statusIcon.textContent = '🔴';
					statusText.textContent = text || '已断开';
					statusText.style.color = '#f44336';
					break;
				case 'error':
					statusIcon.textContent = '❌';
					statusText.textContent = text || '连接错误';
					statusText.style.color = '#f44336';
					break;
			}
		}
	};

	WsClient.prototype.initProtobuf = function () {
		this.protocol = new Protocol();
		return this.protocol.init();
	};

	function htmlEscape(text) {
		return text.replace(/[<>"&]/g, function (match, pos, originalText) {
			switch (match) {
				case "<": return "&lt;";
				case ">": return "&gt;";
				case "&": return "&amp;";
				case "\"": return "&quot;";
			}
		});
	}

	function notifyMe(text) {
		if (!("Notification" in window)) {
			console.log("This browser does not support desktop notification");
		} else if (Notification.permission === "granted") {
			const notification = new Notification(text);
		} else if (Notification.permission !== "denied") {
			Notification.requestPermission().then((permission) => {
				if (permission === "granted") {
					const notification = new Notification(text);
				}
			}
			);
		}
	}

	WsClient.prototype.initWebsocketConnect = function (resolve, reject) {
		if (window.WebSocket) {
			// 添加连接状态提示
			this.panel.append("<div style='color: #2196F3; font-weight: bold;'>⏳ 正在连接 WebSocket 服务器...</div>");
			this.panel.append("<div style='color: #666; font-size: 12px;'>连接地址: " + this.url + "</div>");

			// 更新连接状态
			// this.updateConnectionStatus('connecting', '正在连接...');

			// 设置连接超时
			var connectTimeout = setTimeout(() => {
				this.panel.append("<div style='color: #ff9800; font-weight: bold;'>⚠️ 连接超时，正在重试...</div>");
			}, 5000);

			this.socket = new WebSocket(this.url);
			// 保存 this 引用
			var self = this;
			this.socket.onmessage = (event) => {
				var enc = new TextDecoder('utf-8');
				event.data.arrayBuffer().then(buffer => {
					let data = JSON.parse(enc.decode(new Uint8Array(buffer))) || {};
					var msg = data.data
					if (msg == 'INTERACTIVE_SIGNAL_START') {
						window.is = true;
					} else if (msg == 'INTERACTIVE_SIGNAL_STOP') {
						window.is = false;
					} else {
						// 使用保存的 self 引用
						self.panel.append(htmlEscape(msg))
						if (msg.includes("游戏开始！") || msg.includes("Game starting!")) {
							notifyMe("游戏开始！");
						}
						var roomCountMatch = msg.match(/(?:room current has|当前共有)\s*(\d+)/);
						if (roomCountMatch && parseInt(roomCountMatch[1], 10) >= 3) {
							notifyMe("房间人数已满足开局条件。");
						}
					}
				})
			};
			this.socket.onopen = (event) => {
				clearTimeout(connectTimeout);
				log.info("websocket ({}) open", this.url);
				this.panel.append("<div style='color: #4CAF50; font-weight: bold;'>✅ WebSocket 连接成功！</div>");
				this.panel.append("<div style='color: #666; margin-bottom: 10px;'>服务器地址: " + this.url + "</div>");

				// 更新连接状态
				// this.updateConnectionStatus('connected', '已连接');

				this.socket.send(JSON.stringify({
					data: JSON.stringify({
						ID: new Date().getTime(),
						Name: window.name,
						Score: 100
					})
				}))
				resolve();
			};
			this.socket.onclose = (e) => {
				clearTimeout(connectTimeout);
				log.info("websocket ({}) close", this.url);
				this.panel.append("<div style='color: #f44336; font-weight: bold;'>❌ WebSocket 连接已断开</div>");
				this.panel.append("<div style='color: #666; font-size: 12px;'>关闭代码: " + e.code + ", 原因: " + (e.reason || "未知") + "</div>");

				// 更新连接状态
				// this.updateConnectionStatus('disconnected', '已断开');

				// 如果不是正常关闭，尝试重连
				if (e.code !== 1000 && e.code !== 1001) {
					this.reconnect()
						.then(() => resolve())
						.catch(() => reject(e));
				} else {
					reject(e);
				}
			};
			this.socket.onerror = (e) => {
				clearTimeout(connectTimeout);
				log.error("Occur a error {}", e);
				this.panel.append("<div style='color: #f44336; font-weight: bold;'>❌ WebSocket 连接错误</div>");
				this.panel.append("<div style='color: #666; font-size: 12px;'>可能的原因：</div>");
				this.panel.append("<div style='color: #666; font-size: 12px; margin-left: 20px;'>1. 服务器地址错误或服务器未启动</div>");
				this.panel.append("<div style='color: #666; font-size: 12px; margin-left: 20px;'>2. 网络连接问题</div>");
				this.panel.append("<div style='color: #666; font-size: 12px; margin-left: 20px;'>3. 防火墙或代理设置问题</div>");
				if (this.url.startsWith('wss://')) {
					this.panel.append("<div style='color: #666; font-size: 12px; margin-left: 20px;'>4. SSL/TLS 证书问题</div>");
				}
				this.panel.append("<div style='color: #ff9800; margin-top: 10px;'>💡 提示：请检查控制台（F12）获取更多错误信息</div>");

				// 更新连接状态
				// this.updateConnectionStatus('error', '连接错误');

				// 尝试重连
				this.reconnect()
					.then(() => resolve())
					.catch(() => reject(e));
			};


		} else {
			log.error("current browser not support websocket");
			this.panel.append("<div style='color: #f44336; font-weight: bold;'>❌ 您的浏览器不支持 WebSocket</div>");
		}
	};

	WsClient.prototype.dispatch = function (serverTransferData) {
		var handler = this.handlerMap.get(serverTransferData.code);

		if (handler == null || typeof handler == 'undefined') {
			log.warn("not found code:{} handler", serverTransferData.code);
			return;
		}

		try {
			handler.handle(this, this.panel, serverTransferData);
		} catch (e) {
			log.error("handle {} error", serverTransferData, e);
		}
	};

	WsClient.prototype.send = function (code, data, info) {
		var transferData = {
			code: code,
			data: typeof data === "undefined" ? null : data,
			info: typeof info === "undefined" ? null : info
		};
		this.protocol.encode(transferData)
			.then(encodeValue => this.socket.send(encodeValue));
	};

	WsClient.prototype.sendMsg = function (msg) {
		this.socket.send(JSON.stringify({
			data: msg
		}))
	};

	WsClient.prototype.close = function () {
		this.socket.close();
		this.panel.append("连接已关闭。");
		this.panel.hide();
	};

	WsClient.prototype.reconnect = function () {
		if (this.reconnectAttempts >= this.maxReconnectAttempts) {
			this.panel.append("<div style='color: #f44336; font-weight: bold;'>❌ 重连失败，已达到最大重试次数</div>");
			this.panel.append("<div style='color: #666; margin-top: 10px;'>请刷新页面手动重试</div>");
			// this.updateConnectionStatus('error', '重连失败');
			return Promise.reject(new Error("Max reconnect attempts reached"));
		}

		this.reconnectAttempts++;
		this.panel.append("<div style='color: #ff9800; font-weight: bold;'>🔄 正在尝试重新连接... (第 " +
			this.reconnectAttempts + "/" + this.maxReconnectAttempts + " 次)</div>");

		// this.updateConnectionStatus('connecting', '重连中 ' + this.reconnectAttempts + '/' + this.maxReconnectAttempts);

		return new Promise((resolve, reject) => {
			setTimeout(() => {
				this.initWebsocketConnect(resolve, reject);
			}, this.reconnectDelay);
		});
	};

	// --------------- getter/setter ------------------------

	WsClient.prototype.setUserName = function (nickName) {
		this.game.user.nickName = nickName;
	};

	WsClient.prototype.setWatching = function (watching) {
		this.game.user.watching = watching;
	};

	WsClient.prototype.getWatching = function () {
		return this.game.user.watching;
	};

	WsClient.prototype.setClientId = function (clientId) {
		this.game.clientId = clientId;
	};

	WsClient.prototype.getClientId = function () {
		return this.game.clientId;
	};

	WsClient.prototype.setLastPokers = function (lastPokers) {
		this.game.room.lastPokers = lastPokers;
	};

	WsClient.prototype.setLastSellClientNickname = function (lastSellClientNickname) {
		this.game.room.lastSellClientNickname = lastSellClientNickname;
	};

	WsClient.prototype.setLastSellClientType = function (lastSellClientType) {
		this.game.room.lastSellClientType = lastSellClientType;
	};

	WsClient.prototype.getLastPokers = function () {
		return this.game.room.lastPokers;
	};

	WsClient.prototype.getLastSellClientNickname = function () {
		return this.game.room.lastSellClientNickname;
	};

	WsClient.prototype.getLastSellClientType = function () {
		return this.game.room.lastSellClientType;
	};

	window.WsClient = WsClient;
}(this, this.Utils, this.Protocol, this.Panel, this.ClientEventCodes));
