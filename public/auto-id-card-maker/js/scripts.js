const STORAGE_KEY = 'bill-layne-auto-id-card-maker';
const DEFAULT_AGENT_NAME = 'Bill Layne Insurance Agency';
const DEFAULT_AGENT_PHONE = '(336) 835-1993';

const NAIC_NUMBERS = {
  Nationwide: '25453',
  Progressive: '24260',
  'National General': '23728',
  Travelers: '25658',
  'NC Grange Mutual': '14129',
  Alamance: '10190',
  'Universal Property': '10783',
  Dairyland: '21164'
};

const CLAIMS_PHONE_NUMBERS = {
  Nationwide: '1-800-421-3535',
  Progressive: '1-800-776-4737',
  'National General': '1-800-325-1088',
  Travelers: '1-800-252-4633',
  'NC Grange Mutual': '1-800-438-4778',
  Alamance: '1-866-985-9031',
  'Universal Property': '1-888-322-2126',
  Dairyland: '1-800-334-0090'
};

const COMPANY_LOGOS = {
  Nationwide: 'https://i.imgur.com/GWZBW1W.png',
  Progressive: 'https://github.com/BillLayne/bill-layne-images/blob/main/logos/Progressive%20Logo.png?raw=true',
  'National General': 'https://i.imgur.com/nZZmaLh.png',
  Alamance: 'https://i.imgur.com/inn1Sog.png',
  Travelers: 'https://i.imgur.com/I6ONc0K.png',
  'NC Grange Mutual': 'https://github.com/BillLayne/bill-layne-images/blob/main/logos/NC%20Grange%20Logo.png?raw=true',
  'Universal Property': 'https://i.imgur.com/otPRl9b.png',
  Dairyland: 'https://i.imgur.com/nZZmaLh.png'
};

const form = document.getElementById('autoIdCardForm');
const previewFrame = document.getElementById('previewFrame');
const printButton = document.getElementById('printButton');
const downloadButton = document.getElementById('downloadButton');
const gmailButton = document.getElementById('gmailButton');
const toastRoot = document.getElementById('toastRoot');

let latestHtml = '';

document.addEventListener('DOMContentLoaded', () => {
  ensureDefaultDates();
  attachEvents();
  updateVehicleFields();
  renderEmptyPreview();
});

function attachEvents() {
  document.getElementById('idCardCompany').addEventListener('change', updateCompanyInfo);
  document.getElementById('idCardVehicleCount').addEventListener('change', updateVehicleFields);
  document.getElementById('idCardEffectiveDate').addEventListener('change', updateExpirationDate);
  document.getElementById('saveButton').addEventListener('click', saveFormData);
  document.getElementById('loadButton').addEventListener('click', loadFormData);
  document.getElementById('clearButton').addEventListener('click', clearForm);
  printButton.addEventListener('click', printPreview);
  downloadButton.addEventListener('click', downloadHtml);
  gmailButton.addEventListener('click', copyAndOpenGmail);
  form.addEventListener('submit', handleGenerate);
}

function ensureDefaultDates() {
  const today = new Date();
  const oneYear = new Date(today);
  oneYear.setFullYear(oneYear.getFullYear() + 1);

  const effective = document.getElementById('idCardEffectiveDate');
  const expiration = document.getElementById('idCardExpirationDate');

  if (!effective.value) {
    effective.value = toInputDate(today);
  }

  if (!expiration.value) {
    expiration.value = toInputDate(oneYear);
  }
}

function toInputDate(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-');
}

function updateCompanyInfo() {
  const company = valueOf('idCardCompany');
  document.getElementById('idCardNAIC').value = NAIC_NUMBERS[company] || '';
}

function updateVehicleFields() {
  const vehicleCount = Number(valueOf('idCardVehicleCount') || '1');
  for (let index = 1; index <= 4; index += 1) {
    const section = document.getElementById(`vehicle${index}Section`);
    section.hidden = index > vehicleCount;
  }
}

function updateExpirationDate() {
  const effectiveDate = valueOf('idCardEffectiveDate');
  if (!effectiveDate) {
    return;
  }

  const [year, month, day] = effectiveDate.split('-').map(Number);
  const nextYear = new Date(year, month - 1, day);
  nextYear.setFullYear(nextYear.getFullYear() + 1);
  document.getElementById('idCardExpirationDate').value = toInputDate(nextYear);
}

function handleGenerate(event) {
  event.preventDefault();

  if (!form.reportValidity()) {
    showToast('Fill in the required fields before generating the ID cards.', 'error');
    return;
  }

  const data = collectFormData();
  latestHtml = generateAutoIdCardHtml(data);
  previewFrame.srcdoc = latestHtml;
  enablePreviewActions();
  showToast('Auto ID cards generated.', 'success');
}

