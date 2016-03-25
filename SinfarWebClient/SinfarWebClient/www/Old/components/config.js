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