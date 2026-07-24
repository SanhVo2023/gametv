/**
 * Mắt Việt — Anniversary Event kiosk backend.
 *
 * Single Apps Script Web App. Deploy as:
 *   Execute as:        Me
 *   Who has access:    Anyone
 *
 * Frontend calls each action with `POST text/plain` (no Content-Type) so
 * the browser does not send a CORS preflight.
 *
 * To bootstrap a fresh deployment:
 *   1. Open this script in https://script.google.com bound to a new Google Sheet.
 *   2. Run `setup()` once from the editor (or POST {action:'setup'}).
 *   3. Edit Config + Prizes in the sheet to taste.
 *   4. Deploy → New deployment → Web App → set permissions per above.
 *   5. Copy the /exec URL into the frontend `.env.local` as NEXT_PUBLIC_GAS_URL.
 */

var SHEET_CONFIG = 'Config';
var SHEET_PRIZES = 'Prizes';
var SHEET_PLAYS  = 'Plays';

var CONFIG_HEADERS = ['key', 'value'];
var PRIZES_HEADERS = ['id', 'name', 'stock', 'weight', 'code_prefix', 'image_url', 'description', 'color_hex'];
var PLAYS_HEADERS  = ['timestamp', 'phone', 'prize_id', 'prize_name', 'prize_code', 'is_win', 'is_tester', 'session_id'];

var DEFAULT_CONFIG = [
  ['tester_phone', '0777863808'],
  ['event_name', 'Mắt Việt Anniversary Event'],
  ['event_location', 'Vincom Đồng Khởi'],
  ['auto_reset_seconds', 15],
  // Shared secret for the lucky-draw admin page (/spin-admin?key=...).
  // NOTE: setup() does not touch an existing Config sheet — add this row
  // manually on an already-deployed sheet.
  ['spin_admin_key', 'CHANGE-ME']
];

// ---- Lucky draw ("rút thăm trúng thưởng") ----
var SHEET_DRAW = 'LuckyDraw';
var DRAW_HEADERS = ['timestamp', 'number', 'tier', 'status'];
var FORCE_PROP = 'draw_force';          // script property holding {number, at}
var FORCE_TTL_MS = 10 * 60 * 1000;      // stale forces (e.g. from rehearsal) expire
var DRAW_MAX_NUMBER = 50;

// Anniversary event stock: physical presents start at 10 units and use their
// stock as draw weight; vouchers use a FIXED draw weight of 20 with real
// stock (30× 100k, 20× 200k).
// `id` doubles as the operator's mã hàng so SKU tracking lines up with their inventory list.
//
// Each ROW is one WEDGE on the wheel, in this order — 6 presents + the two
// voucher wedges. The second 100k/200k voucher slots were replaced by
// BONUOCRUAKINH and HOPKINH.
var DEFAULT_PRIZES = [
  ['HK-BD117',      'Hộp kính thời trang',     10, 10, 'HK1',  '', 'Hộp đựng kính thời trang Mắt Việt (HK-BD117)', '#1138c4'],
  ['VOUCHER100K',   'Voucher 100.000đ',        30, 20, 'V100', '', 'Voucher 100.000đ áp dụng tại Mắt Việt',        '#2156e8'],
  ['VIBOLON',       'Ví Bolon',                10, 10, 'VB',   '', 'Ví thương hiệu Bolon',                         '#0a2070'],
  ['VOUCHER200K',   'Voucher 200.000đ',        20, 20, 'V200', '', 'Voucher 200.000đ áp dụng tại Mắt Việt',        '#1d4ed8'],
  ['BUTBOLON',      'Bút Bolon',               10, 10, 'PB',   '', 'Bút thương hiệu Bolon',                        '#001a5c'],
  ['BONUOCRUAKINH', 'Bộ nước rửa kính',        10, 10, 'NRK',  '', 'Bộ nước rửa kính và khăn lau Mắt Việt',        '#2156e8'],
  ['NONMOLSION',    'Nón thời trang Molsion',  10, 10, 'NM',   '', 'Nón thời trang thương hiệu Molsion',           '#0d2680'],
  ['HOPKINH',       'Hộp kính',                10, 10, 'HK2',  '', 'Hộp kính Mắt Việt',                            '#1d4ed8']
];

