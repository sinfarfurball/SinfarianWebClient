var theme;
var app = angular.module('charCreatorApp', ['ngMaterial', 'ngSanitize', 'ngStorage']);
app.run(function ($rootScope) {
    $rootScope._ = window._;
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

app.controller('mainCtrl', function ($scope, $http, $httpParamSerializerJQLike, $timeout, $window, $filter, $mdMedia, $mdDialog, $mdToast, $mdSidenav, $localStorage) {
    $scope.races = [/*be sure to add 1 extra feat for humans and 4 extra skill points (1 extra each level after 1st)*/
        {
            label: 'Dwarf',
            abilityOffsets: {
                con: 2,
                cha: -2
            }
        },
        {
            label: 'Elf',
            abilityOffsets: {
                dex: 2,
                con: -2
            }
        },
        {
            label: 'Gnome',
            abilityOffsets: {
                con: 2,
                str: -2
            }
        },
        {
            label: 'Half-Elf',
            abilityOffsets: {}
        },
        {
            label: 'Halfling',
            abilityOffsets: {
                dex: 2,
                str: -2
            }
        },
        {
            label: 'Half-Orc',
            abilityOffsets: {
                str: 2,
                cha: -2,
                int: -2
            }
        },
        {
            label: 'Human',
            abilityOffsets: {}
        },
        {
            label: 'Sub-Race',
            abilityOffsets: {}
        }
    ];
    $scope.abilities = [
        { id: 'cha', label: 'Charisma' },
        { id: 'con', label: 'Constitution' },
        { id: 'dex', label: 'Dexterity' },
        { id: 'int', label: 'Intelligence' },
        { id: 'str', label: 'Strength' },
        { id: 'wis', label: 'Wisdom' }
    ];
    $scope.feats = [];
    $scope.skills = [];
    $scope.classes = [];
    $scope.char = {
        name: 'New Char',
        race: 6,
        gender: 'Male',
        abilities: {
            cha: 8,
            con: 8,
            dex: 8,
            int: 8,
            str: 8,
            wis: 8
        },
        feats: [],
        skills: [],
        classes: [],
        abilityPts: 30,
        skillPts: 20
    };
});