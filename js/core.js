/**
 * core js file for playground
 */

(function core() {
    "use strict";
    var autoSave = false;
    // time in seconds after auto Save happens
    var autoSaveAfterSec = 30;
    // timer to keep track of autoSave time
    var autoSaveTimer;

    // check support for localStorage and SessionStorage
    try {
        localStorage.setItem("testLS", "test for localStorage");
        localStorage.removeItem("testLS");
        sessionStorage.setItem("testSS", "test for sessionStorage")
        sessionStorage.removeItem("testSS")
        // console.log("Storage support is present");
    } catch(e) {
        alert("Your browser doesn't support Storage, please use browser that supports Storage");
    }

    // create text area panes
    // initialize ACE Editor and set options
    (function initAce() {
        // JS Editor, code editor pane
        ace.require("ace/ext/language_tools");
        window.jsField = ace.edit("js");
        // set options for code editor
        jsField.setOptions({
            theme: "ace/theme/twilight",
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
    // END ACE editor Initialization

    // turn off warnings and errors in editor
    // this code snippet is explained here [https://github.com/ajaxorg/ace/issues/895]
    // and here [https://github.com/ajaxorg/ace/issues/895#issuecomment-232725635]
    jsField.session.on('changeMode', function(e, session){
        if ("ace/mode/javascript" === session.getMode().$id) {
            if (!!session.$worker) {
                session.$worker.send("setOptions", [{
                //if you have to silence more warnings/error just add there warning/error code here
                    "-W117": false, // <something> is not defined
                    "-W104": false // Warning about es6
                }]);
            //console.log("worker is silenced");
            }
        //console.log("changeMode");
        }
    });

    // Start cache
    // cache whitestormjs in sessionStorage
    $(document).ready(function() {
        var whs_version = "";
        if (localStorage.getItem('whs_version')) {
            whs_version = localStorage.getItem('whs_version');
        } else {
        // if user doesn't have a version selected use dev as default version
        whs_version = "dev";
        }
        // set whs_version to selected in dropdown
        $("#version_dropdown").val(whs_version)
        // fetch and set the selected version
        setVersion(whs_version);
    });
    // END cache

    // button click handlers
    $("#fullscreenToggle").on("click", function() {
        previewFull();
    });

    $(".close-fullscreen").on("click", function() {
        preview();
    });

    // Update preview window on click of "Run" button
    $("#run").on("click", function() {
        //console.log("Run");
        preview();
    });

    // initialize clipboard and get URL of code for sharing
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
        "https://api-ssl.bitly.com/v3/shorten?format=json&access_token=b26f3b0efc299fba1d3fccb18cfb44cd42b47f26&longURL=" + encodeURIComponent(long_url).replace(/'/g,"%27").replace(/"/g,"%22"),
        {},
        function(response) {
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

    // download running example as a self contained html file
    // Source: http://thiscouldbebetter.wordpress.com/2012/12/18/loading-editing-and-saving-a-text-file-in-html5-using-javascrip/
    $("#download").on("click", function() {
        //console.log("download");
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

    // Clear editor and preview with "Clear" button
    $("#clear").on("click", function() {
        //console.log("clear windows");
        //clear js code pan
        jsField.setValue("");
        // sessionStorage.clear();
        // clear preview pan
        (document.getElementById("iframe").contentWindow.document).write("");
        (document.getElementById("iframe").contentWindow.document).close();
    });

    // Save current editor pane to localStorage
    $("#save").on("click", function() {
        save();
    });

    // Toggle autoSave mode.
    $("#autoSaveToggle").on("click", function() {
        if (autoSave === false) {
            autoSave = true;
            saveLoop();
        } else if (autoSave === true ) {
            autoSave = false;
            clearTimeout(autoSaveTimer);
        }
        $(this).toggleClass("btn-active");
    });

    // load saved code into editor from localStorage if exists
    $("#load").on("click", function() {
        //console.log("Load");
        var store;
        store = JSON.parse(localStorage.getItem("core"));
        if (store == "") {
            alert("local Storage is empty, nothing to load...")
        } else {
            jsField.setValue(store);
            jsField.clearSelection();
        }
    });

    // editor pane resize feature
    let moveEnabled = false;
    $("#divider").on('mousedown', () => {moveEnabled = true});
    $([document, document.getElementById("iframe").contentWindow.document]).on('mouseup', () => {moveEnabled = false});

    function resize_init() {
        var kit = document.getElementById("iframe") ? [window, document.getElementById("iframe").contentWindow] : window;
        $(kit).on('mousemove', (e) => {
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

    // Helper functions

    // helper function that takes content of editor pane, cached whs code and builds a valid html webpage
    // which we use to render preview, fullscreen previews and download function
    function buildOutput() {
        // content of editor pane
        var content = jsField.getValue()
        // cached whs code
        var whs = sessionStorage.getItem('whs', whs);

        // String to hold elements to build HTML output
        // This html is what we show in preview pane
        var html = '';
        html += '<!DOCTYPE html>\n';
        html += '<html lang="en">\n';
        html += '<head>\n';
        html += '<meta charset="UTF-8">\n';

        html += '<style type="text/css">\n';
        // css for preview goes here
        html +=  'html, body {\n';
        html += 'position: relative;\n';
        html += 'height: 100%;\n';
        html += '}\n';

        html += 'body {\n';
        html += 'margin: 0;\n';
        html += 'padding: 0;\n';
        html += 'overflow: hidden;\n';
        html += '}\n';
        html += '\n</style>\n';

        html += '\n<script>\n';
        // include whitestormjs in page from sessionStorage in a script tag.
        html += whs;
        html += '\n</script>\n';

        html += '</head>\n';
        html += '<body>\n';
        // HTML body for output goes here
        html += '\n<script>\n';
        // js that user typed in editor pane goes here in a script tag
        html += content;
        html += '\n</script>\n';
        html += '</body>\n';
        html += '</html>';

        //console.log(html);
        return html;
    }

    // helper function for preview
    function preview(delay) {
        //console.log("preview is called");
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
        if(document.getElementById("iframe-fullscreen")) document.getElementById("iframe-fullscreen").remove();
        if(document.getElementById("iframe")) document.getElementById("iframe").remove();
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

    // helper function for fullscreen preview
    function previewFull(delay) {
        //console.log("preview fullscreen is called");
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
        if(document.getElementById("iframe-fullscreen")) document.getElementById("iframe-fullscreen").remove();
        if(document.getElementById("iframe")) document.getElementById("iframe").remove();
        var elem = document.createElement('iframe');
        elem.innerHTML = '<iframe id="iframe-fullscreen" name="preview" sandbox="allow-scripts allow-modals allow-pointer-lock allow-same-origin allow-popups allow-forms" allowtransparency="true"></iframe>';
        elem.id ="iframe-fullscreen";
        document.querySelector("#fullscreen .modal-content").appendChild(elem);

        (document.getElementById("iframe-fullscreen").contentWindow.document).open();
        (document.getElementById("iframe-fullscreen").contentWindow.document).clear();
        (document.getElementById("iframe-fullscreen").contentWindow.document).write(textToWrite);
        (document.getElementById("iframe-fullscreen").contentWindow.document).close();
        resize_init();
        //console.timeEnd('buildOutput'); // end timer for debugging
        }, delay);
    }

    // helper function to save content of editor in localStorage
    function save(){
        //console.log("save");
        var js = jsField.getValue()
        localStorage.setItem("core", JSON.stringify(js));
    }

    // helper function for autoSave feature, it runs autoSave loop
    function saveLoop() {
        if (autoSave === true) {
        //console.log("autoSave save");
        save();
        autoSaveTimer = setTimeout(saveLoop, autoSaveAfterSec*1000);
    }};

    // helper function that builds URL of content that we will load into text editor
    function getExampleURL(){
        //sample URL = /playground/?example=points&mode=demo
        var splitURL = location.href.split("?");
        var isURLHaveParams = false;

        var regex = /[?&]([^=#]+)=([^&#]*)/g,
            url = window.location.href,
            params = {},
            match;
        while(match = regex.exec(url)) {
            params[match[1]] = match[2];
            isURLHaveParams = true;
        }

        if(!isURLHaveParams){
            // we don't have params, load hello world example
            // take account for /# and use only origin (protocol + hostname + port)
            // return window.location.origin + "/examples/demo/helloworld.js";
            // using return as per above statement caused all content in single line(lf line ending)
            // using raw github file fixes it
            return "https://raw.githubusercontent.com/WhitestormJS/playground/gh-pages/examples/demo/helloworld.js"
        }

        if(!params.code && params.example && params.dir) {
            var url = splitURL[0] + "examples/" + params.dir + "/" + params.example + ".js";
            return url;
        } else if (params.code) {
            return ["code", decodeURI(splitURL[1].substring(splitURL[1].indexOf("code=") + 5, splitURL[1].length))];
        } else {
            return false;
        }
    };

    function loadExample(requestURL){
        if (typeof requestURL == "string") {
            // here we will get file via ajax and load into editor
            var response;
            var xhrobj = $.ajax({
                type: "GET",
                url: requestURL,
                async: false });
            // console.log(xhrobj.status);
            // console.log(xhrobj.responseText);
            if(xhrobj.status >= 200 && xhrobj.status < 300 || xhrobj.status === 304) {
                response = xhrobj.responseText
                //console.log("xhr sucess");
            }
            else {
                response = "";
                alert(" invalid URL");
            }
        } else if (requestURL[0] === "code") {
            var response = requestURL[1];
        }
        // load response into editor window
        addToEditor(response);
    }

    // helper function that given a response(text) it loads and runs that into editor
    function addToEditor(response){
        //set text and remove selection off all all text
        jsField.setValue(response);
        jsField.clearSelection();
        // run the code that we injected into editor
        preview(1000);
    }

    // version dropdown
    // on dropdown changed (when user)
    $("#version_dropdown").change(function(){
        var new_whs_version = $("#version_dropdown option:selected").val()
        // fetch and set the selected version
        setVersion(new_whs_version)
    });

    // helper function for fetching whitestormjs lib file via Ajax
    // WHSurl is the url of lib file which we are fetching
    function getWHS(WHSurl) {
        var whs
        var xhrobj = $.ajax({
            type: "GET",
            url: WHSurl,
            async: false });
        // console.log(xhrobj.status);
        // console.log(xhrobj.responseText);
        if(xhrobj.status >= 200 && xhrobj.status < 300 || xhrobj.status === 304) {
            whs = xhrobj.responseText
            //console.log("getWHS sucess");
            return whs;
        } else { return false; }
    }

    // helper function to set selected version number in localStorage.
    // fetch and cache the selected version in sessionStorage
    function setVersion(Version){
        var whs_url = "";
        // manage lib version by setting version number in localStorage
        localStorage.removeItem('whs_version');
        localStorage.setItem('whs_version', Version);

        // generate lib file url
        if (Version == "master") {
            whs_url = "https://raw.githubusercontent.com/WhitestormJS/whitestorm.js/master/build/whitestorm.js";
            // console.log(whs_url);
        } else if (Version == "dev") {
            whs_url = "https://raw.githubusercontent.com/WhitestormJS/whitestorm.js/dev/build/whitestorm.js";
            // console.log(whs_url);
        } else {
            whs_url = "js/whs/whitestorm." + Version + ".js";
            // console.log(whs_url);
        }
        // fetch and set lib in sessionStorage
        var whs = getWHS(whs_url);
        if(whs){
            sessionStorage.setItem('whs', whs);
        } else {
            alert("can't load core framework, please refresh this page");
        }
    }

    // js for modals

    // animatedModal js for share modal
    $("#generate").animatedModal({
        modalTarget: "share",
        color: "#ffffff"
    });

    // animatedModal js for fullscreen modal
    $("#fullscreenToggle").animatedModal({
        modalTarget: "fullscreen",
        color: "#ffffff"
    });

    // Instance the tour
    var tour = new Tour({
        storage: false,
        backdrop: true,
        steps: [
        {
            element: "#editor",
            title: "Editor",
            content: "Write code, debug errors, learn"
        },
        {
            element: "#preview",
            title: "Preview",
            content: "See results of your code",
            placement: "left"
        },
        {
            element: "#clear",
            title: "Clear all",
            content: "Will reset all your code"
        },
        {
            element: "#fullscreenToggle",
            title: "Fullscreen mode",
            content: "Toggles fullscreen mode for previewing in large window"
        },
        {
            element: "#download",
            title: "Download file",
            content: "Downloads file generated from your script. This file will contain html code and whitestormjs included."
        },
        {
            element: "#generate",
            title: "Share code",
            content: "You can share what you did in social networks or just copy link to it to clipboard."
        },
        {
            element: "#run",
            title: "Run code",
            content: "Executes code in right(preview) window and shows a result."
        },
        {
            element: "#version_dropdown",
            title: "Version selector",
            content: "You can choose framework version to run your code",
            placement: "left"
        },
        {
            element: "#load",
            title: "Load from localStorage",
            content: "You can also load last code you've submitted to localStorage. To make it - press \"save\"",
            placement: "left"
        },
        {
            element: "#save",
            title: "Save file",
            content: "Submits code to localStorage.",
            placement: "left"
        },
        {
            element: "#autoSaveToggle",
            title: "Auto Save Button",
            content: "You can enable autoSave, if enabled this will save your code to localStorage after every 30 seconds",
            placement: "left"
        },
    ]});
    // Initialize the tour
    tour.init();
    $('#tour').on('click', function () {
        // Start the tour
        tour.start();
    })

    // detect if a user leaving page and display a message
    window.onbeforeunload = function (e) {
        // If we haven't been passed the event get the window.event
        e = e || window.event;
        var message = "Your current session may be lost..";
        // For IE6-8 and Firefox prior to version 4
        if (e) e.returnValue = message;
        // For Chrome, Safari, IE8+ and Opera 12+
        return message;
    };

    // load example into js editor when window load event occurs
    window.addEventListener("load", loadExample(getExampleURL()), false);

})();
