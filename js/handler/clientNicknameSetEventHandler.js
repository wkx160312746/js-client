;(function(window, Utils, Handler, ClientEventCodes, ServerEventCodes) {
    'use strict';

    function ClientNickNameSetEventHandler() {
        this.code = ClientEventCodes.CODE_CLIENT_NICKNAME_SET;
    }

    Utils.extend(ClientNickNameSetEventHandler, Handler);

    var NICKNAME_MAX_LENGTH = 10;
    ClientNickNameSetEventHandler.prototype.handle = function(client, panel, clientTransferData) {
        if (!Utils.isEmpty(clientTransferData.data)) {
            var obj = JSON.parse(clientTransferData.data);
            if ("invalidLength" in obj) {
                client.setUserName("");
                panel.append("昵称长度无效：" + obj.invalidLength);
            }
        }

        var tips = "请设置昵称（最多 " + NICKNAME_MAX_LENGTH + " 个字符）：";
        panel.append(tips);

        panel.waitInput().then(s => {
            if (Utils.isEmpty(s) || s.length > 10) {
                panel.append(tips);
            }

            client.setUserName(s);
            window.imClient.setNickname(s)
            client.send(ServerEventCodes.CODE_CLIENT_NICKNAME_SET, s);
        });
    };

    if (!window._handlers_) {
        window._handlers_ = [];
    }
    window._handlers_.push(new ClientNickNameSetEventHandler());
} (this, this.Utils, this.Handler, this.ClientEventCodes, this.ServerEventCodes));
