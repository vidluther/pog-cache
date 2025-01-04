import listOfGoods from './goods.json';

const REGIONS = ['national', 'northeast', 'midwest', 'south', 'west'];

function getSeriesIds(region = 'national') {
	console.log(`Getting series IDs for region: ${region}`);
	const seriesIds = [];

	Object.values(listOfGoods.categories).forEach((category) => {
		Object.values(category.items).forEach((item) => {
			if (item.seriesId[region]) {
				seriesIds.push(item.seriesId[region]);
				console.log(`Added series ID for ${item.name} in ${region}: ${item.seriesId[region]}`);
			} else {
				console.warn(`Missing series ID for ${item.name} in ${region}`);
			}
		});
	});

	console.log(`Total series IDs for ${region}: ${seriesIds.length}`);
	return seriesIds;
}

async function fetchDataByRegion(region, startYear, endYear, apiKey) {
	console.log(`\n=== Fetching data for ${region.toUpperCase()} ===`);
	const seriesIds = getSeriesIds(region);
	console.log(`Requesting ${seriesIds.length} series for years ${startYear}-${endYear}`);

	const BASE_URL = 'https://api.bls.gov/publicAPI/v2/timeseries/data/';

	const requestBody = {
		seriesid: seriesIds,
		startyear: startYear.toString(),
		endyear: endYear.toString(),
		registrationKey: apiKey,
		calculations: true,
		annualaverage: false,
	};

	console.log(`Making API request to BLS for ${region}...`);

	try {
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

		console.log(`Successfully received data for ${region}`);
		console.log(`Series received: ${data.Results?.series?.length || 0}`);
		return data;
	} catch (error) {
		console.error(`Failed to fetch data for ${region}:`, error);
		throw error;
	}
}

