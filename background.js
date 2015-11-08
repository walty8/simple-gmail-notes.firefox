/*
 * Simple Gmail Notes 
 * https://github.com/walty8
 * Copyright (C) 2015 Walty Yeung <walty8@gmail.com>
 * License: GPLv3
 */

const {Cc, Ci, Cr, Cu, Cm, components} = require("chrome");
const { atob, btoa } = require("chrome").Cu.import("resource://gre/modules/Services.jsm", {});
var Request = require("sdk/request").Request;
var ss = require("sdk/simple-storage");
var self = require("sdk/self");
var pageMod = require("sdk/page-mod");
let {OAuthConsumer} = require("./lib/oauthorizer/lib/oauthconsumer");

//load common script
var instance = Cc["@mozilla.org/moz/jssubscript-loader;1"];
var loader = instance.getService(Ci.mozIJSSubScriptLoader);
loader.loadSubScript(self.data.url("common/background-common.js"));
debugLog("Common script loaded, current settings", settings);

//Callback implementation for common script
var isDebugCache = null;
isDebug = function(callback){
  //return false;
  //return true;
  return isDebugCache == true;
}

getRawStorageObject = function(){
  return ss.storage
}

getPreferences = function(){
  var preferences = require("sdk/simple-prefs").prefs;

  return preferences;
}

sendContentMessage = function(sender, message) {
  debugLog("Sending message", sender, message);
  sender.worker.port.emit("SGN_background", message); 
}

sendAjax = function(ajaxConfig) {
  var request = Request({
    url: ajaxConfig.url,
    contentType: ajaxConfig.contentType,
    content: ajaxConfig.data,
    headers: ajaxConfig.headers,
    onComplete: function(response){
      var data = response.json;
      if(!data)
        data = response.text;

      if(ajaxConfig.complete){
        ajaxConfig.complete(data);
      }

      if(response.status >= 400){ //got error
        if(ajaxConfig.error){
          ajaxConfig.error(data);
        }
      }
      else{ //success
        if(ajaxConfig.success){
          ajaxConfig.success(data);
        }
      }
    }
  });

  switch(ajaxConfig.type){
    case "POST":
      request.post();
      break;
    case "PUT":
      request.put();
    case "DELETE":
      request.delete();
    default:
      request.get();
  }
}

iterateArray = function(arr, callback){
  for(var i=0; i<arr.length; i++){
    callback(i, arr[i]);
  }
}

getRedirectUri = function() {
  return "http://localhost";
}

launchAuthorizer = function(sender, callback){
  var calls = {
    userAuthorizationURL: "https://accounts.google.com/o/oauth2/auth"
  };
  var p = OAuthConsumer.makeProvider('google-oauth2', 'Google',
            settings.CLIENT_ID, settings.CLIENT_SECRET, 
            getRedirectUri(), calls);
  p.version = "2.0";
  p.tokenRx = /\?code=([^&]*)/gi;
  p.useInternalStorage = false;
  p.requestParams = {
    'response_type': 'code',
    'access_type' : 'offline',
    'login_hint' : sender.email,
    'prompt' : 'consent',
    'xoauth_displayname': "Simple Gmail Notes",
    'scope': settings.SCOPE 
  };
  var handler = OAuthConsumer.getAuthorizer(p, function(svc){
    var code = svc.token;
    callback(code);
  });
  handler.startAuthentication();
}

removeCachedToken = function(toeknValue){
  //this logic does not exist for Firefox extension
}

checkLogger = function(sender){
  Cu.import("resource://gre/modules/AddonManager.jsm");
  AddonManager.getAddonByID("@simple-gmail-notes", function(addon) {
    var isDebug = addon.version == "0.0.1";

    //settings.DEBUG = false;
    isDebugCache = isDebug;
    sendContentMessage(sender, {action : "set_debug", value:isDebug});
  });
}

//background script initialzation   //we only care the folder
backgroundInit = function(worker) {
  var dataurl = self.data.url("dummy.html");  //we only care the folder
  dataurl = dataurl.substring(0, dataurl.lastIndexOf('/')); 
  worker.port.emit("initConent", dataurl);
  worker.port.on("SGN_content", function(request){
    debugLog("Get message to background", request);
    sender = {worker: worker, email: request.email};
    setupListeners(sender, request);
  });
}

//trigger the background init script, and set up the content script
pageMod.PageMod({
  include: ["https://mail.google.com/*", "http://mail.google.com/*"],
  contentScriptFile: [self.data.url('lib/jquery-1.11.3.min.js'), 
                      self.data.url('common/content-common.js'),
                      self.data.url('content.js')],
  contentScriptWhen: 'end',  
  onAttach: backgroundInit
});
