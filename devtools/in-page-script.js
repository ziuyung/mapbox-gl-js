window.addEventListener('message', function(event) {
    // Only accept messages from the same frame
    if (event.source !== window) {
        return;
    }

    var message = event.data;

    // Only accept messages that we know are ours
    if (typeof message !== 'object' || message === null ||
        !message.source === 'devtools') {
        return;
    }

    if (!window.mapboxgl || !window.mapboxgl._map) {
        return;
    }

    if (message.type === 'debug') {
        window.mapboxgl._map.debug = message.value;
    }
});
