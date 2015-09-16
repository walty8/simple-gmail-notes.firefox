/*
 * Simple Gmail Notes 
 * https://github.com/walty8
 * Copyright (C) 2015 Walty Yeung <walty8@gmail.com>
 */
var settings = {
  MAX_RETRY_COUNT : 20,
  DEBUG : true
}

/*
 * Callback declarations
 * The follow functions must be implemented
 */
sendMessage = function(messge) {
  throw "sendMessage not implemented";
}

setupBackgroundEventsListener = function(callback) {
  throw "setupBackgroundEventsListener not implemented";
}

/*
 * Callback utilities
 */
debugLog = function()
{
  if (settings.DEBUG) {
      console.log.apply(this, arguments);
  }
}

disableEdit = function(retryCount)
{
  if(retryCount == undefined)
    retryCount = settings.MAX_RETRY_COUNT;

  $(".sgn_input").prop("disabled", true);

  //keep trying until it's visible
  if(!$(".sgn_input").is(":disabled") || $(".sgn_padding").is(":visible")){  
    debugLog("retry disable edit");
    retryCount = retryCount - 1;
    if(retryCount > 0 )
      setTimeout(disableEdit, 100, retryCount);
  }
}

enableEdit = function(retryCount)
{
  if(retryCount == undefined)
      retryCount = settings.MAX_RETRY_COUNT;

  $(".sgn_input").prop("disabled", false);
  if($(".sgn_input").is(":disabled")){  //keep trying until it's visible
    debugLog("retry enable edit");
    retryCount = retryCount - 1;
    if(retryCount > 0 )
        setTimeout(enableEdit, 100, retryCount);
  }
}

showLoginPrompt = function(retryCount){
  if(retryCount == undefined)
      retryCount = settings.MAX_RETRY_COUNT;

  $(".sgn_prompt_login").show();
  $(".sgn_prompt_logout").hide();
  $(".sgn_padding").hide();
  debugLog("Login prompt visible", $(".sgn_prompt_login").is(":visible"));
  if(!$(".sgn_prompt_login").is(":visible")){  //keep trying until it's visible
    debugLog("Retry to show login prompt");
    retryCount = retryCount - 1;
    if(retryCount > 0 )
      setTimeout(showLoginPrompt, 100, retryCount);
  }
}

showLogoutPrompt = function(email, retryCount){
  if(retryCount == undefined)
      retryCount = settings.MAX_RETRY_COUNT;

  $(".sgn_prompt_logout").show();
  $(".sgn_prompt_login").hide();
  $(".sgn_padding").hide();
  $(".sgn_error").hide();

  if(email)
    $(".sgn_prompt_logout").find(".sgn_user").text(email);

  if(!$(".sgn_prompt_logout").is(":visible")){  //keep trying until it's visible
    debugLog("Retry to show prompt");
    retryCount = retryCount - 1;
    if(retryCount > 0 )
        setTimeout(showLogoutPrompt, 100, email, retryCount);
  }
}


//global variables to mark the status of current tab
var gCurrentGDriveNoteId = "";
var gCurrentGDriveFolderId = "";
var gPreviousContent = "";

