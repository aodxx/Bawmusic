# Bawmusic 🎵
ระบบจัดการวงดนตรีและจองงาน (Band Booking Management System)
PWA ที่ใช้ Google Sheets เป็นฐานข้อมูล และ Google Apps Script เป็น Backend API

---

## สิ่งที่มีอยู่ในเวอร์ชันนี้ (v1)

โมดูลที่ใช้งานได้แล้ว:
- **Dashboard** — สรุปงานวันนี้/ที่จะถึง, รายรับ, รายการรอมัดจำ/รอชำระ, การจองล่าสุด, สรุปการเงิน
- **งานจอง (Jobs)** — CRUD, ทำซ้ำงาน, ค้นหา, badge สถานะ
- **ปฏิทิน (Calendar)** — FullCalendar แสดงงานตามสถานะ (สี), คลิกเพื่อแก้ไข
- **ลูกค้า (Customers)** — CRUD, คลิกโทรออก
- **การเงิน (Finance)** — กราฟรายรับ/รายจ่ายรายเดือน, บันทึกรายจ่าย
- **สมาชิกวง (Members)** — CRUD, สถานะทำงาน/พัก
- **อุปกรณ์ (Equipment)** — CRUD, สภาพอุปกรณ์
- **ตั้งค่า (Settings)** — เชื่อมต่อ API, ข้อมูลบริษัท, Dark Mode
- **PWA** — ติดตั้งลงมือถือได้, ทำงานแบบ offline-friendly (cache หน้าแอป)
- **Backend API** — REST-style ผ่าน Google Apps Script, สร้างชีตอัตโนมัติ, ระบบ login, PDF, sync ปฏิทิน, แจ้งเตือนอีเมลรายวัน

โหมดสาธิต (Demo Mode): ถ้ายังไม่เชื่อมต่อ Apps Script แอปจะใช้ข้อมูลตัวอย่างในเบราว์เซอร์ ให้ลองใช้ UI ได้ทันทีโดยไม่ต้อง deploy อะไรก่อน

**ยังไม่รวมในเวอร์ชันนี้ (ต่อยอดได้):** ระบบสิทธิ์ผู้ใช้แบบละเอียด (multi-role UI), LINE Notify integration, การอัปโหลดไฟล์แนบ/รูปภาพ, export Excel, drag-and-drop ปฏิทิน, weekly/daily calendar views แบบเต็ม เหล่านี้ต่อยอดจากโครงสร้างที่มีให้ได้ไม่ยาก — บอกได้เลยถ้าต้องการให้ทำต่อ

---

## โครงสร้างโปรเจกต์

```
bawmusic/
├── index.html              ← หน้าแอปหลัก (SPA)
├── manifest.json           ← PWA manifest
├── service-worker.js       ← Offline cache
├── assets/
│   ├── css/style.css        ← Design tokens + styles
│   ├── js/api.js            ← ตัวเรียก Apps Script API
│   ├── js/app.js             ← Alpine.js app logic ทั้งหมด
│   └── icons/                ← ไอคอนแอป (192/512, maskable)
└── backend/                  ← โค้ด Google Apps Script (.gs)
    ├── Code.gs                ← doGet/doPost entry points
    ├── Config.gs               ← ตั้งค่ากลาง + schema ชีต
    ├── Database.gs             ← สร้างชีตอัตโนมัติ + CRUD
    ├── API.gs                  ← router ของทุก action
    ├── Auth.gs                 ← login/token
    ├── Utils.gs                 ← helper functions
    ├── Calendar.gs              ← sync งานไป Google Calendar
    ├── Notification.gs          ← แจ้งเตือนอีเมลรายวัน
    └── PDF.gs                    ← สร้างใบเสนอราคา/ใบเสร็จ
```

---

## 1. Deploy Backend (Google Apps Script)

