// ==========================================================================
// 4K Studio — Telegram Mini App Core Client Engine
// ==========================================================================

const tg = window.Telegram?.WebApp;
let currentUser = null;
let currentImageData = null;
let currentVideoData = null;
let currentBgData = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
  if (tg) {
    tg.ready();
    tg.expand();
    if (tg.setHeaderColor) tg.setHeaderColor('#0a0b10');
    if (tg.setBackgroundColor) tg.setBackgroundColor('#0a0b10');
  }

  setupTabs();
  setupImageStudio();
  setupVideoStudio();
  setupBackgroundStudio();
  setupPlans();
  setupReviews();
  await loadUserData();

  // Close app button
  document.getElementById('btn-close-app')?.addEventListener('click', () => {
    if (tg) tg.close();
  });
});

// Helper: convert File/Blob to Base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (err) => reject(err);
  });
}

// --------------------------------------------------------------------------
// 1. User & State Loading
// --------------------------------------------------------------------------
async function loadUserData() {
  const telegramUser = tg?.initDataUnsafe?.user;
  const telegramId = telegramUser?.id || 0;
  const firstName = telegramUser?.first_name || 'Foydalanuvchi';
  const username = telegramUser?.username ? `@${telegramUser.username}` : '';

  // Update header UI immediately
  const nameEl = document.getElementById('user-name');
  if (nameEl) nameEl.textContent = firstName;

  const avatarEl = document.getElementById('user-avatar');
  if (avatarEl && firstName) {
    avatarEl.textContent = firstName.charAt(0).toUpperCase();
  }

  try {
    const res = await fetch(`/api/miniapp/user-info?telegramId=${telegramId}`);
    if (res.ok) {
      const data = await res.json();
      currentUser = data;

      // Update plan badge & glowing badge
      const planBadge = document.getElementById('user-plan-badge');
      const proGlowBadge = document.getElementById('pro-badge-glow');
      const isPro = data.plan === 'PRO' || data.plan === 'BUSINESS' || data.isUnlimited;

      if (planBadge) {
        planBadge.textContent = data.plan || 'FREE';
        if (isPro) {
          planBadge.style.background = 'rgba(234, 179, 8, 0.2)';
          planBadge.style.color = '#fde047';
          planBadge.style.borderColor = 'rgba(234, 179, 8, 0.5)';
        }
      }

      if (proGlowBadge) {
        proGlowBadge.style.display = isPro ? 'inline-flex' : 'none';
      }

      // Highlight active plan card
      const cardFree = document.getElementById('card-plan-free');
      const cardPremium = document.getElementById('card-plan-premium');
      const cardPro = document.getElementById('card-plan-pro');
      if (data.plan === 'PREMIUM' && cardPremium) {
        cardPremium.style.borderColor = 'rgba(59, 130, 246, 0.8)';
      }

      // Update Quota Pill
      const quotaText = document.getElementById('quota-text');
      if (quotaText) {
        if (data.isUnlimited) {
          quotaText.textContent = 'Cheksiz ⚡';
        } else {
          quotaText.textContent = `${data.imagesRemaining ?? 50} ta qoldi`;
        }
      }

      // Check Custom Background
      if (data.hasCustomBackground) {
        const bgIndicator = document.getElementById('custom-bg-indicator');
        if (bgIndicator) bgIndicator.style.display = 'flex';

        const currentBgImg = document.getElementById('current-bg-img');
        const emptyState = document.getElementById('bg-empty-state');
        const resetBtn = document.getElementById('btn-reset-bg');

        if (currentBgImg && data.customBackgroundUrl) {
          currentBgImg.src = data.customBackgroundUrl;
          currentBgImg.style.display = 'block';
          if (emptyState) emptyState.style.display = 'none';
        }
        if (resetBtn) resetBtn.style.display = 'inline-flex';
      }
    }
  } catch (err) {
    console.warn('Could not fetch user info:', err);
  }
}