// ============================================================
//   HTTP entry points
// ============================================================

function doGet(e) {
  return _respond({ ok: false, error: 'use_post' });
}

function doPost(e) {
  var body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return _respond({ ok: false, error: 'invalid_json' });
  }
  var action = String(body.action || '');
  try {
    if (action === 'setup')       return _respond(doSetup());
    if (action === 'getPrizes')   return _respond(doGetPrizes());
    if (action === 'checkPhone')  return _respond(doCheckPhone(body.phone));
    if (action === 'spinWheel')   return _respond(doSpinWheel(body.phone));
    if (action === 'recordLoss')  return _respond(doRecordLoss(body.phone));
    if (action === 'drawForceSet')   return _respond(doDrawForceSet(body.number, body.key));
    if (action === 'drawForceGet')   return _respond(doDrawForceGet());
    if (action === 'drawForceClear') return _respond(doDrawForceClear());
    if (action === 'drawLogWinner')  return _respond(doDrawLogWinner(body.number, body.tier, body.status));
    if (action === 'drawGetLog')     return _respond(doDrawGetLog());
    return _respond({ ok: false, error: 'unknown_action' });
  } catch (err) {
    return _respond({ ok: false, error: String(err && err.message || err) });
  }
}

function _respond(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
//   Sheet bootstrap
// ============================================================

function doSetup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('no_spreadsheet_bound');

  var createdSheets = [];
  var seededPrizes = 0;
  var seededConfig = 0;

  // Config
  var configSheet = ss.getSheetByName(SHEET_CONFIG);
  if (!configSheet) {
    configSheet = ss.insertSheet(SHEET_CONFIG);
    createdSheets.push(SHEET_CONFIG);
  }
  configSheet.clear();
  configSheet.getRange(1, 1, 1, CONFIG_HEADERS.length).setValues([CONFIG_HEADERS]).setFontWeight('bold');
  configSheet.getRange(2, 1, DEFAULT_CONFIG.length, 2).setValues(DEFAULT_CONFIG);
  configSheet.setFrozenRows(1);
  seededConfig = DEFAULT_CONFIG.length;

  // Prizes
  var prizesSheet = ss.getSheetByName(SHEET_PRIZES);
  if (!prizesSheet) {
    prizesSheet = ss.insertSheet(SHEET_PRIZES);
    createdSheets.push(SHEET_PRIZES);
    prizesSheet.getRange(1, 1, 1, PRIZES_HEADERS.length).setValues([PRIZES_HEADERS]).setFontWeight('bold');
    prizesSheet.getRange(2, 1, DEFAULT_PRIZES.length, PRIZES_HEADERS.length).setValues(DEFAULT_PRIZES);
    seededPrizes = DEFAULT_PRIZES.length;
  } else {
    // Ensure headers exist if the operator created a blank sheet manually.
    if (prizesSheet.getLastRow() === 0) {
      prizesSheet.getRange(1, 1, 1, PRIZES_HEADERS.length).setValues([PRIZES_HEADERS]).setFontWeight('bold');
      prizesSheet.getRange(2, 1, DEFAULT_PRIZES.length, PRIZES_HEADERS.length).setValues(DEFAULT_PRIZES);
      seededPrizes = DEFAULT_PRIZES.length;
    }
  }
  prizesSheet.setFrozenRows(1);

  // Plays
  var playsSheet = ss.getSheetByName(SHEET_PLAYS);
  if (!playsSheet) {
    playsSheet = ss.insertSheet(SHEET_PLAYS);
    createdSheets.push(SHEET_PLAYS);
    playsSheet.getRange(1, 1, 1, PLAYS_HEADERS.length).setValues([PLAYS_HEADERS]).setFontWeight('bold');
  }
  playsSheet.setFrozenRows(1);

  // Drop the default "Sheet1" if blank and our 3 sheets exist.
  var sheet1 = ss.getSheetByName('Sheet1');
  if (sheet1 && sheet1.getLastRow() === 0 && ss.getSheets().length > 3) {
    ss.deleteSheet(sheet1);
  }

  return {
    ok: true,
    sheetsCreated: createdSheets,
    prizesSeeded: seededPrizes,
    configSeeded: seededConfig
  };
}

