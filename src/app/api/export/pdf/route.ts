import { withDatabaseRequest } from '@/lib/database-request';
import { NextRequest, NextResponse } from 'next/server';
import { chromium, type Browser } from 'playwright';
import { getUserId } from '@/lib/auth-utils';

async function POSTDatabaseHandler(req: NextRequest) {
  try { await getUserId(req); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  let browser: Browser | undefined;
  try {
    const { html, title } = await req.json();

    if (typeof html !== 'string' || html.length > 2000000) return NextResponse.json({ error: '导出内容格式无效或过大' }, { status: 400 });
    const candidates = process.env.BLOCKOS_PDF_BROWSER_EXECUTABLE
      ? [{ executablePath: process.env.BLOCKOS_PDF_BROWSER_EXECUTABLE }, {}, { channel: 'chrome' }, { channel: 'msedge' }]
      : [{}, { channel: 'chrome' }, { channel: 'msedge' }];
    for (const candidate of candidates) {
      try { browser = await chromium.launch({ ...candidate, timeout: 10000 }); break; } catch {}
    }
    if (!browser) return NextResponse.json({ error: 'PDF 导出服务暂不可用，可使用浏览器打印另存为 PDF' }, { status: 503 });
    const page = await browser.newPage({ javaScriptEnabled: false });
    await page.route('**/*', route => route.abort());
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <style>
            body {
              font-family: system-ui, -apple-system, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
              padding: 40px;
              color: #333;
              line-height: 1.6;
              font-size: 14px;
            }
            h1, h2, h3, h4, h5, h6 { color: #1a1a1a; margin-top: 1.5em; margin-bottom: 0.5em; }
            h1 { font-size: 24px; border-bottom: 2px solid #eee; padding-bottom: 8px; }
            h2 { font-size: 20px; }
            h3 { font-size: 16px; }
            p { margin: 0.5em 0; }
            table { border-collapse: collapse; width: 100%; margin: 1em 0; }
            th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
            th { background: #f5f5f5; font-weight: 600; }
            code {
              background: #f5f5f5;
              padding: 2px 6px;
              border-radius: 3px;
              font-family: ui-monospace, 'Cascadia Code', 'Consolas', monospace;
              font-size: 12px;
            }
            pre {
              background: #f5f5f5;
              padding: 12px;
              border-radius: 6px;
              overflow-x: auto;
              font-family: ui-monospace, 'Cascadia Code', 'Consolas', monospace;
              font-size: 12px;
            }
            blockquote {
              border-left: 3px solid #ccc;
              padding-left: 12px;
              margin: 1em 0;
              color: #666;
              font-style: italic;
            }
            img { max-width: 100%; height: auto; }
            hr { border: none; border-top: 1px solid #ddd; margin: 1.5em 0; }
            ul, ol { margin: 0.5em 0; padding-left: 1.5em; }
            li { margin: 0.25em 0; }
            .todo-item { color: #666; }
            .todo-checked { text-decoration: line-through; color: #999; }
          </style>
        </head>
        <body>${html}</body>
      </html>
    `);

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
    });


    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="export.pdf"; filename*=UTF-8''${encodeURIComponent(typeof title === 'string' ? title + '.pdf' : 'export.pdf')}`,
      },
    });
  } catch (error) {
    console.error('PDF export error:', error);
    return NextResponse.json({ error: 'PDF 导出暂时失败，请使用浏览器打印另存为 PDF' }, { status: 500 });
  } finally { await browser?.close(); }
}

export const POST = withDatabaseRequest(POSTDatabaseHandler);
