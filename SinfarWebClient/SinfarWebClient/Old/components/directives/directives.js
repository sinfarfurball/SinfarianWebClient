//directives
app.directive("removeMessage", function ($rootScope) {
    return {
        link: function (scope, element, attrs) {
            element.bind("click", function () {
                element.parent().parent().parent().css('display', 'none');
            });
        }
    }

});

//view directives
app.directive('settingsView', function () {
    return {
        restrict: 'A',
        scope: false,
        templateUrl: 'partials/settings.html',
        controller: 'settingsCtrl',
        link: function (scope, element, attributes) { console.log("Settings View Loaded"); }
    }
});
app.directive('chatView', function () {
    return {
        restrict: 'A',
        scope: false,//inherate parent scope from index page
        templateUrl: 'partials/chatlog.html',
        controller: 'chatLogCtrl',
        link: function (scope, element, attributes) { console.log("Chat View Loaded."); }
    }
});
app.directive('playerListSide', function () {
    return {
        restrict: 'E',
        scope: {},
        templateUrl: 'partials/playerlist.html',
        controller: 'playerListCtrl',
        link: function (scope, element, attributes) { console.log("Player List Loaded."); }
    }
});
app.directive('pmTab', function () { return {} });
app.directive('primaryPage', function () {
    return {
        restrict: 'E',
        //scope: false,//inherate parent scope from index page
        scope: {addAlert: '&'},
        templateUrl: 'partials/primary.html',
        controller: 'primaryPageCtrl',
        link: function (scope, element, attributes) { console.log("Primary Page Loaded."); }
    };
});