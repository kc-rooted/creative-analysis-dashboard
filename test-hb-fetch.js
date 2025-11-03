// Test script to check H&B funnel ads formatted data
const fetch = require('node-fetch');

async function testHBFetch() {
  try {
    const response = await fetch('http://localhost:3000/api/reports/fetch-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reportType: 'hb-monthly-performance',
        clientId: 'hb',
        period: '30d'
      })
    });

    const data = await response.json();

    console.log('========== FUNNEL ADS DATA ==========');
    console.log(JSON.stringify(data.data.funnelAds, null, 2));

    console.log('\n\n========== FORMATTED MARKDOWN (last 100 lines) ==========');
    const lines = data.formattedData.split('\n');
    console.log(lines.slice(-100).join('\n'));

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testHBFetch();
