/**
 * @author Diego Rodrigues <@devdiegorodrigues>
 * @since 1.0.0
 * 
 */

'use strict';
var eTROO = new Object({
    started: false,
    targetDomain: 'www.xvideos.com',
    htmlData: 'view/content.html',
    cssData: 'view/style.css',
    timerElements: null,
    elementWindow: null,
    elementSpanLoading: null,
    elementCheckBoxHigh: null,
    elementCheckBoxHighLabel: null,
    elementCheckBoxAuto: null,
    elementCheckBoxAutoLabel: null,
    elementButtonExpand: null,
    elementButtonDownload: null,
    elementTextarea: null,
    targetUrl: null,
    filesBaseName: null,
    videoListQuantity: 0,
    videoTotalData: null,
    memoryError: null,
    keyAutomaticDownload: 'eTROO_AutomaticDownload',
    automaticDownload: false,
    keyHighQuality: 'eTROO_FullQuality',
    highQuality: false,
    keyFullView: 'eTROO_FullView',
    fullView: true,
    keyHostQuality: 'forcequality',
    allMessages: '',

    start: function () {
        if (this.started) return;
        this.started = true;

        this.alert(['Started'], 'info');
        if (!this.checkDomain()) return this.destroy();
        if (!this.loadInterface()) return this.destroy();
        if (!this.inject()) return this.destroy();
        this.checkElements();
        this.receive();
    },
    alert: function (messages, type) {
        if (Array.isArray(messages)) {
            const time = new Date();
            const hour = `${time.getHours()}:${time.getMinutes()}:${time.getSeconds()}`;
            this.allMessages = `${this.allMessages} ${hour} - ${messages.join(' ')}\n`;
            if (this.elementTextarea) {
                this.elementTextarea.value = this.allMessages;
                this.elementTextarea.scrollTop = this.elementTextarea.scrollHeight;
            }
            switch (type) {
                case 'info':
                    console.info(...messages);
                    break;
                case 'warn':
                    console.warn(...messages);
                    break;
                case 'error':
                    throw new Error(...messages);
                default:
                    console.log(...messages);

            }
        }
    },
    checkDomain: function () {
        this.alert(['Checking domain'], 'info');
        if (this.targetDomain != window.location.hostname) {
            this.alert(['Not expected domain'], 'info');
            return false;
        }
        return true;
    },
    loadInterface: async function () {
        this.alert(['Loading interface'], 'info');
        await fetch(chrome.runtime.getURL(this.htmlData))
            .then(response => response.text())
            .then(data => {
                const container = document.createElement('div');
                const style = document.createElement('link');
                container.innerHTML = data;
                style.href = chrome.runtime.getURL(this.cssData);
                style.rel = 'stylesheet';
                style.type = 'text/css';
                document.body.appendChild(container);
                document.head.appendChild(style);
            })
            .catch(error => {
                this.alert(['Error fetching file content', error], 'error');
                return false;
            });
        return true;
    },
    inject: function () {
        this.alert(['Injecting dependencies'], 'info');
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('pageScript.js');
        try {
            document.head.appendChild(script);
        } catch (error) {
            this.alert(['Error fetching file content', error], 'error');
            return false;
        }
        return true;
    },
    checkElements: function () {
        this.timerElements = setInterval(() => {
            this.alert(['Await elements initialization'], 'info');
            this.elementWindow = document.getElementById('extension-content');
            this.elementSpanLoading = document.getElementById('ext-el-loading');
            this.elementCheckBoxAuto = document.getElementById('ext-el-auto');
            this.elementCheckBoxAutoLabel = document.getElementById('ext-el-auto-label');
            this.elementCheckBoxHigh = document.getElementById('ext-el-high');
            this.elementCheckBoxHighLabel = document.getElementById('ext-el-high-label');
            this.elementButtonExpand = document.getElementById('ext-el-expand');
            this.elementButtonDownload = document.getElementById('ext-el-download');
            this.elementTextarea = document.getElementById('ext-el-textarea');
            if (
                this.elementWindow &&
                this.elementSpanLoading &&
                this.elementCheckBoxAuto &&
                this.elementCheckBoxAutoLabel &&
                this.elementCheckBoxHigh &&
                this.elementCheckBoxHighLabel &&
                this.elementButtonExpand &&
                this.elementButtonDownload &&
                this.elementTextarea
            ) {
                clearInterval(this.timerElements);
                this.alert(['Elements found'], 'info');
                this.loadConfigurations();
                this.registerElementsListener();
                this.elementCheckBoxAuto.classList.remove('disabled');
                this.elementCheckBoxAutoLabel.classList.remove('disabled');
                this.elementCheckBoxHigh.classList.remove('disabled');
                this.elementCheckBoxHighLabel.classList.remove('disabled');
                this.elementButtonExpand.classList.remove('disabled');
            }
        }, 250);
    },
    loadConfigurations: function () {
        this.alert(['Loading configurations'], 'info');
        const cAutoDownload = localStorage.getItem(this.keyAutomaticDownload);
        if (cAutoDownload && cAutoDownload.toString() == 'true') {
            this.automaticDownload = true;
            this.elementCheckBoxAuto.checked = true;
        }
        const cFullQuality = localStorage.getItem(this.keyHighQuality);
        if (cFullQuality && cFullQuality.toString() == 'true') {
            this.highQuality = true;
            this.elementCheckBoxHigh.checked = true;
            this.setHighQualityFlag();
        }
        const cFullView = localStorage.getItem(this.keyFullView);
        if (cFullView && cFullView.toString() == 'false') {
            this.fullView = false;
            this.elementWindow.classList.add('extension-hide');
        }
    },
    registerElementsListener: function () {
        this.elementCheckBoxAuto.addEventListener('click', (event) => {
            this.checkBoxAutoProcess(event);
        });
        this.elementCheckBoxHigh.addEventListener('click', (event) => {
            this.checkBoxHighProcess(event);
        });
        this.elementButtonExpand.addEventListener('click', () => {
            this.buttonExpandProcess();
        });
        this.elementButtonDownload.addEventListener('click', () => {
            this.startDownloadVideo();
        });
    },
    receive: function () {
        window.addEventListener('message', (event) => {
            if (event.source == window && event.data.type && event.data.type === 'FROM_PAGE') {
                const receivedData = event.data.content;
                if (receivedData.length < 10) {
                    this.alert(['Bad target URL'], 'error');
                    return false;
                }
                eTROO.targetUrl = receivedData;
                this.alert(['Received data', receivedData], 'info');
                eTROO.generateVideoIndex();
            }
        });
    },
    generateVideoIndex: async function () {
        this.alert(['Generating video index...'], 'info');
        this.elementSpanLoading.classList.remove('invisible');
        this.targetUrl = this.targetUrl.slice(0, -4);
        this.filesBaseName = this.targetUrl.split('/').pop();
        this.videoListQuantity = 0;
        while (true) {
            const url = `${this.targetUrl}${this.videoListQuantity}.ts`;
            try {
                const response = await fetch(url, { method: 'HEAD' });
                if (response.ok) {
                    this.videoListQuantity++;
                } else {
                    break;
                }
            } catch (error) {
                this.elementSpanLoading.classList.add('invisible');
                this.alert(['URL checking error', url, error], 'error');
                break;
            }
        }
        this.elementSpanLoading.classList.add('invisible');
        this.alert(['Generated video list'], 'info');
        this.elementButtonDownload.classList.remove('disabled');
        if (this.automaticDownload) {
            this.startDownloadVideo();
        }
    },
    startDownloadVideo: async function () {
        this.alert(['Starting download video'], 'info');
        if (this.videoListQuantity == 0) {
            this.alert(['The list is already empty'], 'info');
            return false;
        }
        this.videoTotalData = [];
        this.memoryError = false;
        this.elementSpanLoading.classList.remove('invisible');
        for (let index = 0; index < this.videoListQuantity; index++) {
            const currentFile = `${this.targetUrl}${index}.ts`;
            const toShowFileName = `${this.filesBaseName}${index}.ts`;
            try {
                await this.requestFile(currentFile, index, 'video');
                this.alert(['Successfully added', toShowFileName, 'to downloaded list'], 'info');
            } catch (error) {
                this.videoTotalData = [];
                this.elementSpanLoading.classList.add('invisible');
                this.alert(['Download failed'], 'info');
                return;
            }
        }
        this.elementSpanLoading.classList.add('invisible');
    },
    startDownloadPicture: async function () {
        this.alert(['Starting download picture'], 'info');
        const element = document.querySelector('.video-pic img');
        if (!element) {
            this.alert(['Picture not found'], 'warn');
            return;
        }
        const elementPath = element.src;
        if (!elementPath) {
            this.alert(['Picture source not found'], 'warn');
            return;
        }
        this.requestFile(elementPath, null, 'image');
    },
    requestFile: async function (url, index, type) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.responseType = 'arraybuffer';
            xhr.onload = () => {
                if (xhr.status === 200) {
                    resolve(this.dowloadQueue(xhr.response, index, type));
                } else {
                    reject(this.alert(['Failed to download file', url], 'error'));
                }
            };
            xhr.onerror = () => {
                reject(this.alert(['Network error while downloading file', url], 'error'));
            };
            xhr.send();
        });
    },
    dowloadQueue: function (data, index, type) {
        switch (type) {
            case 'video': {
                try {
                    this.videoTotalData.push(data);
                } catch (error) {
                    this.videoTotalData = [];
                    this.memoryError = true;
                    this.alert(['Error while accessing memory', error], 'error');
                }
                if ((this.videoListQuantity - 1) == index && !this.memoryError) {
                    this.saveVideo();
                }
                break;
            }
            case 'image': {
                this.savePicture(data);
                break;
            }
        }
    },
    saveVideo: function () {
        const blob = new Blob(this.videoTotalData, { type: 'video/mpeg' });
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = this.filesBaseName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        this.videoTotalData = [];
        this.alert(['File downloaded:', this.filesBaseName], 'info');
        this.startDownloadPicture();
    },
    savePicture: function (data) {
        const blob = new Blob([data], { type: 'image/jpeg' });
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = this.filesBaseName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        this.alert(['Picture downloaded:', this.filesBaseName], 'info');
    },
    checkBoxAutoProcess: function (data) {
        this.alert(['Change automatic download flag'], 'info');
        localStorage.setItem(this.keyAutomaticDownload, data.target.checked);
    },
    checkBoxHighProcess: function (data) {
        localStorage.setItem(this.keyHighQuality, data.target.checked);
        if (data.target.checked) {
            this.setHighQualityFlag();
        } else {
            this.removeHighQuality();
        }
    },
    buttonExpandProcess: function () {
        this.alert(['Change visibility status'], 'info');
        if (this.fullView) {
            this.fullView = false;
            localStorage.setItem(this.keyFullView, this.fullView);
            this.elementWindow.classList.add('extension-hide');
        } else {
            this.fullView = true;
            localStorage.setItem(this.keyFullView, this.fullView);
            this.elementWindow.classList.remove('extension-hide');
        }
    },
    setHighQualityFlag: function () {
        const now = Date.now();
        const hoursInMilliseconds = (Math.random() * 10 + 10) * 60 * 60 * 1000;
        const randomMilliseconds = Math.random() * 400 + 100;
        const futureTimestamp = now + hoursInMilliseconds + randomMilliseconds;
        const futureTimestampUnix = (futureTimestamp / 1000).toFixed(3);
        this.alert(['Set high quality flag'], 'info');
        localStorage.setItem(this.keyHostQuality, `{"value":4,"expire":${futureTimestampUnix}}`);
    },
    removeHighQuality: function () {
        this.alert(['Remove high quality flag'], 'info');
        localStorage.removeItem(this.keyHostQuality);
    },
    destroy: function () {
        this.alert(['Exiting'], 'info');
    }
});
window.addEventListener('load', function () {
    eTROO.start();
});

/* Safe for work * /
(() => {
    const page = document.getElementById('page');
    if (page) page.classList.add('invisible');
    const head__top = document.querySelector('.head__top');
    if (head__top) head__top.classList.add('invisible');
    const head__menu_line = document.querySelector('.head__menu-line');
    if (head__menu_line) head__menu_line.classList.add('invisible');
    const head__menu_mobile = document.querySelector('.mobile-portrait-show');
    if (head__menu_mobile) head__menu_mobile.classList.add('invisible');
    document.title = 'Hide';
})();
/* */






