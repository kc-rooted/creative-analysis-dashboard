import puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Converts a Recharts component to PNG image using Puppeteer
 *
 * @param chartHTML - HTML string containing the chart with inline styles
 * @param width - Width of the output image in pixels
 * @param height - Height of the output image in pixels
 * @returns Buffer containing the PNG image
 */
export async function chartToImage(
  chartHTML: string,
  width: number = 800,
  height: number = 400
): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Set viewport size
  await page.setViewport({ width, height });

  // Create full HTML document
  const fullHTML = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            margin: 0;
            padding: 20px;
            background: white;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
          }
          svg {
            max-width: 100%;
            height: auto;
          }
        </style>
      </head>
      <body>
        ${chartHTML}
      </body>
    </html>
  `;

  await page.setContent(fullHTML);

  // Wait for any animations or rendering
  await page.waitForTimeout(1000);

  // Take screenshot
  const screenshot = await page.screenshot({
    type: 'png',
    fullPage: false,
  });

  await browser.close();

  return screenshot as Buffer;
}

/**
 * Converts a chart URL to PNG image by visiting the page and taking a screenshot
 * Useful for rendering charts from your Next.js app
 *
 * @param url - Full URL to the chart page
 * @param selector - CSS selector for the chart element to screenshot
 * @returns Buffer containing the PNG image
 */
export async function chartURLToImage(
  url: string,
  selector: string = '.recharts-wrapper'
): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  await page.goto(url, {
    waitUntil: 'networkidle0',
    timeout: 30000
  });

  // Wait for chart to render
  await page.waitForSelector(selector, { timeout: 10000 });
  await page.waitForTimeout(1000); // Extra time for animations

  // Screenshot just the chart element
  const element = await page.$(selector);
  if (!element) {
    await browser.close();
    throw new Error(`Chart element not found: ${selector}`);
  }

  const screenshot = await element.screenshot({
    type: 'png',
  });

  await browser.close();

  return screenshot as Buffer;
}

/**
 * Saves a chart image buffer to a temporary file
 *
 * @param buffer - PNG buffer from chartToImage or chartURLToImage
 * @param filename - Optional filename (without extension)
 * @returns Path to the saved file
 */
export function saveChartToTemp(buffer: Buffer, filename?: string): string {
  const tempDir = os.tmpdir();
  const name = filename || `chart-${Date.now()}`;
  const filePath = path.join(tempDir, `${name}.png`);

  fs.writeFileSync(filePath, buffer);

  return filePath;
}

/**
 * Example usage for generating chart images for Google Docs:
 *
 * // Option 1: Render chart HTML directly
 * const chartHTML = `
 *   <div style="width: 800px; height: 400px;">
 *     <!-- Your Recharts SVG output here -->
 *   </div>
 * `;
 * const imageBuffer = await chartToImage(chartHTML, 800, 400);
 * const imagePath = saveChartToTemp(imageBuffer, 'revenue-chart');
 *
 * // Option 2: Screenshot from a URL
 * const imageBuffer = await chartURLToImage(
 *   'http://localhost:3000/reports/monthly?client=jumbomax&period=mtd',
 *   '.revenue-chart'
 * );
 *
 * // Then use in docx:
 * import { ImageRun } from 'docx';
 * const image = new ImageRun({
 *   data: imageBuffer,
 *   transformation: {
 *     width: 600,
 *     height: 300,
 *   },
 * });
 */
