(function () {
    console.log('>eTROO: Await HTML5player initialization');
    var timerInterval = setInterval(() => {
        if (window?.html5player) {
            clearInterval(timerInterval);
            console.info('>eTROO: HTML5player found');
            let html5Player = window.html5player;
            html5player.__extractData = function () {
                return this.hlsobj.abrController.fragCurrent._url;
            }
            window.postMessage({ type: 'FROM_PAGE', content: html5Player.__extractData() }, '*');
        }
    }, 500);
})();
