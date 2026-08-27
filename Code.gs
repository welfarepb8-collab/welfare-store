/*************************************************************************************
 *  WEBAPP สั่งซื้อเครื่องแต่งกาย (ยูนิฟอร์ม/อุปกรณ์)
 *  บริษัท เพรซิเดนท์ เบเกอรี่ จำกัด (มหาชน) - Welfare Factory
 *************************************************************************************/

/* ======================= CONFIG (แก้ไขให้ตรงกับ Sheet จริง) ======================= */
const SHEET_ID = '1oLqYF9SRjGkmk3ZlLPlb1EC6X1v908fGZCzjFxnEPtg';

const SHEET_NAMES = {
  EMPLOYEES: 'รายชื่อ',
  PRICES:    'ราคาสินค้า',
  ORDERS:    'รายการสั่งซื้อ',
  UNIFORM_CLAIM: 'เบิกชุดบรรจุ',
  SPECIAL_PRODUCTS: 'รายการสินค้าเบิก',
  SPECIAL_CLAIM: 'เบิกพิเศษ'
};

const EMP_COL = { CODE: 2, NAME: 3, DIVISION: 4, SECTION: 5, DEPT: 6, POSITION: 7, CONFIRM_DATE: 9 };
const EMP_HEADER_ROW = 1;
// EMP_COL.CONFIRM_DATE = คอลัมน์ I ในชีท "รายชื่อ" = วันบรรจุ (วันที่พนักงานได้รับการบรรจุเป็นพนักงานประจำ)

// คอลัมน์ D (STOCK) ในชีท "ราคาสินค้า" ถูกใช้เป็นคอลัมน์ระบุสถานะสินค้า (เช่น 'มีสินค้า', 'หมด', 'สินค้าหมด')
const PRICE_COL = { ITEM: 1, SIZE: 2, PRICE: 3, STOCK: 4 };
const PRICE_HEADER_ROW = 1;

// ชีท "รายการสินค้าเบิก" (สำหรับเมนู "เบิกพิเศษ") มีแค่ 2 คอลัมน์: A=รายการ, B=Size (ไม่มีราคา/สต็อก เพราะเป็นการเบิก ไม่ใช่การซื้อ)
// ถ้ารายการใดไม่มีไซส์ ให้เว้นคอลัมน์ B ว่างไว้ในชีท (1 แถว = 1 รายการ หรือ 1 รายการ+1 ไซส์)
const SPECIAL_PRODUCT_COL = { ITEM: 1, SIZE: 2 };
const SPECIAL_PRODUCT_HEADER_ROW = 1;

const ORDER_COL = {
  TIMESTAMP: 1, ORDER_ID: 2, EMP_CODE: 3, EMP_NAME: 4, EMP_DEPT: 5, PICKUP_LOCATION: 6,
  PHONE: 7, ITEM: 8, SIZE: 9, QTY: 10, UNIT_PRICE: 11, TOTAL: 12, STATUS: 13, UPDATED_AT: 14, ADMIN_NOTE: 15
};
const ORDER_HEADERS = ['วันที่/เวลา', 'เลขที่คำสั่งซื้อ', 'รหัสพนักงาน', 'ชื่อ-สกุล', 'แผนก', 'โรงงาน', 'เบอร์ติดต่อ', 'รายการ', 'ไซส์', 'จำนวน', 'ราคา/หน่วย', 'รวม', 'สถานะ', 'วันที่/เวลาอัปเดตสถานะ', 'หมายเหตุ(แอดมิน)'];
// หมายเหตุ: คอลัมน์ F (ORDER_COL.PICKUP_LOCATION) คือคอลัมน์ "โรงงาน" ในชีท "รายการสั่งซื้อ"
// สรุปยอดขายสินค้า (getItemSummary) ใช้คอลัมน์นี้เป็นตัวกำหนดกลุ่มโรงงาน โดยรวมโรงงานลาดกระบัง 1 และ 2 เป็นยอดเดียวกัน (ดู FACTORY_GROUPS ด้านล่าง)

const PICKUP_LOCATIONS = ['โรงงานลาดกระบัง 1', 'โรงงานลาดกระบัง 2', 'โรงงานบางชัน'];

/* ===== กลุ่มโรงงาน สำหรับ Dropdown หน้า "สรุปยอดขายสินค้า" ===== */
// ข้อมูลโรงงานดึงจากชีท "รายการสั่งซื้อ" คอลัมน์ F (ORDER_COL.PICKUP_LOCATION)
// ตามจริงมี 3 โรงงาน (ลาดกระบัง 1, ลาดกระบัง 2, บางชัน)
// แต่ในหน้าสรุปยอดขาย ให้รวมยอดของลาดกระบัง 1 และ 2 เป็นกลุ่มเดียวกัน
const FACTORY_GROUPS = [
  { key: 'ALL',         label: 'ทุกโรงงาน',              locations: PICKUP_LOCATIONS },
  { key: 'BANGCHAN',    label: 'โรงงานบางชัน',            locations: ['โรงงานบางชัน'] },
  { key: 'LADKRABANG',  label: 'โรงงานลาดกระบัง (รวม 1+2)', locations: ['โรงงานลาดกระบัง 1', 'โรงงานลาดกระบัง 2'] }
];

function getFactoryGroups() {
  return FACTORY_GROUPS.map(function (g) { return { key: g.key, label: g.label }; });
}

function _factoryLocations(factoryKey) {
  factoryKey = _norm(factoryKey) || 'ALL';
  const g = FACTORY_GROUPS.find(function (g) { return g.key === factoryKey; });
  return g ? g.locations : PICKUP_LOCATIONS;
}

const ORDER_STATUSES = [
  'รับคำสั่งซื้อแล้ว',
  'กำลังเตรียมสินค้า',
  'พร้อมให้รับสินค้า',
  'ชำระเงินแล้ว'
];

const CANCELLED_STATUS = 'ยกเลิกคำสั่งซื้อ';
const ALL_STATUSES = ORDER_STATUSES.concat([CANCELLED_STATUS]);

/* ===== เบิกชุดบรรจุ (uniform set for confirmed employees) ===== */
// เก็บประวัติการเบิกชุดบรรจุไว้ในชีทแยก "เบิกชุดบรรจุ" (สร้างอัตโนมัติถ้ายังไม่มี) เพื่อไม่ไปยุ่งกับชีท "รายชื่อ" ที่ HR ดูแลอยู่
// แต่ละแถว = การเบิก 1 ครั้ง (รองรับเบิกซ้ำ/เบิกเพิ่มได้ในอนาคต)
// แต่ละแถวในชีท = การเบิก "1 รายการ" (เสื้อ 1 แถว / กางเกง 1 แถว / แถบสี 1 แถว) ไม่รวมกันเป็นข้อความเดียวเหมือนเดิม
// ลำดับคอลัมน์จริงในชีท "เบิกชุดบรรจุ": A=วันที่บันทึก, B=คำสั่งเบิก, C=รหัสพนักงาน, D=ชื่อ-นามสกุล, E=สังกัด, F=รายการ, G=Size, H=จำนวน, I=สถานะ, J=วันที่/เวลาอัปเดตสถานะ, K=หมายเหตุ
// คอลัมน์ B = เลขที่คำสั่งเบิก (สร้างอัตโนมัติตอนบันทึก คล้ายเลขที่คำสั่งซื้อ ใช้จัดกลุ่มรายการที่เบิกพร้อมกันในครั้งเดียว)
// คอลัมน์ F = ชื่อสินค้าที่เบิก, คอลัมน์ G = ไซส์ (แยกออกจากคอลัมน์รายการ, เว้นว่างได้สำหรับสินค้าที่ไม่มีไซส์ เช่น แถบสี)
// คอลัมน์ H = จำนวน (เสื้อ/กางเกง/แถบสี เบิกครั้งละ 3 ชิ้นเสมอ ดู UNIFORM_CLAIM_FIXED_QTY)
// คอลัมน์ I = สถานะ (ตั้งต้นเป็น "รับคำสั่งเบิกชุด" อัตโนมัติทันทีที่พนักงานกดเบิก จากนั้นแอดมินกดปุ่มเปลี่ยนสถานะได้จากเมนู "เบิกชุดบรรจุวันนี้") -> ใช้เช็คสถานะฝั่งพนักงาน และเปิดสิทธิ์พิมพ์ใบผ่านเมื่อสถานะ = UNIFORM_STATUS_RECEIVED
// คอลัมน์ J = วันที่/เวลาที่กดอัปเดตสถานะล่าสุด (บันทึกอัตโนมัติทุกครั้งที่กดปุ่มเปลี่ยนสถานะ)
// คอลัมน์ K = หมายเหตุ (บังคับกรอกเฉพาะตอนกด "ยกเลิกคำสั่งเบิก" เพื่อระบุเหตุผล)
// คอลัมน์ J = วันที่/เวลาที่กดอัปเดตสถานะล่าสุด (เหมือน ORDER_COL.UPDATED_AT ของชีท "รายการสั่งซื้อ")
// คอลัมน์ K = หมายเหตุ ใช้กรอกเหตุผลตอนกด "ยกเลิกคำสั่งเบิก" (บังคับกรอกเมื่อยกเลิก)
const UNIFORM_CLAIM_HEADERS = ['วันที่บันทึก', 'คำสั่งเบิก', 'รหัสพนักงาน', 'ชื่อ-นามสกุล', 'สังกัด', 'รายการ', 'Size', 'จำนวน', 'สถานะ', 'วันที่/เวลาอัปเดตสถานะ', 'หมายเหตุ'];
const UNIFORM_CLAIM_COL = { UPDATED_AT: 1, CLAIM_ID: 2, CODE: 3, NAME: 4, DEPT: 5, ITEM: 6, SIZE: 7, QTY: 8, STATUS: 9, STATUS_UPDATED_AT: 10, NOTE: 11 };
const UNIFORM_CLAIM_FIXED_QTY = 3;

/* ===== สถานะคำสั่งเบิกชุดบรรจุ (สำหรับปุ่มอัปเดตสถานะในเมนู "เบิกชุดบรรจุวันนี้") =====
 * ลำดับสถานะปกติ: รับคำสั่งเบิกชุด -> กำลังเตรียม -> พร้อมให้รับชุดบรรจุ -> รับชุดบรรจุ
 * หรือกด "ยกเลิกคำสั่งเบิก" (นอกลำดับ) ได้ทุกเมื่อ ซึ่งบังคับให้กรอกหมายเหตุเหตุผลการยกเลิกในคอลัมน์ K เสมอ
 * ทุกครั้งที่กดปุ่มเปลี่ยนสถานะ วันที่/เวลาปัจจุบันจะถูกบันทึกลงคอลัมน์ J (UNIFORM_CLAIM_COL.STATUS_UPDATED_AT)
 */
const UNIFORM_CLAIM_STATUSES = [
  'รับคำสั่งเบิกชุด',
  'กำลังเตรียม',
  'พร้อมให้รับชุดบรรจุ',
  'รับชุดบรรจุ'
];
const UNIFORM_CLAIM_CANCELLED_STATUS = 'ยกเลิกคำสั่งเบิก';
const UNIFORM_CLAIM_ALL_STATUSES = UNIFORM_CLAIM_STATUSES.concat([UNIFORM_CLAIM_CANCELLED_STATUS]);

// ข้อความสถานะที่ต้องตรงเป๊ะกับคอลัมน์ I ของชีท "เบิกชุดบรรจุ" เพื่อเปิดให้พิมพ์/ดาวน์โหลดใบผ่านได้
// (ต้องเป็นสถานะสุดท้ายของลำดับปกติ = "รับชุดบรรจุ")
const UNIFORM_STATUS_RECEIVED = UNIFORM_CLAIM_STATUSES[UNIFORM_CLAIM_STATUSES.length - 1];

/* ===== เบิกพิเศษ (special item withdrawal, สินค้าอิสระจากชีท "รายการสินค้าเบิก" จำนวนกรอกเองได้) =====
 * โครงสร้างเหมือนชีท "เบิกชุดบรรจุ" ทุกประการ (1 แถว = 1 รายการ, รวมหลายแถวด้วย "เลขที่คำสั่งเบิก" เดียวกัน)
 * ต่างกันตรงที่: (1) รายการสินค้าเบิกได้อิสระจากชีท "รายการสินค้าเบิก" ไม่จำกัดเฉพาะเสื้อ/กางเกง/แถบสี
 *              (2) จำนวนกรอกเองได้อิสระ (ไม่ล็อกที่ 3 ชิ้นเหมือนเบิกชุดบรรจุ)
 *              (3) ไม่เช็คสต็อก (ชีท "รายการสินค้าเบิก" ไม่มีคอลัมน์สถานะสต็อก)
 * ลำดับคอลัมน์จริงในชีท "เบิกพิเศษ": A=วันที่บันทึก, B=คำสั่งเบิก, C=รหัสพนักงาน, D=ชื่อ-สกุล, E=สังกัด, F=รายการ, G=Size, H=จำนวน, I=สถานะ, J=วันที่สถานะและเวลา, K=หมายเหตุ
 */
const SPECIAL_CLAIM_HEADERS = ['วันที่บันทึก', 'คำสั่งเบิก', 'รหัสพนักงาน', 'ชื่อ-สกุล', 'สังกัด', 'รายการ', 'Size', 'จำนวน', 'สถานะ', 'วันที่สถานะและเวลา', 'หมายเหตุ'];
const SPECIAL_CLAIM_COL = { UPDATED_AT: 1, CLAIM_ID: 2, CODE: 3, NAME: 4, DEPT: 5, ITEM: 6, SIZE: 7, QTY: 8, STATUS: 9, STATUS_UPDATED_AT: 10, NOTE: 11 };

/* ===== สถานะคำสั่งเบิกพิเศษ (สำหรับปุ่มอัปเดตสถานะในเมนู "เบิกพิเศษวันนี้") =====
 * ลำดับสถานะปกติ: รับรายการสินค้า -> กำลังเตรียม -> พร้อมให้รับสินค้า -> รับสินค้า
 * หรือกด "ยกเลิกคำสั่งเบิก" (นอกลำดับ) ได้ทุกเมื่อ ทุกครั้งที่เปลี่ยนสถานะ คอลัมน์ J (วันที่สถานะและเวลา) จะถูกบันทึกใหม่เสมอ
 */
const SPECIAL_CLAIM_STATUSES = [
  'รับรายการสินค้า',
  'กำลังเตรียม',
  'พร้อมให้รับสินค้า',
  'รับสินค้า'
];
const SPECIAL_CLAIM_CANCELLED_STATUS = 'ยกเลิกคำสั่งเบิก';
const SPECIAL_CLAIM_ALL_STATUSES = SPECIAL_CLAIM_STATUSES.concat([SPECIAL_CLAIM_CANCELLED_STATUS]);

// รายชื่อชีท "แถว 1 รายการเบิก" ทั้งหมดที่ onEdit ต้องคอยซิงค์สถานะ/หมายเหตุข้ามแถวที่มีเลขที่คำสั่งเบิกเดียวกัน (ดู onEdit ด้านล่าง)
// โครงสร้างคอลัมน์ของทุกชีทในลิสต์นี้ต้องตรงกับ UNIFORM_CLAIM_COL/SPECIAL_CLAIM_COL เป๊ะ (CLAIM_ID, STATUS, STATUS_UPDATED_AT, NOTE)
const CLAIM_ONEDIT_SHEETS = [
  { name: SHEET_NAMES.UNIFORM_CLAIM, col: UNIFORM_CLAIM_COL },
  { name: SHEET_NAMES.SPECIAL_CLAIM, col: SPECIAL_CLAIM_COL }
];

