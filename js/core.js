(function core() {
  "use strict";
  // Globals
  var autosave = false;
  var autosaveAfterSec = 300;   //time in seconds after auotsave happens
  var mytime;

  //  // Check if a new appcache is available on page load. If so, ask to load it.
  // window.addEventListener("load", function(e) {
  //   window.applicationCache.addEventListener("updateready", function(e) {
  //     if (window.applicationCache.status == window.applicationCache.UPDATEREADY) {
  //       // Browser downloaded a new app cache.
  //       if (confirm("A new version of this site is available. Load it?")) {
  //         window.location.reload();
  //       }
  //     } else {
  //       // Manifest didn't changed. Do NOTHING!
  //     }
  //   }, false);
  // }, false);

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

  //turn off warnings and errors
  //this code snippet is explained here [https://github.com/ajaxorg/ace/issues/895]
  //and here [https://github.com/ajaxorg/ace/issues/895#issuecomment-232725635]
    jsField.session.on('changeMode', function(e, session){
      if ("ace/mode/javascript" === session.getMode().$id) {
          if (!!session.$worker) {
              session.$worker.send("setOptions", [{
                //if you have to silence more warnings/error just add there warning/error code here
                  "-W117": false, // <sometthing> is not defined
                  "-W104": false // Warning about es6
              }]);
            console.log("worker is silenced");
          }
          //console.log("changeMode");
      }
    });


  $("#previewToggle, #iframeClose").on("click", function() {
    console.log("previewToggle");
    //this removes width style (which is added when we resize pans) of pans when we preview it
    $("#preview").css("width", "");
    $("#editor").css("width", "");

    $("#previewToggle").toggleClass("btn-active");
    $("html").toggleClass("modal-open");
    preview();  //runs the code when preview is Toggleed
  });

  // Update preview window AND js console on click of "Run" button
  $("#run").on("click", function() {
    console.log("Run");
    preview();
  });

  var clipboard = new Clipboard('#clipboard', {
    text: function(trigger) {
      var encoded = encodeURI(jsField.getValue());
      var url = location.href.split("?")[0] + "?code=" + encoded;
      return url;
    }
  });

  clipboard.on('success', function() {
    alert("URL copied to clipboard!");
  })

  $("#facebook").on("click", function() {
    var encoded = encodeURI(jsField.getValue());
    var url = location.href.split("?")[0] + "?code=" + encoded;
    var win = window.open("https://www.facebook.com/sharer/sharer.php?u=" + url, '_blank');
    win.focus();
  });

  function get_short_url(long_url, func) {
    $.getJSON(
      "https://api-ssl.bitly.com/v3/shorten?", 
      { 
          "format": "json",
          "access_token": "b26f3b0efc299fba1d3fccb18cfb44cd42b47f26",
          "longURL": encodeURIComponent(long_url).replace(/'/g,"%27").replace(/"/g,"%22")
      },
      function(response)
      {
          func(response.data.url);
      }
    );
  }

  $("#twitter").on("click", function() {
    var encoded = encodeURI(jsField.getValue());
    var url = location.href.split("?")[0] + "?code=" + encoded;
    get_short_url(url, function(short_url) {
      var text = encodeURI("Check out my example ");
      var win = window.open("https://twitter.com/intent/tweet?text=" + text + "&url=" + encodeURI(short_url) + "&hashtags=whitestormjs,threejs,webgl", '_blank');
      win.focus();
    });
  });

  // Download HTML/CSS/JS
  // Source: http://thiscouldbebetter.wordpress.com/2012/12/18/loading-editing-and-saving-a-text-file-in-html5-using-javascrip/
  $("#download").on("click", function() {
    console.log("download");
    function destroyClickedElement(event) {
      document.body.removeChild(event.target);
    }

    var $download = document.createElement("a");

    var textToWrite = buildOutput();
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

  let moveEnabled = false;

  $("#divider").on('mousedown', () => {moveEnabled = true});
  $([document, document.getElementById("iframe").contentWindow.document]).on('mouseup', () => {moveEnabled = false});

  function resize_init() {
    $([window, document.getElementById("iframe").contentWindow]).on('mousemove', (e) => {
      const divWidth = 5;

      if (moveEnabled) {
        const percent = (e.screenX - 16) / (window.innerWidth - 32) * 100;
        const percent2 = 100 - (e.screenX - (16 - divWidth - 1)) / (window.innerWidth - 32) * 100;

        if (percent > 20 && percent2 > 20) {
          $("#editor").width(percent + "%");
          $(".preview").width(percent2 - 10 + "%");
        }
      }
    });
  }

  resize_init();

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

      // Fix for const and let (redefine iframe).
      document.getElementById("iframe").remove();
      var elem = document.createElement('iframe');
      elem.innerHTML = '<iframe id="iframe" name="preview" sandbox="allow-scripts allow-modals allow-pointer-lock allow-same-origin allow-popups allow-forms" allowtransparency="true"></iframe>';
      elem.id ="iframe";
      document.querySelector(".preview").appendChild(elem);

      (document.getElementById("iframe").contentWindow.document).open();
      (document.getElementById("iframe").contentWindow.document).clear();
      (document.getElementById("iframe").contentWindow.document).write(textToWrite);
      (document.getElementById("iframe").contentWindow.document).close();
      resize_init();
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

    //Load example from URL Starts
    function getExampleURL(){
      //test it with : /playground/?example=points&mode=demo
      var splitURL = location.href.split("?");
      //console.log(splitURL);
      var baseURL = splitURL[0];
      //console.log(baseURL);
      var exampleURL = splitURL[1];
      //console.log(exampleURL);
      var urlObj = exampleURL.split("&");
      //console.log(urlObj);
      var params = [];
      for (var i = 0; i < urlObj.length; i++) {
          params[i] = urlObj[i].split("=");
      }
      //console.log(params[0]);
      //console.log(params[1]);
      if (params[0][0] !== "code") {
        var url = baseURL + "examples/" + params[1][1] + "/" + params[0][1] + ".js";
        console.log(url);
        return url;
      } else {
        return ["code", decodeURI(splitURL[1].substring(splitURL[1].indexOf("code=") + 5, splitURL[1].length))];
      }
    };

    function LoadExample(requestURL){
      if (typeof requestURL == "string") {
        // here we will get file via ajax and load into editor
        var response = $.ajax({
                type: "GET",
                url: requestURL,
                async: false}).responseText;
        //console.log(response);
      } else if (requestURL[0] === "code") {
        var response = requestURL[1];
      }

      addToEditor(response);
    }
    //given a response (examples code) it loads that into editor
    function addToEditor(response){
      //set text and remove selection off all all text
      jsField.setValue(response);
      jsField.clearSelection();
      //runs the code that we inject into editorfcl
      preview();
    }

    window.addEventListener("load",LoadExample(getExampleURL()), false);
    //Load example from URL end

})();
