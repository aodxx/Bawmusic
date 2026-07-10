/* ==========================================================================
   Bawmusic — App Logic (Alpine.js)
   ========================================================================== */

// ---------------------------------------------------------------------------
// Demo data — used automatically when no backend URL has been configured yet,
// so the UI is fully explorable before anyone touches Google Apps Script.
// ---------------------------------------------------------------------------
const DEMO = {
  jobs: [
    { id:'JB-0001', eventDate:'2026-07-15', startTime:'19:00', endTime:'22:00', customerName:'คุณเอ๋ พรีเวดดิ้ง', venue:'สวนอาหารริมน้ำ', province:'เชียงใหม่', jobType:'งานแต่ง', price:15000, deposit:5000, remaining:10000, status:'booked', paymentStatus:'pending' },
    { id:'JB-0002', eventDate:'2026-07-10', startTime:'20:00', endTime:'23:30', customerName:'บริษัท ABC จำกัด', venue:'โรงแรมแกรนด์', province:'กรุงเทพฯ', jobType:'งานบริษัท', price:35000, deposit:35000, remaining:0, status:'completed', paymentStatus:'paid' },
    { id:'JB-0003', eventDate:'2026-07-20', startTime:'18:00', endTime:'21:00', customerName:'คุณนิด บ้านสวน', venue:'บ้านสวนลุงหมี', province:'นครราชสีมา', jobType:'งานบวช', price:8000, deposit:2000, remaining:6000, status:'pending_deposit', paymentStatus:'pending' },
    { id:'JB-0004', eventDate:'2026-06-28', startTime:'19:00', endTime:'22:00', customerName:'คุณส้ม', venue:'ริเวอร์ไซด์ฮอลล์', province:'กรุงเทพฯ', jobType:'งานวันเกิด', price:12000, deposit:12000, remaining:0, status:'cancelled', paymentStatus:'refunded' },
  ],
  customers: [
    { id:'CU-0001', name:'คุณเอ๋ พรีเวดดิ้ง', phone:'081-234-5678', province:'เชียงใหม่', jobs:3, totalSpent:42000 },
    { id:'CU-0002', name:'บริษัท ABC จำกัด', phone:'02-111-2222', province:'กรุงเทพฯ', jobs:5, totalSpent:150000 },
    { id:'CU-0003', name:'คุณนิด บ้านสวน', phone:'089-999-1234', province:'นครราชสีมา', jobs:1, totalSpent:8000 },
  ],
  members: [
    { id:'ME-0001', name:'สมชาย ใจดี', nickname:'ชาย', instrument:'นักร้องนำ', phone:'081-111-1111', status:'active' },
    { id:'ME-0002', name:'วิชัย เสียงทอง', nickname:'วิ', instrument:'กีตาร์', phone:'082-222-2222', status:'active' },
    { id:'ME-0003', name:'ปรีชา ตีกลอง', nickname:'เชา', instrument:'กลอง', phone:'083-333-3333', status:'active' },
    { id:'ME-0004', name:'อนุชา เบสหนัก', nickname:'ชา', instrument:'เบส', phone:'084-444-4444', status:'inactive' },
  ],
  equipment: [
    { id:'EQ-0001', name:'ลำโพง JBL EON715', category:'ระบบเสียง', qty:2, condition:'ดี', storage:'ห้องเก็บของ A' },
    { id:'EQ-0002', name:'ไมค์ Shure SM58', category:'ไมโครโฟน', qty:6, condition:'ดี', storage:'กระเป๋าไมค์' },
    { id:'EQ-0003', name:'มิกซ์เซอร์ Yamaha MG16', category:'ระบบเสียง', qty:1, condition:'ต้องซ่อม', storage:'ห้องเก็บของ A' },
  ],
  expenses: [
    { id:'EX-0001', jobId:'JB-0002', date:'2026-07-08', category:'ค่าเดินทาง', desc:'ค่าน้ำมันรถตู้', amount:1200 },
    { id:'EX-0002', jobId:'JB-0002', date:'2026-07-08', category:'อาหาร', desc:'ค่าข้าวทีม', amount:800 },
  ],
};

