//data services
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