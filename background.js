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

// Public Ethereum RPC endpoints (tried in order for redundancy)
const RPC_ENDPOINTS = [
  'https://ethereum-rpc.publicnode.com',
  'https://eth.llamarpc.com',
  'https://rpc.ankr.com/eth',
];

// Fetch safe (slow-confirmation) gas price in Gwei via eth_feeHistory
async function fetchGasPrice() {
  const body = JSON.stringify({
    jsonrpc: '2.0',
    method: 'eth_feeHistory',
    params: [4, 'latest', [25]],
    id: 1,
  });

  for (const url of RPC_ENDPOINTS) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      if (!response.ok) continue;
      const data = await response.json();
      if (!data.result || !data.result.baseFeePerGas || !data.result.reward) continue;

      // Next block's base fee (last element in the array)
      const fees = data.result.baseFeePerGas;
      const baseFee = parseInt(fees[fees.length - 1], 16);
      // Average 25th-percentile priority fee across returned blocks
      const rewards = data.result.reward.map(r => parseInt(r[0], 16));
      const avgReward = rewards.reduce((a, b) => a + b, 0) / rewards.length;

      const gasGwei = (baseFee + avgReward) / 1e9;
      if (gasGwei > 0) return gasGwei;
    } catch (error) {
      console.warn(`RPC ${url} failed:`, error.message);
    }
  }
  throw new Error('All RPC endpoints failed');
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
        const newGas = await fetchGasPrice();
        console.log('New gas price (safe/slow):', newGas);
        chrome.storage.local.set({ gas: newGas, lastUpdate: now }, () => {
          console.log('Gas price and lastUpdate saved to storage');
        });
        updateBadge(newGas);
      } catch (error) {
        console.error('Fetch error:', error);
        updateBadge('Error');
        // Schedule a retry in 1 minute (one-shot alarm)
        chrome.alarms.create('retryEthGasPrice', { delayInMinutes: 1 });
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
  } else if (alarm.name === 'retryEthGasPrice') {
    fetchEthGasPrice(true);
  }
});