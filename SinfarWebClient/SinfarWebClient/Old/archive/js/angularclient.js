//ui.bootstrap to add bootstrap themeing and functionality
//ui.select for channel mute
//luegg.directives to add scroll glue for chat scrolling
//ngSanitize to prase html strings in messages (as returned from db)
//ngStorage for local friend list - idealy this would be moved to server for persistance and syncronization.
var app = angular.module('myApp', ['ui.bootstrap', 'luegg.directives', 'ngSanitize', 'ui.select', 'ngStorage', 'ngDialog']);
app.filter('muteFilter', function() {
  return function(items, props) {
    var out = [];

    if (angular.isArray(items)) {
      items.forEach(function(item) {
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
app.directive("removeMessage", function($rootScope) {
      return {
            link:function(scope,element,attrs)
            {
                element.bind("click",function() {
/*					scope.messages({$$hashKey:element[0].id}).remove();
					if(scope.messagesList.chatLog.active){
						angular.forEach(scope.messagesList.chatLog.messages, function(value, key){
							if(value.$$hashKey === element[0].id){
								scope.messagesList.chatLog.messages.splice(key,1);
							}
						});
					}else{
						angular.forEach(scope.messagesList.pms[element[0].remTab].messages, function(value, key){
							if(value.$$hashKey === element[0].id){
								scope.messagesList.pms[element[0].remTab].messages.splice(key,1);
							}
						});
					}*/
                    element.parent().parent().parent().css('display','none');
                });
            }
      }

});
app.controller('chatCtrl', function($scope, $http, $localStorage, $sessionStorage, $timeout, $window, ngDialog) {
	
	//variable initialization
	$scope.devPrefix			= "http://nwn.sinfar.net/";
	//$scope.devPrefix			= "/";
	$scope.alerts				= [];
	$scope.$storage 			= $localStorage;
	$scope.$storage.flist 		= $scope.$storage.flist || []; //local browser stored friend list (or empty array to be stored)
	$scope.$storage.iglist		= $scope.$storage.iglist || []; //local browser stored player ignore list (or empty array to be stored) - only works on OOC flagged channels.
	$scope.notifyPermission		= true; //is reset below. this will be used for inital value when web notifications go live
	$scope.pgTitle				= "Sifarian Angular Chat Client";
	$scope.windowActive 		= true;
	$scope.originalTitle 		= ""; //used with pgTitle for inactive title bar changes
	$scope.pltog 				= false;//player list toggle for show/hide
	$scope.fndmsg 				= false;//flag for friend messages
	$scope.settingsTabActive	= false;
	$scope.playersTabActive		= false;
	$scope.loginshow 			= window.thisPlayerID; //undefined == false
	$scope.getChatFailCount 	= 0;
	$scope.chatMessageChannel 	= "talk";//default message channel, can also be changed dynamicaly in code
	$scope.messages 			= TAFFY();//messages table for storage/manipulation.
	$scope.channels 			= {};//array for channel lists
	$scope.channels.full 		= [
									{code: 1, channel: 'Talk'},
									{code: 3, channel: 'Whisper'},
									{code: 31, channel: 'Quiet'},
									{code: 32, channel: 'Silent'},
									{code: 30, channel: 'Yell'},
									{code: 4, channel: 'Tell'},
									{code: 6, channel: 'Party'},
									{code: 164, channel: 'OOC'},
									{code: 108, channel: 'Sex'},
									{code: 228, channel: 'PVP'},
									{code: 116, channel: 'Action'},
									{code: 104, channel: 'Event'},
									{code: 132, channel: 'FFA'},
									{code: 102, channel: 'Build'}
								];//all channels
	$scope.channels.muted 		= [];//muted channels
	$scope.channels.oocList 	= ["4","6","164","108","228","11","6","104","132","102"];//ooc channels (used with the player ignore)
	$scope.channels.icList 		= ["1","3","31","32","30"];//ic channels
	//$scope.channels.tabs		= [];//store tab custom name and assigned channels
	$scope.pmHolder 			= {};//holder array for pm checks (to note who pms go to)
	$scope.playerList 			= [
		{name:'Web Client',expanded:false,port:'web',players:[]},
		{name:'Sinfar',expanded:false,port:'5121',players:[]},
		{name:'Dreaded Lands',expanded:false,port:'5122',players:[]},
		{name:'Arche Terre',expanded:false,port:'5124',players:[]}
	];//master player list. (currently working off individual server lists primairly. moving code to use single master list)
	$scope.messagesList			= {chatLog:{count:0,messages:[],active:true},pms:{},serverMessages:[]}
	$scope.selChannel			= "talk";
	
	$scope.NewLogActive = false;
	
	//functions for scope
	function unEscape(str)
	{
		var escapeMap = {
			'&amp;': '&',
			'&lt;': '<',
			'&gt;': '>',
			'&quot;': '"',
			'&#x27;': "'",
			'&#x60;': '`',
			'&nbsp;': ' '
		  };
		var replaceRegexp = RegExp('(?:'+Object.keys(escapeMap).join('|')+')', 'g');
		var escaper = function(match){return escapeMap[match] || "";}
		return str.replace(replaceRegexp, escaper);
		
	}
	function alertMsg(msg) 
	{
		msg.message = msg.message.replace(/<(?:.|\n)*?>/gm, '');
		if (!$scope.windowActive) 
		{
			$scope.pgTitle = msg.message;
		}
		if(!$scope.windowActive && $scope.notifyPermission && msg.channel == 4){
			var tell = new Notify(msg.fromName, {
				icon: msg.portrait,
				body: unEscape(msg.message),
				timeout: 5
			});
			tell.show();
		}
	}
	function processCommands(commands)
	{
		angular.forEach(commands,function(chatcmd,key){
			//instead of adding to chat log, issue alert (ngMessages?) - for server messages, need to work sound, image, video, youtube.
					var t = new Date();
			switch(chatcmd.tag){
				case "SCRIPT":
					eval(chatcmd.tag);
					break;
				case "ENTER_WC":
				case "ENTER_PLAYER":
				case "LEAVE_PLAYER":
					amsg = chatcmd.params;
					chatcmd.params = '<span class="chat-message-info">' + chatcmd.params + '</span>'
					var srvmsg = [];
					srvmsg["timestamp"] = (t.getHours()<10?'0':'')+t.getHours()+":"+(t.getMinutes()<10?'0':'')+t.getMinutes();
					srvmsg["fndmsg"] = false;
					srvmsg["channel"] = 18;
					srvmsg["fromPortrait"] = null;
					srvmsg["fromName"] = null;
					srvmsg["message"] = chatcmd.params;
					$scope.messages.insert(_.extend({}, srvmsg));
					$scope.cmessages = $scope.messages().get();
					$scope.addAlert('success',amsg);
					break;
				case "CHAT_MESSAGE_NOT_SENT":
					amsg = chatcmd.params;
					chatcmd.params = '<span class="chat-message-error">' + chatcmd.params + '</span>';
					var srvmsg = [];
					srvmsg["timestamp"] = (t.getHours()<10?'0':'')+t.getHours()+":"+(t.getMinutes()<10?'0':'')+t.getMinutes();
					srvmsg["fndmsg"] = false;
					srvmsg["channel"] = 18;
					srvmsg["fromPortrait"] = null;
					srvmsg["fromName"] = null;
					srvmsg["message"] = chatcmd.params;
					$scope.messages.insert(_.extend({}, srvmsg));
					$scope.cmessages = $scope.messages().get();
					$scope.alerts.push({type:'danger', msg:amsg});
					break;
				case "SOUND":
				case "IMAGE":
				case "VIDEO":
				case "YOUTUBE":
					chatcmd.params = "";
					break;
			}
			
		});
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
	function displayChatMessages(chatMessages)
	{//adjust for ignore list to just be hidden instead of removed
		angular.forEach(chatMessages,function(message,key){
			var chatmsg = message;
			if(chatmsg.fromPlayerId === $scope.loginshow){
				var tempFrom = $scope.pmHolder.toPlayer;
			}else{
				var tempFrom = chatmsg.fromPlayerName;
			}
			
			if($scope.$storage.iglist.indexOf(chatmsg.fromPlayerId) == -1 || $scope.$storage.iglist.indexOf(chatmsg.fromPlayerId) > -1 && $scope.channels.oocList.indexOf(chatmsg.channel) === -1){
				var t = new Date();
				chatmsg["timestamp"] = (t.getHours()<10?'0':'')+t.getHours()+":"+(t.getMinutes()<10?'0':'')+t.getMinutes();
				if($scope.$storage.flist.indexOf(chatmsg.fromPlayerId) == -1){
					chatmsg["fndmsg"] = false;
				}else{
					chatmsg["fndmsg"] = true;
				}
				if($scope.pmHolder.held){
					if(chatmsg.fromPlayerId === $scope.pmHolder.playerID && chatmsg.message === $scope.pmHolder.toMsg){
						chatmsg.fromName = chatmsg.fromName + " to " + $scope.pmHolder.toPlayer;
						$scope.pmHolder.head = false;
					}
				}
				//manipulate into new array
				if(chatmsg.channel === "4"){
					if(!($scope.messagesList.pms[tempFrom])){
						$scope.messagesList.pms[tempFrom] = {};
						$scope.messagesList.pms[tempFrom].messages = [];
						$scope.messagesList.pms[tempFrom].count = 0;
						$scope.messagesList.pms[tempFrom].active = false;
					}
					$scope.messagesList.pms[tempFrom].messages.push(chatmsg);
					if($scope.messagesList.pms[tempFrom].active){
						$scope.messagesList.pms[tempFrom].count = 0;
					}else{
						$scope.messagesList.pms[tempFrom].count = $scope.messagesList.pms[tempFrom].count +1
					}
					
				}else{
					$scope.messagesList.chatLog.messages.push(chatmsg);
					if($scope.messagesList.chatLog.active){
						$scope.messagesList.chatLog.count = 0;
					}else{
						if($scope.channels.muted.indexOf(chatmsg.channel)===-1){
							$scope.messagesList.chatLog.count = $scope.messagesList.chatLog.count + 1
						}
					}
					
				}
				$scope.messages.insert(chatmsg);
				$scope.cmessages = $scope.messages().get();

				if(!$scope.windowActive){
					alertMsg(chatmsg);
					if($scope.bell && chatmsg.channel == 4){
						var audio = document.getElementById("audio1");
    					audio.play();
					}
				}
			}
		});
	}
	function getChat()
	{
		$http.get($scope.devPrefix+"getchat.php?nocache="+new Date().getTime())
			.then(function(response){
				var msg = response.data;
				if(angular.isArray(msg)){
					if(angular.isArray(msg[0])){
						displayChatMessages(msg[0]);
					}
					if(angular.isArray(msg[1])){
						processCommands(msg[1]);   
					}
				}
				getChat();
			},function(response){
				$scope.getChatFailCount++;
				if($scope.getChatFailCount < 100){
					getChat();
				}else{
					alert("An error occurred, try refreshing the page or report this to Mavrixio (mavrixio@sinfar.net).");
				}
			}
		);
	}
	function updatePlayersList()
	{
		$http.get($scope.devPrefix+"getonlineplayers.php?"+Math.floor(Date.now()/1000))
			.then(function(response){//
				//include fnd status from storage
				angular.forEach(response.data,function(player,key){
					if(_.indexOf($scope.$storage.flist,player.playerId) == -1){
						player["fnd"] = false;
					}else{
						player["fnd"] = true;
					}
					if(_.indexOf($scope.$storage.iglist,player.playerId) == -1){
						player["ignore"] = false;
					}else{
						player["ignore"] = true;
					}
				});
				var players = TAFFY(response.data);
				
				angular.forEach($scope.playerList, function(serv){
					var sorter = 'pcName';
					if(serv.port=='web'){
						sorter = 'playerName';
					}
					serv.players = players({chatClient:serv.port}).order(sorter).get();
				});
			
				$scope.webplayers = players({chatClient:"web"}).order("playerName").get();
				$scope.sinfarplayers = players({chatClient:"5121"}).order("pcName").get();
				$scope.dreadplayers = players({chatClient:"5122"}).order("pcName").get();
				$scope.archplayers = players({chatClient:"5124"}).order("pcName").get();
				
				setTimeout(function()
				{
					updatePlayersList();
				}, 30*1000);
			},
			function(){
				setTimeout(function()
				{
					updatePlayersList();
				}, 5*1000);
			});
	}
	function tblScrape(table)
	{
		var rows = table.rows;
		var propCells = rows[0].cells;
		var propNames = [];
		var results = []
		var obj, row, cells;
		
		for (var i=0, iLen=propCells.length; i<iLen; i++){
			propNames.push(propCells[i].textContent || propCells[i].innerText);
		}
		
		for (var j=1, jLen=rows.length; j<jLen; j++){
			cells = rows[j].cells;
			obj = {};
			
			for (var k=0; k<iLen; k++){
				obj[propNames[k]] = cells[k].textContent || cells[k].innerText;
			}
			results.push(obj);
		}
		return results;
	}
	function notifyPermissionGranted()
	{
		$scope.notifyPermission = true;
	}
	function notifyPermissionDenied()
	{
		$scope.notifyPermission = false;
	}
	
	//window functions
	angular.element($window)
		.on("blur",function(){
			$scope.originalTitle = "Sifarian Angular Chat Client";
			$scope.windowActive = false;
		})
		.on("focus",function(){
			$scope.pgTitle = $scope.originalTitle;
			$scope.windowActive = true;
		})
		.on("close",function(){
			$.ajax($scope.devPrefix+"closewebclient.php", {async:false});
		})
		.on("unload",function(){
			$.ajax($scope.devPrefix+"closewebclient.php", {async:false});
		});
	
	//app functions
	$scope.closeAlert = function(index) {
		$scope.alerts.splice(index, 1);
	};
	$scope.addAlert = function(type, message) {
		$scope.alerts.push({type:type,msg:message});
	};
	$scope.addFriend			= function(player){
		p = player.playerId;
		$scope.$storage.flist.push(p);
		//update playerlists fnd status
		switch(player.chatClient){
			case "web":
				ua = $scope.webplayers;
				break;
			case "5121":
				ua = $scope.sinfarplayers;
				break;
			case "5122":
				ua = $scope.dreadplayers;
				break;
			case "5124":
				ua = $scope.archplayers;
				break;
		}
		angular.forEach(ua,function(plr,key){
			if(plr.playerId == p){
				plr.fnd = true;
			}
		});
	}
	$scope.remFriend 			= function(player){
		p = player.playerId;
		$scope.$storage.flist = _.without($scope.$storage.flist,p);
		//update playerlists fnd status
		switch(player.chatClient){
			case "web":
				ua = $scope.webplayers;
				break;
			case "5121":
				ua = $scope.sinfarplayers;
				break;
			case "5122":
				ua = $scope.dreadplayers;
				break;
			case "5124":
				ua = $scope.archplayers;
				break;
		}
		angular.forEach(ua,function(plr,key){
			if(plr.playerId == p){
				plr.fnd = false;
			}
		});
	}
	
	$scope.mutePlayer			= function(player){
		p = player.playerId;
		$scope.$storage.iglist.push(p);
		//update playerlists fnd status
		switch(player.chatClient){
			case "web":
				ua = $scope.webplayers;
				break;
			case "5121":
				ua = $scope.sinfarplayers;
				break;
			case "5122":
				ua = $scope.dreadplayers;
				break;
			case "5124":
				ua = $scope.archplayers;
				break;
		}
		angular.forEach(ua,function(plr,key){
			if(plr.playerId == p){
				plr.ignore = true;
			}
		});
	}
	$scope.unmutePlayer			= function(player){
		p = player.playerId;
		$scope.$storage.iglist = _.without($scope.$storage.iglist,p);
		//update playerlists fnd status
		switch(player.chatClient){
			case "web":
				ua = $scope.webplayers;
				break;
			case "5121":
				ua = $scope.sinfarplayers;
				break;
			case "5122":
				ua = $scope.dreadplayers;
				break;
			case "5124":
				ua = $scope.archplayers;
				break;
		}
		angular.forEach(ua,function(plr,key){
			if(plr.playerId == p){
				plr.ignore = false;
			}
		});
	}
	
	$scope.exportChatlog 		= function(){
		var zip = new JSZip();
		var channel = "";
		var ecl = '"From","Channel","Timestamp","Message"\r\n';
		angular.forEach($scope.cmessages,function(message,key){
			switch(message.channel) {
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
					channel =  'Yell';
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
		var content = zip.generate({type:"blob"});
		saveAs(content,"SinfarChatLog.zip");
	}
	$scope.msgFriend 			= function(player){
		p = player.fromPlayerId;
		if(_.indexOf($scope.$storage.flist,p) == -1){
			$scope.fndmsg = false;
		}else{
			$scope.fndmsg = true;
		}
	}
	$scope.showBio 				= function(pc){
		$http.get($scope.devPrefix+"getcharbio.php?pc_id=" + pc.pcId).then(
			function(response){
				var moddesc = response.data;
				var portOpen = ngDialog.open({
					template: 	moddesc,
					plain: 		true
				});
			},
			function(){
				var moddesc = "Error getting character description. Try Again.";
				var portOpen = ngDialog.open({
						template: 	moddesc,
						plain: 		true,
						showClose:	false
					});
			}
		);

	}
	$scope.showPort 			= function(pc){	
		var modport = "http://play.sinfar.net/" + pc.portrait.slice(1,-5) + "h.jpg"
		var portOpen = ngDialog.open({
			template: 	'<style>.ngdialog-content{text-align:center}</style><img src="'+modport+'">',
			plain: 		true,
			showClose:	false
		});
	}
	$scope.plist				= function(player){
		$http.get($scope.devPrefix+"search_characters.php?player_name="+player.playerName)
		.then(function(response){
			var diagTemplate = '<ul style="list-style-type:none">';
			var d = response.data.split('<table class="game_structure tablesorter alternate_row" id="tab_char_list">');
			var tbl = d[1].split('</table>');
			var ele = document.createElement('table');
			ele.innerHTML = tbl[0].replace(/<img[^>]*>/g,"");
			
			var plrs = tblScrape(ele);
			plrs.forEach(function(char){
				if(char.PLID == player.playerId){
					diagTemplate = diagTemplate + '<li><i class="fa fa-bars" ng-click="showSubBio(' + char['PCID'] + ')"></i> ' + char['Character Name'] + '</li>'
				}
			});
			
			diagTemplate = diagTemplate + "</ul>"
			
			var portOpen = ngDialog.open({
				template:		diagTemplate,
				plain:			true,
				showClose:		false,
				scope:			$scope,
				controller:		['$scope', 'ngDialog', function($scope, ngDialog){
					$scope.showSubPort 	= function(){};
					$scope.showSubBio	= function(pcID){
						$http.get($scope.devPrefix+"getcharbio.php?pc_id=" + pcID).then(
							function(response){
								var moddesc = response.data;
								var subBio = ngDialog.open({
									template: 	moddesc,
									plain: 		true
								});
							},
							function(){
								var moddesc = "Error getting character description. Try Again.";
								var subBio = ngDialog.open({
										template: 	moddesc,
										plain: 		true,
										showClose:	false
									});
							}
						);
					};
				}]
			});
		});
	}
	$scope.setPM 				= function(player){
		var p = "";
		if("fromPlayerName" in player){
			p = player.fromPlayerName;
		}else{
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
	$scope.sChat 				= function(){
		var msg = document.getElementById("textarea-chat-bar");
		//var msgTxt = msg.textContent.replace(/[\n\r]/g,'') || msg.innerText.replace(/[\n\r]/g,'');
		var msgTxt = msg.textContent || msg.innerText;
		var postmsg=$.param({"chat-message":msgTxt,"channel":$scope.chatMessageChannel});
		if(msgTxt.slice(0, 3) === "/tp"){
			$scope.pmHolder.held 		= true;
			$scope.pmHolder.playerID 	= window.thisPlayerID;
			$scope.pmHolder.toPlayer 	= msgTxt.match(/\"(.*?)\"/)[1];
			$scope.pmHolder.toMsg 		= msgTxt.slice($scope.pmHolder.toPlayer.length+7);
		}
		$http({
			method: 'POST',
			url: $scope.devPrefix+"sendchat.php",
			data: postmsg,
			headers: {'Content-Type': 'application/x-www-form-urlencoded'}
		});
	}
	$scope.msgReset 			= function(){
		var msg = document.getElementById("textarea-chat-bar");
		if($scope.messagesList.chatLog.active){
			msg.innerHTML = "";
		}else{
			angular.forEach($scope.messagesList.pms,function(value, key){
				if($scope.messagesList.pms[key].active){
					msg.innerHTML = '/tp "'+key+'" ';
				}
			})
		}
	}
	$scope.chatTabSwitch 		= function(tab){
		switch(tab){
			case "NewLog":
					$scope.messagesList.chatLog.count = 0;
					document.getElementById("textarea-chat-bar").innerHTML = "";
					break;
			default:
					$scope.messagesList.pms[tab].count = 0;
					document.getElementById("textarea-chat-bar").innerHTML = '/tp "'+tab+'" ';
		}
	}
	$scope.removeTab 			= function (event, index, tab) {
	  	event.preventDefault();
	  	event.stopPropagation();
	  	//$scope.tabs.splice(index, 1);
		delete $scope.messagesList.pms[tab];
	};
	$scope.remTab				= function(tab){
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
	$scope.loginclk 			= function(){
		if($scope.loginplayer.length && $scope.loginpass.length){
			$scope.loginDC 			= false;
			var loginDialog 		= ngDialog.open({
				template: 			'<center><i class="fa fa-spinner fa-pulse fa-5x"></i><hr>Please hold, logging in.<br>*plays muzak*</center>',
				plain: 				true,
				preCloseCallback:	function(value){return $scope.loginDC;}
			});	
			var xsrf = $.param({"player_name":$scope.loginplayer,"password":$scope.loginpass});
			$http({
				method: 'POST',
				url: $scope.devPrefix+"login.php",
				data: xsrf,
				headers: {'Content-Type': 'application/x-www-form-urlencoded'}
			})
			.then(function(){
				getChat();
				$timeout(function(){
					do{
						var loginCheck = $.ajax($scope.devPrefix+"getonlineplayers.php?"+Math.floor(Date.now()/1000), {async:false});
						var loginchk = TAFFY(loginCheck.responseText);
						if(loginchk({playerName:{isnocase:$scope.loginplayer}}).count()){
							window.thisPlayerID = loginchk({playerName:$scope.loginplayer}).first().playerId;
							$scope.loginshow = window.thisPlayerID;
							//close modal
							$scope.loginDC = window.thisPlayerID;
							ngDialog.close(loginDialog);
						}
					}while(!$scope.loginshow);
				},1000);
			},function(){
				alert("Invalid Login");//incorrect login response from server
			});
		}else{
			alert("Login Incomplete. Please enter both player name and password.");//incomplete login fields
		}
	}
	
	//check/ask for notification permission
	$scope.notifyPermission = false; //currently causes seemingly random crash of getChat. to be enabled in next release after more testing.
	//if(Notify.needsPermission && Notify.isSupported()){Notify.requestPermission(notifyPermissionGranted(), notifyPermissionDenied())}
	
	//start 'er up.
	updatePlayersList();
});
