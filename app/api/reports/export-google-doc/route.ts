import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Configuration for Google Drive folder and sharing
const REPORTS_FOLDER_ID = '1rR77jye0X8ZO2tXWLSHw2JJ4eU6u-ebG'; // Shared folder with service account
const ORGANIZATION_DOMAIN = 'rootedsolutions.co';
const OWNER_EMAIL = process.env.GOOGLE_WORKSPACE_OWNER_EMAIL || 'kane@rootedsolutions.co';

interface DashboardData {
  totalRevenue: any;
  blendedROAS: any;
  emailPerformance?: any;
  paidMediaSpend: any;
  googleSpend?: any;
  googleRevenue?: any;
  googleROAS?: any;
  metaSpend?: any;
  metaRevenue?: any;
  metaROAS?: any;
}

export async function POST(request: Request) {
  try {
    const { clientId, period, dashboardData } = await request.json();

    console.log('[Google Docs Export] Starting export for:', { clientId, period });

    // Initialize Google Auth
    const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (!keyPath) {
      throw new Error('GOOGLE_APPLICATION_CREDENTIALS not set');
    }

    const credentials = JSON.parse(fs.readFileSync(keyPath, 'utf8'));

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/documents',
      ],
    });

    const authClient = await auth.getClient();
    const drive = google.drive({ version: 'v3', auth: authClient as any });

    // Step 1: Generate DOCX document
    const doc = await generateDocument(clientId, period, dashboardData);
    const buffer = await Packer.toBuffer(doc);

    // Step 2: Save DOCX to temp file
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `${clientId}-${period}-${Date.now()}.docx`);
    fs.writeFileSync(tempFilePath, buffer);

    console.log('[Google Docs Export] Generated DOCX at:', tempFilePath);

    // Step 3: Use the pre-configured shared folder
    const folderId = REPORTS_FOLDER_ID;
    console.log('[Google Docs Export] Using shared folder:', folderId);

    // Step 4: Upload DOCX to the folder
    const fileName = `${clientId.toUpperCase()} - Performance Report - ${getPeriodLabel(period)} - ${new Date().toLocaleDateString()}`;

    const fileMetadata: any = {
      name: fileName,
      mimeType: 'application/vnd.google-apps.document', // Auto-convert to Google Docs
      parents: [folderId],
    };

    const media = {
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      body: fs.createReadStream(tempFilePath),
    };

    const uploadResponse = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink',
      supportsAllDrives: true,
    });

    const docId = uploadResponse.data.id!;
    const webViewLink = uploadResponse.data.webViewLink!;

    console.log('[Google Docs Export] Uploaded to Google Drive:', docId);

    // Step 5: File is now in the shared folder, which already has organization-wide sharing
    // The folder permissions cascade to files, so no additional sharing needed

    // Step 6: Clean up temp file
    fs.unlinkSync(tempFilePath);

    console.log('[Google Docs Export] File now in your Drive, no longer consuming service account quota');

    return NextResponse.json({
      success: true,
      docId,
      webViewLink,
      fileName,
      message: 'Report successfully exported to Google Docs and shared with organization',
    });

  } catch (error) {
    console.error('[Google Docs Export] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to export to Google Docs',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

function getPeriodLabel(period: string): string {
  switch (period) {
    case '7d': return 'Last 7 Days';
    case 'mtd': return 'Month to Date';
    case '30d': return 'Last 30 Days';
    case 'ytd': return 'Year to Date';
    default: return period;
  }
}

async function generateDocument(
  clientId: string,
  period: string,
  data: DashboardData
): Promise<Document> {
  const periodLabel = getPeriodLabel(period);
  const periodKey = getPeriodKey(period);

  // Helper to format currency
  const formatCurrency = (value: number | string | undefined) => {
    if (value === undefined || value === null) return 'N/A';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numValue);
  };

  // Helper to format percentage
  const formatPercent = (value: number | string | undefined) => {
    if (value === undefined || value === null) return 'N/A';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return 'N/A';
    return `${numValue > 0 ? '+' : ''}${numValue.toFixed(1)}%`;
  };

  // Helper to format ROAS
  const formatROAS = (value: number | string | undefined) => {
    if (value === undefined || value === null) return 'N/A';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return 'N/A';
    return `${numValue.toFixed(2)}x`;
  };

  // Build document sections
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720, // 0.5 inch
              right: 720,
              bottom: 720,
              left: 720,
            },
          },
        },
        children: [
          // Title
          new Paragraph({
            text: 'Performance Report',
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 200 },
          }),

          // Subtitle
          new Paragraph({
            children: [
              new TextRun({
                text: `${clientId.toUpperCase()} • ${periodLabel}`,
                size: 28,
                color: '666666',
              }),
            ],
            spacing: { after: 400 },
          }),

          new Paragraph({
            text: `Generated on ${new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}`,
            spacing: { after: 600 },
          }),

          // Executive Summary Header
          new Paragraph({
            text: 'Executive Summary',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 300 },
          }),

          // KPI Table
          createKPITable(data, periodKey, formatCurrency, formatPercent, formatROAS),

          // Platform Performance Header
          new Paragraph({
            text: 'Platform Performance',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 600, after: 300 },
          }),

          // Platform breakdown
          ...createPlatformSection(data, periodKey, formatCurrency, formatROAS, formatPercent),

          // Footer
          new Paragraph({
            text: '---',
            spacing: { before: 800, after: 200 },
          }),

          new Paragraph({
            children: [
              new TextRun({
                text: '🤖 Generated with AI Analytics Dashboard • Rooted Solutions',
                size: 20,
                color: '999999',
                italics: true,
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
        ],
      },
    ],
  });

  return doc;
}

