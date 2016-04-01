var linkPrefix = "http://nwn.sinfar.net/";
var theme;
//var linkPrefix = "./";
var app = angular.module('sinfarWebclient', ['ngMaterial', 'ngSanitize', 'ngStorage', 'luegg.directives', 'ngFileUpload']);
app.run(function ($rootScope) {
    $rootScope._ = window._;
});
app.run(function($http) {
      window.onbeforeunload = function () {
          $http.get(linkPrefix + "closewebclient.php");
      };
});
app.run(function ($rootScope) {
    $rootScope.getMaterialColor = function (base, shade) {
        var rgba = theme[base][shade].value;
        var hex = rgbToHex(rgba[0], rgba[1], rgba[2])
        return hex;
    };
});
function rgbToHex(r, g, b) {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}
function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

/* Need to fix
 * ----------
 * PM Tabs
 * ---Need to destroy tabs on disable of toggle
 * ---need to not create furball tab for all tells
 * ---need to remove tells from chat flow (remove channel from all tabs)
 * ---new filter prevents muting tells.
 * ---when on a pmTab it should auto set the message field with the tp prefix
 * When uploading a portrait, need to refresh the one in the char list... also need to error check for bad uploads
 * 
 * Friend login/out notifications - hold for later update
 * profanity filter - hold for later update
 * rp notes - hold for later update
 * option to only show players from certian servers?
 * 
 * group player chars by server
 * 
 * devautologin cookie setup
 * 
 * character encoding issues for in game client
 */

app.config(function ($mdThemingProvider, $mdIconProvider) {
    $mdThemingProvider.definePalette('sinfarGold', {
        '50': '#fbf9f7',
        '100': '#e0d7c4',
        '200': '#cdbda0',
        '300': '#b49d71',
        '400': '#aa8f5d',
        '500': '#987f50',
        '600': '#846e45',
        '700': '#705d3b',
        '800': '#5c4d30',
        '900': '#483c26',
        'A100': '#fbf9f7',
        'A200': '#e0d7c4',
        'A400': '#aa8f5d',
        'A700': '#705d3b',
        'contrastDefaultColor': 'light',
        'contrastDarkColors': '50 100 200 A100 A200'
    });
    $mdThemingProvider.definePalette('sinfarCold', {
        '50': '#f7f8fb',
        '100': '#c4cee0',
        '200': '#a0afcd',
        '300': '#7188b4',
        '400': '#5d78aa',
        '500': '#506998',
        '600': '#455b84',
        '700': '#3b4d70',
        '800': '#303f5c',
        '900': '#263248',
        'A100': '#f7f8fb',
        'A200': '#c4cee0',
        'A400': '#5d78aa',
        'A700': '#3b4d70',
        'contrastDefaultColor': 'light',
        'contrastDarkColors': '50 100 200 300 A100 A200'
    });
    $mdThemingProvider.definePalette('sinfarRose', {
        '50': '#fbf7f7',
        '100': '#e0c9c4',
        '200': '#cda7a0',
        '300': '#b47b71',
        '400': '#aa695d',
        '500': '#985b50',
        '600': '#844f45',
        '700': '#70433b',
        '800': '#5c3730',
        '900': '#482b26',
        'A100': '#fbf7f7',
        'A200': '#e0c9c4',
        'A400': '#aa695d',
        'A700': '#70433b',
        'contrastDefaultColor': 'light',
        'contrastDarkColors': '50 100 200 300 A100 A200'
    });
    $mdThemingProvider.theme('default')
        .dark()
        .primaryPalette('sinfarGold')
        .accentPalette('sinfarRose', {
            'default': '500',
            'hue-1': '300',
            'hue-2': '800',
            'hue-3': 'A100'
        });
    //.backgroundPalette('black');

    $mdThemingProvider.theme('settings')
        .dark()
        .primaryPalette('sinfarCold')
        .accentPalette('sinfarGold', {
            'default': '500',
            'hue-1': '300',
            'hue-2': '800',
            'hue-3': 'A100'
        });

    $mdIconProvider.fontSet('fa', 'fontawesome');
    theme = $mdThemingProvider._PALETTES;
});

