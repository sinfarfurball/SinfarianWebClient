
app.service('chatMsgs', function ($http, alerts, thisPlayer) {
    var chatMsgs = [];
    var msgArchive = [];
    var chatFailCount = 0;
    var pollTest = true;

    function pollChat() {
        $http.get("http://nwn.sinfar.net/getchat.php?nocache=" + new Date().getTime())
			.then(function (response) {
			    var msg = response.data;
			    if (angular.isArray(msg)) {
			        if (angular.isArray(msg[0])) {
			            processMessages(msg[0]);
			        }
			        if (angular.isArray(msg[1])) {
			            processCommands(msg[1]);
			        }
			    }
			    pollChat();
			}, function (response) {
			    this.increaseFail();
			    if ($scope.getChatFailCount < 100) {
			        pollChat();
			    } else {
			        alerts('danger', "An error occurred, try reloading or report this to Mavrixio (mavrixio@sinfar.net)");
                    //reset pollTest?
			    }
			}
		);
    }
    function processMessages(messages) {
        angular.forEach(messages, function (message, key) {
            var chatmsg = message;
            /*if (chatmsg.fromPlayerId === thisPlayer.get('playerId') {
                var tempFrom = $scope.masterPlayerList({ playerId: chatmsg.toId }).first().playerName;//query playerList for playerName of chatmsg.toId
            } else {
                var tempFrom = chatmsg.fromPlayerName;
            }

            if ($scope.$storage.iglist.indexOf(chatmsg.fromPlayerId) == -1 || $scope.$storage.iglist.indexOf(chatmsg.fromPlayerId) > -1 && $scope.channels.oocList.indexOf(chatmsg.channel) === -1) {
                var t = new Date();
                chatmsg["timestamp"] = (t.getHours() < 10 ? '0' : '') + t.getHours() + ":" + (t.getMinutes() < 10 ? '0' : '') + t.getMinutes();
                if ($scope.$storage.flist.indexOf(chatmsg.fromPlayerId) == -1) {
                    chatmsg["fndmsg"] = false;
                } else {
                    chatmsg["fndmsg"] = true;
                }
                if ($scope.pmHolder.held) {
                    if (chatmsg.fromPlayerId === $scope.pmHolder.playerId && chatmsg.message === $scope.pmHolder.toMsg) {
                        chatmsg.fromName = chatmsg.fromName + " to " + $scope.pmHolder.toPlayer;
                        $scope.pmHolder.head = false;
                    }
                }
                //manipulate into new array
                if (chatmsg.channel === "4") {
                    if (!($scope.messagesList.pms[tempFrom])) {
                        $scope.messagesList.pms[tempFrom] = {};
                        $scope.messagesList.pms[tempFrom].messages = [];
                        $scope.messagesList.pms[tempFrom].count = 0;
                        $scope.messagesList.pms[tempFrom].active = false;
                    }
                    $scope.messagesList.pms[tempFrom].messages.push(chatmsg);
                    if ($scope.messagesList.pms[tempFrom].active) {
                        $scope.messagesList.pms[tempFrom].count = 0;
                    } else {
                        $scope.messagesList.pms[tempFrom].count = $scope.messagesList.pms[tempFrom].count + 1
                    }

                } else {
                    $scope.messagesList.chatLog.messages.push(chatmsg);
                    if ($scope.messagesList.chatLog.active) {
                        $scope.messagesList.chatLog.count = 0;
                    } else {
                        if ($scope.channels.muted.indexOf(chatmsg.channel) === -1) {
                            $scope.messagesList.chatLog.count = $scope.messagesList.chatLog.count + 1
                        }
                    }

                }
                $scope.messages.insert(chatmsg);
                $scope.cmessages = $scope.messages().get();

                if (!$scope.windowActive) {
                    alertMsg(chatmsg);
                    if ($scope.bell && chatmsg.channel == 4) {
                        var audio = document.getElementById("audio1");
                        audio.play();
                    }
                }
            }*/
            chatMsgs.push(chatmsg);
            while (chatMsgs.length > 1000) {
                msgArchive.push(chatMsgs[0]);
                chatMsgs.shift();
            }
            
        });
    }
    function processCommands(commands) {
        angular.forEach(commands, function (chatcmd, key) {
            //instead of adding to chat log, issue alert (ngMessages?) - for server messages, need to work sound, image, video, youtube.
            var t = new Date();
            switch (chatcmd.tag) {
                case "SCRIPT":
                    eval(chatcmd.tag);
                    break;
                case "ENTER_WC":
                case "ENTER_PLAYER":
                case "LEAVE_PLAYER":
                    amsg = chatcmd.params;
                    chatcmd.params = '<span class="chat-message-info">' + chatcmd.params + '</span>'
                    var srvmsg = [];
                    srvmsg["timestamp"] = (t.getHours() < 10 ? '0' : '') + t.getHours() + ":" + (t.getMinutes() < 10 ? '0' : '') + t.getMinutes();
                    srvmsg["fndmsg"] = false;
                    srvmsg["channel"] = 18;
                    srvmsg["fromPortrait"] = null;
                    srvmsg["fromName"] = null;
                    srvmsg["message"] = chatcmd.params;
                    //$scope.messages.insert(_.extend({}, srvmsg));
                    //$scope.cmessages = $scope.messages().get();
                    //$scope.addAlert('success', amsg);
                    chatMsgs.push(srvmsg);
                    alerts.addAlert('success',amsg);
                    break;
                case "CHAT_MESSAGE_NOT_SENT":
                    amsg = chatcmd.params;
                    chatcmd.params = '<span class="chat-message-error">' + chatcmd.params + '</span>';
                    var srvmsg = [];
                    srvmsg["timestamp"] = (t.getHours() < 10 ? '0' : '') + t.getHours() + ":" + (t.getMinutes() < 10 ? '0' : '') + t.getMinutes();
                    srvmsg["fndmsg"] = false;
                    srvmsg["channel"] = 18;
                    srvmsg["fromPortrait"] = null;
                    srvmsg["fromName"] = null;
                    srvmsg["message"] = chatcmd.params;
                    //$scope.messages.insert(_.extend({}, srvmsg));
                    //$scope.cmessages = $scope.messages().get();
                    //$scope.alerts.push({ type: 'danger', msg: amsg });
                    chatMsgs.push(srvmsg);
                    alerts.addAlert('danger',amsg);
                    break;
                case "SOUND":
                case "IMAGE":
                case "VIDEO":
                case "YOUTUBE":
                    chatcmd.params = "";
                    break;
            }
        });
    }

    this.getChat = function () {
        return chatMsgs;
    }
    this.updateChat = function () {
        if (pollTest) {
            pollTest = false;
            pollChat();
        }
    }
    this.addMsg - function (msg) {
        //add msg to chatMsgs
    }
    this.increaseFail = function () {
        chatFailCount++;
    }
    this.getFailCount = function () {
        return chatFailCount;
    }
    this.resetFailCount = function () {
        chatFailCount = 0;
    }
});