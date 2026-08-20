;(function(window, Utils, Handler, ClientEventCodes, ServerEventCodes) {
    'use strict';

    function GameOverEventHandler() {
        this.code = ClientEventCodes.CODE_GAME_OVER;
    }

    Utils.extend(GameOverEventHandler, Handler);

    GameOverEventHandler.prototype.handle = function(client, panel, clientTransferData) {
        var obj = JSON.parse(clientTransferData.data);

        panel.append(Utils.format("\n玩家 {}[{}] 赢得本局！", obj.winnerNickname, Utils.translateDisplayValue(obj.winnerType)));
        panel.append("本局结束，友谊第一，比赛第二。\n");
    };

    if (!window._handlers_) {
        window._handlers_ = [];
    }
    window._handlers_.push(new GameOverEventHandler());
} (this, this.Utils, this.Handler, this.ClientEventCodes, this.ServerEventCodes));
