console.log("@walty@1@content.js");

var gEmailReg = /([\w-\.]+)@((?:[\w]+\.)+)([a-zA-Z]{2,4})/g;
var gCurrentGDriveNoteId = "";
var gCurrentGDriveFolderId = "";
var gPreviousContent = "";

function setupNotes(email, messageId){
  console.log("@8, start to set up notes:");
  //var email = gmail.get.user_email();

  console.log("@45", email);
  console.log("@15", $(".sgn_input").length);

  if($(".sgn_input").length){
    //console.log("give up the set up");
    //return;
  }


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
    //var gdriveNoteId = $("#sgn_gdrive_note_id").val();
    //var gdriveFolderId = $("#sgn_gdrive_folder_id").val();
    var content = $(this).val();
    //console.log("@55", gdriveFolderId, gdriveNoteId);
    if(gPreviousContent != content){
      sendMessage({action:"post_note", email:email, messageId:messageId, 
            gdriveNoteId:gCurrentGDriveNoteId, gdriveFolderId:gCurrentGDriveFolderId, content:content});
    }

	  return true;
	});

  var logoutPrompt = $("<div class='sgn_prompt_logout'/></div>" )
      .html("Simple Gmail Notes connecting to Google Drive of '<span class='sgn_user'></span>' " +
      "(<a class='sgn_logout sgn_action'>Disconnect</a>)")
      .css({
      "display":"none",
      "color": "gray",
      "margin": "5px"
      });

  var loginPrompt = $("<div class='sgn_prompt_login'/></div>" )
      .html("Please <a class='sgn_login sgn_action'>connect</a> to " +
        "your Google Drive account to start using Simple Gmail Notes" )
      .css({
      "display":"none",
      "color": "gray",
      "margin": "5px"
      });

  var emptyPrompt = $("<div class='sgn_padding'>&nbsp;<div>")
                      .css({"margin":"5px"});
  var errorPrompt = $("<div class='sgn_error'><div>")
                      .html("Error connecting to Google Drive <span class='sgn_error_timestamp'></span>, " +
                          "please try to <a class='sgn_reconnect sgn_action'>connect</a> again. \n" +
                          "If error persists after 5 attempts, you may try to manually " +
                          "<a href='https://accounts.google.com/b/0/IssuedAuthSubTokens'>revoke</a> previous tokens.")
                      .css({"margin":"5px", "color":"red", "display":"none"});
  //var noteIdNode = $("<input type=hidden id='sgn_gdrive_note_id/>");
  //var folderIdNode = $("<input type=hidden id='sgn_gdrive_folder_id/>");

  //injectionNode.prepend(folderIdNode);
  //injectionNode.prepend(noteIdNode);
  //
  $(".sgn_input").remove();
  $(".sgn_prompt_login").remove();
  $(".sgn_prompt_logout").remove();

  injectionNode.prepend(errorPrompt);
  injectionNode.prepend(textAreaNode);
  injectionNode.prepend(loginPrompt);
  injectionNode.prepend(logoutPrompt);
  injectionNode.prepend(emptyPrompt);

  //chrome.runtime.sendMessage({action:"setup_email", email:email},  handleResponse)

  $(".sgn_action").css({
    "cursor":"pointer",
    "text-decoration":"underline"
  }).click(function(){

    var classList =$(this).attr('class').split(/\s+/);

    console.log("@172", classList);
    $.each(classList, function(index, item){
        if(item != 'sgn_action'){
            var action = item.substring(4);   //remove the sgn_ prefix
            sendMessage({action: action, email: email, messageId:messageId});
        }
    });
    
  });

  //load initial message
  console.log("@102");
  sendMessage({action:"initialize", email: email, messageId:messageId});
  console.log("@104");

  //auto-save every 5 seconds, change detection is done by backend
  /*
  setInterval(function(){
    if($("#sgn_input").is(":enabled")){
      chrome.runtime.sendMessage({action:"post_note", email:email}, handleResponse);
    };

  }, 50000);   
  */
}



function sendMessage(object)
{
  console.log("@125, send message", object);
  return;

}

function setupPage(dataurl){
  // Handle the message
  if(top.document == document) {
     var j = document.createElement('script');
     j.src = dataurl+'/jquery-1.10.2.min.js';
     (document.head || document.documentElement).appendChild(j);

     var g = document.createElement('script');
     g.src = dataurl+'/gmail.js';
     (document.head || document.documentElement).appendChild(g);

     var s = document.createElement('script');
     s.src = dataurl+'/page.js';
     (document.head || document.documentElement).appendChild(s);
  }

}



function setupListeners(){
  /*
  chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
      console.log(sender.tab ?
        "from a content script:" + sender.tab.url :
        "from the extension");
      console.log("@14, handle request", request);
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
          console.log("@20, show login");
          showLoginPrompt();
          disableEdit();
          break;
        case "show_error":
          var errorMessage = request.message;
          console.log("Error in response:", errorMessage);
          var date = new Date();
          var timestamp = date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
          //alert(errorMessage);
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
          console.log("@166", request.gdriveFolderId, request.gdriveFolderId);
          gCurrentGDriveFolderId = request.gdriveFolderId;
          gCurrentGDriveNoteId = request.gdriveNoteId;
          break;
      }

    }

  )

    /*
  window.addEventListener('message', function(event) {
      console.log('content_script.js got message:', event);
      // check event.type and event.data
  });
  */

  /*
  document.addEventListener('SGN_background_event', function(e) {
      var detail = e.detail
      console.log("@190", detail);
      //setupNotes(de);
  });
  */

  /*
window.addEventListener('message', function(event) {
    console.log('content_script.js got message:', event.type, event);
    // check event.type and event.data
});
*/
  
  // Event listener for page

  document.addEventListener('SGN_setup_notes', function(e) {
      var email = e.detail.email;
      var messageId = e.detail.messageId;
      console.log("@102", email, messageId);
      
      setupNotes(email, messageId);
  });

}


self.port.on("initPage", function handleMyMessage(dataurl) {
  setupPage(dataurl);
  setupListeners();
});

console.log("@28");
