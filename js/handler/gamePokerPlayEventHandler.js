;(function(window, Utils, Handler, ClientEventCodes, ServerEventCodes, Poker) {
    'use strict';

    function GamePokerPlayEventHandler() {
        this.code = ClientEventCodes.CODE_GAME_POKER_PLAY;
    }

    Utils.extend(GamePokerPlayEventHandler, Handler);

    GamePokerPlayEventHandler.prototype.handle = function(client, panel, clientTransferData) {
        var obj = JSON.parse(clientTransferData.data);

        panel.append("轮到你出牌，你的手牌如下：");
        panel.append(Poker.toString(obj.pokers));
        panel.append("请输入要出的牌（输入 exit/e 退出房间，输入 pass/p 不出，输入 view/v 查看所有有效组合）。");

        panel.waitInput()
            .then(s => inputResolve(client, panel, obj, s));
    };

    function inputResolve(client, panel, obj, s) {
        if (Utils.isEmpty(s)) {
            panel.waitInput()
                .then(s => inputResolve(client, panel, obj, s));
        } else {
            s = s.toLowerCase();
            // 跳过
            if (s == "pass" || s == "p") {
                client.send(ServerEventCodes.CODE_GAME_POKER_PLAY_PASS, null, null);
            }
            // 退出游戏
            else if (s == "exit" || s == "e") {
                client.send(ServerEventCodes.CODE_CLIENT_EXIT, null, null);
            }
            // 出牌推荐
            else if (s == "view" || s == "v") {
                panel.append("暂不支持此功能。");
                panel.waitInput()
                    .then(s => inputResolve(client, panel, obj, s));
                return;
            }
            // 出牌
            else {
                var splits = s.split("");
                var pokerAliases = [];
                var access = true;

                for (var str of splits) {
                    if (str != "    " || str != "\t") {
                        if (!Poker.isVaildAlias(str)) {
                            access = false;
                            break;
                        }

                        pokerAliases.push(str);
                    }
                }

                if (access) {
                    client.send(ServerEventCodes.CODE_GAME_POKER_PLAY, JSON.stringify(pokerAliases), null);
                } else {
                    panel.append("输入无效。");

                    if (client.getLastPokers() != null) {
                        panel.append(client.getLastSellClientNickname() + "[" + Utils.translateDisplayValue(client.getLastSellClientType()) + "] 打出：");
                        panel.append(Poker.toString(client.getLastPokers()));
                    }

                    panel.waitInput()
                        .then(s => inputResolve(client, panel, obj, s));
                }
            }
        }
    }

    if (!window._handlers_) {
        window._handlers_ = [];
    }
    window._handlers_.push(new GamePokerPlayEventHandler());
} (this, this.Utils, this.Handler, this.ClientEventCodes, this.ServerEventCodes, this.Poker));