// --------------------------------------------------------------------------
// 2. Tab Navigation
// --------------------------------------------------------------------------
function setupTabs() {
  const tabs = document.querySelectorAll('.nav-tab');
  const contents = document.querySelectorAll('.tab-content');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      if (tg?.HapticFeedback) tg.HapticFeedback.selectionChanged();

      tabs.forEach((t) => t.classList.remove('active'));
      contents.forEach((c) => c.classList.remove('active'));

      tab.classList.add('active');
      const targetId = `tab-content-${tab.dataset.tab}`;
      const targetContent = document.getElementById(targetId);
      if (targetContent) targetContent.classList.add('active');
    });
  });
}

// --------------------------------------------------------------------------
// 3. Image 4K Studio
// --------------------------------------------------------------------------
function setupImageStudio() {
  const fileInput = document.getElementById('image-file-input');
  const uploadBox = document.getElementById('image-upload-box');
  const browseBtn = document.getElementById('btn-browse-image');
  const previewContainer = document.getElementById('image-preview-container');
  const previewImg = document.getElementById('image-preview');
  const previewMeta = document.getElementById('image-preview-meta');
  const placeholder = document.getElementById('image-upload-placeholder');
  const clearBtn = document.getElementById('btn-clear-image');
  const processBtn = document.getElementById('btn-process-image');

  browseBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput?.click();
  });

  uploadBox?.addEventListener('click', () => {
    if (!currentImageData) fileInput?.click();
  });

  fileInput?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) handleImageSelected(file);
  });

  // Drag & drop
  uploadBox?.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadBox.classList.add('dragover');
  });
  uploadBox?.addEventListener('dragleave', () => uploadBox.classList.remove('dragover'));
  uploadBox?.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadBox.classList.remove('dragover');
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) handleImageSelected(file);
  });

  function handleImageSelected(file) {
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light');

    currentImageData = file;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (previewImg) previewImg.src = ev.target.result;
      if (placeholder) placeholder.style.display = 'none';
      if (previewContainer) previewContainer.style.display = 'flex';
      if (processBtn) processBtn.disabled = false;

      // Read dimensions
      const img = new Image();
      img.onload = () => {
        if (previewMeta) previewMeta.textContent = `${img.naturalWidth} × ${img.naturalHeight} px • ${(file.size / 1024 / 1024).toFixed(2)} MB`;
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  clearBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    currentImageData = null;
    if (fileInput) fileInput.value = '';
    if (previewContainer) previewContainer.style.display = 'none';
    if (placeholder) placeholder.style.display = 'flex';
    if (processBtn) processBtn.disabled = true;
  });

  // Radio scale tiles
  const scaleTiles = document.querySelectorAll('#image-options-group .radio-tile');
  scaleTiles.forEach((tile) => {
    tile.addEventListener('click', () => {
      scaleTiles.forEach((t) => t.classList.remove('active'));
      tile.classList.add('active');
      const radio = tile.querySelector('input');
      if (radio) radio.checked = true;
      if (tg?.HapticFeedback) tg.HapticFeedback.selectionChanged();
    });
  });

  // Process Button
  processBtn?.addEventListener('click', async () => {
    if (!currentImageData) return;
    const scale = document.querySelector('input[name="image-scale"]:checked')?.value || '4';

    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');

    const progressCard = document.getElementById('image-progress-card');
    const progressTitle = document.getElementById('image-progress-title');
    const progressDesc = document.getElementById('image-progress-desc');

    if (progressCard) progressCard.style.display = 'flex';
    processBtn.disabled = true;

    try {
      if (progressTitle) progressTitle.textContent = 'Rasm yuklanmoqda...';
      if (progressDesc) progressDesc.textContent = 'Fayl tayyorlanmoqda';

      const imageBase64 = await fileToBase64(currentImageData);

      if (progressTitle) progressTitle.textContent = 'AI Neyrotarmoq ishlamoqda...';
      if (progressDesc) progressDesc.textContent = `${scale}x Ultra HD formatda piksellar tiklanmoqda`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      const response = await fetch('/api/miniapp/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          telegramId: tg?.initDataUnsafe?.user?.id || '0',
          type: 'IMAGE',
          scale: parseInt(scale, 10) || 4,
          imageBase64,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const result = await response.json();

      if (response.ok && result.success) {
        if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        if (progressTitle) progressTitle.textContent = '✅ Qabul qilindi!';
        if (progressDesc) progressDesc.textContent = '4K Ultra HD formatda tayyorlanib botingizga yuborilmoqda!';

        await loadUserData();

        // Notify user via Telegram WebApp popup and close
        setTimeout(() => {
          if (tg?.showAlert) {
            tg.showAlert('✨ Rasmingiz qabul qilindi! Bir necha soniyada 4K Ultra HD formatda botingizga yetkaziladi.', () => {
              tg.close();
            });
          } else {
            alert('✨ Rasmingiz qabul qilindi! Bir necha soniyada 4K Ultra HD formatda botingizga yetkaziladi.');
          }
        }, 400);
      } else {
        throw new Error(result.error || 'Qayta ishlashda xatolik yuz berdi');
      }
    } catch (err) {
      if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
      if (progressTitle) progressTitle.textContent = '❌ Xatolik yuz berdi';
      if (progressDesc) progressDesc.textContent = err.message;
      processBtn.disabled = false;
    }
  });
}

