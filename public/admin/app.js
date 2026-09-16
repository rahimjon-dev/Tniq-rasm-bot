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
    if (tabId === 'tab-jobs') loadJobs();
    if (tabId === 'tab-overview') loadStats();
  }

  navItems.forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Overview Clickable Cards
  document.getElementById('cardUsers')?.addEventListener('click', () => switchTab('tab-users'));
  document.getElementById('cardActiveUsers')?.addEventListener('click', () => switchTab('tab-users'));
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
  document.getElementById('cardImages')?.addEventListener('click', () => switchTab('tab-jobs'));
  document.getElementById('cardVideos')?.addEventListener('click', () => switchTab('tab-jobs'));
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

      lastUpdatedText.innerText = `Yangilandi: ${new Date().toLocaleTimeString()}`;
    } catch (e) {
      console.warn('Failed to load stats:', e);
    }
  }

  // ----------------------------------------------------------------------------
  // Users Management
  // ----------------------------------------------------------------------------
  const userSearchInput = document.getElementById('userSearchInput');
  const userPlanFilter = document.getElementById('userPlanFilter');
  const usersTableBody = document.getElementById('usersTableBody');
  const userTableSummary = document.getElementById('userTableSummary');
  const btnPrevPage = document.getElementById('btnPrevPage');
  const btnNextPage = document.getElementById('btnNextPage');
  const pageIndicator = document.getElementById('pageIndicator');

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

      return `
        <tr class="user-table-row" style="cursor: pointer;" onclick="window.openUserDetails('${userPayload}')" title="Batafsil ma'lumotni ko'rish">
          <td><code>${u.telegramId}</code></td>
          <td>
            <strong>${escapeHtml(u.firstName || 'Foydalanuvchi')} ${escapeHtml(u.lastName || '')}</strong>
            <div class="input-hint">${u.username ? '@' + u.username : 'username yo\'q'}</div>
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
            <span class="status-pill ${isBanned ? 'banned' : 'active'}">
              ${isBanned ? 'Bloklangan' : 'Faol'}
            </span>
          </td>
          <td onclick="event.stopPropagation()">
            <button class="btn-action-sm" onclick="window.openUserDetails('${userPayload}')">
              👁 Ko'rish
            </button>
            <button class="btn-action-sm" onclick="window.openPlanModal('${u.telegramId}', '${escapeHtml(u.firstName || '')}')">
              ⭐ Tarif
            </button>
            <button class="btn-action-sm ${isBanned ? 'btn-unban' : 'btn-ban'}" onclick="window.toggleUserBan('${u.telegramId}', ${!isBanned})">
              ${isBanned ? 'Ochish' : 'Bloklash'}
            </button>
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

      const url = `/api/admin/users?${params.toString()}`;
      const data = await apiFetch(url);

      if (!data.success) return;

      userTableSummary.innerText = `Jami topildi: ${data.total} ta`;
      pageIndicator.innerText = `Sahifa ${data.page} / ${data.totalPages}`;
      btnPrevPage.disabled = data.page <= 1;
      btnNextPage.disabled = data.page >= data.totalPages;

      if (!data.users || data.users.length === 0) {
        usersTableBody.innerHTML = `<tr><td colspan="9" class="text-center py-4">Foydalanuvchi topilmadi.</td></tr>`;
        return;
      }

      usersTableBody.innerHTML = renderUsersHtml(data.users);
    } catch (e) {
      console.warn('Failed to load users:', e);
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
  // Jobs Queue Tab
  // ----------------------------------------------------------------------------
  const jobsTableBody = document.getElementById('jobsTableBody');

  async function loadJobs() {
    try {
      jobsTableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4">Ishlar navbati yuklanmoqda...</td></tr>`;
      const data = await apiFetch('/api/admin/jobs?limit=25');
      if (!data.success || !data.jobs) return;

      if (data.jobs.length === 0) {
        jobsTableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4">Hozircha ishlar jurnali bo'sh.</td></tr>`;
        return;
      }

      jobsTableBody.innerHTML = data.jobs.map((j) => {
        const u = j.user;
        const icon = j.type === 'IMAGE' ? '🖼️' : '🎬';
        const statusClass = j.status === 'COMPLETED' ? 'active' : (j.status === 'FAILED' ? 'banned' : 'plan-business');
        const duration = j.processingTime ? `${j.processingTime.toFixed(1)}s` : '-';
        const date = j.createdAt ? new Date(j.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-';

        return `
          <tr>
            <td><code>${j.id.slice(0, 10)}</code></td>
            <td>${u ? escapeHtml(u.firstName || u.username || u.telegramId) : 'Noma\'lum'}</td>
            <td>${icon} ${j.type}</td>
            <td><strong>${j.scale}x (${j.outputResolution || j.targetResolution || 'HD'})</strong></td>
            <td><span class="status-pill ${statusClass}">${j.status}</span></td>
            <td>${duration}</td>
            <td>${date}</td>
          </tr>
        `;
      }).join('');
    } catch (e) {
      console.warn('Failed to load jobs:', e);
    }
  }

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
  // Beethoven Classical Piano Soundtrack & Volume Engine (Web Audio Royalty-Free)
  // ----------------------------------------------------------------------------
  let audioCtx = null;
  let masterGainNode = null;
  let isMusicPlaying = false;
  let beethovenTimeout = null;

  const musicToggleBtn = document.getElementById('musicToggleBtn');
  const musicIcon = document.getElementById('musicIcon');
  const musicLabel = document.getElementById('musicLabel');
  const musicWave = document.getElementById('musicWave');
  const symphonyAudio = document.getElementById('symphonyAudio');
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
    if (symphonyAudio) symphonyAudio.volume = vol;
  });

  // Note Frequencies
  const FREQS = {
    E4: 329.63, F4: 349.23, G4: 392.00, Gs4: 415.30, A4: 440.00, B4: 493.88,
    C5: 523.25, D5: 587.33, Ds5: 622.25, E5: 659.25,
    A2: 110.00, E3: 164.81, A3: 220.00, C4: 261.63,
    E2: 82.41,  B2: 123.47, Gs3: 207.65,
  };

  // Beethoven's Für Elise Theme
  const beethovenMelody = [
    { note: FREQS.E5,  dur: 0.30, bass: [FREQS.A2, FREQS.E3, FREQS.A3, FREQS.C4] },
    { note: FREQS.Ds5, dur: 0.30 },
    { note: FREQS.E5,  dur: 0.30 },
    { note: FREQS.Ds5, dur: 0.30 },
    { note: FREQS.E5,  dur: 0.30 },
    { note: FREQS.B4,  dur: 0.30 },
    { note: FREQS.D5,  dur: 0.30 },
    { note: FREQS.C5,  dur: 0.30 },
    { note: FREQS.A4,  dur: 0.65, bass: [FREQS.A2, FREQS.C4, FREQS.E4] },

    { note: FREQS.C4,  dur: 0.28 },
    { note: FREQS.E4,  dur: 0.28 },
    { note: FREQS.A4,  dur: 0.28 },
    { note: FREQS.B4,  dur: 0.65, bass: [FREQS.E2, FREQS.B2, FREQS.E3, FREQS.Gs3] },

    { note: FREQS.E4,  dur: 0.28 },
    { note: FREQS.Gs4, dur: 0.28 },
    { note: FREQS.B4,  dur: 0.28 },
    { note: FREQS.C5,  dur: 0.65, bass: [FREQS.A2, FREQS.E3, FREQS.A3] },

    { note: FREQS.E4,  dur: 0.28 },
    { note: FREQS.E5,  dur: 0.30 },
    { note: FREQS.Ds5, dur: 0.30 },
    { note: FREQS.E5,  dur: 0.30 },
    { note: FREQS.Ds5, dur: 0.30 },
    { note: FREQS.E5,  dur: 0.30 },
    { note: FREQS.B4,  dur: 0.30 },
    { note: FREQS.D5,  dur: 0.30 },
    { note: FREQS.C5,  dur: 0.30 },
    { note: FREQS.A4,  dur: 0.80, bass: [FREQS.A2, FREQS.E3, FREQS.A3] },
  ];

  let melodyStep = 0;

  function playPianoNote(freq, dur) {
    if (!audioCtx || !masterGainNode) return;
    const now = audioCtx.currentTime;

    const noteGain = audioCtx.createGain();
    noteGain.gain.setValueAtTime(0.001, now);
    noteGain.gain.exponentialRampToValueAtTime(0.18, now + 0.015);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, now + dur * 1.6);

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2400, now);
    filter.frequency.exponentialRampToValueAtTime(600, now + dur * 1.5);

    noteGain.connect(filter);
    filter.connect(masterGainNode);

    // Primary hammer oscillator
    const osc1 = audioCtx.createOscillator();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, now);
    osc1.connect(noteGain);
    osc1.start(now);
    osc1.stop(now + dur * 1.7);

    // Warm body harmonic oscillator
    const osc2 = audioCtx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2, now);
    osc2.connect(noteGain);
    osc2.start(now);
    osc2.stop(now + dur * 1.2);
  }

  function playPianoStep() {
    if (!audioCtx || !isMusicPlaying) return;

    const item = beethovenMelody[melodyStep % beethovenMelody.length];
    melodyStep++;

    // Play bass chord if present
    if (item.bass && item.bass.length > 0) {
      item.bass.forEach((bFreq) => playPianoNote(bFreq, item.dur * 2.2));
    }

    // Play melodic lead
    playPianoNote(item.note, item.dur);

    beethovenTimeout = setTimeout(playPianoStep, item.dur * 1000);
  }

  async function toggleMusic() {
    isMusicPlaying = !isMusicPlaying;

    if (isMusicPlaying) {
      musicToggleBtn?.classList.add('playing');
      if (musicIcon) musicIcon.innerText = '🔊';
      if (musicLabel) musicLabel.innerText = 'Pianino: Yangramoqda';
      if (musicWave) musicWave.style.display = 'inline-flex';

      let playedAudio = false;
      if (symphonyAudio) {
        try {
          const vol = musicVolumeSlider ? parseFloat(musicVolumeSlider.value) : 0.6;
          symphonyAudio.volume = vol;
          await symphonyAudio.play();
          playedAudio = true;
        } catch {
          playedAudio = false;
        }
      }

      if (!playedAudio) {
        if (!audioCtx) {
          const AudioContextClass = window.AudioContext || window.webkitAudioContext;
          if (AudioContextClass) audioCtx = new AudioContextClass();
        }
        if (audioCtx && audioCtx.state === 'suspended') {
          audioCtx.resume();
        }
        if (!masterGainNode && audioCtx) {
          masterGainNode = audioCtx.createGain();
          const vol = musicVolumeSlider ? parseFloat(musicVolumeSlider.value) : 0.6;
          masterGainNode.gain.setValueAtTime(vol, audioCtx.currentTime);
          masterGainNode.connect(audioCtx.destination);
        }

        melodyStep = 0;
        playPianoStep();
      }

      showToast('Beethoven — Für Elise (Klassik Pianino) yangramoqda 🎹');
    } else {
      musicToggleBtn?.classList.remove('playing');
      if (musicIcon) musicIcon.innerText = '🎹';
      if (musicLabel) musicLabel.innerText = 'Pianino: Yoqish';
      if (musicWave) musicWave.style.display = 'none';

      if (symphonyAudio) {
        try { symphonyAudio.pause(); } catch {}
      }
      if (beethovenTimeout) {
        clearTimeout(beethovenTimeout);
        beethovenTimeout = null;
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
    loadJobs();

    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = setInterval(() => {
      loadStats();
      if (activeTab === 'tab-jobs') loadJobs();
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
