// Function to update the badge with gas price text
function updateBadge(gasText) {
  console.log('updateBadge called with gasText:', gasText);
  try {
    let shortGas;
    if (gasText === 'Error') {
      shortGas = 'Err';
    } else {
      const numGas = parseFloat(gasText);
      // One-liner: Format based on magnitude, max 4 chars
      shortGas = numGas.toFixed(numGas >= 100 ? 0 : numGas >= 10 ? 1 : 2).slice(0, 4);
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

// Function to fetch Ethereum gas price and update badge
function fetchEthGasPrice(forceUpdate = false) {
  console.log('fetchEthGasPrice called');
  chrome.storage.local.get(['gas', 'lastUpdate'], (result) => {
    console.log('Storage data retrieved:', result);
    
    const now = Date.now();
    const lastUpdate = result.lastUpdate || 0;
    console.log('Current time:', now, 'Last update:', lastUpdate);

    if ((now - lastUpdate > 5 * 60 * 1000) || forceUpdate) { // Update every 5 minutes
      console.log('Fetching new gas price from API');
      fetch('https://api.blocknative.com/gasprices/blockprices?chainid=1')
        .then(response => {
          console.log('API response status:', response.status);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.json();
        })
        .then(data => {
          console.log('API response data:', data);
          const blockPrices = data.blockPrices;
          if (!blockPrices || blockPrices.length === 0) {
            throw new Error('No block prices found in API response');
          }
          const estimatedPrices = blockPrices[0].estimatedPrices;
          if (!estimatedPrices || estimatedPrices.length === 0) {
            throw new Error('No estimated prices found in API response');
          }
          const price95 = estimatedPrices.find(price => price.confidence === 95);
          if (!price95) {
            throw new Error('Could not retrieve gas price with 95% confidence');
          }
          const newGas = price95.price;

          console.log('New gas price (95% confidence):', newGas);
          chrome.storage.local.set({ gas: newGas, lastUpdate: now }, () => {
            console.log('Gas price and lastUpdate saved to storage');
          });
          updateBadge(newGas);
        })
        .catch(error => {
          console.error('Fetch error:', error);
          if (error instanceof TypeError) {
            console.error('Failed to fetch. Retrying in 30 seconds');
            setTimeout(fetchEthGasPrice, 30000);
          } else {
            updateBadge('Error');
          }
        });
    } else if (result.gas) {
      console.log('Using cached gas price:', result.gas);
      updateBadge(result.gas); // Use cached gas price
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