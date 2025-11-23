import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// KONFIG – Supabase
const SUPABASE_URL = "https://biuiczsfripiytmyskub.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpdWljenNmcmlwaXl0bXlza3ViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3NzgwMzgsImV4cCI6MjA3OTM1NDAzOH0.kWIX7PK420YeBvZQsPcerYEZfPYrUpsSa8uHLTEUE3g";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// DOM helpers
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

// STATE
let currentUser = null;
let items = [];
let requests = [];
let currentFilter = "sale";
let currentCategory = null;
let currentView = "market"; // "market" | "list" | "overview" | "requests"
let editingItemId = null;
let currentDetailsItemId = null;

// bilder for nåværende vare (ny/rediger)
let currentImageDataUrls = [];

// ===== THEME =====

function loadTheme() {
  const t = localStorage.getItem("svinn_theme") || "dark";
  if (t === "light") document.documentElement.classList.add("light");
  else document.documentElement.classList.remove("light");
  updateThemeButton();
}

function toggleTheme() {
  const isLight = document.documentElement.classList.toggle("light");
  localStorage.setItem("svinn_theme", isLight ? "light" : "dark");
  updateThemeButton();
}

function updateThemeButton() {
  const btn = $("#theme-toggle");
  if (!btn) return;
  const isLight = document.documentElement.classList.contains("light");
  btn.textContent = isLight ? "☀️" : "🌙";
}

// ===== AUTH =====

async function checkSession() {
  const { data } = await supabase.auth.getSession();
  currentUser = data.session?.user ?? null;
  updateAuthUI();
}

function updateAuthUI() {
  const loggedIn = !!currentUser;
  const loginBtn = $("#login-btn");
  if (loginBtn) loginBtn.textContent = loggedIn ? "Logg ut" : "Logg inn";

  const adminNav = $("#admin-nav");
  const fab = $("#fab-add");
  if (adminNav) adminNav.classList.toggle("hidden", !loggedIn);
  if (fab) fab.classList.toggle("hidden", !loggedIn);

  // gjest = alltid salgsside
  if (!loggedIn) {
    switchView("market");
  }
}

async function handleLoginClick() {
  if (currentUser) {
    await supabase.auth.signOut();
    currentUser = null;
    updateAuthUI();
    return;
  }
  showModal("#login-modal");
}

async function performLogin() {
  const email = $("#login-email").value.trim();
  const password = $("#login-password").value;
  if (!email || !password) {
    alert("Skriv inn både e-post og passord.");
    return;
  }
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) {
    alert("Feil ved innlogging: " + error.message);
    return;
  }
  currentUser = data.user;
  hideModal("#login-modal");
  updateAuthUI();
}

// ===== MODAL helpers =====

function showModal(sel) {
  const el = $(sel);
  if (!el) return;
  el.classList.remove("hidden");
  el.classList.add("visible");
}

function hideModal(sel) {
  const el = $(sel);
  if (!el) return;
  el.classList.remove("visible");
  el.classList.add("hidden");
}

// ===== DATA – ITEMS =====

async function loadItems() {
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }
  items = data || [];
  renderAll();
}

