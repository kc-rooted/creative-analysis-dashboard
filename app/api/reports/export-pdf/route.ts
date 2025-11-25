import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

export const maxDuration = 60; // 60 seconds for PDF generation

export async function POST(req: NextRequest) {
  try {
    const { htmlContent, clientId, reportType, useInlineStyles } = await req.json();

    if (!htmlContent) {
      return NextResponse.json(
        { success: false, error: 'No HTML content provided' },
        { status: 400 }
      );
    }

    console.log('[PDF Export] Starting PDF generation...');
    console.log('[PDF Export] Client:', clientId);
    console.log('[PDF Export] Report Type:', reportType);
    console.log('[PDF Export] Using inline styles:', useInlineStyles);

    // Launch Puppeteer browser
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();

    // Build HTML with print-optimized CSS
    const fullHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Report - ${clientId}</title>
  <style>
    @page {
      size: A4;
      margin: 15mm 12mm;
    }

    * {
      box-sizing: border-box;
    }

    /* Font imports - Roboto Condensed from Google Fonts */
    @import url('https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@300;400;500;600;700;800;900&display=swap');

    body {
      margin: 0;
      padding: 20px;
      font-family: 'Roboto Condensed', sans-serif;
      font-size: 16px;
      line-height: 1.6;
      color: #1a1a1a;
      background: #f9f9f9;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    /* EXPLICIT CARD STYLING FOR PDF */
    .card {
      background: #ffffff !important;
      border: none !important;
      border-radius: 12px !important;
      padding: 16px !important;
      margin-bottom: 16px !important;
      box-shadow: 0px 0px 20px 0px rgba(0, 0, 0, 0.05) !important;
      page-break-inside: avoid !important;
    }

    /* Grid layouts */
    .grid {
      display: grid !important;
      gap: 16px !important;
      margin: 16px 0 !important;
      page-break-inside: avoid !important;
    }

    .grid-cols-3 {
      grid-template-columns: repeat(3, 1fr) !important;
    }

    /* Images in cards */
    .card img {
      width: 100% !important;
      height: 192px !important;
      object-fit: cover !important;
      border-radius: 8px !important;
      margin-bottom: 12px !important;
    }

    /* Typography */
    h1 {
      font-size: 2rem;
      font-weight: 700;
      margin: 24px 0 16px 0;
      color: #0a0e13;
      page-break-after: avoid;
    }

    h2 {
      font-size: 1.5rem;
      font-weight: 800;
      margin: 20px 0 12px 0;
      color: #0a0e13;
      page-break-after: avoid;
    }

    h3, h4 {
      font-size: 1.25rem;
      font-weight: 600;
      margin: 16px 0 10px 0;
      color: #0a0e13;
      page-break-after: avoid;
    }

    p {
      margin-bottom: 12px;
      color: #374151;
      line-height: 1.7;
    }

    strong {
      font-weight: 700;
      color: #0a0e13;
    }

    /* Lists */
    ul, ol {
      margin: 12px 0;
      padding-left: 24px;
      color: #374151;
    }

    li {
      margin-bottom: 6px;
      line-height: 1.6;
    }

    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      page-break-inside: avoid;
    }

    th {
      background-color: #f3f4f6;
      font-weight: 600;
      text-align: left;
      padding: 10px 12px;
      border: 1px solid #d1d5db;
      color: #0a0e13;
    }

    td {
      padding: 8px 12px;
      border: 1px solid #d1d5db;
      color: #374151;
    }

    tr:nth-child(even) {
      background-color: #f9fafb;
    }

    /* Utility classes */
    .font-semibold {
      font-weight: 600 !important;
    }

    .font-bold {
      font-weight: 700 !important;
    }

    .text-sm {
      font-size: 0.875rem !important;
    }

    .mb-2 {
      margin-bottom: 8px !important;
    }

    .mb-3 {
      margin-bottom: 12px !important;
    }

    .mb-4 {
      margin-bottom: 16px !important;
    }

    .mb-6 {
      margin-bottom: 24px !important;
    }

    .mb-8 {
      margin-bottom: 32px !important;
    }

    .mt-8 {
      margin-top: 32px !important;
    }

    .text-2xl {
      font-size: 1.5rem !important;
    }

    .text-xl {
      font-size: 1.25rem !important;
    }

    .w-full {
      width: 100% !important;
    }

    .h-48 {
      height: 12rem !important;
    }

    .object-cover {
      object-fit: cover !important;
    }

    .rounded {
      border-radius: 0.375rem !important;
    }

    .grid-cols-2 {
      grid-template-columns: repeat(2, 1fr) !important;
    }

    .gap-2 {
      gap: 0.5rem !important;
    }

    /* Print-specific */
    @media print {
      * {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }

      h1, h2, h3, h4, h5, h6 {
        page-break-after: avoid;
      }

      .card, .grid, table {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  ${htmlContent}
</body>
</html>
    `;

    // Keep the old template for reference but don't use it
    const oldTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Report - ${clientId}</title>
  <style>
    /* Reset and base styles */
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    @page {
      size: A4;
      margin: 15mm 12mm;
    }

    /* Font imports - Meursault Variable */
    @font-face {
      font-family: 'meursault-variable';
      src: url('https://fonts.cdnfonts.com/s/95652/Meursault-Variable.woff') format('woff');
      font-weight: 100 900;
      font-style: normal;
    }

    body {
      font-family: 'meursault-variable', Georgia, serif;
      font-size: 16px;
      line-height: 1.6;
      color: #1a1a1a;
      background: #ffffff;
      padding: 15px;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    /* Typography */
    h1 {
      font-size: 2.2rem;
      font-weight: 700;
      margin-bottom: 1rem;
      margin-top: 1.5rem;
      page-break-after: avoid;
      color: #0a0e13;
    }

    h2 {
      font-size: 1.75rem;
      font-weight: 800;
      margin-top: 1.24rem;
      margin-bottom: 0.8rem;
      page-break-after: avoid;
      color: #0a0e13;
    }

    h3, h4 {
      font-size: 1.3rem;
      font-weight: 600;
      margin-top: 1rem;
      margin-bottom: 0.6rem;
      page-break-after: avoid;
      color: #0a0e13;
    }

    h5 {
      font-size: 1.1rem;
      font-weight: 500;
      margin-top: 0.8rem;
      margin-bottom: 0.5rem;
      color: #0a0e13;
    }

    h6 {
      font-size: 1rem;
      font-weight: 500;
      margin-top: 0.6rem;
      margin-bottom: 0.4rem;
      color: #0a0e13;
    }

    p {
      margin-bottom: 0.8rem;
      line-height: 1.7;
      color: #2a2a2a;
    }

    /* Lists */
    ul, ol {
      margin-bottom: 1rem;
      padding-left: 2rem;
    }

    li {
      margin-bottom: 0.4rem;
      line-height: 1.6;
      color: #2a2a2a;
    }

    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1.5rem 0;
      page-break-inside: avoid;
      font-size: 0.9rem;
    }

    th {
      background-color: #f0f4f8;
      font-weight: 600;
      text-align: left;
      padding: 10px 12px;
      border: 1px solid #d0d7de;
      color: #0a0e13;
    }

    td {
      padding: 8px 12px;
      border: 1px solid #d0d7de;
      color: #2a2a2a;
    }

    tr:nth-child(even) {
      background-color: #f9fafb;
    }

    /* Strong/Bold text */
    strong {
      font-weight: 700;
      color: #0a0e13;
    }

    /* Code blocks */
    code {
      background-color: #f5f5f5;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
      font-size: 0.85em;
    }

    pre {
      background-color: #f5f5f5;
      padding: 16px;
      border-radius: 6px;
      overflow-x: auto;
      margin: 1.5rem 0;
      page-break-inside: avoid;
    }

    pre code {
      background: none;
      padding: 0;
    }

    /* Images */
    img {
      max-width: 100%;
      height: auto;
      page-break-inside: avoid;
      margin: 0.5rem 0;
      border-radius: 8px;
    }

    /* ============================================ */
    /* AD CREATIVE CARDS - FULL STYLING */
    /* ============================================ */

    /* Grid container for ad cards */
    .grid {
      display: grid;
      gap: 16px;
      margin: 1.5rem 0;
      page-break-inside: avoid;
    }

    .grid-cols-3 {
      grid-template-columns: repeat(3, 1fr);
    }

    /* Ad creative card styling */
    .ad-creative-card {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      overflow: hidden;
      page-break-inside: avoid;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      transition: transform 0.2s ease;
    }

    .ad-creative-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(137, 205, 238, 0.15);
    }

    /* Card image container */
    .ad-creative-card .image-container {
      position: relative;
      width: 100%;
      aspect-ratio: 1 / 1;
      background: #f3f4f6;
      overflow: hidden;
    }

    .ad-creative-card .image-container img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      margin: 0;
      border-radius: 0;
    }

    /* Card content area */
    .ad-creative-card .card-content {
      padding: 12px;
    }

    /* Ad name */
    .ad-creative-card .ad-name {
      font-size: 0.75rem;
      font-weight: 600;
      color: #0a0e13;
      margin-bottom: 8px;
      line-height: 1.3;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }

    /* Metrics grid */
    .ad-creative-card .metrics {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
    }

    .ad-creative-card .metric {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .ad-creative-card .metric-label {
      font-size: 0.65rem;
      color: #6b7280;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .ad-creative-card .metric-value {
      font-size: 0.85rem;
      font-weight: 700;
      color: #0a0e13;
    }

    /* All-star rank badge */
    .ad-creative-card .all-star-badge {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
      color: #78350f;
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 0.7rem;
      font-weight: 700;
      margin-bottom: 8px;
    }

    .ad-creative-card .all-star-badge::before {
      content: '⭐';
      font-size: 0.75rem;
    }

    /* Positive metrics (green) */
    .ad-creative-card .metric-positive {
      color: #059669;
    }

    /* Negative metrics (red) */
    .ad-creative-card .metric-negative {
      color: #dc2626;
    }

    /* Section styling */
    .mt-8 {
      margin-top: 2rem;
    }

    .mb-8 {
      margin-bottom: 2rem;
    }

    .mb-6 {
      margin-bottom: 1.5rem;
    }

    .mb-4 {
      margin-bottom: 1rem;
    }

    .text-2xl {
      font-size: 1.5rem;
    }

    .text-xl {
      font-size: 1.25rem;
    }

    .font-bold {
      font-weight: 700;
    }

    .font-semibold {
      font-weight: 600;
    }

    /* Page break control */
    .page-break {
      page-break-before: always;
    }

    .no-break {
      page-break-inside: avoid;
    }

    /* Print-specific optimizations */
    @media print {
      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }

      /* Avoid breaking inside these elements */
      h1, h2, h3, h4, h5, h6,
      p, ul, ol, table, pre, blockquote,
      .ad-creative-card, .grid {
        page-break-inside: avoid;
      }

      /* Avoid page breaks after headings */
      h1, h2, h3, h4, h5, h6 {
        page-break-after: avoid;
      }

      /* Ensure cards maintain their styling */
      .ad-creative-card {
        break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  ${htmlContent}
</body>
</html>
    `;

    // Set the HTML content
    await page.setContent(fullHtml, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      },
      displayHeaderFooter: true,
      headerTemplate: '<div style="font-size: 10px; width: 100%; text-align: center;"></div>',
      footerTemplate: `
        <div style="font-size: 10px; width: 100%; text-align: center; color: #666;">
          <span class="pageNumber"></span> / <span class="totalPages"></span>
        </div>
      `
    });

    await browser.close();

    console.log('[PDF Export] PDF generated successfully');

    // Return PDF as downloadable file
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="report-${clientId}-${Date.now()}.pdf"`,
      },
    });

  } catch (error) {
    console.error('[PDF Export] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate PDF'
      },
      { status: 500 }
    );
  }
}
