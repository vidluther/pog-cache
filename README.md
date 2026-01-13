# POG-Cache

A Cloudflare Worker that fetches, processes, and caches consumer price data from the Bureau of Labor Statistics (BLS) API.

## Overview

POG-Cache automatically pulls price information for various consumer goods across different US regions on a daily schedule. The data is stored in Cloudflare R2 storage for fast retrieval and visualization.

## Features

- Fetches price data for multiple categories (meats, dairy, produce, energy)
- Processes data for all US regions (national, northeast, midwest, south, west)
- Runs on a daily schedule via Cloudflare Workers
- Supports manual updates via authenticated API endpoint
- Stores processed data in Cloudflare R2 buckets

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS version recommended)
- [Yarn](https://yarnpkg.com/) package manager
- Cloudflare account with Workers and R2 access
- BLS API key (register at [https://www.bls.gov/developers/](https://www.bls.gov/developers/))

### Setup

1. Clone the repository
2. Install dependencies:
   ```
   yarn install
   ```
3. Configure environment variables in your Cloudflare dashboard:
   - `BLS_API_KEY` - Your BLS API key
   - `UPDATE_TOKEN` - Secret token for triggering manual updates

### Commands

- Start local development server:
  ```
  npm run dev
  ```
- Run tests:
  ```
  yarn test
  ```
- Deploy to Cloudflare:
  ```
  npm deploy
  ```

## Data Structure

The worker processes goods defined in `src/goods.json`, organized by category (meats, dairy, produce, energy). Each item includes:

- Name and display information
- Units of measurement
- BLS series IDs for each region
- Visual styling properties

## API Endpoints

- `POST /update` - Trigger a manual data update (requires Authorization header with bearer token)

## License

[MIT License](LICENSE)
