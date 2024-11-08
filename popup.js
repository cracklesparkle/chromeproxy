// Load proxy settings when the popup opens
window.addEventListener("DOMContentLoaded", () => {
    chrome.storage.local.get("enabledDomains", (result) => {
        const enabledDomains = result.enabledDomains || [];

        // Render the list of enabled domains
        const domainListContainer = document.getElementById("enabledDomainsList");
        domainListContainer.innerHTML = ''; // Clear existing list

        enabledDomains.forEach((domain) => {
            const listItem = document.createElement("li");
            listItem.classList.add("domain-item");

            // Create a checkbox for each enabled domain
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.checked = true; // Proxy is enabled for this domain
            checkbox.dataset.domain = domain; // Store the domain as a data attribute
            checkbox.addEventListener("change", handleDomainToggle);

            const label = document.createElement("label");
            label.textContent = domain;

            listItem.appendChild(checkbox);
            listItem.appendChild(label);
            domainListContainer.appendChild(listItem);
        });
    });

    // Get the saved proxy settings
    chrome.storage.local.get("proxySettings", (result) => {
        const proxySettings = result.proxySettings || {};

        // Populate the form fields with the saved settings
        document.getElementById("host").value = proxySettings.host || "";
        document.getElementById("port").value = proxySettings.port || "";
        document.getElementById("username").value = proxySettings.username || "";
        document.getElementById("password").value = proxySettings.password || "";
    });

    // Get the current tab's domain
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const url = new URL(tabs[0].url);
        const domain = url.hostname;
        document.getElementById("enableProxyCheckbox").dataset.domain = domain;

        // Check if proxy is enabled for the current domain
        chrome.storage.local.get("enabledDomains", (result) => {
            const enabledDomains = result.enabledDomains || [];
            document.getElementById("enableProxyCheckbox").checked = enabledDomains.includes(domain);
        });
    });
});

// Save the proxy settings when the form is submitted
document.getElementById("proxyForm").addEventListener("submit", (event) => {
    event.preventDefault();

    const host = document.getElementById("host").value;
    const port = document.getElementById("port").value;
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    const proxySettings = { host, port, username, password };

    // Save the proxy settings
    chrome.storage.local.set({ proxySettings }, () => {
        alert("Proxy configuration saved.");
        chrome.runtime.sendMessage({ action: "updateProxy" });
    });
});

// Enable/disable proxy for the current domain
document.getElementById("enableProxyCheckbox").addEventListener("change", (event) => {
    const isEnabled = event.target.checked;
    const domain = event.target.dataset.domain;

    chrome.storage.local.get("enabledDomains", (result) => {
        let enabledDomains = result.enabledDomains || [];

        if (isEnabled) {
            // Add domain to enabled domains list
            if (!enabledDomains.includes(domain)) {
                enabledDomains.push(domain);
                updateExtensionIcon(true)
            }
        } else {
            // Remove domain from enabled domains list
            enabledDomains = enabledDomains.filter((d) => d !== domain);
            updateExtensionIcon(false)
        }

        chrome.storage.local.set({ enabledDomains }, () => {
            // Send a message to update proxy settings based on enabled domains
            chrome.runtime.sendMessage({ action: "updateProxy" });
        });
    });
});

// Handle enabling/disabling proxy for each domain
function handleDomainToggle(event) {
    const domain = event.target.dataset.domain;
    const isChecked = event.target.checked;

    chrome.storage.local.get("enabledDomains", (result) => {
        let enabledDomains = result.enabledDomains || [];

        if (isChecked) {
            // Add domain to the list if checked
            if (!enabledDomains.includes(domain)) {
                enabledDomains.push(domain)
                updateExtensionIcon(true)
            }
        } else {
            // Remove domain from the list if unchecked
            enabledDomains = enabledDomains.filter((d) => d !== domain);
            updateExtensionIcon(false)
        }

        // Save updated enabled domains to storage
        chrome.storage.local.set({ enabledDomains }, () => {
            chrome.runtime.sendMessage({ action: "updateProxy" });
        })
    });
}

function updateExtensionIcon(bool) {
    chrome.action.setIcon({
        path: {
            16: bool ? 'icons/icon16-enabled.png' : 'icons/icon16.png',
            48: bool ? 'icons/icon48-enabled.png' : 'icons/icon48.png',
            128: bool ? 'icons/icon128-enabled.png' : 'icons/icon128.png'
        }
    })
}