// ============================================================
//   Prizes
// ============================================================

function doGetPrizes() {
  var prizes = _readPrizes().filter(function (p) { return p.stock > 0; });
  return {
    ok: true,
    prizes: prizes.map(function (p) {
      return {
        id: p.id,
        name: p.name,
        description: p.description,
        imageUrl: p.image_url,
        colorHex: p.color_hex,
        weight: p.weight
      };
    })
  };
}

// ============================================================
//   Phone check
// ============================================================

function doCheckPhone(phone) {
  var normalized = _normalizePhone(phone);
  if (!normalized) {
    return { ok: true, allowed: false, isTester: false, reason: 'invalid_phone' };
  }
  var tester = _readConfig('tester_phone');
  if (tester && normalized === _normalizePhone(tester)) {
    return { ok: true, allowed: true, isTester: true };
  }
  var hasWin = _phoneHasWin(normalized);
  if (hasWin) {
    return { ok: true, allowed: false, isTester: false, reason: 'already_won' };
  }
  return { ok: true, allowed: true, isTester: false };
}

// ============================================================
//   Spin wheel
// ============================================================

/**
 * Picks a stock-weighted prize, decrements stock (unless tester), logs the play,
 * and returns BOTH the chosen wedge AND the full ordered prize list it used —
 * so the frontend builds the wheel from the authoritative response (no
 * getPrizes/spinWheel ordering mismatch). Minimal spreadsheet round-trips
 * (1 config + 1 plays read + 1 prizes read + 1 stock write + 1 append) and a
 * script lock to prevent double-spend.
 */
function doSpinWheel(phone) {
  var normalized = _normalizePhone(phone);
  if (!normalized) throw new Error('invalid_phone');

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(8000);
  } catch (e) {
    return { ok: false, error: 'busy_try_again' };
  }

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var tester = _readConfig('tester_phone');
    var isTester = !!(tester && normalized === _normalizePhone(tester));

    // Uniqueness check — single Plays read
    var playsSheet = ss.getSheetByName(SHEET_PLAYS);
    if (!isTester && playsSheet) {
      var playValues = playsSheet.getDataRange().getValues();
      if (_hasWinInValues(playValues, normalized)) {
        return { ok: false, error: 'already_won' };
      }
    }

    // Prizes — single read, reused for pick + write-back
    var prizesSheet = ss.getSheetByName(SHEET_PRIZES);
    if (!prizesSheet) return { ok: false, error: 'no_prizes_sheet' };
    var prizeValues = prizesSheet.getDataRange().getValues();
    if (prizeValues.length <= 1) return { ok: false, error: 'no_prizes_available' };
    var ph = prizeValues[0];
    var pidx = {};
    for (var i = 0; i < ph.length; i++) pidx[ph[i]] = i;

    var available = [];
    for (var r = 1; r < prizeValues.length; r++) {
      var row = prizeValues[r];
      var id = String(row[pidx.id] || '').trim();
      if (!id) continue;
      var stock = Number(row[pidx.stock] || 0);
      if (stock <= 0) continue;
      available.push({
        id: id,
        name: String(row[pidx.name] || '').trim(),
        stock: stock,
        weight: Number(row[pidx.weight] || 0),
        code_prefix: String(row[pidx.code_prefix] || '').trim(),
        image_url: String(row[pidx.image_url] || '').trim(),
        description: String(row[pidx.description] || '').trim(),
        color_hex: String(row[pidx.color_hex] || '').trim(),
        sheetRow: r + 1
      });
    }
    if (available.length === 0) return { ok: false, error: 'no_prizes_available' };

    // Stock-weighted pick
    var totalWeight = 0;
    for (var w = 0; w < available.length; w++) totalWeight += Math.max(0.0001, available[w].weight);
    var roll = Math.random() * totalWeight;
    var cursor = 0;
    var pickedIndex = 0;
    for (var k = 0; k < available.length; k++) {
      cursor += Math.max(0.0001, available[k].weight);
      if (roll <= cursor) { pickedIndex = k; break; }
    }
    var picked = available[pickedIndex];

    // Write-back: decrement stock (unless tester) + append the play row
    if (!isTester) {
      prizesSheet.getRange(picked.sheetRow, pidx.stock + 1).setValue(Math.max(0, picked.stock - 1));
    }
    var code = _generateCode(picked.code_prefix, normalized);
    if (playsSheet) {
      var pr = playsSheet.getLastRow() + 1;
      // phone column as plain text — keep the leading 0
      playsSheet.getRange(pr, 2).setNumberFormat('@');
      playsSheet.getRange(pr, 1, 1, PLAYS_HEADERS.length).setValues([[
        new Date(), normalized, picked.id, picked.name, code, true, isTester, Utilities.getUuid()
      ]]);
    }

    return {
      ok: true,
      wedgeIndex: pickedIndex,
      totalWedges: available.length,
      isTester: isTester,
      prize: {
        id: picked.id,
        name: picked.name,
        description: picked.description,
        code: code,
        imageUrl: picked.image_url,
        colorHex: picked.color_hex
      },
      prizes: available.map(function (p) {
        return {
          id: p.id,
          name: p.name,
          description: p.description,
          imageUrl: p.image_url,
          colorHex: p.color_hex,
          weight: p.weight
        };
      })
    };
  } finally {
    lock.releaseLock();
  }
}

