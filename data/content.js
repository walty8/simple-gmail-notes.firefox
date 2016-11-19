/*
 * Simple Gmail Notes 
 * https://github.com/walty8
 * Copyright (C) 2015 Walty Yeung <walty8@gmail.com>
 * License: GPLv3
 */

debugLog("Entered content script");
debugLog("Current content settings", settings);

//implement callbacks
sendBackgroundMessage = function(messageObj)
{
  debugLog("Send message", messageObj);
  self.port.emit("SGN_content", messageObj);
}

setupBackgroundEventsListener = function(callback){
  self.port.on("SGN_background", function(request){
    callback(request);
  });
}

var isDebugCache = null;
isDebug = function(callback){
  //console.log("debug cache:" + typeof(isDebugCache));
  //return false;
  return isDebugCache == true;
}

var gDataURL = "";     //it's to be initialized by 'initContent'
getIconBaseUrl = function(){
  return gDataURL + "/image";
}

function addScript(scriptPath){
  if(top.document == document) {
    var j = document.createElement('script');
    j.src = gDataURL + '/' + scriptPath;
    j.async = false;
    j.defer = false;
    (document.head || document.documentElement).appendChild(j);
  }
}

//callback implementation end



//initalization

self.port.on("initContent", function handleMyMessage(dataurl) {
  gDataURL = dataurl;
  appendDebugInfo("documentReady");
  fireContentLoadedEvent();
});

