const STORAGE_KEY = 'bill-layne-dl123-generator';
const AGENCY_NAME = 'BILL LAYNE INSURANCE';
const DEFAULT_AGENT_PHONE = '1-336-835-1993';

const COMPANY_AGENCY_CODES = {
  Nationwide: '67893',
  'National General': '901875',
  Progressive: '02M95',
  Travelers: '0DSJ06',
  Dairyland: 'DL456'
};

const form = document.getElementById('dl123Form');
const previewFrame = document.getElementById('previewFrame');
const printButton = document.getElementById('printButton');
const downloadButton = document.getElementById('downloadButton');
const gmailButton = document.getElementById('gmailButton');
const toastRoot = document.getElementById('toastRoot');

let latestHtml = '';

document.addEventListener('DOMContentLoaded', () => {
  ensureDefaultDates();
  attachEvents();
  renderEmptyPreview();
});

function attachEvents() {
  document.getElementById('insuranceCompany').addEventListener('change', updateAgencyCode);
  document.getElementById('effectiveDate').addEventListener('change', updateExpirationDate);
  document.getElementById('saveButton').addEventListener('click', saveFormData);
  document.getElementById('loadButton').addEventListener('click', loadFormData);
  document.getElementById('clearButton').addEventListener('click', clearForm);
  printButton.addEventListener('click', printPreview);
  downloadButton.addEventListener('click', downloadHtml);
  gmailButton.addEventListener('click', copyAndOpenGmail);
  form.addEventListener('submit', handleGenerate);
}

function ensureDefaultDates() {
  const today = new Date().toISOString().split('T')[0];
  const certificationDate = document.getElementById('certificationDate');
  const agentPhone = document.getElementById('agentPhone');

  if (!certificationDate.value) {
    certificationDate.value = today;
  }

  if (!agentPhone.value) {
    agentPhone.value = DEFAULT_AGENT_PHONE;
  }
}

function updateAgencyCode() {
  const company = document.getElementById('insuranceCompany').value;
  document.getElementById('agencyCode').value = COMPANY_AGENCY_CODES[company] || '';
}

function updateExpirationDate() {
  const effectiveDate = document.getElementById('effectiveDate').value;
  if (!effectiveDate) {
    return;
  }

  const [year, month, day] = effectiveDate.split('-').map(Number);
  const nextYear = new Date(year, month - 1, day);
  nextYear.setFullYear(nextYear.getFullYear() + 1);

  const expirationDate = [
    nextYear.getFullYear(),
    String(nextYear.getMonth() + 1).padStart(2, '0'),
    String(nextYear.getDate()).padStart(2, '0')
  ].join('-');

  document.getElementById('expirationDate').value = expirationDate;
}

function handleGenerate(event) {
  event.preventDefault();

  if (!form.reportValidity()) {
    showToast('Fill in the required fields before generating the DL-123.', 'error');
    return;
  }

  const data = collectFormData();
  latestHtml = generateDL123Html(data);
  previewFrame.srcdoc = latestHtml;
  enablePreviewActions();
  showToast('DL-123 generated.', 'success');
}

function collectFormData() {
  const insuredDriver = valueOf('insuredDriverName') || valueOf('policyholderName');
  const address = [
    valueOf('addressLine1'),
    valueOf('addressLine2'),
    [valueOf('city'), valueOf('state'), valueOf('zipCode')].filter(Boolean).join(' ')
  ].filter(Boolean).join(', ');

  return {
    insuredDriver,
    dateOfBirth: formatDate(valueOf('driverDateOfBirth')),
    policyholders: valueOf('policyholderName'),
    policyholderAddress: address,
    insuranceCompany: valueOf('insuranceCompany'),
    policyNumber: valueOf('policyNumber'),
    effectiveDate: formatDate(valueOf('effectiveDate')),
    expirationDate: formatDate(valueOf('expirationDate')),
    agencyName: AGENCY_NAME,
    agencyCode: valueOf('agencyCode'),
    agentSignature: valueOf('agentSignatureName'),
    agentPhone: valueOf('agentPhone') || DEFAULT_AGENT_PHONE,
    certificationDate: formatDate(valueOf('certificationDate'))
  };
}