function fmtMoney(n){ return (Number(n)||0).toLocaleString('th-TH', {minimumFractionDigits:0}) + ' ฿'; }
function fmtDateTH(d){
  if(!d) return '-';
  try{
    return new Date(d).toLocaleDateString('th-TH', { day:'numeric', month:'short', year:'numeric' });
  }catch(e){ return d; }
}
const STATUS_LABEL = { booked:'จองแล้ว', pending_deposit:'รอมัดจำ', completed:'เสร็จสิ้น', cancelled:'ยกเลิก' };
const STATUS_BADGE = { booked:'badge-booked', pending_deposit:'badge-pending', completed:'badge-completed', cancelled:'badge-cancelled' };

// ---------------------------------------------------------------------------
// PWA install prompt — captured globally (fires before Alpine may be ready)
// and re-dispatched as a custom event the Alpine component listens for.
// ---------------------------------------------------------------------------
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  window.__bawmusicInstallPrompt = e;
  window.dispatchEvent(new CustomEvent('bawmusic:can-install'));
});
window.addEventListener('appinstalled', () => {
  window.__bawmusicInstallPrompt = null;
  window.dispatchEvent(new CustomEvent('bawmusic:installed'));
});

function isIOSSafari(){
  const ua = window.navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return isIOS && isSafari;
}
window.isIOSSafari = isIOSSafari;

function isDemoMode(){
  const u = localStorage.getItem('bawmusic_api_url');
  return !u || u.includes('PASTE_YOUR');
}

function toast(msg, icon='success'){
  Swal.fire({ toast:true, position:'top', icon, title:msg, showConfirmButton:false, timer:2200, timerProgressBar:true });
}

