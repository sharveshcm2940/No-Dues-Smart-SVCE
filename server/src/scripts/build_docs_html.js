const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

const projectRoot = path.resolve(__dirname, '../../../');
const markdownPath = path.join(projectRoot, 'docs', 'SVCE_No_Dues_Project_Documentation.md');
const outputPath = path.join(projectRoot, 'temp_documentation.html');

if (!fs.existsSync(markdownPath)) {
  console.error('Markdown file not found at:', markdownPath);
  process.exit(1);
}

const markdownContent = fs.readFileSync(markdownPath, 'utf8');

// Transform GitHub style alerts before parsing
let processedMd = markdownContent
  .replace(/> \[!IMPORTANT\]\n> (.*?)(?=\n\n|\n[^\s>])/gs, '<div class="alert alert-important"><strong>Important:</strong> $1</div>')
  .replace(/> \[!NOTE\]\n> (.*?)(?=\n\n|\n[^\s>])/gs, '<div class="alert alert-note"><strong>Note:</strong> $1</div>')
  .replace(/> \[!TIP\]\n> (.*?)(?=\n\n|\n[^\s>])/gs, '<div class="alert alert-tip"><strong>Tip:</strong> $1</div>')
  .replace(/> \[!WARNING\]\n> (.*?)(?=\n\n|\n[^\s>])/gs, '<div class="alert alert-warning"><strong>Warning:</strong> $1</div>');

const bodyHtml = marked.parse(processedMd);

const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>SVCE Smart No-Dues ERP - Project Documentation</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    
    @page {
      size: A4;
      margin: 18mm 15mm 18mm 15mm;
      @bottom-right {
        content: counter(page);
      }
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: 10.5pt;
      line-height: 1.55;
      color: #1e293b;
      background: #ffffff;
      margin: 0;
      padding: 24px;
    }

    .header-banner {
      border-bottom: 3px double #1e3a8a;
      padding-bottom: 16px;
      margin-bottom: 24px;
      text-align: center;
    }

    .header-banner h1 {
      font-size: 20pt;
      font-weight: 800;
      color: #1e3a8a;
      margin: 0 0 4px 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .header-banner h2 {
      font-size: 13pt;
      font-weight: 600;
      color: #3b82f6;
      margin: 4px 0;
    }

    .header-banner p {
      font-size: 9.5pt;
      color: #64748b;
      margin: 2px 0;
    }

    h1, h2, h3, h4 {
      color: #0f172a;
      font-weight: 700;
      page-break-after: avoid;
    }

    h1 {
      font-size: 16pt;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 6px;
      margin-top: 28px;
      margin-bottom: 14px;
    }

    h2 {
      font-size: 13pt;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 4px;
      margin-top: 22px;
      margin-bottom: 10px;
    }

    h3 {
      font-size: 11pt;
      margin-top: 16px;
      margin-bottom: 8px;
    }

    p {
      margin: 0 0 10px 0;
      text-align: justify;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 14px 0;
      font-size: 9.5pt;
      page-break-inside: avoid;
    }

    th, td {
      border: 1px solid #cbd5e1;
      padding: 7px 10px;
      text-align: left;
      vertical-align: top;
    }

    th {
      background-color: #f1f5f9;
      color: #0f172a;
      font-weight: 600;
    }

    tr:nth-child(even) {
      background-color: #f8fafc;
    }

    code {
      font-family: 'Consolas', 'Courier New', monospace;
      font-size: 9pt;
      background: #f1f5f9;
      color: #0f172a;
      padding: 1px 4px;
      border-radius: 3px;
      border: 1px solid #e2e8f0;
    }

    pre {
      background: #0f172a;
      color: #f8fafc;
      padding: 12px;
      border-radius: 6px;
      font-family: 'Consolas', 'Courier New', monospace;
      font-size: 8.5pt;
      overflow-x: auto;
      margin: 12px 0;
      page-break-inside: avoid;
    }

    pre code {
      background: transparent;
      color: inherit;
      padding: 0;
      border: none;
    }

    blockquote {
      border-left: 4px solid #3b82f6;
      background: #eff6ff;
      margin: 12px 0;
      padding: 10px 14px;
      color: #1e40af;
      font-size: 9.5pt;
      border-radius: 0 4px 4px 0;
    }

    .alert {
      border-left: 4px solid #f59e0b;
      background: #fffbeb;
      margin: 14px 0;
      padding: 12px 16px;
      color: #92400e;
      border-radius: 0 6px 6px 0;
      font-size: 9.5pt;
    }

    .alert-important {
      border-color: #dc2626;
      background: #fef2f2;
      color: #991b1b;
    }

    .alert-note {
      border-color: #2563eb;
      background: #eff6ff;
      color: #1e40af;
    }

    hr {
      border: 0;
      border-top: 1px solid #e2e8f0;
      margin: 22px 0;
    }

    ul, ol {
      margin: 6px 0 12px 0;
      padding-left: 24px;
    }

    li {
      margin-bottom: 4px;
    }

    @media print {
      body {
        padding: 0;
      }
      .no-print {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="header-banner">
    <h1>Sri Venkateswara College of Engineering</h1>
    <h2>Autonomous Institution - Affiliated to Anna University, Chennai</h2>
    <p>Pennalur, Sriperumbudur Tk, Tamil Nadu 602117 | Department of Information Technology</p>
    <p><strong>SVCE Smart No-Dues ERP System &mdash; Institutional Reference Manual</strong></p>
  </div>
  ${bodyHtml}
</body>
</html>`;

fs.writeFileSync(outputPath, fullHtml, 'utf8');
console.log('✅ Generated HTML successfully at:', outputPath);
