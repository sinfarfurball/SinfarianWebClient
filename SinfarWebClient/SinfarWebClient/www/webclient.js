﻿var app = angular.module('sinfarWebclient', ['ngMaterial', 'ngSanitize', 'ngStorage']);
app.run(function ($rootScope) {
    $rootScope._ = window._;
});

app.config(function ($mdThemingProvider, $mdIconProvider) {
    $mdThemingProvider.theme('default')
      .dark()
      .primaryPalette('amber', {
          'default': '400', // by default use shade 400 from the pink palette for primary intentions
          'hue-1': '200', // use shade 100 for the <code>md-hue-1</code> class
          'hue-2': '600', // use shade 600 for the <code>md-hue-2</code> class
          'hue-3': 'A400' // use shade A100 for the <code>md-hue-3</code> class
      })
      .accentPalette('orange');
    //.backgroundPalette('black');

    $mdIconProvider.fontSet('fa', 'fontawesome');
});

app.service('thisPlayer', function () {
    var player = {};
    this.set = function (attr, value) {
        player[attr] = value;
    }
    this.get = function (attr) {
        return player[attr];
    }
    this.setFull = function (newPlayer) {
        player = {};
        player = newPlayer
    }
});
app.service('alerts', function () {
    var alerts = [];
    this.getAlerts = function () {
        return alerts;
    }
    this.addAlert = function (newType, newMsg) {
        alerts.push({ type: newType, msg: newMsg });
    }
    this.closeAlert = function (i) {
        alerts.splice(i, 1);
    }
})
app.service('friendList', function () {
    var friendList = [];
    this.checkFriend = function (id) {
        return (friendList.indexOf(id) > -1) ? true : false;
    }
    this.addFriend = function (id) {
        friendList.push(id);
    }
    this.removeFriend = function (id) {
        friendList.splice(friendList.indexOf(id), 1);
    }
});
app.service('ignoreList', function () {
    var ignoreList = [];
    this.checkIgnore = function (id) {
        return (ignoreList.indexOf(id) > -1) ? true : false;
    }
    this.addIgnore = function (id) {
        ignoreList.push(id);
    }
    this.removeIgnore = function (id) {
        ignoreList.splice(ignoreList.indexOf(id), 1);
    }
});
app.service('settingsStore', function ($http, $httpParamSerializerJQLike) {
    var settings = {};

    function initSettings() {
        $http.get("http://nwn.sinfar.net/get_settings.php?group=chat")
            .then(function (response) {
                settings = {};
                angular.forEach(response.data, function (value, key) {
                    if (value.slice(0, 7) == "angular") {
                        settings[key] = JSON.parse(value.slice(7));
                    } else {
                        settings[key] = value;
                    }
                });
                //settings = response.data
            }, function (response) {
                //error
            }
        );
    }
    function postSettings(data) {
        var p = {};
        p.chat = {};
        angular.forEach(data, function (value, key) {
            if (value !== null && typeof value === 'object') {
                p.chat[key] = 'angular' + JSON.stringify(value);
            } else {
                p.chat[key] = value;
            }
        });
        $http({
            method: 'POST',
            url: "http://nwn.sinfar.net/save_settings.php",
            data: $httpParamSerializerJQLike(p),
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }).then(
            function (response) {
                //settings saved
            }, function (response) {
                //error
            }
        );
    }

    this.init = function () {
        initSettings();
    }
    this.getSettings = function () {
        return settings;
    }
    this.saveSettings = function () {
        postSettings(settings);
    }
    this.set = function (prop, val) {
        settings[prop] = val;
        postSettings(settings);
    }
    this.get = function (prop) {
        return settings[prop];
    }
});
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