// รหัสผ่านระบบแอดมิน มี 2 ระดับ:
//  - DASHBOARD_PASSWORD (สิทธิ์เต็ม)        เข้าได้ทุกเมนู: แดชบอร์ด, สรุปยอดขายสินค้า, Update Stock
//  - DASHBOARD_ONLY_PASSWORD (สิทธิ์จำกัด)  เข้าได้เฉพาะเมนู "แดชบอร์ด" เท่านั้น (ดูข้อมูล/แก้ไขสถานะคำสั่งซื้อในแดชบอร์ดได้)
//                                           เมนู "สรุปยอดขายสินค้า" และ "Update Stock" จะกดใช้งานไม่ได้เลย
const DASHBOARD_PASSWORD = 'wf1982';
const DASHBOARD_ONLY_PASSWORD = 'ad1982';

/**
 * ตรวจสอบรหัสผ่านที่ส่งมา แล้วคืนค่าระดับสิทธิ์
 *  'full'      -> รหัสผ่านสิทธิ์เต็ม (DASHBOARD_PASSWORD)
 *  'dashboard' -> รหัสผ่านสิทธิ์จำกัดเฉพาะแดชบอร์ด (DASHBOARD_ONLY_PASSWORD)
 *  'none'      -> รหัสผ่านไม่ถูกต้อง
 */
function _authLevel(password) {
  password = _norm(password);
  if (password === DASHBOARD_PASSWORD) return 'full';
  if (password === DASHBOARD_ONLY_PASSWORD) return 'dashboard';
  return 'none';
}

// ใช้กับฟังก์ชันที่อยู่ใน "เมนูแดชบอร์ด" เท่านั้น -> อนุญาตทั้งสิทธิ์เต็มและสิทธิ์จำกัด
function _isDashboardAllowed(password) {
  const lvl = _authLevel(password);
  return lvl === 'full' || lvl === 'dashboard';
}

// ใช้กับฟังก์ชันที่อยู่ใน "เมนูอื่นๆ" (สรุปยอดขายสินค้า, Update Stock) -> ต้องเป็นสิทธิ์เต็มเท่านั้น
function _isFullAuth(password) {
  return _authLevel(password) === 'full';
}

/**
 * เรียกจาก Client ทันทีหลังกรอกรหัสผ่าน เพื่อตรวจสอบว่ารหัสถูกต้องหรือไม่ และได้สิทธิ์ระดับใด
 * ใช้ผลลัพธ์ (level) ไปกำหนดว่าจะเปิดใช้งานเมนู "สรุปยอดขายสินค้า" / "Update Stock" ในหน้าเว็บหรือไม่
 */
function checkDashboardAuth(password) {
  const level = _authLevel(password);
  if (level === 'none') return { success: false, message: 'รหัสผ่านไม่ถูกต้อง' };
  return { success: true, level: level };
}

/* ================================ WEB APP ENTRY ================================ */
function doGet(e) {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('สั่งซื้อเครื่องแต่งกาย | Welfare Factory')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getPickupLocations() {
  return PICKUP_LOCATIONS;
}

function _ss() { return SpreadsheetApp.openById(SHEET_ID); }
function _sheet(name) {
  const sh = _ss().getSheetByName(name);
  if (!sh) throw new Error('ไม่พบชีทชื่อ "' + name + '" กรุณาตรวจสอบชื่อชีทใน Google Sheet');
  return sh;
}
function _norm(v) { return (v === null || v === undefined) ? '' : String(v).trim(); }

/**
 * *** ฟังก์ชันตรวจสอบชั่วคราว (ลบทิ้งได้หลังแก้ปัญหาเสร็จ) ***
 * ใช้เช็คว่า SHEET_ID ที่ตั้งไว้ชี้ไปที่สเปรดชีทถูกไฟล์หรือไม่ และชีท "เบิกชุดบรรจุ" มีข้อมูลจริงกี่แถว
 * วิธีใช้: ใน Apps Script Editor เลือกฟังก์ชันนี้จาก dropdown ด้านบน (ข้าง Debug) แล้วกด Run
 * จากนั้นดูผลลัพธ์ที่เมนู "Execution log" (Ctrl+Enter หรือ View > Logs)
 */
function _debugCheckUniformSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  Logger.log('เปิดสเปรดชีทชื่อ: ' + ss.getName());
  Logger.log('URL ของสเปรดชีทที่ SHEET_ID ชี้ไป: ' + ss.getUrl());

  const allSheetNames = ss.getSheets().map(function (s) { return s.getName(); });
  Logger.log('รายชื่อชีททั้งหมดในไฟล์นี้: ' + JSON.stringify(allSheetNames));

  const sh = ss.getSheetByName(SHEET_NAMES.UNIFORM_CLAIM);
  if (!sh) {
    Logger.log('*** ไม่พบชีทชื่อ "' + SHEET_NAMES.UNIFORM_CLAIM + '" ในไฟล์นี้เลย ***');
    return;
  }
  const lastRow = sh.getLastRow();
  Logger.log('พบชีท "' + SHEET_NAMES.UNIFORM_CLAIM + '" -> lastRow = ' + lastRow);

  if (lastRow > 1) {
    const sample = sh.getRange(2, 1, Math.min(lastRow - 1, 5), UNIFORM_CLAIM_HEADERS.length).getValues();
    sample.forEach(function (row, i) {
      const raw = row[UNIFORM_CLAIM_COL.UPDATED_AT - 1];
      Logger.log('แถวที่ ' + (i + 2) + ' คอลัมน์ A ดิบ = "' + raw + '" (type: ' + (raw instanceof Date ? 'Date' : typeof raw) + ') | isoDate ที่แปลงได้ = ' + _uniformRowIsoDate(raw));
    });
  }
}

/* ================================ EMPLOYEE LOOKUP ================================ */
function getEmployeeByCode(code) {
  code = _norm(code);
  if (!code) return { found: false, message: 'กรุณากรอกรหัสพนักงาน' };

  const sh = _sheet(SHEET_NAMES.EMPLOYEES);
  const lastRow = sh.getLastRow();
  if (lastRow <= EMP_HEADER_ROW) return { found: false, message: 'ไม่พบข้อมูลในชีทรายชื่อ' };

  const numCols = Math.max(EMP_COL.CODE, EMP_COL.NAME, EMP_COL.DIVISION, EMP_COL.SECTION, EMP_COL.DEPT, EMP_COL.POSITION, EMP_COL.CONFIRM_DATE);
  const data = sh.getRange(EMP_HEADER_ROW + 1, 1, lastRow - EMP_HEADER_ROW, numCols).getValues();

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rowCode = _norm(row[EMP_COL.CODE - 1]);
    if (rowCode !== '' && rowCode.toLowerCase() === code.toLowerCase()) {
      const division = _norm(row[EMP_COL.DIVISION - 1]);
      const section = _norm(row[EMP_COL.SECTION - 1]);
      const dept = _norm(row[EMP_COL.DEPT - 1]);
      const deptLabel = [division, section, dept].filter(function (v) { return v !== ''; }).join(' / ');
      const confirmRaw = row[EMP_COL.CONFIRM_DATE - 1];
      const confirmDate = confirmRaw instanceof Date ? _formatThaiDate(confirmRaw) : _norm(confirmRaw);
      return {
        found: true,
        code: rowCode,
        name: _norm(row[EMP_COL.NAME - 1]),
        division: division,
        section: section,
        dept: dept,
        deptLabel: deptLabel,
        position: _norm(row[EMP_COL.POSITION - 1]),
        confirmDate: confirmDate
      };
    }
  }
  return { found: false, message: 'ไม่พบรหัสพนักงานนี้ในระบบ กรุณาตรวจสอบอีกครั้ง' };
}

/* ================================ เบิกชุดบรรจุ ================================ */

/**
 * แปลงค่าดิบจากคอลัมน์ "วันที่บันทึก" (UPDATED_AT) ในชีท "เบิกชุดบรรจุ" ให้เป็น ISO "yyyy-MM-dd" (ค.ศ.)
 * เพื่อใช้เทียบกับช่วงวันที่ (startDateStr/endDateStr) ที่ส่งมาจาก Client ซึ่งเป็นรูปแบบ ISO เสมอ (input type="date")
 * รองรับค่าดิบได้ทุกแบบที่อาจเจอในชีทจริง:
 *  - Date object (Google Sheets แปลงให้อัตโนมัติเมื่อพิมพ์/วางวันที่ตรงๆ) -> แปลงตรงด้วย Utilities.formatDate ไม่ผ่านการแปลงข้อความ พ.ศ. เลย (แม่นยำที่สุด)
 *  - ข้อความรูปแบบ "dd/mm/yyyy..." ปี พ.ศ. (จาก _formatThaiDate ตอนบันทึกผ่านฟอร์ม) -> ปีจะมากกว่า 2400 จึงลบ 543
 *  - ข้อความรูปแบบ "dd/mm/yyyy..." ปี ค.ศ. ปกติ (กรณีแอดมินพิมพ์วันที่เองตรงๆ ในชีทแบบข้อความ) -> ปีน้อยกว่า 2400 ใช้ตรงๆ ไม่ลบ
 * คืนค่า '' ถ้ารูปแบบไม่ถูกต้อง
 */
function _uniformRowIsoDate(rawValue) {
  if (rawValue instanceof Date) return Utilities.formatDate(rawValue, 'GMT+7', 'yyyy-MM-dd');

  const text = _norm(rawValue);
  if (!text) return '';
  const datePart = text.split(' ')[0];
  const parts = datePart.split('/');
  if (parts.length !== 3) return '';
  const day = parts[0], month = parts[1];
  let year = Number(parts[2]);
  if (!day || !month || !year) return '';
  if (year > 2400) year -= 543; // ปี พ.ศ. -> ค.ศ. (ปี ค.ศ. ปกติจะไม่เกิน 2400)
  const pad = function (v) { return String(v).length < 2 ? '0' + v : String(v); };
  return String(year) + '-' + pad(month) + '-' + pad(day);
}

/**
 * แปลงค่าดิบจากคอลัมน์ "วันที่บันทึก" (UPDATED_AT) ในชีท "เบิกชุดบรรจุ" ให้เป็นข้อความรูปแบบ
 * "dd/mm/yyyy(พ.ศ.) HH:mm:ss" เสมอ ไม่ว่าค่าจริงในชีทจะเป็นข้อความ (ที่บันทึกผ่าน submitUniformClaim)
 * หรือถูก Google Sheets แปลงเป็น Date object ให้เองอัตโนมัติ (เช่น กรณีสเปรดชีทตั้ง locale เป็นไทย
 * แล้วพิมพ์/วางค่าเป็นวันที่ตรงๆ) ใช้สำหรับ "แสดงผล" เท่านั้น (ไม่ใช้เทียบช่วงวันที่แล้ว ดู _uniformRowIsoDate)
 */
function _normUniformUpdatedAt(rawValue) {
  if (rawValue instanceof Date) return _formatThaiDate(rawValue, 'HH:mm:ss');
  return _norm(rawValue);
}

/**
 * Simple Trigger: ทำงานอัตโนมัติทุกครั้งที่มีการแก้ไขค่าใดๆ ในสเปรดชีทนี้ (ไม่ต้องตั้งค่า trigger เพิ่มเอง)
 * ทำ 2 อย่าง:
 * 1) ชีท "รายการสั่งซื้อ": ถ้าแก้ไขคอลัมน์สถานะ (M) ตรงในชีทเอง (ไม่ผ่านปุ่มในแดชบอร์ด) จะบันทึกวันที่/เวลาปัจจุบันลงคอลัมน์ N (วันที่/เวลาอัปเดตสถานะ) ให้อัตโนมัติ
 *    ป้องกันปัญหาแก้สถานะตรงในชีทแล้วคอลัมน์เวลาไม่อัปเดตตาม (เดิมมีแค่ปุ่มในแดชบอร์ด/updateOrderData เท่านั้นที่อัปเดตเวลาให้)
 * 2) ชีท "เบิกชุดบรรจุ" และ "เบิกพิเศษ" (ดู CLAIM_ONEDIT_SHEETS): ซิงค์สถานะ/หมายเหตุ ให้ตรงกันในทุกแถวที่มี "เลขที่คำสั่งเบิก" (คอลัมน์ B) เดียวกัน
 *    กรณีนี้จำเป็นเพราะ 1 คำสั่งเบิก อาจมีหลายแถว (เสื้อ/กางเกง/แถบสี แยกคนละแถว) แต่ควรมีสถานะเดียวกันเสมอ
 *    ถ้าแก้ไขคอลัมน์สถานะหรือหมายเหตุของแถวใดแถวหนึ่งตรงในชีทโดยตรง จะคัดลอกค่าไปยังแถวอื่นที่มีเลขที่คำสั่งเบิกเดียวกันให้อัตโนมัติ กันปัญหาบางแถวอัปเดตแต่บางแถวไม่อัปเดต
 */
function onEdit(e) {
  try {
    if (!e || !e.range) return;
    const sh = e.range.getSheet();
    const row = e.range.getRow();
    const col = e.range.getColumn();
    if (row <= 1) return; // ข้ามแถวหัวตาราง

    // ชีท "รายการสั่งซื้อ": ถ้าแก้ไขคอลัมน์ M (สถานะ) ตรงในชีทเอง (ไม่ผ่านปุ่มในแดชบอร์ด)
    // ให้บันทึกวันที่/เวลาปัจจุบันลงคอลัมน์ N (ORDER_COL.UPDATED_AT) ให้อัตโนมัติทันที เหมือนพฤติกรรมของปุ่มอัปเดตในแดชบอร์ด (updateOrderData)
    if (sh.getName() === SHEET_NAMES.ORDERS) {
      if (col !== ORDER_COL.STATUS) return;
      sh.getRange(row, ORDER_COL.UPDATED_AT).setValue(_formatThaiDate(new Date(), 'HH:mm:ss'));
      return;
    }

    const cfg = CLAIM_ONEDIT_SHEETS.find(function (c) { return c.name === sh.getName(); });
    if (!cfg) return;
    const COL = cfg.col;

    if (col !== COL.STATUS && col !== COL.NOTE) return; // สนใจเฉพาะคอลัมน์สถานะ/หมายเหตุ

    const claimId = _norm(sh.getRange(row, COL.CLAIM_ID).getValue());
    if (!claimId) return; // แถวเก่าที่ไม่มีเลขที่คำสั่งเบิก ไม่ต้องซิงค์ (ไม่รู้จะซิงค์กับแถวไหน)

    const lastRow = sh.getLastRow();
    if (lastRow <= 1) return;

    const newStatus = _norm(sh.getRange(row, COL.STATUS).getValue());
    const newNote = _norm(sh.getRange(row, COL.NOTE).getValue());
    const now = new Date();

    const claimIdCol = sh.getRange(2, COL.CLAIM_ID, lastRow - 1, 1).getValues();
    claimIdCol.forEach(function (r, i) {
      const rowNum = 2 + i;
      if (rowNum === row) return; // ข้ามแถวที่กำลังแก้ไขเอง
      if (_norm(r[0]) !== claimId) return;
      sh.getRange(rowNum, COL.STATUS).setValue(newStatus);
      sh.getRange(rowNum, COL.STATUS_UPDATED_AT).setValue(now);
      sh.getRange(rowNum, COL.NOTE).setValue(newNote);
    });

    if (col === COL.STATUS) {
      sh.getRange(row, COL.STATUS_UPDATED_AT).setValue(now);
    }
  } catch (err) {
    // ไม่ throw ต่อ เพื่อไม่ให้ trigger พังการแก้ไขปกติของผู้ใช้ในชีท
  }
}

