import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

export async function POST(request: Request) {
  try {
    const { clientId, reportType, period } = await request.json();

    console.log('[PDF Export] Starting export for:', { clientId, reportType, period });

    // Launch Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Build the report URL
    const reportUrl = `http://localhost:3000/reports/${reportType}?client=${clientId}&period=${period}`;
    console.log('[PDF Export] Navigating to:', reportUrl);

    // Navigate to report page
    await page.goto(reportUrl, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Emulate print media for print CSS
    await page.emulateMediaType('print');

    // Generate PDF
    const pdf = await page.pdf({
      format: 'letter',
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: '0.5in',
        right: '0.5in',
        bottom: '0.5in',
        left: '0.5in'
      }
    });

    await browser.close();

    console.log('[PDF Export] PDF generated successfully');

    // Return PDF as download
    return new Response(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${clientId}-${reportType}-${period}.pdf"`
      }
    });

  } catch (error) {
    console.error('[PDF Export] Error generating PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
