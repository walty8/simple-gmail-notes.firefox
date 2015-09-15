//This function must be implemented first, other all debug log would not work
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
setStorage = function(sender, key, value) 
{
  var email = sender.email;
  var storageKey = email + "||" + key;
  ss.storage[storageKey] = value;
}

getStorage = function(sender, key)
{
  var email = sender.email;
  if(!email || email.indexOf("@") < 0){
    debugLog("email not found!");
  }
  var storageKey = email + "||" + key;
  value = ss.storage[storageKey];
  debugLog("Get storage", email, key, value);
  return value;
}

sendMessage = function(sender, message) {
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
    if(addon.version != "0.0.1"){
      settings.DEBUG = false;
      sendMessage(sender, {action : "disable_logger"});
    }
  });
}

//background script initialzation 
backgroundInit = function(worker) {
  var dataurl = self.data.url("jquery-1.10.2.min.js");
  dataurl = dataurl.substring(0, dataurl.lastIndexOf('/')); 
  worker.port.emit("initPage", dataurl);
  worker.port.on("SGN_content", function(request){
    debugLog("Get message to background", request);
    sender = {worker: worker, email: request.email};
    setupListeners(sender, request);
  });
}

//trigger the background init script, and set up the content script
pageMod.PageMod({
  include: ["https://mail.google.com/*", "http://mail.google.com/*"],
  contentScriptFile: [self.data.url('lib/jquery-1.10.2.min.js'), self.data.url('content.js')],
  contentScriptWhen: 'end',  
  onAttach: backgroundInit
});
