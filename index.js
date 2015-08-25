console.log("walty test@1@index.js");

var Request = require("sdk/request").Request;
var OAuthConsumer = require("oauthorizer/lib/oauthconsumer.js").OAuthConsumer;
var ss = require("sdk/simple-storage");
var self = require("sdk/self");
var pageMod = require("sdk/page-mod");


//The refresh token, access token and email for google drive are stored in
//local storage. Different gmails may have different sets of storage.
function setStorage(email, key, value) 
{
  var storageKey = email + "||" + key;
  //localStorage[storageKey] = value;
  ss.storage[storageKey] = value;
}

function getStorage(email, key)
{
  if(!email || email.indexOf("@") < 0){
    console.log("email not found!");
  }

  var storageKey = email + "||" + key;
  //value = localStorage[storageKey];
  value = ss.storage[storageKey];

  console.log("@20, gets storage", email, key, value);
  return value;
}
console.log("@2, OAuthConsumer", OAuthConsumer);

/*
var self = require('sdk/self');

// a dummy function, to show how tests work.
// to see how to test this function, look at test/test-index.js
function dummy(text, callback) {
  callback(text);
}

exports.dummy = dummy;

console.log("walty test@11@index.js");
console.log("walty test@12@index.js");
console.log("walty test@13@index.js");
var walty_test = 123;
*/





pageMod.PageMod({
  include: ["https://mail.google.com/*", "http://mail.google.com/*"],
  contentScriptFile: [self.data.url('jquery-1.10.2.min.js'), self.data.url('content.js')],
  contentScriptWhen: 'end',  
  onAttach: sendUrl
});

/*
function initialize(sender, messageId){
  //var jquery = require("./data/jquery-1.10.2.min.js");
    sendMessage(sender, {action:"show_log_in_prompt"});
    sendMessage(sender, {action:"disable_edit"});

}
*/

function searchMessage(sender, messageId){  //walty temp
  console.log("searching message", messageId);
}

function logoutGoogleDrive(sender){
  var email = sender.email;
  console.log("@207 ", getStorage(email, "access_token"));
  console.log("@208 ", getStorage(email, "refresh_token"));
  var tokenValue = getStorage(email, "access_token");
  if(tokenValue){
    console.log("Revoking token: ", tokenValue);
    //chrome.identity.removeCachedAuthToken({'token':tokenValue}, function(){});
    sendAjax({
      url:"https://accounts.google.com/o/oauth2/revoke?token=" + tokenValue,
      complete:function(){
        console.log("@163");
        setStorage(email, "access_token", "");
        setStorage(email, "refresh_token", "");
        setStorage(email, "gdrive_email", "");
        sendMessage(sender, {action:"show_log_in_prompt"});
				sendMessage(sender, {action:"disable_edit"});
        //alert("Logged out successfully");
      }
    });

    //sendResponse({action: "show_error", message:"walty test 22222"});
    //sendMessage({action: "show_error", message:"walty test"});
  }
}

//do as much initilization as possible, while not trigger login page
function initialize(sender, messageId){
  var email = sender.email;
	//var messageId = getStorage(email, "message_id");
  //var refresh_token = getStorage("refresh_token");
  if(getStorage(email, "refresh_token")){
    console.log("@253, refresh token:", getStorage(email, "refresh_token"), 
        "access_token", getStorage(email, "access_token"))
    sendMessage(sender, {action:"show_log_out_prompt"});
    sendMessage(sender, {action:"enable_edit"});
    updateUserInfo(sender);
    searchMessage(sender, messageId);
  }
  else{ //no refresh token
    if(getStorage(email, "access_token")){
      logoutGoogleDrive(sender);
    }
    sendMessage(sender, {action:"show_log_in_prompt"});
    sendMessage(sender, {action:"disable_edit"});

  }

}

function executeIfValidToken(sender, command){
  var email = sender.email;
  sendAjax({
    url:"https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=" 
      + getStorage(email, "access_token"),
    success:function(data){
      command(data);
    },
    error:function(data){
       //get a new access token
      sendAjax({
        type: "POST",
        contentType: "application/x-www-form-urlencoded",
        data: {
            "refresh_token":getStorage(email, "refresh_token"),
            "client_id":"38131814991-p4u809qrr5ee1bsehregd4os69jf2n7i.apps.googleusercontent.com",
            "client_secret":"mdA0U_jSkAjI_1x8pdgtrx02",
            "redirect_uri":"https://jfjkcbkgjohminidbpendlodpfacgmlm.chromiumapp.org/provider_cb",
            "grant_type":"refresh_token"
        },
        url: "https://www.googleapis.com/oauth2/v3/token",
        success:function(data){
          console.log("@172, renewed token");
          setStorage(email, "access_token", data.access_token);
          command(data);
        },
        error:function(){
          //the refresh token is not valid somehow
          showRefreshTokenError(email, JSON.stringify(data));
        }
      });
    }
  });

}

