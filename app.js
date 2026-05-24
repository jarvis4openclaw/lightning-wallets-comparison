// ⚡ Lightning Wallets Comparison — App Logic

const state = {
  wallets: { openSource: [], freemium: [] },
  filters: {
    selfHostable: null,
    nonCustodial: null,
    lnAddress: null,
    nwc: null,
    ecash: null,
    autoWithdraw: null,
  },
  search: '',
  sort: { key: 'name', dir: 'asc' },
};

// ——— Column definitions ———
const columns = [
  { key: 'name', label: 'Name', type: 'name' },
  { key: 'link', label: 'Link', type: 'link' },
  { key: 'repo', label: 'Repo', type: 'repo' },
  { key: 'fees', label: 'Fees', type: 'fees' },
  { key: 'selfHostable', label: 'Self-Hostable', type: 'bool' },
  { key: 'nonCustodial', label: 'Non-Custodial', type: 'custodial' },
  { key: 'lnAddress', label: 'LN-address', type: 'mixed' },
  { key: 'autoWithdraw', label: 'Auto-Withdraw', type: 'bool' },
  { key: 'nwc', label: 'NWC', type: 'bool' },
  { key: 'ecash', label: 'Ecash', type: 'bool' },
  { key: 'customMint', label: 'Custom Mint', type: 'bool' },
  { key: 'multipleMints', label: 'Multiple Mints', type: 'bool' },
];

// ——— Load data ———
async function loadData() {
  try {
    const res = await fetch('wallets.json');
    state.wallets = await res.json();
    renderAll();
  } catch (err) {
    console.error('Failed to load wallets.json:', err);
    document.querySelector('main').innerHTML =
      '<p style="color:var(--red);text-align:center;padding:3rem;">Failed to load wallet data. Make sure wallets.json is accessible.</p>';
  }
}

// ——— Filter + Sort ———
function getFiltered(category) {
  let list = [...state.wallets[category]];

  // Apply boolean filters
  for (const [key, val] of Object.entries(state.filters)) {
    if (val !== null) {
      list = list.filter((w) => {
        if (key === 'nonCustodial') {
          if (val === 'yes') return w.nonCustodial === 'Yes' || w.nonCustodial === 'Both';
          if (val === 'optional') return w.nonCustodial === 'Optional' || w.nonCustodial === 'Both';
          if (val === 'no') return w.nonCustodial === 'No';
          return false;
        }
        if (key === 'lnAddress') {
          if (val === true) return w.lnAddress === true || (typeof w.lnAddress === 'string' && w.lnAddress.length > 0);
          if (val === false) return w.lnAddress === false;
          return false;
        }
        return w[key] === val;
      });
    }
  }

  // Apply text search
  if (state.search.trim()) {
    const q = state.search.toLowerCase();
    list = list.filter((w) => {
      return columns.some((col) => {
        const val = w[col.key];
        if (val === null || val === undefined) return false;
        if (typeof val === 'boolean') return String(val).toLowerCase().includes(q);
        return String(val).toLowerCase().includes(q);
      });
    });
  }

  // Sort
  const { key, dir } = state.sort;
  list.sort((a, b) => {
    let va = a[key];
    let vb = b[key];

    // Handle booleans
    if (typeof va === 'boolean') va = va ? 1 : 0;
    if (typeof vb === 'boolean') vb = vb ? 1 : 0;

    // Handle nulls
    if (va === null || va === undefined) va = '';
    if (vb === null || vb === undefined) vb = '';

    // Handle mixed lnAddress (bool vs string)
    va = String(va).toLowerCase();
    vb = String(vb).toLowerCase();

    // Numeric sort for fees
    if (key === 'fees') {
      const na = parseFloat(va) || (va === 'free' ? 0 : 999);
      const nb = parseFloat(vb) || (vb === 'free' ? 0 : 999);
      return dir === 'asc' ? na - nb : nb - na;
    }

    if (va < vb) return dir === 'asc' ? -1 : 1;
    if (va > vb) return dir === 'asc' ? 1 : -1;
    return 0;
  });

  return list;
}

