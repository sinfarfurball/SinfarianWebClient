
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