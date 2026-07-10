/* ==========================================================================
   Bawmusic — API Client
   Talks to the Google Apps Script Web App (acts as REST backend over Sheets)
   ========================================================================== */

const Bawmusic_Config = {
  // 🔧 Paste your deployed Google Apps Script Web App URL here after deployment.
  // Guide: README.md → "Deploying the backend"
  API_URL: localStorage.getItem('bawmusic_api_url') || 'PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE',
};

const BawmusicAPI = {

  setApiUrl(url){
    Bawmusic_Config.API_URL = url;
    localStorage.setItem('bawmusic_api_url', url);
  },

  getToken(){ return localStorage.getItem('bawmusic_token') || ''; },

  /**
   * All requests go through POST with an "action" field.
   * Apps Script Web Apps behave more reliably with POST (avoids CORS/redirect
   * quirks that GET can hit), so both reads and writes use POST here.
   */
  async call(action, payload = {}) {
    if (!Bawmusic_Config.API_URL || Bawmusic_Config.API_URL.includes('PASTE_YOUR')) {
      throw new Error('ยังไม่ได้ตั้งค่า API URL — ไปที่ ตั้งค่า > การเชื่อมต่อระบบ');
    }
    const body = JSON.stringify({ action, token: this.getToken(), ...payload });
    const res = await fetch(Bawmusic_Config.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // avoids CORS preflight on Apps Script
      body,
    });
    if (!res.ok) throw new Error('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ (' + res.status + ')');
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ');
    return json.data;
  },

  // ----- Auth -----
  login(email, password){ return this.call('auth.login', { email, password }); },
  me(){ return this.call('auth.me'); },

  // ----- Generic CRUD helper for simple sheets -----
  list(sheet, params = {}){ return this.call('sheet.list', { sheet, ...params }); },
  get(sheet, id){ return this.call('sheet.get', { sheet, id }); },
  create(sheet, record){ return this.call('sheet.create', { sheet, record }); },
  update(sheet, id, record){ return this.call('sheet.update', { sheet, id, record }); },
  remove(sheet, id){ return this.call('sheet.delete', { sheet, id }); },

  // ----- Dashboard -----
  dashboard(){ return this.call('dashboard.summary'); },

  // ----- Settings -----
  getSettings(){ return this.call('settings.get'); },
  saveSettings(settings){ return this.call('settings.save', { settings }); },

  // ----- Reports -----
  reportMonthly(year){ return this.call('report.monthly', { year }); },
};