function _uniformClaimSheet() {
  const ss = _ss();
  let sh = ss.getSheetByName(SHEET_NAMES.UNIFORM_CLAIM);
  // กันเคสชื่อชีทจริงมีช่องว่างเกิน/ตัวพิมพ์เพี้ยนเล็กน้อย (เช่น "เบิกชุดบรรจุ " มีวรรคท้าย)
  // ซึ่งจะทำให้ getSheetByName หาไม่เจอ แล้วไปสร้างชีทใหม่ว่างๆ ซ้อนขึ้นมาแทนที่จะใช้ชีทเดิมที่มีข้อมูลอยู่แล้ว
  if (!sh) {
    const target = _norm(SHEET_NAMES.UNIFORM_CLAIM).toLowerCase();
    sh = ss.getSheets().find(function (s) { return _norm(s.getName()).toLowerCase() === target; }) || null;
  }
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAMES.UNIFORM_CLAIM);
    sh.getRange(1, 1, 1, UNIFORM_CLAIM_HEADERS.length).setValues([UNIFORM_CLAIM_HEADERS]);
    sh.getRange(1, 1, 1, UNIFORM_CLAIM_HEADERS.length).setFontWeight('bold');
  }
  _ensureUniformStatusValidation(sh);
  return sh;
}

/**
 * ตั้ง/รีเฟรช Data Validation (dropdown) ของคอลัมน์ I (สถานะ) ในชีท "เบิกชุดบรรจุ" ให้ตรงกับ UNIFORM_CLAIM_ALL_STATUSES เสมอ
 * ใช้ setAllowInvalid(true) = โหมด "แสดงคำเตือน" ไม่ใช่ "ปฏิเสธข้อมูล" เพื่อกันไม่ให้สคริปต์เขียนสถานะไม่ผ่าน (เกิด error เวลากดปุ่มอัปเดตสถานะ)
 * แม้ในชีทจะเคยมีการตั้ง dropdown แบบ "ปฏิเสธข้อมูล" ด้วยรายการสถานะเก่าไว้ก่อนหน้านี้ก็ตาม จะถูกเขียนทับให้ตรงกับรายการสถานะปัจจุบันทุกครั้งที่เปิดใช้งานชีทนี้
 * ห่อด้วย try/catch เผื่อสคริปต์ไม่มีสิทธิ์แก้ validation (เช่น ชีทถูกป้องกันไว้) จะได้ไม่กระทบการทำงานหลัก
 */
function _ensureUniformStatusValidation(sh) {
  try {
    const rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(UNIFORM_CLAIM_ALL_STATUSES, true)
      .setAllowInvalid(true)
      .build();
    const maxRows = Math.max(sh.getMaxRows() - 1, 1);
    sh.getRange(2, UNIFORM_CLAIM_COL.STATUS, maxRows, 1).setDataValidation(rule);
  } catch (e) {
    // ไม่ throw ต่อ เพื่อไม่ให้กระทบการทำงานหลักของระบบ
  }
}

// รายการเสื้อ/กางเกงที่เบิกได้ในเมนู "เบิกชุดบรรจุ" และคอลัมน์สถานะสต็อกที่ต้องอ่านในชีท "ราคาสินค้า"
// เสื้อโปโลสีขาว, กางเกงสีเทา, กางเกงสีดำ อ่านสถานะจากคอลัมน์ D (เหมือนหน้าสั่งซื้อปกติ)
// เสื้อโปโลสีกรม อ่านสถานะจากคอลัมน์ E แยกต่างหาก
const UNIFORM_ITEMS_CONFIG = [
  { match: 'เสื้อโปโลสีขาว',    category: 'shirt', stockCol: 4 },
  { match: 'เสื้อโปโลสีกรม', category: 'shirt', stockCol: 5 },
  { match: 'กางเกงสีเทา',       category: 'pants', stockCol: 4 },
  { match: 'กางเกงสีดำ',        category: 'pants', stockCol: 4 }
];

// "แถบสี": อยู่ในชีท "ราคาสินค้า" คอลัมน์ A ตั้งแต่แถวที่ 115 ถึง 129 (ตำแหน่งแถวจริงในชีต ไม่ใช่ index)
// ทุกแถวในช่วงนี้ที่คอลัมน์ A มีชื่อสินค้า จะถูกจัดเป็น category 'strap' ทั้งหมด สถานะสต็อกอ่านจากคอลัมน์ D เหมือนสินค้าทั่วไป
const UNIFORM_STRAP_ROW_START = 115;
const UNIFORM_STRAP_ROW_END = 129;
const UNIFORM_STRAP_STOCK_COL = 4;

/**
 * ดึงข้อมูลเสื้อ/กางเกง/แถบสี ที่ใช้ในหน้า "เบิกชุดบรรจุ" จากชีท "ราคาสินค้า"
 * แต่ละแถวคือ 1 ไซส์ของ 1 รายการ พร้อมสถานะสต็อก
 * - เสื้อ/กางเกง: จับคู่ตามรายชื่อที่กำหนดไว้ใน UNIFORM_ITEMS_CONFIG (สถานะสต็อกตาม stockCol ที่ระบุ)
 * - แถบสี: อ่านตรงจากแถวที่ 115-129 ในชีท (คอลัมน์ A = ชื่อสินค้า, คอลัมน์ D = สถานะสต็อก)
 */
function getUniformCatalog() {
  const sh = _sheet(SHEET_NAMES.PRICES);
  const lastRow = sh.getLastRow();
  if (lastRow <= PRICE_HEADER_ROW) return [];

  const numCols = Math.max(PRICE_COL.ITEM, PRICE_COL.SIZE, PRICE_COL.PRICE, PRICE_COL.STOCK, 5);
  const data = sh.getRange(PRICE_HEADER_ROW + 1, 1, lastRow - PRICE_HEADER_ROW, numCols).getValues();

  const out = [];
  data.forEach(function (row) {
    const item = _norm(row[PRICE_COL.ITEM - 1]);
    if (!item) return;

    const config = UNIFORM_ITEMS_CONFIG.find(function (c) { return c.match === item; });
    if (!config) return;
    out.push({
      item: item,
      category: config.category,
      size: _norm(row[PRICE_COL.SIZE - 1]),
      isOutOfStock: _isOutOfStock(row[config.stockCol - 1])
    });
  });

  // แถบสี: อ่านเฉพาะช่วงแถว 115-129 ในชีท "ราคาสินค้า" โดยตรง (แยกจากลูปด้านบนเพราะไม่ได้จับคู่ด้วยชื่อ)
  const strapRowCount = UNIFORM_STRAP_ROW_END - UNIFORM_STRAP_ROW_START + 1;
  if (lastRow >= UNIFORM_STRAP_ROW_START && strapRowCount > 0) {
    const actualStrapRowCount = Math.min(strapRowCount, lastRow - UNIFORM_STRAP_ROW_START + 1);
    const strapData = sh.getRange(UNIFORM_STRAP_ROW_START, 1, actualStrapRowCount, numCols).getValues();
    strapData.forEach(function (row) {
      const item = _norm(row[PRICE_COL.ITEM - 1]);
      if (!item) return;
      out.push({
        item: item,
        category: 'strap',
        size: _norm(row[PRICE_COL.SIZE - 1]),
        isOutOfStock: _isOutOfStock(row[UNIFORM_STRAP_STOCK_COL - 1])
      });
    });
  }

  return out;
}

/**
 * เรียกจาก Client เพื่อขอรายการเสื้อ/กางเกงสำหรับหน้า "เบิกชุดบรรจุ" พร้อมสถานะสต็อก
 */
function getUniformCatalogData(password) {
  if (!_isDashboardAllowed(password)) return { success: false, message: 'รหัสผ่านไม่ถูกต้อง' };
  return { success: true, items: getUniformCatalog() };
}

/**
 * ฝั่งแอดมิน: ดึงประวัติการเบิกชุดบรรจุของพนักงาน 1 คน (เรียงล่าสุดก่อน)
 */
function getEmployeeUniformHistory(password, empCode) {
  if (!_isDashboardAllowed(password)) return { success: false, message: 'รหัสผ่านไม่ถูกต้อง' };

  empCode = _norm(empCode);
  if (!empCode) return { success: true, history: [] };

  const sh = _uniformClaimSheet();
  const lastRow = sh.getLastRow();
  if (lastRow <= 1) return { success: true, history: [] };

  const data = sh.getRange(2, 1, lastRow - 1, UNIFORM_CLAIM_HEADERS.length).getValues();

  // แต่ละแถวในชีทตอนนี้คือ "1 รายการ" (เสื้อ/กางเกง/แถบสี แยกกันคนละแถว) -> รวมแถวที่บันทึกพร้อมกัน (รหัสพนักงาน+เวลาเดียวกัน) กลับเป็น 1 รายการประวัติ
  const grouped = {};
  const order = [];
  data.forEach(function (row) {
    const code = _norm(row[UNIFORM_CLAIM_COL.CODE - 1]);
    if (code.toLowerCase() !== empCode.toLowerCase()) return;
    const claimId = _norm(row[UNIFORM_CLAIM_COL.CLAIM_ID - 1]);
    const updatedAt = _normUniformUpdatedAt(row[UNIFORM_CLAIM_COL.UPDATED_AT - 1]);
    const item = _norm(row[UNIFORM_CLAIM_COL.ITEM - 1]);
    const size = _norm(row[UNIFORM_CLAIM_COL.SIZE - 1]);
    const qty = Number(row[UNIFORM_CLAIM_COL.QTY - 1]) || 0;
    const status = _norm(row[UNIFORM_CLAIM_COL.STATUS - 1]);
    const key = claimId || (code + '|' + updatedAt);
    if (!grouped[key]) { grouped[key] = { claimId: claimId, items: [], updatedAt: updatedAt, status: status }; order.push(key); }
    if (status && !grouped[key].status) grouped[key].status = status;
    const itemLabel = size ? (item + ' (' + size + ')') : item;
    grouped[key].items.push(itemLabel + (qty ? (' x' + qty) : ''));
  });

  const history = order.map(function (key) {
    return { claimId: grouped[key].claimId, items: grouped[key].items.join(', '), updatedAt: grouped[key].updatedAt, status: grouped[key].status || '' };
  }).reverse();

  return { success: true, history: history };
}

/**
 * ฝั่งแอดมิน: บันทึกการเบิกชุดบรรจุของพนักงาน 1 คน (เลือกเสื้อ/กางเกงพร้อมไซส์ อย่างน้อย 1 รายการ)
 * ตรวจสอบสต็อกจาก getUniformCatalog ก่อนบันทึกทุกครั้ง
 */
function submitUniformClaim(password, empCode, shirtItem, shirtSize, pantsItem, pantsSize, strapItem) {
  if (!_isDashboardAllowed(password)) return { success: false, message: 'รหัสผ่านไม่ถูกต้อง' };

  empCode = _norm(empCode);
  if (!empCode) return { success: false, message: 'ไม่พบรหัสพนักงาน' };

  const emp = getEmployeeByCode(empCode);
  if (!emp.found) return { success: false, message: 'ไม่พบรหัสพนักงานนี้ในระบบ' };

  shirtItem = _norm(shirtItem);
  shirtSize = _norm(shirtSize);
  pantsItem = _norm(pantsItem);
  pantsSize = _norm(pantsSize);
  strapItem = _norm(strapItem);

  if (!shirtItem && !pantsItem && !strapItem) return { success: false, message: 'กรุณาเลือกเสื้อ กางเกง หรือแถบสีอย่างน้อย 1 รายการ' };

  const catalog = getUniformCatalog();
  const pickedRows = [];

  if (shirtItem) {
    if (!shirtSize) return { success: false, message: 'กรุณาเลือกไซส์เสื้อ' };
    const row = catalog.find(function (p) { return p.item === shirtItem && p.size === shirtSize; });
    if (!row) return { success: false, message: 'ไม่พบข้อมูลเสื้อที่เลือก' };
    if (row.isOutOfStock) return { success: false, message: shirtItem + ' ไซส์ ' + shirtSize + ' หมด ไม่สามารถเบิกได้' };
    pickedRows.push(row);
  }
  if (pantsItem) {
    if (!pantsSize) return { success: false, message: 'กรุณาเลือกไซส์กางเกง' };
    const row = catalog.find(function (p) { return p.item === pantsItem && p.size === pantsSize; });
    if (!row) return { success: false, message: 'ไม่พบข้อมูลกางเกงที่เลือก' };
    if (row.isOutOfStock) return { success: false, message: pantsItem + ' ไซส์ ' + pantsSize + ' หมด ไม่สามารถเบิกได้' };
    pickedRows.push(row);
  }
  if (strapItem) {
    const row = catalog.find(function (p) { return p.category === 'strap' && p.item === strapItem; });
    if (!row) return { success: false, message: 'ไม่พบข้อมูลแถบสีที่เลือก' };
    if (row.isOutOfStock) return { success: false, message: strapItem + ' หมด ไม่สามารถเบิกได้' };
    pickedRows.push(row);
  }

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
  } catch (e) {
    return { success: false, message: 'ระบบกำลังมีผู้ใช้งานคนอื่นอยู่ กรุณาลองใหม่อีกครั้ง' };
  }

  try {
    const sh = _uniformClaimSheet();
    // บันทึกเป็น Date object จริง (เหมือนคอลัมน์ TIMESTAMP ในชีท "รายการสั่งซื้อ") แทนข้อความ พ.ศ.
    // เพื่อให้ Google Sheets มองเป็นวันที่จริง ค้นหา/กรอง/เรียงลำดับในชีทได้ปกติ
    // (ฟังก์ชัน _uniformRowIsoDate และ _normUniformUpdatedAt รองรับ Date object อยู่แล้ว จึงไม่กระทบการแสดงผล/การเทียบช่วงวันที่)
    const now = new Date();
    // เลขที่คำสั่งเบิก: สร้างใหม่ทุกครั้งที่กดบันทึก 1 ครั้ง (คล้ายเลขที่คำสั่งซื้อ) ใช้จัดกลุ่มรายการที่เบิกพร้อมกันในครั้งเดียว
    const claimId = 'UB' + Utilities.formatDate(new Date(), 'GMT+7', 'yyMMddHHmmss');
    // แยกเสื้อ/กางเกง/แถบสี เป็นคนละแถวในชีท: คอลัมน์ A=วันที่บันทึก, B=คำสั่งเบิก, C=รหัสพนักงาน, D=ชื่อ-นามสกุล, E=สังกัด, F=รายการ, G=Size, H=จำนวน (เบิกอย่างละ 3 ชิ้นเสมอ),
    // I=สถานะ (ตั้งต้นเป็น "รับคำสั่งเบิกชุด" อัตโนมัติทันทีที่บันทึก), J=วันที่/เวลาอัปเดตสถานะ (ตั้งต้น = เวลาที่บันทึกนี้เอง), K=หมายเหตุ (ว่างไว้ก่อน)
    pickedRows.forEach(function (r) {
      sh.appendRow([now, claimId, emp.code, emp.name, emp.deptLabel || emp.dept, r.item, r.size || '', UNIFORM_CLAIM_FIXED_QTY, UNIFORM_CLAIM_STATUSES[0], now, '']);
    });
    const itemsLabel = pickedRows.map(function (r) {
      const label = r.size ? (r.item + ' (' + r.size + ')') : r.item;
      return label + ' x' + UNIFORM_CLAIM_FIXED_QTY;
    }).join(', ');
    return { success: true, message: 'บันทึกการเบิกชุดบรรจุแล้ว', empCode: emp.code, claimId: claimId, items: itemsLabel };
  } catch (err) {
    return { success: false, message: 'เกิดข้อผิดพลาด: ' + err.message };
  } finally {
    lock.releaseLock();
  }
}

