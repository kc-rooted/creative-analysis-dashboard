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
    const { clientId, period, dashboardData, markdownContent, reportType, funnelAds } = await request.json();

    console.log('[Google Docs Export] Starting export for:', { clientId, period, reportType, hasMarkdown: !!markdownContent, hasFunnelAds: !!funnelAds });

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
    const docs = google.docs({ version: 'v1', auth: authClient as any });

    // Step 1: Generate DOCX document (choose method based on input type)
    let doc: Document;
    if (markdownContent) {
      doc = await generateMarkdownDocument(clientId, reportType, markdownContent, funnelAds);
    } else {
      doc = await generateDocument(clientId, period, dashboardData);
    }

    const buffer = await Packer.toBuffer(doc);

    // Step 2: Save DOCX to temp file
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `${clientId}-${reportType || period}-${Date.now()}.docx`);
    fs.writeFileSync(tempFilePath, buffer);

    console.log('[Google Docs Export] Generated DOCX at:', tempFilePath);

    // Step 3: Use the pre-configured shared folder
    const folderId = REPORTS_FOLDER_ID;
    console.log('[Google Docs Export] Using shared folder:', folderId);

    // Step 4: Upload DOCX to the folder
    const fileName = markdownContent
      ? `${clientId.toUpperCase()} - ${reportType || 'Report'} - ${new Date().toLocaleDateString()}`
      : `${clientId.toUpperCase()} - Performance Report - ${getPeriodLabel(period)} - ${new Date().toLocaleDateString()}`;

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

    // Step 5: Apply page background color using Google Docs API
    try {
      await docs.documents.batchUpdate({
        documentId: docId,
        requestBody: {
          requests: [
            {
              updateDocumentStyle: {
                documentStyle: {
                  background: {
                    color: {
                      color: {
                        rgbColor: {
                          red: 0.976, // #f9f9f9 = RGB(249, 249, 249)
                          green: 0.976,
                          blue: 0.976,
                        },
                      },
                    },
                  },
                },
                fields: 'background',
              },
            },
          ],
        },
      });
      console.log('[Google Docs Export] Applied background color');
    } catch (error) {
      console.error('[Google Docs Export] Failed to apply background color:', error);
      // Continue even if styling fails
    }

    // Step 6: File is now in the shared folder, which already has organization-wide sharing
    // The folder permissions cascade to files, so no additional sharing needed

    // Step 7: Clean up temp file
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