function collectFormData() {
  const vehicleCount = Number(valueOf('idCardVehicleCount') || '1');
  const vehicles = [];
  const additionalDrivers = valueOf('idCardAdditionalDrivers')
    .split(/\r?\n/)
    .map((driver) => driver.trim())
    .filter(Boolean);

  for (let index = 1; index <= vehicleCount; index += 1) {
    vehicles.push({
      year: valueOf(`vehicle${index}Year`) || '2024',
      make: valueOf(`vehicle${index}Make`) || 'Make',
      model: valueOf(`vehicle${index}Model`) || 'Model',
      vin: valueOf(`vehicle${index}VIN`) || 'VIN123456789'
    });
  }

  const company = valueOf('idCardCompany');

  return {
    company,
    policyNumber: valueOf('idCardPolicyNumber'),
    naic: valueOf('idCardNAIC') || NAIC_NUMBERS[company] || '00000',
    effectiveDate: valueOf('idCardEffectiveDate'),
    expirationDate: valueOf('idCardExpirationDate'),
    driverName: valueOf('idCardDriverName'),
    additionalDrivers,
    copyCount: Number(valueOf('idCardCopyCount') || '1'),
    vehicles,
    claimsPhone: CLAIMS_PHONE_NUMBERS[company] || '1-800-CLAIMS',
    companyLogoUrl: COMPANY_LOGOS[company] || '',
    agentName: DEFAULT_AGENT_NAME,
    agentPhone: DEFAULT_AGENT_PHONE
  };
}

