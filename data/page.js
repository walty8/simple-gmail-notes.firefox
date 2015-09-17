/*
 * Simple Gmail Notes 
 * https://github.com/walty8
 * Copyright (C) 2015 Walty Yeung <walty8@gmail.com>
 * License: GPLv3
 */

var gmail;

function setupNotes(){
    setTimeout(function(){
      var currentPageMessageId = gmail.get.email_id();
      if(!currentPageMessageId)  //do nothing
          return;

      console.log("Set up notes now");
      document.dispatchEvent(new CustomEvent('SGN_setup_notes', {
         detail: {email: gmail.get.user_email(), messageId:currentPageMessageId}
      }
      ));
    }, 0);
}

var main = function(){
  gmail = new Gmail();
  gmail.observe.on('open_email', function(obj){
    console.log("simple-gmail-notes: open email event", obj);
    setupNotes();
  });

  gmail.observe.on('load', function(obj){
    setupNotes();
    console.log("simple-gmail-notes: load event");
  });

  gmail.observe.on('view_thread', function(obj){
    console.log("simple-gmail-notes: view thread event");

  });
}

function refresh(f) {
  if( (/in/.test(document.readyState)) || (undefined === window.Gmail) ) {
    setTimeout('refresh(' + f + ')', 10);
  } else {
    f();
  }
}

refresh(main);
