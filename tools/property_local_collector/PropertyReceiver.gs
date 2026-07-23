const SPREADSHEET_ID = '1teB5wZq7-SiBlohTapD-etsHpJcvak3st_dZVIKUMDw';
const RAW_SHEET = 'Raw';
const HEADER = [
  'scraped_at', 'sale_date', 'sold_price_eur', 'asking_price_eur',
  'delta_eur', 'delta_pct', 'asking_band', 'property_type',
  'bedrooms', 'bathrooms', 'size_sqm', 'address', 'county', 'area',
  'detail_url', 'source_page'
];

function doGet() {
  return json_({ ok: true, service: 'property-sheet-receiver' });
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const expected = PropertiesService.getScriptProperties().getProperty('COLLECTOR_TOKEN');
    if (!expected || body.token !== expected) {
      return json_({ ok: false, error: 'unauthorised' });
    }

    const rows = Array.isArray(body.rows) ? body.rows : [];
    const minimumRows = Math.max(1, Number(body.minimum_rows || 5));
    const validRows = rows.filter(validRow_);
    if (validRows.length < minimumRows) {
      return json_({
        ok: false,
        error: `Only ${validRows.length} valid rows received; minimum is ${minimumRows}`
      });
    }

    const mode = body.mode === 'full' ? 'full' : 'incremental';
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(RAW_SHEET) || ss.insertSheet(RAW_SHEET);
    ensureHeader_(sheet);

    const merged = mode === 'full'
      ? dedupe_(validRows)
      : mergeWithExisting_(sheet, validRows);

    replaceSheet_(sheet, merged);
    return json_({
      ok: true,
      mode,
      received: rows.length,
      valid: validRows.length,
      written: merged.length
    });
  } catch (error) {
    return json_({ ok: false, error: String(error && error.stack ? error.stack : error) });
  }
}

function validRow_(row) {
  return row &&
    /^\d{2}\/\d{2}\/\d{4}$/.test(String(row.sale_date || '')) &&
    Number(row.sold_price_eur) > 0 &&
    Number(row.asking_price_eur) > 0 &&
    String(row.address || '').includes(',') &&
    /^https:\/\/www\.daft\.ie\/sold\//.test(String(row.detail_url || ''));
}

function ensureHeader_(sheet) {
  if (sheet.getMaxColumns() < HEADER.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), HEADER.length - sheet.getMaxColumns());
  }
  sheet.getRange(1, 1, 1, HEADER.length).setValues([HEADER]);
  sheet.setFrozenRows(1);
}

function rowToArray_(row) {
  return HEADER.map(key => row[key] === null || row[key] === undefined ? '' : row[key]);
}

function dedupe_(rows) {
  const byUrl = new Map();
  rows.forEach(row => byUrl.set(String(row.detail_url), row));
  return Array.from(byUrl.values());
}

function mergeWithExisting_(sheet, incoming) {
  const existing = readExisting_(sheet);
  const byUrl = new Map();
  existing.forEach(row => byUrl.set(String(row.detail_url), row));
  incoming.forEach(row => byUrl.set(String(row.detail_url), row));
  return Array.from(byUrl.values());
}

function readExisting_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const values = sheet.getRange(2, 1, lastRow - 1, HEADER.length).getValues();
  return values.map(valuesRow => {
    const row = {};
    HEADER.forEach((key, index) => row[key] = valuesRow[index]);
    return row;
  }).filter(row => row.detail_url);
}

function replaceSheet_(sheet, rows) {
  const staged = rows.map(rowToArray_);
  const existingRows = Math.max(0, sheet.getLastRow() - 1);
  if (existingRows) {
    sheet.getRange(2, 1, existingRows, HEADER.length).clearContent();
  }
  if (staged.length) {
    sheet.getRange(2, 1, staged.length, HEADER.length).setValues(staged);
  }
}

function json_(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
