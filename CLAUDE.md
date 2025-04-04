# CLAUDE.md - Guidelines for POG-Cache

## Commands
- Build/Deploy: `wrangler deploy`
- Development: `wrangler dev` or `yarn dev`
- Run all tests: `yarn test` or `vitest`
- Run single test: `vitest run test/index.spec.js -t "test description"`
- Watch tests: `vitest watch`

## Code Style
- **JS Style**: Modern ES modules with async/await patterns
- **Naming**: camelCase for variables/functions, PascalCase for classes
- **Imports**: List external imports first, then internal
- **Functions**: Use arrow functions for callbacks, named functions for exports
- **Error Handling**: Use try/catch blocks with specific error messages
- **Logging**: Consistent format with emojis for status (✓, ❌, ⚠️)
- **Data Structure**: Follow existing patterns in goods.json
- **API Calls**: Use fetch API with proper error handling
- **Config**: Use environment variables via Cloudflare Workers env object

This codebase is a Cloudflare Worker that fetches and caches data from the BLS API.