// ============================================================
//   Record loss
// ============================================================

function doRecordLoss(phone) {
  var normalized = _normalizePhone(phone);
  if (!normalized) return { ok: false, error: 'invalid_phone' };
  var tester = _readConfig('tester_phone');
  var isTester = !!(tester && normalized === _normalizePhone(tester));
  _appendPlay({
    timestamp: new Date(),
    phone: normalized,
    prize_id: '',
    prize_name: '',
    prize_code: '',
    is_win: false,
    is_tester: isTester,
    session_id: Utilities.getUuid()
  });
  return { ok: true };
}

// ============================================================
//   Helpers
// ============================================================

function _normalizePhone(p) {
  if (!p) return '';
  var s = String(p).replace(/\D+/g, '');
  if (s.length === 0) return '';
  // Allow +84-style prefix by normalizing to 0xxxxxxxxx
  if (s.length === 11 && s.indexOf('84') === 0) {
    s = '0' + s.substring(2);
  }
  // Google Sheets stores a bare number and drops the leading 0, so a saved
  // "777863808" (9 digits) must still match an entered "0777863808" —
  // re-add the leading 0. This makes the uniqueness check work even on rows
  // that were written before the text-format fix below.
  if (s.length === 9) {
    s = '0' + s;
  }
  return s;
}

// ============================================================
//   Lucky draw ("rút thăm trúng thưởng")
//
//   The TV app (/spin) draws ticket numbers client-side; the backend only
//   provides (1) the secret realtime "force" channel the admin phone uses
//   to dictate the next number, and (2) an audit log that also lets the
//   admin page grey out already-taken numbers.
// ============================================================

/** Admin (key-protected): make the next spin land on `number` if available. */
function doDrawForceSet(number, key) {
  var expected = String(_readConfig('spin_admin_key') || '').trim();
  if (!expected) return { ok: false, error: 'admin_key_not_configured' };
  if (String(key || '').trim() !== expected) return { ok: false, error: 'bad_key' };
  var n = Math.floor(Number(number));
  if (!(n >= 1 && n <= DRAW_MAX_NUMBER)) return { ok: false, error: 'invalid_number' };
  PropertiesService.getScriptProperties()
    .setProperty(FORCE_PROP, JSON.stringify({ number: n, at: Date.now() }));
  return { ok: true, number: n };
}

