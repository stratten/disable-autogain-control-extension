// Show context menu that allows enabling/disabling on a per-domain basis.
chrome.action.onClicked.addListener(tab => {
    const { origin, protocol } = new URL(tab.url);
    if (protocol !== "https:" && protocol !== "http:") {
        return;
    }
    chrome.permissions.contains({
        origins: [origin + "/*"],
    }, (hasPermission) => {
        if (hasPermission) {
            chrome.permissions.remove({
                origins: [origin + "/*"]
            }, () => chrome.tabs.reload(tab.id));
        } else {
            chrome.permissions.request({
                origins: [origin + "/*"]
            }, () => chrome.tabs.reload(tab.id));
        }
    });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    injectScriptIfNecessary(tab);
});

/**
 * @param {chrome.tabs.Tab} tab 
 */
function injectScriptIfNecessary(tab) {
    if (tab.status !== "loading" || !tab.url) {
        return;
    }

    try {
        const { origin, protocol } = new URL(tab.url);
        if (protocol !== "https:" && protocol !== "http:") {
            return;
        }
        chrome.permissions.contains({
            origins: [origin + "/*"]
        }, (hasPermission) => {
            if (hasPermission) {
                chrome.scripting.executeScript({
                    target: { tabId: tab.id, allFrames: true },
                    files: ["installDisableAutogain.js"]
                });
            }
            chrome.action.setTitle({
                title: hasPermission
                    ? "Disable Automatic Gain Control"
                    : "Enable Automatic Gain Control",
                tabId: tab.id,
            });
            chrome.action.setBadgeText({
                text: hasPermission ? "On" : "",
                tabId: tab.id,
            });
        });
    } catch (e) {
        console.error("Failed to inject script", e);
    }
}

function showUsage() {
    chrome.tabs.create({
        url: chrome.runtime.getURL("usage.html")
    });
}

function showUpgradeNotice() {
    chrome.tabs.create({
        url: chrome.runtime.getURL("upgradeFromV1.0.html")
    });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (typeof message === "object" && message["type"] === "enable-meet-hangouts") {
        chrome.permissions.request({
            origins: [
                "https://meet.google.com/*",
                "https://hangouts.google.com/*"
            ]
        }, (granted) => {
            sendResponse(granted);
        });
        return true;
    }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "usage-menu") {
        showUsage();
    }
});

chrome.runtime.onInstalled.addListener(({ reason, previousVersion }) => {
    // Create context menu on install/enable to avoid duplicates
    chrome.contextMenus.create({
        title: "Usage",
        contexts: ["action"],
        id: "usage-menu"
    });
    
    if (reason === "update" && previousVersion === "1.0") {
        showUpgradeNotice();
    } else if (reason === "install") {
        showUsage();
    }
});
