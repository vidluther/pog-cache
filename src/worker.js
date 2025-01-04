import listOfGoods from './goods.json';

const REGIONS = ['national', 'northeast', 'midwest', 'south', 'west'];

// Helper function to extract series IDs from config
function getSeriesIds(region = 'national') {
	return Object.values(listOfGoods.categories).flatMap((category) => Object.values(category.items).map((item) => item.seriesId[region]));
}

async function fetchDataByRegion(region, startYear, endYear, apiKey) {
	const seriesIds = getSeriesIds(region);
	const BASE_URL = 'https://api.bls.gov/publicAPI/v2/timeseries/data/';
	console.log('fetching series: ', seriesIds);
	const requestBody = {
		seriesid: seriesIds,
		startyear: startYear.toString(),
		endyear: endYear.toString(),
		registrationKey: apiKey,
		calculations: true,
		annualaverage: false,
	};

	const response = await fetch(BASE_URL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(requestBody),
	});

	if (!response.ok) {
		throw new Error(`HTTP error! status: ${response.status}`);
	}

	const data = await response.json();
	if (data.status !== 'REQUEST_SUCCEEDED') {
		throw new Error(`BLS API error: ${data.message}`);
	}

	return data;
}

function findItemBySeriesId(seriesId) {
	for (const category of Object.values(listOfGoods.categories)) {
		for (const item of Object.values(category.items)) {
			const regions = Object.entries(item.seriesId);
			const found = regions.find(([_, id]) => id === seriesId);
			if (found) {
				return {
					item,
					region: found[0],
				};
			}
		}
	}
	return null;
}

function sortSeriesData(data) {
	return data.sort((a, b) => {
		const dateA = new Date(parseInt(a.year), parseInt(a.period.slice(1)) - 1);
		const dateB = new Date(parseInt(b.year), parseInt(b.period.slice(1)) - 1);
		return dateB - dateA;
	});
}

function processRegionData(rawData, region) {
	const result = {
		current: {},
		trends: {},
		historical: new Map(),
		categories: {},
	};

	// Initialize categories structure
	Object.entries(listOfGoods.categories).forEach(([categoryId, category]) => {
		result.categories[categoryId] = {
			name: category.name,
			items: {},
		};
	});

	rawData.Results.series.forEach((series) => {
		const found = findItemBySeriesId(series.seriesID);
		if (!found) return;

		const { item } = found;
		const sortedData = sortSeriesData(series.data);

		// Find category for this item
		const categoryId = Object.entries(listOfGoods.categories).find(([_, category]) =>
			Object.values(category.items).some((catItem) => catItem.dataKey === item.dataKey),
		)?.[0];

		if (!categoryId) return;

		// Process current prices
		if (sortedData[0]) {
			const currentPrice = parseFloat(sortedData[0].value);
			result.current[item.dataKey] = currentPrice;
			result.categories[categoryId].items[item.dataKey] = currentPrice;

			if (sortedData[0].calculations) {
				result.trends[item.dataKey] = {
					netChange: sortedData[0].calculations.net_changes,
					percentChange: sortedData[0].calculations.pct_changes,
				};
			}
		}

		// Process historical data
		sortedData.forEach((point) => {
			const month = `${point.year}-${point.period.slice(1).padStart(2, '0')}`;
			if (!result.historical.has(month)) {
				result.historical.set(month, {});
			}
			result.historical.get(month)[item.dataKey] = parseFloat(point.value);
		});
	});

	// Convert historical Map to array
	result.historical = Array.from(result.historical.entries())
		.map(([month, prices]) => ({ month, ...prices }))
		.sort((a, b) => a.month.localeCompare(b.month));

	return result;
}

export default {
	async scheduled(event, env, ctx) {
		const currentYear = new Date().getFullYear();
		const startYear = currentYear - 10;
		const metadata = {
			lastUpdated: new Date().toISOString(),
			dataRange: {
				start: `${startYear}-01-01T00:00:00.000Z`,
				end: `${currentYear}-12-31T23:59:59.999Z`,
			},
		};

		try {
			console.log('Starting scheduled data fetch...');

			// Store config for frontend use
			await env.POGCACHE.put('config.json', JSON.stringify(listOfGoods), {
				httpMetadata: {
					contentType: 'application/json',
					cacheControl: 'public, max-age=86400',
				},
			});

			// Fetch and process data for each region
			const regionalData = {};
			const currentPrices = {};

			for (const region of REGIONS) {
				console.log(`Fetching data for ${region}...`);
				const rawData = await fetchDataByRegion(region, startYear, currentYear, env.BLS_API_KEY);
				const processedData = processRegionData(rawData, region);

				if (region === 'national') {
					// Store national data separately
					await env.POGCACHE.put(
						'national/latest.json',
						JSON.stringify({
							...processedData,
							metadata,
						}),
						{
							httpMetadata: {
								contentType: 'application/json',
								cacheControl: 'public, max-age=3600',
							},
						},
					);
				}

				regionalData[region] = processedData;
				currentPrices[region] = processedData.current;
			}

			// Store regional data
			await env.POGCACHE.put(
				'regional/latest.json',
				JSON.stringify({
					regions: regionalData,
					metadata,
				}),
				{
					httpMetadata: {
						contentType: 'application/json',
						cacheControl: 'public, max-age=3600',
					},
				},
			);

			// Store current prices separately for quick access
			await env.POGCACHE.put(
				'current_prices.json',
				JSON.stringify({
					prices: currentPrices,
					metadata,
				}),
				{
					httpMetadata: {
						contentType: 'application/json',
						cacheControl: 'public, max-age=3600',
					},
				},
			);

			// Store category-based data
			const categoryData = {};
			Object.entries(listOfGoods.categories).forEach(([categoryId, category]) => {
				categoryData[categoryId] = {
					name: category.name,
					current: {},
					trends: {},
				};

				REGIONS.forEach((region) => {
					categoryData[categoryId][region] = regionalData[region].categories[categoryId];
				});
			});

			await env.POGCACHE.put(
				'categories/latest.json',
				JSON.stringify({
					categories: categoryData,
					metadata,
				}),
				{
					httpMetadata: {
						contentType: 'application/json',
						cacheControl: 'public, max-age=3600',
					},
				},
			);

			console.log('Successfully updated cache in R2');
		} catch (error) {
			console.error('Failed to update cache:', error);
			throw error;
		}
	},

	async fetch(request, env, ctx) {
		const url = new URL(request.url);

		if (url.pathname === '/update' && request.method === 'POST') {
			const authHeader = request.headers.get('Authorization');
			if (authHeader !== `Bearer ${env.UPDATE_TOKEN}`) {
				return new Response('Unauthorized', { status: 401 });
			}

			try {
				await this.scheduled(null, env, ctx);
				return new Response('Cache updated successfully', { status: 200 });
			} catch (error) {
				return new Response(`Failed to update cache: ${error.message}`, {
					status: 500,
				});
			}
		}

		return new Response('Not found', { status: 404 });
	},
};