async function generateMarkdownDocument(
  clientId: string,
  reportType: string,
  markdownContent: string,
  funnelAds?: any
): Promise<Document> {
  const { marked } = await import('marked');

  // Parse markdown to tokens
  const tokens = marked.lexer(markdownContent);

  // Build document children from tokens
  const children: (Paragraph | Table)[] = [];

  // Process markdown tokens
  for (const token of tokens) {
    switch (token.type) {
      case 'heading':
        const headingLevel = token.depth === 1 ? HeadingLevel.HEADING_1 :
                           token.depth === 2 ? HeadingLevel.HEADING_2 :
                           token.depth === 3 ? HeadingLevel.HEADING_3 :
                           token.depth === 4 ? HeadingLevel.HEADING_4 :
                           token.depth === 5 ? HeadingLevel.HEADING_5 :
                           HeadingLevel.HEADING_6;

        // Heading sizes: H1=32pt, H2=28pt, H3=24pt, H4=22pt, H5=20pt, H6=20pt
        const headingSize = token.depth === 1 ? 32 :
                          token.depth === 2 ? 28 :
                          token.depth === 3 ? 24 :
                          token.depth === 4 ? 22 :
                          token.depth === 5 ? 20 : 20;

        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: token.text,
                bold: true,
                font: 'Roboto Condensed',
                size: headingSize * 2, // docx size is in half-points
                color: '000000',
              }),
            ],
            heading: headingLevel,
            spacing: { before: 400, after: 200 },
          })
        );
        break;

      case 'paragraph':
        // Parse inline formatting
        const runs = parseInlineMarkdown(token.text);
        children.push(
          new Paragraph({
            children: runs,
            spacing: { after: 200 },
          })
        );
        break;

      case 'list':
        // Handle lists
        for (const item of token.items) {
          const itemRuns = parseInlineMarkdown(item.text);
          children.push(
            new Paragraph({
              children: itemRuns,
              bullet: { level: 0 },
              spacing: { after: 100 },
            })
          );
        }
        children.push(new Paragraph({ spacing: { after: 200 } })); // Add space after list
        break;

      case 'table':
        // Handle tables
        const tableRows: TableRow[] = [];

        // Calculate fixed column widths in DXA (twips)
        // Use 9000 total width (same as funnel ads), divide by number of columns
        const numColumns = token.header?.length || token.rows[0]?.length || 1;
        const columnWidth = Math.floor(9000 / numColumns);
        const columnWidths = Array(numColumns).fill(columnWidth);

        // Check if this is the hero metrics table (has "Metric", "Value", "Analysis" columns)
        const isHeroMetricsTable = token.header?.some(cell =>
          cell.text === 'Metric' || cell.text === 'Value' || cell.text === 'Analysis'
        );
        const borderSize = isHeroMetricsTable ? 6 : 8; // Larger sizes for visibility in Google Docs

        // Header row
        if (token.header && token.header.length > 0) {
          tableRows.push(
            new TableRow({
              children: token.header.map(cell =>
                new TableCell({
                  children: [new Paragraph({
                    children: [
                      new TextRun({
                        text: cell.text,
                        bold: true,
                        font: 'Roboto Condensed',
                        size: 22,
                        color: '000000',
                      }),
                    ],
                  })],
                  width: { size: columnWidth, type: WidthType.DXA },
                  margins: {
                    top: 200,
                    bottom: 200,
                    left: 200,
                    right: 200,
                  },
                })
              ),
            })
          );
        }

        // Data rows
        for (const row of token.rows) {
          tableRows.push(
            new TableRow({
              children: row.map(cell =>
                new TableCell({
                  children: [new Paragraph({
                    children: parseInlineMarkdown(cell.text), // Parse markdown in table cells
                  })],
                  width: { size: columnWidth, type: WidthType.DXA },
                  margins: {
                    top: 200,
                    bottom: 200,
                    left: 200,
                    right: 200,
                  },
                })
              ),
            })
          );
        }

        children.push(
          new Table({
            rows: tableRows,
            width: { size: 9000, type: WidthType.DXA },
            columnWidths: columnWidths,
            borders: {
              top: { style: BorderStyle.SINGLE, size: borderSize, color: 'D1D5DB' },
              bottom: { style: BorderStyle.SINGLE, size: borderSize, color: 'D1D5DB' },
              left: { style: BorderStyle.SINGLE, size: borderSize, color: 'D1D5DB' },
              right: { style: BorderStyle.SINGLE, size: borderSize, color: 'D1D5DB' },
              insideHorizontal: { style: BorderStyle.SINGLE, size: borderSize, color: 'D1D5DB' },
              insideVertical: { style: BorderStyle.SINGLE, size: borderSize, color: 'D1D5DB' },
            },
          })
        );
        children.push(new Paragraph({ spacing: { after: 400 } })); // Add space after table
        break;

      case 'space':
        // Skip extra spacing - paragraphs already have spacing
        break;

      case 'hr':
        // Skip horizontal rules - we don't want them in the export
        break;

      case 'blockquote':
        // Blockquote
        const quoteRuns = parseInlineMarkdown(token.text);
        children.push(
          new Paragraph({
            children: quoteRuns,
            spacing: { after: 200, left: 720 }, // Indent blockquotes
            italics: true,
          })
        );
        break;

      case 'code':
        // Code block
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: token.text,
                font: 'Roboto Condensed',
                size: 22,
                color: '000000',
              }),
            ],
            spacing: { after: 200 },
            shading: {
              fill: 'F5F5F5',
            },
          })
        );
        break;
    }
  }

  // Add funnel ads section if available
  if (funnelAds) {
    console.log('[Google Docs Export] Adding funnel ads section');

    // Add "Top Ads by Funnel Stage" heading
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Top Ads by Funnel Stage',
            bold: true,
            font: 'Roboto Condensed',
            size: 28 * 2, // H2 size
            color: '000000',
          }),
        ],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 600, after: 400 },
      })
    );

    const stageLabels: Record<string, string> = {
      'TOFU': 'Top of Funnel',
      'MOFU': 'Middle of Funnel',
      'BOFU': 'Bottom of Funnel'
    };

    // Add each funnel stage
    for (const stage of ['TOFU', 'MOFU', 'BOFU']) {
      if (funnelAds[stage]?.length > 0) {
        // Stage heading
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${stage} (${stageLabels[stage]})`,
                bold: true,
                font: 'Roboto Condensed',
                size: 24 * 2, // H3 size
                color: '000000',
              }),
            ],
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 400, after: 200 },
          })
        );

        // Add ads as a table (3 columns for 3 ads)
        const ads = funnelAds[stage].slice(0, 3);
        const tableRows: TableRow[] = [];

        // Create cells for each ad
        const adCells: TableCell[] = [];
        for (const ad of ads) {
          const cellContent: Paragraph[] = [];

          // Ad name
          cellContent.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: ad.ad_name || 'Untitled Ad',
                  bold: true,
                  font: 'Roboto Condensed',
                  size: 20,
                  color: '000000',
                }),
              ],
              spacing: { after: 100 },
            })
          );

          // Metrics
          const metrics: string[] = [];
          if (ad.all_star_rank !== null && ad.all_star_rank !== undefined) {
            metrics.push(`⭐ All-Star Rank: ${ad.all_star_rank}`);
          }
          if (ad.roas !== null && ad.roas !== undefined) {
            metrics.push(`ROAS: ${ad.roas.toFixed(2)}x`);
          }
          if (ad.ctr_percent !== null && ad.ctr_percent !== undefined) {
            metrics.push(`CTR: ${ad.ctr_percent.toFixed(2)}%`);
          }
          if (ad.cpc !== null && ad.cpc !== undefined) {
            metrics.push(`CPC: $${ad.cpc.toFixed(2)}`);
          }

          for (const metric of metrics) {
            cellContent.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: metric,
                    font: 'Roboto Condensed',
                    size: 18,
                    color: '374151',
                  }),
                ],
                spacing: { after: 50 },
              })
            );
          }

          // Add image URL note at bottom
          const imageUrl = ad.creative_type === 'VIDEO' && ad.thumbnail_url
            ? ad.thumbnail_url
            : ad.image_url || ad.thumbnail_url;

          if (imageUrl) {
            cellContent.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: '📷 View ad creative',
                    font: 'Roboto Condensed',
                    size: 16,
                    color: '89cdee',
                    italics: true,
                  }),
                ],
                spacing: { before: 100 },
              })
            );
          }

          adCells.push(
            new TableCell({
              children: cellContent,
              width: { size: 3000, type: WidthType.DXA }, // Fixed width in twips (3000 twips = ~2 inches)
              shading: {
                fill: 'FFFFFF',
              },
              margins: {
                top: 200,
                bottom: 200,
                left: 200,
                right: 200,
              },
            })
          );
        }

        // Fill empty cells if less than 3 ads
        while (adCells.length < 3) {
          adCells.push(
            new TableCell({
              children: [new Paragraph('')],
              width: { size: 3000, type: WidthType.DXA },
              shading: {
                fill: 'F9F9F9',
              },
            })
          );
        }

        tableRows.push(new TableRow({ children: adCells }));

        children.push(
          new Table({
            rows: tableRows,
            width: { size: 9000, type: WidthType.DXA }, // Total width (3 columns × 3000 twips)
            columnWidths: [3000, 3000, 3000],
            borders: {
              top: { style: BorderStyle.SINGLE, size: 2, color: 'D1D5DB' },
              bottom: { style: BorderStyle.SINGLE, size: 2, color: 'D1D5DB' },
              left: { style: BorderStyle.SINGLE, size: 2, color: 'D1D5DB' },
              right: { style: BorderStyle.SINGLE, size: 2, color: 'D1D5DB' },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: 'D1D5DB' },
              insideVertical: { style: BorderStyle.SINGLE, size: 2, color: 'D1D5DB' },
            },
          })
        );

        // Add spacing after table
        children.push(new Paragraph({ spacing: { after: 400 } }));
      }
    }
  }

  // Add footer
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '---',
          font: 'Roboto Condensed',
          size: 22,
          color: '000000',
        }),
      ],
      spacing: { before: 800, after: 200 },
    })
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '🤖 Generated with AI Analytics Dashboard • Rooted Solutions',
          font: 'Roboto Condensed',
          size: 20,
          color: '000000',
          italics: true,
        }),
      ],
      alignment: AlignmentType.CENTER,
    })
  );

  // Build document
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
        children,
      },
    ],
  });

  return doc;
}

function parseInlineMarkdown(text: string): TextRun[] {
  const runs: TextRun[] = [];

  // Base font settings for all text
  const baseFontSettings = {
    font: 'Roboto Condensed',
    size: 22, // 11pt
    color: '000000',
  };

  // Simple regex-based inline parsing
  // Handles **bold**, *italic*, and plain text
  const boldPattern = /\*\*(.*?)\*\*/g;
  const italicPattern = /\*(.*?)\*/g;

  let lastIndex = 0;
  let match;

  // First pass: find bold text
  const boldRanges: { start: number; end: number; text: string }[] = [];
  while ((match = boldPattern.exec(text)) !== null) {
    boldRanges.push({
      start: match.index,
      end: match.index + match[0].length,
      text: match[1],
    });
  }

  // Build runs with formatting
  if (boldRanges.length === 0) {
    // No bold text, check for italics or return plain text
    const italicRanges: { start: number; end: number; text: string }[] = [];
    while ((match = italicPattern.exec(text)) !== null) {
      italicRanges.push({
        start: match.index,
        end: match.index + match[0].length,
        text: match[1],
      });
    }

    if (italicRanges.length === 0) {
      // Plain text
      runs.push(new TextRun({ text, ...baseFontSettings }));
    } else {
      // Build with italics
      let pos = 0;
      for (const range of italicRanges) {
        if (pos < range.start) {
          runs.push(new TextRun({ text: text.substring(pos, range.start), ...baseFontSettings }));
        }
        runs.push(new TextRun({ text: range.text, italics: true, ...baseFontSettings }));
        pos = range.end;
      }
      if (pos < text.length) {
        runs.push(new TextRun({ text: text.substring(pos), ...baseFontSettings }));
      }
    }
  } else {
    // Build with bold text
    let pos = 0;
    for (const range of boldRanges) {
      if (pos < range.start) {
        runs.push(new TextRun({ text: text.substring(pos, range.start), ...baseFontSettings }));
      }
      runs.push(new TextRun({ text: range.text, bold: true, ...baseFontSettings }));
      pos = range.end;
    }
    if (pos < text.length) {
      runs.push(new TextRun({ text: text.substring(pos), ...baseFontSettings }));
    }
  }

  return runs;
}
