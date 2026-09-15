function Preloader() {
  var view = View.getInstance();

  var loadingPercentage;

  var imageSources;
  var that = this;

  this.init = function() {
    loadingPercentage = view.create('div');

    view.addClass(loadingPercentage, 'loading-percentage');
    view.setHTML(loadingPercentage, '0%');
    view.appendToBody(loadingPercentage);

    imageSources = {
      1: 'images/back-btn.png',
      2: 'images/bg.png',
      3: 'images/bullet.png',
      4: 'images/coin.png',
      5: 'images/elements.png',
      6: 'images/enemies.png',
      7: 'images/start-new.png?v=9',
      8: 'images/mario-head.png',
      9: 'images/mario-sprites.png',
      10: 'images/powerups.png',
      11: 'images/start-btn.png'
    };

    that.loadImages(imageSources);
  };

  this.loadImages = function(imageSources) {
    var images = {};
    var loadedImages = 0;
    var totalImages = 0;

    for (var key in imageSources) {
      totalImages++;
    }

    for (var key in imageSources) {
      images[key] = new Image();
      images[key].src = imageSources[key];

      images[key].onload = function() {
        loadedImages++;
        percentage = Math.floor(loadedImages * 100 / totalImages);

        view.setHTML(loadingPercentage, percentage + '%'); //displaying percentage

        if (loadedImages >= totalImages) {
          view.removeFromBody(loadingPercentage);
          that.initMainApp();
        }
      };
    }
  };

  this.initMainApp = function() {
    var marioMakerInstance = MarioMaker.getInstance();
    marioMakerInstance.init();
  };
}

window.onload = function() {
  var preloader = new Preloader();
  preloader.init();
};
