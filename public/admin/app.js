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

  // Cached users fallback renderer
  function renderCachedUsers() {
    try {
      const cached = localStorage.getItem('admin_cached_users');
      if (!cached) return false;
      const parsed = JSON.parse(cached);
      if (parsed && Array.isArray(parsed.users) && parsed.users.length > 0) {
        userTableSummary.innerText = `Jami saqlangan: ${parsed.total || parsed.users.length} ta`;
        usersTableBody.innerHTML = renderUsersHtml(parsed.users);
        return true;
      }
    } catch {}
    return false;
  }

  function renderUsersHtml(usersList) {
    return usersList.map((u) => {
      const plan = u.subscription?.plan || u.plan || 'FREE';
      const planPill = plan === 'PRO' ? 'plan-pro' : (plan === 'BUSINESS' ? 'plan-business' : '');
      const isBanned = !!u.isBanned;
      const userPayload = encodeURIComponent(JSON.stringify(u));

      return `
        <tr class="user-table-row" style="cursor: pointer;" onclick="window.openUserDetails('${userPayload}')" title="Batafsil ma'lumotni ko'rish">
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
          <td onclick="event.stopPropagation()">
            <button class="btn-action-sm ${isBanned ? 'btn-unban' : 'btn-ban'}" onclick="window.toggleUserBan('${u.telegramId}', ${!isBanned})">
              ${isBanned ? 'Ochish' : 'Bloklash'}
            </button>
            <button class="btn-action-sm" onclick="window.openPlanModal('${u.telegramId}', '${escapeHtml(u.firstName || '')}')">
              ⭐ Tarif
            </button>
            <button class="btn-action-sm" onclick="window.openUserDetails('${userPayload}')">
              👤 Profil
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  async function loadUsers() {
    try {
      const hasCached = renderCachedUsers();
      if (!hasCached) {
        usersTableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4">Foydalanuvchilar yuklanmoqda...</td></tr>`;
      }

      const url = `/api/admin/users?q=${encodeURIComponent(currentUserQuery)}&page=${currentUserPage}&limit=15`;
      const data = await apiFetch(url);

      if (!data.success) return;

      if (data.users && data.users.length > 0) {
        // Cache to localStorage so users persist on screen across refreshes or sleeps
        localStorage.setItem('admin_cached_users', JSON.stringify({
          users: data.users,
          total: data.total,
          page: data.page,
          totalPages: data.totalPages,
        }));
      }

      userTableSummary.innerText = `Jami topildi: ${data.total} ta`;
      pageIndicator.innerText = `Sahifa ${data.page} / ${data.totalPages}`;
      btnPrevPage.disabled = data.page <= 1;
      btnNextPage.disabled = data.page >= data.totalPages;

      if (!data.users || data.users.length === 0) {
        if (!hasCached) {
          usersTableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4">Foydalanuvchi topilmadi.</td></tr>`;
        }
        return;
      }

      usersTableBody.innerHTML = renderUsersHtml(data.users);
    } catch (e) {
      console.warn('Failed to load users, keeping cached:', e);
      renderCachedUsers();
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
        if (activeUserForDetails && activeUserForDetails.telegramId === telegramId) {
          activeUserForDetails.isBanned = ban;
          window.openUserDetails(activeUserForDetails);
        }
        loadUsers();
      } else {
        alert('Xatolik: ' + res.message);
      }
    } catch (e) {
      alert('Tarmoq xatosi');
    }
  };

  // User Details Modal Elements
  const userDetailsModal = document.getElementById('userDetailsModal');
  const udId = document.getElementById('udId');
  const udUsername = document.getElementById('udUsername');
  const udFirstName = document.getElementById('udFirstName');
  const udLang = document.getElementById('udLang');
  const udPlan = document.getElementById('udPlan');
  const udStatus = document.getElementById('udStatus');
  const udJobs = document.getElementById('udJobs');
  const udDate = document.getElementById('udDate');
  const udBtnPlan = document.getElementById('udBtnPlan');
  const udBtnBan = document.getElementById('udBtnBan');
  const udBtnClose = document.getElementById('udBtnClose');

  let activeUserForDetails = null;

  window.openUserDetails = function (userPayload) {
    try {
      const u = typeof userPayload === 'string' ? JSON.parse(decodeURIComponent(userPayload)) : userPayload;
      if (!u) return;
      activeUserForDetails = u;

      udId.innerText = u.telegramId;
      udUsername.innerText = u.username ? `@${u.username}` : 'Mavjud emas';
      udFirstName.innerText = u.firstName || 'Foydalanuvchi';
      udLang.innerText = (u.languageCode || 'uz').toUpperCase();

      const plan = u.subscription?.plan || u.plan || 'FREE';
      udPlan.innerText = plan;
      udPlan.className = `status-pill ${plan === 'PRO' ? 'plan-pro' : (plan === 'BUSINESS' ? 'plan-business' : '')}`;

      const isBanned = !!u.isBanned;
      udStatus.innerText = isBanned ? 'Bloklangan' : 'Faol';
      udStatus.className = `status-pill ${isBanned ? 'banned' : 'active'}`;

      udJobs.innerText = `${u.totalJobs || 0} ta vazifa`;
      udDate.innerText = u.createdAt ? new Date(u.createdAt).toLocaleString() : 'Noma\'lum';

      udBtnBan.innerText = isBanned ? '✅ Blokdan Chiqarish' : '⛔ Bloklash';
      udBtnBan.className = `btn-secondary ${isBanned ? 'btn-unban' : 'btn-ban'}`;

      userDetailsModal.style.display = 'flex';
    } catch (err) {
      console.error('Error displaying user details:', err);
    }
  };

  udBtnClose?.addEventListener('click', () => {
    userDetailsModal.style.display = 'none';
  });

  udBtnPlan?.addEventListener('click', () => {
    if (activeUserForDetails) {
      userDetailsModal.style.display = 'none';
      window.openPlanModal(activeUserForDetails.telegramId, activeUserForDetails.firstName || '');
    }
  });

  udBtnBan?.addEventListener('click', () => {
    if (activeUserForDetails) {
      window.toggleUserBan(activeUserForDetails.telegramId, !activeUserForDetails.isBanned);
    }
  });

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
  // Broadcast Studio (Rich Format: Text, Photo, Video, Buttons)
  // ----------------------------------------------------------------------------
  let broadcastType = 'text'; // 'text' | 'photo' | 'video'
  const broadcastMessage = document.getElementById('broadcastMessage');
  const broadcastMediaUrl = document.getElementById('broadcastMediaUrl');
  const mediaUrlGroup = document.getElementById('mediaUrlGroup');
  const mediaUrlLabel = document.getElementById('mediaUrlLabel');
  const broadcastBtnText = document.getElementById('broadcastBtnText');
  const broadcastBtnUrl = document.getElementById('broadcastBtnUrl');
  const typeBtnText = document.getElementById('typeBtnText');
  const typeBtnPhoto = document.getElementById('typeBtnPhoto');
  const typeBtnVideo = document.getElementById('typeBtnVideo');

  const tgPreviewContent = document.getElementById('tgPreviewContent');
  const tgPreviewMedia = document.getElementById('tgPreviewMedia');
  const tgPreviewBtnWrap = document.getElementById('tgPreviewBtnWrap');
  const tgPreviewBtn = document.getElementById('tgPreviewBtn');

  const btnSendBroadcast = document.getElementById('btnSendBroadcast');
  const broadcastProgress = document.getElementById('broadcastProgress');
  const broadcastProgressBar = document.getElementById('broadcastProgressBar');
  const broadcastProgressText = document.getElementById('broadcastProgressText');

  // Media Type Switching
  function setBroadcastType(type) {
    broadcastType = type;
    [typeBtnText, typeBtnPhoto, typeBtnVideo].forEach((btn) => btn?.classList.remove('active'));

    if (type === 'text') {
      typeBtnText?.classList.add('active');
      mediaUrlGroup.style.display = 'none';
    } else if (type === 'photo') {
      typeBtnPhoto?.classList.add('active');
      mediaUrlGroup.style.display = 'block';
      mediaUrlLabel.innerText = "Rasm Havolasi (URL yoki Telegram file_id):";
      broadcastMediaUrl.placeholder = "https://example.com/rasm.jpg";
    } else if (type === 'video') {
      typeBtnVideo?.classList.add('active');
      mediaUrlGroup.style.display = 'block';
      mediaUrlLabel.innerText = "Video Havolasi (URL yoki Telegram file_id):";
      broadcastMediaUrl.placeholder = "https://example.com/video.mp4";
    }
    updateTgPreview();
  }

  typeBtnText?.addEventListener('click', () => setBroadcastType('text'));
  typeBtnPhoto?.addEventListener('click', () => setBroadcastType('photo'));
  typeBtnVideo?.addEventListener('click', () => setBroadcastType('video'));

  function updateTgPreview() {
    const rawText = broadcastMessage.value.trim();
    const mediaUrl = broadcastMediaUrl?.value.trim() || '';
    const btnText = broadcastBtnText?.value.trim() || '';
    const btnUrl = broadcastBtnUrl?.value.trim() || '';

    // 1. Text caption
    if (!rawText && !mediaUrl) {
      tgPreviewContent.innerText = 'Xabar matnini chap tomonda yozing...';
    } else {
      tgPreviewContent.innerHTML = rawText
        ? rawText.replace(/\n/g, '<br>').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        : (broadcastType === 'photo' ? '<i>(Faqat rasm yuboriladi)</i>' : '<i>(Faqat video yuboriladi)</i>');
    }

    // 2. Media Preview
    if (broadcastType === 'photo' && mediaUrl) {
      tgPreviewMedia.style.display = 'block';
      tgPreviewMedia.innerHTML = `<img src="${escapeHtml(mediaUrl)}" alt="Rasm" style="width: 100%; max-height: 220px; object-fit: cover; border-radius: 6px;" onerror="this.onerror=null;this.parentElement.innerHTML='<div style=\'padding:20px;background:rgba(255,255,255,0.06);text-align:center;border-radius:6px;\'>🖼️ Rasm havolasi kiritildi</div>';">`;
    } else if (broadcastType === 'video' && mediaUrl) {
      tgPreviewMedia.style.display = 'block';
      tgPreviewMedia.innerHTML = `<div style="padding: 24px; background: rgba(0,242,254,0.08); border: 1px dashed rgba(0,242,254,0.3); text-align: center; border-radius: 6px;">🎬 <strong>Video Havolasi Biriktirildi</strong><br><small style="color:var(--text-muted);">${escapeHtml(mediaUrl)}</small></div>`;
    } else {
      tgPreviewMedia.style.display = 'none';
      tgPreviewMedia.innerHTML = '';
    }

    // 3. Inline Button Preview
    if (btnText) {
      tgPreviewBtnWrap.style.display = 'block';
      tgPreviewBtn.innerText = btnText;
      tgPreviewBtn.href = btnUrl || '#';
    } else {
      tgPreviewBtnWrap.style.display = 'none';
    }
  }

  [broadcastMessage, broadcastMediaUrl, broadcastBtnText, broadcastBtnUrl].forEach((el) => {
    el?.addEventListener('input', updateTgPreview);
  });

  btnSendBroadcast.addEventListener('click', async () => {
    const text = broadcastMessage.value.trim();
    const mediaUrl = broadcastMediaUrl?.value.trim() || '';
    const buttonText = broadcastBtnText?.value.trim() || '';
    const buttonUrl = broadcastBtnUrl?.value.trim() || '';

    if (!text && !mediaUrl) {
      alert('Iltimos, xabar matnini yoki media havolasini kiriting!');
      return;
    }

    if (buttonText && !buttonUrl) {
      alert('Tugma matnini kiritdingiz, endi tugma havolasini (URL) ham kiriting!');
      return;
    }

    if (!confirm("Haqiqatan ham barcha foydalanuvchilarga ushbu xabarni tarqatmoqchimisiz?")) {
      return;
    }

    btnSendBroadcast.disabled = true;
    broadcastProgress.style.display = 'block';
    broadcastProgressBar.style.width = '30%';
    broadcastProgressText.innerText = 'Telegram foydalanuvchilariga xabar yetkazilmoqda...';

    try {
      const res = await apiFetch('/api/admin/broadcast', {
        method: 'POST',
        body: JSON.stringify({
          text,
          mediaType: broadcastType,
          mediaUrl: mediaUrl || undefined,
          buttonText: buttonText || undefined,
          buttonUrl: buttonUrl || undefined,
        }),
      });

      broadcastProgressBar.style.width = '100%';
      if (res.success) {
        const r = res.result;
        broadcastProgressText.innerHTML = `✅ <b>Tugatildi!</b> Jami: ${r.total} ta, Yetkazildi: <b>${r.sent} ta</b>, Bloklaganlar: ${r.failed} ta.`;
        showToast(`Xabar muvaffaqiyatli tarqatildi: ${r.sent} ta yetkazildi!`);
        broadcastMessage.value = '';
        if (broadcastMediaUrl) broadcastMediaUrl.value = '';
        if (broadcastBtnText) broadcastBtnText.value = '';
        if (broadcastBtnUrl) broadcastBtnUrl.value = '';
        updateTgPreview();
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
  // Jobs List with Persistence Caching
  // ----------------------------------------------------------------------------
  const jobsTableBody = document.getElementById('jobsTableBody');

  function renderCachedJobs() {
    try {
      const cached = localStorage.getItem('admin_cached_jobs');
      if (!cached) return false;
      const jobs = JSON.parse(cached);
      if (Array.isArray(jobs) && jobs.length > 0) {
        jobsTableBody.innerHTML = renderJobsHtml(jobs);
        return true;
      }
    } catch {}
    return false;
  }

  function renderJobsHtml(jobs) {
    return jobs.map((j) => {
      const isImg = j.type === 'IMAGE';
      const typeIcon = isImg ? '🖼️ Rasm' : '🎬 Video';
      const userDisplay = j.user
        ? `${escapeHtml(j.user.firstName || 'User')} (<code>${j.user.telegramId}</code>)`
        : 'Noma\'lum';
      const timeSec = j.processingTime ? `${j.processingTime.toFixed(1)}s` : '-';
      const statusClass = j.status === 'COMPLETED' ? 'active' : (j.status === 'FAILED' ? 'banned' : 'plan-pro');
      const dateStr = j.createdAt ? new Date(j.createdAt).toLocaleTimeString() : '-';

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
  }

  async function loadJobs() {
    try {
      const hasCached = renderCachedJobs();
      if (!hasCached) {
        jobsTableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4">Yuklanmoqda...</td></tr>`;
      }
      const data = await apiFetch('/api/admin/jobs?limit=50');

      if (!data.success || !data.jobs || data.jobs.length === 0) {
        if (!hasCached) {
          jobsTableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4">Hozircha birorta ham ish mavjud emas.</td></tr>`;
        }
        return;
      }

      localStorage.setItem('admin_cached_jobs', JSON.stringify(data.jobs));
      jobsTableBody.innerHTML = renderJobsHtml(data.jobs);
    } catch (e) {
      console.warn('Failed to load jobs:', e);
      renderCachedJobs();
    }
  }

  // ----------------------------------------------------------------------------
  // Toast Notifications & Helpers
  // ----------------------------------------------------------------------------
  let toastTimeout = null;
  function showToast(message, isSuccess = true) {
    const toast = document.getElementById('adminToast');
    if (!toast) return;
    toast.innerHTML = `${isSuccess ? '✅' : '⚠️'} <span>${escapeHtml(message)}</span>`;
    toast.style.display = 'flex';
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toast.style.display = 'none';
    }, 3200);
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Top-Right Yangilash Button with Spin & Notification
  refreshBtn.addEventListener('click', async () => {
    refreshBtn.classList.add('refreshing');
    const refreshText = document.getElementById('refreshBtnText');
    if (refreshText) refreshText.innerText = 'Yangilanmoqda...';

    try {
      if (activeTab === 'tab-overview') await loadStats();
      if (activeTab === 'tab-users') await loadUsers();
      if (activeTab === 'tab-jobs') await loadJobs();
      if (activeTab === 'tab-system') await loadStats();
      showToast('Barcha ko\'rsatkichlar yangilandi!');
    } catch {
      showToast('Yangilashda xatolik yuz berdi', false);
    } finally {
      setTimeout(() => {
        refreshBtn.classList.remove('refreshing');
        if (refreshText) refreshText.innerText = 'Yangilash';
      }, 500);
    }
  });

  // Interactive Overview Cards navigation
  document.getElementById('cardUsers')?.addEventListener('click', () => switchTab('tab-users'));
  document.getElementById('cardImages')?.addEventListener('click', () => switchTab('tab-jobs'));
  document.getElementById('cardVideos')?.addEventListener('click', () => switchTab('tab-jobs'));
  document.getElementById('cardSuccessRate')?.addEventListener('click', () => switchTab('tab-system'));
  document.getElementById('cardQueue')?.addEventListener('click', () => switchTab('tab-jobs'));
  document.getElementById('cardSystem')?.addEventListener('click', () => switchTab('tab-system'));

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

  // ----------------------------------------------------------------------------
  // Clean Bandit ft. Zara Larsson — Symphony Engine (Audio Player & Synth)
  // ----------------------------------------------------------------------------
  let audioCtx = null;
  let isMusicPlaying = false;
  let symphonyMelodyTimeout = null;
  const musicToggleBtn = document.getElementById('musicToggleBtn');
  const musicIcon = document.getElementById('musicIcon');
  const musicLabel = document.getElementById('musicLabel');
  const musicWave = document.getElementById('musicWave');
  const symphonyAudio = document.getElementById('symphonyAudio');

  // Symphony (Clean Bandit) Notes & Frequencies (Eb Major / C Minor)
  const NOTE_FREQ = {
    C3: 130.81, Eb3: 155.56, F3: 174.61, G3: 196.00, Ab2: 103.83, Bb2: 116.54,
    C4: 261.63, D4: 293.66, Eb4: 311.13, F4: 349.23, G4: 392.00, Ab4: 415.30, Bb4: 466.16,
    C5: 523.25, D5: 587.33, Eb5: 622.25
  };

  // Chorus Chord Progression: Eb -> Ab -> Cm -> Bb
  const symphonyChords = [
    { bass: NOTE_FREQ.Eb3, notes: [NOTE_FREQ.G3, NOTE_FREQ.Bb3, NOTE_FREQ.Eb4] },
    { bass: NOTE_FREQ.Ab2, notes: [NOTE_FREQ.Eb3, NOTE_FREQ.C4, NOTE_FREQ.Eb4] },
    { bass: NOTE_FREQ.C3,  notes: [NOTE_FREQ.G3, NOTE_FREQ.C4, NOTE_FREQ.Eb4] },
    { bass: NOTE_FREQ.Bb2, notes: [NOTE_FREQ.F3, NOTE_FREQ.D4, NOTE_FREQ.F4]  },
  ];

  // Signature Chorus Melody: "I just wanna be part of your symphony..."
  const symphonyMelody = [
    // "I just wanna be"
    { note: NOTE_FREQ.Eb4, dur: 0.28 },
    { note: NOTE_FREQ.F4,  dur: 0.28 },
    { note: NOTE_FREQ.G4,  dur: 0.36 },
    { note: NOTE_FREQ.Bb4, dur: 0.36 },
    // "part of your sym-pho-ny"
    { note: NOTE_FREQ.C5,  dur: 0.44 },
    { note: NOTE_FREQ.Bb4, dur: 0.32 },
    { note: NOTE_FREQ.G4,  dur: 0.32 },
    { note: NOTE_FREQ.F4,  dur: 0.32 },
    { note: NOTE_FREQ.Eb4, dur: 0.32 },
    { note: NOTE_FREQ.F4,  dur: 0.32 },
    { note: NOTE_FREQ.G4,  dur: 0.72 },
    // "Will you hold me tight and not let go?"
    { note: NOTE_FREQ.G4,  dur: 0.32 },
    { note: NOTE_FREQ.F4,  dur: 0.32 },
    { note: NOTE_FREQ.Eb4, dur: 0.32 },
    { note: NOTE_FREQ.C4,  dur: 0.32 },
    { note: NOTE_FREQ.Eb4, dur: 0.32 },
    { note: NOTE_FREQ.F4,  dur: 0.36 },
    { note: NOTE_FREQ.G4,  dur: 0.85 },
    // "Sym-pho-ny"
    { note: NOTE_FREQ.C5,  dur: 0.55 },
    { note: NOTE_FREQ.Bb4, dur: 0.45 },
    { note: NOTE_FREQ.G4,  dur: 0.85 },
    // "Like a love song on the radio"
    { note: NOTE_FREQ.F4,  dur: 0.32 },
    { note: NOTE_FREQ.G4,  dur: 0.32 },
    { note: NOTE_FREQ.Ab4, dur: 0.36 },
    { note: NOTE_FREQ.G4,  dur: 0.36 },
    { note: NOTE_FREQ.F4,  dur: 0.32 },
    { note: NOTE_FREQ.Eb4, dur: 0.32 },
    { note: NOTE_FREQ.F4,  dur: 0.75 },
    // "Will you hold me tight and not let go?"
    { note: NOTE_FREQ.G4,  dur: 0.32 },
    { note: NOTE_FREQ.F4,  dur: 0.32 },
    { note: NOTE_FREQ.Eb4, dur: 0.32 },
    { note: NOTE_FREQ.C4,  dur: 0.32 },
    { note: NOTE_FREQ.Eb4, dur: 0.36 },
    { note: NOTE_FREQ.F4,  dur: 0.36 },
    { note: NOTE_FREQ.Eb4, dur: 1.40 },
  ];

  let melodyIdx = 0;
  let chordIdx = 0;

  function playSymphonyStep() {
    if (!audioCtx || !isMusicPlaying) return;

    // Trigger chord progression every few melody notes
    if (melodyIdx === 0 || melodyIdx % 8 === 0) {
      const ch = symphonyChords[chordIdx % symphonyChords.length];
      chordIdx++;

      const now = audioCtx.currentTime;
      const padGain = audioCtx.createGain();
      padGain.gain.setValueAtTime(0.001, now);
      padGain.gain.exponentialRampToValueAtTime(0.04, now + 0.5);
      padGain.gain.exponentialRampToValueAtTime(0.0001, now + 3.8);

      const padFilter = audioCtx.createBiquadFilter();
      padFilter.type = 'lowpass';
      padFilter.frequency.setValueAtTime(650, now);

      padGain.connect(padFilter);
      padFilter.connect(audioCtx.destination);

      [ch.bass, ...ch.notes].forEach((freq) => {
        const osc = audioCtx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        osc.connect(padGain);
        osc.start(now);
        osc.stop(now + 4.0);
      });
    }

    // Play current melody note (Lead Violin / Piano synth)
    const item = symphonyMelody[melodyIdx % symphonyMelody.length];
    melodyIdx++;

    const now = audioCtx.currentTime;
    const noteGain = audioCtx.createGain();
    noteGain.gain.setValueAtTime(0.001, now);
    noteGain.gain.exponentialRampToValueAtTime(0.07, now + 0.04);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, now + item.dur * 0.95);

    const leadFilter = audioCtx.createBiquadFilter();
    leadFilter.type = 'lowpass';
    leadFilter.frequency.setValueAtTime(1400, now);

    noteGain.connect(leadFilter);
    leadFilter.connect(audioCtx.destination);

    const osc = audioCtx.createOscillator();
    osc.type = 'triangle'; // Rich, soft string/violin sound
    osc.frequency.setValueAtTime(item.note, now);
    osc.connect(noteGain);
    osc.start(now);
    osc.stop(now + item.dur);

    symphonyMelodyTimeout = setTimeout(playSymphonyStep, item.dur * 1000);
  }

  async function toggleMusic() {
    isMusicPlaying = !isMusicPlaying;

    if (isMusicPlaying) {
      musicToggleBtn?.classList.add('playing');
      if (musicIcon) musicIcon.innerText = '🔊';
      if (musicLabel) musicLabel.innerText = 'Symphony: Yangramoqda';
      if (musicWave) musicWave.style.display = 'inline-flex';

      // Try playing audio element first if mp3 is present
      let playedAudio = false;
      if (symphonyAudio) {
        try {
          symphonyAudio.volume = 0.65;
          await symphonyAudio.play();
          playedAudio = true;
        } catch {
          playedAudio = false;
        }
      }

      // Fallback to high-fidelity procedural Web Audio synth of Symphony
      if (!playedAudio) {
        if (!audioCtx) {
          const AudioContextClass = window.AudioContext || window.webkitAudioContext;
          if (AudioContextClass) audioCtx = new AudioContextClass();
        }
        if (audioCtx && audioCtx.state === 'suspended') {
          audioCtx.resume();
        }
        melodyIdx = 0;
        chordIdx = 0;
        playSymphonyStep();
      }

      showToast('Clean Bandit — Symphony qo\'shig\'i yangramoqda 🎻');
    } else {
      musicToggleBtn?.classList.remove('playing');
      if (musicIcon) musicIcon.innerText = '🎵';
      if (musicLabel) musicLabel.innerText = 'Symphony: Yoqish';
      if (musicWave) musicWave.style.display = 'none';

      if (symphonyAudio) {
        try { symphonyAudio.pause(); } catch {}
      }
      if (symphonyMelodyTimeout) {
        clearTimeout(symphonyMelodyTimeout);
        symphonyMelodyTimeout = null;
      }
      showToast('Musiqa to\'xtatildi');
    }
  }

  musicToggleBtn?.addEventListener('click', toggleMusic);

  // ----------------------------------------------------------------------------
  // Gentle Falling Snowflakes Animation Engine (Mayda-Mayda Qor Yog'ishi)
  // ----------------------------------------------------------------------------
  function initFallingSnowEngine() {
    const canvas = document.getElementById('ambientCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    const flakes = [];
    const count = Math.min(85, Math.floor((width * height) / 16000));

    for (let i = 0; i < count; i++) {
      flakes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 2.2 + 0.8, // delicate small snowflakes
        speedY: Math.random() * 0.9 + 0.45, // gentle falling speed
        speedX: (Math.random() - 0.5) * 0.3,
        driftAngle: Math.random() * Math.PI * 2,
        driftSpeed: Math.random() * 0.02 + 0.008,
        opacity: Math.random() * 0.65 + 0.25,
      });
    }

    function animateSnow() {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < flakes.length; i++) {
        const f = flakes[i];
        f.driftAngle += f.driftSpeed;
        f.y += f.speedY;
        f.x += f.speedX + Math.sin(f.driftAngle) * 0.4;

        // Wrap around smoothly
        if (f.y > height) {
          f.y = -5;
          f.x = Math.random() * width;
        }
        if (f.x < -5) f.x = width + 5;
        if (f.x > width + 5) f.x = -5;

        ctx.beginPath();
        ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(226, 245, 255, ${f.opacity})`;
        ctx.shadowBlur = 6;
        ctx.shadowColor = `rgba(0, 242, 254, ${f.opacity * 0.8})`;
        ctx.fill();
      }

      requestAnimationFrame(animateSnow);
    }
    animateSnow();
  }

  initFallingSnowEngine();
})();

