const { BigQuery } = require('@google-cloud/bigquery');

async function testColumns() {
  try {
    const bigquery = new BigQuery({
      projectId: 'intelligence-451803',
      keyFilename: './service-account.json',
    });

    // Get table schema
    const dataset = bigquery.dataset('jumbomax_analytics');
    const table = dataset.table('deduplicated_creative_analysis');
    const [metadata] = await table.getMetadata();
    
    console.log('Columns in deduplicated_creative_analysis:');
    metadata.schema.fields.forEach(field => {
      console.log(`  - ${field.name} (${field.type})`);
    });

    // Also run a simple query to see sample data
    console.log('\nSample data (1 row):');
    const query = `
      SELECT *
      FROM \`intelligence-451803.jumbomax_analytics.deduplicated_creative_analysis\`
      LIMIT 1
    `;
    
    const [rows] = await bigquery.query(query);
    if (rows.length > 0) {
      console.log('\nAvailable fields in actual data:');
      Object.keys(rows[0]).forEach(key => {
        const value = rows[0][key];
        const valueType = value === null ? 'null' : typeof value;
        console.log(`  - ${key}: ${valueType}`);
      });
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testColumns();