# Creative Analysis Dashboard

AI-driven creative analysis pipeline dashboard for analyzing ad creatives from Meta and Google Ads.

## Features

- **Deduplicated Creative Grid View**: Display unique images with usage counts
- **Analysis Status Tracking**: Monitor pending, analyzing, completed, and failed statuses
- **Smart Prioritization**: Analyze high-usage images first
- **Campaign Impact Visibility**: See how many campaigns use each creative
- **Manual Analysis Triggers**: Analyze individual or bulk creatives on-demand
- **Tag Management**: Edit and manage creative tags
- **Real-time Statistics**: Track analysis progress and completion rates

## Setup Instructions

### 1. Prerequisites

- Node.js 18+ installed
- Google Cloud Service Account with BigQuery access
- Access to `intelligence-451803` project

### 2. Install Dependencies

```bash
cd creative-analysis-dashboard
npm install
```

### 3. Configure BigQuery Access

Place your Google Cloud service account JSON file in the project root:

```bash
# Copy your service account JSON to the project
cp /path/to/your/service-account.json ./service-account.json
```

### 4. Environment Configuration

The `.env.local` file is already configured with:

```env
GOOGLE_CLOUD_PROJECT_ID=intelligence-451803
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
BIGQUERY_DATASET=jumbomax_analytics
```

### 5. Run the Dashboard

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

## Project Structure

```
creative-analysis-dashboard/
├── app/
│   ├── api/              # API routes for BigQuery access
│   │   ├── creatives/    # Fetch deduplicated creatives
│   │   ├── stats/        # Get analysis statistics
│   │   ├── analyze/      # Trigger analysis
│   │   └── campaign-usage/ # Get campaign usage data
│   └── page.tsx          # Main dashboard page
├── components/
│   ├── CreativeCard.tsx  # Individual creative display
│   ├── DashboardStats.tsx # Statistics overview
│   └── FilterBar.tsx     # Search and filter controls
├── lib/
│   ├── bigquery.ts       # BigQuery client and queries
│   └── utils.ts          # Utility functions
└── .env.local            # Environment configuration
```

## BigQuery Tables Used

- `deduplicated_creative_analysis` - Main view with unique images
- `unified_creative_inventory` - All creative instances
- `creative_analysis` - Analysis results storage

## API Endpoints

- `GET /api/creatives` - Fetch deduplicated creatives with filtering
- `GET /api/stats` - Get analysis statistics
- `POST /api/analyze` - Trigger analysis for selected creatives
- `GET /api/campaign-usage` - Get campaign usage for an image

## Next Steps

1. **Add Claude Integration**: Implement the actual analysis with Claude API
2. **Create Detail Views**: Add modal or page for viewing full analysis results
3. **Implement Tag Editing**: Build UI for manual tag management
4. **Add Export Features**: Export analysis results to CSV/JSON
5. **Set Up Agent**: Build the daily automated analysis agent
6. **Add Authentication**: Secure the dashboard with authentication
7. **Implement Caching**: Add Redis or similar for performance
8. **Add Monitoring**: Set up error tracking and performance monitoring

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

## Troubleshooting

### BigQuery Connection Issues

1. Verify service account has required permissions:
   - `bigquery.dataViewer`
   - `bigquery.jobUser`
   - `bigquery.dataEditor` (for updates)

2. Check service account file path is correct

3. Ensure project ID matches: `intelligence-451803`

### CORS Issues with Images

The dashboard may encounter CORS issues when loading images from Facebook/Google CDNs. Solutions:

1. Use server-side proxy (recommended for production)
2. Use thumbnail URLs when available
3. Implement image caching service

### Performance

- Dashboard uses pagination (50 items per page)
- Implements client-side search filtering
- Consider adding server-side filtering for large datasets

## License

Private - Internal Use Only