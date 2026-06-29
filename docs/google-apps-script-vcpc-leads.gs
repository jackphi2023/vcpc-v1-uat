/*
  VCPC Google Sheet Lead Webhook
  Sheet: https://docs.google.com/spreadsheets/d/1tSRtFam68cXK4eGHsKBzZodQXQv5sAeGa-gG4wmQv7Y/edit

  Deploy as Google Apps Script Web App:
  - Execute as: Me
  - Who has access: Anyone
  - Copy the /exec Web App URL into assets/integrations.json as google_sheet_webapp_url
*/

const VCPC_LEADS_SHEET_ID = '1tSRtFam68cXK4eGHsKBzZodQXQv5sAeGa-gG4wmQv7Y';
const VCPC_HEADERS = [
  'timestamp',
  'form',
  'form_context',
  'source_path',
  'page_title',
  'page_url',
  'name',
  'title',
  'company',
  'industry',
  'email',
  'phone',
  'revenue',
  'need',
  'type',
  'network',
  'message',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'referrer',
  'language',
  'user_agent',
  'raw_json'
];

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, service: 'VCPC Lead Webhook' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const payload = parsePayload_(e);
    const formName = safeSheetName_(payload.form || payload.form_context || 'lead_form');
    const ss = SpreadsheetApp.openById(VCPC_LEADS_SHEET_ID);

    appendLead_(ss, 'Leads_All', payload);
    appendLead_(ss, formName, payload);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, form: formName }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err && err.message || err) }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

function parsePayload_(e) {
  const raw = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
  try {
    return JSON.parse(raw);
  } catch (err) {
    return { form: 'parse_error', message: raw, parse_error: String(err && err.message || err) };
  }
}

function appendLead_(spreadsheet, sheetName, payload) {
  const sheet = getOrCreateSheet_(spreadsheet, sheetName);
  ensureHeaders_(sheet);
  const row = VCPC_HEADERS.map(function(header) {
    if (header === 'timestamp') return new Date();
    if (header === 'raw_json') return JSON.stringify(payload);
    return payload[header] || '';
  });
  sheet.appendRow(row);
}

function getOrCreateSheet_(spreadsheet, sheetName) {
  return spreadsheet.getSheetByName(sheetName) || spreadsheet.insertSheet(sheetName);
}

function ensureHeaders_(sheet) {
  const firstRow = sheet.getRange(1, 1, 1, VCPC_HEADERS.length).getValues()[0];
  const hasHeaders = firstRow.some(function(value) { return value; });
  if (!hasHeaders) {
    sheet.getRange(1, 1, 1, VCPC_HEADERS.length).setValues([VCPC_HEADERS]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, VCPC_HEADERS.length).setFontWeight('bold');
  }
}

function safeSheetName_(value) {
  const cleaned = String(value || 'lead_form')
    .replace(/[\\/?*\[\]:]/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 80);
  return cleaned || 'lead_form';
}
