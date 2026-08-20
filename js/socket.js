"use strict"

/**
 * 创建Vue实例
 */
var Vm = new Vue({
    el: "#root",
    data: {
        consoleData: [], // 控制台日志
        messageData: [], // 消息记录
        instance: WebSocket, // ws instance
        address: window.RatelConfig && window.RatelConfig.wsAddress ? window.RatelConfig.wsAddress : 'ws://ratel-be.youdomain.com/ws', // 链接地址
        nickname: 'luke',
        alert: {
            class: 'success',
            state: false,
            content: '',
            timer: undefined
        },
        content: '',
        heartBeatSecond: 1,
        heartBeatContent: '',
        autoSend: false,
        autoTimer: undefined,
        sendClean: true,
        secvClean: false,
        recvClean: false,
        recvDecode: false,
        connected: false,
        recvPause: false,
        raiseNum: 1000,
        is: true,
        showNotification: false
    },
    created: function created() {
        this.canUseH5WebSocket()
        
        // 优先使用配置文件中的地址
        if (window.RatelConfig && window.RatelConfig.wsAddress) {
            this.address = window.RatelConfig.wsAddress;
            console.log("使用配置的 WebSocket 地址:", this.address);
        } else {
            // 从 localStorage 获取保存的地址
            var savedAddress = localStorage.getItem('address');
            if (typeof savedAddress === 'string') {
                this.address = savedAddress;
                console.log("使用保存的 WebSocket 地址:", this.address);
            }
        }
        
        window.onerror = function (ev) {
            console.warn(ev)
        }
        // 更新页面标题
        this.updatePageTitle();
    },
    computed: {
        isHttps: function () {
            return window.location.protocol === 'https:';
        },
        isSecureWebSocket: function () {
            return this.address.startsWith('wss://');
        }
    },
    filters: {
        rStatus: function (value) {
            switch (value) {
                case undefined:
                    return '尚未创建'
                case 0:
                    return '尚未开启'
                case 1:
                    return '连接成功'
                case 2:
                    return '正在关闭'
                case 3:
                    return '连接关闭'
            }
        }
    },
    methods: {
        updatePageTitle: function () {
            var protocol = '';
            if (this.address.startsWith('wss://')) {
                protocol = ' [🔒 WSS]';
            } else if (this.address.startsWith('ws://')) {
                protocol = ' [⚠️ WS]';
            }
            document.title = 'WebSocket 测试工具' + protocol;
        },
        showTips: function showTips(className, content) {
            clearTimeout(this.alert.timer);
            this.alert.state = false;
            this.alert.class = className;
            this.alert.content = content;
            this.alert.state = true;
            this.alert.timer = setTimeout(function () {
                Vm.alert.state = false;
            }, 3000);
        },
        autoWsConnect: function () {
            try {
                if (this.connected === false) {
                    // 如果不是使用配置文件的地址，则保存到 localStorage
                    var configuredAddress = window.RatelConfig && window.RatelConfig.wsAddress;
                    if (!configuredAddress || this.address !== configuredAddress) {
                        localStorage.setItem('address', this.address);
                    }
                    
                    // 更新页面标题
                    this.updatePageTitle();
                    var nickname = this.nickname;
                    var wsInstance = new WebSocket(this.address);
                    var _this = Vm;
                    if (!nickname) {
                        _this.writeConsole('danger', '昵称不能为空');
                        return;
                    }
                    if (nickname.length > 10) {
                        _this.writeConsole('danger', '昵称不能超过 10 个字符');
                        return;
                    }
                    // 在连接前显示协议信息
                    var isSecure = this.address.startsWith('wss://');
                    var protocolInfo = isSecure ?
                        '🔒 使用安全加密连接（WSS）' :
                        '⚠️ 使用非加密连接（WS）';
                    _this.writeConsole('info', '正在连接：' + this.address);
                    _this.writeConsole('info', protocolInfo);

                    wsInstance.onopen = function (ev) {
                        console.warn(ev)
                        _this.connected = true
                        var service = _this.instance.url.replace('ws://', '').replace('wss://', '');
                        service = (service.substring(service.length - 1) === '/') ? service.substring(0, service.length - 1) : service;
                        _this.instance.send(JSON.stringify({
                            data: JSON.stringify({
                                ID: new Date().getTime(),
                                Name: nickname,
                                Score: 100
                            })
                        }));
                        // 明确显示协议类型
                        var isSecure = _this.instance.url.startsWith('wss://');
                        var protocol = isSecure ? 'WSS (安全连接)' : 'WS (非安全连接)';
                        var protocolIcon = isSecure ? '🔒' : '⚠️';
                        _this.writeAlert('success', protocolIcon + ' 已通过 ' + protocol + ' 连接到 ' + service.toString());
                    }
                    wsInstance.onclose = function (ev) {
                        console.warn(ev)
                        _this.autoSend = false;
                        clearInterval(_this.autoTimer);
                        _this.connected = false;
                        _this.writeAlert('danger', '连接已关闭：' + _this.closeCode(ev.code));
                    }
                    wsInstance.onerror = function (ev) {
                        console.warn(ev)
                        _this.writeConsole('danger', '发生错误 请打开浏览器控制台查看')
                    }
                    wsInstance.onmessage = function (ev) {
                        var enc = new TextDecoder('utf-8');
                        ev.data.arrayBuffer().then(buffer => {
                            let data = JSON.parse(enc.decode(new Uint8Array(buffer))) || {};
                            if (!_this.recvPause) {
                                var msg = data.data;
                                console.warn(msg);
                                // if (_this.recvClean) _this.messageData = [];
                                if (msg === 'INTERACTIVE_SIGNAL_START') {
                                    _this.is = true;
                                } else if (msg === 'INTERACTIVE_SIGNAL_STOP') {
                                    _this.is = false;
                                } else if (msg.includes("说：") || msg.includes("say:")) {
                                    _this.writeConsole('success', msg)
                                } else if (msg.includes("加入了房间") || msg.includes("joined room!")) {
                                    // 检查浏览器是否支持Notification API
                                    if (_this.showNotification) {
                                        // 如果已经授权，或用户同意，则创建一个新的通知
                                        var notification = new Notification('WebSocket在线测试', {
                                            body: '你有一条测试内容' // 通知的正文
                                        });
                                        // 如果需要跳转的话-请把以下注释取消
                                        // notification.onclick = () => {
                                        //     window.focus();
                                        // };
                                        _this.writeAlert('info', '你有一条测试内容')
                                    }
                                    _this.writeNews(0, msg);
                                } else {
                                    _this.writeNews(0, msg);
                                }
                            }
                        })

                    }
                    this.instance = wsInstance;
                } else {
                    this.instance.close(1000, 'Active closure of the user')
                }
            } catch (err) {
                console.warn(err)
                this.writeAlert('danger', '连接服务器 [' + this.address + '] 失败，请选择其他服务器。')
            }
        },
        autoHeartBeat: function () {
            var _this = Vm
            if (_this.autoSend === true) {
                _this.autoSend = false;
                clearInterval(_this.autoTimer);
            } else {
                _this.autoSend = true
                _this.autoTimer = setInterval(function () {
                    _this.writeConsole('info', '循环发送: ' + _this.heartBeatContent)
                    _this.sendData(_this.heartBeatContent);
                }, _this.heartBeatSecond * 1000);
            }
        },
        writeConsole: function (className, content) {
            this.consoleData.push({
                content: content,
                type: className,
                time: moment().format('HH:mm:ss')
            });
            this.$nextTick(function () {
                if (!Vm.secvClean) {
                    Vm.scrollOver(document.getElementById('console-box'));
                }
            })
        },
        writeNews: function (direction, content, callback) {
            if (typeof callback === 'function') {
                content = callback(content);
            }

            this.messageData.push({
                direction: direction,
                content: content,
                time: moment().format('HH:mm:ss')
            });

            this.$nextTick(function () {
                if (!Vm.recvClean) {
                    Vm.scrollOver(document.getElementById('message-box'));
                }
            })
        },
        writeAlert: function (className, content) {
            this.writeConsole(className, content);
            this.showTips(className, content);
        },
        canUseH5WebSocket: function () {
            if ('WebSocket' in window) {
                this.showTips('success', '初始化完成');
            }
            else {
                this.writeAlert('danger', '当前浏览器不支持 H5 WebSocket 请更换浏览器')
            }
        },
        closeCode: function (code) {
            var codes = {
                1000: '1000 CLOSE_NORMAL',
                1001: '1001 CLOSE_GOING_AWAY',
                1002: '1002 CLOSE_PROTOCOL_ERROR',
                1003: '1003 CLOSE_UNSUPPORTED',
                1004: '1004 CLOSE_RETAIN',
                1005: '1005 CLOSE_NO_STATUS',
                1006: '1006 CLOSE_ABNORMAL',
                1007: '1007 UNSUPPORTED_DATA',
                1008: '1008 POLICY_VIOLATION',
                1009: '1009 CLOSE_TOO_LARGE',
                1010: '1010 MISSING_EXTENSION',
                1011: '1011 INTERNAL_ERROR',
                1012: '1012 SERVICE_RESTART',
                1013: '1013 TRY_AGAIN_LATER',
                1014: '1014 CLOSE_RETAIN',
                1015: '1015 TLS_HANDSHAKE'
            }
            var error = codes[code];
            if (error === undefined) error = '0000 UNKNOWN_ERROR 未知错误';
            return error;
        },
        sendData: function (raw) {
            var _this = Vm
            var data = raw
            if (typeof data === 'object') {
                data = _this.content
            }
            if (data === '') {
                _this.writeConsole('danger', '指令不能为空');
                return;
            }
            try {
                if (!_this.is) {
                    data = '~ ' + data;
                }
                _this.instance.send(JSON.stringify({ data: data }));
                _this.writeNews(1, data);
                if (_this.sendClean && typeof raw === 'object') _this.content = '';
            } catch (err) {
                _this.writeAlert('danger', '消息发送失败 原因请查看控制台');
                throw err;
            }
        },
        scrollOver: function scrollOver(e) {
            if (e) {
                e.scrollTop = e.scrollHeight;
            }
        },
        cleanMessage: function () {
            this.messageData = [];
        },
        cleanConsole: function () {
            this.consoleData = [];
        },
        handleKeydown(event) {
            if (event.key === "Enter" && !event.shiftKey) {
                // 仅当未按下 Shift 时，触发提交逻辑
                event.preventDefault(); // 阻止默认行为（如换行）
                this.sendData(event);
            }
        },
        openNotification() {
            // 检查浏览器是否支持Notification API
            if (window.Notification) {
                // 请求权限，如果用户同意，则会返回 'granted'
                Notification.requestPermission().then(permission => {
                    if (permission === 'granted') {
                        this.writeAlert('success', "通知权限开启成功");
                    } else if (Notification.permission === "denied") {
                        this.writeAlert('danger', "通知权限被拒绝，请在浏览器设置中手动开启。");
                    }
                });
            } else {
                this.writeAlert('danger', '你的浏览器不支持通知功能 请更换浏览器');
            }
        },
        call() {
            this.sendData('call');
        },
        raise() {
            this.sendData('raise ' + this.raiseNum);
        },
        check() {
            this.sendData('check');
        },
        fold() {
            this.sendData('fold');
        },
        allin() {
            this.sendData('allin');
        }
    }
});
