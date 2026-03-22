import { NextRequest, NextResponse } from 'next/server';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const section = searchParams.get('section') || 'S1';
  const from = searchParams.get('from') || '';
  const to = searchParams.get('to') || '';
  const search = searchParams.get('search') || '';

  const host = request.headers.get('host');
  const protocol = host?.includes('localhost') ? 'http' : 'https';
  // Use the host to navigate locally
  const dashboardUrl = `${protocol}://${host}/?print=true&section=${section}&from=${from}&to=${to}&search=${search}`;

  console.log(`Generating PDF for: ${dashboardUrl}`);

  let browser;
  try {
    const isDev = process.env.NODE_ENV === 'development';
    
    let executablePath = '';
    if (isDev) {
      // Common Windows Chrome paths for local development
      executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
      // Attempt to find if it exists, otherwise fallback to standard puppeteer-core behavior
      // Note: In a real environment, you might use 'puppeteer' package for local dev
    } else {
      executablePath = await chromium.executablePath();
    }

    browser = await puppeteer.launch({
      args: isDev ? ['--no-sandbox', '--disable-setuid-sandbox'] : chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: executablePath || await chromium.executablePath(),
      headless: isDev ? true : chromium.headless,
    });

    const page = await browser.newPage();
    
    // Set a large viewport for the dashboard
    await page.setViewport({ width: 1400, height: 1000 });
    
    // Navigate and wait for the dashboard to load its data
    await page.goto(dashboardUrl, { 
      waitUntil: 'networkidle0', 
      timeout: 60000 
    });

    // Generate the PDF
    const pdf = await page.pdf({
      format: 'A3',
      landscape: true,
      printBackground: true,
      margin: { 
        top: '10mm', 
        right: '10mm', 
        bottom: '10mm', 
        left: '10mm' 
      },
    });

    return new NextResponse(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="bridge-status-${section}.pdf"`,
      },
    });
  } catch (error) {
    console.error('PDF Generation Error:', error);
    return NextResponse.json({ 
      error: 'Failed to generate PDF', 
      details: error.message 
    }, { status: 500 });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