// helper: lagre flere bilder i én tekstkolonne (image_url) som "url1|||url2|||url3"
function serializeImageUrls(arr) {
  return (arr || []).join("|||");
}
function parseImageUrls(str) {
  if (!str) return [];
  return String(str)
    .split("|||")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function saveItemFromForm() {
  const title = $("#item-title").value.trim();
  const priceValue = $("#item-price").value;
  const price = priceValue ? parseInt(priceValue, 10) : null;
  const category = $("#item-category").value.trim();
  const location = $("#item-location").value.trim();
  const description = $("#item-description").value.trim();
  const markSold = $("#item-mark-sold").checked;

  if (!title) {
    alert("Tittel må fylles inn.");
    return;
  }

  const payload = {
    title,
    price,
    category,
    category_key: category.toLowerCase(),
    location,
    description,
    is_sold: markSold,
  };

  const imagesString = serializeImageUrls(currentImageDataUrls);
  if (imagesString) {
    payload.image_url = imagesString;
  }

  let error;
  if (editingItemId) {
    const { error: e } = await supabase
      .from("items")
      .update(payload)
      .eq("id", editingItemId);
    error = e;
  } else {
    const { error: e } = await supabase.from("items").insert(payload);
    error = e;
  }

  if (error) {
    alert("Kunne ikke lagre: " + error.message);
    return;
  }

  hideModal("#item-modal");
  editingItemId = null;
  await loadItems();
}

async function deleteCurrentItem() {
  if (!editingItemId) return;
  if (!confirm("Slette denne varen?")) return;
  const { error } = await supabase.from("items").delete().eq("id", editingItemId);
  if (error) {
    alert("Kunne ikke slette: " + error.message);
    return;
  }
  hideModal("#item-modal");
  editingItemId = null;
  await loadItems();
}

function renderImagePreview() {
  const container = $("#item-image-preview");
  if (!container) return;

  if (!currentImageDataUrls.length) {
    container.classList.add("hidden");
    container.innerHTML = "";
    return;
  }

  container.classList.remove("hidden");
  container.innerHTML = `
    <div class="preview-grid">
      ${currentImageDataUrls
        .map(
          (url, idx) => `
        <div class="preview-thumb">
          <img src="${url}" alt="Bilde ${idx + 1}" />
          ${idx === 0 ? '<span class="preview-badge">Hovedbilde</span>' : ""}
        </div>
      `
        )
        .join("")}
    </div>
  `;
}

function openNewItemModal() {
  editingItemId = null;
  $("#item-modal-title").textContent = "Ny ting";
  $("#item-title").value = "";
  $("#item-price").value = "";
  $("#item-category").value = "";
  $("#item-location").value = "";
  $("#item-description").value = "";
  $("#item-mark-sold").checked = false;
  $("#item-delete").classList.add("hidden");
  $("#item-images").value = "";

  currentImageDataUrls = [];
  renderImagePreview();

  showModal("#item-modal");
}

function openEditItemModal(itemId) {
  const it = items.find((i) => i.id === itemId);
  if (!it) return;

  editingItemId = itemId;
  $("#item-modal-title").textContent = "Rediger ting";
  $("#item-title").value = it.title || "";
  $("#item-price").value = it.price ?? "";
  $("#item-category").value = it.category || "";
  $("#item-location").value = it.location || "";
  $("#item-description").value = it.description || "";
  $("#item-mark-sold").checked = !!it.is_sold;

  currentImageDataUrls = parseImageUrls(it.image_url);
  renderImagePreview();

  $("#item-delete").classList.remove("hidden");
  showModal("#item-modal");
}

async function toggleSold(itemId, makeSold) {
  const { error } = await supabase
    .from("items")
    .update({ is_sold: makeSold, sold_at: makeSold ? new Date().toISOString() : null })
    .eq("id", itemId);
  if (error) {
    alert("Feil ved oppdatering: " + error.message);
    return;
  }
  await loadItems();
}

// ===== REQUESTS =====

async function loadRequests() {
  const { data, error } = await supabase
    .from("requests")
    .select("*, items(title)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }
  requests = data || [];
  renderRequests();
}

async function sendRequestForCurrentItem() {
  if (!currentDetailsItemId) return;
  const buyer_name = $("#req-name").value.trim();
  const buyer_email = $("#req-email").value.trim();
  const buyer_phone = $("#req-phone").value.trim();
  const message = $("#req-message").value.trim();

  if (!buyer_name && !message) {
    alert("Skriv minst navn eller en melding.");
    return;
  }

  const payload = {
    item_id: currentDetailsItemId,
    buyer_name,
    buyer_email,
    buyer_phone,
    message,
  };

  const { error } = await supabase.from("requests").insert(payload);
  if (error) {
    alert("Kunne ikke sende forespørsel: " + error.message);
    return;
  }

  $("#req-name").value = "";
  $("#req-email").value = "";
  $("#req-phone").value = "";
  $("#req-message").value = "";
  alert("Forespørsel sendt ✔️");
}

// ===== RENDERING =====

function applyFilterAndSearch(list) {
  const q = $("#search-input").value.trim().toLowerCase();
  return list.filter((it) => {
    if (currentFilter === "sale" && it.is_sold) return false;
    if (currentFilter === "sold" && !it.is_sold) return false;
    if (currentFilter === "all") {
      // ingen filter på solgt/til salgs
    }

    if (currentCategory && it.category_key !== currentCategory) return false;

    if (!q) return true;
    const text =
      (it.title || "") +
      " " +
      (it.description || "") +
      " " +
      (it.category || "") +
      " " +
      (it.location || "");
    return text.toLowerCase().includes(q);
  });
}

function renderAll() {
  renderCategories();
  renderItemsForMarket();
  renderItemsForAdmin();
  renderOverview();
}

function renderItemsForMarket() {
  const cont = $("#items-container");
  const filtered = applyFilterAndSearch(items, false);
  if (!filtered.length) {
    cont.innerHTML = '<p style="font-size:13px;color:var(--fg-soft);">Ingen varer.</p>';
    return;
  }
  cont.innerHTML = filtered.map((it) => renderItemCard(it, false)).join("");
  attachCardHandlers(cont, false);
}

function renderItemsForAdmin() {
  const cont = $("#admin-items-container");
  const filtered = applyFilterAndSearch(items, true);
  if (!filtered.length) {
    cont.innerHTML =
      '<p style="font-size:13px;color:var(--fg-soft);">Ingen varer i listen.</p>';
    return;
  }
  cont.innerHTML = filtered.map((it) => renderItemCard(it, true)).join("");
  attachCardHandlers(cont, true);
}

function renderItemCard(it, isAdmin) {
  const statusBadge = it.is_sold
    ? '<span class="badge badge-red">Solgt</span>'
    : '<span class="badge badge-green">Til salgs</span>';

  const priceText = it.price != null ? `${it.price.toLocaleString("no-NO")} kr` : "Gi bud";

  const images = parseImageUrls(it.image_url);
  const firstImage = images[0];
  const imageHtml = firstImage
    ? `<div class="image-thumb"><img src="${firstImage}" alt="Bilde av ${escapeHtml(
        it.title || ""
      )}" /></div>`
    : "";

  const dateStr = it.created_at
    ? new Date(it.created_at).toLocaleDateString("no-NO")
    : "";

  const catBadge = it.category
    ? `<span class="badge badge-grey">${escapeHtml(it.category)}</span>`
    : "";

  const locBadge = it.location
    ? `<span class="badge badge-grey">${escapeHtml(it.location)}</span>`
    : "";

  const adminBtns = isAdmin
    ? `
      <div class="card-actions-row">
        <button class="card-pill-btn" data-action="toggle-sold" data-id="${it.id}">
          ${it.is_sold ? "Marker som til salgs" : "Marker som solgt"}
        </button>
        <button class="card-pill-btn main" data-action="edit" data-id="${it.id}">
          Rediger
        </button>
        <button class="card-pill-btn" data-action="details" data-id="${it.id}">
          Detaljer
        </button>
        <button class="card-pill-btn danger" data-action="delete" data-id="${it.id}">
          Slett
        </button>
        <button class="card-pill-btn" data-action="share" data-id="${it.id}">
          Del lenke
        </button>
      </div>
    `
    : `
      <div class="card-actions-row">
        <button class="card-pill-btn main" data-action="details" data-id="${it.id}">
          Detaljer
        </button>
        <button class="card-pill-btn" data-action="share" data-id="${it.id}">
          Del lenke
        </button>
      </div>
    `;

  return `
    <article class="card">
      <div class="card-header">
        <h2 class="card-title">${escapeHtml(it.title || "")}</h2>
        <div class="card-price">${priceText}</div>
      </div>
      <p class="card-sub">
        ${it.description ? escapeHtml(it.description) + "<br>" : ""}
        ${dateStr ? "Lagt ut: " + dateStr : ""}
      </p>
      <div class="badges-row">
        ${statusBadge}
        ${catBadge}
        ${locBadge}
      </div>
      ${imageHtml}
      ${adminBtns}
    </article>
  `;
}

function attachCardHandlers(container, isAdmin) {
  container.querySelectorAll("button[data-action]").forEach((btn) => {
    const id = btn.getAttribute("data-id");
    const action = btn.getAttribute("data-action");
    btn.addEventListener("click", async () => {
      if (action === "details") openDetailsModal(id);
      else if (action === "share") shareItemLink(id);
      else if (isAdmin && action === "edit") openEditItemModal(id);
      else if (isAdmin && action === "delete") {
        editingItemId = id;
        await deleteCurrentItem();
      } else if (isAdmin && action === "toggle-sold") {
        const it = items.find((i) => i.id === id);
        await toggleSold(id, !it.is_sold);
      }
    });
  });
}

function openDetailsModal(itemId) {
  const it = items.find((i) => i.id === itemId);
  if