// ——— Render ———
function renderTable(category, title, icon) {
  const wallets = getFiltered(category);
  const tbody = document.getElementById(`tbody-${category}`);
  const count = document.getElementById(`count-${category}`);
  const noResults = document.getElementById(`no-results-${category}`);

  count.textContent = wallets.length;

  if (wallets.length === 0) {
    noResults.classList.add('visible');
    tbody.innerHTML = '';
  } else {
    noResults.classList.remove('visible');
  }

  let html = '';
  for (const w of wallets) {
    html += '<tr>';
    for (const col of columns) {
      const val = w[col.key];
      html += renderCell(col, val, w);
    }
    html += '</tr>';
  }
  tbody.innerHTML = html;
}

function renderCell(col, val, wallet) {
  const css = cellClass(col, val);

  if (col.type === 'name') {
    return `<td class="name-cell ${css}"><a href="${wallet.link}" target="_blank" rel="noopener">${val}</a></td>`;
  }

  if (col.type === 'link') {
    return `<td>${linkBadge(val, '🌐')}</td>`;
  }

  if (col.type === 'repo') {
    if (val) {
      return `<td class="repo-cell">${linkBadge(val, '📦')}</td>`;
    }
    return '<td class="repo-na">n/a</td>';
  }

  if (col.type === 'fees') {
    const cls = val.toLowerCase().includes('free') || val === 'Free' ? 'fees-free' : '';
    return `<td class="fees-cell ${cls}">${val}</td>`;
  }

  if (col.type === 'bool') {
    return `<td class="${css}">${boolBadge(val)}</td>`;
  }

  if (col.type === 'custodial') {
    return `<td class="${css}">${custodialBadge(val)}</td>`;
  }

  if (col.type === 'mixed') {
    return `<td class="${css}">${mixedBadge(val)}</td>`;
  }

  return `<td class="${css}">${val}</td>`;
}

function cellClass(col, val) {
  if (col.type === 'bool' || col.type === 'custodial') {
    return `bool-${String(val).toLowerCase()}`;
  }
  if (col.type === 'mixed') {
    if (val === true) return 'bool-true';
    if (val === false) return 'bool-false';
    if (typeof val === 'string') {
      if (val.includes('unlimited') || val === '∞') return 'bool-unlimited';
      return 'bool-limited';
    }
  }
  return '';
}

function boolBadge(val) {
  if (val === true) return '<span class="bool-true">✓</span>';
  if (val === false) return '<span class="bool-false">—</span>';
  return val;
}

function custodialBadge(val) {
  const cls = `bool-${val.toLowerCase()}`;
  if (val === 'Yes') return `<span class="${cls}">Yes</span>`;
  if (val === 'No') return `<span class="${cls}">No</span>`;
  if (val === 'Both') return `<span class="${cls}">Both</span>`;
  if (val === 'Optional') return `<span class="${cls}">Optional</span>`;
  return val;
}

function mixedBadge(val) {
  if (val === true) return '<span class="bool-true">✓ Yes</span>';
  if (val === false) return '<span class="bool-false">—</span>';
  return val; // string like "10 (limited)" or "∞"
}