function updateUserInfo(sender){
  var email = sender.email;
  if(getStorage(email, "gdrive_email")){
    sendMessage(sender, {action:"update_user", email:getStorage(email, "gdrive_email")});
    return;
  }

  executeIfValidToken(sender, function(data){
    var email = sender.email;
    sendAjax({
      url:"https://www.googleapis.com/drive/v2/about?access_token=" + 
        getStorage(email, "access_token"),
      success:function(data){
        console.log("@174, got user info", data);
        setStorage(email, "gdrive_email", data.user.emailAddress);
        sendMessage(sender, {action:"update_user", email:data.user.emailAddress})
      },
      error:function(){
        sendMessage(sendder, {action:"show_error", 
            message: "Failed to get Google Drive User"});
      }
    });
  });

}

function updateRefreshTokenFromCode(sender, messageId){
  var email = sender.email;
  sendAjax({
    type: "POST",
    contentType: "application/x-www-form-urlencoded",
    data: {
        "code":getStorage(sender.email, "code"),
        "client_id":"38131814991-p4u809qrr5ee1bsehregd4os69jf2n7i.apps.googleusercontent.com",
        "client_secret":"mdA0U_jSkAjI_1x8pdgtrx02",
        "redirect_uri":"http://localhost",
        "grant_type":"authorization_code"
    },
    url: "https://www.googleapis.com/oauth2/v3/token",
    error: function(data){
      showRefreshTokenError(sender, JSON.stringify(data));  //walty temp
    },
    success: function(data){
      if(!data.refresh_token){
        showRefreshTokenError(sender, "Google Drive token could not be collected.");
        setStorage(email, "access_token", data.access_token); //for future revoking
      }
      else{
        console.log("@59, success", data);
        //console.log(data);
        setStorage(email, "refresh_token", data.refresh_token);
        setStorage(email, "access_token", data.access_token);
        initialize(sender, messageId);
        updateUserInfo(sender);
      }
    }
  });
}
function loginGoogleDrive(sender, messageId) {

    var calls = {
      userAuthorizationURL: "https://accounts.google.com/o/oauth2/auth"
    };


    console.log("@72", OAuthConsumer);
    console.log("@72", OAuthConsumer.makeProvider);
    var p = OAuthConsumer.makeProvider('google-oauth2', 'Google',
        "38131814991-p4u809qrr5ee1bsehregd4os69jf2n7i.apps.googleusercontent.com", "mdA0U_jSkAjI_1x8pdgtrx02",
        "http://localhost", calls);
    p.version = "2.0";
    p.tokenRx = /\?code=([^&]*)/gi;

    p.requestParams = {
      'response_type': 'code',
      'access_type' : 'offline',
      'login_hint' : sender.email,
      'prompt' : 'consent',
      'xoauth_displayname': "Simple Gmail Notes",
      'scope': 'https://www.googleapis.com/auth/drive.file' // contacts
    };

    p.useInternalStorage = false;


    function testCallback(svc) {
      console.log("@59", svc);
      console.log("@60", svc.token);

      var code = svc.token
      code = code.replace(/[#]/g, "");
      console.log("@53:" + code);
      setStorage(sender.email, "code", code);
      updateRefreshTokenFromCode(sender, messageId);

      //var code = code.replace(/[#]/g, "");
      // your access_token is svc.token
    }
    console.log("@70, walty test");
    var handler = OAuthConsumer.getAuthorizer(p, testCallback);
    console.log("@71, walty test");
    handler.startAuthentication();
}

function setupListeners(worker, request){
  var email = request.email;
  var sender = {worker, email}

  switch (request.action){
    case "initialize":
      console.log("@118", request);
      initialize(sender, request.messageId);
      break;
    case "login":
      loginGoogleDrive(sender, request.messageId);
      break;
    case "logout":
      logoutGoogleDrive(sender);
      break;

    default:
      console.log("unknown request to background", request);
      break;
  }

}

function sendUrl(worker) {
  var dataurl = self.data.url("jquery-1.10.2.min.js");
  dataurl = dataurl.substring(0, dataurl.lastIndexOf('/')); 
  worker.port.emit("initPage", dataurl);

  worker.port.on("SGN_content", function(request){
    console.log("@38@index.js", request);
    setupListeners(worker, request);
  });
}

function sendMessage(sender, message) {
  console.log("@116", sender, message);
  sender.worker.port.emit("SGN_background", message); 
}

function showRefreshTokenError(sender, message) {
  console.log("@196, token error", message);
}

function sendAjax(ajaxConfig) {
  var request = Request({
    url: ajaxConfig.url,
    contentType: ajaxConfig.contentType,
    content: ajaxConfig.data,
    onComplete: function(response){
      if(ajaxConfig.complete){
        console.log("@205, ajax complete", response.status, ajaxConfig.url, response.text);
        ajaxConfig.complete(response.json);

      }

      if(response.status >= 400){ //got error
        if(ajaxConfig.error){
          console.log("@205, ajax error", response.status, ajaxConfig.url, response.text);
          ajaxConfig.error(response.json);
        }
      }
      else{ //success
        if(ajaxConfig.success){
          console.log("@211, ajax success", ajaxConfig.url, response.text);
          ajaxConfig.success(response.json);
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