// ---------------------------------------------------------------------------
// Root Alpine component
// ---------------------------------------------------------------------------
document.addEventListener('alpine:init', () => {

  Alpine.data('bawmusicApp', () => ({
    page: 'dashboard',
    dark: localStorage.getItem('bawmusic_theme') === 'dark',
    demo: isDemoMode(),
    loading: false,
    user: JSON.parse(localStorage.getItem('bawmusic_user') || 'null'),
    authed: false,

    // form/modal state
    modalOpen: false,
    modalType: '',
    editing: null,

    // data stores
    jobs: [], customers: [], members: [], equipment: [], expenses: [], settings: {},
    dashboardStats: null,
    jobSearch: '',

    // PWA install
    canInstall: false,
    installedApp: false,
    showInstallBanner: false,

    init(){
      this.applyTheme();
      // v1 has no login screen yet, so gating data loading on "authed" left the
      // dashboard permanently blank after connecting a real backend (this.user
      // was always null). Data should load whenever the app has a data source —
      // demo data, or a configured Apps Script backend.
      this.authed = true;
      this.loadAll();
      this.$watch('dark', v => this.applyTheme());

      // ---- PWA install prompt wiring ----
      this.installedApp = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
      window.addEventListener('bawmusic:can-install', () => {
        if (!this.installedApp && localStorage.getItem('bawmusic_install_dismissed') !== '1') {
          this.canInstall = true;
          this.showInstallBanner = true;
        }
      });
      window.addEventListener('bawmusic:installed', () => {
        this.canInstall = false; this.showInstallBanner = false; this.installedApp = true;
        toast('ติดตั้งแอป Bawmusic สำเร็จ');
      });
    },

    async installApp(){
      if (!window.__bawmusicInstallPrompt) return;
      window.__bawmusicInstallPrompt.prompt();
      const choice = await window.__bawmusicInstallPrompt.userChoice;
      window.__bawmusicInstallPrompt = null;
      this.canInstall = false; this.showInstallBanner = false;
      if (choice.outcome !== 'accepted') toast('ยังไม่ได้ติดตั้งแอป', 'info');
    },
    dismissInstallBanner(){
      this.showInstallBanner = false;
      localStorage.setItem('bawmusic_install_dismissed', '1');
    },

    applyTheme(){
      document.documentElement.classList.toggle('dark', this.dark);
      localStorage.setItem('bawmusic_theme', this.dark ? 'dark' : 'light');
    },
    toggleTheme(){ this.dark = !this.dark; },

    goto(p){ this.page = p; window.scrollTo({top:0, behavior:'smooth'}); },

    async loadAll(){
      this.loading = true;
      try{
        if (this.demo){
          this.jobs = DEMO.jobs; this.customers = DEMO.customers;
          this.members = DEMO.members; this.equipment = DEMO.equipment;
          this.expenses = DEMO.expenses;
          this.computeDashboard();
        } else {
          const [jobs, customers, members, equipment, expenses, settings] = await Promise.all([
            BawmusicAPI.list('JOBS'), BawmusicAPI.list('CUSTOMERS'), BawmusicAPI.list('MEMBERS'),
            BawmusicAPI.list('EQUIPMENT'), BawmusicAPI.list('EXPENSES'), BawmusicAPI.getSettings(),
          ]);
          this.jobs = jobs; this.customers = customers; this.members = members;
          this.equipment = equipment; this.expenses = expenses; this.settings = settings;
          this.dashboardStats = await BawmusicAPI.dashboard();
        }
      } catch(e){ toast(e.message, 'error'); }
      this.loading = false;
    },

    computeDashboard(){
      const today = new Date().toISOString().slice(0,10);
      const upcoming = this.jobs.filter(j => j.eventDate >= today && j.status !== 'cancelled');
      const monthIncome = this.jobs.filter(j => j.status === 'completed').reduce((s,j)=>s+Number(j.price||0),0);
      const pendingDeposit = this.jobs.filter(j => j.status === 'pending_deposit').length;
      const pendingPayment = this.jobs.filter(j => Number(j.remaining||0) > 0 && j.status !== 'cancelled').length;
      this.dashboardStats = {
        todayJobs: this.jobs.filter(j=>j.eventDate===today).length,
        upcomingJobs: upcoming.length,
        monthlyIncome: monthIncome,
        pendingDeposit, pendingPayment,
        recent: [...this.jobs].sort((a,b)=> b.eventDate.localeCompare(a.eventDate)).slice(0,5),
      };
    },

    // ---------------- Job actions ----------------
    openJobModal(job=null){
      this.editing = job ? {...job} : { id:'', eventDate:'', startTime:'19:00', endTime:'22:00', customerName:'', venue:'', province:'', jobType:'', price:0, deposit:0, remaining:0, status:'booked', paymentStatus:'pending' };
      this.modalType = 'job'; this.modalOpen = true;
    },
    async saveJob(){
      try{
        this.editing.remaining = Math.max(0, Number(this.editing.price||0) - Number(this.editing.deposit||0));
        if (this.demo){
          if (this.editing.id){
            const i = this.jobs.findIndex(j=>j.id===this.editing.id);
            this.jobs[i] = {...this.editing};
          } else {
            this.editing.id = 'JB-' + String(this.jobs.length+1).padStart(4,'0');
            this.jobs.unshift({...this.editing});
          }
        } else {
          if (this.editing.id) await BawmusicAPI.update('JOBS', this.editing.id, this.editing);
          else await BawmusicAPI.create('JOBS', this.editing);
          await this.loadAll();
        }
        this.computeDashboard();
        this.modalOpen = false;
        toast('บันทึกงานเรียบร้อยแล้ว');
      } catch(e){ toast(e.message, 'error'); }
    },
    async deleteJob(job){
      const r = await Swal.fire({ title:'ลบงานนี้?', text: job.customerName + ' — ' + fmtDateTH(job.eventDate), icon:'warning', showCancelButton:true, confirmButtonText:'ลบ', cancelButtonText:'ยกเลิก', confirmButtonColor:'#D2453F' });
      if (!r.isConfirmed) return;
      if (this.demo) this.jobs = this.jobs.filter(j=>j.id!==job.id);
      else { await BawmusicAPI.remove('JOBS', job.id); await this.loadAll(); }
      this.computeDashboard();
      toast('ลบงานแล้ว');
    },
    duplicateJob(job){
      const copy = {...job, id:'', eventDate:'', status:'booked'};
      this.openJobModal(copy);
    },

    // ---------------- Customer actions ----------------
    openCustomerModal(c=null){
      this.editing = c ? {...c} : { id:'', name:'', phone:'', province:'', line:'', facebook:'', address:'', note:'' };
      this.modalType = 'customer'; this.modalOpen = true;
    },
    async saveCustomer(){
      try{
        if (this.demo){
          if (this.editing.id){ const i=this.customers.findIndex(c=>c.id===this.editing.id); this.customers[i]={...this.editing}; }
          else { this.editing.id = 'CU-' + String(this.customers.length+1).padStart(4,'0'); this.editing.jobs=0; this.editing.totalSpent=0; this.customers.unshift({...this.editing}); }
        } else {
          if (this.editing.id) await BawmusicAPI.update('CUSTOMERS', this.editing.id, this.editing);
          else await BawmusicAPI.create('CUSTOMERS', this.editing);
          await this.loadAll();
        }
        this.modalOpen = false;
        toast('บันทึกข้อมูลลูกค้าแล้ว');
      } catch(e){ toast(e.message, 'error'); }
    },
    async deleteCustomer(c){
      const r = await Swal.fire({ title:'ลบลูกค้านี้?', text:c.name, icon:'warning', showCancelButton:true, confirmButtonText:'ลบ', cancelButtonText:'ยกเลิก', confirmButtonColor:'#D2453F' });
      if (!r.isConfirmed) return;
      if (this.demo) this.customers = this.customers.filter(x=>x.id!==c.id);
      else { await BawmusicAPI.remove('CUSTOMERS', c.id); await this.loadAll(); }
      toast('ลบลูกค้าแล้ว');
    },

    // ---------------- Member actions ----------------
    openMemberModal(m=null){
      this.editing = m ? {...m} : { id:'', name:'', nickname:'', instrument:'', phone:'', salary:0, bank:'', account:'', status:'active' };
      this.modalType = 'member'; this.modalOpen = true;
    },
    async saveMember(){
      try{
        if (this.demo){
          if (this.editing.id){ const i=this.members.findIndex(m=>m.id===this.editing.id); this.members[i]={...this.editing}; }
          else { this.editing.id = 'ME-' + String(this.members.length+1).padStart(4,'0'); this.members.unshift({...this.editing}); }
        } else {
          if (this.editing.id) await BawmusicAPI.update('MEMBERS', this.editing.id, this.editing);
          else await BawmusicAPI.create('MEMBERS', this.editing);
          await this.loadAll();
        }
        this.modalOpen = false; toast('บันทึกข้อมูลสมาชิกแล้ว');
      } catch(e){ toast(e.message, 'error'); }
    },
    async deleteMember(m){
      const r = await Swal.fire({ title:'ลบสมาชิกนี้?', text:m.name, icon:'warning', showCancelButton:true, confirmButtonText:'ลบ', cancelButtonText:'ยกเลิก', confirmButtonColor:'#D2453F' });
      if (!r.isConfirmed) return;
      if (this.demo) this.members = this.members.filter(x=>x.id!==m.id);
      else { await BawmusicAPI.remove('MEMBERS', m.id); await this.loadAll(); }
      toast('ลบสมาชิกแล้ว');
    },

    // ---------------- Equipment actions ----------------
    openEquipmentModal(eq=null){
      this.editing = eq ? {...eq} : { id:'', name:'', category:'', qty:1, condition:'ดี', storage:'', remark:'' };
      this.modalType = 'equipment'; this.modalOpen = true;
    },
    async saveEquipment(){
      try{
        if (this.demo){
          if (this.editing.id){ const i=this.equipment.findIndex(e=>e.id===this.editing.id); this.equipment[i]={...this.editing}; }
          else { this.editing.id = 'EQ-' + String(this.equipment.length+1).padStart(4,'0'); this.equipment.unshift({...this.editing}); }
        } else {
          if (this.editing.id) await BawmusicAPI.update('EQUIPMENT', this.editing.id, this.editing);
          else await BawmusicAPI.create('EQUIPMENT', this.editing);
          await this.loadAll();
        }
        this.modalOpen = false; toast('บันทึกข้อมูลอุปกรณ์แล้ว');
      } catch(e){ toast(e.message, 'error'); }
    },
    async deleteEquipment(eq){
      const r = await Swal.fire({ title:'ลบอุปกรณ์นี้?', text:eq.name, icon:'warning', showCancelButton:true, confirmButtonText:'ลบ', cancelButtonText:'ยกเลิก', confirmButtonColor:'#D2453F' });
      if (!r.isConfirmed) return;
      if (this.demo) this.equipment = this.equipment.filter(x=>x.id!==eq.id);
      else { await BawmusicAPI.remove('EQUIPMENT', eq.id); await this.loadAll(); }
      toast('ลบอุปกรณ์แล้ว');
    },

    // ---------------- Expense actions ----------------
    openExpenseModal(ex=null){
      this.editing = ex ? {...ex} : { id:'', jobId:'', date:new Date().toISOString().slice(0,10), category:'', desc:'', amount:0 };
      this.modalType = 'expense'; this.modalOpen = true;
    },
    async saveExpense(){
      try{
        if (this.demo){
          if (this.editing.id){ const i=this.expenses.findIndex(e=>e.id===this.editing.id); this.expenses[i]={...this.editing}; }
          else { this.editing.id = 'EX-' + String(this.expenses.length+1).padStart(4,'0'); this.expenses.unshift({...this.editing}); }
        } else {
          if (this.editing.id) await BawmusicAPI.update('EXPENSES', this.editing.id, this.editing);
          else await BawmusicAPI.create('EXPENSES', this.editing);
          await this.loadAll();
        }
        this.modalOpen = false; toast('บันทึกรายจ่ายแล้ว');
      } catch(e){ toast(e.message, 'error'); }
    },

    // ---------------- Settings ----------------
    async saveApiUrl(url){
      BawmusicAPI.setApiUrl(url);
      toast('บันทึก API URL แล้ว กำลังโหลดข้อมูลใหม่...');
      this.demo = isDemoMode();
      await this.loadAll();
    },

    // computed helpers exposed to templates
    statusLabel(s){ return STATUS_LABEL[s] || s; },
    statusBadge(s){ return STATUS_BADGE[s] || ''; },
    money: fmtMoney,
    dateTH: fmtDateTH,

    get totalIncome(){ return this.jobs.filter(j=>j.status==='completed').reduce((s,j)=>s+Number(j.price||0),0); },
    get totalExpense(){ return this.expenses.reduce((s,e)=>s+Number(e.amount||0),0); },
    get totalDeposit(){ return this.jobs.reduce((s,j)=>s+Number(j.deposit||0),0); },
    get totalRemaining(){ return this.jobs.filter(j=>j.status!=='cancelled').reduce((s,j)=>s+Number(j.remaining||0),0); },

    get filteredJobs(){
      const q = (this.jobSearch || '').trim().toLowerCase();
      if (!q) return this.jobs;
      return this.jobs.filter(j =>
        (j.customerName||'').toLowerCase().includes(q) ||
        (j.venue||'').toLowerCase().includes(q) ||
        (j.province||'').toLowerCase().includes(q) ||
        (j.jobType||'').toLowerCase().includes(q) ||
        (j.id||'').toLowerCase().includes(q)
      );
    },

    // ---------------- Calendar (FullCalendar) ----------------
    calInstance: null,
    renderCal(){
      const el = document.getElementById('calendarEl');
      if (!el) return;
      if (this.calInstance) { this.calInstance.destroy(); }
      const events = this.jobs.map(j => ({
        id: j.id,
        title: j.customerName + ' · ' + (j.venue||''),
        start: j.eventDate + (j.startTime ? 'T'+j.startTime : ''),
        end: j.eventDate + (j.endTime ? 'T'+j.endTime : ''),
        color: colorForStatus(j.status),
      }));
      this.calInstance = new FullCalendar.Calendar(el, {
        initialView: window.innerWidth < 768 ? 'listMonth' : 'dayGridMonth',
        headerToolbar: { left:'prev,next today', center:'title', right: window.innerWidth < 768 ? '' : 'dayGridMonth,timeGridWeek,listMonth' },
        locale: 'th',
        height: 'auto',
        events,
        eventClick: (info) => {
          const job = this.jobs.find(j => j.id === info.event.id);
          if (job) this.openJobModal(job);
        },
      });
      this.calInstance.render();
    },

    // ---------------- Finance Chart (Chart.js) ----------------
    financeChartInstance: null,
    renderFinanceChart(){
      const el = document.getElementById('financeChart');
      if (!el || typeof Chart === 'undefined') return;
      if (this.financeChartInstance) this.financeChartInstance.destroy();
      const months = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
      const income = new Array(12).fill(0);
      const expense = new Array(12).fill(0);
      this.jobs.filter(j=>j.status==='completed').forEach(j=>{
        const m = new Date(j.eventDate).getMonth();
        if (!isNaN(m)) income[m] += Number(j.price||0);
      });
      this.expenses.forEach(e=>{
        const m = new Date(e.date).getMonth();
        if (!isNaN(m)) expense[m] += Number(e.amount||0);
      });
      this.financeChartInstance = new Chart(el, {
        type: 'bar',
        data: {
          labels: months,
          datasets: [
            { label:'รายรับ', data: income, backgroundColor:'#7C3FC4', borderRadius:6 },
            { label:'รายจ่าย', data: expense, backgroundColor:'#D2453F', borderRadius:6 },
          ],
        },
        options: { responsive:true, plugins:{ legend:{ position:'top' } }, scales:{ y:{ beginAtZero:true } } },
      });
    },
  }));

});
