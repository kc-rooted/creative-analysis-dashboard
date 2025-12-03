import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 120; // 2 minutes for PDF processing

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  maxRetries: 3,
  timeout: 120000,
});

// Categories that Claude should use
const VALID_CATEGORIES = [
  'promotion',
  'product_launch',
  'campaign',
  'organic_pr_win',
  'influencer',
  'competitor',
  'market_trend',
  'budget_change',
  'technical_issue',
  'seasonality',
  'other',
];

const EXTRACTION_PROMPT = `You are an expert at extracting business context from marketing documents, reports, and presentations.

Your task is to analyze the provided document and extract relevant business context entries. Each entry represents a significant event, decision, trend, or piece of information that would be valuable for understanding business performance.

## Categories to use:
- promotion: Sales, discounts, promotional campaigns
- product_launch: New product releases, product updates
- campaign: Marketing campaigns, advertising initiatives
- organic_pr_win: Press coverage, viral moments, organic wins
- influencer: Influencer partnerships, UGC, social media wins
- competitor: Competitor activities, market movements
- market_trend: Industry trends, market shifts
- budget_change: Budget adjustments, spend changes
- technical_issue: Website issues, platform problems
- seasonality: Seasonal patterns, holiday impacts
- other: Anything else significant

## Output Format:
Return a JSON array of context entries. Each entry must have:
- category: One of the categories listed above
- title: A short, descriptive title (max 100 characters)
- description: Detailed explanation of the context (1-3 sentences)
- event_date: For point-in-time events (a single day occurrence), use this field (YYYY-MM-DD format)
- start_date: For bounded events/campaigns that span multiple days, use start_date (YYYY-MM-DD format). If only a month is mentioned, use the 1st of that month.
- end_date: When this ended (YYYY-MM-DD format, or null if ongoing). Only use with start_date for bounded events.
- magnitude: Infer the impact level from language in the document:
  - "major": Words like "significant", "dramatic", "substantial", "record-breaking", "massive", percentages > 20%
  - "moderate": Words like "notable", "meaningful", "solid", percentages 5-20%
  - "minor": Incremental changes, small adjustments, percentages < 5%
- comparison_significant: true if this context would be important for explaining year-over-year or month-over-month comparisons (e.g., one-time events, anomalies, major strategy changes)
- confidence: Your confidence in this extraction (0.0 to 1.0)

## Guidelines:
1. Extract ONLY factual information mentioned in the document
2. Do NOT invent or assume dates - if no date is mentioned, skip that entry
3. Use event_date for single-day events (product launches, viral moments, announcements)
4. Use start_date/end_date for events spanning multiple days (campaigns, promotions, seasonal periods)
5. Infer magnitude from the language used - look for intensity words, percentages, and context
6. Mark comparison_significant=true for events that would cause notable differences in YoY/MoM analysis
7. Focus on actionable business context that explains performance changes
8. Be specific in descriptions - include numbers, percentages, and specifics when available
9. Each entry should be standalone and understandable without the original document
10. Prefer fewer, high-quality entries over many low-quality ones

## Example Output:
[
  {
    "category": "promotion",
    "title": "Black Friday Sale - 30% Off Sitewide",
    "description": "Ran a 30% off sitewide promotion from Nov 24-27, driving 45% increase in orders compared to the previous week.",
    "event_date": null,
    "start_date": "2024-11-24",
    "end_date": "2024-11-27",
    "magnitude": "major",
    "comparison_significant": true,
    "confidence": 0.95
  },
  {
    "category": "organic_pr_win",
    "title": "Viral TikTok Video - 2.3M Views",
    "description": "Product video went viral on TikTok, generating 2.3M views and significant traffic spike to the website.",
    "event_date": "2024-10-15",
    "start_date": null,
    "end_date": null,
    "magnitude": "major",
    "comparison_significant": true,
    "confidence": 0.85
  },
  {
    "category": "budget_change",
    "title": "Incremental Meta Spend Increase",
    "description": "Increased Meta ad spend by 5% to test new audience segments.",
    "event_date": "2024-09-01",
    "start_date": null,
    "end_date": null,
    "magnitude": "minor",
    "comparison_significant": false,
    "confidence": 0.80
  }
]

Now analyze the document and extract all relevant business context entries. Return ONLY the JSON array, no other text.`;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const clientId = formData.get('clientId') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!clientId) {
      return NextResponse.json(
        { error: 'Client ID is required' },
        { status: 400 }
      );
    }

    console.log('[Context Extract] Processing file:', file.name, 'Size:', file.size, 'Type:', file.type);

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');

    // Determine media type
    let mediaType: 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'application/pdf';
    if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
      mediaType = 'image/jpeg';
    } else if (file.type === 'image/png') {
      mediaType = 'image/png';
    } else if (file.type === 'image/gif') {
      mediaType = 'image/gif';
    } else if (file.type === 'image/webp') {
      mediaType = 'image/webp';
    }

    console.log('[Context Extract] Sending to Claude for extraction...');

    // Send to Claude for extraction
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64Data,
              },
            },
            {
              type: 'text',
              text: EXTRACTION_PROMPT,
            },
          ],
        },
      ],
    });

    console.log('[Context Extract] Claude response received');

    // Extract the text content from Claude's response
    const textContent = response.content.find(block => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    // Parse the JSON response
    let extractedEntries;
    try {
      // Try to extract JSON from the response (handle potential markdown code blocks)
      let jsonText = textContent.text.trim();
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.slice(7);
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.slice(3);
      }
      if (jsonText.endsWith('```')) {
        jsonText = jsonText.slice(0, -3);
      }
      jsonText = jsonText.trim();

      extractedEntries = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('[Context Extract] Failed to parse Claude response:', textContent.text);
      throw new Error('Failed to parse extraction results');
    }

    // Valid magnitude values
    const VALID_MAGNITUDES = ['major', 'moderate', 'minor'];

    // Validate and clean entries
    const validatedEntries = extractedEntries
      .filter((entry: any) => {
        // Must have required fields - either event_date OR start_date
        return entry.category && entry.title && (entry.event_date || entry.start_date);
      })
      .map((entry: any) => ({
        category: VALID_CATEGORIES.includes(entry.category) ? entry.category : 'other',
        title: String(entry.title).slice(0, 200),
        description: entry.description ? String(entry.description).slice(0, 2000) : '',
        event_date: entry.event_date || null,
        start_date: entry.start_date || null,
        end_date: entry.end_date || null,
        magnitude: VALID_MAGNITUDES.includes(entry.magnitude) ? entry.magnitude : 'moderate',
        comparison_significant: typeof entry.comparison_significant === 'boolean' ? entry.comparison_significant : false,
        confidence: typeof entry.confidence === 'number' ? Math.min(1, Math.max(0, entry.confidence)) : 0.5,
        source: 'document' as const,
        source_document: file.name,
      }));

    console.log('[Context Extract] Extracted', validatedEntries.length, 'entries');

    return NextResponse.json({
      success: true,
      entries: validatedEntries,
      filename: file.name,
      totalExtracted: validatedEntries.length,
    });

  } catch (error) {
    console.error('[Context Extract] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to extract context from document',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
