$(document).ready(function() {
	function getStyleRule(name) {
	for(var i=0; i<document.styleSheets.length; i++) {
		var ix, sheet = document.styleSheets[i];
		for (ix=0; ix<sheet.cssRules.length; ix++) {
			if (sheet.cssRules[ix].selectorText === name)
				return sheet.cssRules[ix].style;
		}
	}
	return null;
	}	
	$("#textarea-chat-bar").keydown(function(e) {
	   if (e.keyCode == 13 && !e.shiftKey) {
			sendChat();
			return false;
		}	
	});
	
	getChat();
	
	updatePlayersList();
	
	$("#table-players-list").on("click", "tr[data-player-id]", function(event) {
		$this = $(this);
		setPMTo($this.attr("data-player-id"), unescape($this.attr("data-player-name")));
	});
	
	$("#settins-dialog-box").dialog({
		autoOpen: false,
		resizable:true,
		open: function(){
			if($("#channelignore").css("display") != "none"){
				$("#channelignore").multipleSelect({
					position: 'top',
					onClick: function(view){
						if(view.checked){
							jss.set('div.chat-channel-' + view.value, {'display':'none'});
						}else{
							jss.set('div.chat-channel-' + view.value, {'display':'inherit'});
						}
					}
				});
			}	
		},
		close: function()
		{
			$("#form-settings").submit();//needs to be added to new form layout since settings diablog box is removed
		},
	});
	
	$("#btn-config").click(function() {
		$("#settins-dialog-box").dialog("open");		
	});
	
	$("#chk-translate-messages").change(function() {
		document.getElementById("select-translate-to").disabled = !$(this).is(":checked");											
	});
	
	$chkHidePlayersList = $("#chk-hide-players-list");
	var toogleHidePlayersList = function()
	{
		if ($chkHidePlayersList.is(":checked"))
		{
			$("#div-players-list").hide();
			$("#div-chat-messages").css("right", "0");
		}
		else
		{
			$("#div-players-list").show();
			$("#div-chat-messages").css("right", "");			
		}
	}
	toogleHidePlayersList();
	$chkHidePlayersList.click(toogleHidePlayersList);
	
	var $chkShowTimestamp = $("#chk-show-timestamp");
	var showHideTimestamp = function() 
	{
		if ($chkShowTimestamp.is(":checked"))
		{
			$('#style-show-hide-timestamp-class').remove();
		}
		else
		{
			$("head").append('<style id="style-show-hide-timestamp-class">.show-hide-timestamp {display:none;}</style>');
		}
	};
	showHideTimestamp();
	$chkShowTimestamp.click(showHideTimestamp);
	
	$("#form-settings").submit(function(event)
	{
		var settings = {};
		settings.chat = {};
		settings.chat.doTranslate = $("#chk-translate-messages").is(":checked");
		settings.chat.translateTo = $("#select-translate-to").val();
		settings.chat.hidePlayersList = $chkHidePlayersList.is(":checked") ? "1" : "";
		settings.chat.showTimestamp = $chkShowTimestamp.is(":checked") ? "1" : "";
		settings.chat.playTellSound = $("#chk-play-tell-sound").is(":checked") ? "1" : "";
		settings.chat.chatReceivedSoundUrl = $("#txt-tell-sound-url").val();
		$("#audio-tell-received").attr("src", settings.chat.chatReceivedSoundUrl);
		$("#settins-dialog-box").dialog("close");	
		return false;
	});
	

	
									
});
$(window).unload(function() {
	$.ajax("http://nwn.sinfar.net/closewebclient.php", {async:false});				  
});

var originalTitle = document.title;
var alertTitle = "";
var alertIntervalId = null;
var windowActive = true;
function alertMsg(msg) 
{	
    alertTitle = msg;
	if (!alertIntervalId && !windowActive) 
	{
    	alertIntervalId = setInterval(function() { 
			document.title = document.title == alertTitle ? originalTitle : alertTitle; 
		}, 1000);
	};
};
function stopAlertMsg(msg)
{
	if (alertIntervalId)
	{
		clearInterval(alertIntervalId);
		alertIntervalId = null;
		document.title = originalTitle;
	}	
}
$(window).bind("focus", function(event)
{
	windowActive = true;
	stopAlertMsg();

});
$(window).bind("blur", function(event)
{
	windowActive = false;
});

