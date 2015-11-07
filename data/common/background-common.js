/*
 * Simple Gmail Notes 
 * https://github.com/walty8
 * Copyright (C) 2015 Walty Yeung <walty8@gmail.com>
 * License: GPLv3
 *
 * This script is going to be shared for both Firefox and Chrome extensions.
 * Note that jquery function calls should be avoided in this file, because 
 * jquery could not be imported to the background page, see sendAjax and 
 * iterateArray for the samples.
 *
 */

var settings = {
  CLIENT_ID: "38131814991-p4u809qrr5ee1bsehregd4os69jf2n7i.apps.googleusercontent.com",
  CLIENT_SECRET: "mdA0U_jSkAjI_1x8pdgtrx02",
  NOTE_FOLDER_NAME: "_SIMPLE_GMAIL_NOTES_",
  SCOPE: 'https://www.googleapis.com/auth/drive.file'
} 

/*
 * Callback declarations
 *
 * The following methods MUST be implemented by the Firefox / Chrome extension
 */

//The refresh token, access token and email for google drive are stored in
//local storage. Different gmails may have different sets of storage.
isDebug = function(callback) {
  //return true;  //turn on this only if u want to check initialization part
  return false;
}

getRawStorageObject = function(){
  throw "getRawStorageObject not implementd";
}

sendContentMessage = function(sender, message) {
  throw "sendContentMessage not implemented";
}

sendAjax = function(config) {
  throw "sendAjax not implemented";
}

iterateArray = function(arr, callback){
  throw "iterateArray not implemented";
}

getRedirectUri = function() {
  throw "getRedirectUri not implemented";
}

launchAuthorizer = function(sender, callback) {
  throw "launchAuthorizer not implemented";
}

removeCachedToken = function(tokenValue){
  throw "removeCachedAuthToken not implemented";
}

checkLogger = function(sender){
  throw "checkLogger not implemented";
}

/*
 * Shared Utility Functions
 */

debugLog = function() //need some further work
{
  if (isDebug() && console && console.log) {
      console.log.apply(console, arguments);
  }
}

setStorage = function(sender, key, value) {
  var email = sender.email;
  var storageKey = email + "||" + key;
  var storage = getRawStorageObject();
  storage[storageKey] = value;
}

getStorage = function(sender, key) {
  var email = sender.email;
  if(!email || email.indexOf("@") < 0){
    debugLog("Get storage email not found.");
  }

  var storageKey = email + "||" + key;
  var storage = getRawStorageObject()
  value = storage[storageKey];

  debugLog("Get storage result", email, key, value);
  return value;
}

getSettingHideListingNotes = function() {
  var storage = getRawStorageObject();
  var result = (storage["hideListingNotes"] === "true");

  return result;
}


//Post message to google drive via REST API
//Reference: https://developers.google.com/drive/web/quickstart/quickstart-js
postNote = function(sender, messageId, gdriveFolderId, gdriveNoteId, content){
  debugLog("Posting content", content);
  debugLog("Google Drive folder ID", gdriveFolderId);

  executeIfValidToken(sender, function(data){
    var uploadUrl =  "https://www.googleapis.com/upload/drive/v2/files";
    var methodType = "POST"

    if(gdriveNoteId){  //update existing one
      uploadUrl += "/" + gdriveNoteId
      methodType = "PUT";
    }

    var noteDescripton = content.substring(0,50);

    var metadata = { title:messageId, parents:[{"id":gdriveFolderId}], 
                     description: noteDescripton };
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
          "Authorization": "Bearer " + getStorage(sender, "access_token"),
          "Content-Type": "multipart/related; boundary=\"" 
                                                + boundary + "\""
      },
      data: multipartRequestBody,
      success: function(data){
        debugLog("message posted successfully");
      },
      error: function(data){
        sendContentMessage(sender, {action:"show_error", 
                              message:"Faild post message, error: " + 
                              JSON.stringify(data)});
      }
    });
  });
}


showRefreshTokenError = function(sender, error){
  logoutGoogleDrive(sender);
  errorMessage = "Error connecting to Google Drive. " +
                    "Please try to connect again. \n" +
                    "If error persists, you may manually " +
                    "<a href='https://accounts.google.com/b/0/IssuedAuthSubTokens'>revoke</a> " +
                    "previous tokens.\n"
  sendContentMessage(sender, {action:"show_error", message: errorMessage});
}

updateRefreshTokenFromCode = function(sender, messageId){
  sendAjax({
    type: "POST",
    contentType: "application/x-www-form-urlencoded",
    data: {
        "code":getStorage(sender, "code"),
        "client_id": settings.CLIENT_ID,
        "client_secret": settings.CLIENT_SECRET, 
        "redirect_uri": getRedirectUri(),
        "grant_type":"authorization_code"
    },
    url: "https://www.googleapis.com/oauth2/v3/token",
    error: function(data){
      showRefreshTokenError(sender, JSON.stringify(data));
    },
    success: function(data){
      if(!data.refresh_token){
        showRefreshTokenError(sender, 
          "Google Drive token could not be collected.");
        //for future revoking
        setStorage(sender, "access_token", data.access_token); 
      }
      else{
        debugLog("Updated refresh token", data);
        setStorage(sender, "refresh_token", data.refresh_token);
        setStorage(sender, "access_token", data.access_token);
        initialize(sender, messageId);
        updateUserInfo(sender);
      }
    }
  });
}

