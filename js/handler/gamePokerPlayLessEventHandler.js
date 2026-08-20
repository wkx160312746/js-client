;(function(window, Utils, Handler, ClientEventCodes, ServerEventCodes, Poker) {
    'use strict';

    function GamePokerPlayLessEventHandler() {
        this.code = ClientEventCodes.CODE_GAME_POKER_PLAY_LESS;
    }

    Utils.extend(GamePokerPlayLessEventHandler, Handler);

    GamePokerPlayLessEventHandler.prototype.handle = function(client, panel, clientTransferData) {
        panel.append("你的牌型小于上一手，不能这样出牌。");

        if (client.getLastPokers() != null) {
            panel.append(Utils.format("{}[{}] 打出：", client.getLastSellClientNickname(), Utils.translateDisplayValue(client.getLastSellClientType())));
            panel.append(Poker.toString(client.getLastPokers()));
        }

        client.send(ServerEventCodes.CODE_GAME_POKER_PLAY_REDIRECT, null, null);
    };

    if (!window._handlers_) {
        window._handlers_ = [];
    }
    window._handlers_.push(new GamePokerPlayLessEventHandler());
} (this, this.Utils, this.Handler, this.ClientEventCodes, this.ServerEventCodes, this.Poker));
