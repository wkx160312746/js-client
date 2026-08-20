;(function(window, Utils, Handler, ClientEventCodes, ServerEventCodes, Poker) {
    'use strict';

    function ShowPokersEventHandler() {
        this.code = ClientEventCodes.CODE_SHOW_POKERS;
    }

    Utils.extend(ShowPokersEventHandler, Handler);

    ShowPokersEventHandler.prototype.handle = function(client, panel, clientTransferData) {
        var obj = JSON.parse(clientTransferData.data);

        client.setLastPokers(obj.pokers);
        client.setLastSellClientType(obj.clientType);
        client.setLastSellClientNickname(obj.clientNickname);

        panel.append(obj.clientNickname + "[" + Utils.translateDisplayValue(obj.clientType) + "] 打出：");
        panel.append(Poker.toString(obj.pokers));

        if ("sellClinetNickname" in obj) {
            panel.append("下一位是 " + obj.sellClinetNickname + "，请等待对方出牌。");
        }
    };

    if (!window._handlers_) {
        window._handlers_ = [];
    }
    window._handlers_.push(new ShowPokersEventHandler());
} (this, this.Utils, this.Handler, this.ClientEventCodes, this.ServerEventCodes, this.Poker));
