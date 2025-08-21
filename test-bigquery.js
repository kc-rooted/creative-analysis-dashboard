const { BigQuery } = require('@google-cloud/bigquery');

async function testConnection() {
  try {
    console.log('Testing BigQuery connection...');
    
    const bigquery = new BigQuery({
      projectId: 'intelligence-451803',
      keyFilename: './service-account.json',
    });

    // Test 1: List datasets
    console.log('\n1. Listing datasets in project:');
    const [datasets] = await bigquery.getDatasets();
    datasets.forEach(dataset => console.log(`   - ${dataset.id}`));

    // Test 2: Check if our dataset exists
    const datasetId = 'jumbomax_analytics';
    const dataset = bigquery.dataset(datasetId);
    const [exists] = await dataset.exists();
    console.log(`\n2. Dataset '${datasetId}' exists: ${exists}`);

    if (exists) {
      // Test 3: List tables in the dataset
      console.log(`\n3. Tables in ${datasetId}:`);
      const [tables] = await dataset.getTables();
      tables.forEach(table => console.log(`   - ${table.id}`));

      // Test 4: Try to query the deduplicated view
      console.log('\n4. Testing query on deduplicated_creative_analysis:');
      const query = `
        SELECT 
          COUNT(*) as total_count,
          COUNT(DISTINCT analysis_status) as status_types
        FROM \`intelligence-451803.jumbomax_analytics.deduplicated_creative_analysis\`
        LIMIT 1
      `;
      
      const [rows] = await bigquery.query(query);
      console.log('   Query result:', rows[0]);
    }

    console.log('\n✅ BigQuery connection successful!');
  } catch (error) {
    console.error('\n❌ BigQuery connection failed:');
    console.error('Error:', error.message);
    console.error('\nPlease check:');
    console.error('1. Service account JSON file is valid');
    console.error('2. Service account has necessary permissions');
    console.error('3. Project ID is correct');
  }
}

testConnection();