app.controller('mainCtrl', function ($scope, $http, $timeout, $window, $filter, $mdMedia, $mdDialog, $mdSidenav, $localStorage, alerts, thisPlayer, chatMsgs, settingsStore) {
    var chatFailCount = 0;
    //callbacks
    function tblScrape(table) {
        var rows = table.rows;
        var propCells = rows[0].cells;
        var propNames = [];
        var results = []
        var obj, row, cells;

        for (var i = 0, iLen = propCells.length; i < iLen; i++) {
            propNames.push(propCells[i].textContent || propCells[i].innerText);
        }

        for (var j = 1, jLen = rows.length; j < jLen; j++) {
            cells = rows[j].cells;
            obj = {};

            for (var k = 0; k < iLen; k++) {
                obj[propNames[k]] = cells[k].textContent || cells[k].innerText;
            }
            results.push(obj);
        }
        return results;
    }
    function getOnlinePlayers() {
        $http.get("http://nwn.sinfar.net/getonlineplayers.php?nocache=" + new Date().getTime())
            .then(function (response) {
                if (angular.isArray(response.data)) {
                    var pList = {};
                    var orderID = ['pcName','playerName'];
                    //process json
                    angular.forEach($scope.servers, function (server, key) {//add sort that is adjstable to user for server orders or for server hiding?
                        //orderID = 'pcName';
                        //if (server.port == 'web') { orderID = 'playerName'; }
                        pList[server.name] = $filter('orderBy')($filter('filter')(response.data, { chatClient: server.port }),orderID);
                    });
                    $scope.playerList = angular.copy(pList);
                }
                $timeout(function () {
                    getOnlinePlayers();
                }, 60 * 1000);
            },
            function () {
                //http failed
                $timeout(function () {
                    getOnlinePlayers();
                }, 60 * 1000);
            });
    }
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
                chatFailCount = 0;
                pollChat();
            }, function (response) {
                chatFailCount++;
                if (chatFailCount < 100) {
                    pollChat();
                } else {
                    alerts('danger', "An error occurred, try reloading or report this to Mavrixio (mavrixio@sinfar.net)");
                }
            }
        );
    }
    function processMessages(messages) {
        angular.forEach(messages, function (message, key) {
            var chatmsg = message;

            chatmsg.timestamp = new Date();
            chatmsg.logIndex = $scope.messageIndex++

            if ($scope.player.ignores.indexOf(chatmsg.fromPlayerId) > -1 || $scope.channels.oocList.indexOf(chatmsg.channel) > -1) {
                chatmsg.visible = false;
            } else {
                chatmsg.visible = true;
            }
            if (chatmsg.channel == "4") {
                if (chatmsg.fromPlayerId == $scope.player.id) {
                    //message from user
                    var toPlayer = null; //$filter('filter')($scope.playerList,{playerID:chatmsg.toId);
                    angular.forEach($scope.playerList,function(server,key){
                        if(toPlayer != null){
                            for(var i = 0, len = server.length; i < len; i++){
                                if (server[i].playerId == chatmsg.toId){
                                    toPlayer = server[i].playerName;
                                    break;
                                }
                            }
                        }
                    });
                    $scope.messages.pms[toPlayer].push(chatmsg);
                    if ($scope.pmTabs.indexOf(toPlayer) == -1) {
                        $scope.pmTabs.push(toPlayer);
                    }
                } else {
                    //message to user
                    $scope.messages.pms[chatmsg.fromPlayerName].push(chatmsg);
                    if ($scope.pmTabs.indexOf(chatmsg.fromPlayerName) == -1) {
                        $scope.pmTabs.push(chatmsg.fromPlayerName);
                    }
                }
            } else {
                $scope.messages.channelsLog.push(chatmsg);
            }

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
                    alerts.addAlert('success', amsg);
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
                    alerts.addAlert('danger', amsg);
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
    function loginCallback() {//allow remember me functionality from browser storage
        //login
        var fullscreen = $mdMedia('sm') || $mdMedia('xd');
        $mdDialog.show({
            fullscreen: fullscreen,
            controller: loginCtrl,
            scope: $scope,
            preserveScope: true,
            clickOutsideToClose: false,
            escapeToClose: false,
            template:
                '<md-dialog layout="column">                                                                        ' +
                '   <md-toolbar layout-align="center center">                                                       ' +
                '       <h1 class="md-title">Sinfar Webclient Login</h1>                                            ' +
                '   </md-toolbar>                                                                                   ' +
                '   <md-dialog-content class="md-padding" layout="column"> <br>                                     ' +
                '       <md-input-container>                                                                        ' +
                '           <label>Username</label>                                                                 ' +
                '           <input ng-model="player.name" ng-disabled="loginDisable">                               ' +
                '       </md-input-container>                                                                       ' +
                '       <md-input-container>                                                                        ' +
                '           <label>Password</label>                                                                 ' +
                '           <input type="password" ng-model="player.pwd" ng-disabled="loginDisable">                ' +
                '       </md-input-container>                                                                       ' +
                '       <md-checkbox ng-model="player.rememberMe" ng-disabled="loginDisable">                       ' +
                '           Remember Me                                                                             ' +
                '       </md-checkbox>                                                                              ' +
                '   </md-dialog-content>                                                                            ' +
                '   <md-dialog-actions layout="row">                                                                ' +
                '       <span flex></span>                                                                          ' +
                '       <md-button ng-click="loginchk()" class="md-raised md-primary" ng-disabled="loginDisable">   ' +
                '           Login                                                                                   ' +
                '       </md-button>                                                                                ' +
                '   </md-dialog-actions>                                                                            ' +
                '</md-dialog>'
        });
        function loginCtrl($scope, $mdDialog, $http, $httpParamSerializerJQLike, $filter, $localStorage) {
            function pollPlayers() {
                http.get("http://nwn.sinfar.net/getonlineplayers.php?" + Math.floor(Date.now() / 1000)).then(function (response) {
                    angular.forEach(response.data, function (player, key) {
                        if ($filter('lowercase')(player.playerName) == $filter('lowercase')($scope.player.name)) {
                            loggedIn = true;

                            $scope.player.id = player.playerId;
                            $scope.player.authed = true;
                            if ($scope.player.rememberMe) {
                                $localStorage.sinfarPlayerName = $scope.player.name;
                                $localStorage.sinfarPassword = $scope.player.pwd;
                            }
                        }
                    });
                    if (!$scope.player.authed) { $timeout(pollPlayers(), 1000); }
                });
            }

            $scope.loginDisable = false;
            $scope.loginchk = function () {
                if ($scope.player.name.length && $scope.player.pwd.length) {
                    $scope.loginDisable = true;

                    $http({
                        method: 'POST',
                        url: "http://nwn.sinfar.net/login.php",
                        data: $httpParamSerializerJQLike({ "player_name": $scope.player.name, "password": $scope.player.pwd }),
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
                    }).then(
                        function (response) {
                            if (responce.data.length < 1) {
                                //begin polling chat

                                //begin checking for player to login
                                pollPlayers();
                            } else {
                                $scope.loginDisable = false;
                                alerts.addAlert('danger', 'Error durring login.');
                            }
                        },
                        function () {
                            //error in login submission
                            scope.loginDisable = false;
                            alerts.addAlert('danger', 'Error logging in.');
                        }
                    );
                } else {
                    alerts.addAlert("danger", "Login Incomplete. Please enter both player name and password.");//incomplete login fields
                }
            }
        }
    }

    //initalize bases
    $scope.player               = {}; //logged in player details {id:playerID,name:login,pwd:password,friends:[array of friends player IDs],ignores:[array of ignored player IDs]}
    $scope.messages             = {}; //master message log. {channelsLog:[],pms:[],serverMsgs:[]}. array of objects {index:generatedIndexValue,visible:boolen,channel:messageChannel,fromID:playerID,toID:forPMsfromCurrentPlayer,msg:messageText}
    $scope.messageIndex         = 1;
    $scope.settings             = {}; //current settings
    $scope.playerList           = {}; //online players. {chatClient:serverPort:[{playerId:playerID,pcId:charID,playerName:playerLogin,pcName:charName,portrait:imageLinkPartial}]
    $scope.servers              = [{ id: 1, port: 'web', prefix: 'web', name: "Web Client" }]; //list of current servers offered. {id:index (not used),port:serverPort,prefix:shortName (not used),name:serverName}
    $scope.channels             = {}; //array for channel lists
    $scope.channels.full        = [
									{ code: 1, channel: 'Talk' },
									{ code: 3, channel: 'Whisper' },
									{ code: 31, channel: 'Quiet' },
									{ code: 32, channel: 'Silent' },
									{ code: 30, channel: 'Yell' },
									{ code: 4, channel: 'Tell' },
									{ code: 6, channel: 'Party' },
									{ code: 164, channel: 'OOC' },
									{ code: 108, channel: 'Sex' },
									{ code: 228, channel: 'PVP' },
									{ code: 116, channel: 'Action' },
									{ code: 104, channel: 'Event' },
									{ code: 132, channel: 'FFA' },
									{ code: 102, channel: 'Build' }
                                ]; //all channels
    $scope.channels.muted       = []; //muted channels
    $scope.channels.oocList     = ["4", "6", "164", "108", "228", "11", "6", "104", "132", "102"];//ooc channels (used with the player ignore)
    $scope.channels.icList      = ["1", "3", "31", "32", "30"];//ic channels
    $scope.tabs                 = []; //list of tab objects. {index:tabPosition, label:textOnTab, channels:[array of channels to add to tab]}.
    $scope.pmTabs               = []; //list of player ids in pm tabs
    $scope.alerts               = alerts.getAlerts();

    //inital values
    $scope.player.name = $localStorage.sinfarPlayerName;
    $scope.player.pwd = $localStorage.sinfarPassword;
    $scope.player.friends = $localStorage.sinfarFriends;
    $scope.player.ignores = $localStorage.sinfarIgnores;
    $scope.player.rememberMe = $localStorage.sinfarRemember
    $scope.player.authed = false;
    $http.get("http://nwn.sinfar.net/get_chat_servers.php?nocache=" + new Date().getTime())
    .then(function (response) {
        if (angular.isArray(response.data)) {
            $scope.servers = response.data;
            $scope.servers.push({ id: $scope.servers.length + 1, port: 'web', prefix: 'web', name: "Web Client" });
            angular.forEach($scope.servers, function (server, key) {
                server.expanded = false;
            })
            getOnlinePlayers();
        }
    }, function () {
        $scope.servers = [{ id: 1, port: 'web', prefix: 'web', name: "Web Client", expanded: false }];
        getOnlinePlayers();
    });

    //scoped functions
    $scope.closeAlert = function (i) { alerts.closeAlert(i); }
    $scope.login = function () { loginCallback(); }

    $scope.LeftCtrl = function () { }
    $scope.toggleSidenav = function (nav) {
        $mdSidenav(nav).toggle();
    }
});
app.controller('oldData', function ($scope, $http, $timeout, $window, $filter, $mdMedia, $mdDialog, $localStorage, alerts, thisPlayer, chatMsgs, settingsStore) {
    //begin old code
    // [[{"fromPlayerId":"23615","fromName":"furball","channel":"4","message":"XD","fromPlayerName":"furball","fromPCId":null,"fromPCName":null,"toId":"16358","fromPortrait":"\/portraits\/47074\/furballasss.jpg"}],[]]
    settingsStore.init();

    //variable initialization
    //$scope.channels.tabs		= [];//store tab custom name and assigned channels
    $scope.messagesList = { chatLog: { count: 0, messages: [], active: true }, pms: {}, serverMessages: [] }
    $scope.selChannel = "talk";
    $scope.NewLogActive = false;

    //window functions
    angular.element($window)
		.on("blur", function () {
		    $scope.originalTitle = "Sifarian Angular Chat Client";
		    $scope.windowActive = false;
		})
		.on("focus", function () {
		    $scope.pgTitle = $scope.originalTitle;
		    $scope.windowActive = true;
		})
		.on("close", function () {

		    $.ajax($scope.devPrefix + "closewebclient.php", { async: false });
		})
		.on("unload", function () {
		    $.ajax($scope.devPrefix + "closewebclient.php", { async: false });
		});

    //app functions
    $scope.exportChatlog = function () {
        var zip = new JSZip();
        var channel = "";
        var ecl = '"From","Channel","Timestamp","Message"\r\n';
        angular.forEach($scope.cmessages, function (message, key) {
            switch (message.channel) {
                case "1":
                    channel = 'Talk';
                    break;
                case "3":
                    channel = 'Whisper';
                    break;
                case "31":
                    channel = 'Quiet';
                    break;
                case "32":
                    channel = 'Silent';
                    break;
                case "30":
                    channel = 'Yell';
                    break;
                case "4":
                    channel = 'Tell';
                    break;
                case "6":
                    channel = 'Party';
                    break;
                case "164":
                    channel = 'OOC';
                    break;
                case "108":
                    channel = 'Sex';
                    break;
                case "228":
                    channel = 'PVP';
                    break;
                case "116":
                    channel = 'Action';
                    break;
                case "104":
                    channel = 'Event';
                    break;
                case "132":
                    channel = 'FFA';
                    break;
                case "102":
                    channel = 'Build';
                    break;
                default:
                    channel = '';
            }
            ecl = ecl + '"' + message.fromName + '","' + channel + '","' + message.timestamp + '","' + message.message + '"\r\n'
        });
        zip.file("Sinfar Chat Log.csv", ecl);
        var content = zip.generate({ type: "blob" });
        saveAs(content, "SinfarChatLog.zip");
    }
    $scope.msgFriend = function (player) {
        p = player.fromPlayerId;
        if (_.indexOf($scope.$storage.flist, p) == -1) {
            $scope.fndmsg = false;
        } else {
            $scope.fndmsg = true;
        }
    }
    $scope.showBio = function (pc) {
        $http.get($scope.devPrefix + "getcharbio.php?pc_id=" + pc.pcId).then(
			function (response) {
			    var moddesc = response.data;
			    var portOpen = ngDialog.open({
			        template: moddesc,
			        plain: true
			    });
			},
			function () {
			    var moddesc = "Error getting character description. Try Again.";
			    var portOpen = ngDialog.open({
			        template: moddesc,
			        plain: true,
			        showClose: false
			    });
			}
		);

    }
    $scope.showPort = function (pc) {
        var modport = "http://play.sinfar.net/" + pc.portrait.slice(1, -5) + "h.jpg"
        var portOpen = ngDialog.open({
            template: '<style>.ngdialog-content{text-align:center}</style><img src="' + modport + '">',
            plain: true,
            showClose: false
        });
    }
    $scope.plist = function (player) {
        $http.get($scope.devPrefix + "search_characters.php?player_name=" + player.playerName)
		.then(function (response) {
		    var diagTemplate = '<ul style="list-style-type:none">';
		    var d = response.data.split('<table class="game_structure tablesorter alternate_row" id="tab_char_list">');
		    var tbl = d[1].split('</table>');
		    var ele = document.createElement('table');
		    ele.innerHTML = tbl[0].replace(/<img[^>]*>/g, "");

		    var plrs = tblScrape(ele);
		    plrs.forEach(function (char) {
		        if (char.PLID == player.playerId) {
		            diagTemplate = diagTemplate + '<li><i class="fa fa-bars" ng-click="showSubBio(' + char['PCID'] + ')"></i> ' + char['Character Name'] + '</li>'
		        }
		    });

		    diagTemplate = diagTemplate + "</ul>"

		    var portOpen = ngDialog.open({
		        template: diagTemplate,
		        plain: true,
		        showClose: false,
		        scope: $scope,
		        controller: ['$scope', 'ngDialog', function ($scope, ngDialog) {
		            $scope.showSubPort = function () { };
		            $scope.showSubBio = function (pcID) {
		                $http.get($scope.devPrefix + "getcharbio.php?pc_id=" + pcID).then(
							function (response) {
							    var moddesc = response.data;
							    var subBio = ngDialog.open({
							        template: moddesc,
							        plain: true
							    });
							},
							function () {
							    var moddesc = "Error getting character description. Try Again.";
							    var subBio = ngDialog.open({
							        template: moddesc,
							        plain: true,
							        showClose: false
							    });
							}
						);
		            };
		        }]
		    });
		});
    }
    $scope.setPM = function (player) {
        var p = "";
        if ("fromPlayerName" in player) {
            p = player.fromPlayerName;
        } else {
            p = player.playerName;
        }
        el = document.getElementById("textarea-chat-bar");
        el.innerHTML = '/tp "' + p + '"&nbsp';
        el.focus();
        if (typeof window.getSelection != "undefined"
				&& typeof document.createRange != "undefined") {
            var range = document.createRange();
            range.selectNodeContents(el);
            range.collapse(false);
            var sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
        } else if (typeof document.body.createTextRange != "undefined") {
            var textRange = document.body.createTextRange();
            textRange.moveToElementText(el);
            textRange.collapse(false);
            textRange.select();
        }
        $('.cd-panel').removeClass('is-visible');
    }
    $scope.sChat = function () {
        var msg = document.getElementById("textarea-chat-bar");
        //var msgTxt = msg.textContent.replace(/[\n\r]/g,'') || msg.innerText.replace(/[\n\r]/g,'');
        var msgTxt = msg.textContent || msg.innerText;
        var postmsg = $.param({ "chat-message": msgTxt, "channel": $scope.chatMessageChannel });
        if (msgTxt.slice(0, 3) === "/tp") {
            $scope.pmHolder.held = true;
            $scope.pmHolder.playerId = window.thisPlayerId;
            $scope.pmHolder.toPlayer = msgTxt.match(/\"(.*?)\"/)[1];
            $scope.pmHolder.toMsg = msgTxt.slice($scope.pmHolder.toPlayer.length + 7);
        }
        $http({
            method: 'POST',
            url: $scope.devPrefix + "sendchat.php",
            data: postmsg,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
    }
    $scope.msgReset = function () {
        var msg = document.getElementById("textarea-chat-bar");
        if ($scope.messagesList.chatLog.active) {
            msg.innerHTML = "";
        } else {
            angular.forEach($scope.messagesList.pms, function (value, key) {
                if ($scope.messagesList.pms[key].active) {
                    msg.innerHTML = '/tp "' + key + '" ';
                }
            })
        }
    }
    $scope.chatTabSwitch = function (tab) {
        switch (tab) {
            case "NewLog":
                $scope.messagesList.chatLog.count = 0;
                document.getElementById("textarea-chat-bar").innerHTML = "";
                break;
            default:
                $scope.messagesList.pms[tab].count = 0;
                document.getElementById("textarea-chat-bar").innerHTML = '/tp "' + tab + '" ';
        }
    }
    $scope.removeTab = function (event, index, tab) {
        event.preventDefault();
        event.stopPropagation();
        //$scope.tabs.splice(index, 1);
        delete $scope.messagesList.pms[tab];
    };
    $scope.remTab = function (tab) {
        $scope.messagesList.chatLog.active = true;
        delete $scope.messagesList.pms[tab];
        /*		var t = {};
                angular.forEach($scope.messagesList.pms, function(value, key){
                    if((key!==tab)){
                        t[key] = $scope.messagesList.pms[key];
                    }
                });
                $scope.messagesList.pms = t;*/
    }
});