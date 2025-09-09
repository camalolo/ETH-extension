# ETH Gas Price Extension

A Chrome extension that displays the current Ethereum gas fees for slow confirmation directly on the extension icon badge.

## Features

- Displays Ethereum gas price (95% confidence) on the extension icon
- Updates automatically every 5 minutes
- Click the extension icon to manually refresh the gas price
- Caches gas price data locally for efficient updates
- Error handling with visual indicators

## Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension directory
5. The extension will be installed and ready to use

## Usage

- The extension icon will show the current gas price in Gwei
- Click the icon to manually refresh the gas price
- The badge background is dark grey for normal operation, red for errors

## API

This extension uses the Blocknative Gas Price API to fetch real-time Ethereum gas prices:
- Endpoint: `https://api.blocknative.com/gasprices/blockprices?chainid=1`
- Retrieves gas price with 95% confidence level

## Permissions

The extension requires the following permissions:
- `storage`: To cache gas price data locally
- `alarms`: To schedule periodic updates
- Host permissions for `https://ethgasprice.org/*` (Note: Code uses Blocknative API)

## Development

### Files
- `manifest.json`: Extension manifest file
- `background.js`: Service worker handling gas price fetching and badge updates
- `icon16.png`, `icon48.png`, `icon128.png`: Extension icons

### Building
No build process required - the extension runs directly from the source files.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test the extension
5. Submit a pull request

## License

This project is open source. Please check the license file for details.