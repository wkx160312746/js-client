;(function(window, Utils, Handler, ClientEventCodes, ServerEventCodes) {
    'use strict';

    function RoomJoinSuccessEventHandler() {
        this.code = ClientEventCodes.CODE_ROOM_JOIN_SUCCESS;
    }

    Utils.extend(RoomJoinSuccessEventHandler, Handler);

    RoomJoinSuccessEventHandler.prototype.handle = function(client, panel, clientTransferData) {
        var obj = JSON.parse(clientTransferData.data);

        var joinClientId = obj.clientId;
        if(client.getClientId() == joinClientId) {
            panel.append("你已加入房间 " + obj.roomId + "，当前共有 " + obj.roomClientCount + " 名玩家。");
            panel.append("请等待其他玩家加入，满三人后即可开始游戏。");
            window.imClient.ratelRoomId = obj.roomId + ''
            window.imClient.roomList()
        }else {
            panel.append(obj.clientNickname + " 加入了房间，当前共有 " + obj.roomClientCount + " 名玩家。");
        }
    };

    if (!window._handlers_) {
        window._handlers_ = [];
    }
    window._handlers_.push(new RoomJoinSuccessEventHandler());
} (this, this.Utils, this.Handler, this.ClientEventCodes, this.ServerEventCodes));
