console.log("walty test@1@index.js");

var Request = require("sdk/request").Request;
var OAuthConsumer = require("oauthorizer/lib/oauthconsumer.js").OAuthConsumer;


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




var self = require("sdk/self");
var pageMod = require("sdk/page-mod");

pageMod.PageMod({
  include: ["https://mail.google.com/*", "http://mail.google.com/*"],
  contentScriptFile: [self.data.url('jquery-1.10.2.min.js'), self.data.url('content.js')],
  contentScriptWhen: 'end',  
  onAttach: sendUrl
});

function initialize(sender, messageId){
  //var jquery = require("./data/jquery-1.10.2.min.js");
    sendMessage(sender, {action:"show_log_in_prompt"});
    sendMessage(sender, {action:"disable_edit"});

    var request = Request({
      url: "http://pub.walty8.com/test8",
      onComplete: function(response){
        console.log("@76", response);
      }
    });

    request.get();


}

function loginGoogleDrive(sender, messageId)
{

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


    function testCallback(svc) {
      console.log("@59", svc);
      console.log("@60", svc.token);
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
      loginGoogleDrive(worker, request.messageId);
      break;

    default:
      console.log("unknown background request", request);
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

function sendMessage(sender, message)
{
  console.log("@116", sender, message);
  sender.worker.port.emit("SGN_background", message); 
}
