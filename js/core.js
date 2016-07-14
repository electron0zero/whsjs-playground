/*global $:false, ace:false, htmlField:false, cssField:false, jsField:false, jqconsole:false*/
(function core() {
  "use strict";
  // Globals
   var autosave = false;
   var autosaveAfterSec = 300;   //time in seconds after auotsave happens
   var mytime;
  // End Globals

   // Check if a new appcache is available on page load. If so, ask to load it.
  window.addEventListener("load", function(e) {
    window.applicationCache.addEventListener("updateready", function(e) {
      if (window.applicationCache.status == window.applicationCache.UPDATEREADY) {
        // Browser downloaded a new app cache.
        if (confirm("A new version of this site is available. Load it?")) {
          window.location.reload();
        }
      } else {
        // Manifest didn't changed. Do NOTHING!
      }
    }, false);
  }, false);

  // Create Text Area panes
  // Init ACE Editor and set options;
  (function initAce() {
    var aceTheme;
    //currentely we are not saveing it implimant that part
    if (localStorage.getItem("theme")) {
      aceTheme = localStorage.getItem("theme");
    } else {
      aceTheme = "ace/theme/twilight";

    }

    // JS Editor
    ace.require("ace/ext/language_tools");
    window.jsField = ace.edit("js");
    jsField.setOptions({
      theme: aceTheme,
      displayIndentGuides: true,
      mode: "ace/mode/javascript",
      tabSize: 2,
      useSoftTabs: true,
      showPrintMargin: false,
      enableBasicAutocompletion: true,
      enableSnippets: false,
      highlightGutterLine: true,
      enableLiveAutocompletion: false,
      showInvisibles: true,
      autoScrollEditorIntoView: true,
      useWorker: true,
      fontSize: 16
    });

    // stop warnings about set autoScrolling = Infinity
    // set it to 0 (or comment out) to see the warning in console
    jsField.$blockScrolling = Infinity;

    // Retrieve values from sessionStorage if set
    (function sessionStorageGet() {
      if (sessionStorage.getItem("js")) {
        jsField.setValue(sessionStorage.getItem("js"));
        jsField.clearSelection();
      }
      if (sessionStorage.getItem("use")) {
        use = JSON.parse(sessionStorage.getItem("use"));
      }
    })();

  })();
  // END ACE Editor

  //turn off warnings "WHS is not defined"
  //this code snippet is explained here [https://github.com/ajaxorg/ace/issues/895]
  //and here [https://github.com/ajaxorg/ace/issues/895#issuecomment-232725635]
    jsField.session.on('changeMode', function(e, session){
      if ("ace/mode/javascript" === session.getMode().$id) {
          if (!!session.$worker) {
              session.$worker.send("setOptions", [{
                //if you have to silence more warnings/error just add there warning/error code here
                  "-W117": false
              }]);
            console.log("worker is silenced");
          }
          //console.log("changeMode");
      }
    });


  $("#previewToggle, #iframeClose").on("click", function() {
    console.log("previewToggle");
    $("#previewToggle").toggleClass("btn-active");
    $("html").toggleClass("modal-open");
    preview();  //runs the code when preview is Toggleed
  });

  // Update preview window AND js console on click of "Run" button
  $("#run").on("click", function() {
    console.log("Run");
    preview();
  });

  // Download HTML/CSS/JS
  // Source: http://thiscouldbebetter.wordpress.com/2012/12/18/loading-editing-and-saving-a-text-file-in-html5-using-javascrip/
  $("#download").on("click", function() {
    console.log("download");
    function destroyClickedElement(event) {
      document.body.removeChild(event.target);
    }

    var $download = document.createElement("a");

    // pass false as we don't want the pseudo console.js script
    var textToWrite = buildOutput(false);
    var textFileAsBlob = new Blob([textToWrite], {type: "text/plain"});
    var fileNameToSaveAs = "index.html";

    $download.download = fileNameToSaveAs;

    if (typeof window.URL === "function") {
      // Chrome
      $download.href = window.URL.createObjectURL(textFileAsBlob);
    } else {
      // Firefox
      $download.href = window.URL.createObjectURL(textFileAsBlob);
    }
    $download.onclick = destroyClickedElement;
      $download.style.display = "none";
      document.body.appendChild($download);
    $download.click();
  });

  // Clear editors with "Clear" button
  $("#clear").on("click", function() {
      console.log("clear windows");
    jsField.setValue("");
    sessionStorage.clear();
    (document.getElementById("iframe").contentWindow.document).write("");
    (document.getElementById("iframe").contentWindow.document).close();
  });

  // Save current editor panes to localStorage
  $("#save").on("click", function() {
    save();
  });

  // Toggle autosave mode.
  $("#autosaveToggle").on("click", function() {
    if (autosave === false) {
        autosave = true;
        saveLoop();
    } else if (autosave === true ) {
        autosave = false;
        clearTimeout(mytime);
    }
    $(this).toggleClass("btn-active");
  });

  // Load into editors from localStorage if exists
  $("#load").on("click", function() {
    console.log("Load");
    var store;
    if (localStorage.core) {
      store = JSON.parse(localStorage.core);
      if (store.js == "") {
          alert("local Storage is empty, nothing to load...")
      } else {
          jsField.setValue(store.js);
          jsField.clearSelection();
      }
    } else {
      alert("No previous session found...");
    }
  });

  // Used by preview and download to compile editor panes and "Imports" into valid html
  function buildOutput() {

    var content = {
      js: jsField.getValue()
    };

    // String to hold elements to build HTML output
    // This html is what we show in preview pane
    var html = '';
    html += '<!DOCTYPE html>\n';
    html += '<html lang="en">\n';
    html += '<head>\n';
    html += '<meta charset="UTF-8">\n';

    html += '<style type="text/css">\n';
    //css for preview goes here
    html += '\n</style>\n';

    //whitestormjs included in page
    html += '<script src="whitestorm.js"></script>\n';

    html += '</head>\n';
    html += '<body>\n';
    //HTML body for output goes here
    html += '\n<script>\n';
    //js that user typed in jsedit(javascript editer pane) window comes here from that window
    html += content.js;
    html += '\n</script>\n';
    html += '</body>\n';
    html += '</html>';

    //log out preview output
    //console.log(html);

    return html;
  }

  function preview(delay) {
    console.log("preview is called");
    delay = delay || 0;
    var timer = null;
    if (timer) {
      window.clearTimeout(timer);
    }
    timer = window.setTimeout(function() {
      timer = null;
      // pass true as we want the pseudo console.js script
      //console.time('buildOutput'); // start timer for debugging
      var textToWrite = buildOutput();

      (document.getElementById("iframe").contentWindow.document).write(textToWrite);
      (document.getElementById("iframe").contentWindow.document).close();
      //console.timeEnd('buildOutput'); // end timer for debugging
    }, delay);
  }

  function save(){
      console.log("save");
      var store = {
        js: jsField.getValue()
      };
      localStorage.setItem("core", JSON.stringify(store));
  }

  function saveLoop() {
    if (autosave === true) {
      console.log("autosave save");
      save();
      mytime = setTimeout(saveLoop, autosaveAfterSec*1000);
  }};


  // Apply theme and save to localStorage
  function updateTheme(theme) {
    theme = "ace/theme/" + theme;
    jsField.setTheme(theme);
    // Uncomment below if you want the page/body background to follow the set theme colour.
    // we delay obtaining the css colour by 1s as it takes a moment to propagate
    /*
    setTimeout(function() {
      $("body, section").css("background-color", $("#html").css("background-color"));
    }, 1000);
    */
    localStorage.setItem("theme", theme);
  }

  // Detect a user leaving a page and display a message
  window.onbeforeunload = function (e) {

    // If we haven't been passed the event get the window.event
    e = e || window.event;
    var message = "Your current session may be lost..";
    // // For IE6-8 and Firefox prior to version 4
    if (e) e.returnValue = message;
    // // For Chrome, Safari, IE8+ and Opera 12+
    return message;
  };

})();