function getPeriodKey(period: string): 'sevenDay' | 'monthToDate' | 'thirtyDay' | 'yearToDate' {
  switch (period) {
    case '7d': return 'sevenDay';
    case 'mtd': return 'monthToDate';
    case '30d': return 'thirtyDay';
    case 'ytd': return 'yearToDate';
    default: return 'monthToDate';
  }
}

function createKPITable(
  data: DashboardData,
  periodKey: string,
  formatCurrency: (v: number | string | undefined) => string,
  formatPercent: (v: number | string | undefined) => string,
  formatROAS: (v: number | string | undefined) => string
): Table {
  const rows = [
    // Header row
    new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ text: 'Metric', bold: true })],
          width: { size: 40, type: WidthType.PERCENTAGE },
        }),
        new TableCell({
          children: [new Paragraph({ text: 'Value', bold: true })],
          width: { size: 30, type: WidthType.PERCENTAGE },
        }),
        new TableCell({
          children: [new Paragraph({ text: 'YoY Growth', bold: true })],
          width: { size: 30, type: WidthType.PERCENTAGE },
        }),
      ],
    }),
  ];

  // Total Revenue
  const revenueData = data.totalRevenue?.periodData?.[periodKey];
  if (revenueData) {
    rows.push(new TableRow({
      children: [
        new TableCell({ children: [new Paragraph('Total Revenue')] }),
        new TableCell({ children: [new Paragraph(formatCurrency(revenueData.value))] }),
        new TableCell({ children: [new Paragraph(formatPercent(revenueData.trend))] }),
      ],
    }));
  }

  // Blended ROAS
  const roasData = data.blendedROAS?.periodData?.[periodKey];
  if (roasData) {
    rows.push(new TableRow({
      children: [
        new TableCell({ children: [new Paragraph('Blended ROAS')] }),
        new TableCell({ children: [new Paragraph(formatROAS(roasData.value))] }),
        new TableCell({ children: [new Paragraph(formatPercent(roasData.trend))] }),
      ],
    }));
  }

  // Paid Media Spend
  const spendData = data.paidMediaSpend?.periodData?.[periodKey];
  if (spendData) {
    rows.push(new TableRow({
      children: [
        new TableCell({ children: [new Paragraph('Paid Media Spend')] }),
        new TableCell({ children: [new Paragraph(formatCurrency(spendData.value))] }),
        new TableCell({ children: [new Paragraph(formatPercent(spendData.trend))] }),
      ],
    }));
  }

  // Email Revenue (if available)
  const emailData = data.emailPerformance?.periodData?.[periodKey];
  if (emailData) {
    rows.push(new TableRow({
      children: [
        new TableCell({ children: [new Paragraph('Email Revenue')] }),
        new TableCell({ children: [new Paragraph(formatCurrency(emailData.value))] }),
        new TableCell({ children: [new Paragraph(formatPercent(emailData.trend))] }),
      ],
    }));
  }

  return new Table({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1 },
      bottom: { style: BorderStyle.SINGLE, size: 1 },
      left: { style: BorderStyle.SINGLE, size: 1 },
      right: { style: BorderStyle.SINGLE, size: 1 },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
      insideVertical: { style: BorderStyle.SINGLE, size: 1 },
    },
  });
}

function createPlatformSection(
  data: DashboardData,
  periodKey: string,
  formatCurrency: (v: number | string | undefined) => string,
  formatROAS: (v: number | string | undefined) => string,
  formatPercent: (v: number | string | undefined) => string
): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  // Google Ads
  const googleSpend = data.googleSpend?.periodData?.[periodKey];
  const googleRevenue = data.googleRevenue?.periodData?.[periodKey];
  const googleROAS = data.googleROAS?.periodData?.[periodKey];

  if (googleSpend && googleRevenue && googleROAS) {
    paragraphs.push(
      new Paragraph({
        text: 'Google Ads',
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 400, after: 200 },
      }),
      new Paragraph({
        text: `• Spend: ${formatCurrency(googleSpend.value)} (${formatPercent(googleSpend.trend)} YoY)`,
        spacing: { after: 100 },
      }),
      new Paragraph({
        text: `• Revenue: ${formatCurrency(googleRevenue.value)} (${formatPercent(googleRevenue.trend)} YoY)`,
        spacing: { after: 100 },
      }),
      new Paragraph({
        text: `• ROAS: ${formatROAS(googleROAS.value)} (${formatPercent(googleROAS.trend)} YoY)`,
        spacing: { after: 200 },
      })
    );
  }

  // Meta (Facebook/Instagram)
  const metaSpend = data.metaSpend?.periodData?.[periodKey];
  const metaRevenue = data.metaRevenue?.periodData?.[periodKey];
  const metaROAS = data.metaROAS?.periodData?.[periodKey];

  if (metaSpend && metaRevenue && metaROAS) {
    paragraphs.push(
      new Paragraph({
        text: 'Meta (Facebook & Instagram)',
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 400, after: 200 },
      }),
      new Paragraph({
        text: `• Spend: ${formatCurrency(metaSpend.value)} (${formatPercent(metaSpend.trend)} YoY)`,
        spacing: { after: 100 },
      }),
      new Paragraph({
        text: `• Revenue: ${formatCurrency(metaRevenue.value)} (${formatPercent(metaRevenue.trend)} YoY)`,
        spacing: { after: 100 },
      }),
      new Paragraph({
        text: `• ROAS: ${formatROAS(metaROAS.value)} (${formatPercent(metaROAS.trend)} YoY)`,
        spacing: { after: 200 },
      })
    );
  }

  return paragraphs;
}