// --------------------------------------------------------------------------
// 4. Video 4K Studio
// --------------------------------------------------------------------------
function setupVideoStudio() {
  const fileInput = document.getElementById('video-file-input');
  const uploadBox = document.getElementById('video-upload-box');
  const browseBtn = document.getElementById('btn-browse-video');
  const previewContainer = document.getElementById('video-preview-container');
  const previewVideo = document.getElementById('video-preview');
  const previewMeta = document.getElementById('video-preview-meta');
  const placeholder = document.getElementById('video-upload-placeholder');
  const clearBtn = document.getElementById('btn-clear-video');
  const processBtn = document.getElementById('btn-process-video');

  browseBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput?.click();
  });

  uploadBox?.addEventListener('click', () => {
    if (!currentVideoData) fileInput?.click();
  });

  fileInput?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) handleVideoSelected(file);
  });

  function handleVideoSelected(file) {
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light');

    currentVideoData = file;
    const url = URL.createObjectURL(file);
    if (previewVideo) previewVideo.src = url;
    if (placeholder) placeholder.style.display = 'none';
    if (previewContainer) previewContainer.style.display = 'flex';
    if (processBtn) processBtn.disabled = false;

    if (previewMeta) {
      previewMeta.textContent = `${(file.size / 1024 / 1024).toFixed(1)} MB • Video`;
    }
  }

  clearBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    currentVideoData = null;
    if (fileInput) fileInput.value = '';
    if (previewContainer) previewContainer.style.display = 'none';
    if (placeholder) placeholder.style.display = 'flex';
    if (processBtn) processBtn.disabled = true;
  });

  // Video resolution tiles
  const resTiles = document.querySelectorAll('#tab-content-video .radio-tile');
  resTiles.forEach((tile) => {
    tile.addEventListener('click', () => {
      resTiles.forEach((t) => t.classList.remove('active'));
      tile.classList.add('active');
      const radio = tile.querySelector('input');
      if (radio) radio.checked = true;
      if (tg?.HapticFeedback) tg.HapticFeedback.selectionChanged();
    });
  });

  // Process Video
  processBtn?.addEventListener('click', async () => {
    if (!currentVideoData) return;
    const resolution = document.querySelector('input[name="video-res"]:checked')?.value || '1080p';

    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');

    const progressCard = document.getElementById('video-progress-card');
    const progressTitle = document.getElementById('video-progress-title');
    const progressDesc = document.getElementById('video-progress-desc');

    if (progressCard) progressCard.style.display = 'flex';
    processBtn.disabled = true;

    try {
      const formData = new FormData();
      formData.append('media', currentVideoData);
      formData.append('type', 'VIDEO');
      formData.append('resolution', resolution);
      formData.append('telegramId', tg?.initDataUnsafe?.user?.id || '0');

      const response = await fetch('/api/miniapp/process', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.success) {
        if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        if (progressTitle) progressTitle.textContent = '✅ Video navbatga qo\'yildi!';
        if (progressDesc) progressDesc.textContent = 'Tayyor bo\'lgach Telegramga yuboriladi!';

        if (tg?.showAlert) {
          tg.showAlert(`🎬 Video ${resolution} formatda qayta ishlanmoqda va Telegram chatiga yuboriladi!`, () => {
            tg.close();
          });
        }
      } else {
        throw new Error(result.error || 'Video ishlov berishda xatolik yuz berdi');
      }
    } catch (err) {
      if (progressTitle) progressTitle.textContent = '❌ Xatolik yuz berdi';
      if (progressDesc) progressDesc.textContent = err.message;
      processBtn.disabled = false;
    }
  });
}

