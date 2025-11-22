let items = [];
const STORAGE_KEY = "salgAppItems";
const THEME_KEY = "salgAppTheme";
const SETTINGS_KEY = "salgAppSettings";

document.addEventListener("DOMContentLoaded", () => {
  // Elementer
  const appTitleEl = document.getElementById("app-title");

  const listEl = document.getElementById("item-list");
  const addBtn = document.getElementById("add-item-btn");
  const itemPanel = document.getElementById("item-form-panel");
  const settingsPanel = document.getElementById("settings-panel");
  const form = document.getElementById("item-form");
  const formTitle = document.getElementById("form-title");

  const idInput = document.getElementById("item-id");
  const titleInput = document.getElementById("item-title");
  const priceInput = document.getElementById("item-price");
  const categoryInput = document.getElementById("item-category");
  const descInput = document.getElementById("item-description");
  const imageInput = document.getElementById("item-image");
  const imageDataInput = document.getElementById("item-image-data");
  const soldInput = document.getElementById("item-sold");
  const locationInput = document.getElementById("item-location");
  const cancelBtn = document.getElementById("cancel-btn");

  const filterButtons = document.querySelectorAll(".filter-btn");

  const viewList = document.getElementById("view-list");
  const viewOverview = document.getElementById("view-overview");
  const viewSales = document.getElementById("view-sales");
  const overviewContent = document.getElementById("overview-content");

  const detailView = document.getElementById("detail-view");

  const salesListEl = document.getElementById("sales-list");
  const salesCategoriesEl = document.getElementById("sales-categories");
  const salesSearchInput = document.getElementById("sales-search");
  const salesFilterToggle = document.getElementById("sales-filter-toggle");

  const settingsBtn = document.getElementById("settings-btn");
  const settingsTitleInput = document.getElementById("settings-title");
  const settingsSaveBtn = document.getElementById("settings-save-btn");
  const settingsCloseBtn = document.getElementById("settings-close-btn");
  const exportBtn = document.getElementById("export-btn");

  let currentFilter = "active";
  let currentSalesCategoryKey = "all";
  let salesSearchQuery = "";
  let currentView = "sales"; // "sales" | "list" | "overview"
  let settings = {
    title: "Mine salgsting",
    theme: "system",
    defaultView: "sales"
  };

  // Init
  loadSettings();
  initThemeFromSettings();
  applyTitleFromSettings();

  loadItems();
  showView(settings.defaultView || "sales");
  renderList();
  renderOverview();
  renderSales();

  handleItemFromUrl();
  registerServiceWorker();

  // HANDLERS

  addBtn.addEventListener("click", () => {
    openFormForNew();
  });

  cancelBtn.addEventListener("click", () => {
    closeItemForm();
  });

  // Bilde -> base64
  imageInput.addEventListener("change", () => {
    const file = imageInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      imageDataInput.value = e.target.result; // base64
    };
    reader.readAsDataURL(file);
  });

  // Filterknapper (adminliste)
  filterButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      filterButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilter = btn.dataset.filter;
      renderList();
    });
  });

  // Søk på salgsside
  salesSearchInput.addEventListener("input", e => {
    salesSearchQuery = (e.target.value || "").toLowerCase().trim();
    renderSales();
  });

  // Toggle kategori-filter visning
  salesFilterToggle.addEventListener("click", () => {
    salesCategoriesEl.classList.toggle("hidden");
  });

  // INNSTILLINGER
  settingsBtn.addEventListener("click", () => {
    openSettings();
  });

  settingsCloseBtn.addEventListener("click", () => {
    closeSettings();
  });

  settingsSaveBtn.addEventListener("click", () => {
    saveSettings();
  });

  exportBtn.addEventListener("click", () => {
    exportData();
  });

  // Lagre skjema (vare)
  form.addEventListener("submit", e => {
    e.preventDefault();
    saveItemFromForm();
  });

  // FUNKSJONER – SETTINGS

  function loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        settings = { ...settings, ...parsed };
      }
    } catch (e) {
      console.warn("Kunne ikke lese settings", e);
    }
  }

  function saveSettingsToStorage() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  function applyTitleFromSettings() {
    appTitleEl.textContent = settings.title || "Mine salgsting";
  }

  function initThemeFromSettings() {
    let theme = settings.theme;
    if (!theme || theme === "system") {
      const prefersDark =
        window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
      theme = prefersDark ? "dark" : "light";
    }

    document.body.classList.toggle("dark", theme === "dark");
    localStorage.setItem(THEME_KEY, theme);
  }

  function openSettings() {
    // Fyll inn nåværende verdier i UI
    settingsTitleInput.value = settings.title || "";

    const themeRadios = document.querySelectorAll('input[name="settings-theme"]');
    const theme = localStorage.getItem(THEME_KEY) || "light";
    themeRadios.forEach(radio => {
      radio.checked = radio.value === theme;
    });

    const viewRadios = document.querySelectorAll('input[name="settings-view"]');
    const v = settings.defaultView || "sales";
    viewRadios.forEach(radio => {
      radio.checked = radio.value === v;
    });

    settingsPanel.classList.remove("hidden");
  }

  function closeSettings() {
    settingsPanel.classList.add("hidden");
  }

  function saveSettings() {
    const newTitle = settingsTitleInput.value.trim() || "Mine salgsting";
    settings.title = newTitle;

    const themeRadios = document.querySelectorAll('input[name="settings-theme"]');
    let selectedTheme = "light";
    themeRadios.forEach(radio => {
      if (radio.checked) selectedTheme = radio.value;
    });
    settings.theme = selectedTheme;

    const viewRadios = document.querySelectorAll('input[name="settings-view"]');
    let selectedView = "sales";
    viewRadios.forEach(radio => {
      if (radio.checked) selectedView = radio.value;
    });
    settings.defaultView = selectedView;

    saveSettingsToStorage();
    applyTitleFromSettings();
    initThemeFromSettings();
    showView(settings.defaultView);

    closeSettings();
  }

  // EXPORT / BACKUP

  function exportData() {
    const data = {
      items,
      settings
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const a = document.createElement("a");
    a.href = url;
    a.download = `salg-app-backup-${today}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // SERVICE WORKER / OFFLINE

  function registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("sw.js")
        .catch(err => console.warn("Kunne ikke registrere service worker:", err));
    }
  }

  // DATA

  function loadItems() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        items = JSON.parse(raw);
      } else {
        items = [];
      }
    } catch (err) {
      console.error("Kunne ikke lese data:", err);
      items = [];
    }
  }

  function saveItems() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  function formatDate(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("nb-NO");
  }

  function formatCurrency(value) {
    if (!value) return "0 kr";
    return value.toLocaleString("nb-NO") + " kr";
  }

  // VISNINGSSTYRING

  function showView(view) {
    currentView = view;

    viewSales.classList.add("hidden");
    viewList.classList.add("hidden");
    viewOverview.classList.add("hidden");

    if (view === "list") {
      viewList.classList.remove("hidden");
    } else if (view === "overview") {
      viewOverview.classList.remove("hidden");
    } else {
      viewSales.classList.remove("hidden");
    }
  }

  // ADMINLISTE (LISTE-VISNING)

  function renderList() {
    listEl.innerHTML = "";

    let filtered = items;
    if (currentFilter === "active") {
      filtered = items.filter(i => !i.isSold);
    } else if (currentFilter === "sold") {
      filtered = items.filter(i => i.isSold);
    }

    if (!filtered.length) {
      const empty = document.createElement("p");
      empty.textContent = "Ingen ting her ennå.";
      empty.style.color = "#6b7280";
      empty.style.fontSize = "0.9rem";
      listEl.appendChild(empty);
      return;
    }

    filtered
      .slice()
      .sort((a, b) => new Date(b.createdAt || b.updatedAt || 0) - new Date(a.createdAt || a.updatedAt || 0))
      .forEach(item => {
        const card = createAdminCard(item);
        listEl.appendChild(card);
      });
  }

  function createAdminCard(item) {
    const card = document.createElement("article");
    card.className = "card";

    const imageWrap = document.createElement("div");
    imageWrap.className = "card-image";
    if (item.imageData) {
      const img = document.createElement("img");
      img.src = item.imageData;
      img.alt = item.title;
      imageWrap.appendChild(img);
    }

    const body = document.createElement("div");
    body.className = "card-body";

    const headerRow = document.createElement("div");
    headerRow.className = "card-header-row";

    const titleEl = document.createElement("div");
    titleEl.className = "card-title";
    titleEl.textContent = item.title;

    const priceEl = document.createElement("div");
    priceEl.className = "card-price";
    priceEl.textContent = item.price ? `${item.price.toLocaleString("nb-NO")} kr` : "Gi bud";

    headerRow.appendChild(titleEl);
    headerRow.appendChild(priceEl);

    const descEl = document.createElement("div");
    descEl.className = "card-description";
    descEl.textContent = item.description || "";

    const metaEl = document.createElement("div");
    metaEl.className = "card-meta";

    const createdPart = item.createdAt ? `Lagt ut: ${formatDate(item.createdAt)}` : "";
    const soldPart = item.isSold && item.soldAt ? ` • Solgt: ${formatDate(item.soldAt)}` : "";
    const locationPart = item.location ? `\nLagerplass: ${item.location}` : "";

    metaEl.textContent = `${createdPart}${soldPart}${locationPart}`;

    const badges = document.createElement("div");
    badges.className = "badges";
    const statusBadge = document.createElement("span");
    statusBadge.className = "badge " + (item.isSold ? "badge-sold" : "badge-active");
    statusBadge.textContent = item.isSold ? "Solgt" : "Til salgs";
    badges.appendChild(statusBadge);

    if (item.category) {
      const catBadge = document.createElement("span");
      catBadge.className = "badge";
      catBadge.textContent = item.category;
      badges.appendChild(catBadge);
    }

    const actions = document.createElement("div");
    actions.className = "card-actions";

    const toggleBtn = document.createElement("button");
    toggleBtn.className = "btn-small-secondary";
    toggleBtn.textContent = item.isSold ? "Markér som til salgs" : "Markér som solgt";
    toggleBtn.addEventListener("click", () => {
      toggleSold(item.id);
    });

    const editBtn = document.createElement("button");
    editBtn.className = "btn-small-primary";
    editBtn.textContent = "Rediger";
    editBtn.addEventListener("click", () => {
      openFormForEdit(item);
    });

    const detailBtn = document.createElement("button");
    detailBtn.className = "btn-small-secondary";
    detailBtn.textContent = "Detaljer";
    detailBtn.addEventListener("click", () => {
      openDetail(item);
    });

    const shareBtn = document.createElement("button");
    shareBtn.className = "btn-small-secondary";
    shareBtn.textContent = "Del lenke";
    shareBtn.addEventListener("click", () => {
      shareItemLink(item);
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn-small-danger";
    deleteBtn.textContent = "Slett";
    deleteBtn.addEventListener("click", () => {
      if (confirm("Slette denne tingen?")) {
        items = items.filter(i => i.id !== item.id);
        saveItems();
        renderList();
        renderOverview();
        renderSales();
      }
    });

    actions.appendChild(toggleBtn);
    actions.appendChild(editBtn);
    actions.appendChild(detailBtn);
    actions.appendChild(shareBtn);
    actions.appendChild(deleteBtn);

    body.appendChild(headerRow);
    if (item.description) body.appendChild(descEl);
    body.appendChild(metaEl);
    body.appendChild(badges);
    body.appendChild(actions);

    card.appendChild(imageWrap);
    card.appendChild(body);

    return card;
  }

  function toggleSold(id) {
    const idx = items.findIndex(i => i.id === id);
    if (idx === -1) return;
    const now = new Date().toISOString();
    const item = items[idx];

    const newIsSold = !item.isSold;
    let soldAt = item.soldAt || null;

    if (!item.isSold && newIsSold) {
      soldAt = now;
    }
    if (item.isSold && !newIsSold) {
      soldAt = null;
    }

    items[idx] = {
      ...item,
      isSold: newIsSold,
      soldAt,
      updatedAt: now
    };

    saveItems();
    renderList();
    renderOverview();
    renderSales();
  }

  function openFormForNew() {
    formTitle.textContent = "Ny ting";
    idInput.value = "";
    titleInput.value = "";
    priceInput.value = "";
    categoryInput.value = "";
    descInput.value = "";
    imageInput.value = "";
    imageDataInput.value = "";
    soldInput.checked = false;
    locationInput.value = "";
    itemPanel.classList.remove("hidden");
  }

  function openFormForEdit(item) {
    formTitle.textContent = "Rediger ting";
    idInput.value = item.id;
    titleInput.value = item.title;
    priceInput.value = item.price || "";
    categoryInput.value = item.category || "";
    descInput.value = item.description || "";
    imageInput.value = "";
    imageDataInput.value = item.imageData || "";
    soldInput.checked = !!item.isSold;
    locationInput.value = item.location || "";
    itemPanel.classList.remove("hidden");
  }

  function closeItemForm() {
    itemPanel.classList.add("hidden");
  }

  function saveItemFromForm() {
    const id = idInput.value || Date.now().toString();
    const title = titleInput.value.trim();
    const price = Number(priceInput.value || 0);
    const category = categoryInput.value.trim();
    const categoryKey = category ? category.toLowerCase() : "";
    const description = descInput.value.trim();
    const imageData = imageDataInput.value || "";
    const isSold = soldInput.checked;
    const location = locationInput.value.trim();

    if (!title) {
      alert("Tittel kan ikke være tom.");
      return;
    }

    const existingIndex = items.findIndex(i => i.id === id);
    const now = new Date().toISOString();

    if (existingIndex >= 0) {
      // Oppdater
      const existing = items[existingIndex];

      let soldAt = existing.soldAt || null;
      if (!existing.isSold && isSold) soldAt = now;
      if (existing.isSold && !isSold) soldAt = null;

      items[existingIndex] = {
        ...existing,
        title,
        price,
        description,
        imageData: imageData || existing.imageData,
        isSold,
        location,
        category,
        categoryKey,
        soldAt,
        updatedAt: now
      };
    } else {
      // Ny
      items.push({
        id,
        title,
        price,
        description,
        imageData,
        isSold,
        location,
        category,
        categoryKey,
        createdAt: now,
        updatedAt: now,
        soldAt: isSold ? now : null
      });
    }

    saveItems();
    renderList();
    renderOverview();
    renderSales();
    closeItemForm();
  }

  // OVERSIKT

  function renderOverview() {
    const totalActive = items
      .filter(i => !i.isSold)
      .reduce((sum, i) => sum + (i.price || 0), 0);

    const totalSold = items
      .filter(i => i.isSold)
      .reduce((sum, i) => sum + (i.price || 0), 0);

    const countActive = items.filter(i => !i.isSold).length;
    const countSold = items.filter(i => i.isSold).length;

    overviewContent.innerHTML = "";

    const card1 = document.createElement("div");
    card1.className = "overview-card";
    card1.innerHTML = `
      <h3>Ordrereserve (alt til salgs)</h3>
      <p><strong>${formatCurrency(totalActive)}</strong></p>
      <p>${countActive} varer til salgs</p>
    `;

    const card2 = document.createElement("div");
    card2.className = "overview-card";
    card2.innerHTML = `
      <h3>Totalt tjent (solgt)</h3>
      <p><strong>${formatCurrency(totalSold)}</strong></p>
      <p>${countSold} varer solgt</p>
    `;

    overviewContent.appendChild(card1);
    overviewContent.appendChild(card2);
  }

  // SALGSSIDE (kundevisning)

  function renderSales() {
    salesListEl.innerHTML = "";

    const activeItems = items.filter(i => !i.isSold);

    // Build categories (for filterpanelet)
    renderSalesCategories(activeItems);

    // Filter på valgt kategori
    let filtered = activeItems;
    if (currentSalesCategoryKey !== "all") {
      filtered = filtered.filter(
        i => (i.categoryKey || "").toLowerCase() === currentSalesCategoryKey
      );
    }

    // Søk
    if (salesSearchQuery) {
      filtered = filtered.filter(i => {
        const haystack = (
          (i.title || "") +
          " " +
          (i.description || "") +
          " " +
          (i.category || "") +
          " " +
          (i.location || "")
        ).toLowerCase();
        return haystack.includes(salesSearchQuery);
      });
    }

    if (!filtered.length) {
      const empty = document.createElement("p");
      empty.textContent = "Ingen varer til salgs som matcher.";
      empty.style.color = "#6b7280";
      empty.style.fontSize = "0.9rem";
      salesListEl.appendChild(empty);
      return;
    }

    filtered
      .slice()
      .sort((a, b) => new Date(b.createdAt || b.updatedAt || 0) - new Date(a.createdAt || a.updatedAt || 0))
      .forEach(item => {
        const card = createSalesCard(item);
        salesListEl.appendChild(card);
      });
  }

  function renderSalesCategories(activeItems) {
    salesCategoriesEl.innerHTML = "";

    const chipAll = document.createElement("button");
    chipAll.className = "chip" + (currentSalesCategoryKey === "all" ? " active" : "");
    chipAll.textContent = "Alle";
    chipAll.addEventListener("click", () => {
      currentSalesCategoryKey = "all";
      renderSales();
    });
    salesCategoriesEl.appendChild(chipAll);

    const categoryMap = new Map();
    activeItems.forEach(item => {
      const key = (item.categoryKey || "").toLowerCase();
      const label = item.category || "";
      if (!key || !label) return;
      if (!categoryMap.has(key)) {
        categoryMap.set(key, label);
      }
    });

    Array.from(categoryMap.entries())
      .sort((a, b) => a[1].localeCompare(b[1], "nb-NO"))
      .forEach(([key, label]) => {
        const chip = document.createElement("button");
        chip.className = "chip" + (currentSalesCategoryKey === key ? " active" : "");
        chip.textContent = label;
        chip.addEventListener("click", () => {
          currentSalesCategoryKey = key;
          renderSales();
        });
        salesCategoriesEl.appendChild(chip);
      });
  }

  function createSalesCard(item) {
    const card = document.createElement("article");
    card.className = "card";

    const imageWrap = document.createElement("div");
    imageWrap.className = "card-image";
    if (item.imageData) {
      const img = document.createElement("img");
      img.src = item.imageData;
      img.alt = item.title;
      imageWrap.appendChild(img);
    }

    const body = document.createElement("div");
    body.className = "card-body";

    const headerRow = document.createElement("div");
    headerRow.className = "card-header-row";

    const titleEl = document.createElement("div");
    titleEl.className = "card-title";
    titleEl.textContent = item.title;

    const priceEl = document.createElement("div");
    priceEl.className = "card-price";
    priceEl.textContent = item.price ? `${item.price.toLocaleString("nb-NO")} kr` : "Gi bud";

    headerRow.appendChild(titleEl);
    headerRow.appendChild(priceEl);

    const descEl = document.createElement("div");
    descEl.className = "card-description";
    descEl.textContent = item.description || "";

    const metaEl = document.createElement("div");
    metaEl.className = "card-meta";
    let metaText = "";
    if (item.category) metaText += `Kategori: ${item.category}`;
    if (item.location) metaText += (metaText ? "\n" : "") + `Lagerplass: ${item.location}`;
    if (item.createdAt) metaText += (metaText ? "\n" : "") + `Lagt ut: ${formatDate(item.createdAt)}`;
    metaEl.textContent = metaText;

    card.addEventListener("click", () => {
      openDetail(item);
    });

    body.appendChild(headerRow);
    if (item.description) body.appendChild(descEl);
    if (metaText) body.appendChild(metaEl);

    card.appendChild(imageWrap);
    card.appendChild(body);

    return card;
  }

  // DETALJVISNING / PRINT

  function openDetail(item) {
    document.body.classList.add("detail-open");

    const created = item.createdAt ? formatDate(item.createdAt) : "Ukjent";
    const sold = item.isSold && item.soldAt ? formatDate(item.soldAt) : null;

    detailView.innerHTML = "";

    const card = document.createElement("div");
    card.className = "detail-card";

    const header = document.createElement("div");
    header.className = "detail-header";

    const title = document.createElement("div");
    title.className = "detail-title";
    title.textContent = item.title;

    const price = document.createElement("div");
    price.className = "detail-price";
    price.textContent = item.price ? `${item.price.toLocaleString("nb-NO")} kr` : "Gi bud";

    header.appendChild(title);
    header.appendChild(price);

    const meta = document.createElement("div");
    meta.className = "detail-meta";

    let metaText = `Lagt ut: ${created}`;
    if (sold) metaText += `\nSolgt: ${sold}`;
    if (item.category) metaText += `\nKategori: ${item.category}`;
    if (item.location) metaText += `\nLagerplass: ${item.location}`;

    meta.textContent = metaText;

    const imageWrap = document.createElement("div");
    imageWrap.className = "detail-image";
    if (item.imageData) {
      const img = document.createElement("img");
      img.src = item.imageData;
      img.alt = item.title;
      imageWrap.appendChild(img);
    }

    const desc = document.createElement("p");
    desc.className = "detail-body-text";
    desc.textContent = item.description || "";

    const statusLine = document.createElement("p");
    statusLine.className = "detail-body-text";
    statusLine.textContent = `Status: ${item.isSold ? "Solgt" : "Til salgs"}`;

    const actions = document.createElement("div");
    actions.className = "detail-actions";

    const backBtn = document.createElement("button");
    backBtn.className = "btn secondary";
    backBtn.textContent = "Tilbake";
    backBtn.addEventListener("click", () => {
      closeDetail();
    });

    const printBtn = document.createElement("button");
    printBtn.className = "btn primary";
    printBtn.textContent = "Skriv ut";
    printBtn.addEventListener("click", () => {
      window.print();
    });

    actions.appendChild(backBtn);
    actions.appendChild(printBtn);

    card.appendChild(header);
    card.appendChild(meta);
    if (item.imageData) card.appendChild(imageWrap);
    card.appendChild(desc);
    card.appendChild(statusLine);
    card.appendChild(actions);

    detailView.appendChild(card);

    // Oppdater URL for denne annonsen
    const url = new URL(window.location.href);
    url.searchParams.set("itemId", item.id);
    window.history.replaceState({}, "", url.toString());
  }

  function closeDetail() {
    document.body.classList.remove("detail-open");
    detailView.innerHTML = "";

    const url = new URL(window.location.href);
    url.searchParams.delete("itemId");
    window.history.replaceState({}, "", url.toString());
  }

  function handleItemFromUrl() {
    const url = new URL(window.location.href);
    const itemId = url.searchParams.get("itemId");
    if (!itemId) return;

    const item = items.find(i => i.id === itemId);
    if (item) {
      openDetail(item);
    } else {
      document.body.classList.add("detail-open");
      detailView.innerHTML = `
        <div class="detail-card">
          <p>Fant ikke denne annonsen i denne nettleseren.</p>
          <div class="detail-actions">
            <button class="btn secondary" id="detail-back-only">Tilbake</button>
          </div>
        </div>
      `;
      const backOnly = document.getElementById("detail-back-only");
      backOnly.addEventListener("click", () => {
        closeDetail();
      });
    }
  }

  // DELING AV LENKE

  function shareItemLink(item) {
    const url = new URL(window.location.href);
    url.searchParams.set("itemId", item.id);
    const shareUrl = url.toString();

    if (navigator.share) {
      navigator
        .share({
          title: item.title,
          text: "Sjekk denne varen jeg har til salgs:",
          url: shareUrl
        })
        .catch(err => {
          console.warn("Deling avbrutt:", err);
        });
    } else {
      window.prompt("Kopier denne lenken:", shareUrl);
    }
  }
});
