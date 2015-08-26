console.log("walty test@1@index.js");

var Request = require("sdk/request").Request;
var OAuthConsumer = require("oauthorizer/lib/oauthconsumer.js").OAuthConsumer;
var ss = require("sdk/simple-storage");
var self = require("sdk/self");
var pageMod = require("sdk/page-mod");
const { atob, btoa } = require("chrome").Cu.import("resource://gre/modules/Services.jsm", {});

console.log("@2, OAuthConsumer", OAuthConsumer);
console.log("@3, btoa", btoa);
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

//it should be executed after valid token checking
function setupNotesFolder(sender){
  var email = sender.email;
  sendAjax({
        type: "POST",
        dataType: 'json',
        contentType: "application/json",
        headers: {
            "Authorization": "Bearer " + getStorage(email, "access_token")
        },
        data: JSON.stringify({
              "title":"_SIMPLE_GMAIL_NOTES_",
              "parents": [{"id":"root"}],
              "mimeType": "application/vnd.google-apps.folder"
        }),
        url: "https://www.googleapis.com/drive/v2/files",
       success: function(data){
         var gdriveFolderId = data.id;
          sendMessage(sender, {action:"update_gdrive_note_info", 
              gdriveNoteId:"", gdriveFolderId:gdriveFolderId});

          sendMessage(sender, {action:"enable_edit", gdriveEmail:getStorage(email, "gdrive_email")});  //ready for write new message

         console.log("@276", data);
       }
    })

}

function loadMessage(sender, gdriveNoteId){
  var email = sender.email;
	sendAjax({
		type:"GET",
		headers: {
				"Authorization": "Bearer " + getStorage(email, "access_token")
		},
		url: "https://www.googleapis.com/drive/v2/files/"
                    + gdriveNoteId + "?alt=media",
		success: function(data) {
			console.log("@268", data);
			sendMessage(sender, {action:"update_content", content:data});
      sendMessage(sender, {action:"enable_edit", gdriveEmail:getStorage(email, "gdrive_email")});  //ready for write new message
		},
		error: function(data){
			sendMessage(sender, {action:"show_error", 
                message:"Faild load message, error: " + JSON.stringify(data)});
		}
	});
}

//list the files created by this app only (as restricted by permission)
function searchMessage(sender, messageId){
  var email=sender.email;
	executeIfValidToken(sender, function(data){
		sendAjax({
			type:"GET",
			dataType: 'json',
			contentType: "application/json",
			headers: {
					"Authorization": "Bearer " + getStorage(email, "access_token")
			},
			url: "https://www.googleapis.com/drive/v2/files",
			success: function(data){
				console.log("@245", data);
				var gdriveFolderId = "";
				var gdriveNoteId = "";

				//first pass, get folder id for gmail notes
				for(var i=0; i<data.items.length; i++){
					var currentItem = data.items[i];
					if(currentItem.title == "_SIMPLE_GMAIL_NOTES_" 
                        && currentItem.parents[0].isRoot){
						//found the root folder
						gdriveFolderId = currentItem.id;
						break;
					}
				}

				if(!gdriveFolderId){
					setupNotesFolder(sender);
				}
				else{
					//second pass find the document
					//var messageId = getStorage(email, "message_id");
					console.log("@277", messageId);
					for(var i=0; i<data.items.length; i++){
						var currentItem = data.items[i];
            //console.log("@330", currentItem.title, messageId, currentItem.parents[0].id, gdriveFolderId);
            //console.log("@325", currentItem == messageId);
            //console.log("@325", currentItem.parents[0].id == gdriveFolderId);
						if(currentItem.title == messageId 
                            && currentItem.parents[0].id == gdriveFolderId){
							gdriveNoteId = currentItem.id;
              break;
						}
					}

          console.log("@330", gdriveNoteId);

          sendMessage(sender, {action:"update_gdrive_note_info", 
              gdriveNoteId:gdriveNoteId, gdriveFolderId:gdriveFolderId});

          if(gdriveNoteId){
            loadMessage(sender, gdriveNoteId);
          }
          else{
            sendMessage(sender, {action:"enable_edit", gdriveEmail:getStorage(email, "gdrive_email")});  //ready for write new message
          }
				}

				//setStorage(email, "folder_id", gdriveFolderId);

                //if not found, an empty value needs to be set
				//setStorage(email, "note_id", gdriveNoteId);
			},
			error:function(data){
				showRefreshTokenError(email, JSON.stringify(data));
			}
		
		});
	});
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

//post message to google drive
//reference: https://developers.google.com/drive/web/quickstart/quickstart-js
function postNote(sender, messageId, gdriveFolderId, gdriveNoteId, content){
  var email = sender.email;
	console.log("@34, post content", content);
	console.log("@32, ", gdriveFolderId);

	executeIfValidToken(sender, function(data){
		var uploadUrl =  "https://www.googleapis.com/upload/drive/v2/files";
		var methodType = "POST"

		if(gdriveNoteId){	//update existing one
			uploadUrl += "/" + gdriveNoteId
			methodType = "PUT";
		}

		var metadata = { title:messageId, parents:[{"id":gdriveFolderId}] };
		var boundary = "-------314159265358979323846";
		var contentType = "text/plain";
		var delimiter = "\r\n--" + boundary + "\r\n";
		var close_delim = "\r\n--" + boundary + "--";
		var base64Data = btoa(unescape(encodeURIComponent(content)));
		var multipartRequestBody =
              delimiter +
              'Content-Type: application/json\r\n\r\n' +
              JSON.stringify(metadata) +
              delimiter +
              'Content-Type: ' + contentType + '\r\n' +
              'Content-Transfer-Encoding: base64\r\n' +
              '\r\n' +
              base64Data +
              close_delim;
		
		
		sendAjax({
			type:methodType,
			url:uploadUrl + "?uploadType=multipart",
			headers: {
					"Authorization": "Bearer " + getStorage(email, "access_token"),
					"Content-Type": "multipart/related; boundary=\"" 
                                                + boundary + "\""
			},
			data: multipartRequestBody,
			success: function(data){
				console.log("message posted successfully");
			},
			error: function(data){
				sendMessage(sender, {action:"show_error", 
                    message:"Faild post message, error: " 
                        + JSON.stringify(data)});
		 }
		});
	});
}

function setupListeners(worker, request){
  var email = request.email;
  var sender = {worker, email}

  switch (request.action){
    case "logout":
      logoutGoogleDrive(sender);
      break;
    case "reconnect":
    case "login":
      loginGoogleDrive(sender, request.messageId);
      break;
    case "post_note":
      postNote(sender, request.messageId, 
              request.gdriveFolderId, request.gdriveNoteId, request.content);
      break;

    case "initialize":
      initialize(sender, request.messageId);
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
    headers: ajaxConfig.headers,
    onComplete: function(response){
      var data = response.json;
      if(!data)
        data = response.text;

      console.log("@205, ajax complete", response.status, ajaxConfig.url, response.text);

      if(ajaxConfig.complete){
        ajaxConfig.complete(data);

      }

      if(response.status >= 400){ //got error
        if(ajaxConfig.error){
          console.log("@205, ajax error", response.status, ajaxConfig.url, response.text);
          ajaxConfig.error(data);
        }
      }
      else{ //success
        if(ajaxConfig.success){
          console.log("@211, ajax success", ajaxConfig.url, response.text);
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
