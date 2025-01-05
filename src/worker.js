import listOfGoods from './goods.json';

const REGIONS = ['national', 'northeast', 'midwest', 'south', 'west'];

async function sendToR2(bucket, filename, contents, options = {}) {
	const defaultOptions = {
		httpMetadata: {
			contentType: 'application/json',
			cacheControl: 'public, max-age=3600',
		},
	};

	const finalOptions = {
		...defaultOptions,
		...options,
		httpMetadata: {
			...defaultOptions.httpMetadata,
			...options.httpMetadata,
		},
	};

	const data = typeof contents === 'string' ? contents : JSON.stringify(contents);
	await bucket.put(filename, data, finalOptions);
	console.log(`✓ Successfully stored ${filename}`);
}

async function fetchDataByRegion(region, startYear, endYear, apiKey) {
	console.log(`\n=== Fetching data for ${region.toUpperCase()} ===`);

	// Get all series IDs for this region
	const seriesIds = [];
	Object.values(listOfGoods.categories).forEach((category) => {
		Object.values(category.items).forEach((item) => {
			if (item.seriesId[region]) {
				seriesIds.push(item.seriesId[region]);
			}
		});
	});

	const BASE_URL = 'https://api.bls.gov/publicAPI/v2/timeseries/data/';
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
		for (const [itemKey, item] of Object.entries(category.items)) {
			for (const [region, id] of Object.entries(item.seriesId)) {
				if (id === seriesId) {
					return { itemKey, item };
				}
			}
		}
	}
	return null;
}

export default {
	async scheduled(event, env, ctx) {
		console.log('\n====== Pulling CPI Information from BLS ======');
		console.log('Time:', new Date().toISOString());

		const currentYear = new Date().getFullYear();
		const startYear = currentYear - 10;
		try {
			// Process each region
			for (const region of REGIONS) {
				try {
					console.log(`\nProcessing ${region} region...`);
					const rawData = await fetchDataByRegion(region, startYear, currentYear, env.BLS_API_KEY);

					// Process each series in the response
					for (const series of rawData.Results.series) {
						const itemInfo = findItemBySeriesId(series.seriesID);
						if (!itemInfo) {
							console.warn(`⚠️ No item found for series ${series.seriesID}`);
							continue;
						}

						const { itemKey, item } = itemInfo;

						// Create simplified item data structure
						const itemData = {
							metadata: {
								name: item.name,
								unit: item.unit,
								seriesId: series.seriesID,
								lastUpdated: new Date().toISOString(),
							},
							data: series.data,
						};

						// Store the data in R2
						const filepath = `${region}/${itemKey}.json`;
						await sendToR2(env.POGCACHE_R2_BUCKET, filepath, itemData);
					} // end series loop

					console.log(`✓ Completed processing ${region} region`);
				} catch (error) {
					console.error(`❌ Error processing ${region} region:`, error);
				}
			} // end region loop

			console.log('Upload the goods.json file to R2 as well');
			const goodsFilepath = `goods.json`;
			await sendToR2(env.POGCACHE_R2_BUCKET, goodsFilepath, listOfGoods);
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
