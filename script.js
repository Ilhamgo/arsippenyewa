/* ============================================
   RUL OUTDOOR RENTAL MANAGEMENT SYSTEM
   script.js — Vanilla JS, LocalStorage
   ============================================ */

// ── CREDENTIALS ──────────────────────────────
const CREDENTIALS = { username: 'ruloutdoor', password: '11223344' };
const SESSION_KEY = 'rul_session';
const DATA_KEY    = 'rul_transactions';

// ── STATE ─────────────────────────────────────
let transactions = [];
let currentFilter = 'semua';
let itemCount = 0;

// ── BOOT ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  transactions = loadTransactions();
  if (isLoggedIn()) {
    showApp();
  } else {
    showLogin();
  }
  // Enter key on login
  document.getElementById('loginPass').addEventListener('keydown', e => {
    if (e.key === 'Enter') doLogin();
  });
  document.getElementById('loginUser').addEventListener('keydown', e => {
    if (e.key === 'Enter') doLogin();
  });
});

// ── SESSION ───────────────────────────────────
function isLoggedIn() {
  return localStorage.getItem(SESSION_KEY) === 'true';
}

function showLogin() {
  document.getElementById('loginPage').classList.remove('hidden');
  document.getElementById('appPage').classList.add('hidden');
}

function showApp() {
  document.getElementById('loginPage').classList.add('hidden');
  document.getElementById('appPage').classList.remove('hidden');
  initApp();
}

function doLogin() {
  const u = document.getElementById('loginUser').value.trim();
  const p = document.getElementById('loginPass').value;
  const err = document.getElementById('loginError');
  if (u === CREDENTIALS.username && p === CREDENTIALS.password) {
    localStorage.setItem(SESSION_KEY, 'true');
    err.classList.add('hidden');
    showApp();
  } else {
    err.classList.remove('hidden');
    document.getElementById('loginPass').value = '';
    document.getElementById('loginPass').focus();
  }
}

function doLogout() {
  localStorage.removeItem(SESSION_KEY);
  showLogin();
  document.getElementById('loginUser').value = '';
  document.getElementById('loginPass').value = '';
}

function togglePass() {
  const inp = document.getElementById('loginPass');
  inp.type = inp.type === 'password' ? 'text' : 'password';
}

// ── INIT APP ──────────────────────────────────
function initApp() {
  updateStatuses();
  renderStats();
  renderRecentTable();
  renderTransactions();
  checkWarnings();
  setTodayDate();
  document.getElementById('todayLabel').textContent = formatDate(new Date());
  switchSection('dashboard');
}

// ── SIDEBAR ───────────────────────────────────
function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('sidebarOverlay');
  sb.classList.toggle('open');
  ov.classList.toggle('open');
}

// ── SECTIONS ──────────────────────────────────
function switchSection(name) {
  ['dashboard', 'transactions', 'form'].forEach(s => {
    document.getElementById('section' + cap(s)).classList.add('hidden');
  });
  document.getElementById('section' + cap(name)).classList.remove('hidden');

  // Active nav
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.section === name);
  });

  const titles = { dashboard: 'Dashboard', transactions: 'Daftar Transaksi', form: 'Transaksi Baru' };
  document.getElementById('topbarTitle').textContent = titles[name] || '';

  if (name === 'form') {
    const editId = document.getElementById('editId').value;
    if (!editId) resetForm();
  }
  if (name === 'dashboard') renderStats();
  if (name === 'transactions') renderTransactions();

  // Close mobile sidebar
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('open');
}

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

// ── DATA ──────────────────────────────────────
function loadTransactions() {
  try {
    return JSON.parse(localStorage.getItem(DATA_KEY)) || [];
  } catch { return []; }
}

function saveTransactions() {
  localStorage.setItem(DATA_KEY, JSON.stringify(transactions));
}

// ── STATUS ────────────────────────────────────
function getStatus(t) {
  if (t.status === 'selesai') return 'selesai';
  const today = stripTime(new Date());
  const ret   = stripTime(new Date(t.returnDate));
  if (ret < today) return 'terlambat';
  return 'aktif';
}

