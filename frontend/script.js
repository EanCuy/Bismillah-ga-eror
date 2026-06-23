const API_BASE = 'http://localhost:5000/api';

let currentGame = null; // tracks which game is open in the modal

// --- VIEW SWITCHING ---
document.querySelectorAll('.nav-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));

    btn.classList.add('active');
    const view = btn.dataset.view;
    document.getElementById(`view-${view}`).classList.add('active');

    if (view === 'wishlist') loadWishlist();
  });
});

// --- SEARCH ---
document.getElementById('search-btn').addEventListener('click', doSearch);
document.getElementById('search-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') doSearch();
});

async function doSearch() {
  const title = document.getElementById('search-input').value.trim();
  if (!title) return;

  const resultsEl = document.getElementById('search-results');
  resultsEl.innerHTML = '<p class="empty-msg">Searching...</p>';

  try {
    const res = await fetch(`${API_BASE}/search?title=${encodeURIComponent(title)}`);
    const data = await res.json();

    if (!data.results || data.results.length === 0) {
      resultsEl.innerHTML = '<p class="empty-msg">No games found.</p>';
      return;
    }

    resultsEl.innerHTML = '';
    data.results.forEach((game) => {
      resultsEl.appendChild(renderGameCard(game));
    });
  } catch (err) {
    resultsEl.innerHTML = `<p class="empty-msg">Error: ${err.message}. Is the backend running?</p>`;
  }
}

function renderGameCard(game) {
  const card = document.createElement('div');
  card.className = 'game-card';
  card.innerHTML = `
    <img src="${game.thumb || 'https://via.placeholder.com/180x100?text=No+Image'}" alt="${game.title}" />
    <div class="info">
      <h4>${game.title}</h4>
      <span class="price-tag">$${game.cheapestPrice}</span>
    </div>
  `;
  card.addEventListener('click', () => openGameDetail(game));
  return card;
}

// --- GAME DETAIL MODAL ---
async function openGameDetail(game) {
  currentGame = game;
  document.getElementById('modal-title').textContent = game.title;
  document.getElementById('modal-thumb').src = game.thumb || '';
  document.getElementById('detail-modal').classList.remove('hidden');

  await loadDeals(game.id);
  await loadReviews(game.id);
}

document.getElementById('modal-close').addEventListener('click', () => {
  document.getElementById('detail-modal').classList.add('hidden');
});

async function loadDeals(gameID) {
  const dealsEl = document.getElementById('modal-deals');
  dealsEl.innerHTML = '<p class="empty-msg">Loading prices...</p>';

  try {
    const res = await fetch(`${API_BASE}/compare/${gameID}`);
    const data = await res.json();

    if (!data.deals || data.deals.length === 0) {
      dealsEl.innerHTML = '<p class="empty-msg">No price data available.</p>';
      return;
    }

    dealsEl.innerHTML = '';
    data.deals.forEach((deal) => {
      const row = document.createElement('div');
      row.className = 'deal-row';
      row.innerHTML = `<span>${deal.store}</span><span class="price-tag">$${deal.price} (-${deal.savings})</span>`;
      dealsEl.appendChild(row);
    });
  } catch (err) {
    dealsEl.innerHTML = `<p class="empty-msg">Error loading prices: ${err.message}</p>`;
  }
}

// --- WISHLIST ---
document.getElementById('modal-wishlist-btn').addEventListener('click', async () => {
  if (!currentGame) return;
  try {
    const res = await fetch(`${API_BASE}/wishlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameID: currentGame.id,
        title: currentGame.title,
        thumb: currentGame.thumb,
      }),
    });
    if (res.ok) {
      alert(`${currentGame.title} added to wishlist!`);
    } else {
      const err = await res.json();
      alert(err.error || 'Failed to add to wishlist');
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
});

async function loadWishlist() {
  const el = document.getElementById('wishlist-results');
  el.innerHTML = '<p class="empty-msg">Loading...</p>';

  try {
    const res = await fetch(`${API_BASE}/wishlist`);
    const data = await res.json();

    if (data.length === 0) {
      el.innerHTML = '<p class="empty-msg">Your wishlist is empty.</p>';
      return;
    }

    el.innerHTML = '';
    data.forEach((item) => {
      const card = document.createElement('div');
      card.className = 'game-card';
      card.innerHTML = `
        <img src="${item.thumb || 'https://via.placeholder.com/180x100?text=No+Image'}" alt="${item.title}" />
        <div class="info">
          <h4>${item.title}</h4>
          <button class="remove-btn" data-id="${item.gameID}">Remove</button>
        </div>
      `;
      card.querySelector('.remove-btn').addEventListener('click', async (e) => {
        e.stopPropagation();
        await fetch(`${API_BASE}/wishlist/${item.gameID}`, { method: 'DELETE' });
        loadWishlist();
      });
      el.appendChild(card);
    });
  } catch (err) {
    el.innerHTML = `<p class="empty-msg">Error: ${err.message}</p>`;
  }
}

// --- REVIEWS ---
async function loadReviews(gameID) {
  const el = document.getElementById('modal-reviews');
  el.innerHTML = '<p class="empty-msg">Loading reviews...</p>';

  try {
    const res = await fetch(`${API_BASE}/reviews/${gameID}`);
    const data = await res.json();

    if (data.length === 0) {
      el.innerHTML = '<p class="empty-msg">No reviews yet. Be the first!</p>';
      return;
    }

    el.innerHTML = '';
    data.forEach((r) => {
      const row = document.createElement('div');
      row.className = 'review-row';
      row.innerHTML = `
        <div class="review-header">
          <strong>${r.username} — ${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</strong>
          <button class="review-delete-btn" data-id="${r.id}" title="Delete review">&times;</button>
        </div>
        <span>${r.comment || ''}</span>
      `;
      row.querySelector('.review-delete-btn').addEventListener('click', async () => {
        if (!confirm('Delete this review?')) return;
        try {
          const res = await fetch(`${API_BASE}/reviews/${r.id}`, { method: 'DELETE' });
          if (res.ok) {
            loadReviews(gameID);
          } else {
            const err = await res.json();
            alert(err.error || 'Failed to delete review');
          }
        } catch (err) {
          alert('Error: ' + err.message);
        }
      });
      el.appendChild(row);
    });
  } catch (err) {
    el.innerHTML = `<p class="empty-msg">Error: ${err.message}</p>`;
  }
}

document.getElementById('review-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentGame) return;

  const username = document.getElementById('review-username').value.trim();
  const rating = parseInt(document.getElementById('review-rating').value, 10);
  const comment = document.getElementById('review-comment').value.trim();

  try {
    const res = await fetch(`${API_BASE}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameID: currentGame.id,
        title: currentGame.title,
        username,
        rating,
        comment,
      }),
    });

    if (res.ok) {
      document.getElementById('review-form').reset();
      loadReviews(currentGame.id);
    } else {
      const err = await res.json();
      alert(err.error || 'Failed to submit review');
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
});
