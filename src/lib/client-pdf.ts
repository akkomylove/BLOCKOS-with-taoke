import { escapeHtml, sanitizeHtml } from '@/lib/sanitize';

export async function createClientPdf(html: string, title: string): Promise<Blob> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
  const frame = document.createElement('iframe');
  frame.title = 'PDF 生成环境';
  frame.setAttribute('aria-hidden', 'true');
  frame.setAttribute('sandbox', 'allow-same-origin');
  frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px;height:1123px;border:0';
  try {
    const loaded = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('PDF 文档准备超时，请重试')), 15000);
      frame.onload = () => { clearTimeout(timer); resolve(); };
    });
    frame.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>
      *{box-sizing:border-box}html{background:#fff;color:#1f2329}body{width:794px;margin:0;padding:40px;font:15px/1.7 Arial,"Microsoft YaHei",sans-serif;overflow-wrap:anywhere;background:#fff;color:#1f2329}
      h1,h2,h3{line-height:1.4}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px}pre{white-space:pre-wrap;background:#f7f8fa;padding:12px}img{max-width:100%;height:auto}blockquote{border-left:3px solid #3370ff;padding-left:12px}
      </style></head><body><h1>${escapeHtml(title)}</h1>${sanitizeHtml(html)}</body></html>`;
    document.body.appendChild(frame);
    await loaded;
    const body = frame.contentDocument?.body;
    if (!body) throw new Error('PDF 文档准备失败');
    await frame.contentDocument?.fonts.ready;
    const height = Math.max(body.scrollHeight, body.getBoundingClientRect().height);
    if (Math.ceil(height / 1000) > 100) throw new Error('文档超过 100 页，请分段导出 PDF');
    const lineBoxes: DOMRect[] = [];
    const walker = frame.contentDocument!.createTreeWalker(body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const range = frame.contentDocument!.createRange();
      range.selectNodeContents(walker.currentNode);
      lineBoxes.push(...Array.from(range.getClientRects()));
    }
    const top = body.getBoundingClientRect().top;
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
    pdf.setProperties({ title });
    let offset = 0, page = 0;
    while (offset < height) {
      let end = Math.min(offset + 1123, height);
      // Move a page boundary above a text line instead of clipping its glyphs.
      const crossing = lineBoxes.filter(box => box.top - top < end && box.bottom - top > end);
      if (crossing.length) {
        const safeEnd = Math.floor(Math.min(...crossing.map(box => box.top - top)));
        if (safeEnd > offset + 900) end = safeEnd;
      }
      const canvas = await html2canvas(body, {
        backgroundColor: '#ffffff', scale: 1.5, width: 794, height: end - offset,
        x: 0, y: offset, windowWidth: 794, windowHeight: 1123, scrollX: 0, scrollY: 0,
        useCORS: true, allowTaint: false, logging: false, imageTimeout: 10000,
      });
      if (page > 0) pdf.addPage();
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 10, 10, 190, canvas.height / canvas.width * 190);
      offset = end;
      page++;
    }
    return pdf.output('blob');
  } finally { frame.remove(); }
}
