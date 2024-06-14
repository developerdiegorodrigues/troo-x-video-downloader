/**
 * @author Diego Rodrigues <@devdiegorodrigues>
 * @since 1.0.0
 * 
 */

"use strict";
var eTROO = new Object({
    started: false,
    targetDomain: 'www.xvideos.com',
    htmlData: 'view/content.html',
    cssData: 'view/style.css',
    timerElements: null,
    elementWindow: null,
    elementSpanLoading: null,
    elementCheckBoxAuto: null,
    elementCheckBoxAutoLabel: null,
    elementButtonExpand: null,
    elementButtonDownload: null,
    elementTextarea: null,
    targetUrl: null,
    filesBaseName: null,
    videoList: [],
    videoTotalData: null,
    memoryError: null,
    keyAutomaticDownload: 'eTROO_AutomaticDownload',
    keyFullView: 'eTROO_FullView',
    automaticDownload: false,
    fullView: true,

    start: function () {
        if (this.started) return;
        this.started = true;

        console.info('>eTROO: Started');
        if (!this.checkDomain()) return this.destroy();
        if (!this.inject()) return this.destroy();
        if (!this.loadInterface()) return this.destroy();
        this.receive();
        this.checkElements();
    },
    checkDomain: function () {
        console.info('>eTROO: Checking domain');
        if (this.targetDomain != window.location.hostname) {
            console.info('>eTROO: Not expected domain');
            return false;
        }
        return true;
    },
    loadInterface: async function () {
        console.info('>eTROO: Loading interface');
        await fetch(chrome.runtime.getURL(this.htmlData))
            .then(response => response.text())
            .then(data => {
                const container = document.createElement('div');
                container.innerHTML = data;
                const style = document.createElement('link');
                style.rel = 'stylesheet';
                style.type = 'text/css';
                style.href = chrome.runtime.getURL(this.cssData);
                document.head.appendChild(style);
                document.body.appendChild(container);
            })
            .catch(error => {
                console.error(`>Troo-x-video-downloader: Error fetching file content - ${JSON.stringify(error)}`);
                return false;
            });
        return true;
    },
    checkElements: function () {
        this.timerElements = setInterval(() => {
            console.info('>eTROO: Await elements initialization');
            this.elementWindow = document.getElementById("extension-content");
            this.elementSpanLoading = document.getElementById("ext-el-loading");
            this.elementCheckBoxAuto = document.getElementById("ext-el-auto");
            this.elementCheckBoxAutoLabel = document.getElementById("ext-el-auto-label");
            this.elementButtonExpand = document.getElementById("ext-el-expand");
            this.elementButtonDownload = document.getElementById("ext-el-download");
            this.elementTextarea = document.getElementById("ext-el-textarea");
            if (
                this.elementWindow &&
                this.elementSpanLoading &&
                this.elementCheckBoxAuto &&
                this.elementCheckBoxAutoLabel &&
                this.elementButtonExpand &&
                this.elementButtonDownload &&
                this.elementTextarea
            ) {
                clearInterval(this.timerElements);
                console.info('>eTROO: Elements found');
                this.loadConfigurations();
                this.registerElementsListener();
                this.elementCheckBoxAuto.classList.remove("disabled");
                this.elementCheckBoxAutoLabel.classList.remove("disabled");
                this.elementButtonExpand.classList.remove("disabled");
            }
        }, 250);
    },
    registerElementsListener: function () {
        this.elementCheckBoxAuto.addEventListener("click", (event) => {
            this.checkBoxAutoProcess(event);
        });
        this.elementButtonExpand.addEventListener("click", () => {
            this.buttonExpandProcess();
        });
        this.elementButtonDownload.addEventListener("click", () => {
            this.startDownloadVideo();
        });
    },
    loadConfigurations: function () {
        console.info('>eTROO: Loading configurations');
        const cAutoDownload = localStorage.getItem(this.keyAutomaticDownload).toString();
        if (cAutoDownload == 'true') {
            this.automaticDownload = true;
            this.elementCheckBoxAuto.checked = true;
        }
        const cFullView = localStorage.getItem(this.keyFullView).toString();
        if (cFullView == 'false') {
            this.fullView = false;
            this.elementWindow.classList.add("extension-hide");
        }
    },
    inject: function () {
        console.info('>eTROO: Injecting dependencies');
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('pageScript.js');
        try {
            document.head.appendChild(script);
        } catch (error) {
            console.error('>Troo-x-video-downloader: Error fetching file content', error);
            return false;
        }
        return true;
    },
    receive: function () {
        window.addEventListener('message', (event) => {
            if (event.source !== window) return;
            if (event.data.type && event.data.type === 'FROM_PAGE') {
                if (event.data.content < 5) {
                    console.error('>eTROO: Bad target URL');
                    return false;
                }
                eTROO.targetUrl = event.data.content;
                console.info('>eTROO: Received data');
                eTROO.generateVideoList();
            }
        });
    },
    generateVideoList: async function () {
        console.info('>eTROO: Generating video list');
        let index = 0;
        this.targetUrl = this.targetUrl.slice(0, -4);
        this.filesBaseName = this.targetUrl.split('/').pop();
        while (true) {
            const url = `${this.targetUrl}${index}.ts`;
            try {
                const response = await fetch(url, { method: 'HEAD' });
                if (response.ok) {
                    this.videoList.push(url);
                    index++;
                } else {
                    break;
                }
            } catch (error) {
                console.error(`>eTROO: URL checking error ${url}`, error);
                break;
            }
        }
        console.info('>eTROO: Generated video list');
        this.elementButtonDownload.classList.remove("disabled");
        
        if (this.automaticDownload) {
            this.startDownloadVideo();
        }
    },
    startDownloadVideo: async function () {
        console.info('>eTROO: Starting download video');
        if (this.videoList == []) {
            console.info('>eTROO: The list is already empty');
            return false;
        }
        this.videoTotalData = [];
        this.memoryError = false;
        let index = 0;
        this.elementSpanLoading.classList.remove("invisible");
        for (const url of this.videoList) {
            index++;
            try {
                await this.requestFile(url, index, 'video');
                console.info('>eTROO: Successfully added', url.split('/').pop(), 'to download list');
            } catch (error) {
                this.videoTotalData = [];
                this.elementSpanLoading.classList.add("invisible");
                console.info('>eTROO: Download failed');
                return;
            }
        }
        this.elementSpanLoading.classList.add("invisible");
    },
    startDownloadPicture: async function () {
        console.info('>eTROO: Starting download picture');
        const element = document.querySelector('.video-pic img');
        if (!element) {
            console.warn('>eTROO: Picture not found');
            return;
        }
        const elementPath = element.src;
        if (!elementPath) {
            console.warn('>eTROO: Picture source not found');
            return;
        }
        this.requestFile(elementPath, null, 'image');
    },
    requestFile: async function (url, index, type) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open("GET", url, true);
            xhr.responseType = "arraybuffer";
            xhr.onload = () => {
                if (xhr.status === 200) {
                    resolve(this.dowloadQueue(xhr.response, index, type));
                } else {
                    reject('>eTROO: Failed to download file', url);
                }
            };
            xhr.onerror = () => {
                reject('>eTROO: Network error while downloading file', url);
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
                    throw new Error('>eTROO: Error while accessing memory', error);
                }
                if (this.videoList.length == index && !this.memoryError) {
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
        console.log('>eTROO: File downloaded:', this.filesBaseName);
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
        console.log('>eTROO: Picture downloaded:', this.filesBaseName);
    },
    checkBoxAutoProcess: function (data) {
        localStorage.setItem(this.keyAutomaticDownload, data.target.checked);
    },
    buttonExpandProcess: function () {
        console.info('>eTROO: Change visibility status');
        if (this.fullView) {
            this.fullView = false;
            localStorage.setItem(this.keyFullView, this.fullView);
            this.elementWindow.classList.add("extension-hide");
        } else {
            this.fullView = true;
            localStorage.setItem(this.keyFullView, this.fullView);
            this.elementWindow.classList.remove("extension-hide");
        }
    },
    destroy: function () {
        this.destroyed = true;
        console.info('>eTROO: Exiting');
    }
});
window.addEventListener('load', function () {
    eTROO.start();
});

/* Safe for work */
(() => {
    const page = document.getElementById('page');
    if (page) page.classList.add('invisible');
    const head__top = document.querySelector('.head__top');
    if (head__top) head__top.classList.add('invisible');
    const head__menu_line = document.querySelector('.head__menu-line');
    if (head__menu_line) head__menu_line.classList.add('invisible');
    const head__menu_mobile = document.querySelector('.mobile-portrait-show');
    if (head__menu_mobile) head__menu_mobile.classList.add('invisible');
    document.title = "Hide";
})();







