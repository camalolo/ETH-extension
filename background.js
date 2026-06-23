// Function to update the badge with gas price text
function updateBadge(gasText) {
  console.log('updateBadge called with gasText:', gasText);
  try {
    let shortGas;
    if (gasText === 'Error') {
      shortGas = 'Err';
    } else {
      const numberGas = Number.parseFloat(gasText);
      // One-liner: Format based on magnitude, max 4 chars
      shortGas = numberGas.toFixed(numberGas >= 100 ? 0 : (numberGas >= 10 ? 1 : 2)).slice(0, 4);
    }

    chrome.action.setBadgeText({ text: shortGas });
    chrome.action.setBadgeBackgroundColor({ color: '#222222' }); // Dark grey
    console.log('Badge updated with:', shortGas);
  } catch (error) {
    console.error('Error updating badge:', error);
    chrome.action.setBadgeText({ text: 'Err' });
    chrome.action.setBadgeBackgroundColor({ color: '#FF0000' }); // Red for error
  }
}

async function fetchWithRetry(url, options = {}, maxRetries = 6, baseDelay = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response;
    } catch (error) {
      if (attempt === maxRetries) throw error;
      await new Promise(resolve => setTimeout(resolve, baseDelay * Math.pow(2, attempt - 1)));
    }
  }
}

async function fetchEthGasPrice(forceUpdate = false) {
  console.log('fetchEthGasPrice called');
  chrome.storage.local.get(['gas', 'lastUpdate'], async (result) => {
    console.log('Storage data retrieved:', result);
    
    const now = Date.now();
    const lastUpdate = result.lastUpdate || 0;
    console.log('Current time:', now, 'Last update:', lastUpdate);

    if ((now - lastUpdate > 5 * 60 * 1000) || forceUpdate) {
      console.log('Fetching new gas price from API');
      try {
        const response = await fetchWithRetry('https://api.etherscan.io/v2/api?chainid=1&module=gastracker&action=gasoracle');
        console.log('API response status:', response.status);
        const data = await response.json();
        console.log('API response data:', data);
        if (data.status !== '1' || !data.result) {
          throw new Error('Etherscan API returned no data: ' + (data.message || 'unknown'));
        }
        const newGas = data.result.SafeGasPrice;

        console.log('New gas price (safe/slow):', newGas);
        chrome.storage.local.set({ gas: newGas, lastUpdate: now }, () => {
          console.log('Gas price and lastUpdate saved to storage');
        });
        updateBadge(newGas);
      } catch (error) {
        console.error('Fetch error:', error);
        updateBadge('Error');
      }
    } else if (result.gas) {
      console.log('Using cached gas price:', result.gas);
      updateBadge(result.gas);
    } else {
      console.log('No cached gas price available');
      updateBadge('Error');
    }
  });
}

// Add click listener to refresh gas price
chrome.action.onClicked.addListener(() => {
  console.log('Icon clicked, refreshing Ethereum gas price');
  fetchEthGasPrice(true);
});

chrome.runtime.onStartup.addListener(() => {
  console.log('Browser started, initializing Ethereum gas price fetch');
  fetchEthGasPrice();
});

chrome.idle.onStateChanged.addListener((state) => {
  if (state === 'active') {
    console.log('System woke from idle, refreshing Ethereum gas price');
    fetchEthGasPrice();
  }
});

// Initial fetch when the extension loads
console.log('Extension loaded, initiating first fetch');
fetchEthGasPrice();

// Schedule periodic updates
console.log('Creating alarm for periodic updates');
chrome.alarms.create('updateEthGasPrice', { periodInMinutes: 5 });
chrome.alarms.onAlarm.addListener((alarm) => {
  console.log('Alarm triggered:', alarm.name);
  if (alarm.name === 'updateEthGasPrice') {
    fetchEthGasPrice();
  }
});