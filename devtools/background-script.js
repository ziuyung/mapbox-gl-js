/* global chrome */
(function() {
    "use strict";

    var ports = {};

    // [ injected content script ]
    //       ^            |
    //       |    window.postMessage
    // window.postMessage |
    //       |            v
    // [     content script      ]
    //       ^            |
    //       |  runtime.sendMessage
    //  tabs.sendMessage  |
    //       |            v
    // [    background script    ]
    //       ^            |
    //       |     port.postMessage
    //  port.postMessage  |
    //       |            v
    // [     devtools script     ]

    // Receive connections from devtools.js and keep a map of content tab ->
    // devTools instance.
    chrome.runtime.onConnect.addListener(function(port) {
        var tabId;

        port.onMessage.addListener(function(message) {
            if (message.name == "init") {
                tabId = message.tabId;
                ports[message.tabId] = port;
            } else if (message.from === 'devtools') {
                chrome.tabs.sendMessage(tabId, message);
            }
        });

        port.onDisconnect.addListener(function(port) {
            port.onMessage.removeListener(extensionListener);
            Object.keys(ports).forEach(function(tabId) {
                if (ports[tabId] == port) {
                    delete ports[tabId]
                }
            })
        });
    });

    // Receive messages from content script and relay to devTools page for the
    // current tab
    chrome.runtime.onMessage.addListener(function(request, sender) {
        if (!sender.tab) { return; }
        var port = ports[sender.tab.id];
        if (port) { port.postMessage(request); }
    });
}());