updateUserInfo = function(sender){
  if(getStorage(sender, "gdrive_email")){
    sendContentMessage(sender, {action:"update_user", 
                         email:getStorage(sender, "gdrive_email")});
    return;
  }

  executeIfValidToken(sender, function(data){
    sendAjax({
      url:"https://www.googleapis.com/drive/v2/about?access_token=" + 
        getStorage(sender, "access_token"),
      success:function(data){
        setStorage(sender, "gdrive_email", data.user.emailAddress);
        sendContentMessage(sender, {action:"update_user", 
                             email:data.user.emailAddress})
      },
      error:function(){
        sendContentMessage(sender, {action:"show_error", 
                             message: "Failed to get Google Drive User"});
      }
    });
  });
}

executeIfValidToken = function(sender, command){
  if(!getStorage(sender, "access_token") && 
     !getStorage(sender, "refresh_token")){  //if acccess token not found
      
    debugLog("@197, no token found, skip the verification");
    showRefreshTokenError(sender, "No token found.");
    return;
  }

  sendAjax({
    url:"https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=" + 
          getStorage(sender, "access_token"),
    success:function(data){
      command(data);
    },
    error:function(data){
      //get a new access token
      sendAjax({
        type: "POST",
        contentType: "application/x-www-form-urlencoded",
        data: {
            "refresh_token": getStorage(sender, "refresh_token"),
            "client_id": settings.CLIENT_ID,
            "client_secret": settings.CLIENT_SECRET,
            "redirect_uri": getRedirectUri(),
            "grant_type": "refresh_token"
        },
        url: "https://www.googleapis.com/oauth2/v3/token",
        success:function(data){
          debugLog("Renewed token");
          setStorage(sender, "access_token", data.access_token);
          command(data);
        },
        error:function(){
          //the refresh token is not valid somehow
          showRefreshTokenError(sender, JSON.stringify(data));
        }
      });
    }
  });
}