function findItemBySeriesId(seriesId, region) {
	for (const category of Object.values(listOfGoods.categories)) {
		for (const item of Object.values(category.items)) {
			if (item.seriesId[region] === seriesId) {
				return item;
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
	console.log(`\n=== Processing ${region.toUpperCase()} data ===`);

	const result = {
		current: {},
		trends: {},
		historical: new Map(),
		categories: {},
	};

	console.log('Initializing category structure...');
	Object.entries(listOfGoods.categories).forEach(([categoryId, category]) => {
		result.categories[categoryId] = {
			name: category.name,
			items: {},
		};
		console.log(`Initialized category: ${category.name}`);
	});

	if (!rawData.Results?.series) {
		console.error(`No series data found for region: ${region}`);
		return result;
	}

	console.log(`Processing ${rawData.Results.series.length} series for ${region}`);

	let processedItems = 0;
	let skippedItems = 0;
	let missingCategories = 0;

	rawData.Results.series.forEach((series) => {
		console.log(`\nProcessing series: ${series.seriesID}`);

		const item = findItemBySeriesId(series.seriesID, region);
		if (!item) {
			console.warn(`⚠️ No item found for series ${series.seriesID} in ${region}`);
			skippedItems++;
			return;
		}

		const sortedData = sortSeriesData(series.data);
		console.log(`Found ${sortedData.length} data points for ${item.name}`);

		const categoryId = Object.entries(listOfGoods.categories).find(([_, category]) =>
			Object.values(category.items).some((catItem) => catItem.dataKey === item.dataKey),
		)?.[0];

		if (!categoryId) {
			console.warn(`⚠️ No category found for item ${item.dataKey}`);
			missingCategories++;
			return;
		}

		if (sortedData[0]) {
			const currentPrice = parseFloat(sortedData[0].value);
			result.current[item.dataKey] = currentPrice;
			result.categories[categoryId].items[item.dataKey] = currentPrice;
			console.log(`✓ Current price for ${item.name}: $${currentPrice}`);

			if (sortedData[0].calculations) {
				result.trends[item.dataKey] = {
					netChange: sortedData[0].calculations.net_changes,
					percentChange: sortedData[0].calculations.pct_changes,
				};
				console.log(`✓ Trend data recorded for ${item.name}`);
			}
		}

		// Process historical data
		let historicalPoints = 0;
		sortedData.forEach((point) => {
			const month = `${point.year}-${point.period.slice(1).padStart(2, '0')}`;
			if (!result.historical.has(month)) {
				result.historical.set(month, {});
			}
			result.historical.get(month)[item.dataKey] = parseFloat(point.value);
			historicalPoints++;
		});
		console.log(`✓ Recorded ${historicalPoints} historical points for ${item.name}`);

		processedItems++;
	});

	// Convert historical Map to array
	result.historical = Array.from(result.historical.entries())
		.map(([month, prices]) => ({ month, ...prices }))
		.sort((a, b) => a.month.localeCompare(b.month));

	console.log(`\n=== ${region.toUpperCase()} Processing Summary ===`);
	console.log(`✓ Processed items: ${processedItems}`);
	console.log(`⚠️ Skipped items: ${skippedItems}`);
	console.log(`⚠️ Missing categories: ${missingCategories}`);
	console.log(`✓ Historical months: ${result.historical.length}`);
	console.log(`✓ Items with current prices: ${Object.keys(result.current).length}`);
	console.log(`✓ Items with trends: ${Object.keys(result.trends).length}`);

	return result;
}

export default {
	async scheduled(event, env, ctx) {
		console.log('\n====== Starting Price Update Job ======');
		console.log('Time:', new Date().toISOString());

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
			console.log('\n=== Storing Configuration ===');
			await env.POGCACHE.put('config.json', JSON.stringify(listOfGoods), {
				httpMetadata: {
					contentType: 'application/json',
					cacheControl: 'public, max-age=86400',
				},
			});
			console.log('✓ Configuration stored successfully');

			const regionalData = {};
			const currentPrices = {};

			// Process each region sequentially
			for (const region of REGIONS) {
				try {
					const rawData = await fetchDataByRegion(region, startYear, currentYear, env.BLS_API_KEY);
					const processedData = processRegionData(rawData, region);

					regionalData[region] = processedData;
					currentPrices[region] = processedData.current;

					if (region === 'national') {
						console.log('\n=== Storing National Data ===');
						await env.POGCACHE.put(
							'national/latest.json',
							JSON.stringify({
								...processedData,
								metadata,
							}),
						);
						console.log('✓ National data stored');
					}
				} catch (error) {
					console.error(`❌ Error processing ${region} region:`, error);
				}
			}

			console.log('\n=== Storing Regional Data ===');
			await env.POGCACHE.put(
				'regional/latest.json',
				JSON.stringify({
					regions: regionalData,
					metadata,
				}),
			);
			console.log('✓ Regional data stored');

			console.log('\n=== Storing Current Prices ===');
			await env.POGCACHE.put(
				'current_prices.json',
				JSON.stringify({
					prices: currentPrices,
					metadata,
				}),
			);
			console.log('✓ Current prices stored');

			console.log('\n=== Processing Categories ===');
			const categoryData = {};
			Object.entries(listOfGoods.categories).forEach(([categoryId, category]) => {
				console.log(`Processing category: ${category.name}`);
				categoryData[categoryId] = {
					name: category.name,
					current: {},
					trends: {},
				};

				REGIONS.forEach((region) => {
					if (regionalData[region]?.categories[categoryId]) {
						categoryData[categoryId][region] = regionalData[region].categories[categoryId];
					}
				});
			});

			await env.POGCACHE.put(
				'categories/latest.json',
				JSON.stringify({
					categories: categoryData,
					metadata,
				}),
			);
			console.log('✓ Category data stored');

			console.log('\n✅ Cache update completed successfully');
		} catch (error) {
			console.error('\n❌ Failed to update cache:', error);
			throw error;
		}
	},

	async fetch(request, env, ctx) {
		const url = new URL(request.url);

		if (url.pathname === '/update' && request.method === 'POST') {
			console.log('\n=== Manual Update Triggered ===');
			const authHeader = request.headers.get('Authorization');
			if (authHeader !== `Bearer ${env.UPDATE_TOKEN}`) {
				console.warn('❌ Unauthorized update attempt');
				return new Response('Unauthorized', { status: 401 });
			}

			try {
				await this.scheduled(null, env, ctx);
				return new Response('Cache updated successfully', { status: 200 });
			} catch (error) {
				console.error('❌ Manual update failed:', error);
				return new Response(`Failed to update cache: ${error.message}`, {
					status: 500,
				});
			}
		}

		return new Response('Not found', { status: 404 });
	},
};
