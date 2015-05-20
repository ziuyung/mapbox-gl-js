var port = chrome.runtime.connect({
    name: 'panel'
});

port.postMessage({
    name: 'init',
    tabId: chrome.devtools.inspectedWindow.tabId
});

var debug = document.getElementById('debug');

debug.addEventListener('click', function() {
    port.postMessage({
        from: 'devtools',
        type: 'debug',
        value: debug.checked
    });
});
