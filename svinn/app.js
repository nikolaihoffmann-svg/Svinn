import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

/**
 * 🔧 SETT INN DINE VERDIER HER
 * - SUPABASE_URL:  f.eks. "https://xxxxx.supabase.co"
 * - SUPABASE_ANON_KEY: anon public key fra Supabase
 */
const SUPABASE_URL = "https://DIN-PROJECT-URL.supabase.co";
const SUPABASE_ANON_KEY = "DIN_ANON_KEY";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let items = [];
let requests = [];
let currentUser = null;
let currentView = "sales";
let currentFilter = "active";
let currentSalesCategoryKey = "all";
let salesSearchQuery = "";
let previousViewBeforeDetail = "sales";

const LS_THEME_KEY = "salgAppTheme";
const LS_SETTINGS_KEY = "salgAppUiSettings"; // tittel + undertekst

document.addEventListener("DOMContentLoaded", () => {
  initApp();
});

async function initApp() {
  // Hent elementer
  const appTitleEl = document.getElementById("app-title");
  const appSubtitleEl = document.getElementById("app-subtitle");

  const viewSales = document.getElementById("view-sales");
  const viewList = document.getElementById("view-list");
  const viewOverview = document.getElementById("view-overview");
  const viewRequests = document.getElementById("view-requests");
  const detailView = document.getElementById("detail-view");

  const adminNav = document.getElementById("admin-nav");
  const adminNavButtons = document.querySelectorAll(".admin-nav-btn");

  const addBtn = document.getElementById("add-item-btn");
  const itemPanel = document.getElementById("item-form-panel");

  const settingsPanel = document.getElementById("settings-panel");
  const settingsBtn = document.getElementById("settings-btn");
  const settingsTitleInput = document.getElementById("settings-title");
  const settingsSubtitleInput = document.getElementById("settings-subtitle");
  const settingsSaveBtn = document.getElementById("settings-save-btn");
  const settingsCloseBtn = document.getElementById("settings-close-btn");

  const themeToggle = document.getElementById("theme-toggle");
  const loginBtn = document.getElementById("login-btn");
  const loginPanel = document.getElementById("login-panel");
  const loginEmailInput = document.getElementById("login-email");
  const loginPasswordInput = document.getElementById("login-password");
  const loginSubmitBtn = document.getElementById("login-submit-btn");
  const loginCancelBtn = document.getElementById("login-cancel-btn");

  const qrPanel = document.getElementById("qr-panel");
  const qrImage = document.getElementById("qr-image");
  const qrCloseBtn = document.getElementById("qr-close-btn");

  const filterButtons = document.querySelectorAll(".filter-btn");
  const listEl = document.getElementById("item-list");
  const overviewContent = document.getElementById("overview-content");
  const requestsListEl = document.getElementById("requests-list");

  const salesListEl = document.getElementById("sales-list");
  const salesCategoriesEl = document.getElementById("sales-categories");
  const salesSearchInput = document.getElementById("sales-search");
  const salesFilterToggle = document.getElementById("sales-filter-toggle");

  // Skjemafelter for vare
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

  // INIT TEMA & UI-INNSTILLINGER
  initTheme(themeToggle);
  loadUiSettings(appTitleEl, appSubtitleEl, settingsTitleInput, settingsSubtitleInput);

  // AUTH: sjekk om vi allerede er logget inn
  await refreshUser();
  updateAuthUi();

  // HENT DATA
  await loadItemsFromDb();
  if (currentUser) {
    await loadRequestsFromDb();
  }

  renderAll();

  // HÅNDTER DIREKTE-LENKE TIL ITEM
  await handleItemFromUrl();

  // --- EVENT LISTENERS ---

  // Tema
  themeToggle.addEventListener("click", () => {
    toggleTheme(themeToggle);
  });

  // Admin nav
  adminNavButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const view = btn.dataset.view;
      setAdminNavActive(view);
      showView(view, { viewSales, viewList, viewOverview, viewRequests });
    });
  });

  // FAB
  addBtn.addEventListener("click", () => {
    openFormForNew(itemPanel, formTitle, idInput, titleInput, priceInput, categoryInput, descInput, imageInput, imageDataInput, soldInput, locationInput);
  });

  cancelBtn.addEventListener("click", () => {
    closeItemForm(itemPanel);
  });

  // Bilde -> base64 (brukes bare midlertidig; online bør egentlig bruke opplasting til storage, men vi kjører enklere)
  imageInput.addEventListener("change", () => {
    const file = imageInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      imageDataInput.value = e.target.result; // base64
    };
    reader.readAsDataURL(file);
  });

  // Skjema lagre vare
  form.addEventListener("submit", async e => {
    e.preventDefault();
    if (!currentUser) {
      alert("Du må være innlogget for å lagre varer.");
      return;
    }
    await saveItemFromForm({
      idInput,
      titleInput,
      priceInput,
      categoryInput,
      descInput,
      imageDataInput,
      soldInput,
      locationInput
    });
    await loadItemsFromDb();
    renderAll();
    closeItemForm(itemPanel);
  });

  // Filterknapper (admin liste)
  filterButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      filterButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilter = btn.dataset.filter;
      renderList(listEl);
    });
  });

  // Søk på salgsside
  salesSearchInput.addEventListener("input", e => {
    salesSearchQuery = (e.target.value || "").toLowerCase().trim();
    renderSales(salesListEl, salesCategoriesEl);
  });

  // Toggle kategori-filter visning
  salesFilterToggle.addEventListener("click", () => {
    salesCategoriesEl.classList.toggle("hidden");
  });

  // Innstillinger
  settingsBtn.addEventListener("click", () => {
    openSettings(settingsPanel, settingsTitleInput, settingsSubtitleInput);
  });

  settingsCloseBtn.addEventListener("click", () => {
    closeSettings(settingsPanel);
  });

  settingsSaveBtn.addEventListener("click", () => {
    saveUiSettings(appTitleEl, appSubtitleEl, settingsTitleInput, settingsSubtitleInput);
    closeSettings(settingsPanel);
  });

  // Login
  loginBtn.addEventListener("click", async () => {
    if (currentUser) {
      // Logg ut
      await supabase.auth.signOut();
      currentUser = null;
      items = [];
      requests = [];
      updateAuthUi();
      await loadItemsFromDb();
      renderAll();
      showView("sales", { viewSales, viewList, viewOverview, viewRequests });
      clearAdminNav(adminNavButtons);
    } else {
      openLogin(loginPanel, loginEmailInput, loginPasswordInput);
    }
  });

  loginCancelBtn.addEventListener("click", () => {
    closeLogin(loginPanel);
  });

  loginSubmitBtn.addEventListener("click", async () => {
    const email = (loginEmailInput.value || "").trim();
    const password = loginPasswordInput.value || "";
    if (!email || !password) {
      alert("Skriv inn e-post og passord.");
      return;
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) {
      console.error("Login-feil:", error);
      alert("Kunne ikke logge inn. Sjekk e-post/passord.");
      return;
    }
    currentUser = data.user;
    updateAuthUi();
    closeLogin(loginPanel);
    await loadItemsFromDb();
    await loadRequestsFromDb();
    renderAll();
    setAdminNavActive("sales");
    showView("sales", { viewSales, viewList, viewOverview, viewRequests });
  });

  // QR
  qrCloseBtn.addEventListener("click", () => {
    closeQr(qrPanel);
  });

  // --- FUNKSJONER SOM TRENGER DOM-INFORMASJON INNE I INIT ---

  function updateAuthUi() {
    if (currentUser) {
      loginBtn.textContent = "Logg ut";
      settingsBtn.classList.remove("hidden");
      adminNav.classList.remove("hidden");
      addBtn.classList.remove("hidden");
    } else {
      loginBtn.textContent = "Logg inn";
      settingsBtn.classList.add("hidden");
      adminNav.classList.add("hidden");
      addBtn.classList.add("hidden");
      clearAdminNav(adminNavButtons);
    }
  }

  function renderAll() {
    renderList(listEl);
    renderOverview(overviewContent);
    renderSales(salesListEl, salesCategoriesEl);
    if (currentUser) {
      renderRequests(requestsListEl);
    }
  }

  async function handleItemFromUrl() {
    const url = new URL(window.location.href);
    const itemId = url.searchParams.get("itemId");
    if (!itemId) return;

    // Hvis vi allerede har items, sjekk der først
    let item = items.find(i => i.id === itemId);

    if (!item) {
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .eq("id", itemId)
        .maybeSingle();

      if (error) {
        console.error("Feil ved henting av enkel vare:", error);
      }
      if (data) item = data;
    }

    if (item) {
      openDetail(item, detailView, qrPanel, qrImage);
    } else {
      document.body.classList.add("detail-open");
      detailView.innerHTML = `
        <div class="detail-card">
          <p>Fant ikke denne annonsen.</p>
          <div class="detail-actions">
            <button class="btn secondary" id="detail-back-only">Tilbake</button>
          </div>
        </div>
      `;
      const backOnly = document.getElementById("detail-back-only");
      backOnly.addEventListener("click", () => {
        closeDetail(detailView);
      });
    }
  }

  function setAdminNavActive(view) {
    adminNavButtons.forEach(btn => {
      btn.classList.toggle("active", btn.dataset.view === view);
    });
  }

  function clearAdminNav(adminNavButtons) {
    adminNavButtons.forEach(btn => btn.classList.remove("active"));
  }

  function showView(view, { viewSales, viewList, viewOverview, viewRequests }) {
    currentView = view;

    viewSales.classList.add("hidden");
    viewList.classList.add("hidden");
    viewOverview.classList.add("hidden");
    viewRequests.classList.add("hidden");

    if (view === "list") {
      viewList.classList.remove("hidden");
    } else if (view === "overview") {
      viewOverview.classList.remove("hidden");
    } else if (view === "requests") {
      viewRequests.classList.remove("hidden");
    } else {
      viewSales.classList.remove("hidden");
    }
  }

  // Eksponer noen funksjoner til globalt scope som trenger DOM
  window.__salgAppOpenDetail = item => openDetail(item, detailView, qrPanel, qrImage);
  window.__salgAppCloseDetail = () => closeDetail(detailView);
  window.__salgAppReloadAll = async () => {
    await loadItemsFromDb();
    if (currentUser) await loadRequestsFromDb();
    renderAll();
  };
}