app.filter('inArray', function($filter){
    return function(list, arrayFilter, element){
        if(arrayFilter){
            return $filter("filter")(list, function(listItem){
                return arrayFilter.indexOf(listItem[element]) != -1;
            });
        }
    };
});
app.filter('trustUrl', function ($sce) {
    return function (url) {
        return $sce.trustAsResourceUrl(url);
    };
});
app.factory('audio', function ($document) {
    var audioElement = $document[0].createElement('audio');
    return {
        audioElement: audioElement,

        play: function (filename) {
            audioElement.src = filename;
            audioElement.play();
        }
    }
});

app.controller('mainCtrl', function ($scope, $http, $httpParamSerializerJQLike, $timeout, $window, $filter, $mdMedia, $mdDialog, $mdToast, $mdSidenav, $localStorage, Upload, audio) {
    var chatFailCount = 0;
    //callbacks
        function flattenSettings (data) {
            var result = {};
            function recurse(cur, prop) {
                if (Object(cur) !== cur) {
                    result[prop] = cur;
                } else if (Array.isArray(cur)) {
                    for (var i = 0, l = cur.length; i < l; i++)
                        recurse(cur[i], prop + "[" + i + "]");
                    if (l == 0)
                        result[prop] = [];
                } else {
                    var isEmpty = true;
                    for (var p in cur) {
                        isEmpty = false;
                        recurse(cur[p], prop ? prop + "." + p : p);
                    }
                    if (isEmpty && prop)
                        result[prop] = {};
                }
            }
            recurse(data, "");
            return result;
        }
        function unflattenSettings (data) {
            "use strict";
            if (Object(data) !== data || Array.isArray(data))
                return data;
            var regex = /\.?([^.\[\]]+)|\[(\d+)\]/g,
                resultholder = {};
            for (var p in data) {
                var cur = resultholder,
                    prop = "",
                    m;
                while (m = regex.exec(p)) {
                    cur = cur[prop] || (cur[prop] = (m[2] ? [] : {}));
                    prop = m[2] || m[1];
                }
                cur[prop] = data[p];
            }
            return resultholder[""] || resultholder;
        };

        function openSaveAsDialog(filename, content, mediaType) {
            var blob = new Blob([content], { type: mediaType });
            saveAs(blob, filename);
        }
        function addAlert(newType, newMsg) {
            if (newType == 'success') {
                newMsg = '<md-toast>' + newMsg + '</md-toast';
                $mdToast.show(
                    {
                        template: newMsg,
                        autoWrap: true,
                        hideDelay:5000,
                        position: 'top right'
                    });

            } else {
                newMsg = '<md-toast>' + newMsg + '</md-toast>';
                $mdToast.show(
                    {
                        template: newMsg,
                        autoWrap: true,
                        hideDelay: 5000,
                        position: 'top right'
                    });

            }
        }
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
            $http.get(linkPrefix + "getonlineplayers.php?nocache=" + new Date().getTime())
                .then(function (response) {
                    if (angular.isArray(response.data)) {
                        var pList = {};
                        var orderID = ['pcName','playerName'];
                        angular.forEach($scope.servers, function (server, key) {
                            server.players = $filter('orderBy')($filter('filter')(response.data, { chatClient: server.port }),orderID);
                        });
                        angular.forEach(response.data, function (player, key) {
                            if (player.playerId == $scope.player.id) {
                                $scope.player.charName = player.pcName;
                                $scope.player.charID = player.pcId;
                                var lookupID = player.portrait.split("/");
                                if ($scope.player.pcID != lookupID[2]) {
                                    $http.get(linkPrefix + "getcharbio.php?pc_id=" + lookupID[2]).then(function (response) {
                                        $scope.player.pcBio = _.unescape(response.data).replace(/<(?:.|\n)*?>/gm, '');
                                    });
                                    $scope.player.pcID = lookupID[2];

                                }
                            }
                        });
                        $scope.player.charName = $filter('filter')(response.data, { playerId: $scope.player.id })[0].pcName || null;
                    }
                    $timeout(function () {
                        getOnlinePlayers();
                    }, 15 * 1000);
                },
                function () {
                    //http failed
                    $timeout(function () {
                        getOnlinePlayers();
                    }, 15 * 1000);
                });
        }
        function pollChat() {
            $http.get(linkPrefix + "getchat.php?nocache=" + new Date().getTime())
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
                chatmsg.logIndex = $scope.messages.messageIndex;
                $scope.messages.messageIndex = $scope.messages.messageIndex + 1;
                chatmsg.message = Autolinker.link(chatmsg.message, { className: "messageLink" });

                if (chatmsg.channel == 4) {
                    chatmsg.toPlayerName = chatmsg.toPlayerName || $scope.player.name;

                    if (chatmsg.fromPlayerId == $scope.player.id) {
                        var pmTabLabel = $scope.player.name;
                    } else {
                        var pmTabLabel = chatmsg.fromPlayerName;
                    }
                    if ($scope.settings.pmTabs && $scope.pmTabs.indexOf(pmTabLabel) == -1) {
                        $scope.pmTabs.push(pmTabLabel);
                    }
                    if (!windowFocused && $scope.settings.bell) {
                        audio.play($scope.settings.pmBell);
                    }
                }
                if ($scope.settings.ignores.indexOf(chatmsg.fromPlayerId) > -1 && $scope.channels.oocList.indexOf(chatmsg.channel)>-1) {
                    chatmsg.mute = true;
                } else {
                    chatmsg.mute = false;
                }
                do {
                    if ($scope.messages.channelsLog.length > 500) {
                        $scope.messages.channelsArchive.push($scope.messages.channelsLog.shift());
                    }
                }
                while ($scope.messages.channelsLog.length > 500);

                $scope.messages.channelsLog.push(chatmsg);
                $scope.missedMessgeCount = $scope.missedMessageCount + 1;
            });
        }
        function processCommands(commands) {
            angular.forEach(commands, function (chatcmd, key) {
                //instead of adding to chat log, issue alert (ngMessages?) - for server messages, need to work sound, image, video, youtube.
                var chatMsgs = [];//only here for error supression
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
                        addAlert('success', amsg);
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
                        addAlert('danger', amsg);
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
                    '       <md-checkbox ng-model="player.rememberMe" ng-disabled="loginDisable" class="md-accent">     ' +
                    '           <span style="color:white;">Remember Me</span>                                           ' +
                    '       </md-checkbox>                                                                              ' +
                    '   </md-dialog-content>                                                                            ' +
                    '   <md-dialog-actions layout="row">                                                                ' +
                    '       <span flex></span>                                                                          ' +
                    '       <md-button ng-click="closeLogin()" class="md-raised md-accent" ng-disabled="loginDisable">  ' +
                    '           Cancel                                                                                  ' +
                    '       </md-button>                                                                                ' +
                    '       <md-button ng-click="loginchk()" class="md-raised md-primary" ng-disabled="loginDisable">   ' +
                    '           Login                                                                                   ' +
                    '       </md-button>                                                                                ' +
                    '   </md-dialog-actions>                                                                            ' +
                    '</md-dialog>'
            });
            function loginCtrl($scope, $mdDialog, $http, $httpParamSerializerJQLike, $filter, $localStorage) {
                function pollPlayers() {
                    $http.get(linkPrefix + "getonlineplayers.php?" + Math.floor(Date.now() / 1000)).then(function (response) {
                        angular.forEach(response.data, function (player, key) {
                            if ($filter('lowercase')(player.playerName) == $filter('lowercase')($scope.player.name)) {
                                loggedIn = true;

                                $scope.player.id = player.playerId;
                                if (player.pcName) {
                                    $scope.player.charName = player.pcName;
                                } else {
                                    $scope.player.charName = null;
                                }

                                $scope.player.authed = true;
                                if ($scope.player.rememberMe) {
                                    $localStorage.sinfarPlayerName = $scope.player.name;
                                    $localStorage.sinfarPassword = $scope.player.pwd;
                                    $localStorage.sinfarRemember = $scope.player.rememberMe;
                                }
                                /*$http.get(linkPrefix + "get_settings.php?group=newchat").then(function (settings) {
                                    $scope.settings = unflattenSettings(settings.data);
                                    addAlert('success', 'Settings synced from server.');
                                });*/
                                $http.get(linkPrefix + "getpcs.php?player_id=" + $scope.player.id).then(function (players) { $scope.player.pcs = players.data.pcs; });
                            }
                        });
                        if (!$scope.player.authed) {
                            $timeout(pollPlayers(), 1000);
                        } else {
                            $mdDialog.hide();
                        }
                    });
                }

                $scope.loginDisable = false;
                $scope.closeLogin = function () { $mdDialog.hide(); }
                $scope.loginchk = function () {
                    if ($scope.player.name.length && $scope.player.pwd.length) {
                        $scope.loginDisable = true;

                        $http({
                            method: 'POST',
                            url: linkPrefix + "login.php",
                            data: $httpParamSerializerJQLike({ "player_name": $scope.player.name, "password": $scope.player.pwd }),
                            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
                        }).then(
                            function (response) {
                                if (response.data.length < 1) {
                                    //begin polling chat
                                    pollChat();
                                    
                                    //begin checking for player to login
                                    pollPlayers();
                                } else {
                                    $scope.loginDisable = false;
                                    addAlert('danger', 'Error durring login.');
                                }
                            },
                            function () {
                                //error in login submission
                                scope.loginDisable = false;
                                addAlert('danger', 'Error logging in.');
                            }
                        );
                    } else {
                        addAlert("danger", "Login Incomplete. Please enter both player name and password.");//incomplete login fields
                    }
                }
            }
        }

        $scope.theme = theme;
    //initalize bases
        $scope.player = {}; //logged in player details {id:playerID,name:login,pwd:password,friends:[array of friends player IDs],ignores:[array of ignored player IDs]}
        $scope.messages = {}; //master message log. {channelsLog:[],pms:[],serverMsgs:[]}. array of objects {index:generatedIndexValue,visible:boolen,channel:messageChannel,fromID:playerID,toID:forPMsfromCurrentPlayer,msg:messageText}
        $scope.messages.channelsLog = [];
        $scope.messages.channelsArchive = [];
        $scope.messages.messageIndex = 1;
        $scope.settings = $localStorage.sinfarSettings || {};
        $scope.playerList = {}; //online players. {chatClient:serverPort:[{playerId:playerID,pcId:charID,playerName:playerLogin,pcName:charName,portrait:imageLinkPartial}]
        $scope.servers = [{ id: 1, port: 'web', prefix: 'web', name: "Web Client", expanded: false }]; //list of current servers offered. {id:index (not used),port:serverPort,prefix:shortName (not used),name:serverName}
        $scope.channels = {}; //array for channel lists
        $scope.channels.currentTab = 0;
        if (!$scope.settings.channelSelect) {
            $scope.settings.channelSelect = 'FFA';
        }
        $scope.channels.full = [
									    { code: '1', channel: 'Talk', prefix: '/tk', mute: false, ooc: false, tab: 0, dm: false },
                                        { code: '2', channel: 'Shout', prefix: '/shout', mute: false, ooc: false, tab: 0, dm: true },
									    { code: '3', channel: 'Whisper', prefix: '/w', mute: false, ooc: false, tab: 0, dm: false },
                                        { code: '18', channel: 'DM Shout', prefix: '', mute: false, ooc: false, tab: 0, dm: true },
                                        { code: '19', channel: 'DM Whisper', prefix: '', mute: false, ooc: false, tab: 0, dm: true },
                                        { code: '20', channel: 'DM Tell', prefix: '', mute: false, ooc: false, tab: 0, dm: true },
									    { code: '31', channel: 'Quiet', prefix: '/q', mute: false, ooc: false, tab: 0, dm: false },
									    { code: '32', channel: 'Silent', prefix: '/s', mute: false, ooc: false, tab: 0, dm: false },
									    { code: '30', channel: 'Yell', prefix: '/y', mute: false, ooc: false, tab: 0, dm: false },
									    { code: '4', channel: 'Tell', prefix: '/tp', mute: false, ooc: true, tab: 0, dm: false },
									    { code: '6', channel: 'Party', prefix: '/p', mute: false, ooc: true, tab: 0, dm: false },
									    { code: '164', channel: 'OOC', prefix: '/ooc', mute: false, ooc: true, tab: 0, dm: false },
									    { code: '108', channel: 'Sex', prefix: '/sex', mute: false, ooc: true, tab: 0, dm: false },
									    { code: '228', channel: 'PVP', prefix: '/pvp', mute: false, ooc: true, tab: 0, dm: false },
									    { code: '116', channel: 'Action', prefix: '/action', mute: false, ooc: true, tab: 0, dm: false },
									    { code: '104', channel: 'Event', prefix: '/event', mute: false, ooc: true, tab: 0, dm: false },
									    { code: '132', channel: 'FFA', prefix: '/ffa', mute: false, ooc: true, tab: 0, dm: false },
									    { code: '102', channel: 'Build', prefix: '/build', mute: false, ooc: true, tab: 0, dm: false }
        ]; //all channels
        $scope.customChannelTitle = '';
        if (!$scope.settings.msgColors) {
            $scope.settings.msgColors = {
                Talk: { hue: 0, sat: 0, light: 100 },
                Whisper: { hue: 0, sat: 0, light: 50 },
                Quiet: { hue: 0, sat: 0, light: 25 },
                Silent: { hue: 0, sat: 0, light: 20 },
                Yell: { hue: 0, sat: 70, light: 50 },
                Tell: { hue: 120, sat: 100, light: 50 },
                Party: { hue: 0, sat: 0, light: 100 },
                OOC: { hue: 270, sat: 20, light: 70 },
                Sex: { hue: 300, sat: 90, light: 50 },
                PVP: { hue: 15, sat: 100, light: 50 },
                Action: { hue: 30, sat: 70, light: 40 },
                Event: { hue: 280, sat: 90, light: 50 },
                FFA: { hue: 190, sat: 90, light: 50 },
                Build: { hue: 80, sat: 90, light: 50 }
            };
        }
        $scope.channels.muted = _.map($filter('filter')($scope.channels.full, { tab: $scope.channels.currentTab, mute: true }), 'code'); //muted channels
        $scope.currentChannels = _.map($filter('filter')($scope.channels.full, { tab: $scope.channels.currentTab, mute: false }), 'code');
        $scope.channels.oocList = _.map($filter('filter')($scope.channels.full, { ooc: true }), 'code');//ooc channels (used with the player ignore)
        $scope.channels.icList = _.map($filter('filter')($scope.channels.full, { ooc: false }), 'code');//ic channels
        $scope.tabs = [{ id: 0, label: 'Chat' }]; //list of tab objects. {index:tabPosition, label:textOnTab, channels:[array of channels to add to tab]}.
        $scope.settings.pmTabs = false;
        $scope.pmTabs = [];
        $scope.inFocus = true;
        $scope.msgSending = false;
        $scope.missedMessageCount = null;
        if (!$scope.settings.friends) {
            $scope.settings.friends = [];
        }
        if (!$scope.settings.ignores) {
            $scope.settings.ignores = [];
        }
        if (!$scope.settings.pmBell) {
            $scope.settings.pmBell = "http://sinfar.net/sounds/button-9.wav";
        }

    //inital values
        $scope.player.name = $localStorage.sinfarPlayerName;
        $scope.player.pwd = $localStorage.sinfarPassword;
        $scope.player.rememberMe = $localStorage.sinfarRemember;
        $scope.player.authed = false;
        $http.get(linkPrefix + "get_servers.php?nocache=" + new Date().getTime())
        .then(function (response) {
            if (angular.isArray(response.data)) {
                $scope.servers = response.data;
                $scope.servers.push({ id: 'web', port: 'web', prefix: 'web', name: "Web Client", vaultId: 'web', useWebClient: true });
                angular.forEach($scope.servers, function (server, key) {
                    server.expanded = false;
                    server.devGroupExpand = false;
                    server.devMasterServer = false;
                    $filter('filter')($scope.servers, { vaultId: server.vaultId })[0].devMasterServer = true;
                });
                getOnlinePlayers();
            }
        }, function () {
            $scope.servers = [{ id: 'web', port: 'web', prefix: 'web', name: "Web Client", expanded: false, devMasterServer: true, devGroupExpand: false, useWebClient: true, vaultId: 'web' }];
            getOnlinePlayers();
        });

        var windowFocused = true;
        angular.element($window).bind('focus', function () {
            windowFocused = true;
        }).bind('blur', function () {
            windowFocused = false;
        });
    //scoped functions
        $scope.exportChatlog = function () {//adjust to join messages and archival messages for export.
            var zip = new JSZip();
            var channel = "";
            var ecl = '"From","Channel","Timestamp","Message"\r\n';
            angular.forEach($scope.messages.channelsArchive.concat($scope.messages.channelsLog), function (message, key) {
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
        $scope.pmMatch = function( player ) {
          return function( item ) {
              if (item.toPlayerName === player || item.fromPlayerName === player) {
                  return item;
              }
          };
        };
        $scope.login = function () { loginCallback(); }
        $scope.sChat = function () {//need to add channel from selector (if channel not specified in the post)
            $scope.msgSending = true;
            var msgTxt = $scope.chatMessageToSend;
            if(msgTxt.slice(0,1) != '/'){
                msgTxt = $scope.settings.channelSelect + " " + msgTxt;
            }
            $http({
                method: 'POST',
                url: linkPrefix + "sendchat.php",
                data: $httpParamSerializerJQLike({ "chat-message": msgTxt, "channel": $scope.settings.channelSelect }),
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            }).then(
                function (response) {
                    //check if message accepted. if not display error. if accepted clear and reset inputs
                    $scope.chatMessageToSend = "";
                    $scope.msgSending = false;
                    $timeout(function () { angular.element('#msgBox').focus(); }, 500);
                },
                function () {
                    //transmission error
                    addAlert('warn', 'Error sending message. Try again.');
                    $scope.msgSending = false;
                }
            );
        }
        $scope.toggleSidenav = function (nav) {
            $mdSidenav(nav).toggle();
        }
        $scope.getMsgStyle = function (channelcode) {
            channel = $filter('filter')($scope.channels.full, { code: channelcode })[0].channel;
            if ($scope.settings.msgColors[channel]) {
                cval = tinycolor('hsl(' + $scope.settings.msgColors[channel].hue + ',' + $scope.settings.msgColors[channel].sat + '%,' + $scope.settings.msgColors[channel].light + '%)').toHex();
            } else {
                cval = 'FFFFFF'
            }
            return {
                "color": '#'+cval
            };
        }
        $scope.saveBio = function () {
            $http({
                method: 'POST',
                url: linkPrefix + "char_desc_save.php",
                data: $httpParamSerializerJQLike({ pc_id: $scope.player.selectedChar.pcID, description: $scope.player.selectedChar.DescriptionOverr[1] }),
                headers: { 'Content-type': 'application/x-www-form-urlencoded' }
            }).then(function (response) { console.log(response.data); });
        }
        $scope.muteChannel = function (muter) {
            $filter('filter')($scope.channels.full, { channel: muter })[0].mute = !$filter('filter')($scope.channels.full, { channel: muter })[0].mute;
            $scope.channels.muted = _.map($filter('filter')($scope.channels.full, { tab: $scope.channels.currentTab, mute: true }), 'code');
            $scope.currentChannels = _.map($filter('filter')($scope.channels.full, { tab: $scope.channels.currentTab, mute: false }), 'code');
        }
        $scope.addCustomChannel = function () {
            $scope.tabs.push({ id: $scope.tabs.length, label: $scope.customChannelTitle });
            $scope.customChannelTitle = '';
        }
        $scope.tabSelect = function (id) {
            $scope.channels.currentTab = id;
            $scope.currentChannels = _.map($filter('filter')($scope.channels.full, { tab: $scope.channels.currentTab, mute: false }), 'code');
            $scope.onPMTab = false;
        }
        $scope.removeTab = function (id) {
            var tabChannels = _.map($filter('filter')($scope.channels.full, { tab: id}), 'code');
            angular.forEach(tabChannels, function (channelCode, key) {
                angular.forEach($filter('filter')($scope.channels.full, { code: channelCode }), function (channel, key) {
                    channel.tab = 0;
                });
            });
            $scope.channels.currentTab = 0;/*need to check if on remove tab before setting this*/
            for (var i = 0; i < $scope.tabs.length; i++) {
                if ($scope.tabs[i].id == id) {
                    $scope.tabs.splice(i, 1);
                    break;
                }
            }
        }
        $scope.removePMTab = function (player) {
            $scope.onPMTab = false;
            $scope.channels.currentTab = 0;/*need to check if on remove tab before setting this*/
            $scope.pmTabs.splice($scope.pmTabs.indexOf(player), 1);
        }
        $scope.pmTabSelect = function (player) {
            $scope.currentChannels = ['4'];
            $scope.pmPlayer = player;
            $scope.onPMTab = true;
        }
        $scope.setPM = function (player) {
            var p = "";
            if ("fromPlayerName" in player) {
                p = player.fromPlayerName;
            } else {
                p = player.playerName;
            }
            $scope.chatMessageToSend = '/tp "' + p + '" ';
            angular.element('#msgBox').focus();
        }
        $scope.openMenu = function ($mdOpenMenu, ev) {
            $mdOpenMenu(ev);
        };
        $scope.addFriend = function (id) {
            $scope.settings.friends.push(id);
        }
        $scope.remFriend = function (id) {
            $scope.settings.friends.splice($scope.settings.friends.indexOf(id), 1);
        }
        $scope.mutePlayer = function (id) {
            $scope.settings.ignores.push(id);
        }
        $scope.unmutePlayer = function (id) {
            $scope.settings.ignores.splice($scope.settings.ignores.indexOf(id), 1);
        }
        $scope.downloadChar = function (id) {
            $window.open(linkPrefix + "get_character.php?pc_id=" + id);
        }
        $scope.clearPortrait = function () {
            $http({
                method: 'POST',
                url: linkPrefix + "portraits_delete.php",
                data: $httpParamSerializerJQLike({ "pc_id": $scope.player.pcID }),
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            }).then(
                function (response) {
                    addAlert('success','Portrait Cleared.')
                },
                function () {
                    addAlert('warn','Error clearing portrait.')
                }
            );
        }
        $scope.portraitUpload = function (files, file, newFiles, duplicateFiles, invalidFiles, event) {
            if (files.length == 1 && file.type == 'application/x-zip-compressed') {
                Upload.upload({
                    url: linkPrefix + "portraits_upload.php",
                    data: { pc_id: $scope.player.selectedChar.pcID, file: file }
                }).then(
                    function (response) {
                        angular.noop();
                    },
                    function (response) {
                        angular.noop();
                    });
            }
        }
        $scope.charInfo = function (pc) {
            var diagScope = {};
            diagScope.useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));
            $http.get(linkPrefix + "getpcs.php?player_id=" + pc.playerId)
            .then(function (response) {
                diagScope.charList = response.data.pcs;
                angular.forEach(diagScope.charList, function (char, key) {
                    char.portrait = char.portrait.slice(0, -5) + "h.jpg";
                });

                $mdDialog.show({
                    fullscreen: diagScope.useFullScreen,
                    locals: diagScope,
                    templateUrl: 'partials/moreInfo.html',
                    clickOutsideToClose: true,
                    controller: function DialogController($scope, $mdDialog, charList) {
                        $scope.charList = charList;
                        $scope.currentChar = charList[0];
                        $scope.charSelect = function (id) {
                            $scope.currentChar = charList[id];
                            $http.get(linkPrefix + "getcharbio.php?pc_id=" + $scope.currentChar.pcId).then(
                                function (response) {
                                    $scope.currentBio = response.data;
                                },
                                function () {
                                    $scope.currentBio = "Error getting character description. Try Again.";
                                }
                            );
                        }
                        $scope.dlport = function () {
                            var linker = $scope.currentChar.portrait.split("/").slice(-1)[0].slice(0,-5);
                            if (linker != 'po_hu_f_99_' && linker != 'po_hu_m_99_') {
                                //needs to be reworked to handle through angular... window popup = bad juju
                                $window.open(linkPrefix + "portraits_download_one.php?resref=" + linker);
                            }
                        }
                    },
                });

            },function(){
                addAlert('warn','Error, please try again.');
            });
        }
        $scope.pcCharSelect = function (pcid) {
            $http.get(linkPrefix + "get_character_json.php?pc_id=" + pcid).then(function (pcinfo) {
                var classQry = [];
                var featQry = [];
                var spellQry = [];
                $scope.player.selectedChar = pcinfo.data[1];

                $scope.player.selectedChar.pcID = pcid;

                $scope.player.selectedChar.dynClasses = [];
                $scope.player.selectedChar.dynSkills = [];
                $scope.player.selectedChar.dynFeats = [];
                $scope.player.selectedChar.dynSpells = [];

                angular.forEach($scope.player.selectedChar.ClassList[1], function (value, key) {
                    classQry.push({ charclass: value[1].Class[1], level: value[1].ClassLevel[1] });
                    angular.forEach(value[1], function (array, keyname) {
                        if (angular.isArray(array[1]) && array[1][0][1].Spell) {
                            angular.forEach(array[1], function (spell, spellkey) {
                                if (spellQry.indexOf(spell[1].Spell[1]) == -1) {
                                    spellQry.push(spell[1].Spell[1]);
                                }
                            });
                        }
                    });
                });
                $http.get(linkPrefix + "get_classes_info.php?rows=" + angular.toJson(_.map(classQry,'charclass'))).then(function (response) {
                    angular.forEach(response.data,function(value,key){
                        $scope.player.selectedChar.dynClasses.push({ label: value.name, level: $filter('filter')(classQry, {charclass:key})[0].level});
                    });
                });
                $http.get(linkPrefix + "get_spells_info.php?rows=" + angular.toJson(spellQry)).then(function (response) {
                    angular.forEach(response.data, function (value, key) {
                        $scope.player.selectedChar.dynSpells.push({ label: value.name });
                    });
                });

                angular.forEach($scope.player.selectedChar.FeatList[1], function (value, key) {
                    featQry.push({ label: value[1].Feat[1] });
                });
                $http.get(linkPrefix + "get_feats_info.php?rows=" + angular.toJson(_.map(featQry, 'label'))).then(function (response) {
                    angular.forEach(response.data, function (value, key) {
                        $scope.player.selectedChar.dynFeats.push({ label: value.name });
                    });
                });

                $http.get(linkPrefix + "get_skills_info.php").then(function (response) {
                    angular.forEach(response.data, function (value, key) {
                        $scope.player.selectedChar.dynSkills.push({ label: value.name, rank: $scope.player.selectedChar.SkillList[1][key][1].Rank[1] });
                    });
                });

            });
        }
    //watches
        $scope.$watch('settings', function (newSettings, oldSettings) {//this is much to often.... like with color scrolls
            var settingsTxt = flattenSettings(newSettings);
            if (!newSettings.pmTabs) { $scope.pmTabs = [];}
            $localStorage.sinfarSettings = newSettings;
            $http({
                method: 'POST',
                url: linkPrefix + "save_settings.php",
                data: $httpParamSerializerJQLike({ newChat: settingsTxt }),
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
                }).then(
                    function (response) {
                        $localStorage.sinfarSettings = newSettings;
                    },
                    function () {
                        addAlert('warn', 'Error saving settings.');
                    }
                );
        }, true);
        $scope.$watch('channels', function (newSettings, oldSettings) {
            $scope.currentChannels = _.map($filter('filter')($scope.channels.full, { tab: $scope.channels.currentTab, mute: false }), 'code');
        }, true);
});