/**
 * ฝั่งแอดมิน (เมนูย่อยแดชบอร์ด "เบิกชุดบรรจุวันนี้"):
 * ดึงรายการเบิกชุดบรรจุทั้งหมดภายในช่วงวันที่ที่กำหนด (startDateStr - endDateStr, รูปแบบ ISO yyyy-MM-dd)
 * จากชีท "เบิกชุดบรรจุ" เรียงล่าสุดก่อน ใช้ดูได้ทั้งวันเดียว (ส่งค่าเดียวกันทั้งคู่) หรือหลายวันติดกันก็ได้
 * เหมือนรูปแบบ getDashboardData/getItemSummary ถ้าไม่ส่งมาหรือรูปแบบผิดจะใช้ "วันนี้" แทนอัตโนมัติ (ผ่าน _resolveDateRange)
 * หมายเหตุ: ตั้งแต่แก้ไขล่าสุด คอลัมน์ UPDATED_AT ในชีทนี้จะถูกบันทึกเป็น Date object จริง (เหมือนคอลัมน์ TIMESTAMP ในชีท "รายการสั่งซื้อ")
 * ส่วนแถวเก่าก่อนแก้ไขอาจยังเป็นข้อความรูปแบบ "dd/mm/yyyy(พ.ศ.) HH:mm:ss" (จาก _formatThaiDate) อยู่
 * จึงต้องแปลงเป็น ISO ก่อนเทียบกับช่วงวันที่แบบ ISO ที่ส่งมาจาก Client (ผ่าน _uniformRowIsoDate ซึ่งรองรับทั้ง Date object, ข้อความปี พ.ศ., และข้อความปี ค.ศ.)
 */
function getTodayUniformClaims(password, startDateStr, endDateStr) {
  if (!_isDashboardAllowed(password)) return { success: false, message: 'รหัสผ่านไม่ถูกต้อง' };

  const range = _resolveDateRange(startDateStr, endDateStr);
  startDateStr = range.startDate;
  endDateStr = range.endDate;

  const sh = _uniformClaimSheet();
  const lastRow = sh.getLastRow();
  if (lastRow <= 1) {
    return {
      success: true, startDate: startDateStr, endDate: endDateStr, records: [], totalEmployees: 0, totalItems: 0,
      statuses: UNIFORM_CLAIM_STATUSES, statusOptions: UNIFORM_CLAIM_ALL_STATUSES, cancelledStatus: UNIFORM_CLAIM_CANCELLED_STATUS
    };
  }

  const data = sh.getRange(2, 1, lastRow - 1, UNIFORM_CLAIM_HEADERS.length).getValues();

  // แต่ละแถวในชีทตอนนี้คือ "1 รายการ" (เสื้อ/กางเกง/แถบสี แยกกันคนละแถว) -> รวมแถวที่มีเลขที่คำสั่งเบิก (คอลัมน์ B) เดียวกัน กลับเป็น 1 การ์ดต่อการเบิก 1 ครั้ง
  // (เผื่อแถวเก่าก่อนมีคอลัมน์คำสั่งเบิก ที่ยังไม่มีเลขที่คำสั่งเบิก จะ fallback ไปรวมด้วยรหัสพนักงาน+เวลาเดียวกันแทน)
  const grouped = {};
  const order = [];
  let totalItems = 0;

  data.forEach(function (row) {
    const rawUpdatedAt = row[UNIFORM_CLAIM_COL.UPDATED_AT - 1];
    const updatedAt = _normUniformUpdatedAt(rawUpdatedAt);
    const isoDate = _uniformRowIsoDate(rawUpdatedAt);
    if (!isoDate || isoDate < startDateStr || isoDate > endDateStr) return;

    const claimId = _norm(row[UNIFORM_CLAIM_COL.CLAIM_ID - 1]);
    const code = _norm(row[UNIFORM_CLAIM_COL.CODE - 1]);
    const item = _norm(row[UNIFORM_CLAIM_COL.ITEM - 1]);
    const size = _norm(row[UNIFORM_CLAIM_COL.SIZE - 1]);
    const qty = Number(row[UNIFORM_CLAIM_COL.QTY - 1]) || 0;
    const status = _norm(row[UNIFORM_CLAIM_COL.STATUS - 1]);
    const note = _norm(row[UNIFORM_CLAIM_COL.NOTE - 1]);
    totalItems += qty;

    const key = claimId || (code + '|' + updatedAt);
    if (!grouped[key]) {
      grouped[key] = {
        claimId: claimId,
        code: code,
        name: _norm(row[UNIFORM_CLAIM_COL.NAME - 1]),
        dept: _norm(row[UNIFORM_CLAIM_COL.DEPT - 1]),
        items: [],
        updatedAt: updatedAt,
        isoDate: isoDate,
        status: status,
        note: note
      };
      order.push(key);
    }
    if (status && !grouped[key].status) grouped[key].status = status;
    if (note && !grouped[key].note) grouped[key].note = note;
    const itemLabel = size ? (item + ' (' + size + ')') : item;
    grouped[key].items.push(itemLabel + (qty ? (' x' + qty) : ''));
  });

  const records = order.map(function (key) {
    const g = grouped[key];
    return {
      claimId: g.claimId, code: g.code, name: g.name, dept: g.dept, items: g.items.join(', '),
      updatedAt: g.updatedAt, status: g.status || '', note: g.note || '',
      canPrintPass: true // แอดมิน (เบิกชุดบรรจุวันนี้): พิมพ์ใบผ่านได้ทุกสถานะ ไม่ต้องรอ "รับชุดบรรจุแล้ว"
    };
  });

  // เรียงตาม isoDate + เวลา จากล่าสุดไปเก่าสุด (รองรับหลายวัน ไม่ใช่แค่ลำดับ append ในชีทแบบเดิมที่ใช้ได้แค่วันเดียว)
  records.sort(function (a, b) {
    const ga = grouped[a.claimId || (a.code + '|' + a.updatedAt)];
    const gb = grouped[b.claimId || (b.code + '|' + b.updatedAt)];
    if (ga.isoDate !== gb.isoDate) return ga.isoDate < gb.isoDate ? 1 : -1;
    return ga.updatedAt < gb.updatedAt ? 1 : -1;
  });

  return {
    success: true,
    startDate: startDateStr,
    endDate: endDateStr,
    records: records,
    totalEmployees: records.length,
    totalItems: totalItems,
    statuses: UNIFORM_CLAIM_STATUSES,
    statusOptions: UNIFORM_CLAIM_ALL_STATUSES,
    cancelledStatus: UNIFORM_CLAIM_CANCELLED_STATUS
  };
}

/**
 * ฝั่งแอดมิน (เมนูย่อยแดชบอร์ด "เบิกชุดบรรจุวันนี้"): ค้นหารายการเบิกชุดบรรจุด้วยรหัสพนักงาน (รองรับค้นหาด้วยชื่อ/สังกัดด้วย)
 * ค้นหาได้ "ทุกวัน" ไม่จำกัดเฉพาะช่วงวันที่ที่เลือกอยู่บนหน้าจอ (ต่างจาก getTodayUniformClaims ที่กรองตามช่วงวันที่เท่านั้น)
 * ใช้ตอนแอดมินอยากเช็คประวัติการเบิกชุดบรรจุของพนักงานคนใดคนหนึ่งแบบไม่ต้องไล่เปลี่ยนช่วงวันที่ทีละวัน
 */
function searchUniformClaims(password, query) {
  if (!_isDashboardAllowed(password)) return { success: false, message: 'รหัสผ่านไม่ถูกต้อง' };

  query = _norm(query).toLowerCase();
  if (!query) return { success: false, message: 'กรุณากรอกรหัสพนักงาน' };

  const sh = _uniformClaimSheet();
  const lastRow = sh.getLastRow();
  if (lastRow <= 1) {
    return {
      success: true, query: query, records: [], totalEmployees: 0, totalItems: 0,
      statuses: UNIFORM_CLAIM_STATUSES, statusOptions: UNIFORM_CLAIM_ALL_STATUSES, cancelledStatus: UNIFORM_CLAIM_CANCELLED_STATUS
    };
  }

  const data = sh.getRange(2, 1, lastRow - 1, UNIFORM_CLAIM_HEADERS.length).getValues();

  // จัดกลุ่มแถวที่มีเลขที่คำสั่งเบิก (claimId) เดียวกัน กลับเป็น 1 การ์ดต่อการเบิก 1 ครั้ง เหมือน getTodayUniformClaims
  // แต่ไม่กรองตามวันที่เลย (ค้นหาย้อนหลังได้ทุกวัน)
  const grouped = {};
  const order = [];
  let totalItems = 0;

  data.forEach(function (row) {
    const code = _norm(row[UNIFORM_CLAIM_COL.CODE - 1]);
    const name = _norm(row[UNIFORM_CLAIM_COL.NAME - 1]);
    const dept = _norm(row[UNIFORM_CLAIM_COL.DEPT - 1]);
    const matches = code.toLowerCase().indexOf(query) !== -1 ||
      name.toLowerCase().indexOf(query) !== -1 ||
      dept.toLowerCase().indexOf(query) !== -1;
    if (!matches) return;

    const rawUpdatedAt = row[UNIFORM_CLAIM_COL.UPDATED_AT - 1];
    const updatedAt = _normUniformUpdatedAt(rawUpdatedAt);
    const isoDate = _uniformRowIsoDate(rawUpdatedAt) || '';

    const claimId = _norm(row[UNIFORM_CLAIM_COL.CLAIM_ID - 1]);
    const item = _norm(row[UNIFORM_CLAIM_COL.ITEM - 1]);
    const size = _norm(row[UNIFORM_CLAIM_COL.SIZE - 1]);
    const qty = Number(row[UNIFORM_CLAIM_COL.QTY - 1]) || 0;
    const status = _norm(row[UNIFORM_CLAIM_COL.STATUS - 1]);
    const note = _norm(row[UNIFORM_CLAIM_COL.NOTE - 1]);
    totalItems += qty;

    const key = claimId || (code + '|' + updatedAt);
    if (!grouped[key]) {
      grouped[key] = {
        claimId: claimId, code: code, name: name, dept: dept, items: [],
        updatedAt: updatedAt, isoDate: isoDate, status: status, note: note
      };
      order.push(key);
    }
    if (status && !grouped[key].status) grouped[key].status = status;
    if (note && !grouped[key].note) grouped[key].note = note;
    const itemLabel = size ? (item + ' (' + size + ')') : item;
    grouped[key].items.push(itemLabel + (qty ? (' x' + qty) : ''));
  });

  const records = order.map(function (key) {
    const g = grouped[key];
    return {
      claimId: g.claimId, code: g.code, name: g.name, dept: g.dept, items: g.items.join(', '),
      updatedAt: g.updatedAt, status: g.status || '', note: g.note || '',
      canPrintPass: true // แอดมิน (เบิกชุดบรรจุวันนี้): พิมพ์ใบผ่านได้ทุกสถานะ ไม่ต้องรอ "รับชุดบรรจุแล้ว"
    };
  });

  // เรียงตาม isoDate + เวลา จากล่าสุดไปเก่าสุด
  records.sort(function (a, b) {
    const ga = grouped[a.claimId || (a.code + '|' + a.updatedAt)];
    const gb = grouped[b.claimId || (b.code + '|' + b.updatedAt)];
    if (ga.isoDate !== gb.isoDate) return ga.isoDate < gb.isoDate ? 1 : -1;
    return ga.updatedAt < gb.updatedAt ? 1 : -1;
  });

  return {
    success: true,
    query: query,
    records: records,
    totalEmployees: records.length,
    totalItems: totalItems,
    statuses: UNIFORM_CLAIM_STATUSES,
    statusOptions: UNIFORM_CLAIM_ALL_STATUSES,
    cancelledStatus: UNIFORM_CLAIM_CANCELLED_STATUS
  };
}

/**
 * ฝั่งแอดมิน (เมนูย่อยแดชบอร์ด "เบิกชุดบรรจุวันนี้"): อัปเดตสถานะคำสั่งเบิกชุดบรรจุ 1 ครั้ง (ระบุด้วยเลขที่คำสั่งเบิก claimId)
 * อัปเดตทุกแถวที่มีเลขที่คำสั่งเบิกเดียวกัน (1 ครั้งของการเบิกอาจมีหลายแถว เช่น เสื้อ+กางเกง+แถบสี) ให้เป็นสถานะเดียวกันพร้อมกัน
 *  - newStatus ต้องอยู่ใน UNIFORM_CLAIM_ALL_STATUSES (4 สถานะปกติ + สถานะยกเลิก)
 *  - ถ้า newStatus = UNIFORM_CLAIM_CANCELLED_STATUS ("ยกเลิกคำสั่งเบิก") บังคับต้องกรอก newNote (เหตุผลการยกเลิก)
 *  - ทุกครั้งที่อัปเดต จะบันทึกวันที่/เวลาปัจจุบันลงคอลัมน์ J (STATUS_UPDATED_AT) และหมายเหตุ (ถ้ามี) ลงคอลัมน์ K (NOTE) เสมอ
 */
function updateUniformClaimStatus(password, claimId, newStatus, newNote) {
  if (!_isDashboardAllowed(password)) return { success: false, message: 'รหัสผ่านไม่ถูกต้อง' };

  claimId = _norm(claimId);
  newStatus = _norm(newStatus);
  newNote = _norm(newNote);

  if (!claimId || !newStatus) return { success: false, message: 'ข้อมูลไม่ครบถ้วน' };
  if (UNIFORM_CLAIM_ALL_STATUSES.indexOf(newStatus) === -1) return { success: false, message: 'สถานะไม่ถูกต้อง' };
  if (newStatus === UNIFORM_CLAIM_CANCELLED_STATUS && !newNote) return { success: false, message: 'กรุณาระบุหมายเหตุเหตุผลที่ยกเลิกคำสั่งเบิก' };

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
  } catch (e) {
    return { success: false, message: 'ระบบกำลังมีผู้ใช้งานคนอื่นอยู่ กรุณาลองใหม่อีกครั้ง' };
  }

  try {
    const sh = _uniformClaimSheet();
    const lastRow = sh.getLastRow();
    if (lastRow <= 1) return { success: false, message: 'ไม่พบรายการเบิกชุดบรรจุ' };

    const numCols = Math.max(UNIFORM_CLAIM_HEADERS.length, sh.getLastColumn());
    const data = sh.getRange(2, 1, lastRow - 1, numCols).getValues();
    let updatedCount = 0;
    const now = new Date();

    data.forEach(function (row, i) {
      const rowClaimId = _norm(row[UNIFORM_CLAIM_COL.CLAIM_ID - 1]);
      if (rowClaimId !== claimId) return;
      sh.getRange(2 + i, UNIFORM_CLAIM_COL.STATUS).setValue(newStatus);
      sh.getRange(2 + i, UNIFORM_CLAIM_COL.STATUS_UPDATED_AT).setValue(now);
      sh.getRange(2 + i, UNIFORM_CLAIM_COL.NOTE).setValue(newNote);
      updatedCount++;
    });

    if (updatedCount === 0) return { success: false, message: 'ไม่พบรายการเบิกชุดบรรจุเลขที่ ' + claimId };
    return { success: true, message: 'อัปเดตสถานะเรียบร้อยแล้ว', claimId: claimId, status: newStatus };
  } catch (err) {
    return { success: false, message: 'เกิดข้อผิดพลาด: ' + err.message };
  } finally {
    lock.releaseLock();
  }
}

