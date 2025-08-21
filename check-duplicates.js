const { BigQuery } = require('@google-cloud/bigquery');

async function checkDuplicates() {
  try {
    const bigquery = new BigQuery({
      projectId: 'intelligence-451803',
      keyFilename: './service-account.json',
    });

    // Check for duplicate images
    const query = `
      SELECT 
        primary_image_url,
        COUNT(*) as duplicate_count,
        ARRAY_AGG(content_id LIMIT 5) as sample_content_ids,
        ARRAY_AGG(representative_creative_name LIMIT 5) as sample_names
      FROM \`intelligence-451803.jumbomax_analytics.deduplicated_creative_analysis\`
      WHERE primary_image_url IS NOT NULL AND primary_image_url != ''
      GROUP BY primary_image_url
      HAVING COUNT(*) > 1
      ORDER BY duplicate_count DESC
      LIMIT 10
    `;
    
    const [rows] = await bigquery.query(query);
    
    console.log('Images appearing multiple times in "deduplicated" table:');
    console.log('================================================');
    rows.forEach(row => {
      console.log(`\nImage URL: ${row.primary_image_url.substring(0, 80)}...`);
      console.log(`Appears ${row.duplicate_count} times with different content_ids:`);
      row.sample_content_ids.forEach((id, i) => {
        console.log(`  - ${id} (${row.sample_names[i] || 'no name'})`);
      });
    });

    // Also check total unique images vs total rows
    const statsQuery = `
      SELECT 
        COUNT(*) as total_rows,
        COUNT(DISTINCT primary_image_url) as unique_images,
        COUNT(DISTINCT content_id) as unique_content_ids
      FROM \`intelligence-451803.jumbomax_analytics.deduplicated_creative_analysis\`
      WHERE primary_image_url IS NOT NULL AND primary_image_url != ''
    `;
    
    const [stats] = await bigquery.query(statsQuery);
    console.log('\n\nOverall Statistics:');
    console.log('===================');
    console.log(`Total rows in table: ${stats[0].total_rows}`);
    console.log(`Unique content_ids: ${stats[0].unique_content_ids}`);
    console.log(`Unique image URLs: ${stats[0].unique_images}`);
    console.log(`\nThis means each image appears on average ${(stats[0].total_rows / stats[0].unique_images).toFixed(1)} times!`);

  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkDuplicates();