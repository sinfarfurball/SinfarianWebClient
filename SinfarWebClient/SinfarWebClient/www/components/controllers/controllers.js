//controller bindings
app.controller('primaryPageCtrl', primaryPageController);
app.controller('loginCtrl', loginController);
app.controller('chatLogCtrl', chatLogController);
app.controller('playerListCtrl', playerListController);
app.controller('settingsCtrl', settingsController);

//controller functions
function primaryPageController($scope, $mdDialog, $mdSidenav, thisPlayer) {
    $scope.tnav = {};
    $scope.tnav.playerListNav = true;
    //load login modal
    $scope.toggleSidenav = function (nav) {
        $mdSidenav(nav).toggle();
    }
    $scope.loginDiag = function (ev) {
        $mdDialog.show({
            //locals: { diagPlayerName: $scope.playerName, diagPassword: $scope.password },
            templateUrl: 'partials/dialogs/login.html',
            controller: 'loginCtrl'
        });
    };
    $scope.playerName = thisPlayer.get('playerName');
    $scope.loginDiag();
    $scope.$watch(
        function () { return thisPlayer.get('playerName') },
        function (newVal, oldVal) {
            $scope.playerName = newVal;
        }
    );
};
//!!need to add playerlist updates and chat polling
function loginController($scope, $http, $httpParamSerializerJQLike, $timeout, $mdDialog, thisPlayer, alerts, chatMsgs, $filter, settingsStore) {
    $scope.loginDisable = false;
    $scope.loginchk = function () {
        if ($scope.playerName.length && $scope.password.length) {
            $scope.loginDisable = true;
            $scope.loginDC = false;
            $http({
                method: 'POST',
                url: "http://nwn.sinfar.net/login.php",
                data: $httpParamSerializerJQLike({ "player_name": $scope.playerName, "password": $scope.password }),
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            })
            .then(function (responce) {
                if (responce.data.length < 1) {
                    chatMsgs.updateChat();
                    $timeout(function () {
                        do {
                            var loginCheck = $.ajax("http://nwn.sinfar.net/getonlineplayers.php?" + Math.floor(Date.now() / 1000), { async: false });
                            var loginchk = loginCheck.responseText;
                            var loginchkArr = angular.fromJson(loginchk);
                            var logPlayer = $filter('filter')($filter('lowercase')(loginchkArr), { playerName: $filter('lowercase')($scope.playerName) });
                            if (logPlayer.length) {
                                thisPlayer.setFull(logPlayer[0]);
                                $scope.loginshow = thisPlayer.get('playerId');
                                $mdDialog.hide();
                            }
                        } while (!$scope.loginshow);
                    }, 1000);
                    //updatePlayersList
                } else {
                    $scope.loginDisable = false;
                    alerts.addAlert('danger', responce.data);
                }
            }, function () {
                $scope.loginDisable = false;
                alerts.addAlert('danger', 'Error logging in.');
            });
        } else {
            alerts.addAlert("danger", "Login Incomplete. Please enter both player name and password.");//incomplete login fields
        }
    };
};
function chatLogController($scope, $http, thisPlayer, alerts, chatMsgs) {


    function unEscape(str) {
        var escapeMap = {
            '&amp;': '&',
            '&lt;': '<',
            '&gt;': '>',
            '&quot;': '"',
            '&#x27;': "'",
            '&#x60;': '`',
            '&nbsp;': ' '
        };
        var replaceRegexp = RegExp('(?:' + Object.keys(escapeMap).join('|') + ')', 'g');
        var escaper = function (match) { return escapeMap[match] || ""; }
        return str.replace(replaceRegexp, escaper);

    }
    function alertMsg(msg) {
        msg.message = msg.message.replace(/<(?:.|\n)*?>/gm, '');
        if (!$scope.windowActive) {
            $scope.pgTitle = msg.message;
        }
        if (!$scope.windowActive && $scope.notifyPermission && msg.channel == 4) {
            var tell = new Notify(msg.fromName, {
                icon: msg.portrait,
                body: unEscape(msg.message),
                timeout: 5
            });
            tell.show();
        }
    }
    function processCommands(commands) {

        /*
                        else if (cmd.tag == "SOUND" || cmd.tag == "IMAGE" || cmd.tag == "VIDEO" || cmd.tag == 'YOUTUBE')
                        {
                            var cmdParams = cmd.params.split("|#$");
                            cmd.params = '<table><tr><td style="vertical-align:middle;text-align:right;">' + cmdParams[0] + ':</td><td>'
                            if (cmd.tag == 'SOUND')
                            {
                                stopMedias(cmdParams[2] != "");
                                if (cmdParams[1] == "") continue;
                                cmd.params += '<audio class="script-sound" controls ' + (cmdParams[2]?"loop":"") + ' ><source src="' + cmdParams[1] + '">Change of browser! Try Google Chrome.</audio><script>$(".script-sound").last()[0].play();</script>';
                            }
                            else if (cmd.tag == 'VIDEO')
                            {
                                stopMedias();
                                cmd.params += '<video controls><source src="' + cmdParams[1] + '">Change of browser! Try Google Chrome.</video><script>$("video").last()[0].play();</script>';
                            }
                            else if (cmd.tag == 'IMAGE')
                            {
                                cmd.params += '<img src="' + cmdParams[1] + '" />';		
                            }
                            else if (cmd.tag == 'YOUTUBE')
                            {
                                cmd.params += '<iframe width="560" height="315" frameborder="0" src="//www.youtube.com/embed/' + cmdParams[1] + '" allowfullscreen ></iframe>';			
                            }
                            cmd.params += '</td></tr></table>';
                        }
        
        
        
                        $("#table-chat-messages").append(
                            '<div>' +
                                '<span></span>' +
                                '<span>' + cmd.params  + '</span>' +
                            '</div>'
                        );
                    }
                }*/
    }
    function displayChatMessages(chatMessages) { }//adjust for ignore list to just be hidden instead of removed

    $scope.chatLog = chatMsgs.getChat();
};
function playerListController($scope, $timeout, Restangular, alerts, thisPlayer, friendList, ignoreList) {
    $scope.openMenu = function ($mdOpenMenu, ev) {
        $mdOpenMenu(ev);
    };
    $scope.servers = [
        { name: 'Web', expanded: false, order: 'playerName', port: 'web' },
        { name: 'Sinfar', expanded: false, order: 'pcName', port: '5121' },
        { name: 'Dread', expanded: false, order: 'pcName', port: '5122' },
        { name: 'Arche', expanded: false, order: 'pcName', port: '5124' },
    ];//for future expansion would be nice to be able to pull list of servers... (instead of hard coding)
    $timeout(function () {
        $scope.players = Restangular.all('getonlineplayers').getList().$object;//move to exposed restangular service? (for polling when not viewing chatlogs/notifications of log in/out from settings screen?)
    }, 10 * 1000);

    $scope.addFriend = function (id) {
        friendList.addFriend(id);
    }
    $scope.remFriend = function (id) {
        friendList.removeFriend(id);
    }
    $scope.mutePlayer = function (id) {
        ignoreList.addIgnore(id);
    }
    $scope.unmutePlayer = function (id) {
        ignoreList.removeIgnore(id);
    }
}
function settingsController($scope, Restangular, thisPlayer, friendList, ignoreList) {

}