function generateAutoIdCardHtml(data) {
  const cardSets = [];

  data.vehicles.forEach((vehicle, index) => {
    for (let copyIndex = 0; copyIndex < data.copyCount; copyIndex += 1) {
      const logoMarkup = data.companyLogoUrl
        ? `<img src="${escapeHtml(data.companyLogoUrl)}" style="height: 30px; width: auto;" alt="${escapeHtml(data.company)}">`
        : `<div style="font-weight: bold; font-size: 12px;">${escapeHtml(data.company)}</div>`;
      const allDrivers = [data.driverName, ...data.additionalDrivers].filter(Boolean);
      const insuredListClass = allDrivers.length >= 4 ? 'insured-list compact' : allDrivers.length === 3 ? 'insured-list tight' : 'insured-list';
      const insuredMarkup = allDrivers.map((driver) => `<div>${escapeHtml(driver)}</div>`).join('');
      const copyBadge = data.copyCount > 1 ? `<div class="copy-badge">Copy ${copyIndex + 1} of ${data.copyCount}</div>` : '';

      cardSets.push(`
        <div class="card-container">
          ${copyBadge}
          <div class="cut-outline">
          <div class="id-card">
            <div class="card-header">
              <div style="font-size: 10px;">
                <strong style="color: #004080;">NORTH CAROLINA</strong><br>
                <strong>AUTO INSURANCE ID CARD</strong>
              </div>
              ${logoMarkup}
            </div>

            <div class="card-info">
              <div class="insured-block">
                <strong>INSURED:</strong>
                <div class="${insuredListClass}">${insuredMarkup}</div>
              </div>

              <div>
                <strong>POLICY NUMBER:</strong> ${escapeHtml(data.policyNumber)}
              </div>

              <div class="date-row">
                <div><strong>EFF DATE:</strong> ${formatDateForCard(data.effectiveDate)}</div>
                <div><strong>EXP DATE:</strong> ${formatDateForCard(data.expirationDate)}</div>
              </div>

              <div>
                <strong>VEHICLE ${index + 1}:</strong><br>
                ${escapeHtml(vehicle.year)} ${escapeHtml(vehicle.make)} ${escapeHtml(vehicle.model)}
              </div>

              <div class="vin-line">
                <strong>VIN:</strong> ${escapeHtml(vehicle.vin)}
              </div>
            </div>

            <div class="naic-number">NAIC# ${escapeHtml(data.naic)}</div>
          </div>

          <div class="fold-line">
            <span>Fold Here</span>
          </div>

          <div class="id-card back-card">
            <div class="back-card-inner">
            <div class="limits-title">NORTH CAROLINA MINIMUM LIABILITY LIMITS</div>

            <div class="back-copy">
              <div class="limits-list">
                <strong>Bodily Injury:</strong> $50,000 per person / $100,000 per accident<br>
                <strong>Property Damage:</strong> $50,000 per accident<br>
                <strong>Uninsured Motorist:</strong> $50,000 per person / $100,000 per accident<br>
                <strong>Underinsured Motorist:</strong> $50,000 per person / $100,000 per accident
              </div>

              <div class="important-block">
                <strong>IMPORTANT:</strong> This card must be carried in the insured vehicle for presentation upon demand. Coverage is provided where required by state law.
              </div>

              <div class="claims-block">
                <strong class="claims-label">${escapeHtml(data.company)} 24-Hour Claims:</strong> ${escapeHtml(data.claimsPhone)}<br>
                <strong>Agent:</strong> ${escapeHtml(data.agentName)}<br>
                <span>${escapeHtml(data.agentPhone)}</span>
              </div>
            </div>
            </div>
          </div>
          </div>

          <div class="cut-line-wrap">
            <div class="cut-line"></div>
            <div class="cut-text">Cut around this set, fold on the center line, then laminate</div>
          </div>
        </div>
      `);
    }
  });

  const pages = [];
  for (let index = 0; index < cardSets.length; index += 2) {
    const pageSets = cardSets.slice(index, index + 2).join('');
    const pageBreakClass = index + 2 < cardSets.length ? 'page-break' : '';
    pages.push(`<div class="page-sheet ${pageBreakClass}">${pageSets}</div>`);
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Auto Insurance ID Cards</title>
  <style>
    * { box-sizing: border-box; }
    @page {
      size: letter;
      margin: 0.5in;
    }
    body {
      margin: 0;
      font-family: Arial, sans-serif;
      color: #111827;
      background: #f4f6f8;
    }
    .page-sheet {
      width: 8.5in;
      min-height: 10in;
      margin: 0 auto;
      padding: 0.18in 0.2in;
      display: grid;
      grid-template-rows: repeat(2, minmax(0, 1fr));
      align-content: start;
      gap: 0.16in;
    }
    .page-break {
      page-break-after: always;
    }
    .card-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      gap: 10px;
      padding: 6px 10px 10px;
    }
    .copy-badge {
      font-size: 10px;
      font-weight: bold;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #4b5563;
    }
    .cut-outline {
      border: 1px dashed #9ca3af;
      border-radius: 14px;
      padding: 10px 10px 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      background: #fff;
    }
    .id-card {
      width: 3.375in;
      height: 2.125in;
      border: 2px solid #000;
      border-radius: 10px;
      padding: 10px;
      background: #fff;
      position: relative;
      overflow: hidden;
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 8px;
      margin-bottom: 10px;
    }
    .card-header img {
      display: block;
      max-width: 110px;
      object-fit: contain;
    }
    .card-info {
      font-size: 9px;
      line-height: 1.3;
    }
    .card-info div {
      margin-bottom: 5px;
    }
    .insured-block {
      margin-bottom: 5px;
    }
    .insured-list {
      margin-top: 2px;
      line-height: 1.15;
    }
    .insured-list.tight {
      font-size: 8.5px;
    }
    .insured-list.compact {
      font-size: 8px;
      line-height: 1.05;
    }
    .date-row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
    }
    .vin-line {
      overflow-wrap: anywhere;
    }
    .naic-number {
      position: absolute;
      bottom: 5px;
      right: 10px;
      font-size: 8px;
    }
    .back-card {
      margin-top: 0;
    }
    .back-card-inner {
      width: 100%;
      height: 100%;
      transform: rotate(180deg);
      transform-origin: center center;
    }
    .limits-title {
      font-size: 9px;
      font-weight: bold;
      margin-bottom: 10px;
    }
    .fold-line {
      width: 3.375in;
      border-top: 1px dashed #6b7280;
      position: relative;
      margin: 2px 0;
    }
    .fold-line span {
      position: absolute;
      top: -10px;
      left: 50%;
      transform: translateX(-50%);
      background: #fff;
      padding: 0 6px;
      font-size: 8px;
      color: #6b7280;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .back-copy {
      font-size: 8px;
      line-height: 1.35;
    }
    .important-block,
    .claims-block {
      border-top: 1px solid #ccc;
      padding-top: 8px;
      margin-top: 8px;
    }
    .claims-label {
      color: #c62828;
    }
    .cut-line-wrap {
      width: 100%;
      max-width: 5.25in;
      text-align: center;
      color: #6b7280;
      font-size: 10px;
    }
    .cut-line {
      border-top: 1px dashed #b8c0cc;
      margin-bottom: 8px;
    }
    @media print {
      body {
        background: #fff;
      }
      .page-sheet {
        min-height: auto;
        margin: 0;
        padding: 0.08in 0.1in;
        gap: 0.08in;
      }
      .card-container {
        padding: 2px 0 4px;
      }
      .cut-line-wrap {
        max-width: none;
      }
      .cut-outline {
        break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  ${pages.join('')}
</body>
</html>`;
}

function formatDateForCard(dateString) {
  if (!dateString) {
    return '';
  }

  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}/${date.getFullYear()}`;
}

function saveFormData() {
  const payload = {};
  document.querySelectorAll('input, select, textarea').forEach((element) => {
    if (element.id) {
      payload[element.id] = element.value;
    }
  });

  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  showToast('Form data saved.', 'success');
}

function loadFormData() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    showToast('No saved form data found.', 'info');
    return;
  }

  try {
    const payload = JSON.parse(stored);
    Object.entries(payload).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) {
        element.value = value;
      }
    });

    updateVehicleFields();
    updateCompanyInfo();
    ensureDefaultDates();
    showToast('Saved form data loaded.', 'success');
  } catch (error) {
    showToast('Saved form data could not be loaded.', 'error');
  }
}