function stripTime(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function updateStatuses() {
  transactions = transactions.map(t => ({
    ...t,
    computedStatus: getStatus(t)
  }));
  saveTransactions();
}

// ── STATS ─────────────────────────────────────
function renderStats() {
  updateStatuses();
  const today = new Date();
  const todayStr  = dateStr(today);
  const monthStr  = today.getFullYear() + '-' + pad(today.getMonth() + 1);
  const yearStr   = String(today.getFullYear());

  const total   = transactions.length;
  const active  = transactions.filter(t => t.computedStatus === 'aktif').length;
  const late    = transactions.filter(t => t.computedStatus === 'terlambat').length;
  const done    = transactions.filter(t => t.computedStatus === 'selesai').length;

  const todayIncome = transactions
    .filter(t => t.date === todayStr)
    .reduce((s, t) => s + Number(t.total || 0), 0);
  const monthIncome = transactions
    .filter(t => t.date && t.date.startsWith(monthStr))
    .reduce((s, t) => s + Number(t.total || 0), 0);
  const yearIncome = transactions
    .filter(t => t.date && t.date.startsWith(yearStr))
    .reduce((s, t) => s + Number(t.total || 0), 0);

  document.getElementById('statTotal').textContent  = total;
  document.getElementById('statActive').textContent  = active;
  document.getElementById('statLate').textContent   = late;
  document.getElementById('statDone').textContent   = done;
  document.getElementById('statToday').textContent  = formatRp(todayIncome);
  document.getElementById('statMonth').textContent  = formatRp(monthIncome);
  document.getElementById('statYear').textContent   = formatRp(yearIncome);

  // Overdue badge in topbar
  const badge = document.getElementById('overduebadge');
  const cnt = document.getElementById('overdueBadgeCount');
  if (late > 0) {
    badge.classList.remove('hidden');
    cnt.textContent = late;
  } else {
    badge.classList.add('hidden');
  }
}

// ── WARNINGS ──────────────────────────────────
function checkWarnings() {
  updateStatuses();
  const today = dateStr(new Date());
  const dueTodayCount = transactions.filter(t =>
    t.computedStatus !== 'selesai' && t.returnDate === today
  ).length;
  const lateCount = transactions.filter(t => t.computedStatus === 'terlambat').length;
  const banner = document.getElementById('warningBanner');
  const txt    = document.getElementById('warningText');

  const msgs = [];
  if (dueTodayCount > 0) msgs.push(`${dueTodayCount} transaksi jatuh tempo HARI INI`);
  if (lateCount > 0)     msgs.push(`${lateCount} transaksi TERLAMBAT dikembalikan`);

  if (msgs.length > 0) {
    txt.textContent = msgs.join(' · ');
    banner.classList.remove('hidden');
  } else {
    banner.classList.add('hidden');
  }
}

// ── RECENT TABLE ──────────────────────────────
function renderRecentTable() {
  updateStatuses();
  const sorted = [...transactions].sort((a, b) => b.id - a.id).slice(0, 5);
  const tbody = document.getElementById('recentTbody');
  if (sorted.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:1.5rem">Belum ada transaksi</td></tr>`;
    return;
  }
  tbody.innerHTML = sorted.map(t => `
    <tr class="${t.computedStatus === 'terlambat' ? 'row-late' : ''}">
      <td><strong>${esc(t.name)}</strong><br><small style="color:var(--text-dim)">${esc(t.phone)}</small></td>
      <td>${renderItemsCell(t.items)}</td>
      <td>${t.returnDate ? formatDate(new Date(t.returnDate)) : '-'}</td>
      <td style="color:var(--amber)">${formatRp(t.total)}</td>
      <td>${badgeHtml(t.computedStatus)}</td>
    </tr>
  `).join('');
}

// ── MAIN TRANSACTIONS TABLE ───────────────────
function renderTransactions() {
  updateStatuses();
  const q = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();
  let list = [...transactions].sort((a, b) => b.id - a.id);

  if (q) list = list.filter(t => t.name.toLowerCase().includes(q) || t.phone.includes(q));
  if (currentFilter !== 'semua') list = list.filter(t => t.computedStatus === currentFilter);

  const tbody = document.getElementById('transTbody');
  const empty = document.getElementById('emptyState');

  if (list.length === 0) {
    tbody.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  tbody.innerHTML = list.map((t, i) => `
    <tr class="${t.computedStatus === 'terlambat' ? 'row-late' : ''}">
      <td style="color:var(--text-muted)">${i + 1}</td>
      <td>
        <div><strong>${esc(t.name)}</strong></div>
        <div style="font-size:0.78rem;color:var(--text-dim)">${esc(t.phone)}</div>
      </td>
      <td>${esc(t.phone)}</td>
      <td>${renderItemsCell(t.items)}</td>
      <td>${t.date ? formatDate(new Date(t.date)) : '-'}</td>
      <td>${t.returnDate ? formatDate(new Date(t.returnDate)) : '-'}</td>
      <td style="color:var(--amber);font-weight:600">${formatRp(t.total)}</td>
      <td>${badgeHtml(t.computedStatus)}</td>
      <td>
        <div class="action-btns">
          <button class="btn-icon" onclick="openEdit(${t.id})" title="Edit">✏️ Edit</button>
          ${t.computedStatus !== 'selesai' ? `<button class="btn-icon btn-done" onclick="markDone(${t.id})" title="Selesai">✅ Selesai</button>` : ''}
          <button class="btn-icon btn-del" onclick="deleteTransaction(${t.id})" title="Hapus">🗑</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function setFilter(f, el) {
  currentFilter = f;
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  renderTransactions();
}

// ── ITEMS UI ──────────────────────────────────
function addItem(name = '', qty = 1) {
  itemCount++;
  const id = 'item_' + itemCount;
  const div = document.createElement('div');
  div.className = 'item-row';
  div.id = 'row_' + id;
  div.innerHTML = `
    <input type="text" placeholder="Nama barang (e.g. Tenda Dome)" value="${esc(name)}" id="name_${id}" />
    <input type="number" class="item-qty" placeholder="Qty" min="1" value="${qty}" id="qty_${id}" />
    <button class="btn-rm-item" onclick="removeItem('row_${id}')">✕</button>
  `;
  document.getElementById('itemsList').appendChild(div);
}

function removeItem(rowId) {
  const el = document.getElementById(rowId);
  if (el) el.remove();
  // Keep at least one
  if (document.querySelectorAll('.item-row').length === 0) addItem();
}

function getItems() {
  const rows = document.querySelectorAll('.item-row');
  return Array.from(rows).map(row => {
    const inputs = row.querySelectorAll('input');
    return { name: inputs[0].value.trim(), qty: parseInt(inputs[1].value) || 1 };
  }).filter(i => i.name);
}

// ── FORM ──────────────────────────────────────
function setTodayDate() {
  const d = document.getElementById('fDate');
  if (d) d.value = dateStr(new Date());
}

function calcReturn() {
  const dateVal = document.getElementById('fDate').value;
  const dur     = parseInt(document.getElementById('fDuration').value) || 0;
  if (dateVal && dur > 0) {
    const d = new Date(dateVal);
    d.setDate(d.getDate() + dur);
    document.getElementById('fReturn').value = formatDate(d);
  } else {
    document.getElementById('fReturn').value = '';
  }
}

document.addEventListener('change', e => {
  if (e.target.id === 'fDate' || e.target.id === 'fDuration') calcReturn();
});

function resetForm() {
  document.getElementById('editId').value = '';
  document.getElementById('fName').value = '';
  document.getElementById('fPhone').value = '';
  document.getElementById('fDuration').value = '';
  document.getElementById('fTotal').value = '';
  document.getElementById('fNote').value = '';
  document.getElementById('fReturn').value = '';
  document.getElementById('formError').classList.add('hidden');
  document.getElementById('itemsList').innerHTML = '';
  itemCount = 0;
  addItem();
  setTodayDate();
  document.getElementById('formTitle').textContent = 'Transaksi Baru';
}

function saveTransaction() {
  const name     = document.getElementById('fName').value.trim();
  const phone    = document.getElementById('fPhone').value.trim();
  const date     = document.getElementById('fDate').value;
  const duration = parseInt(document.getElementById('fDuration').value);
  const total    = document.getElementById('fTotal').value;
  const note     = document.getElementById('fNote').value.trim();
  const items    = getItems();
  const editId   = document.getElementById('editId').value;

  const errEl = document.getElementById('formError');

  if (!name || !phone || !date || !duration || !total || items.length === 0) {
    errEl.textContent = 'Harap isi semua field yang wajib (*)';
    errEl.classList.remove('hidden');
    return;
  }
  errEl.classList.add('hidden');

  const dateObj = new Date(date);
  dateObj.setDate(dateObj.getDate() + duration);
  const returnDate = dateStr(dateObj);

  if (editId) {
    const idx = transactions.findIndex(t => t.id === parseInt(editId));
    if (idx !== -1) {
      transactions[idx] = {
        ...transactions[idx],
        name, phone, items, date, duration,
        returnDate, total: Number(total), note,
        computedStatus: getStatus({ returnDate, status: transactions[idx].status })
      };
    }
    showToast('Transaksi berhasil diperbarui ✓', 'success');
  } else {
    const id = Date.now();
    transactions.push({
      id, name, phone, items, date, duration,
      returnDate, total: Number(total), note,
      status: 'aktif',
      computedStatus: 'aktif'
    });
    showToast('Transaksi baru berhasil disimpan ✓', 'success');
  }

  saveTransactions();
  updateStatuses();
  renderStats();
  renderRecentTable();
  checkWarnings();
  resetForm();
  switchSection('transactions');
}

// ── EDIT ──────────────────────────────────────
function openEdit(id) {
  const t = transactions.find(t => t.id === id);
  if (!t) return;

  // Populate inline form
  switchSection('form');
  document.getElementById('formTitle').textContent = 'Edit Transaksi';
  document.getElementById('editId').value = t.id;
  document.getElementById('fName').value = t.name;
  document.getElementById('fPhone').value = t.phone;
  document.getElementById('fDate').value = t.date;
  document.getElementById('fDuration').value = t.duration;
  document.getElementById('fTotal').value = t.total;
  document.getElementById('fNote').value = t.note || '';

  document.getElementById('itemsList').innerHTML = '';
  itemCount = 0;
  (t.items || []).forEach(i => addItem(i.name, i.qty));
  if (!t.items || t.items.length === 0) addItem();

  calcReturn();
}

function closeModal() {
  document.getElementById('modalEdit').classList.add('hidden');
}

// ── DONE & DELETE ─────────────────────────────
function markDone(id) {
  const t = transactions.find(t => t.id === id);
  if (!t) return;
  if (!confirm(`Tandai "${t.name}" sebagai SELESAI?`)) return;
  t.status = 'selesai';
  t.computedStatus = 'selesai';
  saveTransactions();
  renderStats();
  renderTransactions();
  renderRecentTable();
  checkWarnings();
  showToast('Transaksi ditandai selesai ✓', 'success');
}

function deleteTransaction(id) {
  const t = transactions.find(t => t.id === id);
  if (!t) return;
  if (!confirm(`Hapus transaksi "${t.name}"? Tindakan ini tidak bisa dibatalkan.`)) return;
  transactions = transactions.filter(t => t.id !== id);
  saveTransactions();
  renderStats();
  renderTransactions();
  renderRecentTable();
  checkWarnings();
  showToast('Transaksi dihapus', 'error');
}

// ── HELPERS ───────────────────────────────────
function dateStr(d) {
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

function pad(n) { return String(n).padStart(2, '0'); }

function formatDate(d) {
  if (!(d instanceof Date) || isNaN(d)) return '-';
  const days = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
  const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function formatRp(n) {
  if (!n && n !== 0) return 'Rp 0';
  return 'Rp ' + Number(n).toLocaleString('id-ID');
}

function esc(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function badgeHtml(status) {
  const map = {
    aktif:     ['badge-aktif',     '🟢 Aktif'],
    terlambat: ['badge-terlambat', '🔴 Terlambat'],
    selesai:   ['badge-selesai',   '⬜ Selesai'],
  };
  const [cls, label] = map[status] || ['badge-selesai', status];
  return `<span class="badge ${cls}">${label}</span>`;
}

function renderItemsCell(items) {
  if (!items || items.length === 0) return '<span style="color:var(--text-muted)">-</span>';
  return `<div class="items-list-cell">${
    items.map((i, idx) =>
      `<span>${idx === 0 ? '📦 ' : ''}${esc(i.name)} <strong>×${i.qty}</strong></span>`
    ).join('')
  }</div>`;
}

function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast' + (type ? ' toast-' + type : '');
  t.classList.remove('hidden');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => t.classList.add('hidden'), 2800);
}