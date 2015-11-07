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

isDebugCache = null;
isDebug = function(callback){
  return true;
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

     var s = document.createElement('script');
     s.src = dataurl+'/common/page-common.js';
     (document.head || document.documentElement).appendChild(s);

     var s = document.createElement('script');
     s.src = dataurl+'/page.js';
     (document.head || document.documentElement).appendChild(s);
  }
}

self.port.on("initConent", function handleMyMessage(dataurl) {
  setupListeners();
  setupPageScripts(dataurl);
});