// --------------------------------------------------------------------------
// 5. Pro Custom Background Studio
// --------------------------------------------------------------------------
function setupBackgroundStudio() {
  const bgInput = document.getElementById('bg-file-input');
  const browseBgBtn = document.getElementById('btn-browse-bg');
  const saveBgBtn = document.getElementById('btn-save-bg');
  const resetBgBtn = document.getElementById('btn-reset-bg');
  const currentBgImg = document.getElementById('current-bg-img');
  const emptyState = document.getElementById('bg-empty-state');

  browseBgBtn?.addEventListener('click', () => bgInput?.click());

  bgInput?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) {
      currentBgData = file;
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (currentBgImg) {
          currentBgImg.src = ev.target.result;
          currentBgImg.style.display = 'block';
        }
        if (emptyState) emptyState.style.display = 'none';
        if (saveBgBtn) saveBgBtn.disabled = false;
      };
      reader.readAsDataURL(file);
    }
  });

  saveBgBtn?.addEventListener('click', async () => {
    if (!currentBgData) return;

    saveBgBtn.disabled = true;
    try {
      const imageBase64 = await fileToBase64(currentBgData);

      const res = await fetch('/api/miniapp/set-background', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          telegramId: tg?.initDataUnsafe?.user?.id || '0',
          imageBase64,
        }),
      });

      const resJson = await res.json();
      if (res.ok && resJson.success) {
        if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        if (resetBgBtn) resetBgBtn.style.display = 'inline-flex';
        await loadUserData();
        alert('✅ Maxsus foningiz muvaffaqiyatli saqlandi va faollashtirildi!');
      } else {
        throw new Error(resJson.error || 'Fonni saqlashda xatolik yuz berdi');
      }
    } catch (err) {
      alert(`❌ ${err.message}`);
      saveBgBtn.disabled = false;
    }
  });

  resetBgBtn?.addEventListener('click', async () => {
    if (!confirm('Maxsus fonni o\'chirib asl holatga qaytmoqchimisiz?')) return;

    try {
      const telegramId = tg?.initDataUnsafe?.user?.id || '0';
      await fetch(`/api/miniapp/reset-background?telegramId=${telegramId}`, { method: 'POST' });

      if (currentBgImg) currentBgImg.style.display = 'none';
      if (emptyState) emptyState.style.display = 'block';
      if (resetBgBtn) resetBgBtn.style.display = 'none';
      alert('🗑 Maxsus fon o\'chirildi.');
    } catch (err) {
      alert('Xatolik yuz berdi');
    }
  });
}

// --------------------------------------------------------------------------
// 6. Plans & Admin Contact
// --------------------------------------------------------------------------
function setupPlans() {
  const contactAdmin = (e) => {
    e.preventDefault();
    const adminUrl = 'https://t.me/rahmonoov_19';
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(adminUrl);
    } else {
      window.open(adminUrl, '_blank');
    }
  };

  document.getElementById('btn-plan-free')?.addEventListener('click', contactAdmin);
  document.getElementById('btn-plan-premium')?.addEventListener('click', contactAdmin);
  document.getElementById('btn-plan-pro')?.addEventListener('click', contactAdmin);
}

// --------------------------------------------------------------------------
// 7. Reviews & Ratings (1 to 5 Stars)
// --------------------------------------------------------------------------
let selectedRating = 5;