// --- TEMA & UI-INNSTILLINGER ---

function initTheme(themeToggle) {
  const stored = localStorage.getItem(LS_THEME_KEY);
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const useDark = stored ? stored === "dark" : prefersDark;
  document.body.classList.toggle("dark", useDark);
  themeToggle.textContent = useDark ? "☀️" : "🌙";
}

function toggleTheme(themeToggle) {
  const isDark = !document.body.classList.contains("dark");
  document.body.classList.toggle("dark", isDark);
  themeToggle.textContent = isDark ? "☀️" : "🌙";
  localStorage.setItem(LS_THEME_KEY, isDark ? "dark" : "light");
}

function loadUiSettings(appTitleEl, appSubtitleEl, settingsTitleInput, settingsSubtitleInput) {
  try {
    const raw = localStorage.getItem(LS_SETTINGS_KEY);
    if (!raw) return;
    const s = JSON.parse(raw);
    if (s.title) {
      appTitleEl.textContent = s.title;
      settingsTitleInput.value = s.title;
    }
    if (s.subtitle) {
      appSubtitleEl.textContent = s.subtitle;
      settingsSubtitleInput.value = s.subtitle;
    }
  } catch (e) {
    console.warn("Kunne ikke lese UI-settings:", e);
  }
}

function saveUiSettings(appTitleEl, appSubtitleEl, settingsTitleInput, settingsSubtitleInput) {
  const title = (settingsTitleInput.value || "").trim() || "Mine salgsting";
  const subtitle = (settingsSubtitleInput.value || "").trim() || "Enkel oversikt over alt jeg selger";
  appTitleEl.textContent = title;
  appSubtitleEl.textContent = subtitle;
  localStorage.setItem(
    LS_SETTINGS_KEY,
    JSON.stringify({ title, subtitle })
  );
}

