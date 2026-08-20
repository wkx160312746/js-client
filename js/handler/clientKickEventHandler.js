;(function(window, Utils, Handler, ClientEventCodes, ServerEventCodes) {
    'use strict';

    function ClientKickEventHandler() {
        this.code = ClientEventCodes.CODE_CLIENT_KICK;
    }

    Utils.extend(ClientKickEventHandler, Handler);

    ClientKickEventHandler.prototype.handle = function(client, panel, clientTransferData) {
        panel.append("你因长时间未操作已被移出房间。\n");
        client.dispatch({code: ClientEventCodes.CODE_SHOW_OPTIONS, data: null, info: null});
    };

    if (!window._handlers_) {
        window._handlers_ = [];
    }
    window._handlers_.push(new ClientKickEventHandler());
} (this, this.Utils, this.Handler, this.ClientEventCodes, this.ServerEventCodes));