function setupReviews() {
  const starBtns = document.querySelectorAll('#star-rating-selector .star-btn');
  const labelText = document.getElementById('star-label-text');
  const commentInput = document.getElementById('review-comment-text');
  const submitBtn = document.getElementById('btn-submit-review');
  const successBadge = document.getElementById('review-success-badge');

  const ratingLabels = {
    1: "1/5 — Qoniqarsiz ⭐️",
    2: "2/5 — O'rtacha ⭐️⭐️",
    3: "3/5 — Yaxshi ⭐️⭐️⭐️",
    4: "4/5 — Juda yaxshi ⭐️⭐️⭐️⭐️",
    5: "5/5 — A'lo darajada! ⭐️⭐️⭐️⭐️⭐️",
  };

  starBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const starVal = parseInt(btn.dataset.star, 10) || 5;
      selectedRating = starVal;

      starBtns.forEach((b) => {
        const val = parseInt(b.dataset.star, 10);
        if (val <= starVal) {
          b.classList.add('active');
        } else {
          b.classList.remove('active');
        }
      });

      if (labelText) {
        labelText.textContent = ratingLabels[starVal] || `${starVal}/5 ⭐`;
      }

      if (tg?.HapticFeedback) tg.HapticFeedback.selectionChanged();
    });
  });

  submitBtn?.addEventListener('click', async () => {
    const comment = commentInput ? commentInput.value.trim() : '';
    const telegramId = tg?.initDataUnsafe?.user?.id || '0';

    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
    submitBtn.disabled = true;

    try {
      const res = await fetch('/api/miniapp/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId,
          rating: selectedRating,
          comment,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        if (successBadge) {
          successBadge.style.display = 'block';
          setTimeout(() => {
            successBadge.style.display = 'none';
          }, 5000);
        }
        if (commentInput) commentInput.value = '';
        await loadReviewsData();
      } else {
        alert(data.error || 'Xatolik yuz berdi');
      }
    } catch (err) {
      alert('Tarmoq xatosi: fikr yuborilmadi');
    } finally {
      submitBtn.disabled = false;
    }
  });

  // Load reviews on startup
  loadReviewsData();
}

async function loadReviewsData() {
  try {
    const res = await fetch('/api/miniapp/reviews');
    if (!res.ok) return;
    const data = await res.json();
    if (!data.success) return;

    // Update Big score display
    const avgScoreEl = document.getElementById('avg-rating-val');
    const avgStarsRow = document.getElementById('avg-stars-row');
    const avgCountLabel = document.getElementById('avg-count-label');
    const totalPill = document.getElementById('reviews-total-pill');

    const avg = data.average || 5.0;
    const count = data.count || 0;

    if (avgScoreEl) avgScoreEl.textContent = avg.toFixed(1);
    if (avgStarsRow) {
      const fullStars = Math.round(avg);
      avgStarsRow.textContent = '⭐️'.repeat(fullStars);
    }
    if (avgCountLabel) {
      avgCountLabel.textContent = count > 0 ? `${count} ta baho asosida` : 'Hozircha birinchi bo\'lib baholang';
    }
    if (totalPill) {
      totalPill.textContent = `${count} ta`;
    }

    // Render list
    const container = document.getElementById('reviews-list-container');
    if (!container) return;

    if (!data.reviews || data.reviews.length === 0) {
      container.innerHTML = `
        <div class="review-empty-state">
          <span>🌟 Birinchi bo'lib fikr va baho qoldiring!</span>
        </div>
      `;
      return;
    }

    container.innerHTML = data.reviews
      .map((r) => {
        const name = r.user?.firstName || 'Foydalanuvchi';
        const letter = name.charAt(0).toUpperCase();
        const starsStr = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
        const commentHtml = r.comment
          ? `<p class="review-comment-body">"${escapeHtml(r.comment)}"</p>`
          : `<p class="review-comment-body" style="font-style: italic; opacity: 0.7;">Baho qoldirildi: ${r.rating} yulduz</p>`;
        const dateStr = r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '';

        return `
          <div class="review-card-item">
            <div class="review-item-top">
              <div class="review-author">
                <div class="review-avatar-mini">${letter}</div>
                <span class="review-author-name">${escapeHtml(name)}</span>
              </div>
              <span class="review-stars-val">${starsStr}</span>
            </div>
            ${commentHtml}
            <span class="review-time-stamp">${dateStr}</span>
          </div>
        `;
      })
      .join('');
  } catch (err) {
    console.debug('Could not load reviews feed:', err);
  }
}

function escapeHtml(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