/**
 * ฝั่งพนักงาน: เช็คสถานะการเบิกชุดบรรจุด้วยรหัสพนักงาน (ใช้ในหน้า "เช็คสถานะคำสั่งซื้อ" คู่กับสถานะคำสั่งซื้อปกติ)
 * รวมแถวที่บันทึกพร้อมกัน (รหัสพนักงาน+เวลาเดียวกัน) กลับเป็น 1 รายการเบิกต่อครั้ง พร้อมสถานะจากคอลัมน์ G
 */
function getUniformStatusByCode(code) {
  code = _norm(code);
  if (!code) return { success: false, message: 'กรุณากรอกรหัสพนักงาน' };

  const emp = getEmployeeByCode(code);
  if (!emp.found) return { success: false, message: 'ไม่พบรหัสพนักงานนี้ในระบบ กรุณาตรวจสอบอีกครั้ง' };

  const sh = _uniformClaimSheet();
  const lastRow = sh.getLastRow();
  if (lastRow <= 1) return { success: true, empName: emp.name, receivedStatus: UNIFORM_STATUS_RECEIVED, claims: [] };

  const data = sh.getRange(2, 1, lastRow - 1, UNIFORM_CLAIM_HEADERS.length).getValues();

  const grouped = {};
  const order = [];
  data.forEach(function (row) {
    const rowCode = _norm(row[UNIFORM_CLAIM_COL.CODE - 1]);
    if (rowCode.toLowerCase() !== code.toLowerCase()) return;

    const claimId = _norm(row[UNIFORM_CLAIM_COL.CLAIM_ID - 1]);
    const updatedAt = _normUniformUpdatedAt(row[UNIFORM_CLAIM_COL.UPDATED_AT - 1]);
    const item = _norm(row[UNIFORM_CLAIM_COL.ITEM - 1]);
    const size = _norm(row[UNIFORM_CLAIM_COL.SIZE - 1]);
    const qty = Number(row[UNIFORM_CLAIM_COL.QTY - 1]) || 0;
    const status = _norm(row[UNIFORM_CLAIM_COL.STATUS - 1]);

    const key = claimId || (rowCode + '|' + updatedAt);
    if (!grouped[key]) { grouped[key] = { claimId: claimId, updatedAt: updatedAt, items: [], status: status }; order.push(key); }
    if (status && !grouped[key].status) grouped[key].status = status;
    const itemLabel = size ? (item + ' (' + size + ')') : item;
    grouped[key].items.push(itemLabel + (qty ? (' x' + qty) : ''));
  });

  const claims = order.map(function (key) {
    const g = grouped[key];
    const status = g.status || '';
    return {
      updatedAt: g.updatedAt,
      itemsLabel: g.items.join(', '),
      status: status,
      canDownloadPass: status === UNIFORM_STATUS_RECEIVED
    };
  }).reverse();

  return { success: true, empName: emp.name, receivedStatus: UNIFORM_STATUS_RECEIVED, claims: claims };
}

/**
 * รวบรวมข้อมูลการเบิกชุดบรรจุ 1 ครั้ง (รหัสพนักงาน + เวลาที่บันทึก) สำหรับพิมพ์เป็น "ใบผ่านแผนกสวัสดิการ"
 * คืนค่า null ถ้าไม่พบ
 */
function _buildUniformPassPayload(empCode, updatedAt) {
  empCode = _norm(empCode);
  updatedAt = _norm(updatedAt);
  if (!empCode || !updatedAt) return null;

  const sh = _uniformClaimSheet();
  const lastRow = sh.getLastRow();
  if (lastRow <= 1) return null;

  const data = sh.getRange(2, 1, lastRow - 1, UNIFORM_CLAIM_HEADERS.length).getValues();

  let payload = null;
  data.forEach(function (row) {
    const rowCode = _norm(row[UNIFORM_CLAIM_COL.CODE - 1]);
    const rowUpdatedAt = _normUniformUpdatedAt(row[UNIFORM_CLAIM_COL.UPDATED_AT - 1]);
    if (rowCode.toLowerCase() !== empCode.toLowerCase() || rowUpdatedAt !== updatedAt) return;

    if (!payload) {
      const emp = getEmployeeByCode(rowCode);
      payload = {
        empCode: rowCode,
        empName: _norm(row[UNIFORM_CLAIM_COL.NAME - 1]),
        empDept: _norm(row[UNIFORM_CLAIM_COL.DEPT - 1]),
        // ฝ่าย/ส่วน/แผนก ดึงจากชีท "รายชื่อ" คอลัมน์ D/E/F (EMP_COL.DIVISION/SECTION/DEPT) ผ่าน getEmployeeByCode
        division: emp.found ? emp.division : '',
        section: emp.found ? emp.section : '',
        dept: emp.found ? emp.dept : '',
        confirmDate: emp.found ? emp.confirmDate : '',
        dateStr: rowUpdatedAt.split(' ')[0],
        updatedAt: rowUpdatedAt,
        claimId: _norm(row[UNIFORM_CLAIM_COL.CLAIM_ID - 1]),
        status: _norm(row[UNIFORM_CLAIM_COL.STATUS - 1]),
        items: []
      };
    }

    payload.items.push({
      item: _norm(row[UNIFORM_CLAIM_COL.ITEM - 1]),
      size: _norm(row[UNIFORM_CLAIM_COL.SIZE - 1]),
      qty: Number(row[UNIFORM_CLAIM_COL.QTY - 1]) || 0
    });
  });

  return payload;
}

/**
 * ฝั่งแอดมิน: ดึงข้อมูลใบผ่านชุดบรรจุเพื่อพิมพ์ (ไม่จำกัดสถานะ เพราะแอดมินอาจต้องเตรียมพิมพ์ล่วงหน้า)
 */
function getUniformPassData(password, empCode, updatedAt) {
  if (!_isDashboardAllowed(password)) return { success: false, message: 'รหัสผ่านไม่ถูกต้อง' };

  const pass = _buildUniformPassPayload(empCode, updatedAt);
  if (!pass) return { success: false, message: 'ไม่พบรายการเบิกชุดบรรจุ' };

  return { success: true, pass: pass };
}

/**
 * ฝั่งพนักงาน: ดาวน์โหลด/พิมพ์ใบผ่านชุดบรรจุของตัวเอง อนุญาตเฉพาะเมื่อสถานะเป็น UNIFORM_STATUS_RECEIVED เท่านั้น
 */
function getEmployeeUniformPassData(code, updatedAt) {
  code = _norm(code);
  if (!code) return { success: false, message: 'กรุณากรอกรหัสพนักงาน' };

  const pass = _buildUniformPassPayload(code, updatedAt);
  if (!pass) return { success: false, message: 'ไม่พบรายการเบิกชุดบรรจุ' };

  if (pass.empCode.toLowerCase() !== code.toLowerCase()) {
    return { success: false, message: 'ไม่พบรายการเบิกชุดบรรจุนี้ของรหัสพนักงานนี้' };
  }
  if (pass.status !== UNIFORM_STATUS_RECEIVED) {
    return { success: false, message: 'ใบผ่านจะดาวน์โหลดได้เมื่อสถานะเป็น "' + UNIFORM_STATUS_RECEIVED + '" เท่านั้น' };
  }

  return { success: true, pass: pass };
}

/* ================================ เบิกพิเศษ ================================ */

function _specialClaimSheet() {
  const ss = _ss();
  let sh = ss.getSheetByName(SHEET_NAMES.SPECIAL_CLAIM);
  // กันเคสชื่อชีทจริงมีช่องว่างเกิน/ตัวพิมพ์เพี้ยนเล็กน้อย เหมือน _uniformClaimSheet
  if (!sh) {
    const target = _norm(SHEET_NAMES.SPECIAL_CLAIM).toLowerCase();
    sh = ss.getSheets().find(function (s) { return _norm(s.getName()).toLowerCase() === target; }) || null;
  }
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAMES.SPECIAL_CLAIM);
    sh.getRange(1, 1, 1, SPECIAL_CLAIM_HEADERS.length).setValues([SPECIAL_CLAIM_HEADERS]);
    sh.getRange(1, 1, 1, SPECIAL_CLAIM_HEADERS.length).setFontWeight('bold');
  }
  _ensureSpecialStatusValidation(sh);
  return sh;
}

/**
 * ตั้ง/รีเฟรช Data Validation (dropdown) ของคอลัมน์ I (สถานะ) ในชีท "เบิกพิเศษ" ให้ตรงกับ SPECIAL_CLAIM_ALL_STATUSES เสมอ
 * (เหมือน _ensureUniformStatusValidation)
 */
function _ensureSpecialStatusValidation(sh) {
  try {
    const rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(SPECIAL_CLAIM_ALL_STATUSES, true)
      .setAllowInvalid(true)
      .build();
    const maxRows = Math.max(sh.getMaxRows() - 1, 1);
    sh.getRange(2, SPECIAL_CLAIM_COL.STATUS, maxRows, 1).setDataValidation(rule);
  } catch (e) {
    // ไม่ throw ต่อ เพื่อไม่ให้กระทบการทำงานหลักของระบบ
  }
}

/**
 * ดึงรายการสินค้าที่เบิกได้ทั้งหมดจากชีท "รายการสินค้าเบิก" (คอลัมน์ A=รายการ, B=Size)
 * แถวที่ไม่มีไซส์ (คอลัมน์ B ว่าง) ก็ยังถือเป็นรายการที่เบิกได้ตามปกติ เพียงแต่ size = ''
 */
function getSpecialProductCatalog() {
  const sh = _sheet(SHEET_NAMES.SPECIAL_PRODUCTS);
  const lastRow = sh.getLastRow();
  if (lastRow <= SPECIAL_PRODUCT_HEADER_ROW) return [];

  const numCols = Math.max(SPECIAL_PRODUCT_COL.ITEM, SPECIAL_PRODUCT_COL.SIZE);
  const data = sh.getRange(SPECIAL_PRODUCT_HEADER_ROW + 1, 1, lastRow - SPECIAL_PRODUCT_HEADER_ROW, numCols).getValues();

  const out = [];
  data.forEach(function (row) {
    const item = _norm(row[SPECIAL_PRODUCT_COL.ITEM - 1]);
    if (!item) return;
    out.push({ item: item, size: _norm(row[SPECIAL_PRODUCT_COL.SIZE - 1]) });
  });
  return out;
}

/**
 * เรียกจาก Client เพื่อขอรายการสินค้าสำหรับหน้า "เบิกพิเศษ"
 */
function getSpecialProductCatalogData(password) {
  if (!_isDashboardAllowed(password)) return { success: false, message: 'รหัสผ่านไม่ถูกต้อง' };
  return { success: true, items: getSpecialProductCatalog() };
}

/**
 * ฝั่งแอดมิน: ดึงประวัติการเบิกพิเศษของพนักงาน 1 คน (เรียงล่าสุดก่อน) เหมือน getEmployeeUniformHistory
 */
function getEmployeeSpecialHistory(password, empCode) {
  if (!_isDashboardAllowed(password)) return { success: false, message: 'รหัสผ่านไม่ถูกต้อง' };

  empCode = _norm(empCode);
  if (!empCode) return { success: true, history: [] };

  const sh = _specialClaimSheet();
  const lastRow = sh.getLastRow();
  if (lastRow <= 1) return { success: true, history: [] };

  const data = sh.getRange(2, 1, lastRow - 1, SPECIAL_CLAIM_HEADERS.length).getValues();

  const grouped = {};
  const order = [];
  data.forEach(function (row) {
    const code = _norm(row[SPECIAL_CLAIM_COL.CODE - 1]);
    if (code.toLowerCase() !== empCode.toLowerCase()) return;
    const claimId = _norm(row[SPECIAL_CLAIM_COL.CLAIM_ID - 1]);
    const updatedAt = _normUniformUpdatedAt(row[SPECIAL_CLAIM_COL.UPDATED_AT - 1]);
    const item = _norm(row[SPECIAL_CLAIM_COL.ITEM - 1]);
    const size = _norm(row[SPECIAL_CLAIM_COL.SIZE - 1]);
    const qty = Number(row[SPECIAL_CLAIM_COL.QTY - 1]) || 0;
    const status = _norm(row[SPECIAL_CLAIM_COL.STATUS - 1]);
    const key = claimId || (code + '|' + updatedAt);
    if (!grouped[key]) { grouped[key] = { claimId: claimId, items: [], updatedAt: updatedAt, status: status }; order.push(key); }
    if (status && !grouped[key].status) grouped[key].status = status;
    const itemLabel = size ? (item + ' (' + size + ')') : item;
    grouped[key].items.push(itemLabel + (qty ? (' x' + qty) : ''));
  });

  const history = order.map(function (key) {
    return { claimId: grouped[key].claimId, items: grouped[key].items.join(', '), updatedAt: grouped[key].updatedAt, status: grouped[key].status || '' };
  }).reverse();

  return { success: true, history: history };
}

/**
 * ฝั่งแอดมิน: บันทึกการเบิกพิเศษของพนักงาน 1 คน (เลือกสินค้าจากชีท "รายการสินค้าเบิก" ได้หลายรายการ พร้อมระบุจำนวนเอง)
 * itemsJson = ข้อความ JSON ของ array [{ item, size, qty }, ...] อย่างน้อย 1 รายการ (ส่งมาจาก Client เป็น JSON string
 * เพื่อรองรับจำนวนรายการที่ไม่แน่นอน ต่างจาก submitUniformClaim ที่มีแค่ 3 ช่องคงที่)
 */
function submitSpecialClaim(password, empCode, itemsJson) {
  if (!_isDashboardAllowed(password)) return { success: false, message: 'รหัสผ่านไม่ถูกต้อง' };

  empCode = _norm(empCode);
  if (!empCode) return { success: false, message: 'ไม่พบรหัสพนักงาน' };

  const emp = getEmployeeByCode(empCode);
  if (!emp.found) return { success: false, message: 'ไม่พบรหัสพนักงานนี้ในระบบ' };

  let items;
  try {
    items = JSON.parse(itemsJson);
  } catch (e) {
    return { success: false, message: 'ข้อมูลรายการเบิกไม่ถูกต้อง' };
  }
  if (!Array.isArray(items) || items.length === 0) return { success: false, message: 'กรุณาเพิ่มรายการที่ต้องการเบิกอย่างน้อย 1 รายการ' };

  const catalog = getSpecialProductCatalog();
  const pickedRows = [];

  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const item = _norm(it && it.item);
    const size = _norm(it && it.size);
    const qty = Math.floor(Number(it && it.qty));

    if (!item) return { success: false, message: 'กรุณาเลือกรายการสินค้าให้ครบทุกแถว' };
    if (!qty || qty <= 0) return { success: false, message: item + ': กรุณากรอกจำนวนให้ถูกต้อง (มากกว่า 0)' };

    const row = catalog.find(function (p) { return p.item === item && p.size === size; });
    if (!row) return { success: false, message: 'ไม่พบข้อมูลรายการ "' + item + (size ? (' ไซส์ ' + size) : '') + '" ในระบบ' };

    pickedRows.push({ item: item, size: size, qty: qty });
  }

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
  } catch (e) {
    return { success: false, message: 'ระบบกำลังมีผู้ใช้งานคนอื่นอยู่ กรุณาลองใหม่อีกครั้ง' };
  }

  try {
    const sh = _specialClaimSheet();
    const now = new Date();
    // เลขที่คำสั่งเบิก: สร้างใหม่ทุกครั้งที่กดบันทึก 1 ครั้ง ใช้จัดกลุ่มรายการที่เบิกพร้อมกันในครั้งเดียว (เหมือน UB ของเบิกชุดบรรจุ)
    const claimId = 'SB' + Utilities.formatDate(now, 'GMT+7', 'yyMMddHHmmss');
    // A=วันที่บันทึก, B=คำสั่งเบิก, C=รหัสพนักงาน, D=ชื่อ-สกุล, E=สังกัด, F=รายการ, G=Size, H=จำนวน,
    // I=สถานะ (ตั้งต้น = SPECIAL_CLAIM_STATUSES[0] ทันทีที่บันทึก), J=วันที่สถานะและเวลา (ตั้งต้น = เวลาที่บันทึกนี้เอง), K=หมายเหตุ (ว่างไว้ก่อน)
    pickedRows.forEach(function (r) {
      sh.appendRow([now, claimId, emp.code, emp.name, emp.deptLabel || emp.dept, r.item, r.size || '', r.qty, SPECIAL_CLAIM_STATUSES[0], now, '']);
    });
    const itemsLabel = pickedRows.map(function (r) {
      const label = r.size ? (r.item + ' (' + r.size + ')') : r.item;
      return label + ' x' + r.qty;
    }).join(', ');
    return { success: true, message: 'บันทึกการเบิกพิเศษแล้ว', empCode: emp.code, claimId: claimId, items: itemsLabel };
  } catch (err) {
    return { success: false, message: 'เกิดข้อผิดพลาด: ' + err.message };
  } finally {
    lock.releaseLock();
  }
}

