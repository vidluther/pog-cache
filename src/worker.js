const SERIES_IDS = {
	eggs: 'APU0000708111',
	milk: 'APU0000709112',
	bread: 'APU0000702111',
	gas: 'APU000074714',
};

async function fetchHistoricalData(startYear, endYear, apiKey) {
	const BASE_URL = 'https://api.bls.gov/publicAPI/v2/timeseries/data/';

	const requestBody = {
		seriesid: Object.values(SERIES_IDS),
		startyear: startYear.toString(),
		endyear: endYear.toString(),
		registrationKey: apiKey,
		calculations: false,
		annualaverage: false,
	};

	const response = await fetch(BASE_URL, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
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

function processHistoricalData(rawData) {
	const processedData = {
		current: {},
		historical: [],
		metadata: {
			lastUpdated: new Date().toISOString(),
			dataRange: {
				start: null,
				end: null,
			},
		},
	};

	const monthlyData = {};

	rawData.Results.series.forEach((series) => {
		const itemName = Object.keys(SERIES_IDS).find((key) => SERIES_IDS[key] === series.seriesID);

		const sortedData = series.data.sort((a, b) => {
			const dateA = new Date(parseInt(a.year), parseInt(a.period.slice(1)) - 1);
			const dateB = new Date(parseInt(b.year), parseInt(b.period.slice(1)) - 1);
			return dateB - dateA;
		});

		if (sortedData[0]) {
			processedData.current[itemName] = parseFloat(sortedData[0].value);
		}

		sortedData.forEach((point) => {
			const month = `${point.year}-${point.period.slice(1).padStart(2, '0')}`;
			if (!monthlyData[month]) {
				monthlyData[month] = {};
			}
			monthlyData[month][itemName] = parseFloat(point.value);
		});

		const dates = sortedData.map((point) => new Date(parseInt(point.year), parseInt(point.period.slice(1)) - 1));
		const minDate = new Date(Math.min(...dates));
		const maxDate = new Date(Math.max(...dates));

		if (!processedData.metadata.dataRange.start || minDate < new Date(processedData.metadata.dataRange.start)) {
			processedData.metadata.dataRange.start = minDate.toISOString();
		}
		if (!processedData.metadata.dataRange.end || maxDate > new Date(processedData.metadata.dataRange.end)) {
			processedData.metadata.dataRange.end = maxDate.toISOString();
		}
	});

	processedData.historical = Object.entries(monthlyData)
		.map(([month, prices]) => ({
			month,
			...prices,
		}))
		.sort((a, b) => a.month.localeCompare(b.month));

	return processedData;
}

export default {
	async scheduled(event, env, ctx) {
		try {
			console.log('Starting scheduled data fetch...');

			const currentYear = new Date().getFullYear();
			const startYear = currentYear - 20;

			console.log(`Fetching data from ${startYear} to ${currentYear}...`);

			const rawData = await fetchHistoricalData(startYear, currentYear, env.BLS_API_KEY);
			const processedData = processHistoricalData(rawData);

			// Store in R2
			await env.POGCACHE.put('latest.json', JSON.stringify(processedData), {
				httpMetadata: {
					contentType: 'application/json',
					cacheControl: 'public, max-age=3600',
				},
			});

			console.log('Successfully updated cache in R2');
		} catch (error) {
			console.error('Failed to update cache:', error);
			throw error;
		}
	},

	// Optional: Add an HTTP handler to manually trigger updates
	async fetch(request, env, ctx) {
		const url = new URL(request.url);

		if (url.pathname === '/update' && request.method === 'POST') {
			// Check for a secret token to secure the endpoint
			const authHeader = request.headers.get('Authorization');
			console.log(authHeader);
			if (authHeader !== `Bearer ${env.UPDATE_TOKEN}`) {
				return new Response('Unauthorized', { status: 401 });
			}

			// Trigger the update
			try {
				await this.scheduled(null, env, ctx);
				return new Response('Cache updated successfully', { status: 200 });
			} catch (error) {
				return new Response(`Failed to update cache: ${error.message}`, { status: 500 });
			}
		}

		return new Response('Not found', { status: 404 });
	},
};
