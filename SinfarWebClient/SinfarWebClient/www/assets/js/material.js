var app = angular.module('myApp', ['ngMaterial', 'luegg.directives', 'ngSanitize', 'ngDialog', 'restangular']);
app.run(function ($rootScope) {
    $rootScope._ = window._;
});
//app configs
app.config(function ($mdThemingProvider, RestangularProvider) {
    $mdThemingProvider.theme('default')
      .dark()
      .primaryPalette('amber', {
          'default': '400', // by default use shade 400 from the pink palette for primary intentions
          'hue-1': '200', // use shade 100 for the <code>md-hue-1</code> class
          'hue-2': '600', // use shade 600 for the <code>md-hue-2</code> class
          'hue-3': 'A400' // use shade A100 for the <code>md-hue-3</code> class
      })
      .accentPalette('orange');
    RestangularProvider.setBaseUrl('http://nwn.sinfar.net/');
    RestangularProvider.setRequestSuffix('.php');

});

//filters
app.filter('muteFilter', function () {
    return function (items, props) {
        var out = [];

        if (angular.isArray(items)) {
            items.forEach(function (item) {
                var itemMatches = false;

                var keys = Object.keys(props);
                for (var i = 0; i < keys.length; i++) {
                    var prop = keys[i];
                    var text = props[prop].toLowerCase();
                    if (item[prop].toString().toLowerCase().indexOf(text) !== -1) {
                        itemMatches = true;
                        break;
                    }
                }

                if (itemMatches) {
                    out.push(item);
                }
            });
        } else {
            // Let the output be the input untouched
            out = items;
        }

        return out;
    };
});

app.controller('chatCtrl', function ($scope, $http, $timeout, $window, ngDialog, alerts, thisPlayer, chatMsgs, settingsStore) {

    $scope.alerts = alerts.getAlerts();
    $scope.closeAlert = function (i) { alerts.closeAlert(i); }
    settingsStore.init();

    //variable initialization

    //$scope.devPrefix			= "/";

    //$scope.chatMessageChannel = "talk";//default message channel, can also be changed dynamicaly in code
    //$scope.messages = TAFFY();//messages table for storage/manipulation.
    $scope.channels = {};//array for channel lists
    $scope.channels.full = [
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
    ];//all channels
    $scope.channels.muted = [];//muted channels
    $scope.channels.oocList = ["4", "6", "164", "108", "228", "11", "6", "104", "132", "102"];//ooc channels (used with the player ignore)
    $scope.channels.icList = ["1", "3", "31", "32", "30"];//ic channels
    //$scope.channels.tabs		= [];//store tab custom name and assigned channels
    $scope.messagesList = { chatLog: { count: 0, messages: [], active: true }, pms: {}, serverMessages: [] }
    $scope.selChannel = "talk";

    $scope.NewLogActive = false;

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
