

var mobileApp = (function() {
  var splashTime = 3000; // Время показа сплэш экрана
  var hostName = "http://192.168.1.99";
  var appUrl = 'http://192.168.1.99/mobile_cordova';
  var appStates = {
    starting: 1,
    work: 2,
    error: 3,
  };

  var serverSideData = {};

  var splash = document.querySelector("#splash-screen");
  var errorBlock = document.querySelector("#error-screen");
  var errorMsg = document.querySelector("#error-msg");
  var loader = document.querySelector("#m-ajax-loader");

  var currentState = appStates.starting;

  var isOffline = function() {
    var networkState = navigator.connection.type;
    return Connection.NONE == networkState;
  };

  var isFunction = function(functionToCheck) {
    return functionToCheck && {}.toString.call(functionToCheck) === '[object Function]';
  };

  /**
   * 
   * @param {show | hide} state 
   */

  var ajaxLoader = {
    hide: function() {
      if (loader !== undefined)
        loader.style.display = "none";
    },
    show: function() {
      if (loader !== undefined)
        loader.style.display = "block";
    }
  };

  var splashScreen = {
    hide: function() {
      if (splash !== undefined)
        splash.style.display = "none";
    },
    show: function() {
      if (splash !== undefined)
        splash.style.display = "flex";
    }
  };

  var errorScreen = {
    hide: function() {
      if (errorBlock !== undefined)
        errorBlock.style.display = "none";
    },
    show: function() {
      if (errorBlock !== undefined)
        errorBlock.style.display = "block";
    }
  };

  var openSystemBrowser = function(url) {
    var launcher = window.plugins.launcher;
    // Need FLAG_ACTIVITY_NEW_TASK on Android 6 to make it clear that the page is
    // opened in another app. Also, the back button doesn't bring you back from
    // the system web browser to this app on Android 6, with this flag it does.
    launcher.launch({uri: url, flags: launcher.FLAG_ACTIVITY_NEW_TASK}, function(data) {
      if (data.isLaunched) {
        debug("successfully opened external link: " + url);
      } else if (data.isActivityDone) {
        debug("returned from opening external link: " + url);
      } else {
        debug("unknown response when opening external link: " + JSON.stringify(data));
      }
    }, function(errMsg) {
      debug("could not open external link: " + errMsg);
    });
  };
  /**
   * 
   * @param {done: func, error:func} params 
   */
  var loadServerData = function(params) {
      if (cordova.platformId == "android") {
        document.querySelector('html').dataset['basepath'] = "/android_asset/www/index.html";
      } else if(cordova.platformId == "ios") {
        document.querySelector('html').dataset['basepath'] = "/ios_asset/www/index.html";
      }
      
      if (currentState ==  appStates.starting)
        splashScreen.show();

      var request = new XMLHttpRequest();
  
      request.open('GET', appUrl, true);
    
      request.onload = function() {
        if (request.status >= 200 && request.status < 400) {
          var resp = request.responseText;  
          var parser = new DOMParser();
          var xmlDoc = parser.parseFromString(resp,"text/html");
          var remoteScripts = xmlDoc.querySelectorAll("script");
          var remoteLinkCss = xmlDoc.querySelectorAll("link");
          var serverDataElement = xmlDoc.querySelector('[data-server]');
          var attrs = ["rel", "href", "text", "as" ];
    
          if (serverDataElement !== null) {
            try {
              serverSideData = JSON.stringify(serverDataElement.dataset.server);
            } catch(e) {
              console.log(e);
            }            
          }

          for(var i = 0 in remoteLinkCss){ 
            var linkCss = document.createElement('link');
            for (var j = 0 ; j < attrs.length; j++) {
              if (remoteLinkCss[i][attrs[j]] !== undefined)
               linkCss[attrs[j]] = remoteLinkCss[i][attrs[j]];
            }
    
            document.head.appendChild(linkCss);
          }
    
          for(var i = 0 in remoteScripts){
            if(remoteScripts[i].type !== undefined) {
              var script = document.createElement('script');
    
              script.type = 'text/javascript';
    
              if (remoteScripts[i].src !== undefined)
                script.src = remoteScripts[i].src;
    
              if (remoteScripts[i].text !== undefined)
                script.text = remoteScripts[i].text
                
              document.body.appendChild(script);
            }
          }
          if (params !== undefined && isFunction(params.done))
            params.done(request);
        } else {
          if (params !== undefined && isFunction(params.error))
            params.error(request);
        }
      };
    
      request.onerror = function() {
        if (params !== undefined && isFunction(params.error))
          params.error(request);
      };
    
      request.send();

      request.onreadystatechange = function() {
        if(this.readyState == this.HEADERS_RECEIVED) {
      
          // Get the raw header string
          var headers = request.getAllResponseHeaders();
      
          // Convert the header string into an array
          // of individual headers
          var arr = headers.trim().split(/[\r\n]+/);
      
          // Create a map of header names to values
          var headerMap = {};
          arr.forEach(function (line) {
            var parts = line.split(': ');
            var header = parts.shift();
            var value = parts.join(': ');
            headerMap[header] = value;
          });
        }
      }
  };
  /**
   * 
   * @param {done: func, error, func} params 
   */
  var loadApp = function(params) {
    loadServerData({
      done: function(request){
        errorScreen.hide();
        ajaxLoader.hide();
        setTimeout(function(){
          splashScreen.hide();
          currentState = appStates.work;
          if (params != undefined && isFunction(params.done))
            params.done(request);
        }, splashTime)
      },
      error: function(request){
        setTimeout(function(){
          errorScreen.show();
          splashScreen.hide();
          currentState = appStates.error;
          if (isOffline()) {
            errorMsg.innerHTML = "Сеть не доступна";
          } else {
            errorMsg.innerHTML = "Ошибка подключения к серверу";
          }
          if (params != undefined && isFunction(params.error))
            params.error(request);
        }, splashTime)
      }
    })
  };

  var reloadAppClick = function (e) {
    e.disabled = true;
    ajaxLoader.show();
    loadApp({
      done: function(){
        ajaxLoader.hide();
        e.disabled = false;
      },
      error: function(){
        ajaxLoader.hide();
        e.disabled = false;
      },
    });
  };

  return {
    openSystemBrowser: openSystemBrowser,
    loadApp: loadApp,
    reloadAppClick: reloadAppClick,
    splashTime: splashTime,
    hostName: hostName,
    appStates: appStates,
    currentState: currentState,
    isOffline: isOffline,
    ajaxLoader: ajaxLoader,
    splashScreen: splashScreen,
    errorScreen: errorScreen,
    serverSideData: serverSideData,
  }
})();

