;(function(window, Utils, Handler, ClientEventCodes, ServerEventCodes) {
    'use strict';

    function ShowOptionsSettingEventHandler() {
        this.code = ClientEventCodes.CODE_SHOW_OPTIONS_SETTING;
    }

    Utils.extend(ShowOptionsSettingEventHandler, Handler);

    var tips = "显示设置：\n" +
            "1. 直角扑克牌（默认）\n" +
            "2. 圆角扑克牌\n" +
            "3. 纯文本并显示花色\n" +
            "4. 纯文本且不显示花色\n" +
            "5. Unicode 扑克牌\n" +
            "请选择以上选项（输入 back 返回上一级）";

    ShowOptionsSettingEventHandler.prototype.handle = function(client, panel, clientTransferData) {
        panel.append(tips);
        panel.waitInput()
            .then(s => inputResolve(client, panel, s));
    };

    function inputResolve(client, panel, s) {
        var i = s.toLowerCase();

        if (i == "back") {
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

        if (i < 1 || i > 5) {
            panel.append("设置无效，请重新选择：");
            panel.waitInput().then((s) => inputResolve(client, panel, s));
        } else {
            window.pockerStyle = i
            // TODO 设置牌形状
            client.dispatch({code: ClientEventCodes.CODE_SHOW_OPTIONS, data: null, info: null});
        }
    }

    if (!window._handlers_) {
        window._handlers_ = [];
    }
    window._handlers_.push(new ShowOptionsSettingEventHandler());
} (this, this.Utils, this.Handler, this.ClientEventCodes, this.ServerEventCodes));
