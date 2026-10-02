const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '../../../');
const htmlDocPath = path.join(projectRoot, 'temp_documentation.html');
const pdfDocPath = path.join(projectRoot, 'SVCE_No_Dues_Project_Documentation.pdf');

if (!fs.existsSync(htmlDocPath)) {
  console.error('Error: temp_documentation.html not found at', htmlDocPath);
  process.exit(1);
}

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
console.log('Compiling publication PDF via Edge headless engine...');
console.log('Source:', htmlDocPath);
console.log('Output PDF:', pdfDocPath);

const args = [
  '--headless',
  '--disable-gpu',
  '--no-margins',
  '--no-pdf-header-footer',
  `--print-to-pdf=${pdfDocPath}`,
  htmlDocPath
];

const result = spawnSync(edgePath, args, { stdio: 'inherit' });

if (result.status === 0 && fs.existsSync(pdfDocPath)) {
  const stats = fs.statSync(pdfDocPath);
  console.log('\n======================================================');
  console.log('✅ PDF DOCUMENTATION GENERATED SUCCESSFULLY!');
  console.log('Path:', pdfDocPath);
  console.log(`Document Size: ${(stats.size / 1024).toFixed(1)} KB`);
  console.log('======================================================\n');
} else {
  console.error('❌ PDF compilation failed with exit status:', result.status);
  process.exit(1);
}
