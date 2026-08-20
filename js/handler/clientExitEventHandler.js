;(function(window, Utils, Handler, ClientEventCodes, ServerEventCodes) {
    'use strict';

    function ClientExitEventHandler() {
        this.code = ClientEventCodes.CODE_CLIENT_EXIT;
    }

    Utils.extend(ClientExitEventHandler, Handler);

    ClientExitEventHandler.prototype.handle = function(client, panel, clientTransferData) {
        var obj = JSON.parse(clientTransferData.data);
        var role = obj.exitClientId == client.getClientId() ? "你" : obj.exitClientNickname;

        panel.append(role + " 已离开房间，房间已解散。\n");

        client.dispatch({code: ClientEventCodes.CODE_SHOW_OPTIONS, data: null, info: null});
        window.imClient.leave()
    };

    if (!window._handlers_) {
        window._handlers_ = [];
    }
    window._handlers_.push(new ClientExitEventHandler());
} (this, this.Utils, this.Handler, this.ClientEventCodes, this.ServerEventCodes));
