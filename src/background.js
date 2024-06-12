chrome.tabs.onCreated.addListener(function (tab) {
    chrome.tabs.executeScript(tab.id, { file: "content.js" });
});
