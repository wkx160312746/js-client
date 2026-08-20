;(function(window, Utils, Handler, ClientEventCodes, ServerEventCodes) {
    'use strict';

    function GamePokerPlayCantPassEventHandler() {
        this.code = ClientEventCodes.CODE_GAME_POKER_PLAY_CANT_PASS;
    }

    Utils.extend(GamePokerPlayCantPassEventHandler, Handler);

    GamePokerPlayCantPassEventHandler.prototype.handle = function(client, panel, clientTransferData) {
        panel.append("上一手牌由你打出，本回合不能不出。");
        client.send(ServerEventCodes.CODE_GAME_POKER_PLAY_REDIRECT, null, null);
    };

    if (!window._handlers_) {
        window._handlers_ = [];
    }
    window._handlers_.push(new GamePokerPlayCantPassEventHandler());
} (this, this.Utils, this.Handler, this.ClientEventCodes, this.ServerEventCodes));
