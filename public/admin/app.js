/**
 * ==============================================================================
 * ADMIN DASHBOARD — CORE JAVASCRIPT CLIENT (PRODUCTION GRADE)
 * ==============================================================================
 */

(function () {
  'use strict';

  let currentAdminKey = localStorage.getItem('ai_bot_admin_key') || '';
  let activeTab = 'tab-overview';
  let refreshTimer = null;
  let currentUserPage = 1;
  let currentUserQuery = '';
  let currentUserPlanFilter = '';
  let selectedTelegramIdForPlan = null;
  let activeUserForDetails = null;

  // DOM Elements
  const authModal = document.getElementById('authModal');
  const authForm = document.getElementById('authForm');
  const adminKeyInput = document.getElementById('adminKeyInput');
  const authError = document.getElementById('authError');
  const appLayout = document.getElementById('appLayout');
  const logoutBtn = document.getElementById('logoutBtn');
  const refreshBtn = document.getElementById('refreshBtn');
  const refreshSvg = document.getElementById('refreshSvg');
  const refreshBtnText = document.getElementById('refreshBtnText');
  const lastUpdatedText = document.getElementById('lastUpdatedText');

  // Tab Navigation
  const navItems = document.querySelectorAll('.nav-item');
  const tabPanes = document.querySelectorAll('.tab-pane');
  const pageTitle = document.getElementById('pageTitle');
  const pageSubtitle = document.getElementById('pageSubtitle');

  const tabTitles = {
    'tab-overview': { title: "Umumiy Ko'rsatkichlar", subtitle: "Bot faoliyati va AI serverining jonli monitoringi" },
    'tab-users': { title: "Foydalanuvchilar Boshqaruvi", subtitle: "Barcha foydalanuvchilar, ularning hisoblari va limitlari" },
    'tab-reviews': { title: "Foydalanuvchilar Fikrlari & Sharhlar", subtitle: "Foydalanuvchilar qoldirgan 1-5 yulduzli baholar va barcha izohlar jurnali" },
    'tab-broadcast': { title: "Xabar Tarqatish Studiyasi", subtitle: "Telegram foydalanuvchilariga e'lon va xabarlar yuborish" },
    'tab-jobs': { title: "Media Ishlari Navbati", subtitle: "AI orqali tiniqlashtirilgan rasmlar va videolarning jonli jurnali" },
    'tab-system': { title: "Server Salomatligi", subtitle: "Infratuzilma, xotira va bot konfiguratsiyasi" },
  };

  // ----------------------------------------------------------------------------
  // Helper: Toast Notifications
  // ----------------------------------------------------------------------------
  function showToast(msg, duration = 3000) {
    const toast = document.getElementById('adminToast');
    if (!toast) return;
    toast.innerText = msg;
    toast.style.display = 'block';
    toast.classList.add('show');

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        toast.style.display = 'none';
      }, 300);
    }, duration);
  }

  function escapeHtml(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

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
    authError.innerText = "Xavfsizlik paroli noto'g'ri yoki sessiya muddati tugadi!";
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
      authError.innerText = "Noto'g'ri parol! Iltimos qaytadan kiriting (0603).";
    }
  });

  logoutBtn.addEventListener('click', () => {
    if (!confirm('Haqiqatan ham chiqmoqchimisiz?')) return;
    localStorage.removeItem('ai_bot_admin_key');
    currentAdminKey = '';
    window.location.reload();
  });

  // ----------------------------------------------------------------------------
  // Navigation Tabs & Card Linking
  // ----------------------------------------------------------------------------
  function switchTab(tabId) {
    activeTab = tabId;
    navItems.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    tabPanes.forEach((pane) => {
      pane.classList.toggle('active', pane.id === tabId);
    });

    if (tabTitles[tabId]) {
      pageTitle.innerText = tabTitles[tabId].title;
      pageSubtitle.innerText = tabTitles[tabId].subtitle;
    }

    if (tabId === 'tab-users') loadUsers();
    if (tabId === 'tab-reviews') loadReviews();
    if (tabId === 'tab-jobs') loadJobs();
    if (tabId === 'tab-overview') loadStats();
  }

  navItems.forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Overview Clickable Cards
  document.getElementById('cardUsers')?.addEventListener('click', () => {
    switchUserStatusFilter('ALL');
    switchTab('tab-users');
  });
  document.getElementById('cardActiveUsers')?.addEventListener('click', () => {
    switchUserStatusFilter('ACTIVE');
    switchTab('tab-users');
  });
  document.getElementById('cardNewUsers')?.addEventListener('click', () => {
    const today = new Date().toISOString().split('T')[0];
    if (userSearchInput) userSearchInput.value = today;
    currentUserQuery = today;
    switchTab('tab-users');
  });
  document.getElementById('cardSuccessRate')?.addEventListener('click', () => switchTab('tab-system'));
  document.getElementById('cardFreeUsers')?.addEventListener('click', () => {
    const pf = document.getElementById('userPlanFilter');
    if (pf) pf.value = 'FREE';
    currentUserPlanFilter = 'FREE';
    switchTab('tab-users');
  });
  document.getElementById('cardProUsers')?.addEventListener('click', () => {
    const pf = document.getElementById('userPlanFilter');
    if (pf) pf.value = 'PRO';
    currentUserPlanFilter = 'PRO';
    switchTab('tab-users');
  });
  document.getElementById('cardImages')?.addEventListener('click', () => {
    if (jobTypeFilter) jobTypeFilter.value = 'IMAGE';
    switchTab('tab-jobs');
  });
  document.getElementById('cardVideos')?.addEventListener('click', () => {
    if (jobTypeFilter) jobTypeFilter.value = 'VIDEO';
    switchTab('tab-jobs');
  });
  document.getElementById('cardReviewsOverview')?.addEventListener('click', () => switchTab('tab-reviews'));
  document.getElementById('cardRevTop')?.addEventListener('click', () => {
    if (typeof switchReviewSentiment === 'function') switchReviewSentiment('top');
    switchTab('tab-reviews');
  });
  document.getElementById('cardRevBad')?.addEventListener('click', () => {
    if (typeof switchReviewSentiment === 'function') switchReviewSentiment('bad');
    switchTab('tab-reviews');
  });
  document.getElementById('cardRevTotal')?.addEventListener('click', () => {
    if (typeof switchReviewSentiment === 'function') switchReviewSentiment('all');
    switchTab('tab-reviews');
  });
  document.getElementById('cardRevAvg')?.addEventListener('click', () => switchTab('tab-reviews'));
  document.getElementById('cardQueue')?.addEventListener('click', () => switchTab('tab-jobs'));
  document.getElementById('cardSystem')?.addEventListener('click', () => switchTab('tab-system'));

  // ----------------------------------------------------------------------------
  // Overview & 8 Stats Cards
  // ----------------------------------------------------------------------------
  async function loadStats() {
    try {
      const data = await apiFetch('/api/admin/stats');
      if (!data.success) return;

      const s = data.stats;

      // 8 Cards
      document.getElementById('statUsers').innerText = (s.totalUsers || 0).toLocaleString();
      document.getElementById('badgeUserCount').innerText = s.totalUsers || 0;
      document.getElementById('statActiveUsers').innerText = (s.activeUsers || 0).toLocaleString();
      document.getElementById('statNewUsers').innerText = (s.newUsersToday || 0).toLocaleString();
      document.getElementById('statSuccessRate').innerText = `${s.successRatePercent || 100}%`;

      document.getElementById('statImagesToday').innerText = (s.imagesToday || 0).toLocaleString();
      document.getElementById('statImages').innerText = (s.totalImages || 0).toLocaleString();

      document.getElementById('statVideosToday').innerText = (s.videosToday || 0).toLocaleString();
      document.getElementById('statVideos').innerText = (s.totalVideos || 0).toLocaleString();

      document.getElementById('statFreeUsers').innerText = (s.freeUsers || 0).toLocaleString();
      document.getElementById('statProUsers').innerText = `${(s.proUsers || 0) + (s.premiumUsers || 0)} ta`;

      // BullMQ Queue
      if (s.queueStatus) {
        document.getElementById('queueImgWaiting').innerText = s.queueStatus.imageWaiting || 0;
        document.getElementById('queueImgActive').innerText = s.queueStatus.imageActive || 0;
        document.getElementById('queueVidWaiting').innerText = s.queueStatus.videoWaiting || 0;
        document.getElementById('queueVidActive').innerText = s.queueStatus.videoActive || 0;

        document.getElementById('statusDb').innerText = s.queueStatus.databaseConnected ? 'Ulangan (PostgreSQL)' : 'Ulangan (Triple-Storage)';
        document.getElementById('statusRedis').innerText = s.queueStatus.redisConnected ? 'Ulangan (BullMQ)' : 'In-Memory Async Mode';
      }

      // Server Info
      if (s.server) {
        const uptimeHrs = (s.server.uptimeSeconds / 3600).toFixed(1);
        document.getElementById('statusUptime').innerText = `${uptimeHrs} soat`;
        document.getElementById('statusRam').innerText = `${s.server.memoryUsedMB} MB`;
        const sysNode = document.getElementById('sysNode');
        if (sysNode) sysNode.innerText = s.server.nodeVersion;
        const sysCpu = document.getElementById('sysCpu');
        if (sysCpu) sysCpu.innerText = `${s.server.cpuCores} ta yadro`;
      }

      // Also update reviews metrics on Overview
      try {
        const revData = await apiFetch('/api/admin/reviews?limit=1');
        if (revData && revData.ratingStats) {
          const st = revData.ratingStats;
          const statAvgRating = document.getElementById('statAvgRating');
          const statReviewsDesc = document.getElementById('statReviewsDesc');
          const badgeReviewCount = document.getElementById('badgeReviewCount');
          if (statAvgRating) statAvgRating.innerText = `${st.average.toFixed(1)} ⭐`;
          if (statReviewsDesc) statReviewsDesc.innerText = `Jami: ${st.count} ta fikr va izoh`;
          if (badgeReviewCount) badgeReviewCount.innerText = st.count;
        }
      } catch {}

      lastUpdatedText.innerText = `Yangilandi: ${new Date().toLocaleTimeString()}`;
    } catch (e) {
      console.warn('Failed to load stats:', e);
    }
  }

  // ----------------------------------------------------------------------------
  // Helper: Clipboard Copy
  // ----------------------------------------------------------------------------
  window.copyToClipboard = function (text, successMsg = 'Nusxalandi!') {
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(String(text)).then(() => {
        showToast(`📋 ${successMsg}`);
      }).catch(() => {
        fallbackCopyText(String(text), successMsg);
      });
    } else {
      fallbackCopyText(String(text), successMsg);
    }
  };

  function fallbackCopyText(text, successMsg) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      showToast(`📋 ${successMsg}`);
    } catch {
      showToast('Nusxalashda xatolik');
    }
    document.body.removeChild(ta);
  }

  // ----------------------------------------------------------------------------
  // Users Management
  // ----------------------------------------------------------------------------
  let currentUserStatusFilter = 'ALL';
  const userSearchInput = document.getElementById('userSearchInput');
  const userPlanFilter = document.getElementById('userPlanFilter');
  const usersTableBody = document.getElementById('usersTableBody');
  const userTableSummary = document.getElementById('userTableSummary');
  const btnPrevPage = document.getElementById('btnPrevPage');
  const btnNextPage = document.getElementById('btnNextPage');
  const pageIndicator = document.getElementById('pageIndicator');
  const btnRefreshUsers = document.getElementById('btnRefreshUsers');

  // Status Tab Elements & Counters
  const userStatusTabs = document.querySelectorAll('#userStatusTabs .status-tab-btn');
  const userCountAll = document.getElementById('userCountAll');
  const userCountActive = document.getElementById('userCountActive');
  const userCountPro = document.getElementById('userCountPro');
  const userCountInactive = document.getElementById('userCountInactive');

  function switchUserStatusFilter(status) {
    currentUserStatusFilter = status;
    userStatusTabs.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.status === status);
    });
    currentUserPage = 1;
    loadUsers();
  }

  userStatusTabs.forEach((btn) => {
    btn.addEventListener('click', () => {
      switchUserStatusFilter(btn.dataset.status);
    });
  });

  btnRefreshUsers?.addEventListener('click', () => {
    loadUsers();
    showToast('Foydalanuvchilar ro\'yxati yangilandi! 👥');
  });

  let searchTimeout = null;
  userSearchInput?.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      currentUserQuery = e.target.value.trim();
      currentUserPage = 1;
      loadUsers();
    }, 300);
  });

  userPlanFilter?.addEventListener('change', (e) => {
    currentUserPlanFilter = e.target.value;
    currentUserPage = 1;
    loadUsers();
  });

  btnPrevPage?.addEventListener('click', () => {
    if (currentUserPage > 1) {
      currentUserPage--;
      loadUsers();
    }
  });

  btnNextPage?.addEventListener('click', () => {
    currentUserPage++;
    loadUsers();
  });

  function renderUsersHtml(usersList) {
    return usersList.map((u) => {
      const plan = u.subscription?.plan || u.plan || 'FREE';
      const planClass = plan === 'PRO' ? 'plan-pro' : (plan === 'PREMIUM' ? 'plan-business' : '');
      const isBanned = !!u.isBanned;
      const userPayload = encodeURIComponent(JSON.stringify(u));

      const remImg = u.remainingImages !== undefined ? u.remainingImages : '70';
      const remVid = u.remainingVideos !== undefined ? u.remainingVideos : '20';

      const lastAct = u.lastAction || 'Active';
      const timeAgo = u.lastActivityDate ? new Date(u.lastActivityDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
      const initial = (u.firstName || 'U').charAt(0).toUpperCase();

      const tgUsernameHtml = u.username
        ? `<a href="https://t.me/${escapeHtml(u.username)}" target="_blank" class="tg-user-link" onclick="event.stopPropagation()">@${escapeHtml(u.username)} ↗</a>`
        : `<span class="text-muted" style="font-size: 11px;">username yo'q</span>`;

      const statusBadge = isBanned
        ? `<span class="status-pill banned">⛔ Bloklangan</span>`
        : (u.isActiveNow
          ? `<span class="status-pill active" title="Oxirgi 24 soatda faol bo'lgan">🟢 Faol</span>`
          : `<span class="status-pill" style="opacity: 0.75;" title="24 soatdan ortiq vaqt kirmagan">💤 Nofaol</span>`);

      return `
        <tr class="user-table-row clickable-row" onclick="window.openUserDetails('${userPayload}')" title="Batafsil ma'lumotni ko'rish">
          <td>
            <div style="display: flex; align-items: center; gap: 6px;">
              <code class="code-id">${u.telegramId}</code>
              <button class="btn-copy-id" onclick="event.stopPropagation(); window.copyToClipboard('${u.telegramId}', 'ID nusxalandi!')" title="ID nusxalash">📋</button>
            </div>
          </td>
          <td>
            <div class="user-cell">
              <div class="avatar-cell">${escapeHtml(initial)}</div>
              <div>
                <div class="user-name-strong">${escapeHtml(u.firstName || 'Foydalanuvchi')} ${escapeHtml(u.lastName || '')}</div>
                <div class="user-sub">${tgUsernameHtml}</div>
              </div>
            </div>
          </td>
          <td><code>${(u.languageCode || 'uz').toUpperCase()}</code></td>
          <td><span class="status-pill ${planClass}">${plan}</span></td>
          <td>
            <span class="badge-number">${remImg} rasm / ${remVid} vid</span>
          </td>
          <td><strong>${u.totalJobs || 0} ta</strong></td>
          <td>
            <div style="font-size: 13px;">${escapeHtml(lastAct)}</div>
            <div class="input-hint">${timeAgo}</div>
          </td>
          <td>
            ${statusBadge}
          </td>
          <td onclick="event.stopPropagation()">
            <div style="display: flex; gap: 4px;">
              <button class="btn-action-sm" onclick="window.openUserDetails('${userPayload}')" title="Profilni ko'rish">
                👁 Ko'rish
              </button>
              <button class="btn-action-sm" onclick="window.openPlanModal('${u.telegramId}', '${escapeHtml(u.firstName || '')}')" title="Tarifni boshqarish">
                ⭐ Tarif
              </button>
              <button class="btn-action-sm ${isBanned ? 'btn-unban' : 'btn-ban'}" onclick="window.toggleUserBan('${u.telegramId}', ${!isBanned})">
                ${isBanned ? 'Ochish' : 'Bloklash'}
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  async function loadUsers() {
    try {
      usersTableBody.innerHTML = `<tr><td colspan="9" class="text-center py-4">Foydalanuvchilar yuklanmoqda...</td></tr>`;

      const params = new URLSearchParams({
        q: currentUserQuery,
        page: String(currentUserPage),
        limit: '15',
      });
      if (currentUserPlanFilter) params.append('plan', currentUserPlanFilter);
      if (currentUserStatusFilter && currentUserStatusFilter !== 'ALL') {
        params.append('status', currentUserStatusFilter);
      }

      const url = `/api/admin/users?${params.toString()}`;
      const data = await apiFetch(url);

      if (!data.success) return;

      // Update counters
      const totalAll = data.allUsersCount !== undefined ? data.allUsersCount : (data.total || 0);
      if (userCountAll) userCountAll.innerText = totalAll.toLocaleString();
      if (userCountActive) userCountActive.innerText = (data.activeUsersCount || 0).toLocaleString();
      if (userCountPro) userCountPro.innerText = (data.proUsersCount || 0).toLocaleString();
      if (userCountInactive) userCountInactive.innerText = (data.inactiveUsersCount || 0).toLocaleString();

      userTableSummary.innerText = `Ko'rsatilmoqda: ${data.users?.length || 0} ta (Jami ro'yxatdan o'tgan: ${totalAll} ta)`;
      pageIndicator.innerText = `Sahifa ${data.page} / ${data.totalPages || 1}`;
      btnPrevPage.disabled = data.page <= 1;
      btnNextPage.disabled = data.page >= data.totalPages;

      if (!data.users || data.users.length === 0) {
        usersTableBody.innerHTML = `<tr><td colspan="9" class="text-center py-4">Foydalanuvchi topilmadi.</td></tr>`;
        return;
      }

      usersTableBody.innerHTML = renderUsersHtml(data.users);
    } catch (e) {
      console.warn('Failed to load users:', e);
      usersTableBody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-danger">Foydalanuvchilarni yuklashda xatolik yuz berdi</td></tr>`;
    }
  }

  // Global User Actions
  window.toggleUserBan = async function (telegramId, ban) {
    const action = ban ? 'bloklamoqchimisiz' : 'blokdan chiqarmoqchimisiz';
    if (!confirm(`Foydalanuvchini (${telegramId}) ${action}?`)) return;

    try {
      const res = await apiFetch('/api/admin/users/ban', {
        method: 'POST',
        body: JSON.stringify({ telegramId, isBanned: ban }),
      });
      if (res.success) {
        showToast(res.message);
        if (activeUserForDetails && activeUserForDetails.telegramId === telegramId) {
          activeUserForDetails.isBanned = ban;
          window.openUserDetails(activeUserForDetails);
        }
        loadUsers();
      } else {
        alert('Xatolik: ' + res.message);
      }
    } catch {
      alert('Tarmoq xatosi');
    }
  };

  // User Details Modal
  const userDetailsModal = document.getElementById('userDetailsModal');
  const udId = document.getElementById('udId');
  const udUsername = document.getElementById('udUsername');
  const udFullName = document.getElementById('udFullName');
  const udLang = document.getElementById('udLang');
  const udPlan = document.getElementById('udPlan');
  const udStatus = document.getElementById('udStatus');
  const udDailyImages = document.getElementById('udDailyImages');
  const udDailyVideos = document.getElementById('udDailyVideos');
  const udJobs = document.getElementById('udJobs');
  const udCustomBg = document.getElementById('udCustomBg');
  const udLastAction = document.getElementById('udLastAction');
  const udLastActive = document.getElementById('udLastActive');
  const udDate = document.getElementById('udDate');

  const udBtnPlan = document.getElementById('udBtnPlan');
  const udBtnResetUsage = document.getElementById('udBtnResetUsage');
  const udBtnBan = document.getElementById('udBtnBan');
  const udBtnClose = document.getElementById('udBtnClose');

  window.openUserDetails = async function (userPayload) {
    try {
      let u = typeof userPayload === 'string' ? JSON.parse(decodeURIComponent(userPayload)) : userPayload;
      if (!u) return;

      // Fetch latest detail from server
      try {
        const detailRes = await apiFetch(`/api/admin/users/detail?id=${u.telegramId}`);
        if (detailRes && detailRes.user) {
          u = detailRes.user;
        }
      } catch {}

      activeUserForDetails = u;

      udId.innerText = u.telegramId;
      udUsername.innerText = u.username ? `@${u.username}` : 'Mavjud emas';
      udFullName.innerText = `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Foydalanuvchi';
      udLang.innerText = (u.languageCode || 'uz').toUpperCase();

      const plan = u.subscription?.plan || u.plan || 'FREE';
      udPlan.innerText = plan;
      udPlan.className = `status-pill ${plan === 'PRO' ? 'plan-pro' : (plan === 'PREMIUM' ? 'plan-business' : '')}`;

      const isBanned = !!u.isBanned;
      udStatus.innerText = isBanned ? 'Bloklangan' : 'Faol';
      udStatus.className = `status-pill ${isBanned ? 'banned' : 'active'}`;

      const daily = u.dailyUsage || { images: 0, videos: 0 };
      udDailyImages.innerText = `${daily.images || 0} ta ishlatildi`;
      udDailyVideos.innerText = `${daily.videos || 0} ta ishlatildi`;
      udJobs.innerText = `${u.totalJobs || 0} ta (Jami: ${u.totalImages || 0} rasm, ${u.totalVideos || 0} video)`;
      udCustomBg.innerText = u.customBackground ? 'O\'rnatilgan ✅' : 'Yo\'q';
      udLastAction.innerText = u.lastAction || 'Active';
      udLastActive.innerText = u.lastActivityDate ? new Date(u.lastActivityDate).toLocaleString() : 'Hozirgina';
      udDate.innerText = u.createdAt ? new Date(u.createdAt).toLocaleString() : 'Noma\'lum';

      udBtnBan.innerText = isBanned ? '✅ Blokdan Chiqarish' : '⛔ Bloklash';
      udBtnBan.className = `btn-secondary ${isBanned ? 'btn-unban' : 'btn-ban'}`;

      userDetailsModal.style.display = 'flex';
    } catch (err) {
      console.error('Error opening user details:', err);
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

  udBtnResetUsage?.addEventListener('click', async () => {
    if (!activeUserForDetails) return;
    if (!confirm(`Foydalanuvchi (${activeUserForDetails.telegramId}) kunlik limitlarini qayta tiklamoqchimisiz?`)) return;

    try {
      const res = await apiFetch('/api/admin/users/reset-usage', {
        method: 'POST',
        body: JSON.stringify({ telegramId: activeUserForDetails.telegramId }),
      });
      if (res.success) {
        showToast('Kunlik limitlar 0 ga tiklandi! ✅');
        window.openUserDetails(activeUserForDetails);
        loadUsers();
      } else {
        alert(res.message || 'Xatolik');
      }
    } catch {
      alert('Tarmoq xatosi');
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
  const btnCancelPlanModal = document.getElementById('btnCancelPlanModal');
  const btnSavePlanModal = document.getElementById('btnSavePlanModal');

  window.openPlanModal = function (telegramId, name) {
    selectedTelegramIdForPlan = telegramId;
    planModalUserText.innerText = `Foydalanuvchi: ${name} (ID: ${telegramId})`;
    planModal.style.display = 'flex';
  };

  btnCancelPlanModal?.addEventListener('click', () => {
    planModal.style.display = 'none';
  });

  btnSavePlanModal?.addEventListener('click', async () => {
    if (!selectedTelegramIdForPlan) return;
    const plan = modalPlanSelect.value;

    try {
      const res = await apiFetch('/api/admin/users/plan', {
        method: 'POST',
        body: JSON.stringify({ telegramId: selectedTelegramIdForPlan, plan }),
      });
      if (res.success) {
        showToast(`Foydalanuvchi ${selectedTelegramIdForPlan} tarifi ${plan} ga yangilandi! ⭐`);
        planModal.style.display = 'none';
        loadUsers();
        loadStats();
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
  let broadcastType = 'text';
  const broadcastMessage = document.getElementById('broadcastMessage');
  const broadcastMediaUrl = document.getElementById('broadcastMediaUrl');
  const mediaUrlGroup = document.getElementById('mediaUrlGroup');
  const mediaUrlLabel = document.getElementById('mediaUrlLabel');
  const broadcastBtnText = document.getElementById('broadcastBtnText');
  const broadcastBtnUrl = document.getElementById('broadcastBtnUrl');
  const typeBtnText = document.getElementById('typeBtnText');
  const typeBtnPhoto = document.getElementById('typeBtnPhoto');
  const typeBtnVideo = document.getElementById('typeBtnVideo');

  const previewText = document.getElementById('previewText');
  const previewMediaWrapper = document.getElementById('previewMediaWrapper');
  const previewImage = document.getElementById('previewImage');
  const previewVideo = document.getElementById('previewVideo');
  const previewButtonContainer = document.getElementById('previewButtonContainer');
  const previewButtonLink = document.getElementById('previewButtonLink');

  function updateBroadcastPreview() {
    const txt = broadcastMessage.value.trim();
    previewText.innerHTML = txt
      ? txt.replace(/\n/g, '<br>')
      : 'Xabar matni bu yerda ko\'rinadi...';

    const url = broadcastMediaUrl.value.trim();
    if (broadcastType === 'photo' && url) {
      previewMediaWrapper.style.display = 'block';
      previewImage.style.display = 'block';
      previewImage.src = url;
      previewVideo.style.display = 'none';
    } else if (broadcastType === 'video' && url) {
      previewMediaWrapper.style.display = 'block';
      previewVideo.style.display = 'block';
      previewVideo.src = url;
      previewImage.style.display = 'none';
    } else {
      previewMediaWrapper.style.display = 'none';
      previewImage.style.display = 'none';
      previewVideo.style.display = 'none';
    }

    const bText = broadcastBtnText.value.trim();
    const bUrl = broadcastBtnUrl.value.trim();
    if (bText && bUrl) {
      previewButtonContainer.style.display = 'block';
      previewButtonLink.innerText = bText;
      previewButtonLink.href = bUrl;
    } else {
      previewButtonContainer.style.display = 'none';
    }
  }

  [broadcastMessage, broadcastMediaUrl, broadcastBtnText, broadcastBtnUrl].forEach((el) => {
    el?.addEventListener('input', updateBroadcastPreview);
  });

  typeBtnText?.addEventListener('click', () => {
    broadcastType = 'text';
    typeBtnText.classList.add('active');
    typeBtnPhoto.classList.remove('active');
    typeBtnVideo.classList.remove('active');
    mediaUrlGroup.style.display = 'none';
    updateBroadcastPreview();
  });

  typeBtnPhoto?.addEventListener('click', () => {
    broadcastType = 'photo';
    typeBtnPhoto.classList.add('active');
    typeBtnText.classList.remove('active');
    typeBtnVideo.classList.remove('active');
    mediaUrlGroup.style.display = 'block';
    mediaUrlLabel.innerText = 'Rasm Havolasi (URL):';
    broadcastMediaUrl.placeholder = 'https://example.com/rasm.jpg';
    updateBroadcastPreview();
  });

  typeBtnVideo?.addEventListener('click', () => {
    broadcastType = 'video';
    typeBtnVideo.classList.add('active');
    typeBtnText.classList.remove('active');
    typeBtnPhoto.classList.remove('active');
    mediaUrlGroup.style.display = 'block';
    mediaUrlLabel.innerText = 'Video Havolasi (URL):';
    broadcastMediaUrl.placeholder = 'https://example.com/video.mp4';
    updateBroadcastPreview();
  });

  const btnSendBroadcast = document.getElementById('btnSendBroadcast');
  const broadcastProgress = document.getElementById('broadcastProgress');
  const broadcastProgressBar = document.getElementById('broadcastProgressBar');
  const broadcastProgressText = document.getElementById('broadcastProgressText');

  btnSendBroadcast?.addEventListener('click', async () => {
    const text = broadcastMessage.value.trim();
    const mediaUrl = broadcastMediaUrl.value.trim();
    const buttonText = broadcastBtnText.value.trim();
    const buttonUrl = broadcastBtnUrl.value.trim();

    if (!text && !mediaUrl) {
      alert('Iltimos, xabar matni yoki media havolasini kiriting!');
      return;
    }

    if (!confirm('Haqiqatan ham ushbu xabarni botdagi BARCHA foydalanuvchilarga yubormoqchimisiz?')) return;

    btnSendBroadcast.disabled = true;
    broadcastProgress.style.display = 'block';
    broadcastProgressBar.style.width = '30%';
    broadcastProgressText.innerText = 'Xabar yuborilmoqda...';

    try {
      const res = await apiFetch('/api/admin/broadcast', {
        method: 'POST',
        body: JSON.stringify({
          text,
          mediaType: broadcastType,
          mediaUrl,
          buttonText,
          buttonUrl,
        }),
      });

      broadcastProgressBar.style.width = '100%';
      if (res.success) {
        broadcastProgressText.innerText = `Yetkazildi: ${res.result.sent} ta foydalanuvchiga muvaffaqiyatli!`;
        showToast(`✅ Xabar ${res.result.sent} ta foydalanuvchiga yetkazildi!`);
        broadcastMessage.value = '';
        broadcastMediaUrl.value = '';
        broadcastBtnText.value = '';
        broadcastBtnUrl.value = '';
        updateBroadcastPreview();
      } else {
        broadcastProgressText.innerText = 'Xatolik yuz berdi.';
      }
    } catch {
      broadcastProgressText.innerText = 'Tarmoq xatosi.';
    } finally {
      btnSendBroadcast.disabled = false;
      setTimeout(() => {
        broadcastProgress.style.display = 'none';
      }, 5000);
    }
  });

  // ----------------------------------------------------------------------------
  // Jobs Queue Tab (Persistent History with Caching, Filters, and Pagination)
  // ----------------------------------------------------------------------------
  const jobsTableBody = document.getElementById('jobsTableBody');
  const jobSearchInput = document.getElementById('jobSearchInput');
  const jobTypeFilter = document.getElementById('jobTypeFilter');
  const jobStatusFilter = document.getElementById('jobStatusFilter');
  const btnRefreshJobs = document.getElementById('btnRefreshJobs');
  const jobTableSummary = document.getElementById('jobTableSummary');
  const btnPrevJobPage = document.getElementById('btnPrevJobPage');
  const btnNextJobPage = document.getElementById('btnNextJobPage');
  const jobPageIndicator = document.getElementById('jobPageIndicator');

  // Job Detail Modal Elements
  const jobDetailModal = document.getElementById('jobDetailModal');
  const jdId = document.getElementById('jdId');
  const jdUser = document.getElementById('jdUser');
  const jdTgId = document.getElementById('jdTgId');
  const jdType = document.getElementById('jdType');
  const jdAction = document.getElementById('jdAction');
  const jdResolution = document.getElementById('jdResolution');
  const jdStatus = document.getElementById('jdStatus');
  const jdDuration = document.getElementById('jdDuration');
  const jdDate = document.getElementById('jdDate');
  const jdBtnTg = document.getElementById('jdBtnTg');
  const jdBtnClose = document.getElementById('jdBtnClose');

  let currentJobPage = 1;
  let totalJobPages = 1;
  let jobQueryDebounce = null;

  function renderJobsList(jobs) {
    if (!jobs || jobs.length === 0) {
      jobsTableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4">Hozircha mos keluvchi ishlar topilmadi.</td></tr>`;
      return;
    }

    jobsTableBody.innerHTML = jobs.map((j) => {
      const u = j.user;
      const isImg = j.type === 'IMAGE';
      const statusClass = j.status === 'COMPLETED' ? 'active' : (j.status === 'FAILED' ? 'banned' : 'plan-business');
      const statusText = j.status === 'COMPLETED' ? '✅ Yakunlandi' : (j.status === 'FAILED' ? '❌ Xato' : '⏳ Jarayonda...');
      const duration = j.processingTime ? `${j.processingTime.toFixed(1)}s` : '-';
      const date = j.createdAt ? new Date(j.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '-';
      const res = j.outputResolution || (j.inputResolution ? `${j.inputResolution} ➔ ${j.scale}x` : `${j.scale}x HD`);
      const taskTitle = isImg ? `🖼️ Rasm ${j.scale || 4}x HD Tiniqlashtirish` : `🎬 Video ${j.scale || 4}x Render`;

      const userName = u ? (`${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username || 'Foydalanuvchi') : (j.telegramId ? `ID: ${j.telegramId}` : 'Noma\'lum');
      const userSub = u?.username
        ? `<a href="https://t.me/${escapeHtml(u.username)}" target="_blank" class="tg-user-link" onclick="event.stopPropagation()">@${escapeHtml(u.username)} ↗</a>`
        : (j.telegramId ? `<code class="code-id">${j.telegramId}</code>` : '');

      const jobPayload = encodeURIComponent(JSON.stringify(j));

      return `
        <tr class="clickable-row" onclick="window.openJobDetails('${jobPayload}')" title="Batafsil ma'lumotni ko'rish">
          <td>
            <div style="display: flex; align-items: center; gap: 4px;">
              <code class="code-id">${j.id.slice(0, 10)}</code>
              <button class="btn-copy-id" onclick="event.stopPropagation(); window.copyToClipboard('${j.id}', 'Ish ID nusxalandi!')" title="Ish ID nusxalash">📋</button>
            </div>
          </td>
          <td>
            <div class="user-cell">
              <div class="avatar-cell">${escapeHtml(userName.charAt(0).toUpperCase())}</div>
              <div>
                <div class="user-name-strong">${escapeHtml(userName)}</div>
                <div class="user-sub">${userSub}</div>
              </div>
            </div>
          </td>
          <td>
            <span class="badge-job-task badge-${j.type.toLowerCase()}">${taskTitle}</span>
          </td>
          <td><span class="badge-res-tag">${res}</span></td>
          <td><span class="status-pill ${statusClass}">${statusText}</span></td>
          <td><strong>${duration}</strong></td>
          <td><span class="text-muted" style="font-size: 12px;">${date}</span></td>
        </tr>
      `;
    }).join('');
  }

  window.openJobDetails = function (jobPayload) {
    try {
      const j = typeof jobPayload === 'string' ? JSON.parse(decodeURIComponent(jobPayload)) : jobPayload;
      if (!j) return;

      const u = j.user;
      const userName = u ? (`${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username || 'Foydalanuvchi') : 'Noma\'lum';
      const tgId = j.telegramId || (u ? u.telegramId : '—');

      if (jdId) jdId.innerText = j.id;
      if (jdUser) jdUser.innerText = userName;
      if (jdTgId) jdTgId.innerText = tgId;
      if (jdType) jdType.innerText = j.type === 'IMAGE' ? '🖼️ Rasm (IMAGE)' : '🎬 Video (VIDEO)';
      if (jdAction) jdAction.innerText = `${j.scale || 4}x kattalashtirish va tiniqlashtirish`;
      if (jdResolution) jdResolution.innerText = j.outputResolution || (j.inputResolution ? `${j.inputResolution} ➔ ${j.scale}x` : `${j.scale}x HD`);

      if (jdStatus) {
        jdStatus.innerText = j.status;
        jdStatus.className = `status-pill ${j.status === 'COMPLETED' ? 'active' : (j.status === 'FAILED' ? 'banned' : 'plan-business')}`;
      }

      if (jdDuration) jdDuration.innerText = j.processingTime ? `${j.processingTime.toFixed(2)} sekund` : 'Hisoblanmagan';
      if (jdDate) jdDate.innerText = j.createdAt ? new Date(j.createdAt).toLocaleString('uz-UZ') : '—';

      if (jdBtnTg) {
        if (u?.username) {
          jdBtnTg.href = `https://t.me/${u.username}`;
          jdBtnTg.style.display = 'inline-flex';
        } else if (tgId && tgId !== '—') {
          jdBtnTg.href = `tg://openmessage?user_id=${tgId}`;
          jdBtnTg.style.display = 'inline-flex';
        } else {
          jdBtnTg.style.display = 'none';
        }
      }

      if (jobDetailModal) jobDetailModal.style.display = 'flex';
    } catch (e) {
      console.error('Failed to open job details:', e);
    }
  };

  jdBtnClose?.addEventListener('click', () => {
    if (jobDetailModal) jobDetailModal.style.display = 'none';
  });

  btnRefreshJobs?.addEventListener('click', () => {
    loadJobs(currentJobPage);
    showToast('Ishlar navbati yangilandi! ⚡');
  });

  // Load from LocalStorage cache immediately for zero-flicker experience
  try {
    const cachedJobs = JSON.parse(localStorage.getItem('cached_admin_jobs') || '[]');
    if (cachedJobs && cachedJobs.length > 0) {
      renderJobsList(cachedJobs);
      if (jobTableSummary) jobTableSummary.innerText = `Ko'rsatilmoqda: ${cachedJobs.length} ta (Kesh)`;
    }
  } catch {}

  async function loadJobs(page = 1) {
    currentJobPage = page;
    const q = jobSearchInput ? jobSearchInput.value.trim() : '';
    const type = jobTypeFilter ? jobTypeFilter.value : '';
    const status = jobStatusFilter ? jobStatusFilter.value : '';

    try {
      const url = `/api/admin/jobs?q=${encodeURIComponent(q)}&type=${encodeURIComponent(type)}&status=${encodeURIComponent(status)}&page=${page}&limit=20`;
      const data = await apiFetch(url);

      if (!data.success) return;

      const jobs = data.jobs || [];
      totalJobPages = data.totalPages || 1;

      // Persist latest jobs to client cache
      if (page === 1 && !q && !type && !status) {
        try {
          localStorage.setItem('cached_admin_jobs', JSON.stringify(jobs.slice(0, 25)));
        } catch {}
      }

      renderJobsList(jobs);

      if (jobTableSummary) {
        jobTableSummary.innerText = `Ko'rsatilmoqda: ${jobs.length} ta (Jami: ${data.total || 0} ta)`;
      }

      if (jobPageIndicator) {
        jobPageIndicator.innerText = `Sahifa ${currentJobPage} / ${totalJobPages}`;
      }

      if (btnPrevJobPage) btnPrevJobPage.disabled = currentJobPage <= 1;
      if (btnNextJobPage) btnNextJobPage.disabled = currentJobPage >= totalJobPages;
    } catch (e) {
      console.warn('Failed to load jobs:', e);
    }
  }

  jobSearchInput?.addEventListener('input', () => {
    clearTimeout(jobQueryDebounce);
    jobQueryDebounce = setTimeout(() => {
      loadJobs(1);
    }, 250);
  });

  jobTypeFilter?.addEventListener('change', () => loadJobs(1));
  jobStatusFilter?.addEventListener('change', () => loadJobs(1));

  btnPrevJobPage?.addEventListener('click', () => {
    if (currentJobPage > 1) loadJobs(currentJobPage - 1);
  });

  btnNextJobPage?.addEventListener('click', () => {
    if (currentJobPage < totalJobPages) loadJobs(currentJobPage + 1);
  });

  // ----------------------------------------------------------------------------
  // Topbar Refresh Button Action
  // ----------------------------------------------------------------------------
  refreshBtn?.addEventListener('click', async () => {
    refreshSvg?.classList.add('spin-anim');
    if (refreshBtnText) refreshBtnText.innerText = 'Yangilanmoqda...';

    await Promise.all([loadStats(), loadUsers(), loadJobs()]);

    setTimeout(() => {
      refreshSvg?.classList.remove('spin-anim');
      if (refreshBtnText) refreshBtnText.innerText = 'Yangilash';
      showToast('✅ Barcha ko\'rsatkichlar yangilandi!');
    }, 400);
  });

  // ----------------------------------------------------------------------------
  // Reviews & Ratings Management (Permanent Retention & Sentiment Categorization)
  // ----------------------------------------------------------------------------
  const reviewSearchInput = document.getElementById('reviewSearchInput');
  const reviewRatingFilter = document.getElementById('reviewRatingFilter');
  const reviewsTableBody = document.getElementById('reviewsTableBody');
  const btnRefreshReviews = document.getElementById('btnRefreshReviews');
  const btnPrevReviewPage = document.getElementById('btnPrevReviewPage');
  const btnNextReviewPage = document.getElementById('btnNextReviewPage');
  const reviewPageIndicator = document.getElementById('reviewPageIndicator');
  const reviewTableSummary = document.getElementById('reviewTableSummary');

  // Sentiment Segmented Tab Elements
  const reviewSentimentTabs = document.querySelectorAll('#reviewSentimentTabs .sentiment-tab-btn');
  const revPillAll = document.getElementById('revPillAll');
  const revPillTop = document.getElementById('revPillTop');
  const revPillBad = document.getElementById('revPillBad');

  // Header Stat Card Elements
  const reviewsTabAvgRating = document.getElementById('reviewsTabAvgRating');
  const reviewsTabStars = document.getElementById('reviewsTabStars');
  const reviewsTabTotalCount = document.getElementById('reviewsTabTotalCount');
  const reviewsTabTopCount = document.getElementById('reviewsTabTopCount');
  const reviewsTabBadCount = document.getElementById('reviewsTabBadCount');

  // Review Detail Modal Elements
  const reviewDetailModal = document.getElementById('reviewDetailModal');
  const rdFullName = document.getElementById('rdFullName');
  const rdId = document.getElementById('rdId');
  const rdUsername = document.getElementById('rdUsername');
  const rdStars = document.getElementById('rdStars');
  const rdSentimentBadge = document.getElementById('rdSentimentBadge');
  const rdTime = document.getElementById('rdTime');
  const rdCommentText = document.getElementById('rdCommentText');
  const rdBtnTgLink = document.getElementById('rdBtnTgLink');
  const rdBtnDelete = document.getElementById('rdBtnDelete');
  const rdBtnClose = document.getElementById('rdBtnClose');

  let currentReviewPage = 1;
  let currentReviewQuery = '';
  let currentReviewSentiment = 'all'; // 'all' | 'top' | 'bad'
  let currentReviewRatingFilter = '0';
  let reviewSearchTimeout = null;
  let activeReviewForModal = null;

  window.switchReviewSentiment = function (sentiment) {
    currentReviewSentiment = sentiment;
    reviewSentimentTabs.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.sentiment === sentiment);
    });
    currentReviewPage = 1;
    loadReviews();
  };

  reviewSentimentTabs.forEach((btn) => {
    btn.addEventListener('click', () => {
      window.switchReviewSentiment(btn.dataset.sentiment);
    });
  });

  reviewSearchInput?.addEventListener('input', (e) => {
    clearTimeout(reviewSearchTimeout);
    reviewSearchTimeout = setTimeout(() => {
      currentReviewQuery = e.target.value.trim();
      currentReviewPage = 1;
      loadReviews();
    }, 300);
  });

  reviewRatingFilter?.addEventListener('change', (e) => {
    currentReviewRatingFilter = e.target.value;
    currentReviewPage = 1;
    loadReviews();
  });

  btnRefreshReviews?.addEventListener('click', () => {
    loadReviews();
    showToast('Fikrlar va baholar yangilandi! ⭐️');
  });

  btnPrevReviewPage?.addEventListener('click', () => {
    if (currentReviewPage > 1) {
      currentReviewPage--;
      loadReviews();
    }
  });

  btnNextReviewPage?.addEventListener('click', () => {
    currentReviewPage++;
    loadReviews();
  });

  window.openReviewDetails = function (revPayload) {
    try {
      const rev = typeof revPayload === 'string' ? JSON.parse(decodeURIComponent(revPayload)) : revPayload;
      if (!rev) return;
      activeReviewForModal = rev;

      const u = rev.user;
      const fullName = u ? (`${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username || 'Foydalanuvchi') : 'Foydalanuvchi';
      const tgId = rev.telegramId || (u ? u.telegramId : '—');
      const isTop = rev.rating >= 4;

      if (rdFullName) rdFullName.innerText = fullName;
      if (rdId) rdId.innerText = tgId;
      if (rdUsername) rdUsername.innerText = u?.username ? `@${u.username}` : 'username yo\'q';
      if (rdStars) rdStars.innerText = '★'.repeat(rev.rating) + '☆'.repeat(5 - rev.rating) + ` (${rev.rating} / 5)`;
      if (rdSentimentBadge) {
        rdSentimentBadge.innerText = isTop ? '🌟 Top / Ijobiy Sharh' : '⚠️ E\'tiroz / Shikoyat';
        rdSentimentBadge.className = `status-pill ${isTop ? 'badge-sentiment-top' : 'badge-sentiment-bad'}`;
      }
      if (rdTime) rdTime.innerText = rev.createdAt ? new Date(rev.createdAt).toLocaleString('uz-UZ') : '—';
      if (rdCommentText) {
        rdCommentText.innerText = rev.comment ? `"${rev.comment}"` : `Foydalanuvchi faqat ${rev.rating} yulduzli baho qo'ygan, matnli izoh yozmagan.`;
      }

      if (rdBtnTgLink) {
        if (u?.username) {
          rdBtnTgLink.href = `https://t.me/${u.username}`;
          rdBtnTgLink.style.display = 'inline-flex';
        } else if (tgId && tgId !== '—') {
          rdBtnTgLink.href = `tg://openmessage?user_id=${tgId}`;
          rdBtnTgLink.style.display = 'inline-flex';
        } else {
          rdBtnTgLink.style.display = 'none';
        }
      }

      if (reviewDetailModal) reviewDetailModal.style.display = 'flex';
    } catch (e) {
      console.error('Error opening review details:', e);
    }
  };

  rdBtnClose?.addEventListener('click', () => {
    if (reviewDetailModal) reviewDetailModal.style.display = 'none';
  });

  rdBtnDelete?.addEventListener('click', async () => {
    if (!activeReviewForModal) return;
    if (!confirm('Haqiqatan ham bu sharhni o\'chirmoqchimisiz?')) return;
    try {
      const delRes = await apiFetch(`/api/admin/reviews/${activeReviewForModal.id}`, { method: 'DELETE' });
      if (delRes && delRes.success) {
        showToast('Sharh muvaffaqiyatli o\'chirildi!');
        if (reviewDetailModal) reviewDetailModal.style.display = 'none';
        loadReviews();
      } else {
        alert(delRes?.error || "O'chirishda xatolik yuz berdi");
      }
    } catch {
      alert("O'chirishda xatolik yuz berdi");
    }
  });

  async function loadReviews() {
    if (!reviewsTableBody) return;
    reviewsTableBody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">Sharhlar yuklanmoqda...</td></tr>`;

    try {
      const q = encodeURIComponent(currentReviewQuery);
      let r = '';
      if (currentReviewSentiment === 'top') {
        r = 'top';
      } else if (currentReviewSentiment === 'bad') {
        r = 'bad';
      } else if (currentReviewRatingFilter && currentReviewRatingFilter !== '0') {
        r = currentReviewRatingFilter;
      }

      const data = await apiFetch(`/api/admin/reviews?page=${currentReviewPage}&limit=15&q=${q}&rating=${r}`);

      if (!data || !data.success) {
        reviewsTableBody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-danger">Fikrlarni yuklashda xatolik yuz berdi</td></tr>`;
        return;
      }

      // Update Header Stats Cards & Segmented Pills
      const stats = data.ratingStats || { average: 5.0, count: 0, topCount: 0, badCount: 0, breakdown: {} };
      const avg = Number(stats.average || 5).toFixed(1);
      const totalCount = Number(stats.count || 0);
      const topCount = Number(stats.topCount !== undefined ? stats.topCount : (stats.breakdown ? ((stats.breakdown[5] || 0) + (stats.breakdown[4] || 0)) : 0));
      const badCount = Number(stats.badCount !== undefined ? stats.badCount : (stats.breakdown ? ((stats.breakdown[1] || 0) + (stats.breakdown[2] || 0) + (stats.breakdown[3] || 0)) : 0));

      if (reviewsTabAvgRating) reviewsTabAvgRating.innerText = avg;
      if (reviewsTabStars) reviewsTabStars.innerText = '⭐️'.repeat(Math.min(5, Math.max(1, Math.round(stats.average || 5))));
      if (reviewsTabTotalCount) reviewsTabTotalCount.innerText = totalCount.toLocaleString();
      if (reviewsTabTopCount) reviewsTabTopCount.innerText = topCount.toLocaleString();
      if (reviewsTabBadCount) reviewsTabBadCount.innerText = badCount.toLocaleString();

      if (revPillAll) revPillAll.innerText = totalCount.toLocaleString();
      if (revPillTop) revPillTop.innerText = topCount.toLocaleString();
      if (revPillBad) revPillBad.innerText = badCount.toLocaleString();

      // Update Overview stats card too
      const statAvgRating = document.getElementById('statAvgRating');
      const statReviewsDesc = document.getElementById('statReviewsDesc');
      const badgeReviewCount = document.getElementById('badgeReviewCount');
      if (statAvgRating) statAvgRating.innerText = `${avg} ⭐`;
      if (statReviewsDesc) statReviewsDesc.innerText = `Jami: ${totalCount} ta fikr (${topCount} top, ${badCount} e'tiroz)`;
      if (badgeReviewCount) badgeReviewCount.innerText = totalCount;

      if (reviewTableSummary) {
        reviewTableSummary.innerText = `Ko'rsatilmoqda: ${data.reviews?.length || 0} ta (Jami: ${data.total || totalCount} ta)`;
      }

      if (!data.reviews || data.reviews.length === 0) {
        reviewsTableBody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">Hozircha hech qanday fikr topilmadi</td></tr>`;
        if (reviewPageIndicator) reviewPageIndicator.innerText = `Sahifa 1 / 1`;
        if (btnPrevReviewPage) btnPrevReviewPage.disabled = true;
        if (btnNextReviewPage) btnNextReviewPage.disabled = true;
        return;
      }

      reviewsTableBody.innerHTML = data.reviews.map((rev) => {
        const u = rev.user;
        const name = u ? (`${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username || 'Foydalanuvchi') : 'Foydalanuvchi';
        const initial = name.charAt(0).toUpperCase();
        const tgLink = u?.username
          ? `<a href="https://t.me/${escapeHtml(u.username)}" target="_blank" class="tg-user-link" onclick="event.stopPropagation()">@${escapeHtml(u.username)} ↗</a>`
          : `<span class="text-muted" style="font-size: 11px;">username yo'q</span>`;

        const isTop = rev.rating >= 4;
        const stars = '★'.repeat(rev.rating) + '☆'.repeat(5 - rev.rating);
        const sentimentBadge = isTop
          ? `<span class="status-pill badge-sentiment-top">🌟 Top (${rev.rating}★)</span>`
          : `<span class="status-pill badge-sentiment-bad">⚠️ E'tiroz (${rev.rating}★)</span>`;

        const commentHtml = rev.comment
          ? `<blockquote class="review-modal-quote" style="margin: 0; padding: 8px 12px; font-size: 13px; max-height: 80px; overflow-y: auto;">"${escapeHtml(rev.comment)}"</blockquote>`
          : `<span class="text-muted" style="font-style: italic; font-size: 12px;">Faqat ${rev.rating}★ baho qoldirilgan</span>`;

        const time = rev.createdAt ? new Date(rev.createdAt).toLocaleString('uz-UZ', { dateStyle: 'short', timeStyle: 'short' }) : '—';
        const revPayload = encodeURIComponent(JSON.stringify(rev));

        const directTgBtn = u?.username
          ? `<a href="https://t.me/${escapeHtml(u.username)}" target="_blank" class="btn-action-sm" onclick="event.stopPropagation()" title="Telegramda yozish">💬 TG</a>`
          : (rev.telegramId ? `<a href="tg://openmessage?user_id=${rev.telegramId}" target="_blank" class="btn-action-sm" onclick="event.stopPropagation()" title="Telegramda yozish">💬 TG</a>` : '');

        return `
          <tr class="clickable-row" onclick="window.openReviewDetails('${revPayload}')" title="Batafsil ma'lumotni ko'rish">
            <td>
              <div class="user-cell">
                <div class="avatar-cell">${escapeHtml(initial)}</div>
                <div>
                  <div class="user-name-strong">${escapeHtml(name)}</div>
                  <div class="user-sub">${tgLink}</div>
                </div>
              </div>
            </td>
            <td>
              <div style="display: flex; align-items: center; gap: 4px;">
                <code class="code-id">${escapeHtml(rev.telegramId)}</code>
                <button class="btn-copy-id" onclick="event.stopPropagation(); window.copyToClipboard('${rev.telegramId}', 'ID nusxalandi!')" title="ID nusxalash">📋</button>
              </div>
            </td>
            <td>
              <div style="display: flex; flex-direction: column; gap: 4px;">
                <span style="color: ${isTop ? '#facc15' : '#f87171'}; font-size: 15px; font-weight: 700; letter-spacing: 1px;">${stars}</span>
                ${sentimentBadge}
              </div>
            </td>
            <td>${commentHtml}</td>
            <td><span class="text-muted" style="font-size: 12px;">${time}</span></td>
            <td style="text-align: right;" onclick="event.stopPropagation()">
              <div style="display: flex; justify-content: flex-end; gap: 4px;">
                ${directTgBtn}
                <button class="btn-action-sm btn-danger btn-delete-review" data-id="${rev.id}" title="Izohni o'chirish">
                  🗑
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');

      // Wire row delete buttons
      document.querySelectorAll('.btn-delete-review').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const revId = btn.dataset.id;
          if (!confirm("Haqiqatan ham bu sharhni o'chirmoqchimisiz?")) return;
          try {
            const delRes = await apiFetch(`/api/admin/reviews/${revId}`, { method: 'DELETE' });
            if (delRes && delRes.success) {
              showToast("Sharh muvaffaqiyatli o'chirildi!");
              loadReviews();
            } else {
              alert(delRes?.error || "O'chirishda xatolik yuz berdi");
            }
          } catch {
            alert("O'chirishda xatolik yuz berdi");
          }
        });
      });

      // Pagination
      if (reviewPageIndicator) reviewPageIndicator.innerText = `Sahifa ${data.page} / ${data.totalPages || 1}`;
      if (btnPrevReviewPage) btnPrevReviewPage.disabled = data.page <= 1;
      if (btnNextReviewPage) btnNextReviewPage.disabled = data.page >= data.totalPages;

    } catch (err) {
      console.error('Error loading reviews:', err);
      reviewsTableBody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-danger">Sharhlarni yuklashda xatolik yuz berdi</td></tr>`;
    }
  }

  // ----------------------------------------------------------------------------
  // Ambient Relaxing Piano Engine (Rich Harmonic Acoustic Emulation)
  // ----------------------------------------------------------------------------
  let audioCtx = null;
  let masterGainNode = null;
  let isMusicPlaying = false;
  let ambientPianoTimeout = null;
  let pianoPhraseStep = 0;

  const musicToggleBtn = document.getElementById('musicToggleBtn');
  const musicIcon = document.getElementById('musicIcon');
  const musicLabel = document.getElementById('musicLabel');
  const musicWave = document.getElementById('musicWave');
  const musicVolumeSlider = document.getElementById('musicVolumeSlider');

  // Load saved volume
  const savedVol = parseFloat(localStorage.getItem('ai_admin_music_vol') || '0.6');
  if (musicVolumeSlider) musicVolumeSlider.value = savedVol;

  musicVolumeSlider?.addEventListener('input', (e) => {
    const vol = parseFloat(e.target.value);
    localStorage.setItem('ai_admin_music_vol', String(vol));
    if (masterGainNode && audioCtx) {
      masterGainNode.gain.setValueAtTime(vol, audioCtx.currentTime);
    }
  });

  // Warm Studio Ambient Piano Chords
  // Voicings designed with rich open harmonies and relaxing emotional resonance
  const ambientChords = [
    // 1. Cmaj9 (Peaceful, spacious)
    {
      bass: [65.41, 98.00], // C2, G2
      notes: [164.81, 196.00, 246.94, 293.66, 329.63, 392.00], // E3, G3, B3, D4, E4, G4
      duration: 4.8,
    },
    // 2. Am9 (Warm, nostalgic, deep)
    {
      bass: [55.00, 82.41], // A1, E2
      notes: [130.81, 164.81, 196.00, 246.94, 261.63, 329.63], // C3, E3, G3, B3, C4, E4
      duration: 4.8,
    },
    // 3. Fmaj7#11 / Fmaj9 (Lush, uplifting, airy)
    {
      bass: [43.65, 65.41], // F1, C2
      notes: [110.00, 130.81, 164.81, 196.00, 261.63, 349.23], // A2, C3, E3, G3, C4, F4
      duration: 4.8,
    },
    // 4. Gadd9 / Gsus4 (Calm, gentle resolution)
    {
      bass: [49.00, 73.42], // G1, D2
      notes: [123.47, 146.83, 196.00, 220.00, 293.66, 392.00], // B2, D3, G3, A3, D4, G4
      duration: 5.0,
    },
    // 5. Em7 (Introspective, tender)
    {
      bass: [82.41, 123.47], // E2, B2
      notes: [164.81, 196.00, 246.94, 293.66, 329.63], // E3, G3, B3, D4, E4
      duration: 4.6,
    },
    // 6. Dm9 (Velvety, soft)
    {
      bass: [73.42, 110.00], // D2, A2
      notes: [146.83, 174.61, 220.00, 261.63, 329.63], // D3, F3, A3, C4, E4
      duration: 4.8,
    },
  ];

  function playAcousticPianoNote(freq, startTime, duration, velocity = 1.0) {
    if (!audioCtx || !masterGainNode) return;

    // Amplitude envelope: Soft hammer attack (no harsh clicking) and long natural exponential decay
    const noteGain = audioCtx.createGain();
    const peakGain = 0.12 * velocity;
    noteGain.gain.setValueAtTime(0.0001, startTime);
    noteGain.gain.exponentialRampToValueAtTime(peakGain, startTime + 0.045);
    noteGain.gain.exponentialRampToValueAtTime(peakGain * 0.45, startTime + 0.5);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    // Warm Lowpass Filter: felt hammer simulation (rich low-mid warmth, tamed highs)
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, startTime);
    filter.frequency.exponentialRampToValueAtTime(340, startTime + duration);

    noteGain.connect(filter);
    filter.connect(masterGainNode);

    // Fundamental Body Oscillator (Triangle for rich acoustic warmth)
    const osc1 = audioCtx.createOscillator();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, startTime);
    osc1.connect(noteGain);
    osc1.start(startTime);
    osc1.stop(startTime + duration + 0.1);

    // Harmonic Overtone Oscillator (Gentle Sine)
    const osc2 = audioCtx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2, startTime);
    const osc2Gain = audioCtx.createGain();
    osc2Gain.gain.value = 0.25;
    osc2.connect(osc2Gain);
    osc2Gain.connect(noteGain);
    osc2.start(startTime);
    osc2.stop(startTime + duration * 0.7);

    // Detuned String Chorus (Adds genuine acoustic piano string resonance)
    const osc3 = audioCtx.createOscillator();
    osc3.type = 'triangle';
    osc3.frequency.setValueAtTime(freq * 1.0016, startTime);
    const osc3Gain = audioCtx.createGain();
    osc3Gain.gain.value = 0.18;
    osc3.connect(osc3Gain);
    osc3Gain.connect(noteGain);
    osc3.start(startTime);
    osc3.stop(startTime + duration + 0.1);
  }

  function playAmbientPianoProgression() {
    if (!audioCtx || !isMusicPlaying) return;

    const chord = ambientChords[pianoPhraseStep % ambientChords.length];
    pianoPhraseStep++;

    const now = audioCtx.currentTime;

    // 1. Play warm bass pedals
    if (chord.bass) {
      chord.bass.forEach((bFreq, idx) => {
        playAcousticPianoNote(bFreq, now + idx * 0.08, chord.duration * 1.2, 1.1);
      });
    }

    // 2. Play lush arpeggiated chord notes with humanized stagger
    if (chord.notes) {
      chord.notes.forEach((nFreq, idx) => {
        const stagger = 0.12 + idx * 0.095;
        const vel = 0.85 + (idx % 2 === 0 ? 0.15 : -0.1);
        playAcousticPianoNote(nFreq, now + stagger, chord.duration, vel);
      });
    }

    // Schedule next chord phrase
    ambientPianoTimeout = setTimeout(playAmbientPianoProgression, (chord.duration - 0.3) * 1000);
  }

  async function toggleMusic() {
    isMusicPlaying = !isMusicPlaying;

    if (isMusicPlaying) {
      musicToggleBtn?.classList.add('playing');
      if (musicIcon) musicIcon.innerText = '🔊';
      if (musicLabel) musicLabel.innerText = 'Pianino: Yangramoqda';
      if (musicWave) musicWave.style.display = 'inline-flex';

      if (!audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) audioCtx = new AudioContextClass();
      }
      if (audioCtx && audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      if (!masterGainNode && audioCtx) {
        masterGainNode = audioCtx.createGain();
        const vol = musicVolumeSlider ? parseFloat(musicVolumeSlider.value) : 0.6;
        masterGainNode.gain.setValueAtTime(vol, audioCtx.currentTime);
        masterGainNode.connect(audioCtx.destination);
      }

      pianoPhraseStep = 0;
      playAmbientPianoProgression();
      showToast('Yumshoq relaksatsion pianino musiqasi yangramoqda 🎹✨');
    } else {
      musicToggleBtn?.classList.remove('playing');
      if (musicIcon) musicIcon.innerText = '🎹';
      if (musicLabel) musicLabel.innerText = 'Pianino: Yoqish';
      if (musicWave) musicWave.style.display = 'none';

      if (ambientPianoTimeout) {
        clearTimeout(ambientPianoTimeout);
        ambientPianoTimeout = null;
      }
      showToast('Musiqa to\'xtatildi');
    }
  }

  musicToggleBtn?.addEventListener('click', toggleMusic);

  // ----------------------------------------------------------------------------
  // Gentle Falling Snowflakes Animation Engine (Prompt Requirement 8)
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
        radius: Math.random() * 2.2 + 0.8,
        speedY: Math.random() * 0.9 + 0.45,
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

  // ----------------------------------------------------------------------------
  // Dashboard Initialization
  // ----------------------------------------------------------------------------
  function initDashboard() {
    loadStats();
    loadUsers();
    loadReviews();
    loadJobs();

    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = setInterval(() => {
      loadStats();
      if (activeTab === 'tab-jobs') loadJobs();
      if (activeTab === 'tab-reviews') loadReviews();
    }, 25000);
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

  initFallingSnowEngine();
})();
