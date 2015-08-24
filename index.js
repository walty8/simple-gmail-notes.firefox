console.log("walty test@1@index.js");
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

function sendUrl(worker) {
  var dataurl = self.data.url("jquery-1.10.2.min.js");
  dataurl = dataurl.substring(0, dataurl.lastIndexOf('/')); 
  worker.port.emit("initPage", dataurl);
}