function clearForm() {
  if (!window.confirm('Clear all fields in the auto ID card form?')) {
    return;
  }

  document.querySelectorAll('input, select, textarea').forEach((element) => {
    if (element.id === 'idCardVehicleCount') {
      element.value = '1';
    } else if (element.id === 'idCardEffectiveDate' || element.id === 'idCardExpirationDate') {
      element.value = '';
    } else if (element.tagName === 'SELECT') {
      element.selectedIndex = 0;
    } else {
      element.value = '';
    }
  });

  ensureDefaultDates();
  updateVehicleFields();
  latestHtml = '';
  renderEmptyPreview();
  disablePreviewActions();
  showToast('Form cleared.', 'success');
}

function printPreview() {
  if (!latestHtml) {
    return;
  }

  previewFrame.contentWindow.focus();
  previewFrame.contentWindow.print();
}

function downloadHtml() {
  if (!latestHtml) {
    return;
  }

  const blob = new Blob([latestHtml], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const driver = valueOf('idCardDriverName') || 'auto-id-card';
  const safeName = driver.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  link.href = url;
  link.download = `${safeName || 'auto-id-card'}-cards.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  showToast('Auto ID card HTML downloaded.', 'success');
}

async function copyAndOpenGmail() {
  if (!latestHtml) {
    return;
  }

  const driverName = valueOf('idCardDriverName') || 'Customer';
  const policyNumber = valueOf('idCardPolicyNumber') || 'N/A';
  const subject = encodeURIComponent(`Auto Insurance ID Cards - ${driverName} - Policy #${policyNumber}`);
  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&su=${subject}`;

  try {
    await copyHtmlToClipboard(latestHtml);
    window.open(gmailUrl, '_blank', 'noopener');
    showToast('Document copied. Paste it into Gmail with Ctrl+V.', 'success');
  } catch (error) {
    window.open(gmailUrl, '_blank', 'noopener');
    showToast('Gmail opened, but clipboard copy failed.', 'error');
  }
}

async function copyHtmlToClipboard(html) {
  if (navigator.clipboard && window.ClipboardItem) {
    const item = new ClipboardItem({
      'text/html': new Blob([html], { type: 'text/html' }),
      'text/plain': new Blob([html], { type: 'text/plain' })
    });
    await navigator.clipboard.write([item]);
    return;
  }

  if (navigator.clipboard) {
    await navigator.clipboard.writeText(html);
    return;
  }

  throw new Error('Clipboard API unavailable');
}

function renderEmptyPreview() {
  previewFrame.srcdoc = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      font-family: Arial, sans-serif;
      background: linear-gradient(180deg, #f7fafc 0%, #edf2f7 100%);
      color: #405065;
    }
    .empty {
      text-align: center;
      max-width: 32rem;
      padding: 2rem;
    }
    h1 {
      margin: 0 0 0.75rem;
      color: #0f4c75;
      font-size: 1.6rem;
    }
    p {
      margin: 0;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="empty">
    <h1>Auto ID card preview will appear here</h1>
    <p>Complete the form and click Generate ID Cards to build the printable card sheet.</p>
  </div>
</body>
</html>`;
}

function enablePreviewActions() {
  printButton.disabled = false;
  downloadButton.disabled = false;
  gmailButton.disabled = false;
}

function disablePreviewActions() {
  printButton.disabled = true;
  downloadButton.disabled = true;
  gmailButton.disabled = true;
}

function valueOf(id) {
  const element = document.getElementById(id);
  return element ? element.value.trim() : '';
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toastRoot.appendChild(toast);

  window.setTimeout(() => {
    toast.remove();
  }, 3200);
}