loginGoogleDrive = function(sender, messageId){
  debugLog("Trying to login Google Drive.");
  launchAuthorizer(sender, function(code) {
      debugLog("Code collected", code);
      if(!code){
        sendContentMessage(sender, {action:"show_log_in_prompt"});
        sendContentMessage(sender, {action:"disable_edit"});
        sendContentMessage(sender, {action:"show_error", 
            message:"Failed to login Google Drive."});
      }
      else{
        //get code from redirect url
        if(code.indexOf("=") >= 0)  //for chrome
          code = code.split("=")[1];

        code = code.replace(/[#]/g, "");
        debugLog("Collected code:" + code);
        setStorage(sender, "code", code);
        updateRefreshTokenFromCode(sender, messageId);
      }

    }
  );

}

logoutGoogleDrive = function(sender){
  var tokenValue = getStorage(sender, "access_token");
  if(tokenValue){
    debugLog("Revoking access token: ", tokenValue);
    removeCachedToken(tokenValue);
    sendAjax({
      url:"https://accounts.google.com/o/oauth2/revoke?token=" + tokenValue,
      complete:function(){
        debugLog("Revoke done");
        setStorage(sender, "access_token", "");
        setStorage(sender, "refresh_token", "");
        setStorage(sender, "gdrive_email", "");
        sendContentMessage(sender, {action:"show_log_in_prompt"});
        sendContentMessage(sender, {action:"disable_edit"});
      }
    });
  }
}

loadMessage = function(sender, gdriveNoteId){
  sendAjax({
    type:"GET",
    headers: {
      "Authorization": "Bearer " + getStorage(sender, "access_token")
    },
    url: "https://www.googleapis.com/drive/v2/files/" + 
          gdriveNoteId + "?alt=media",
    success: function(data) {
      debugLog("Loaded message", data);
      sendContentMessage(sender, {action:"update_content", content:data});
      sendContentMessage(sender, {action:"enable_edit", 
                           gdriveEmail:getStorage(sender, "gdrive_email")});  
    },
    error: function(data){
      sendContentMessage(sender, {action:"show_error", 
                           message:"Faild load message, error: " + 
                                    JSON.stringify(data)});
    }
  });
}

//Set up notes token validity checking
setupNotesFolder = function(sender){
  sendAjax({
        type: "POST",
        dataType: 'json',
        contentType: "application/json",
        headers: {
            "Authorization": "Bearer " + getStorage(sender, "access_token")
        },
        data: JSON.stringify({
              "title": settings.NOTE_FOLDER_NAME,
              "parents": [{"id":"root"}],
              "mimeType": "application/vnd.google-apps.folder"
        }),
        url: "https://www.googleapis.com/drive/v2/files",
       success: function(data){
         var gdriveFolderId = data.id;
         sendContentMessage(sender, {action:"update_gdrive_note_info", 
                              gdriveNoteId:"", 
                              gdriveFolderId:gdriveFolderId});
         //ready for write new message
         sendContentMessage(sender, {action:"enable_edit", 
                              email:getStorage(sender, "gdrive_email")}); 
         debugLog("Data loaded:", data);
       }
    })

}

gdriveQuery = function(sender, query, success_cb, error_cb){

  executeIfValidToken(sender, function(data){
    query = encodeURIComponent(query);
    debugLog("Search message by query:", query);
    sendAjax({
      type:"GET",
      dataType: 'json',
      contentType: "application/json",
      headers: {
          "Authorization": "Bearer " + getStorage(sender, "access_token")
      },
      url: "https://www.googleapis.com/drive/v2/files?q=" + query,
      success:function(data){success_cb(data)},
      error:function(data){error_cb(data)}
    });
  })


}

//list the files created by this app only (as restricted by permission)
searchNote = function(sender, messageId){
  var query = "title = '" + settings.NOTE_FOLDER_NAME + "' or " +
                "title = '" + messageId + "'";
  gdriveQuery(sender, query, 
    function(data){ //success callback
      debugLog("Query result:", data);
      var gdriveFolderId = "";
      var gdriveNoteId = "";

      //first pass, get folder id for gmail notes
      for(var i=0; i<data.items.length; i++){
        var currentItem = data.items[i];
        if(currentItem.title == settings.NOTE_FOLDER_NAME
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
        debugLog("Searching message", messageId);
        for(var i=0; i<data.items.length; i++){
          var currentItem = data.items[i];
          if(currentItem.title == messageId && 
              currentItem.parents[0].id == gdriveFolderId){
            gdriveNoteId = currentItem.id;
            break;
          }
        }

        debugLog("Google Drive Folder ID found", gdriveNoteId);
//
        sendContentMessage(sender, {action:"update_gdrive_note_info", 
                             gdriveNoteId:gdriveNoteId, 
                             gdriveFolderId:gdriveFolderId});

        if(gdriveNoteId){
          loadMessage(sender, gdriveNoteId);
        }
        else{//ready for write new message
          sendContentMessage(sender, {
              action:"enable_edit", 
              gdriveEmail:getStorage(sender, "gdrive_email")
          });
        }
      }
    },
    function(data){ //error callback
      showRefreshTokenError(sender, JSON.stringify(data));
    }
  );
}

//Do as much initilization as possible, while not trigger login page
initialize = function(sender, messageId){
  if(getStorage(sender, "refresh_token")){
    debugLog("Initializing, current refresh token:", 
                getStorage(sender, "refresh_token"), 
                "access_token", 
                getStorage(sender, "access_token"))
    checkLogger(sender);
    searchNote(sender, messageId);
  }
  else{ //no refresh token
    if(getStorage(sender, "access_token")){
      logoutGoogleDrive(sender);
    }
    sendContentMessage(sender, {action:"show_log_in_prompt"});
    sendContentMessage(sender, {action:"disable_edit"});
  }
}

sendSummaryNotes = function(sender, pullList, resultList){
  var result = [];
  var itemDict = {};
  iterateArray(resultList, function(index, emailItem){
    if(emailItem.description){
      itemDict[emailItem.title] = emailItem.description;
    }
  });


  for(var i=0; i<pullList.length; i++){
    var title = pullList[i];
    var description = ""; //empty string for not found
    if(itemDict[title]){
      description = itemDict[title];
    }

    result.push({"title":title, "description":description});
  }

  sendContentMessage(sender, {email:getStorage(sender, "gdrive_email"), 
                       action:"update_summary", noteList:result});
}

pullNotes = function(sender, pendingPullList){
  var hideListingNotes = getSettingHideListingNotes();

  if(hideListingNotes){
    debugLog("@482, skipped pulling because settings -> hide listing notes");
    sendSummaryNotes(sender, pendingPullList, []);  //send an empty result
    return;
  }

  debugLog("@414", pendingPullList);
  var query = "1=1";
  iterateArray(pendingPullList, function(index, messageId){
    query += " or title='" + messageId + "'"
  });

  query = query.replace("1=1 or", "");  //remove the heading string

  debugLog("@431, query", query);

  gdriveQuery(sender, query,
    function(data){ //success callback
      debugLog("@433, query succeed", data);
      sendSummaryNotes(sender, pendingPullList, data.items);
    },
    function(data){ //error callback
      debugLog("@439, query failed", data);
    }
  );
}

//For messaging between background and content script
setupListeners = function(sender, request){
  debugLog("Request body:", request);
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
                 request.gdriveFolderId, request.gdriveNoteId, 
                 request.content);
      sendContentMessage(sender, {action:"revoke_summary_note", messageId: request.messageId});
      break;
    case "initialize":
      initialize(sender, request.messageId);
      break;
    case "pull_notes":
      pullNotes(sender, request.pendingPullList);
      break;
    default:
      debugLog("unknown request to background", request);
      break;
  }
}

debugLog("Finished background script (common)");
