chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "updateProxy") {
        updateProxySettings();
    }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        updateExtensionIcon(tab.url);
    }
})

chrome.tabs.onActivated.addListener((activeInfo) => {
    chrome.tabs.get(activeInfo.tabId, (tab) => {
        updateExtensionIcon(tab.url);
    });
})

function updateProxySettings() {
    chrome.storage.local.get(["proxySettings", "enabledDomains"], (result) => {
        const { proxySettings, enabledDomains } = result;

        // If no domains are enabled or proxy settings are incomplete, use direct mode
        if (!enabledDomains || enabledDomains.length === 0 || !proxySettings || !proxySettings.host || !proxySettings.port) {
            chrome.proxy.settings.set({ value: { mode: "direct" } });
            return;
        }

        // PAC script for enabled domains
        const pacScriptData = `
        function FindProxyForURL(url, host) {
          const proxyDomains = ${JSON.stringify(enabledDomains)};
          const relatedDomains = {
            "www.youtube.com": ["googlevideo.com", "ytimg.com", "youtubei.googleapis.com", "s.ytimg.com"],
            "youtube.com": ["googlevideo.com", "ytimg.com", "youtubei.googleapis.com", "s.ytimg.com"],
            "m.youtube.com": ["googlevideo.com", "ytimg.com", "youtubei.googleapis.com", "s.ytimg.com"],
            "www.m.youtube.com": ["googlevideo.com", "ytimg.com", "youtubei.googleapis.com", "s.ytimg.com"],
            // You can add more domains and related domains here
          };

          // Check if the domain is in the enabled list or if it's a related domain
          for (let i = 0; i < proxyDomains.length; i++) {
            const domain = proxyDomains[i];
            if (host === domain || host.endsWith('.' + domain)) {
              return "PROXY ${proxySettings.host}:${proxySettings.port}";
            }

            // Check for related domains (e.g., youtube.com -> googlevideo.com, ytimg.com, etc.)
            if (relatedDomains[domain]) {
              for (let relatedDomain of relatedDomains[domain]) {
                if (host === relatedDomain || host.endsWith('.' + relatedDomain)) {
                  return "PROXY ${proxySettings.host}:${proxySettings.port}";
                }
              }
            }
          }
          return "DIRECT";
        }
      `;

        const proxyConfig = {
            mode: "pac_script",
            pacScript: { data: pacScriptData }
        };

        chrome.proxy.settings.set({ value: proxyConfig, scope: "regular" });
    });
}

function updateExtensionIcon(url) {
    chrome.storage.local.get(["proxySettings", "enabledDomains"], (result) => {
        const { proxySettings, enabledDomains } = result;

        if (!proxySettings || !proxySettings.host || !proxySettings.port || !enabledDomains || enabledDomains.length === 0) {
            // If proxy is not enabled, set default icon
            chrome.action.setIcon({
                16: 'icons/icon16.png',
                48: 'icons/icon48.png',
                128: 'icons/icon128.png'
            });
            return;
        }

        const tabDomain = new URL(url).hostname;

        // Check if the tab's domain matches the enabled domains or related domains
        const isProxyEnabledForTab = enabledDomains.some((domain) => {
            return tabDomain === domain || tabDomain.endsWith('.' + domain);
        });

        // Update the icon based on whether proxy is enabled for the current tab
        chrome.action.setIcon({
            path: {
                16: isProxyEnabledForTab ? 'icons/icon16-enabled.png' : 'icons/icon16.png',
                48: isProxyEnabledForTab ? 'icons/icon48-enabled.png' : 'icons/icon48.png',
                128: isProxyEnabledForTab ? 'icons/icon128-enabled.png' : 'icons/icon128.png'
            }
        });
    });
}


// Initialize proxy on startup
chrome.runtime.onStartup.addListener(updateProxySettings);
chrome.runtime.onInstalled.addListener(updateProxySettings);