/**
 * ฝั่งแอดมิน (เมนูย่อยแดชบอร์ด "เบิกพิเศษวันนี้"): ดึงรายการเบิกพิเศษทั้งหมดภายในช่วงวันที่ที่กำหนด
 * (เหมือน getTodayUniformClaims ทุกประการ เพียงแต่อ่านจากชีท "เบิกพิเศษ" และใช้ชุดสถานะของเบิกพิเศษ)
 */
function getTodaySpecialClaims(password, startDateStr, endDateStr) {
  if (!_isDashboardAllowed(password)) return { success: false, message: 'รหัสผ่านไม่ถูกต้อง' };

  const range = _resolveDateRange(startDateStr, endDateStr);
  startDateStr = range.startDate;
  endDateStr = range.endDate;

  const sh = _specialClaimSheet();
  const lastRow = sh.getLastRow();
  if (lastRow <= 1) {
    return {
      success: true, startDate: startDateStr, endDate: endDateStr, records: [], totalEmployees: 0, totalItems: 0,
      statuses: SPECIAL_CLAIM_STATUSES, statusOptions: SPECIAL_CLAIM_ALL_STATUSES, cancelledStatus: SPECIAL_CLAIM_CANCELLED_STATUS
    };
  }

  const data = sh.getRange(2, 1, lastRow - 1, SPECIAL_CLAIM_HEADERS.length).getValues();

  const grouped = {};
  const order = [];
  let totalItems = 0;

  data.forEach(function (row) {
    const rawUpdatedAt = row[SPECIAL_CLAIM_COL.UPDATED_AT - 1];
    const updatedAt = _normUniformUpdatedAt(rawUpdatedAt);
    const isoDate = _uniformRowIsoDate(rawUpdatedAt);
    if (!isoDate || isoDate < startDateStr || isoDate > endDateStr) return;

    const claimId = _norm(row[SPECIAL_CLAIM_COL.CLAIM_ID - 1]);
    const code = _norm(row[SPECIAL_CLAIM_COL.CODE - 1]);
    const item = _norm(row[SPECIAL_CLAIM_COL.ITEM - 1]);
    const size = _norm(row[SPECIAL_CLAIM_COL.SIZE - 1]);
    const qty = Number(row[SPECIAL_CLAIM_COL.QTY - 1]) || 0;
    const status = _norm(row[SPECIAL_CLAIM_COL.STATUS - 1]);
    const note = _norm(row[SPECIAL_CLAIM_COL.NOTE - 1]);
    totalItems += qty;

    const key = claimId || (code + '|' + updatedAt);
    if (!grouped[key]) {
      grouped[key] = {
        claimId: claimId,
        code: code,
        name: _norm(row[SPECIAL_CLAIM_COL.NAME - 1]),
        dept: _norm(row[SPECIAL_CLAIM_COL.DEPT - 1]),
        items: [],
        updatedAt: updatedAt,
        isoDate: isoDate,
        status: status,
        note: note
      };
      order.push(key);
    }
    if (status && !grouped[key].status) grouped[key].status = status;
    if (note && !grouped[key].note) grouped[key].note = note;
    const itemLabel = size ? (item + ' (' + size + ')') : item;
    grouped[key].items.push(itemLabel + (qty ? (' x' + qty) : ''));
  });

  const records = order.map(function (key) {
    const g = grouped[key];
    return { claimId: g.claimId, code: g.code, name: g.name, dept: g.dept, items: g.items.join(', '), updatedAt: g.updatedAt, status: g.status || '', note: g.note || '' };
  });

  records.sort(function (a, b) {
    const ga = grouped[a.claimId || (a.code + '|' + a.updatedAt)];
    const gb = grouped[b.claimId || (b.code + '|' + b.updatedAt)];
    if (ga.isoDate !== gb.isoDate) return ga.isoDate < gb.isoDate ? 1 : -1;
    return ga.updatedAt < gb.updatedAt ? 1 : -1;
  });

  return {
    success: true,
    startDate: startDateStr,
    endDate: endDateStr,
    records: records,
    totalEmployees: records.length,
    totalItems: totalItems,
    statuses: SPECIAL_CLAIM_STATUSES,
    statusOptions: SPECIAL_CLAIM_ALL_STATUSES,
    cancelledStatus: SPECIAL_CLAIM_CANCELLED_STATUS
  };
}

/**
 * ฝั่งแอดมิน (เมนูย่อยแดชบอร์ด "เบิกพิเศษวันนี้"): ค้นหารายการเบิกพิเศษด้วยรหัสพนักงาน/ชื่อ/สังกัด (ค้นหาได้ทุกวัน)
 * เหมือน searchUniformClaims ทุกประการ
 */
function searchSpecialClaims(password, query) {
  if (!_isDashboardAllowed(password)) return { success: false, message: 'รหัสผ่านไม่ถูกต้อง' };

  query = _norm(query).toLowerCase();
  if (!query) return { success: false, message: 'กรุณากรอกรหัสพนักงาน' };

  const sh = _specialClaimSheet();
  const lastRow = sh.getLastRow();
  if (lastRow <= 1) {
    return {
      success: true, query: query, records: [], totalEmployees: 0, totalItems: 0,
      statuses: SPECIAL_CLAIM_STATUSES, statusOptions: SPECIAL_CLAIM_ALL_STATUSES, cancelledStatus: SPECIAL_CLAIM_CANCELLED_STATUS
    };
  }

  const data = sh.getRange(2, 1, lastRow - 1, SPECIAL_CLAIM_HEADERS.length).getValues();

  const grouped = {};
  const order = [];
  let totalItems = 0;

  data.forEach(function (row) {
    const code = _norm(row[SPECIAL_CLAIM_COL.CODE - 1]);
    const name = _norm(row[SPECIAL_CLAIM_COL.NAME - 1]);
    const dept = _norm(row[SPECIAL_CLAIM_COL.DEPT - 1]);
    const matches = code.toLowerCase().indexOf(query) !== -1 || name.toLowerCase().indexOf(query) !== -1 || dept.toLowerCase().indexOf(query) !== -1;
    if (!matches) return;

    const claimId = _norm(row[SPECIAL_CLAIM_COL.CLAIM_ID - 1]);
    const updatedAt = _normUniformUpdatedAt(row[SPECIAL_CLAIM_COL.UPDATED_AT - 1]);
    const item = _norm(row[SPECIAL_CLAIM_COL.ITEM - 1]);
    const size = _norm(row[SPECIAL_CLAIM_COL.SIZE - 1]);
    const qty = Number(row[SPECIAL_CLAIM_COL.QTY - 1]) || 0;
    const status = _norm(row[SPECIAL_CLAIM_COL.STATUS - 1]);
    const note = _norm(row[SPECIAL_CLAIM_COL.NOTE - 1]);
    totalItems += qty;

    const key = claimId || (code + '|' + updatedAt);
    if (!grouped[key]) {
      grouped[key] = { claimId: claimId, code: code, name: name, dept: dept, items: [], updatedAt: updatedAt, status: status, note: note };
      order.push(key);
    }
    if (status && !grouped[key].status) grouped[key].status = status;
    if (note && !grouped[key].note) grouped[key].note = note;
    const itemLabel = size ? (item + ' (' + size + ')') : item;
    grouped[key].items.push(itemLabel + (qty ? (' x' + qty) : ''));
  });

  const records = order.map(function (key) {
    const g = grouped[key];
    return { claimId: g.claimId, code: g.code, name: g.name, dept: g.dept, items: g.items.join(', '), updatedAt: g.updatedAt, status: g.status || '', note: g.note || '' };
  }).reverse();

  return {
    success: true,
    query: query,
    records: records,
    totalEmployees: records.length,
    totalItems: totalItems,
    statuses: SPECIAL_CLAIM_STATUSES,
    statusOptions: SPECIAL_CLAIM_ALL_STATUSES,
    cancelledStatus: SPECIAL_CLAIM_CANCELLED_STATUS
  };
}

/**
 * ฝั่งแอดมิน (เมนูย่อยแดชบอร์ด "เบิกพิเศษวันนี้"): อัปเดตสถานะคำสั่งเบิกพิเศษ 1 ครั้ง (ระบุด้วยเลขที่คำสั่งเบิก claimId)
 * อัปเดตทุกแถวที่มีเลขที่คำสั่งเบิกเดียวกันให้เป็นสถานะเดียวกันพร้อมกัน (เหมือน updateUniformClaimStatus)
 *  - ทุกครั้งที่อัปเดต จะบันทึกวันที่/เวลาปัจจุบันลงคอลัมน์ J (STATUS_UPDATED_AT) เสมอ
 */
function updateSpecialClaimStatus(password, claimId, newStatus, newNote) {
  if (!_isDashboardAllowed(password)) return { success: false, message: 'รหัสผ่านไม่ถูกต้อง' };

  claimId = _norm(claimId);
  newStatus = _norm(newStatus);
  newNote = _norm(newNote);

  if (!claimId || !newStatus) return { success: false, message: 'ข้อมูลไม่ครบถ้วน' };
  if (SPECIAL_CLAIM_ALL_STATUSES.indexOf(newStatus) === -1) return { success: false, message: 'สถานะไม่ถูกต้อง' };
  if (newStatus === SPECIAL_CLAIM_CANCELLED_STATUS && !newNote) return { success: false, message: 'กรุณาระบุหมายเหตุเหตุผลที่ยกเลิกคำสั่งเบิก' };

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
  } catch (e) {
    return { success: false, message: 'ระบบกำลังมีผู้ใช้งานคนอื่นอยู่ กรุณาลองใหม่อีกครั้ง' };
  }

  try {
    const sh = _specialClaimSheet();
    const lastRow = sh.getLastRow();
    if (lastRow <= 1) return { success: false, message: 'ไม่พบรายการเบิกพิเศษ' };

    const numCols = Math.max(SPECIAL_CLAIM_HEADERS.length, sh.getLastColumn());
    const data = sh.getRange(2, 1, lastRow - 1, numCols).getValues();
    let updatedCount = 0;
    const now = new Date();

    data.forEach(function (row, i) {
      const rowClaimId = _norm(row[SPECIAL_CLAIM_COL.CLAIM_ID - 1]);
      if (rowClaimId !== claimId) return;
      sh.getRange(2 + i, SPECIAL_CLAIM_COL.STATUS).setValue(newStatus);
      sh.getRange(2 + i, SPECIAL_CLAIM_COL.STATUS_UPDATED_AT).setValue(now);
      sh.getRange(2 + i, SPECIAL_CLAIM_COL.NOTE).setValue(newNote);
      updatedCount++;
    });

    if (updatedCount === 0) return { success: false, message: 'ไม่พบรายการเบิกพิเศษเลขที่ ' + claimId };
    return { success: true, message: 'อัปเดตสถานะเรียบร้อยแล้ว', claimId: claimId, status: newStatus };
  } catch (err) {
    return { success: false, message: 'เกิดข้อผิดพลาด: ' + err.message };
  } finally {
    lock.releaseLock();
  }
}

/* ================================ VAT (ภาษีมูลค่าเพิ่ม) ================================ */
// ราคาสินค้าในชีท "ราคาสินค้า" ถือว่าเป็นราคาที่รวม Vat 7% ไว้แล้ว (ราคารวม Vat)
// สูตรถอด Vat ออกจากราคารวม:  VAT = ราคารวม x 7 / 107
//                              ราคาก่อน Vat = ราคารวม - VAT
const VAT_RATE = 7;

/**
 * ถอด VAT ออกจากราคาที่รวม VAT แล้ว (priceIncVat = ราคาที่ลูกค้าเห็น/จ่ายจริง)
 * ตัวอย่าง: กางเกงสีเทา ราคา 204 บาท (ราคารวม Vat)
 *   vatAmount  = 204 x 7 / 107        = 13.35 บาท
 *   priceExVat = 204 - 13.35          = 190.65 บาท
 */
function calcVatFromInclusivePrice(priceIncVat) {
  const p = Number(priceIncVat) || 0;
  const vatAmount = Math.round((p * VAT_RATE / (100 + VAT_RATE)) * 100) / 100;
  const priceExVat = Math.round((p - vatAmount) * 100) / 100;
  return {
    priceIncVat: p,
    priceExVat: priceExVat,
    vatAmount: vatAmount,
    vatRate: VAT_RATE
  };
}

/**
 * เรียกจาก Client เพื่อขอดูรายละเอียด VAT ของราคาใดๆ
 * ตัวอย่างการเรียกใช้: getVatBreakdown(204)
 * ผลลัพธ์: { priceIncVat: 204, priceExVat: 190.65, vatAmount: 13.35, vatRate: 7 }
 */
function getVatBreakdown(price) {
  return calcVatFromInclusivePrice(price);
}

/* ================================ PRODUCT PRICES ================================ */
/**
 * ตรวจสอบสถานะจากคอลัมน์ D ในชีท "ราคาสินค้า"
 * ถ้าพบข้อความ "หมด", "สินค้าหมด", "0", "Out of stock" หรือค่าที่เป็นเท็จ ให้ถือว่าสินค้าหมด
 */
function _isOutOfStock(val) {
  if (val === null || val === undefined) return false;
  const s = String(val).trim().toLowerCase();
  if (s === '' || s === 'มี' || s === 'มีสินค้า' || s === 'available' || s === 'in stock' || s === 'พร้อมส่ง') return false;
  if (s === 'หมด' || s === 'สินค้าหมด' || s === 'out of stock' || s === 'out' || s === '0' || s === 'false' || s === 'ไม่พร้อมขาย' || s === 'งดสั่ง') return true;
  const n = Number(val);
  if (!isNaN(n) && n <= 0 && s !== '') return true;
  return false;
}

