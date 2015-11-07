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
  //return true;
  return isDebugCache == true;
}
//callback implementation end

//initialization scripts
setupPageScripts = function(dataurl){
  // Handle the message
  if(top.document == document) {
     var j = document.createElement('script');
     j.src = dataurl+'/lib/jquery-1.11.3.min.js';
     (document.head || document.documentElement).appendChild(j);

     var g = document.createElement('script');
     g.src = dataurl+'/lib/gmail.js';
     (document.head || document.documentElement).appendChild(g);

     var c = document.createElement('script');
     c.src = dataurl+'/common/page-common.js';
     (document.head || document.documentElement).appendChild(c);

     var p = document.createElement('script');
     p.src = dataurl+'/page.js';
     (document.head || document.documentElement).appendChild(p);
  }
}

self.port.on("initConent", function handleMyMessage(dataurl) {
  setupListeners();
  setupPageScripts(dataurl);
});
