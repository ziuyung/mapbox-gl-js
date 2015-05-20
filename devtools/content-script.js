// inject JS into the page to check for mapboxgl on domready
var script = document.createElement('script');
script.type = "text/javascript";
script.src = chrome.extension.getURL("in-page-script.js");
if (document.body) {
    document.body.appendChild(script);
    script.onload = function() {
        document.body.removeChild(script);
    };
}

window.addEventListener('message', function(event) {
    // Only accept messages from the same frame
    if (event.source !== window) {
        return;
    }

    var message = event.data;

    // Only accept messages that we know are ours
    if (typeof message !== 'object' || message === null ||
        !message.source === 'mapbox-gl') {
        return;
    }

    chrome.runtime.sendMessage(message);
});

chrome.runtime.onMessage.addListener(function(message) {
    if (message.from === 'devtools') {
        window.postMessage(message, '*');
    }
});