// --- AUTH ---

async function refreshUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.warn("auth.getUser error:", error);
    currentUser = null;
    return;
  }
  currentUser = data.user ?? null;
}

function openLogin(panel, emailInput, passwordInput) {
  emailInput.value = "";
  passwordInput.value = "";
  panel.classList.remove("hidden");
}

function closeLogin(panel) {
  panel.classList.add("hidden");
}

// --- SUPABASE DATA ---

async function loadItemsFromDb() {
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Feil ved henting av varer:", error);
    items = [];
    return;
  }
  items = data || [];
}

async function loadRequestsFromDb() {
  const { data, error } = await supabase
    .from("requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Feil ved henting av forespørsler:", error);
    requests = [];
    return;
  }
  requests = data || [];
}

// --- LAGRE / REDIGER VARE ---

function openFormForNew(
  itemPanel,
  formTitle,
  idInput,
  titleInput,
  priceInput,
  categoryInput,
  descInput,
  imageInput,
  imageDataInput,
  soldInput,
  locationInput
) {
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

function openFormForEdit(
  item,
  itemPanel,
  formTitle,
  idInput,
  titleInput,
  priceInput,
  categoryInput,
  descInput,
  imageInput,
  imageDataInput,
  soldInput,
  locationInput
) {
  formTitle.textContent = "Rediger ting";
  idInput.value = item.id;
  titleInput.value = item.title || "";
  priceInput.value = item.price ?? "";
  categoryInput.value = item.category || "";
  descInput.value = item.description || "";
  imageInput.value = "";
  imageDataInput.value = item.image_url || item.imageData || ""; // image_url brukes egentlig
  soldInput.checked = !!item.is_sold;
  locationInput.value = item.location || "";
  itemPanel.classList.remove("hidden");
}

function closeItemForm(itemPanel) {
  itemPanel.classList.add("hidden");
}

async function saveItemFromForm({
  idInput,
  titleInput,
  priceInput,
  categoryInput,
  descInput,
  imageDataInput,
  soldInput,
  locationInput
}) {
  const id = idInput.value || null;

  const rawTitle = titleInput.value || "";
  const title = rawTitle.trim() || "Uten tittel";

  const priceValue = priceInput.value;
  const price = priceValue === "" ? null : Number(priceValue);

  const category = (categoryInput.value || "").trim();
  const categoryKey = category ? category.toLowerCase() : "";

  const description = (descInput.value || "").trim();
  const isSold = !!soldInput.checked;
  const location = (locationInput.value || "").trim();

  const now = new Date().toISOString();

  // I en "ordentlig" online versjon burde vi laste opp bilde til Supabase Storage,
  // men for å holde det enkelt nå bruker vi base64 i `image_url`-feltet.
  const image_url = imageDataInput.value || null;

  const baseData = {
    title,
    price,
    description,
    category,
    category_key: categoryKey,
    location,
    is_sold: isSold,
    image_url,
    updated_at: now
  };

  if (id) {
    // Finn gammel for å justere sold_at
    const existing = items.find(i => i.id === id);
    let sold_at = existing ? existing.sold_at : null;

    if (existing && !existing.is_sold && isSold) {
      sold_at = now;
    } else if (existing && existing.is_sold && !isSold) {
      sold_at = null;
    }

    const { error } = await supabase
      .from("items")
      .update({ ...baseData, sold_at })
      .eq("id", id);

    if (error) {
      console.error("Feil ved oppdatering av vare:", error);
      alert("Kunne ikke oppdatere varen.");
    }
  } else {
    const newData = {
      ...baseData,
      created_at: now,
      sold_at: isSold ? now : null
    };

    const { error } = await supabase.from("items").insert(newData);
    if (error) {
      console.error("Feil ved lagring av ny vare:", error);
      alert("Kunne ikke lagre ny vare.");
    }
  }
}

async function toggleSold(item) {
  const now = new Date().toISOString();
  const newIsSold = !item.is_sold;
  const sold_at = newIsSold ? now : null;

  const { error } = await supabase
    .from("items")
    .update({
      is_sold: newIsSold,
      sold_at,
      updated_at: now
    })
    .eq("id", item.id);

  if (error) {
    console.error("Feil ved endring av status:", error);
    alert("Kunne ikke oppdatere status.");
    return;
  }
  await loadItemsFromDb();
  const listEl = document.getElementById("item-list");
  const overviewContent = document.getElementById("overview-content");
  const salesListEl = document.getElementById("sales-list");
  const salesCategoriesEl = document.getElementById("sales-categories");
  renderList(listEl);
  renderOverview(overviewContent);
  renderSales(salesListEl, salesCategoriesEl);
}

async function deleteItem(item) {
  if (!confirm("Slette denne tingen?")) return;
  const { error } = await supabase.from("items").delete().eq("id", item.id);
  if (error) {
    console.error("Feil ved sletting:", error);
    alert("Kunne ikke slette.");
    return;
  }
  await loadItemsFromDb();
  const listEl = document.getElementById("item-list");
  const overviewContent = document.getElementById("overview-content");
  const salesListEl = document.getElementById("sales-list");
  const salesCategoriesEl = document.getElementById("sales-categories");
  renderList(listEl);
  renderOverview(overviewContent);
  renderSales(salesListEl, salesCategoriesEl);
}

// --- LISTE / OVERSIKT / SALG / FORESPØRSLER ---

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

// ADMIN-LISTE
function renderList(listEl) {
  listEl.innerHTML = "";

  let filtered = items;
  if (currentFilter === "active") {
    filtered = items.filter(i => !i.is_sold);
  } else if (currentFilter === "sold") {
    filtered = items.filter(i => i.is_sold);
  }

  if (!filtered.length) {
    const empty = document.createElement("p");
    empty.textContent = "Ingen ting her ennå.";
    empty.style.color = "#6b7280";
    empty.style.fontSize = "0.9rem";
    listEl.appendChild(empty);
    return;
  }

  filtered.forEach(item => {
    const card = createAdminCard(item);
    listEl.appendChild(card);
  });
}

function createAdminCard(item) {
  const card = document.createElement("article");
  card.className = "card";

  const imageWrap = document.createElement("div");
  imageWrap.className = "card-image";
  if (item.image_url) {
    const img = document.createElement("img");
    img.src = item.image_url;
    img.alt = item.title;
    imageWrap.appendChild(img);
  }

  const body = document.createElement("div");
  body.className = "card-body";

  const headerRow = document.createElement("div");
  headerRow.className = "card-header-row";

  const titleEl = document.createElement("div");
  titleEl.className = "card-title";
  titleEl.textContent = item.title || "Uten tittel";

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

  const createdPart = item.created_at ? `Lagt ut: ${formatDate(item.created_at)}` : "";
  const soldPart = item.is_sold && item.sold_at ? ` • Solgt: ${formatDate(item.sold_at)}` : "";
  const locationPart = item.location ? `\nLagerplass: ${item.location}` : "";

  metaEl.textContent = `${createdPart}${soldPart}${locationPart}`;

  const badges = document.createElement("div");
  badges.className = "badges";
  const statusBadge = document.createElement("span");
  statusBadge.className = "badge " + (item.is_sold ? "badge-sold" : "badge-active");
  statusBadge.textContent = item.is_sold ? "Solgt" : "Til salgs";
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
  toggleBtn.textContent = item.is_sold ? "Markér som til salgs" : "Markér som solgt";
  toggleBtn.addEventListener("click", () => toggleSold(item));

  const editBtn = document.createElement("button");
  editBtn.className = "btn-small-primary";
  editBtn.textContent = "Rediger";
  editBtn.addEventListener("click", () => {
    const itemPanel = document.getElementById("item-form-panel");
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
    openFormForEdit(
      item,
      itemPanel,
      formTitle,
      idInput,
      titleInput,
      priceInput,
      categoryInput,
      descInput,
      imageInput,
      imageDataInput,
      soldInput,
      locationInput
    );
  });

  const detailBtn = document.createElement("button");
  detailBtn.className = "btn-small-secondary";
  detailBtn.textContent = "Detaljer";
  detailBtn.addEventListener("click", () => {
    window.__salgAppOpenDetail(item);
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
  deleteBtn.addEventListener("click", () => deleteItem(item));

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

// OVERSIKT
function renderOverview(overviewContent) {
  const totalActive = items
    .filter(i => !i.is_sold)
    .reduce((sum, i) => sum + (i.price || 0), 0);

  const totalSold = items
    .filter(i => i.is_sold)
    .reduce((sum, i) => sum + (i.price || 0), 0);

  const countActive = items.filter(i => !i.is_sold).length;
  const countSold = items.filter(i => i.is_sold).length;

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

// SALGSSIDE
function renderSales(salesListEl, salesCategoriesEl) {
  salesListEl.innerHTML = "";

  const activeItems = items.filter(i => !i.is_sold);

  renderSalesCategories(activeItems, salesCategoriesEl, salesListEl);

  let filtered = activeItems;
  if (currentSalesCategoryKey !== "all") {
    filtered = filtered.filter(
      i => (i.category_key || "").toLowerCase() === currentSalesCategoryKey
    );
  }

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

  filtered.forEach(item => {
    const card = createSalesCard(item);
    salesListEl.appendChild(card);
  });
}

function renderSalesCategories(activeItems, salesCategoriesEl, salesListEl) {
  salesCategoriesEl.innerHTML = "";

  const chipAll = document.createElement("button");
  chipAll.className = "chip" + (currentSalesCategoryKey === "all" ? " active" : "");
  chipAll.textContent = "Alle";
  chipAll.addEventListener("click", () => {
    currentSalesCategoryKey = "all";
    renderSales(salesListEl, salesCategoriesEl);
  });
  salesCategoriesEl.appendChild(chipAll);

  const categoryMap = new Map();
  activeItems.forEach(item => {
    const key = (item.category_key || "").toLowerCase();
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
        renderSales(salesListEl, salesCategoriesEl);
      });
      salesCategoriesEl.appendChild(chip);
    });
}

function createSalesCard(item) {
  const card = document.createElement("article");
  card.className = "card";

  const imageWrap = document.createElement("div");
  imageWrap.className = "card-image";
  if (item.image_url) {
    const img = document.createElement("img");
    img.src = item.image_url;
    img.alt = item.title;
    imageWrap.appendChild(img);
  }

  const body = document.createElement("div");
  body.className = "card-body";

  const headerRow = document.createElement("div");
  headerRow.className = "card-header-row";

  const titleEl = document.createElement("div");
  titleEl.className = "card-title";
  titleEl.textContent = item.title || "Uten tittel";

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
  if (item.created_at) metaText += `Lagt ut: ${formatDate(item.created_at)}`;
  if (item.location) metaText += (metaText ? "\n" : "") + `Lagerplass: ${item.location}`;
  metaEl.textContent = metaText;

  const badges = document.createElement("div");
  badges.className = "badges";

  const statusBadge = document.createElement("span");
  statusBadge.className = "badge badge-active";
  statusBadge.textContent = "Til salgs";
  badges.appendChild(statusBadge);

  if (item.category) {
    const catBadge = document.createElement("span");
    catBadge.className = "badge";
    catBadge.textContent = item.category;
    badges.appendChild(catBadge);
  }

  card.addEventListener("click", () => {
    window.__salgAppOpenDetail(item);
  });

  body.appendChild(headerRow);
  if (item.description) body.appendChild(descEl);
  if (metaText) body.appendChild(metaEl);
  body.appendChild(badges);

  card.appendChild(imageWrap);
  card.appendChild(body);

  return card;
}

// FORESPØRSLER (ADMIN)
function renderRequests(requestsListEl) {
  requestsListEl.innerHTML = "";

  if (!requests.length) {
    const empty = document.createElement("p");
    empty.textContent = "Ingen forespørsler ennå.";
    empty.style.color = "#6b7280";
    empty.style.fontSize = "0.9rem";
    requestsListEl.appendChild(empty);
    return;
  }

  requests.forEach(req => {
    const item = items.find(i => i.id === req.item_id) || {};
    const card = document.createElement("article");
    card.className = "card";

    const body = document.createElement("div");
    body.className = "card-body";

    const titleRow = document.createElement("div");
    titleRow.className = "card-header-row";

    const titleEl = document.createElement("div");
    titleEl.className = "card-title";
    titleEl.textContent = item.title ? `Forespørsel: ${item.title}` : "Forespørsel";

    const timeEl = document.createElement("div");
    timeEl.className = "card-meta";
    timeEl.textContent = formatDate(req.created_at);

    titleRow.appendChild(titleEl);

    const metaEl = document.createElement("div");
    metaEl.className = "card-meta";
    metaEl.textContent =
      (req.buyer_name ? `Navn: ${req.buyer_name}\n` : "") +
      (req.buyer_email ? `E-post: ${req.buyer_email}\n` : "") +
      (req.buyer_phone ? `Telefon: ${req.buyer_phone}` : "");

    const msgEl = document.createElement("div");
    msgEl.className = "card-description";
    msgEl.textContent = req.message || "";

    body.appendChild(titleRow);
    body.appendChild(timeEl);
    if (metaEl.textContent) body.appendChild(metaEl);
    if (req.message) body.appendChild(msgEl);

    card.appendChild(body);
    requestsListEl.appendChild(card);
  });
}

// --- DETALJVISNING / FORESØRSEL / QR ---

function openDetail(item, detailView, qrPanel, qrImage) {
  previousViewBeforeDetail = currentView;
  document.body.classList.add("detail-open");

  const created = item.created_at ? formatDate(item.created_at) : "Ukjent";
  const sold = item.is_sold && item.sold_at ? formatDate(item.sold_at) : null;

  detailView.innerHTML = "";

  const card = document.createElement("div");
  card.className = "detail-card";

  const header = document.createElement("div");
  header.className = "detail-header";

  const title = document.createElement("div");
  title.className = "detail-title";
  title.textContent = item.title || "Uten tittel";

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
  if (item.image_url) {
    const img = document.createElement("img");
    img.src = item.image_url;
    img.alt = item.title;
    imageWrap.appendChild(img);
  }

  const desc = document.createElement("p");
  desc.className = "detail-body-text";
  desc.textContent = item.description || "";

  const statusLine = document.createElement("p");
  statusLine.className = "detail-body-text";
  statusLine.textContent = `Status: ${item.is_sold ? "Solgt" : "Til salgs"}`;

  // Forespørsel-skjema (kunder)
  const requestBox = document.createElement("div");
  requestBox.className = "request-box";

  const reqTitle = document.createElement("h3");
  reqTitle.textContent = "Send forespørsel på varen";

  const nameField = document.createElement("div");
  nameField.className = "field";
  const nameLabel = document.createElement("span");
  nameLabel.textContent = "Navn";
  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.placeholder = "Navnet ditt";
  nameField.appendChild(nameLabel);
  nameField.appendChild(nameInput);

  const emailField = document.createElement("div");
  emailField.className = "field";
  const emailLabel = document.createElement("span");
  emailLabel.textContent = "E-post";
  const emailInput = document.createElement("input");
  emailInput.type = "email";
  emailInput.placeholder = "Din e-post (valgfritt)";
  emailField.appendChild(emailLabel);
  emailField.appendChild(emailInput);

  const phoneField = document.createElement("div");
  phoneField.className = "field";
  const phoneLabel = document.createElement("span");
  phoneLabel.textContent = "Telefon";
  const phoneInput = document.createElement("input");
  phoneInput.type = "text";
  phoneInput.placeholder = "Telefonnummer (valgfritt)";
  phoneField.appendChild(phoneLabel);
  phoneField.appendChild(phoneInput);

  const msgField = document.createElement("div");
  msgField.className = "field";
  const msgLabel = document.createElement("span");
  msgLabel.textContent = "Melding";
  const msgInput = document.createElement("textarea");
  msgInput.rows = 3;
  msgInput.placeholder = "Skriv litt om hva du lurer på, bud, osv.";
  msgField.appendChild(msgLabel);
  msgField.appendChild(msgInput);

  const reqActions = document.createElement("div");
  reqActions.className = "form-actions";

  const sendReqBtn = document.createElement("button");
  sendReqBtn.className = "btn primary";
  sendReqBtn.textContent = "Send forespørsel";
  sendReqBtn.type = "button";

  sendReqBtn.addEventListener("click", async () => {
    await sendRequest(item, {
      name: nameInput.value,
      email: emailInput.value,
      phone: phoneInput.value,
      message: msgInput.value
    });
  });

  reqActions.appendChild(sendReqBtn);

  requestBox.appendChild(reqTitle);
  requestBox.appendChild(nameField);
  requestBox.appendChild(emailField);
  requestBox.appendChild(phoneField);
  requestBox.appendChild(msgField);
  requestBox.appendChild(reqActions);

  const actions = document.createElement("div");
  actions.className = "detail-actions";

  const backBtn = document.createElement("button");
  backBtn.className = "btn secondary";
  backBtn.textContent = "Tilbake";
  backBtn.addEventListener("click", () => {
    closeDetail(detailView);
  });

  const printBtn = document.createElement("button");
  printBtn.className = "btn secondary";
  printBtn.textContent = "Skriv ut";
  printBtn.addEventListener("click", () => {
    window.print();
  });

  const qrBtn = document.createElement("button");
  qrBtn.className = "btn primary";
  qrBtn.textContent = "Vis QR-kode";
  qrBtn.addEventListener("click", () => {
    openQrForItem(item, qrPanel, qrImage);
  });

  actions.appendChild(backBtn);
  actions.appendChild(printBtn);
  actions.appendChild(qrBtn);

  card.appendChild(header);
  card.appendChild(meta);
  if (item.image_url) card.appendChild(imageWrap);
  card.appendChild(desc);
  card.appendChild(statusLine);
  card.appendChild(requestBox);
  card.appendChild(actions);

  detailView.appendChild(card);

  // Oppdater URL
  const url = new URL(window.location.href);
  url.searchParams.set("itemId", item.id);
  window.history.replaceState({}, "", url.toString());
}

function closeDetail(detailView) {
  document.body.classList.remove("detail-open");
  detailView.innerHTML = "";

  const url = new URL(window.location.href);
  url.searchParams.delete("itemId");
  window.history.replaceState({}, "", url.toString());

  // Gå tilbake til forrige view
  const viewSales = document.getElementById("view-sales");
  const viewList = document.getElementById("view-list");
  const viewOverview = document.getElementById("view-overview");
  const viewRequests = document.getElementById("view-requests");
  const adminNavButtons = document.querySelectorAll(".admin-nav-btn");

  if (currentUser) {
    // sett admin-nav-knapper
    adminNavButtons.forEach(btn => {
      btn.classList.toggle("active", btn.dataset.view === previousViewBeforeDetail);
    });
  }

  if (previousViewBeforeDetail === "list") {
    viewSales.classList.add("hidden");
    viewOverview.classList.add("hidden");
    viewRequests.classList.add("hidden");
    viewList.classList.remove("hidden");
  } else if (previousViewBeforeDetail === "overview") {
    viewSales.classList.add("hidden");
    viewList.classList.add("hidden");
    viewRequests.classList.add("hidden");
    viewOverview.classList.remove("hidden");
  } else if (previousViewBeforeDetail === "requests") {
    viewSales.classList.add("hidden");
    viewList.classList.add("hidden");
    viewOverview.classList.add("hidden");
    viewRequests.classList.remove("hidden");
  } else {
    viewSales.classList.remove("hidden");
    viewList.classList.add("hidden");
    viewOverview.classList.add("hidden");
    viewRequests.classList.add("hidden");
  }
}

// FORESØRSEL

async function sendRequest(item, { name, email, phone, message }) {
  if (!name && !email && !phone && !message) {
    alert("Skriv inn minst noe info, f.eks. navn eller melding.");
    return;
  }

  const payload = {
    item_id: item.id,
    buyer_name: name || null,
    buyer_email: email || null,
    buyer_phone: phone || null,
    message: message || null
  };

  const { error } = await supabase.from("requests").insert(payload);
  if (error) {
    console.error("Feil ved sending av forespørsel:", error);
    alert("Kunne ikke sende forespørselen. Prøv igjen.");
    return;
  }

  alert("Forespørsel sendt! Du tar kontakt når du rekker.");
}

// QR

function openQrForItem(item, qrPanel, qrImage) {
  const url = new URL(window.location.href);
  url.searchParams.set("itemId", item.id);
  const itemUrl = url.toString();
  // Enkel, gratis QR-kode-tjeneste
  const encoded = encodeURIComponent(itemUrl);
  qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encoded}`;
  qrPanel.classList.remove("hidden");
}

function closeQr(qrPanel) {
  qrPanel.classList.add("hidden");
}

// INNSTILLINGER-PANEL

function openSettings(panel, titleInput, subtitleInput) {
  const raw = localStorage.getItem(LS_SETTINGS_KEY);
  if (raw) {
    try {
      const s = JSON.parse(raw);
      titleInput.value = s.title || "";
      subtitleInput.value = s.subtitle || "";
    } catch {
      // ignorer
    }
  }
  panel.classList.remove("hidden");
}

function closeSettings(panel) {
  panel.classList.add("hidden");
}

// DELING AV LENKE

function shareItemLink(item) {
  const url = new URL(window.location.href);
  url.searchParams.set("itemId", item.id);
  const shareUrl = url.toString();

  if (navigator.share) {
    navigator
      .share({
        title: item.title || "Vare til salgs",
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
