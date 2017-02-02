# WARNING - THIS ADDON WILL NOT WORK IN FIREFOX 51 AND AFTERWARDS #

- Please see https://github.com/walty8/simple-gmail-notes.firefox/issues/1 for the details.

----

### This is a _Firefox Addon_ that adds notes to Gmail conversations. 

- 100% free and open source! 

- Notes marked on one computer could be retrieved from another computer.

- All notes are stored in your own Google Drive account, no 3rd party server is used.
 
- All communications and authentications are directly between your browser and Google Drive.

- The extension could only access those Google Drive files that are created by the it. 

- An offline Google Drive token would be collected to avoid logging in every time the Gmail is opened. But you could disconnect (revoke the token) any time.

- No tracking code is added.

- See the extension website for the source code repository.

### Dependencies (included in source code)

- [jQuery](https://jquery.com/)

- [gmail.js](https://github.com/KartikTalwar/gmail.js/tree/master)

- [ikooni icons](https://www.iconfinder.com/iconsets/ikooni-outline-free-basic)

- [oauthorizer](https://github.com/mozilla/oauthorizer)

### Executions

- This project uses [jpm](https://developer.mozilla.org/en-US/Add-ons/SDK/Tutorials/Getting_Started_%28jpm%29) for development.

- Use a new profile every time: `jpm run`

- Use the same profile to run: `jpm run --no-copy --profile <profile_folder>`

- The profile folder could be copied from your existing firefox, or from the execution of `jpm run`.

**How to Reload**

`jpm post --post-url http://localhost:8888/`


**How to Package**

`jpm xpi`

### Firefox Addon Store

- <https://addons.mozilla.org/en-US/firefox/addon/simple-gmail-notes/>

----
_Chrome Extension_

- The chrome extension could be found here:
 - <https://github.com/walty8/simple-gmail-notes.chrome>
- Since the notes are stored in Google Drive, it means the notes written in Chrome Extension could be retrieved from Firefox Addon.

