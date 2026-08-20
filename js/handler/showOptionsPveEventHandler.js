;(function(window, Utils, Handler, ClientEventCodes, ServerEventCodes) {
    'use strict';

    function ShowOptionsPveEventHandler() {
        this.code = ClientEventCodes.CODE_SHOW_OPTIONS_PVE;
    }

    Utils.extend(ShowOptionsPveEventHandler, Handler);

    var tips = "人机对战：\n" +
            "1. 简单模式\n" +
            "2. 普通模式\n" +
            "3. 困难模式\n" +
            "请选择以上选项（输入 back/b 返回上一级）";

    ShowOptionsPveEventHandler.prototype.handle = function(client, panel, clientTransferData) {
        panel.append(tips);
        panel.waitInput().then((s) => inputResolve(client, panel, s));
    };

    function inputResolve(client, panel, s) {
        var i = s.toLowerCase();

        if (i == "back" || i == "b") {
            client.dispatch({code: ClientEventCodes.CODE_SHOW_OPTIONS, data: null, info: null});
            return;
        }

        try {
            i = parseInt(s);
            if (Number.isNaN(i)) {
                throw new Error(s + " is not a number.")
            }
        } catch (e) {
            panel.append("选项无效，请重新选择：");
            panel.waitInput().then((s) => inputResolve(client, panel, s));
        }

        if (i < 4 && i > 0) {
            client.send(ServerEventCodes.CODE_ROOM_CREATE_PVE, s);
        } else {
            panel.append("选项无效，请重新选择：");
            panel.waitInput().then((s) => inputResolve(client, panel, s));
        }
    }

    if (!window._handlers_) {
        window._handlers_ = [];
    }
    window._handlers_.push(new ShowOptionsPveEventHandler());
} (this, this.Utils, this.Handler, this.ClientEventCodes, this.ServerEventCodes));
