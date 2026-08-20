;(function(window, Utils, Handler, ClientEventCodes, ServerEventCodes, Poker) {
    'use strict';

    function GamePokerPlayMismatchEventHandler() {
        this.code = ClientEventCodes.CODE_GAME_POKER_PLAY_MISMATCH;
    }

    Utils.extend(GamePokerPlayMismatchEventHandler, Handler);

    GamePokerPlayMismatchEventHandler.prototype.handle = function(client, panel, clientTransferData) {
        var obj = JSON.parse(clientTransferData.data);

        panel.append(Utils.format("你的牌型是 {}（{} 张），上一手牌型是 {}（{} 张），牌型不匹配。", Utils.translateDisplayValue(obj.playType), obj.playCount, Utils.translateDisplayValue(obj.preType), obj.preCount));

        if (client.getLastPokers() != null) {
            panel.append(Utils.format("{}[{}] 打出：", client.getLastSellClientNickname(), Utils.translateDisplayValue(client.getLastSellClientType())));
            panel.append(Poker.toString(client.getLastPokers()));
        }

        client.send(ServerEventCodes.CODE_GAME_POKER_PLAY_REDIRECT, null, null);
    };

    if (!window._handlers_) {
        window._handlers_ = [];
    }
    window._handlers_.push(new GamePokerPlayMismatchEventHandler());
} (this, this.Utils, this.Handler, this.ClientEventCodes, this.ServerEventCodes, this.Poker));