var currentPlayersList = [];
function updatePlayersList()
{
	$.ajax("http://nwn.sinfar.net/getonlineplayers.php", {
		dataType: "json",
		success: function(players) {
			var $playersList = $("#table-players-list");
			for (var oldPlayerIndex=0; oldPlayerIndex<currentPlayersList.length; oldPlayerIndex++)
			{
				var newPlayerIndex = 0;
				for (; newPlayerIndex<players.length; newPlayerIndex++)
				{
					if (players[newPlayerIndex].playerId == currentPlayersList[oldPlayerIndex].playerId && players[newPlayerIndex].pcId == currentPlayersList[oldPlayerIndex].pcId) break;	
				}
				if (newPlayerIndex >= players.length)
				{
					var player = currentPlayersList[oldPlayerIndex];
					$player = $playersList.find("div[data-player-id="+player.playerId+"]");
					$player.remove();
				}
			}
			for (var newPlayerIndex=0; newPlayerIndex<players.length; newPlayerIndex++)
			{
				var oldPlayerIndex = 0;
				for (; oldPlayerIndex<currentPlayersList.length; oldPlayerIndex++)
				{
					if (players[newPlayerIndex].playerId == currentPlayersList[oldPlayerIndex].playerId && players[newPlayerIndex].pcId == currentPlayersList[oldPlayerIndex].pcId) break;
				}
				if (oldPlayerIndex >= currentPlayersList.length)
				{
					var player = players[newPlayerIndex];
					$("#tr-players-list-"+player.chatClient).after('<div data-player-id="'+player.playerId+'" data-player-name="'+escape(player.playerName)+'">'
							+ '<img src="http://nwn.sinfar.net/' + player.portrait + '" />'
							+ '<span class="player-list-name">' + (player.pcName?player.pcName:player.playerName) + '</span></div>'
						+ '');
				}
			}
			currentPlayersList = players;
			setTimeout(function()
			{
				updatePlayersList();
			}, 60*1000);
		},
		error: function()
		{
			setTimeout(function()
			{
				updatePlayersList();
			}, 60*1000);	
		}
	});
}
function sendChat()
{
	$.post("http://nwn.sinfar.net/sendchat.php", $("#form-chat").serialize(), function()
 	{
		
 	});
	$("#textarea-chat-bar").val("");
}
function getCurrentTimestamp()
{
	var date = new Date();
	return '<span class="show-hide-timestamp">[' + date.getHours() + ':' + date.getMinutes() + ']&nbsp;</span>';
}
function displayChatMessages(chatMessages)
{
	var showAlertMsg;
	var playSound;
	var alertMsgStr;
	for (var i=0; i<chatMessages.length; i++)
	{
		var chat = chatMessages[i];
		if (showAlertMsg != false && chat.fromPlayerId)
		{
			if (chat.fromPlayerId == window.thisPlayerId)
			{
				stopAlertMsg();
				showAlertMsg = false;	
			}
			else
			{
				showAlertMsg = true;
				alertMsgStr = chat.fromName + ": " + $("<div>"+chat.message+"</div>").text();
			}
		}
		if (chat.fromPlayerId && chat.fromPlayerId != window.thisPlayerId && chat.channel == 4 && $("#chk-play-tell-sound").is(":checked"))
		{
			playSound = true;	
		}
		$("#table-chat-messages").append(
			'<div class="chat-channel-'+chat.channel+'">' +
				'<span><a href="' + (chat.fromPlayerId && chat.fromPlayerName ? 'javascript:setPMTo('+chat.fromPlayerId+',\''+chat.fromPlayerName.replace(/'/g, "\\'")+'\')' : '#' ) + '"><img border=0 class="img-chat-message" src="http://nwn.sinfar.net/' + chat.fromPortrait + '" /></a></span>' +
				'<span class="span-chat-message-from-pc-name">'+_.escape(chat.fromName)+': </span><span class="span-chat-message">'+getCurrentTimestamp()+getChannelPrefix(chat.channel)+chat.message + (chat.messageTranslated?'<span class="translated-chat-message">'+chat.messageTranslated+'</span>':'') + '</span>' +
			'</div>'
		);
		if (showAlertMsg)
		{
			alertMsg(alertMsgStr);	
		}
		if (playSound)
		{
			var sound = $("#audio-tell-received")[0];
			sound.load();
			sound.play();	
		}
	}	
}
function stopMedias(loop)
{
	$audio = $("#table-chat-messages audio");
	if (!loop) $audio = $audio.filter(":not([loop])");
	$audio.each(function(index,e) {
		e.pause();
	});
	$("video").each(function(index,e) {
		e.pause();
	});
}
function processsCommands(commands)
{
	for (var i=0; i<commands.length; i++)
	{
		var cmd = commands[i];
		
		if (cmd.tag == "SCRIPT")
		{
			eval(cmd.params);
		}
		else
		{
			if (cmd.tag == "ENTER_WC" ||
				cmd.tag == "ENTER_PLAYER" ||
				cmd.tag == "LEAVE_PLAYER")
			{
				cmd.params = '<span class="chat-message-info">' + cmd.params + '</span>';	
			}
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
			else if (cmd.tag == "CHAT_MESSAGE_NOT_SENT")
			{
				cmd.params = '<span class="chat-message-error">' + cmd.params + '</span>';				
			}
			$("#table-chat-messages").append(
				'<div>' +
					'<span></span>' +
					'<span>' + cmd.params  + '</span>' +
				'</div>'
			);
		}
	}
}
var getChatFailCount = 0;
function getChat()
{
	var chatParams = {};
	if ($("#chk-translate-messages").is(":checked"))
	{
		chatParams.translateTo = $("#select-translate-to").val();	
	}
	$.ajax("http://nwn.sinfar.net/getchat.php", {
		dataType: "json",
		data: chatParams,
		success: function(data) {
			//console.log(data);
			if (_.isArray(data))
			{
				var divChatMessages = document.getElementById("div-chat-messages");
				var scrollAtBottom =  !windowActive || (divChatMessages.scrollHeight - divChatMessages.scrollTop == $(divChatMessages).outerHeight());
				if (_.isArray(data[0]))
				{
					displayChatMessages(data[0]);
				}
				if (_.isArray(data[1]))
				{
					processsCommands(data[1]);
				}
				if (scrollAtBottom)
				{
					divChatMessages.scrollTop = divChatMessages.scrollHeight;
				}
			}
			getChat();
		},
		error: function(data) {
			getChatFailCount++;
			if (getChatFailCount < 100)
			{
				getChat();
			}
			else
			{
				alert("An error occurred, try refreshing the page or report this to Mavrixio (mavrixio@sinfar.net).");
			}
		}
	});
}
function moveCaretToEnd(el) {
    if (typeof el.selectionStart == "number") {
        el.selectionStart = el.selectionEnd = el.value.length;
    } else if (typeof el.createTextRange != "undefined") {
        el.focus();
        var range = el.createTextRange();
        range.collapse(false);
        range.select();
    }
}
function setPMTo(playerId, playerName)
{
	if (playerId && playerName)
	{
		$texArea = $("#textarea-chat-bar");
		$texArea.val('/tp "'+playerName+'" ');
		$("#textarea-chat-bar").focus();
		moveCaretToEnd($texArea[0]);
	}
}
function getChannelPrefix(channel)
{
	switch(parseInt(channel))
	{
		case 18:
		case 2: return "[Shout] ";
		case 19:
		case 3: return "[Whisper] ";
		case 20:
		case 4: return "[Tell] ";
		case 22:
		case 6: return "[Party] ";
	}
	return "";
}