function getProductPrices() {
  const sh = _sheet(SHEET_NAMES.PRICES);
  const lastRow = sh.getLastRow();
  if (lastRow <= PRICE_HEADER_ROW) return [];

  const numCols = Math.max(PRICE_COL.ITEM, PRICE_COL.SIZE, PRICE_COL.PRICE, PRICE_COL.STOCK);
  const data = sh.getRange(PRICE_HEADER_ROW + 1, 1, lastRow - PRICE_HEADER_ROW, numCols).getValues();

  const out = [];
  data.forEach(function (row, i) {
    const item = _norm(row[PRICE_COL.ITEM - 1]);
    if (!item) return;
    const stockRaw = row[PRICE_COL.STOCK - 1];
    const price = Number(row[PRICE_COL.PRICE - 1]) || 0;
    const vat = calcVatFromInclusivePrice(price); // price ในชีทถือเป็นราคารวม Vat แล้ว
    out.push({
      item: item,
      size: _norm(row[PRICE_COL.SIZE - 1]),
      price: price,
      priceExVat: vat.priceExVat,
      vatAmount: vat.vatAmount,
      isOutOfStock: _isOutOfStock(stockRaw),
      rowIndex: PRICE_HEADER_ROW + 1 + i 
    });
  });
  return out;
}

/* ================================ STOCK MANAGEMENT (Admin - Update Stock) ================================ */
/**
 * ฝั่งแอดมิน: ดึงรายการสินค้าทั้งหมดพร้อมสถานะสต็อก จากชีท "ราคาสินค้า" (คอลัมน์ D)
 * ใช้แสดงในหน้า Dashboard > Update Stock
 */
function getStockList(password) {
  if (!_isFullAuth(password)) return { success: false, message: 'รหัสผ่านไม่ถูกต้อง หรือไม่มีสิทธิ์เข้าถึงเมนูนี้' };
  return { success: true, items: getProductPrices() };
}

/**
 * ฝั่งแอดมิน: อัปเดตสถานะสินค้า (มี/หมด) ลงในชีท "ราคาสินค้า" คอลัมน์ D (STOCK) โดยตรงตาม rowIndex
 * inStock = true  -> เขียนค่า 'มีสินค้า'
 * inStock = false -> เขียนค่า 'หมด'
 * (ค่าทั้งสองต้องตรงกับตัวเลือกใน Data Validation ของคอลัมน์ D ในชีท "ราคาสินค้า" เป๊ะๆ)
 */
function updateStockStatus(password, rowIndex, inStock) {
  if (!_isFullAuth(password)) return { success: false, message: 'รหัสผ่านไม่ถูกต้อง หรือไม่มีสิทธิ์เข้าถึงเมนูนี้' };

  rowIndex = Number(rowIndex);
  if (!rowIndex || rowIndex < PRICE_HEADER_ROW + 1) return { success: false, message: 'ไม่พบแถวสินค้าที่ต้องการอัปเดต' };

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
  } catch (e) {
    return { success: false, message: 'ระบบกำลังมีผู้ใช้งานอัปเดตสต็อกอยู่ กรุณาลองใหม่อีกครั้ง' };
  }

  try {
    const sh = _sheet(SHEET_NAMES.PRICES);
    const lastRow = sh.getLastRow();
    if (rowIndex > lastRow) return { success: false, message: 'ไม่พบแถวสินค้าที่ต้องการอัปเดต' };

    const newVal = inStock ? 'มีสินค้า' : 'หมด';
    sh.getRange(rowIndex, PRICE_COL.STOCK).setValue(newVal);
    return { success: true, message: 'อัปเดตสถานะสินค้าเรียบร้อยแล้ว', rowIndex: rowIndex, inStock: !!inStock };
  } catch (err) {
    return { success: false, message: 'เกิดข้อผิดพลาด: ' + err.message };
  } finally {
    lock.releaseLock();
  }
}

function _findProductRow(priceList, itemName, size) {
  itemName = _norm(itemName);
  size = _norm(size);
  let hit = priceList.find(function (p) { return p.item.toLowerCase() === itemName.toLowerCase() && p.size.toLowerCase() === size.toLowerCase(); });
  if (hit) return hit;
  hit = priceList.find(function (p) { return p.item.toLowerCase() === itemName.toLowerCase() && p.size === ''; });
  if (hit) return hit;
  const baseName = itemName.replace(/\s*\(.*?\)\s*/g, '').trim();
  hit = priceList.find(function (p) {
    const pBase = p.item.replace(/\s*\(.*?\)\s*/g, '').trim();
    return pBase.toLowerCase() === baseName.toLowerCase() && (p.size.toLowerCase() === size.toLowerCase() || p.size === '');
  });
  if (hit) return hit;
  return null;
}

/* ================================ SUBMIT ORDER ================================ */
function submitOrder(payload) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000); 
  } catch (e) {
    return { success: false, message: 'ระบบกำลังมีผู้ใช้งานคนอื่นสั่งซื้ออยู่ กรุณาลองใหม่อีกครั้ง' };
  }

  try {
    if (!payload || !payload.code || !payload.items || payload.items.length === 0) {
      return { success: false, message: 'ข้อมูลไม่ครบถ้วน กรุณาเลือกสินค้าอย่างน้อย 1 รายการ' };
    }

    const pickupLocation = _norm(payload.pickupLocation);
    if (!pickupLocation || PICKUP_LOCATIONS.indexOf(pickupLocation) === -1) {
      return { success: false, message: 'กรุณาเลือกสถานที่รับสินค้าให้ถูกต้อง' };
    }
    const phone = _norm(payload.phone);

    const emp = getEmployeeByCode(payload.code);
    if (!emp.found) {
      return { success: false, message: 'ไม่พบรหัสพนักงานนี้ในระบบ' };
    }

    const priceList = getProductPrices();
    const resolvedItems = [];      
    const notFound = [];
    const outOfStockItems = [];

    payload.items.forEach(function (it) {
      const qty = Number(it.qty) || 0;
      if (qty <= 0) return;
      const productRow = _findProductRow(priceList, it.item, it.size);
      if (!productRow) {
        notFound.push(it.item + (it.size ? ' (' + it.size + ')' : ''));
        return;
      }
      if (productRow.isOutOfStock) {
        outOfStockItems.push(productRow.item + (productRow.size ? ' (' + productRow.size + ')' : ''));
        return;
      }
      resolvedItems.push({ it: it, productRow: productRow, qty: qty });
    });

    if (notFound.length > 0) return { success: false, message: 'ไม่พบราคาสินค้าสำหรับ: ' + notFound.join(', ') };
    if (outOfStockItems.length > 0) return { success: false, message: 'สินค้าหมด ไม่สามารถสั่งซื้อได้: ' + outOfStockItems.join(', ') };

    const sh = _sheet(SHEET_NAMES.ORDERS);
    if (sh.getLastRow() === 0) {
      sh.getRange(1, 1, 1, ORDER_HEADERS.length).setValues([ORDER_HEADERS]);
      sh.getRange(1, 1, 1, ORDER_HEADERS.length).setFontWeight('bold');
      const statusRule = SpreadsheetApp.newDataValidation().requireValueInList(ALL_STATUSES, true).setAllowInvalid(true).build();
      sh.getRange(2, ORDER_COL.STATUS, 2000, 1).setDataValidation(statusRule);
    }

    const orderId = 'WF' + Utilities.formatDate(new Date(), 'GMT+7', 'yyMMddHHmmss');
    const timestamp = new Date();
    let grandTotal = 0;
    resolvedItems.forEach(function (r) { grandTotal += r.productRow.price * r.qty; });

    const rows = [];
    resolvedItems.forEach(function (r) {
      const row = [];
      row[ORDER_COL.TIMESTAMP - 1] = timestamp;
      row[ORDER_COL.ORDER_ID - 1] = orderId;
      row[ORDER_COL.EMP_CODE - 1] = emp.code;
      row[ORDER_COL.EMP_NAME - 1] = emp.name;
      row[ORDER_COL.EMP_DEPT - 1] = emp.deptLabel || emp.dept;
      row[ORDER_COL.PICKUP_LOCATION - 1] = pickupLocation;
      row[ORDER_COL.PHONE - 1] = phone;
      row[ORDER_COL.ITEM - 1] = r.it.item;
      row[ORDER_COL.SIZE - 1] = r.it.size;
      row[ORDER_COL.QTY - 1] = r.qty;
      row[ORDER_COL.UNIT_PRICE - 1] = r.productRow.price;
      row[ORDER_COL.TOTAL - 1] = grandTotal;
      row[ORDER_COL.STATUS - 1] = ORDER_STATUSES[0];
      row[ORDER_COL.UPDATED_AT - 1] = "";
      row[ORDER_COL.ADMIN_NOTE - 1] = "";
      rows.push(row);
    });

    sh.getRange(sh.getLastRow() + 1, 1, rows.length, ORDER_HEADERS.length).setValues(rows);

    return { success: true, orderId: orderId, total: grandTotal, message: 'บันทึกคำสั่งซื้อสำเร็จ เลขที่ ' + orderId };
  } catch (err) {
    return { success: false, message: 'เกิดข้อผิดพลาด: ' + err.message };
  } finally {
    lock.releaseLock();
  }
}

/* ================================ ORDER STATUS ================================ */
function getOrderStatusByCode(code) {
  code = _norm(code);
  if (!code) return { success: false, message: 'กรุณากรอกรหัสพนักงาน' };

  const emp = getEmployeeByCode(code);
  if (!emp.found) return { success: false, message: 'ไม่พบรหัสพนักงานนี้ในระบบ กรุณาตรวจสอบอีกครั้ง' };

  const sh = _sheet(SHEET_NAMES.ORDERS);
  const lastRow = sh.getLastRow();
  if (lastRow <= 1) return { success: true, empName: emp.name, statuses: ORDER_STATUSES, orders: [] };

  const numCols = Math.max(ORDER_HEADERS.length, sh.getLastColumn());
  const data = sh.getRange(2, 1, lastRow - 1, numCols).getValues();

  const byOrderId = {};
  data.forEach(function (row) {
    const rowCode = _norm(row[ORDER_COL.EMP_CODE - 1]);
    if (rowCode === '' || rowCode.toLowerCase() !== code.toLowerCase()) return;

    const orderId = _norm(row[ORDER_COL.ORDER_ID - 1]);
    const ts = row[ORDER_COL.TIMESTAMP - 1];
    const status = _norm(row[ORDER_COL.STATUS - 1]) || ORDER_STATUSES[0];
    const adminNote = _norm(row[ORDER_COL.ADMIN_NOTE - 1]);

    if (!byOrderId[orderId]) {
      byOrderId[orderId] = {
        orderId: orderId,
        timestamp: ts instanceof Date ? _formatThaiDate(ts, 'HH:mm') : '',
        rawTimestamp: ts instanceof Date ? ts.getTime() : 0,
        pickupLocation: _norm(row[ORDER_COL.PICKUP_LOCATION - 1]),
        status: status,
        adminNote: adminNote,
        items: [],
        total: 0
      };
    } else if (adminNote && !byOrderId[orderId].adminNote) {
      byOrderId[orderId].adminNote = adminNote;
    }
    
    byOrderId[orderId].items.push({
      item: _norm(row[ORDER_COL.ITEM - 1]),
      size: _norm(row[ORDER_COL.SIZE - 1]),
      qty: Number(row[ORDER_COL.QTY - 1]) || 0
    });
    byOrderId[orderId].total += (Number(row[ORDER_COL.UNIT_PRICE - 1]) || 0) * (Number(row[ORDER_COL.QTY - 1]) || 0);
  });

  const orders = Object.keys(byOrderId).map(function (k) { return byOrderId[k]; });
  orders.sort(function (a, b) { return b.rawTimestamp - a.rawTimestamp; });

  return { success: true, empName: emp.name, statuses: ORDER_STATUSES, cancelledStatus: CANCELLED_STATUS, orders: orders };
}

/* ================================ PASS / ใบผ่าน (ให้พนักงานนำสินค้าออกจากโรงงาน) ================================ */
/**
 * รวบรวมข้อมูลคำสั่งซื้อ 1 ออเดอร์ สำหรับพิมพ์เป็น "ใบรับของชั่วคราว/ใบผ่าน แผนกสวัสดิการ"
 * คืนค่า null ถ้าไม่พบออเดอร์
 */
function _buildPassPayload(orderId) {
  orderId = _norm(orderId);
  if (!orderId) return null;

  const sh = _sheet(SHEET_NAMES.ORDERS);
  const lastRow = sh.getLastRow();
  if (lastRow <= 1) return null;

  const numCols = Math.max(ORDER_HEADERS.length, sh.getLastColumn());
  const data = sh.getRange(2, 1, lastRow - 1, numCols).getValues();

  let payload = null;
  data.forEach(function (row) {
    const rowOrderId = _norm(row[ORDER_COL.ORDER_ID - 1]);
    if (rowOrderId !== orderId) return;

    if (!payload) {
      const ts = row[ORDER_COL.TIMESTAMP - 1];
      payload = {
        orderId: rowOrderId,
        dateStr: ts instanceof Date ? _formatThaiDate(ts) : '',
        empCode: _norm(row[ORDER_COL.EMP_CODE - 1]),
        empName: _norm(row[ORDER_COL.EMP_NAME - 1]),
        empDept: _norm(row[ORDER_COL.EMP_DEPT - 1]),
        pickupLocation: _norm(row[ORDER_COL.PICKUP_LOCATION - 1]),
        status: _norm(row[ORDER_COL.STATUS - 1]) || ORDER_STATUSES[0],
        items: [],
        total: 0
      };
    }

    const qty = Number(row[ORDER_COL.QTY - 1]) || 0;
    const unitPrice = Number(row[ORDER_COL.UNIT_PRICE - 1]) || 0;
    payload.items.push({
      item: _norm(row[ORDER_COL.ITEM - 1]),
      size: _norm(row[ORDER_COL.SIZE - 1]),
      qty: qty,
      unitPrice: unitPrice,
      amount: unitPrice * qty
    });
    payload.total += unitPrice * qty;
  });

  return payload;
}

/**
 * ฝั่งแอดมิน: ดึงข้อมูลใบผ่านเพื่อพิมพ์ (ไม่จำกัดสถานะ เพราะแอดมินอาจต้องเตรียมพิมพ์ล่วงหน้า)
 */
function getPassData(password, orderId) {
  if (!_isDashboardAllowed(password)) return { success: false, message: 'รหัสผ่านไม่ถูกต้อง' };

  const pass = _buildPassPayload(orderId);
  if (!pass) return { success: false, message: 'ไม่พบคำสั่งซื้อเลขที่ ' + _norm(orderId) };

  return { success: true, pass: pass };
}

/**
 * ฝั่งพนักงาน: ดาวน์โหลด/พิมพ์ใบผ่านของตัวเอง อนุญาตเฉพาะเมื่อสถานะเป็น "พร้อมให้รับสินค้า" เท่านั้น
 */
function getEmployeePassData(code, orderId) {
  code = _norm(code);
  if (!code) return { success: false, message: 'กรุณากรอกรหัสพนักงาน' };

  const pass = _buildPassPayload(orderId);
  if (!pass) return { success: false, message: 'ไม่พบคำสั่งซื้อเลขที่ ' + _norm(orderId) };

  if (pass.empCode.toLowerCase() !== code.toLowerCase()) {
    return { success: false, message: 'ไม่พบคำสั่งซื้อนี้ของรหัสพนักงานนี้' };
  }
  if (pass.status !== ORDER_STATUSES[3]) {
    return { success: false, message: 'ใบผ่านจะดาวน์โหลดได้เมื่อสถานะเป็น "' + ORDER_STATUSES[3] + '" เท่านั้น' };
  }

  return { success: true, pass: pass };
}

