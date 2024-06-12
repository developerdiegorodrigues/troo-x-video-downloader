console.log(">Troo-x-video-downloader: Started");
console.log(">Troo-x-video-downloader: Listener registration");

window.addEventListener('load', function () {

    console.log(">Troo-x-video-downloader: Checking domain");
    const currentDomain = window.location.hostname;

    if (currentDomain != "www.tests.com") {
        console.log(">Troo-x-video-downloader: Not the expected domain");
        return;
    }

    console.log(">Troo-x-video-downloader: Expected domain");
});