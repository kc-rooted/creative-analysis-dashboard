// Script to restore JumboMax configuration
const jumboMaxConfig = {
  id: 'jumbomax',
  name: 'JumboMax Golf',
  bigquery: { 
    dataset: 'jumbomax_analytics' 
  },
  brand: {
    colors: [
      { name: 'JumboMax Blue', hex: '#1B4F72', description: 'Primary brand blue - professional and trustworthy', usage: 'primary_brand' },
      { name: 'JumboMax Orange', hex: '#E67E22', description: 'Secondary accent color - energy and performance', usage: 'accent' },
      { name: 'White', hex: '#FFFFFF', description: 'Clean background and text contrast', usage: 'background' },
      { name: 'Dark Gray', hex: '#2C3E50', description: 'Primary text and strong contrast', usage: 'text' },
      { name: 'Light Gray', hex: '#95A5A6', description: 'Secondary text and subtle elements', usage: 'secondary_text' }
    ],
    industry: 'golf_equipment',
    targetAudience: ['golf_enthusiasts', 'performance_golfers', 'recreational_players'],
    productCategories: ['golf_grips', 'golf_accessories', 'performance_equipment'],
    brandPersonality: 'premium_performance_focused_innovative',
    competitiveContext: 'competing_against_traditional_golf_grip_manufacturers',
  },
  analysis: {
    focusAreas: ['performance', 'brand_compliance', 'golf_appeal', 'target_audience_alignment'],
    customPromptAdditions: 'Focus specifically on golf equipment marketing appeal and how well the creative resonates with golfers seeking performance improvements.',
  },
};

// Post to the API
fetch('http://localhost:3000/api/admin/clients', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(jumboMaxConfig),
})
.then(response => response.json())
.then(data => console.log('JumboMax config restored:', data))
.catch(error => console.error('Error restoring config:', error));