1. ไปที่ [sheets.google.com](https://sheets.google.com) → สร้าง Spreadsheet ใหม่ ตั้งชื่อ `Bawmusic Database`
2. ในชีตนั้น ไปที่เมนู **ส่วนขยาย (Extensions) → Apps Script**
3. จะเปิดหน้าต่าง Apps Script editor ที่ผูกกับสเปรดชีตนี้อยู่แล้ว (bound script)
4. ลบไฟล์ `Code.gs` เริ่มต้นที่มีอยู่ทิ้ง (หรือเขียนทับ)
5. สร้างไฟล์ script (.gs) ใหม่ทีละไฟล์ตามชื่อในโฟลเดอร์ `backend/` ของโปรเจกต์นี้ แล้ว copy เนื้อหาจากไฟล์ที่ให้มาไปวาง:
   - `Config.gs`, `Utils.gs`, `Database.gs`, `Auth.gs`, `Calendar.gs`, `Notification.gs`, `PDF.gs`, `API.gs`, `Code.gs`
   - (ในเมนู editor: กด `+` ข้าง "Files" → Script → ตั้งชื่อไฟล์)
6. บันทึกทั้งหมด (Ctrl+S / Cmd+S)
7. เปิดใช้ Advanced Drive API (จำเป็นสำหรับฟีเจอร์สร้าง PDF ใน `PDF.gs`):
   - แถบซ้ายของ editor → คลิก **Services (+)** → เลือก **Drive API** → กด **Add**
8. รันฟังก์ชัน `initDatabase` หนึ่งครั้งด้วยตัวเอง เพื่อสร้างชีตทั้งหมดอัตโนมัติ:
   - เลือกฟังก์ชัน `initDatabase` จาก dropdown ด้านบน → กด ▶️ Run
   - ครั้งแรกจะขอ authorize สิทธิ์ → กด "Advanced" → "Go to project (unsafe)" → Allow (เป็นสิทธิ์ที่ apps script ของคุณเองขอ ปลอดภัยสำหรับโปรเจกต์ของคุณ)
9. กลับไปที่สเปรดชีต จะเห็นชีตใหม่ถูกสร้างครบ (USERS, CUSTOMERS, JOBS, MEMBERS, EQUIPMENT, EXPENSES, PAYMENTS, SETTINGS)
10. Deploy เป็น Web App:
    - ปุ่ม **Deploy → New deployment**
    - เลือกประเภท **Web app**
    - Execute as: **Me**
    - Who has access: **Anyone** (จำเป็น เพื่อให้หน้าเว็บเรียก API ได้ — ระบบมี token/login ป้องกันการเขียนข้อมูลอยู่แล้ว)
    - กด **Deploy** → คัดลอก **Web App URL** ที่ได้ (ลงท้ายด้วย `/exec`)
11. (ทางเลือก) รันฟังก์ชัน `setupDailyTrigger` เพื่อเปิดแจ้งเตือนอีเมลรายวันอัตโนมัติ

> **บัญชีผู้ใช้เริ่มต้น:** ระบบจะสร้างผู้ใช้แอดมินให้อัตโนมัติในชีต USERS
> อีเมล: `admin@bawmusic.local` / รหัสผ่าน: `admin1234`
> ⚠️ เปลี่ยนรหัสผ่านและ `TOKEN_SECRET` ใน `Config.gs` ก่อนใช้งานจริง

---

## 2. เชื่อมต่อ Frontend กับ Backend

1. เปิดแอป Bawmusic (ดูวิธี deploy frontend ด้านล่าง)
2. ไปที่แท็บ **ตั้งค่า**
3. วาง **Web App URL** ที่คัดลอกไว้ในช่อง "API URL" → กด **บันทึกและเชื่อมต่อ**
4. แอปจะออกจากโหมดสาธิตและโหลดข้อมูลจริงจาก Google Sheets ของคุณ

---

## 3. Deploy Frontend (GitHub Pages)

1. สร้าง repository ใหม่บน GitHub (public หรือ private+Pages ตามแผนที่มี)
2. อัปโหลดไฟล์ทั้งหมดในโฟลเดอร์นี้ (ยกเว้นโฟลเดอร์ `backend/`) ไปที่ root ของ repo
   - รวมถึง `index.html`, `manifest.json`, `service-worker.js`, `assets/`
3. ไปที่ **Settings → Pages**
4. Source: **Deploy from a branch** → Branch: `main` → Folder: `/ (root)` → Save
5. รอ 1-2 นาที จะได้ URL เช่น `https://<username>.github.io/<repo>/`
6. เปิด URL นั้นบนมือถือ → เบราว์เซอร์จะเสนอ "เพิ่มลงหน้าจอหลัก" (Add to Home Screen) ให้ติดตั้งเป็นแอป

---

## การพัฒนาต่อ / แก้ไขโค้ด

- **แก้ดีไซน์/สี:** `assets/css/style.css` — ตัวแปร CSS (`--color-primary` ฯลฯ) อยู่บนสุดของไฟล์
- **แก้หน้าจอ/เพิ่มฟิลด์ในฟอร์ม:** `index.html` (ค้นหาคอมเมนต์ `<!-- JOB FORM -->` เป็นต้น)
- **แก้ logic/การคำนวณ:** `assets/js/app.js`
- **เพิ่ม action ใหม่ใน backend:** เพิ่ม case ใน `backend/API.gs` แล้วเขียนฟังก์ชันใน `Database.gs` หรือไฟล์ที่เหมาะสม
- **เพิ่มคอลัมน์ในชีต:** แก้ `SCHEMA` ใน `backend/Config.gs` แล้วรัน `initDatabase` อีกครั้ง (ปลอดภัย ไม่ลบข้อมูลเดิม แต่ไม่ auto-migrate คอลัมน์ที่มีข้อมูลอยู่แล้ว — เพิ่มคอลัมน์ใหม่ในชีตด้วยมือถ้าจำเป็น)

---

## ความปลอดภัยที่ควรทำก่อนใช้งานจริง

- เปลี่ยน `TOKEN_SECRET` ใน `Config.gs` เป็นค่าสุ่มของคุณเอง
- เปลี่ยนรหัสผ่านแอดมินเริ่มต้นทันทีหลัง deploy
- พิจารณาจำกัดสิทธิ์ Web App เป็นเฉพาะบัญชี Google ในองค์กรของคุณ ถ้าไม่ต้องการให้เข้าถึงจากภายนอก (Deploy → Who has access → "Anyone with Google account" ก็ใช้ได้ แต่ต้องแก้ frontend ให้แนบ OAuth token ด้วย — ถ้าต้องการระดับนี้บอกได้ ผมช่วยต่อให้ได้)

---

## สนับสนุนเพิ่มเติม

ต้องการให้เพิ่มโมดูลไหนต่อ (เช่น export Excel, LINE Notify, สิทธิ์ผู้ใช้แบบละเอียด, อัปโหลดรูป/ไฟล์แนบ, Weekly/Daily calendar เต็มรูปแบบ) แจ้งมาได้เลยครับ จะต่อให้จากโครงสร้างเดิมโดยไม่ต้องรื้อของเดิม