/** TV polls this. Expired forces are deleted so a rehearsal can't hijack the event. */
function doDrawForceGet() {
  var props = PropertiesService.getScriptProperties();
  var raw = props.getProperty(FORCE_PROP);
  if (!raw) return { ok: true, force: null };
  var f;
  try { f = JSON.parse(raw); } catch (err) { props.deleteProperty(FORCE_PROP); return { ok: true, force: null }; }
  if (!f || Date.now() - Number(f.at || 0) > FORCE_TTL_MS) {
    props.deleteProperty(FORCE_PROP);
    return { ok: true, force: null };
  }
  return { ok: true, force: f };
}

/** Unauthenticated by design — the TV consumes the force and can't hold the key. */
function doDrawForceClear() {
  PropertiesService.getScriptProperties().deleteProperty(FORCE_PROP);
  return { ok: true };
}

/** Best-effort audit trail; also feeds doDrawGetLog for the admin page. */
function doDrawLogWinner(number, tier, status) {
  var n = Math.floor(Number(number));
  if (!(n >= 1 && n <= DRAW_MAX_NUMBER)) return { ok: false, error: 'invalid_number' };
  var sh = _getOrCreateDrawSheet();
  sh.appendRow([new Date(), n, String(tier || ''), String(status || 'received')]);
  return { ok: true };
}

/** Numbers already consumed (won or absent), for greying out on the admin page. */
function doDrawGetLog() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_DRAW);
  var received = [];
  var absent = [];
  if (sh) {
    var values = sh.getDataRange().getValues();
    for (var i = 1; i < values.length; i++) {
      var n = Math.floor(Number(values[i][1]));
      if (!(n >= 1)) continue;
      if (String(values[i][3]) === 'absent') absent.push(n);
      else received.push(n);
    }
  }
  return { ok: true, received: received, absent: absent };
}

function _getOrCreateDrawSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_DRAW);
  if (!sh) {
    sh = ss.insertSheet(SHEET_DRAW);
    sh.getRange(1, 1, 1, DRAW_HEADERS.length).setValues([DRAW_HEADERS]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function _readConfig(key) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_CONFIG);
  if (!sh) return null;
  var values = sh.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]).trim() === key) return values[i][1];
  }
  return null;
}

function _readPrizes() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_PRIZES);
  if (!sh) return [];
  var values = sh.getDataRange().getValues();
  if (values.length <= 1) return [];
  var headers = values[0];
  var idx = {};
  for (var i = 0; i < headers.length; i++) idx[headers[i]] = i;

  var rows = [];
  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    var id = String(row[idx.id] || '').trim();
    if (!id) continue;
    rows.push({
      id: id,
      name: String(row[idx.name] || '').trim(),
      stock: Number(row[idx.stock] || 0),
      weight: Number(row[idx.weight] || 0),
      code_prefix: String(row[idx.code_prefix] || '').trim(),
      image_url: String(row[idx.image_url] || '').trim(),
      description: String(row[idx.description] || '').trim(),
      color_hex: String(row[idx.color_hex] || '').trim()
    });
  }
  return rows;
}

function _decrementPrizeStock(id) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_PRIZES);
  if (!sh) return;
  var values = sh.getDataRange().getValues();
  var headers = values[0];
  var idCol = headers.indexOf('id');
  var stockCol = headers.indexOf('stock');
  if (idCol < 0 || stockCol < 0) return;
  for (var r = 1; r < values.length; r++) {
    if (String(values[r][idCol]).trim() === id) {
      var current = Number(values[r][stockCol] || 0);
      var next = Math.max(0, current - 1);
      sh.getRange(r + 1, stockCol + 1).setValue(next);
      return;
    }
  }
}

