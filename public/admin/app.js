/**
 * ==============================================================================
 * ADMIN DASHBOARD — CORE JAVASCRIPT CLIENT
 * ==============================================================================
 */

(function () {
  'use strict';

  let currentAdminKey = localStorage.getItem('ai_bot_admin_key') || '';
  let activeTab = 'tab-overview';
  let refreshTimer = null;
  let currentUserPage = 1;
  let currentUserQuery = '';
  let selectedTelegramIdForPlan = null;

  // DOM Elements
  const authModal = document.getElementById('authModal');
  const authForm = document.getElementById('authForm');
  const adminKeyInput = document.getElementById('adminKeyInput');
  const authError = document.getElementById('authError');
  const appLayout = document.getElementById('appLayout');
  const logoutBtn = document.getElementById('logoutBtn');
  const refreshBtn = document.getElementById('refreshBtn');
  const lastUpdatedText = document.getElementById('lastUpdatedText');

  // Tab Navigation
  const navItems = document.querySelectorAll('.nav-item');
  const tabPanes = document.querySelectorAll('.tab-pane');
  const pageTitle = document.getElementById('pageTitle');
  const pageSubtitle = document.getElementById('pageSubtitle');

  const tabTitles = {
    'tab-overview': { title: "Umumiy Ko'rsatkichlar", subtitle: "Bot faoliyati va AI serverining jonli monitoringi" },
    'tab-users': { title: "Foydalanuvchilar Boshqaruvi", subtitle: "Barcha foydalanuvchilar, ularning hisoblari va limitlari" },
    'tab-broadcast': { title: "Xabar Tarqatish Studiyasi", subtitle: "Telegram foydalanuvchilariga e'lon va xabarlar yuborish" },
    'tab-jobs': { title: "Media Ishlari Navbati", subtitle: "AI orqali tiniqlashtirilgan rasmlar va videolarning jonli jurnali" },
    'tab-system': { title: "Server Salomatligi", subtitle: "Infratuzilma, xotira va bot konfiguratsiyasi" },
  };

  // ----------------------------------------------------------------------------
  // API Fetch Helper
  // ----------------------------------------------------------------------------
  async function apiFetch(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      'x-admin-key': currentAdminKey,
      ...(options.headers || {}),
    };

    const res = await fetch(endpoint, { ...options, headers });
    if (res.status === 401) {
      handleUnauthorized();
      throw new Error('Unauthorized');
    }
    return res.json();
  }

  function handleUnauthorized() {
    localStorage.removeItem('ai_bot_admin_key');
    currentAdminKey = '';
    appLayout.style.display = 'none';
    authModal.style.display = 'flex';
    authError.style.display = 'block';
    authError.innerText = "Xavfsizlik kaliti noto'g'ri yoki sessiya muddati tugadi!";
  }

  // ----------------------------------------------------------------------------
  // Authentication Flow
  // ----------------------------------------------------------------------------
  async function verifyKey(key) {
    try {
      const res = await fetch('/api/admin/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      });
      const data = await res.json();
      return data.success === true;
    } catch {
      return false;
    }
  }

  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const key = adminKeyInput.value.trim();
    if (!key) return;

    authError.style.display = 'none';
    const isValid = await verifyKey(key);

    if (isValid) {
      currentAdminKey = key;
      localStorage.setItem('ai_bot_admin_key', key);
      authModal.style.display = 'none';
      appLayout.style.display = 'flex';
      initDashboard();
    } else {
      authError.style.display = 'block';
      authError.innerText = "Noto'g'ri maxfiy kalit. Iltimos, qayta urinib ko'ring!";
    }
  });

  logoutBtn.addEventListener('click', () => {
    if (confirm('Admin paneldan chiqmoqchimisiz?')) {
      localStorage.removeItem('ai_bot_admin_key');
      currentAdminKey = '';
      location.reload();
    }
  });

  // ----------------------------------------------------------------------------
  // Tab Switching
  // ----------------------------------------------------------------------------
  navItems.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      switchTab(targetTab);
    });
  });

  function switchTab(targetTabId) {
    activeTab = targetTabId;
    navItems.forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === targetTabId);
    });
    tabPanes.forEach((pane) => {
      pane.classList.toggle('active', pane.id === targetTabId);
    });

    const meta = tabTitles[targetTabId] || { title: 'Dashboard', subtitle: '' };
    pageTitle.innerText = meta.title;
    pageSubtitle.innerText = meta.subtitle;

    if (targetTabId === 'tab-users') loadUsers();
    if (targetTabId === 'tab-jobs') loadJobs();
    if (targetTabId === 'tab-overview') loadStats();
  }

  // ----------------------------------------------------------------------------
  // Overview & Stats
  // ----------------------------------------------------------------------------
  async function loadStats() {
    try {
      const data = await apiFetch('/api/admin/stats');
      if (!data.success) return;

      const s = data.stats;
      document.getElementById('statUsers').innerText = s.totalUsers.toLocaleString();
      document.getElementById('badgeUserCount').innerText = s.totalUsers;
      document.getElementById('statImages').innerText = s.imageJobs.toLocaleString();
      document.getElementById('statVideos').innerText = s.videoJobs.toLocaleString();
      document.getElementById('statSuccessRate').innerText = `${s.successRatePercent}%`;

      // BullMQ
      document.getElementById('queueImgWaiting').innerText = s.queueStatus.imageWaiting;
      document.getElementById('queueImgActive').innerText = s.queueStatus.imageActive;
      document.getElementById('queueVidWaiting').innerText = s.queueStatus.videoWaiting;
      document.getElementById('queueVidActive').innerText = s.queueStatus.videoActive;

      // Server
      const uptimeHrs = (s.server.uptimeSeconds / 3600).toFixed(1);
      document.getElementById('statusUptime').innerText = `${uptimeHrs} soat`;
      document.getElementById('statusRam').innerText = `${s.server.memoryUsedMB} MB`;
      document.getElementById('statusDb').innerText = s.queueStatus.databaseConnected ? 'Ulangan' : 'Kutilmoqda';
      document.getElementById('statusRedis').innerText = s.queueStatus.redisConnected ? 'Ulangan' : 'Kutilmoqda';

      // System tab
      document.getElementById('sysNodeVer').innerText = s.server.nodeVersion;
      document.getElementById('sysCpuCores').innerText = `${s.server.cpuCores} ta yadro`;

      lastUpdatedText.innerText = `Yangilandi: ${new Date().toLocaleTimeString()}`;
    } catch (e) {
      console.warn('Failed to load stats:', e);
    }
  }

  // ----------------------------------------------------------------------------
  // Users Management
  // ----------------------------------------------------------------------------
  const userSearchInput = document.getElementById('userSearchInput');
  const usersTableBody = document.getElementById('usersTableBody');
  const userTableSummary = document.getElementById('userTableSummary');
  const btnPrevPage = document.getElementById('btnPrevPage');
  const btnNextPage = document.getElementById('btnNextPage');
  const pageIndicator = document.getElementById('pageIndicator');

  let searchTimeout = null;
  userSearchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      currentUserQuery = e.target.value.trim();
      currentUserPage = 1;
      loadUsers();
    }, 350);
  });

  btnPrevPage.addEventListener('click', () => {
    if (currentUserPage > 1) {
      currentUserPage--;
      loadUsers();
    }
  });

  btnNextPage.addEventListener('click', () => {
    currentUserPage++;
    loadUsers();
  });

  async function loadUsers() {
    try {
      usersTableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4">Foydalanuvchilar qidirilmoqda...</td></tr>`;
      const url = `/api/admin/users?q=${encodeURIComponent(currentUserQuery)}&page=${currentUserPage}&limit=15`;
      const data = await apiFetch(url);

      if (!data.success) return;

      userTableSummary.innerText = `Jami topildi: ${data.total} ta`;
      pageIndicator.innerText = `Sahifa ${data.page} / ${data.totalPages}`;
      btnPrevPage.disabled = data.page <= 1;
      btnNextPage.disabled = data.page >= data.totalPages;

      if (!data.users || data.users.length === 0) {
        usersTableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4">Foydalanuvchi topilmadi.</td></tr>`;
        return;
      }

      usersTableBody.innerHTML = data.users.map((u) => {
        const plan = u.subscription?.plan || 'FREE';
        const planPill = plan === 'PRO' ? 'plan-pro' : (plan === 'BUSINESS' ? 'plan-business' : '');
        const isBanned = u.isBanned;

        return `
          <tr>
            <td><code>${u.telegramId}</code></td>
            <td>
              <strong>${escapeHtml(u.firstName || 'Foydalanuvchi')}</strong>
              <div class="input-hint">${u.username ? '@' + u.username : 'username yo\'q'}</div>
            </td>
            <td><code>${u.languageCode || 'uz'}</code></td>
            <td><span class="status-pill ${planPill}">${plan}</span></td>
            <td><strong>${u.totalJobs || 0} ta</strong></td>
            <td>
              <span class="status-pill ${isBanned ? 'banned' : 'active'}">
                ${isBanned ? 'Bloklangan' : 'Faol'}
              </span>
            </td>
            <td>
              <button class="btn-action-sm ${isBanned ? 'btn-unban' : 'btn-ban'}" onclick="window.toggleUserBan('${u.telegramId}', ${!isBanned})">
                ${isBanned ? 'Ochish' : 'Bloklash'}
              </button>
              <button class="btn-action-sm" onclick="window.openPlanModal('${u.telegramId}', '${escapeHtml(u.firstName || '')}')">
                ⭐ Tarif
              </button>
            </td>
          </tr>
        `;
      }).join('');
    } catch (e) {
      console.warn('Failed to load users:', e);
    }
  }

  // Global user actions
  window.toggleUserBan = async function (telegramId, ban) {
    const action = ban ? 'bloklamoqchimisiz' : 'blokdan chiqarmoqchimisiz';
    if (!confirm(`Foydalanuvchini (${telegramId}) ${action}?`)) return;

    try {
      const res = await apiFetch(`/api/admin/users/${telegramId}/ban`, {
        method: 'POST',
        body: JSON.stringify({ isBanned: ban }),
      });
      if (res.success) {
        loadUsers();
      } else {
        alert('Xatolik: ' + res.message);
      }
    } catch (e) {
      alert('Tarmoq xatosi');
    }
  };

  // Plan Modal
  const planModal = document.getElementById('planModal');
  const planModalUserText = document.getElementById('planModalUserText');
  const modalPlanSelect = document.getElementById('modalPlanSelect');
  const modalPlanDays = document.getElementById('modalPlanDays');
  const btnCancelPlanModal = document.getElementById('btnCancelPlanModal');
  const btnSavePlanModal = document.getElementById('btnSavePlanModal');

  window.openPlanModal = function (telegramId, name) {
    selectedTelegramIdForPlan = telegramId;
    planModalUserText.innerText = `Foydalanuvchi: ${name} (ID: ${telegramId})`;
    planModal.style.display = 'flex';
  };

  btnCancelPlanModal.addEventListener('click', () => {
    planModal.style.display = 'none';
  });

  btnSavePlanModal.addEventListener('click', async () => {
    if (!selectedTelegramIdForPlan) return;
    const plan = modalPlanSelect.value;
    const durationDays = parseInt(modalPlanDays.value, 10) || 30;

    try {
      const res = await apiFetch(`/api/admin/users/${selectedTelegramIdForPlan}/plan`, {
        method: 'POST',
        body: JSON.stringify({ plan, durationDays }),
      });
      if (res.success) {
        planModal.style.display = 'none';
        loadUsers();
      } else {
        alert('Tarif berishda xatolik yuz berdi.');
      }
    } catch {
      alert('Tarmoq xatoligi.');
    }
  });

  // ----------------------------------------------------------------------------
  // Broadcast Studio
  // ----------------------------------------------------------------------------
  const broadcastMessage = document.getElementById('broadcastMessage');
  const tgPreviewContent = document.getElementById('tgPreviewContent');
  const btnSendBroadcast = document.getElementById('btnSendBroadcast');
  const broadcastProgress = document.getElementById('broadcastProgress');
  const broadcastProgressBar = document.getElementById('broadcastProgressBar');
  const broadcastProgressText = document.getElementById('broadcastProgressText');

  broadcastMessage.addEventListener('input', () => {
    const raw = broadcastMessage.value.trim();
    if (!raw) {
      tgPreviewContent.innerText = 'Xabar matnini chap tomonda yozing...';
      return;
    }
    // Simple HTML sanitize for preview
    tgPreviewContent.innerHTML = raw
      .replace(/\n/g, '<br>')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
  });

  btnSendBroadcast.addEventListener('click', async () => {
    const text = broadcastMessage.value.trim();
    if (!text) {
      alert('Iltimos, xabar matnini kiriting!');
      return;
    }

    if (!confirm("Haqiqatan ham barcha foydalanuvchilarga ushbu xabarni yubormoqchimisiz?")) {
      return;
    }

    btnSendBroadcast.disabled = true;
    broadcastProgress.style.display = 'block';
    broadcastProgressBar.style.width = '30%';
    broadcastProgressText.innerText = 'Telegram foydalanuvchilariga xabar yetkazilmoqda...';

    try {
      const res = await apiFetch('/api/admin/broadcast', {
        method: 'POST',
        body: JSON.stringify({ text }),
      });

      broadcastProgressBar.style.width = '100%';
      if (res.success) {
        const r = res.result;
        broadcastProgressText.innerHTML = `✅ <b>Tugatildi!</b> Jami: ${r.total} ta, Yetkazildi: <b>${r.sent} ta</b>, Bloklaganlar: ${r.failed} ta.`;
        broadcastMessage.value = '';
      } else {
        broadcastProgressText.innerText = '❌ Xatolik yuz berdi: ' + (res.error || 'Noma\'lum xato');
      }
    } catch (e) {
      broadcastProgressText.innerText = '❌ Tarmoq xatoligi yuz berdi.';
    } finally {
      btnSendBroadcast.disabled = false;
    }
  });

  // ----------------------------------------------------------------------------
  // Jobs List
  // ----------------------------------------------------------------------------
  const jobsTableBody = document.getElementById('jobsTableBody');

  async function loadJobs() {
    try {
      jobsTableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4">Yuklanmoqda...</td></tr>`;
      const data = await apiFetch('/api/admin/jobs?limit=25');

      if (!data.success || !data.jobs || data.jobs.length === 0) {
        jobsTableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4">Hozircha birorta ham ish mavjud emas.</td></tr>`;
        return;
      }

      jobsTableBody.innerHTML = data.jobs.map((j) => {
        const isImg = j.type === 'IMAGE';
        const typeIcon = isImg ? '🖼️ Rasm' : '🎬 Video';
        const userDisplay = j.user
          ? `${escapeHtml(j.user.firstName || 'User')} (<code>${j.user.telegramId}</code>)`
          : 'Noma\'lum';
        const timeSec = j.processingTime ? `${j.processingTime.toFixed(1)}s` : '-';
        const statusClass = j.status === 'COMPLETED' ? 'active' : (j.status === 'FAILED' ? 'banned' : 'plan-pro');
        const dateStr = new Date(j.createdAt).toLocaleTimeString();

        return `
          <tr>
            <td><strong>${typeIcon}</strong></td>
            <td>${userDisplay}</td>
            <td><span class="badge-number">${j.scale}x (${j.targetResolution || 'HD'})</span></td>
            <td>${j.inputResolution || '-'}</td>
            <td><code>${timeSec}</code></td>
            <td><span class="status-pill ${statusClass}">${j.status}</span></td>
            <td>${dateStr}</td>
          </tr>
        `;
      }).join('');
    } catch (e) {
      console.warn('Failed to load jobs:', e);
    }
  }

  // ----------------------------------------------------------------------------
  // Helpers & Init
  // ----------------------------------------------------------------------------
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  refreshBtn.addEventListener('click', () => {
    if (activeTab === 'tab-overview') loadStats();
    if (activeTab === 'tab-users') loadUsers();
    if (activeTab === 'tab-jobs') loadJobs();
  });

  async function initDashboard() {
    await loadStats();
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = setInterval(() => {
      if (activeTab === 'tab-overview') loadStats();
    }, 5000);
  }

  // Auto-login if key is already stored
  if (currentAdminKey) {
    verifyKey(currentAdminKey).then((valid) => {
      if (valid) {
        authModal.style.display = 'none';
        appLayout.style.display = 'flex';
        initDashboard();
      } else {
        localStorage.removeItem('ai_bot_admin_key');
        authModal.style.display = 'flex';
      }
    });
  } else {
    authModal.style.display = 'flex';
  }
})();
