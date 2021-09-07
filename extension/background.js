chrome.browserAction.onClicked.addListener((tab) => {
    // window.open('content.html');
    if (tab.audible) {
        chrome.tabCapture.capture({
            audio: true,
            video: false,
        },
            (stream) => {
                var receiver = window.open(chrome.runtime.getURL('content.html'))
                receiver.currentStream = stream;
            }
        )
    }
});

chrome.tabCapture.onStatusChanged.addListener((info) => {
    console.log(info);
});