(function () {
    console.info('Await HTML5player initialization (injected)');
    let timerInterval = setInterval(() => {
        if (window?.html5player) {
            let html5Player = window.html5player;
            if ((typeof html5player?.__extractData).toString() == 'undefined') {
                console.info('HTML5player found and injected (injected)');
                html5player.__extractData = function () {
                    return this.hlsobj.abrController?.fragCurrent?._url;
                }
            }
            const content = html5Player.__extractData();
            if (content) {
                console.info('URL available (injected)');
                clearInterval(timerInterval);
                window.postMessage({ type: 'FROM_PAGE', content: content }, '*');
            }
        }
    }, 500);
})();
