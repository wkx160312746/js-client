;(function(window, Utils, Handler, ClientEventCodes, ServerEventCodes) {
    'use strict';

    function GamePokerPlayOrderErrorEventHandler() {
        this.code = ClientEventCodes.CODE_GAME_POKER_PLAY_ORDER_ERROR;
    }

    Utils.extend(GamePokerPlayOrderErrorEventHandler, Handler);

    GamePokerPlayOrderErrorEventHandler.prototype.handle = function(client, panel, clientTransferData) {
        panel.append("还没轮到你，请等待其他玩家出牌。");
    };

    if (!window._handlers_) {
        window._handlers_ = [];
    }
    window._handlers_.push(new GamePokerPlayOrderErrorEventHandler());
} (this, this.Utils, this.Handler, this.ClientEventCodes, this.ServerEventCodes));
