mapboxgl.accessToken = getAccessToken();

function getAccessToken() {
    return 'pk.eyJ1Ijoiaml1eXVvbmciLCJhIjoiY2lxNWY3NDF3MDA1dGZoa2szenpwODhyZyJ9.lnu-2BeTQQIHKkFATxMPMQ';
    var accessToken = (
        process.env.MapboxAccessToken ||
        process.env.MAPBOX_ACCESS_TOKEN ||
        getURLParameter('access_token') ||
        localStorage.getItem('accessToken')
    );
    localStorage.setItem('accessToken', accessToken);
    return accessToken;
}

function getURLParameter(name) {
    var regexp = new RegExp('[?&]' + name + '=([^&#]*)', 'i');
    var output = regexp.exec(window.location.href);
    return output && output[1];
}
