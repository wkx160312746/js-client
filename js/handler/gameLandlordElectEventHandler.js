;(function(window, Utils, Handler, ClientEventCodes, ServerEventCodes) {
    'use strict';

    function GameLandlordElectEventHandler() {
        this.code = ClientEventCodes.CODE_GAME_LANDLORD_ELECT;
    }

    Utils.extend(GameLandlordElectEventHandler, Handler);

    GameLandlordElectEventHandler.prototype.handle = function(client, panel, clientTransferData) {
        var obj = JSON.parse(clientTransferData.data);
        var turnClientId = obj.nextClientId;

        if ("preClientNickname" in obj) {
            panel.append(obj.preClientNickname + " 选择不抢地主。");
        }

        if (turnClientId == client.getClientId()) {
            panel.append("轮到你抢地主，是否抢地主？请输入 y/n（输入 exit/e 退出当前房间）。");
            panel.waitInput()
                .then(s => landlordElectResolve(client, panel, s));
        } else {
            panel.append("轮到 " + obj.nextClientNickname + " 抢地主，请等待对方选择。");
        }
    };

    function landlordElectResolve(client, panel, s) {
        s = s.toLowerCase();
        if (s == "exit" || s == "e") {
            client.send(ServerEventCodes.CODE_CLIENT_EXIT, null, null);
        } else if (s == "y") {
            client.send(ServerEventCodes.CODE_GAME_LANDLORD_ELECT, "TRUE", null);
        } else if (s == "n") {
            client.send(ServerEventCodes.CODE_GAME_LANDLORD_ELECT, "FALSE", null);
        } else {
            panel.append("输入无效，请输入 y 或 n。");
            panel.waitInput()
                .then(s => landlordElectResolve(client, panel, s))
        }
    }

    if (!window._handlers_) {
        window._handlers_ = [];
    }
    window._handlers_.push(new GameLandlordElectEventHandler());
} (this, this.Utils, this.Handler, this.ClientEventCodes, this.ServerEventCodes));