setupNotes = function(email, messageId){
  debugLog("Start to set up notes");
  debugLog("Email", email);

  var injectionNode = $(".nH.if"); //hopefully this one is stable
  var textAreaNode = $("<textarea></textarea>", {
    "class": "sgn_input",
    "text": "",
    "disabled":"disabled"
  }).css({
    "width": "100%", 
    "height": "50px",
    "color": "gray",
    "margin": "5px",
  }).blur(function(){
    var content = $(this).val();
    if(gPreviousContent != content){
      sendMessage({action:"post_note", email:email, messageId:messageId, 
                   gdriveNoteId:gCurrentGDriveNoteId, 
                   gdriveFolderId:gCurrentGDriveFolderId, content:content});
    }
	  return true;
	});

  var logoutPrompt = $("<div class='sgn_prompt_logout'/></div>" )
      .html("Simple Gmail Notes connected to Google Drive of " +
              "'<span class='sgn_user'></span>' " +
              "(<a class='sgn_logout sgn_action'>Disconnect</a>)")
      .css({"display":"none",
            "color": "gray",
            "margin": "5px"});
  var loginPrompt = $("<div class='sgn_prompt_login'/></div>" )
      .html("Please <a class='sgn_login sgn_action'>connect</a> to " +
              "your Google Drive account to start using Simple Gmail Notes" )
      .css({"display":"none",
            "color": "gray",
            "margin": "5px"});
  var emptyPrompt = $("<div class='sgn_padding'>&nbsp;<div>")
                      .css({"margin":"5px"});
  var errorPrompt = $("<div class='sgn_error'><div>")
                      .html("Error connecting to Google Drive <span class='sgn_error_timestamp'></span>, " +
                          "please try to <a class='sgn_reconnect sgn_action'>connect</a> again. \n" +
                          "If error persists after 5 attempts, you may try to manually " +
                          "<a href='https://accounts.google.com/b/0/IssuedAuthSubTokens'>revoke</a> previous tokens.")
                      .css({"margin":"5px", "color":"red", "display":"none"});

  $(".sgn_input").remove();
  $(".sgn_prompt_login").remove();
  $(".sgn_prompt_logout").remove();

  injectionNode.prepend(errorPrompt);
  injectionNode.prepend(textAreaNode);
  injectionNode.prepend(loginPrompt);
  injectionNode.prepend(logoutPrompt);
  injectionNode.prepend(emptyPrompt);

  $(".sgn_action").css({
    "cursor":"pointer",
    "text-decoration":"underline"
  }).click(function(){
    var classList =$(this).attr('class').split(/\s+/);
    $.each(classList, function(index, item){
      if(item != 'sgn_action'){
          var action = item.substring(4);   //remove the 'sgn_' prefix
          sendMessage({action: action, email: email, messageId:messageId});
      }
    });
  });

  //load initial message
  debugLog("Start to initailize");
  sendMessage({action:"initialize", email: email, messageId:messageId});
}

setupListeners = function(){
  setupBackgroundEventsListener(
    function(request) {
      debugLog("Handle request", request);
      switch(request.action){
        case "disable_edit":
            disableEdit();
            break;
        case "enable_edit":
            enableEdit();
            showLogoutPrompt(request.gdriveEmail)
            break;
        case "show_log_out_prompt":
          showLogoutPrompt();
          break;
        case "show_log_in_prompt":
          debugLog("Show login");
          showLoginPrompt();
          disableEdit();
          break;
        case "show_error":
          var errorMessage = request.message;
          debugLog("Error in response:", errorMessage);
          var date = new Date();
          var timestamp = date.getHours() + ":" + date.getMinutes() + ":" + 
                            date.getSeconds();
          $(".sgn_error_timestamp").text("(" +  timestamp + ")");
          $(".sgn_error").show();
          break;
        case "update_user":
          $(".sgn_user").text(request.email);
          break;
        case "update_content":
          gPreviousContent = request.content;
          $(".sgn_input").val(request.content);
          showLogoutPrompt(request.email);
					break;
        case "update_gdrive_note_info":
          debugLog("Update google drive note info", 
                        request.gdriveFolderId, request.gdriveFolderId);
          gCurrentGDriveFolderId = request.gdriveFolderId;
          gCurrentGDriveNoteId = request.gdriveNoteId;
          break;
        case "disable_logger":
          debugLog("Trying to disable logger");
          settings.DEBUG = false;
          break;
        default:
          debugLog("unknown background request", request);
      }
    }
  )

  // Event listener for page
  document.addEventListener('SGN_setup_notes', function(e) {
      var email = e.detail.email;
      var messageId = e.detail.messageId;
      
      setupNotes(email, messageId);
  });
}

debugLog("Finished background script (common)");