/** Uniqueness check against an already-read Plays value matrix (no extra read). */
function _hasWinInValues(values, normalized) {
  if (!values || values.length <= 1) return false;
  var headers = values[0];
  var phoneCol = headers.indexOf('phone');
  var winCol = headers.indexOf('is_win');
  var testerCol = headers.indexOf('is_tester');
  if (phoneCol < 0 || winCol < 0) return false;
  for (var r = 1; r < values.length; r++) {
    if (_normalizePhone(values[r][phoneCol]) !== normalized) continue;
    var win = values[r][winCol];
    if (!(win === true || String(win).toLowerCase() === 'true')) continue;
    if (testerCol >= 0) {
      var t = values[r][testerCol];
      if (t === true || String(t).toLowerCase() === 'true') continue;
    }
    return true;
  }
  return false;
}

function _phoneHasWin(normalized) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_PLAYS);
  if (!sh) return false;
  var values = sh.getDataRange().getValues();
  if (values.length <= 1) return false;
  var headers = values[0];
  var phoneCol = headers.indexOf('phone');
  var winCol = headers.indexOf('is_win');
  var testerCol = headers.indexOf('is_tester');
  if (phoneCol < 0 || winCol < 0) return false;
  for (var r = 1; r < values.length; r++) {
    var rowPhone = _normalizePhone(values[r][phoneCol]);
    if (rowPhone !== normalized) continue;
    var win = values[r][winCol];
    var winBool = win === true || String(win).toLowerCase() === 'true';
    if (!winBool) continue;
    if (testerCol >= 0) {
      var tester = values[r][testerCol];
      var testerBool = tester === true || String(tester).toLowerCase() === 'true';
      if (testerBool) continue; // tester wins do not block
    }
    return true;
  }
  return false;
}

function _appendPlay(row) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_PLAYS);
  if (!sh) return;
  var r = sh.getLastRow() + 1;
  // Force the phone column to plain text BEFORE writing so Sheets keeps the
  // leading 0 instead of coercing it to a number.
  sh.getRange(r, 2).setNumberFormat('@');
  sh.getRange(r, 1, 1, PLAYS_HEADERS.length).setValues([[
    row.timestamp,
    row.phone,
    row.prize_id,
    row.prize_name,
    row.prize_code,
    row.is_win,
    row.is_tester,
    row.session_id
  ]]);
}

function _generateCode(prefix, phone) {
  var stamp = Date.now().toString(36).toUpperCase();
  var phoneTail = (phone || '').slice(-3);
  return (prefix ? prefix + '-' : '') + stamp + '-' + phoneTail;
}

// ============================================================
//   Operator utilities (run manually from the Apps Script editor)
// ============================================================

/**
 * Wipe the Prizes sheet and re-seed from DEFAULT_PRIZES.
 * Use this when you change the seed list in code and want it pushed to a
 * sheet that was already initialized — without nuking the Plays history.
 */
function resetPrizes() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_PRIZES);
  if (!sh) {
    sh = ss.insertSheet(SHEET_PRIZES);
  } else {
    sh.clear();
  }
  sh.getRange(1, 1, 1, PRIZES_HEADERS.length).setValues([PRIZES_HEADERS]).setFontWeight('bold');
  sh.getRange(2, 1, DEFAULT_PRIZES.length, PRIZES_HEADERS.length).setValues(DEFAULT_PRIZES);
  sh.setFrozenRows(1);
  Logger.log('Reset ' + DEFAULT_PRIZES.length + ' prizes; total stock = ' +
    DEFAULT_PRIZES.reduce(function (s, p) { return s + Number(p[2] || 0); }, 0));
  return { ok: true, prizesSeeded: DEFAULT_PRIZES.length };
}

/**
 * Smoke test — run from the editor, inspect the execution log.
 */
function selfTest() {
  Logger.log(JSON.stringify(doSetup()));
  Logger.log(JSON.stringify(doGetPrizes()));
  Logger.log(JSON.stringify(doCheckPhone('0777863808')));
  Logger.log(JSON.stringify(doCheckPhone('0900000001')));
  Logger.log(JSON.stringify(doSpinWheel('0777863808')));
}
