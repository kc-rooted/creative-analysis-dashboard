const { analyzeCreativeWithClaude } = require('./lib/claude-analysis');

async function testClaudeAnalysis() {
  try {
    console.log('🧪 Testing Claude Analysis...\n');
    
    // Test with a sample image URL from the creative data
    const testImageUrl = 'https://scontent.xx.fbcdn.net/v/t45.1600-4/355971973_23855371712430442_8893331780283474724_n.jpg?_nc_cat=111&ccb=1-7&_nc_sid=890911&_nc_ohc=O6TVRBOlSqUQ7kNvwHWgNkW&_nc_oc=AdnVUIjoiV3shjUP0E_F38uGEaMjJyVoGQtGH0malmRlWKVwxJcHPkZQ-MTPMhlucB4&_nc_zt=1&_nc_ht=scontent.xx&edm=ALjApogEAAAA&_nc_gid=CAkfNeBG9bN2j-JU2FRS4A&oh=00_AfUTGiA80h1FC0lD2qRlwf3E_Sv3WTe4Y3De6TchpuR1GA&oe=68AC983D';
    
    const testCreative = {
      content_id: 'test_001',
      cleaned_creative_name: 'Proven To Increase Swing Speed Test',
      representative_ad_text: 'Discover the secret to longer drives with our revolutionary golf grips!',
      total_usage_count: 61
    };

    console.log('📸 Image URL:', testImageUrl.substring(0, 80) + '...');
    console.log('📝 Creative:', testCreative.cleaned_creative_name);
    console.log('💬 Ad Text:', testCreative.representative_ad_text);
    console.log('🎯 Usage Count:', testCreative.total_usage_count);
    console.log('\n⏳ Analyzing with Claude...\n');

    const startTime = Date.now();
    const result = await analyzeCreativeWithClaude(testImageUrl, testCreative);
    const endTime = Date.now();

    console.log('✅ Analysis completed in', (endTime - startTime) / 1000, 'seconds\n');
    console.log('📊 RESULTS:');
    console.log('===========');
    console.log(JSON.stringify(result, null, 2));

    // Validate the response structure
    const requiredFields = [
      'analysis_text', 'creative_format', 'confidence_score',
      'creative_tags', 'themes', 'color_palette', 'visual_style',
      'messaging_tone', 'sentiment', 'target_audience', 'product_focus',
      'call_to_action', 'brand_elements'
    ];

    const missingFields = requiredFields.filter(field => !(field in result));
    
    if (missingFields.length === 0) {
      console.log('\n✅ All required fields present!');
    } else {
      console.log('\n❌ Missing fields:', missingFields);
    }

    console.log('\n📈 SUMMARY:');
    console.log('==========');
    console.log(`Confidence: ${result.confidence_score}`);
    console.log(`Format: ${result.creative_format}`);
    console.log(`Style: ${result.visual_style}`);
    console.log(`Tone: ${result.messaging_tone}`);
    console.log(`Sentiment: ${result.sentiment}`);
    console.log(`Audience: ${result.target_audience}`);
    console.log(`Focus: ${result.product_focus}`);
    console.log(`Tags: ${result.creative_tags?.join(', ')}`);
    console.log(`Themes: ${result.themes?.join(', ')}`);
    console.log(`Colors: ${result.color_palette?.join(', ')}`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('API Response:', error.response.data);
    }
  }
}

testClaudeAnalysis();