function generateDL123Html(data) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>DL-123 Insurance Certification</title>
  <style>
    @page { size: letter; margin: 0.5in; }
    * { box-sizing: border-box; }
    body {
      font-family: Arial, sans-serif;
      font-size: 12px;
      line-height: 1.4;
      max-width: 7.5in;
      margin: 0 auto;
      padding: 20px;
      color: #000;
    }
    .dl123-container {
      border: 2px solid #000;
      padding: 20px;
      margin-bottom: 20px;
      overflow: hidden;
    }
    .dl123-title {
      text-align: center;
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 10px;
    }
    .dl123-subtitle {
      text-align: center;
      font-size: 12px;
      margin-bottom: 20px;
    }
    .dl123-row {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-start;
      align-items: flex-end;
      margin-bottom: 15px;
      gap: 10px;
      width: 100%;
    }
    .dl123-field {
      flex: 1 1 280px;
      display: flex;
      align-items: flex-end;
      min-width: 0;
      max-width: 100%;
    }
    .dl123-label {
      font-weight: bold;
      margin-right: 10px;
      white-space: nowrap;
    }
    .dl123-value {
      border-bottom: 1px solid #000;
      flex: 1 1 auto;
      width: 100%;
      min-width: 0;
      padding: 0 5px 2px;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .dl123-footer {
      font-size: 10px;
      font-style: italic;
      margin-top: 20px;
      text-align: center;
      padding-top: 10px;
      border-top: 1px solid #000;
    }
    @media print {
      body { font-size: 11px; padding: 0; }
      .dl123-container { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="dl123-container">
    <div class="dl123-title">DRIVER LICENSE LIABILITY INSURANCE CERTIFICATION</div>
    <div class="dl123-subtitle">DL-123 (Rev. 03/13)</div>

    <div class="dl123-row">
      <div class="dl123-field">
        <span class="dl123-label">Insured Driver:</span>
        <span class="dl123-value">${escapeHtml(data.insuredDriver).toUpperCase()}</span>
      </div>
      <div class="dl123-field" style="flex: 0 1 200px;">
        <span class="dl123-label">Date of Birth:</span>
        <span class="dl123-value">${escapeHtml(data.dateOfBirth)}</span>
      </div>
    </div>

    <div class="dl123-row">
      <div class="dl123-field">
        <span class="dl123-label">Policyholder(s):</span>
        <span class="dl123-value">${escapeHtml(data.policyholders).toUpperCase()}</span>
      </div>
    </div>

    <div class="dl123-row">
      <div class="dl123-field">
        <span class="dl123-label">Policyholder(s) Address:</span>
        <span class="dl123-value">${escapeHtml(data.policyholderAddress).toUpperCase()}</span>
      </div>
    </div>

    <div class="dl123-row">
      <div class="dl123-field">
        <span class="dl123-label">Insurance Company:</span>
        <span class="dl123-value">${escapeHtml(data.insuranceCompany).toUpperCase()}</span>
      </div>
      <div class="dl123-field" style="flex: 0 1 250px;">
        <span class="dl123-label">Policy #:</span>
        <span class="dl123-value">${escapeHtml(data.policyNumber).toUpperCase()}</span>
      </div>
    </div>

    <div class="dl123-row">
      <div class="dl123-field">
        <span class="dl123-label">Effective Date:</span>
        <span class="dl123-value">${escapeHtml(data.effectiveDate)}</span>
      </div>
      <div class="dl123-field">
        <span class="dl123-label">Expiration Date:</span>
        <span class="dl123-value">${escapeHtml(data.expirationDate)}</span>
      </div>
    </div>

    <div class="dl123-row">
      <div class="dl123-field">
        <span class="dl123-label">Agency Name:</span>
        <span class="dl123-value">${escapeHtml(data.agencyName)}</span>
      </div>
      <div class="dl123-field" style="flex: 0 1 200px;">
        <span class="dl123-label">Agency Code #:</span>
        <span class="dl123-value">${escapeHtml(data.agencyCode)}</span>
      </div>
    </div>

    <div class="dl123-row">
      <div class="dl123-field">
        <span class="dl123-label">Agent's Signature:</span>
        <span class="dl123-value">${escapeHtml(data.agentSignature)}</span>
      </div>
      <div class="dl123-field" style="flex: 0 1 200px;">
        <span class="dl123-label">Agent's Phone #:</span>
        <span class="dl123-value">${escapeHtml(data.agentPhone)}</span>
      </div>
    </div>

    <div class="dl123-row">
      <div class="dl123-field" style="flex: 0 1 300px;">
        <span class="dl123-label">Date of Certification:</span>
        <span class="dl123-value">${escapeHtml(data.certificationDate)}</span>
      </div>
    </div>

    <div class="dl123-footer">(This form is valid for 30 days after completion by the insurance agent.)</div>
  </div>
</body>
</html>`;
}

function saveFormData() {
  const payload = {};
  document.querySelectorAll('input, select').forEach((element) => {
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

    ensureDefaultDates();
    showToast('Saved form data loaded.', 'success');
  } catch (error) {
    showToast('Saved form data could not be loaded.', 'error');
  }
}

function clearForm() {
  if (!window.confirm('Clear all fields in the DL-123 form?')) {
    return;
  }

  document.querySelectorAll('input, select').forEach((element) => {
    if (element.id === 'state') {
      element.value = 'NC';
    } else if (element.id === 'agentPhone') {
      element.value = DEFAULT_AGENT_PHONE;
    } else if (element.id === 'certificationDate') {
      element.value = new Date().toISOString().split('T')[0];
    } else if (element.tagName === 'SELECT') {
      element.selectedIndex = 0;
    } else {
      element.value = '';
    }
  });

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
  const policyholder = valueOf('policyholderName') || 'dl123';
  const safeName = policyholder.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  link.href = url;
  link.download = `${safeName || 'dl123'}-dl123.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  showToast('DL-123 HTML downloaded.', 'success');
}

async function copyAndOpenGmail() {
  if (!latestHtml) {
    return;
  }

  const subjectName = valueOf('policyholderName') || 'Customer';
  const policyNumber = valueOf('policyNumber') || 'N/A';
  const recipient = valueOf('emailAddress');
  const subject = encodeURIComponent(`DL-123 Insurance Certification - ${subjectName} - Policy #${policyNumber}`);
  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(recipient)}&su=${subject}`;

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
    <h1>DL-123 preview will appear here</h1>
    <p>Complete the form and click Generate DL-123 to build the printable certification.</p>
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

function formatDate(dateString) {
  if (!dateString) {
    return '';
  }

  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
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