function linkBadge(url, icon) {
  // Extract display text from URL
  let text = url.replace(/^https?:\/\//, '').replace(/\/$/, '');
  if (text.length > 28) text = text.substring(0, 25) + '...';
  return `<a href="${url}" target="_blank" rel="noopener">${icon} ${text}</a>`;
}

// ——— Render header ———
function renderHeaders() {
  const theadOS = document.getElementById('thead-os');
  const theadFM = document.getElementById('thead-fm');

  const ths = columns
    .map((col) => {
      const isActive = state.sort.key === col.key;
      const arrow = isActive
        ? `<span class="sort-arrow active">${state.sort.dir === 'asc' ? '▲' : '▼'}</span>`
        : '<span class="sort-arrow">↕</span>';
      return `<th data-sort="${col.key}">${col.label}${arrow}</th>`;
    })
    .join('');

  theadOS.innerHTML = `<tr>${ths}</tr>`;
  theadFM.innerHTML = `<tr>${ths}</tr>`;
}

// ——— Render filters ———
function renderFilters() {
  const filterContainer = document.getElementById('filter-chips');
  const filters = [
    { key: 'selfHostable', label: 'Self-Hostable' },
    { key: 'nonCustodial', label: 'Non-Custodial' },
    { key: 'lnAddress', label: 'LN-address' },
    { key: 'nwc', label: 'NWC' },
    { key: 'ecash', label: 'Ecash' },
    { key: 'autoWithdraw', label: 'Auto-Withdraw' },
  ];

  let html = '';
  for (const f of filters) {
    const val = state.filters[f.key];
    const active = val !== null ? ' active' : '';
    html += `<button class="filter-chip${active}" data-filter="${f.key}">${f.label}${active ? ' ✓' : ''}</button>`;
  }
  html += '<button class="filter-chip clear" data-filter="clear">✕ Clear</button>';
  filterContainer.innerHTML = html;
}

// ——— Render all ———
function renderAll() {
  renderHeaders();
  renderFilters();
  renderTable('openSource', 'Open-Source PWA Wallets', '🔓');
  renderTable('freemium', 'Non-Open-Source Freemium', '💰');
}

// ——— Event handlers ———
function handleSort(key) {
  if (state.sort.key === key) {
    state.sort.dir = state.sort.dir === 'asc' ? 'desc' : 'asc';
  } else {
    state.sort.key = key;
    state.sort.dir = 'asc';
  }
  renderAll();
}

function handleFilter(key) {
  if (key === 'clear') {
    for (const k of Object.keys(state.filters)) {
      state.filters[k] = null;
    }
  } else if (key === 'selfHostable' || key === 'nwc' || key === 'ecash' || key === 'autoWithdraw') {
    // Toggle: null → true → false → null
    if (state.filters[key] === null) state.filters[key] = true;
    else if (state.filters[key] === true) state.filters[key] = false;
    else state.filters[key] = null;
  } else if (key === 'nonCustodial') {
    // Cycle: null → 'yes' → 'optional' → 'no' → null
    const cycle = [null, 'yes', 'optional', 'no', null];
    const idx = cycle.indexOf(state.filters[key]);
    state.filters[key] = cycle[(idx + 1) % cycle.length];
  } else if (key === 'lnAddress') {
    // Toggle: null → true → false → null
    if (state.filters[key] === null) state.filters[key] = true;
    else if (state.filters[key] === true) state.filters[key] = false;
    else state.filters[key] = null;
  }
  renderAll();
}

function handleSearch(e) {
  state.search = e.target.value;
  renderAll();
}

// ——— Bind events ———
function bindEvents() {
  // Sort
  document.querySelectorAll('thead').forEach((thead) => {
    thead.addEventListener('click', (e) => {
      const th = e.target.closest('th');
      if (!th) return;
      handleSort(th.dataset.sort);
    });
  });

  // Filters
  document.getElementById('filter-chips').addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-chip');
    if (!btn) return;
    handleFilter(btn.dataset.filter);
  });

  // Search
  document.getElementById('search-input').addEventListener('input', handleSearch);
}

// ——— Init ———
document.addEventListener('DOMContentLoaded', () => {
  bindEvents();
  loadData();
});

// ⚡ Donate Modal
function initDonateModal() {
  const btn = document.getElementById('donate-btn');
  const overlay = document.getElementById('donate-modal');
  const closeBtn = overlay.querySelector('.donate-modal-close');
  const copyBtn = document.getElementById('donate-copy');
  const invoice = document.getElementById('donate-invoice');

  function openModal() {
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  btn.addEventListener('click', openModal);

  closeBtn.addEventListener('click', closeModal);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) closeModal();
  });

  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(invoice.value);
      copyBtn.textContent = 'Copied!';
      copyBtn.classList.add('copied');
      setTimeout(() => {
        copyBtn.textContent = 'Copy Invoice';
        copyBtn.classList.remove('copied');
      }, 2000);
    } catch {
      invoice.select();
      document.execCommand('copy');
      copyBtn.textContent = 'Copied!';
      copyBtn.classList.add('copied');
      setTimeout(() => {
        copyBtn.textContent = 'Copy Invoice';
        copyBtn.classList.remove('copied');
      }, 2000);
    }
  });
}

document.addEventListener('DOMContentLoaded', initDonateModal);