/* ================================ DASHBOARD ================================ */
function _validDateStr(s) { return /^\d{4}-\d{2}-\d{2}$/.test(_norm(s)); }

/**
 * ปรับช่วงวันที่ (start/end) ให้ถูกต้องเสมอ: ถ้าไม่ส่งมาหรือรูปแบบผิด จะใช้วันนี้แทน
 * และถ้า start > end จะสลับให้ถูกลำดับอัตโนมัติ
 */
function _resolveDateRange(startDateStr, endDateStr) {
  startDateStr = _norm(startDateStr);
  endDateStr = _norm(endDateStr);
  if (!_validDateStr(startDateStr)) startDateStr = _todayStr();
  if (!_validDateStr(endDateStr)) endDateStr = startDateStr;
  if (endDateStr < startDateStr) {
    const tmp = startDateStr; startDateStr = endDateStr; endDateStr = tmp;
  }
  return { startDate: startDateStr, endDate: endDateStr };
}

/**
 * Dashboard หลัก: สรุปพนักงาน/ออเดอร์ ภายในช่วงวันที่ที่กำหนด (startDateStr - endDateStr)
 * ใช้ดูได้ทั้งวันเดียว (ส่งค่าเดียวกันทั้งคู่) หรือหลายวันติดกันก็ได้
 */
function getDashboardData(password, startDateStr, endDateStr) {
  if (!_isDashboardAllowed(password)) return { success: false, message: 'รหัสผ่านไม่ถูกต้อง' };

  const range = _resolveDateRange(startDateStr, endDateStr);
  startDateStr = range.startDate;
  endDateStr = range.endDate;

  const sh = _sheet(SHEET_NAMES.ORDERS);
  const lastRow = sh.getLastRow();
  if (lastRow <= 1) {
    return { success: true, startDate: startDateStr, endDate: endDateStr, statuses: ORDER_STATUSES, statusOptions: ALL_STATUSES, cancelledStatus: CANCELLED_STATUS, summary: [], totalOrders: 0, grandTotal: 0 };
  }

  const numCols = Math.max(ORDER_HEADERS.length, sh.getLastColumn());
  const data = sh.getRange(2, 1, lastRow - 1, numCols).getValues();

  const targetRows = data.filter(function (row) {
    const ts = row[ORDER_COL.TIMESTAMP - 1];
    if (!(ts instanceof Date)) return false;
    const d = Utilities.formatDate(ts, 'GMT+7', 'yyyy-MM-dd');
    return d >= startDateStr && d <= endDateStr;
  });

  const built = _buildEmployeeSummary(targetRows);

  return {
    success: true,
    startDate: startDateStr,
    endDate: endDateStr,
    statuses: ORDER_STATUSES,
    statusOptions: ALL_STATUSES,
    cancelledStatus: CANCELLED_STATUS,
    summary: built.summary,
    totalOrders: built.totalOrders,
    grandTotal: built.grandTotal
  };
}

/**
 * รวมแถวคำสั่งซื้อ (rows) ให้เป็นสรุปรายพนักงาน/ออเดอร์ ใช้ร่วมกันทั้ง getDashboardData และ searchOrders
 */
function _buildEmployeeSummary(rows) {
  const byEmployee = {};
  let grandTotal = 0;

  rows.forEach(function (row) {
    const code = _norm(row[ORDER_COL.EMP_CODE - 1]);
    const name = _norm(row[ORDER_COL.EMP_NAME - 1]);
    const dept = _norm(row[ORDER_COL.EMP_DEPT - 1]);
    const orderId = _norm(row[ORDER_COL.ORDER_ID - 1]);
    const ts = row[ORDER_COL.TIMESTAMP - 1];
    const item = _norm(row[ORDER_COL.ITEM - 1]);
    const size = _norm(row[ORDER_COL.SIZE - 1]);
    const qty = Number(row[ORDER_COL.QTY - 1]) || 0;
    const unitPrice = Number(row[ORDER_COL.UNIT_PRICE - 1]) || 0;
    const phone = _norm(row[ORDER_COL.PHONE - 1]);
    const adminNote = _norm(row[ORDER_COL.ADMIN_NOTE - 1]);

    const lineTotal = unitPrice * qty;
    const status = _norm(row[ORDER_COL.STATUS - 1]) || ORDER_STATUSES[0];

    if (!byEmployee[code]) {
      byEmployee[code] = { code: code, name: name, dept: dept, phone: phone, orders: [], total: 0 };
    }
    let order = byEmployee[code].orders.find(function (o) { return o.orderId === orderId; });
    if (!order) {
      order = {
        orderId: orderId,
        dateStr: ts instanceof Date ? _formatThaiDate(ts) : '',
        timestamp: ts instanceof Date ? Utilities.formatDate(ts, 'GMT+7', 'HH:mm') : '',
        rawTimestamp: ts instanceof Date ? ts.getTime() : 0,
        pickupLocation: _norm(row[ORDER_COL.PICKUP_LOCATION - 1]),
        status: status,
        adminNote: adminNote,
        items: [],
        total: 0
      };
      byEmployee[code].orders.push(order);
    }
    order.items.push({ item: item, size: size, qty: qty, total: lineTotal });
    order.total += lineTotal;

    if (status !== CANCELLED_STATUS) {
      byEmployee[code].total += lineTotal;
      grandTotal += lineTotal;
    }
  });

  const summary = Object.keys(byEmployee).map(function (k) { return byEmployee[k]; });
  summary.forEach(function (emp) {
    emp.orders.sort(function (a, b) { return b.rawTimestamp - a.rawTimestamp; });
  });
  summary.sort(function (a, b) { return a.name.localeCompare(b.name, 'th'); });

  const totalOrders = summary.reduce(function (sum, emp) { return sum + emp.orders.length; }, 0);

  return { summary: summary, totalOrders: totalOrders, grandTotal: grandTotal };
}

/**
 * ค้นหาคำสั่งซื้อจากชื่อ/รหัสพนักงาน/แผนก โดยค้นจาก "ข้อมูลทั้งหมดในระบบ" (ทุกวันที่)
 * ไม่ผูกกับช่วงวันที่ที่เลือกไว้บน Dashboard เพื่อให้หาย้อนหลังกี่วันก็ได้
 */
function searchOrders(password, query) {
  if (!_isDashboardAllowed(password)) return { success: false, message: 'รหัสผ่านไม่ถูกต้อง' };

  query = _norm(query).toLowerCase();
  if (!query) {
    return { success: true, query: '', statuses: ORDER_STATUSES, statusOptions: ALL_STATUSES, cancelledStatus: CANCELLED_STATUS, summary: [], totalOrders: 0, grandTotal: 0 };
  }

  const sh = _sheet(SHEET_NAMES.ORDERS);
  const lastRow = sh.getLastRow();
  if (lastRow <= 1) {
    return { success: true, query: query, statuses: ORDER_STATUSES, statusOptions: ALL_STATUSES, cancelledStatus: CANCELLED_STATUS, summary: [], totalOrders: 0, grandTotal: 0 };
  }

  const numCols = Math.max(ORDER_HEADERS.length, sh.getLastColumn());
  const data = sh.getRange(2, 1, lastRow - 1, numCols).getValues();

  const targetRows = data.filter(function (row) {
    const code = _norm(row[ORDER_COL.EMP_CODE - 1]).toLowerCase();
    const name = _norm(row[ORDER_COL.EMP_NAME - 1]).toLowerCase();
    const dept = _norm(row[ORDER_COL.EMP_DEPT - 1]).toLowerCase();
    return code.indexOf(query) !== -1 || name.indexOf(query) !== -1 || dept.indexOf(query) !== -1;
  });

  const built = _buildEmployeeSummary(targetRows);

  return {
    success: true,
    query: query,
    statuses: ORDER_STATUSES,
    statusOptions: ALL_STATUSES,
    cancelledStatus: CANCELLED_STATUS,
    summary: built.summary,
    totalOrders: built.totalOrders,
    grandTotal: built.grandTotal
  };
}

/**
 * สรุปยอดขายสินค้าทั้งหมด แยกตามไอเทม+ไซส์ (ขายไปกี่ชิ้น รวมกี่บาท) ภายในช่วงวันที่ที่กำหนด
 * ไม่นับออเดอร์ที่มีสถานะ "ยกเลิกการสั่งซื้อ"
 */
function getItemSummary(password, startDateStr, endDateStr, factoryKey) {
  // หมายเหตุ: ฟังก์ชันนี้ถูกใช้ทั้งจากหน้า "แดชบอร์ด" (พาเนล "สินค้าขายดี") และหน้า "สรุปยอดขายสินค้า"
  // จึงอนุญาตให้รหัสผ่านสิทธิ์จำกัด (เฉพาะแดชบอร์ด) เรียกใช้ได้ด้วย ส่วนการล็อกไม่ให้เข้าเมนู
  // "สรุปยอดขายสินค้า" ทำที่ฝั่งหน้าเว็บ (ปุ่มเมนูจะถูกปิดใช้งานสำหรับรหัสผ่านสิทธิ์จำกัด)
  if (!_isDashboardAllowed(password)) return { success: false, message: 'รหัสผ่านไม่ถูกต้อง' };

  const range = _resolveDateRange(startDateStr, endDateStr);
  startDateStr = range.startDate;
  endDateStr = range.endDate;

  factoryKey = _norm(factoryKey) || 'ALL';
  const allowedLocations = _factoryLocations(factoryKey);

  const sh = _sheet(SHEET_NAMES.ORDERS);
  const lastRow = sh.getLastRow();
  if (lastRow <= 1) {
    return { success: true, startDate: startDateStr, endDate: endDateStr, factory: factoryKey, factories: getFactoryGroups(), items: [], totalQty: 0, totalAmount: 0 };
  }

  const numCols = Math.max(ORDER_HEADERS.length, sh.getLastColumn());
  const data = sh.getRange(2, 1, lastRow - 1, numCols).getValues();

  const byItem = {};
  let totalQty = 0;
  let totalAmount = 0;

  data.forEach(function (row) {
    const ts = row[ORDER_COL.TIMESTAMP - 1];
    if (!(ts instanceof Date)) return;
    const d = Utilities.formatDate(ts, 'GMT+7', 'yyyy-MM-dd');
    if (d < startDateStr || d > endDateStr) return;

    // คอลัมน์ F ของชีท "รายการสั่งซื้อ" = โรงงาน (ORDER_COL.PICKUP_LOCATION)
    const factoryOfRow = _norm(row[ORDER_COL.PICKUP_LOCATION - 1]);
    if (allowedLocations.indexOf(factoryOfRow) === -1) return;

    const status = _norm(row[ORDER_COL.STATUS - 1]) || ORDER_STATUSES[0];
    if (status === CANCELLED_STATUS) return;

    const item = _norm(row[ORDER_COL.ITEM - 1]);
    const size = _norm(row[ORDER_COL.SIZE - 1]);
    const qty = Number(row[ORDER_COL.QTY - 1]) || 0;
    const unitPrice = Number(row[ORDER_COL.UNIT_PRICE - 1]) || 0;
    const amount = qty * unitPrice;

    const key = item + '||' + size;
    if (!byItem[key]) byItem[key] = { item: item, size: size, qty: 0, amount: 0 };
    byItem[key].qty += qty;
    byItem[key].amount += amount;

    totalQty += qty;
    totalAmount += amount;
  });

  const items = Object.keys(byItem).map(function (k) { return byItem[k]; });
  items.sort(function (a, b) { return b.amount - a.amount; });

  return {
    success: true,
    startDate: startDateStr,
    endDate: endDateStr,
    factory: factoryKey,
    factories: getFactoryGroups(),
    items: items,
    totalQty: totalQty,
    totalAmount: totalAmount
  };
}

function updateOrderData(password, orderId, newStatus, newNote) {
  if (!_isDashboardAllowed(password)) return { success: false, message: 'รหัสผ่านไม่ถูกต้อง' };

  orderId = _norm(orderId);
  newStatus = _norm(newStatus);
  newNote = _norm(newNote);
  
  if (!orderId || !newStatus) return { success: false, message: 'ข้อมูลไม่ครบถ้วน' };
  if (ALL_STATUSES.indexOf(newStatus) === -1) return { success: false, message: 'สถานะไม่ถูกต้อง' };

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
  } catch (e) {
    return { success: false, message: 'ระบบกำลังมีผู้ใช้งานคนอื่นอยู่ กรุณาลองใหม่อีกครั้ง' };
  }

  try {
    const sh = _sheet(SHEET_NAMES.ORDERS);
    const lastRow = sh.getLastRow();
    if (lastRow <= 1) return { success: false, message: 'ไม่พบคำสั่งซื้อนี้' };

    const numCols = Math.max(ORDER_HEADERS.length, sh.getLastColumn());
    const data = sh.getRange(2, 1, lastRow - 1, numCols).getValues();
    let updatedCount = 0;

    data.forEach(function (row, i) {
      const rowOrderId = _norm(row[ORDER_COL.ORDER_ID - 1]);
      if (rowOrderId === orderId) {
        sh.getRange(2 + i, ORDER_COL.STATUS).setValue(newStatus);
        sh.getRange(2 + i, ORDER_COL.UPDATED_AT).setValue(_formatThaiDate(new Date(), 'HH:mm:ss'));
        sh.getRange(2 + i, ORDER_COL.ADMIN_NOTE).setValue(newNote);
        updatedCount++;
      }
    });

    if (updatedCount === 0) return { success: false, message: 'ไม่พบคำสั่งซื้อเลขที่ ' + orderId };
    return { success: true, message: 'อัปเดตข้อมูลเรียบร้อย', orderId: orderId, status: newStatus };
  } catch (err) {
    return { success: false, message: 'เกิดข้อผิดพลาด: ' + err.message };
  } finally {
    lock.releaseLock();
  }
}

function _todayStr() { return Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd'); }

/* ================================ THAI DATE FORMAT (วัน/เดือน/ปี พ.ศ.) ================================ */
/**
 * แปลงวันที่ (Date object) เป็นข้อความรูปแบบไทย "วัน/เดือน/ปี" โดยปีเป็น พ.ศ. (ค.ศ. + 543)
 * เช่น 14/08/2569
 * ถ้าส่ง timeFormat มาด้วย (เช่น 'HH:mm' หรือ 'HH:mm:ss') จะต่อท้ายด้วยเวลาตามรูปแบบนั้น
 */
function _formatThaiDate(date, timeFormat) {
  if (!(date instanceof Date)) return '';
  const day = Utilities.formatDate(date, 'GMT+7', 'dd');
  const month = Utilities.formatDate(date, 'GMT+7', 'MM');
  const buddhistYear = Number(Utilities.formatDate(date, 'GMT+7', 'yyyy')) + 543;
  let result = day + '/' + month + '/' + buddhistYear;
  if (timeFormat) {
    result += ' ' + Utilities.formatDate(date, 'GMT+7', timeFormat);
  }
  return result;
}

/**
 * แปลงวันที่แบบ ISO (yyyy-MM-dd, ค.ศ.) ที่ใช้ในการกรอง/เปรียบเทียบภายในระบบ
 * ให้เป็นข้อความรูปแบบไทย "วัน/เดือน/ปี" (พ.ศ.) สำหรับแสดงผล
 */
function _isoToThaiDateLabel(isoStr) {
  isoStr = _norm(isoStr);
  const parts = isoStr.split('-');
  if (parts.length !== 3) return isoStr;
  const buddhistYear = Number(parts[0]) + 543;
  return parts[2] + '/' + parts[1] + '/' + buddhistYear;
}