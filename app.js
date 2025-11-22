import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// KONFIGURASJON – Supabase
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

// THEME
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
  const isLight = document.documentElement.classList.contains("light");
  btn.textContent = isLight ? "☀️" : "🌙";
}

// AUTH
async function checkSession() {
  const { data } = await supabase.auth.getSession();
  currentUser = data.session?.user ?? null;
  updateAuthUI();
}
function updateAuthUI() {
  const loggedIn = !!currentUser;
  $("#login-btn").textContent = loggedIn ? "Logg ut" : "Logg inn";
  $("#admin-nav").classList.toggle("hidden", !loggedIn);
  $("#fab-add").classList.toggle("hidden", !loggedIn);
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

// MODAL helpers
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

// DATA – ITEMS
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

  let imageDataUrl = null;

  // Hvis vi allerede har en preview (redigering) – bruk den
  const previewImg = $("#item-image-preview img");
  if (previewImg) {
    imageDataUrl = previewImg.src;
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

  if (imageDataUrl) payload.image_url = imageDataUrl;

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
  $("#item-image").value = "";
  $("#item-image-preview").classList.add("hidden");
  $("#item-image-preview").innerHTML = "";
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

  if (it.image_url) {
    $("#item-image-preview").classList.remove("hidden");
    $("#item-image-preview").innerHTML =
      '<img src="' + it.image_url + '" alt="Forhåndsvisning" />';
  } else {
    $("#item-image-preview").classList.add("hidden");
    $("#item-image-preview").innerHTML = "";
  }

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

// REQUESTS
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

// RENDERING

function applyFilterAndSearch(list, forAdmin = false) {
  const q = $("#search-input").value.trim().toLowerCase();
  return list.filter((it) => {
    if (currentFilter === "sale" && it.is_sold) return false;
    if (currentFilter === "sold" && !it.is_sold) return false;

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
  cont.innerHTML = filtered
    .map((it) => renderItemCard(it, false))
    .join("");
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
  cont.innerHTML = filtered
    .map((it) => renderItemCard(it, true))
    .join("");
  attachCardHandlers(cont, true);
}

function renderItemCard(it, isAdmin) {
  const statusBadge = it.is_sold
    ? '<span class="badge badge-red">Solgt</span>'
    : '<span class="badge badge-green">Til salgs</span>';

  const priceText = it.price != null ? `${it.price.toLocaleString("no-NO")} kr` : "Gi bud";

  const imageHtml = it.image_url
    ? `<div class="image-thumb"><img src="${it.image_url}" alt="Bilde av ${it.title}" /></div>`
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
  if (!it) return;
  currentDetailsItemId = itemId;
  const priceText = it.price != null ? `${it.price.toLocaleString("no-NO")} kr` : "Gi bud";
  const dateStr = it.created_at
    ? new Date(it.created_at).toLocaleDateString("no-NO")
    : "";
  const soldStr =
    it.is_sold && it.sold_at
      ? "Solgt: " + new Date(it.sold_at).toLocaleDateString("no-NO")
      : "";

  const imageHtml = it.image_url
    ? `<div class="image-thumb"><img src="${it.image_url}" alt="Bilde av ${it.title}" /></div>`
    : "";

  $("#details-content").innerHTML = `
    <h2>${escapeHtml(it.title || "")}</h2>
    <p style="margin:4px 0 6px;font-size:15px;"><strong>${priceText}</strong></p>
    <p style="margin:0 0 4px;font-size:13px;">
      ${it.description ? escapeHtml(it.description) + "<br>" : ""}
      ${dateStr ? "Lagt ut: " + dateStr + "<br>" : ""}
      ${soldStr ? soldStr + "<br>" : ""}
      ${it.location ? "Lagerplass: " + escapeHtml(it.location) : ""}
    </p>
    <div class="badges-row">
      ${
        it.is_sold
          ? '<span class="badge badge-red">Solgt</span>'
          : '<span class="badge badge-green">Til salgs</span>'
      }
      ${it.category ? `<span class="badge badge-grey">${escapeHtml(it.category)}</span>` : ""}
    </div>
    ${imageHtml}
  `;
  showModal("#details-modal");
}

// Categories
function renderCategories() {
  const bar = $("#category-bar");
  const allCats = Array.from(
    new Set(
      items
        .map((i) => (i.category ? i.category.trim() : ""))
        .filter((c) => c.length > 0)
    )
  );
  if (!allCats.length) {
    bar.innerHTML = "";
    return;
  }
  const chips = ['<button class="category-chip' +
    (currentCategory === null ? " category-chip-active" : "") +
    '" data-cat="__ALL__">Alle kategorier</button>'];
  for (const c of allCats) {
    const key = c.toLowerCase();
    chips.push(
      `<button class="category-chip${
        currentCategory === key ? " category-chip-active" : ""
      }" data-cat="${key}">${escapeHtml(c)}</button>`
    );
  }
  bar.innerHTML = chips.join("");
  bar.querySelectorAll(".category-chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      const val = btn.getAttribute("data-cat");
      currentCategory = val === "__ALL__" ? null : val;
      renderAll();
    });
  });
}

// Overview
function renderOverview() {
  const onsale = items.filter((i) => !i.is_sold);
  const sold = items.filter((i) => i.is_sold);
  const sumReserve = onsale.reduce((sum, i) => sum + (i.price || 0), 0);
  const sumSold = sold.reduce((sum, i) => sum + (i.price || 0), 0);

  $("#count-onsale").textContent = onsale.length;
  $("#count-sold").textContent = sold.length;
  $("#sum-reserve").textContent = `${sumReserve.toLocaleString("no-NO")} kr`;
  $("#sum-sold").textContent = `${sumSold.toLocaleString("no-NO")} kr`;
}

// Requests
function renderRequests() {
  const cont = $("#requests-container");
  if (!requests.length) {
    cont.innerHTML =
      '<p style="font-size:13px;color:var(--fg-soft);">Ingen forespørsler enda.</p>';
    return;
  }
  cont.innerHTML = requests
    .map((r) => {
      const dateStr = r.created_at
        ? new Date(r.created_at).toLocaleString("no-NO")
        : "";
      const title = r.items?.title || "Ukjent vare";
      return `
      <article class="request-card">
        <div class="request-meta">
          ${escapeHtml(title)} · ${dateStr}<br>
          ${r.buyer_name ? escapeHtml(r.buyer_name) : ""} ${
        r.buyer_email ? "· " + escapeHtml(r.buyer_email) : ""
      } ${r.buyer_phone ? "· " + escapeHtml(r.buyer_phone) : ""}
        </div>
        <div>${r.message ? escapeHtml(r.message) : "<i>Ingen melding</i>"}</div>
      </article>
    `;
    })
    .join("");
}

// Share link
function shareItemLink(itemId) {
  const url = new URL(window.location.href);
  url.searchParams.set("item", itemId);
  const link = url.toString();

  if (navigator.share) {
    navigator
      .share({ title: "SVINN – vare", url: link })
      .catch(() => {});
  } else {
    navigator.clipboard.writeText(link).catch(() => {});
    alert("Lenke kopiert til utklippstavle:\n" + link);
  }
}

// File -> base64 preview
$("#item-image")?.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    $("#item-image-preview").classList.remove("hidden");
    $("#item-image-preview").innerHTML =
      '<img src="' + reader.result + '" alt="Forhåndsvisning" />';
  };
  reader.readAsDataURL(file);
});

// View switching
function switchView(v) {
  currentView = v;
  $$("#admin-nav .nav-pill").forEach((btn) => {
    btn.classList.toggle(
      "nav-pill-active",
      btn.getAttribute("data-view") === v
    );
  });
  ["market", "list", "overview", "requests"].forEach((id) => {
    $("#" + id + "-view").classList.toggle("active-view", id === v);
  });
  if (v === "requests") loadRequests();
}

// Filter tabs
function setupTabs() {
  $$(".tab-pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentFilter = btn.getAttribute("data-filter");
      $$(".tab-pill").forEach((b) =>
        b.classList.toggle("tab-active", b === btn)
      );
      renderAll();
    });
  });
}

// Utils
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// INIT
function initEvents() {
  $("#theme-toggle").addEventListener("click", toggleTheme);

  $("#login-btn").addEventListener("click", handleLoginClick);
  $("#login-cancel").addEventListener("click", () =>
    hideModal("#login-modal")
  );
  $("#login-submit").addEventListener("click", performLogin);

  $("#fab-add").addEventListener("click", openNewItemModal);
  $("#item-cancel").addEventListener("click", () =>
    hideModal("#item-modal")
  );
  $("#item-save").addEventListener("click", saveItemFromForm);
  $("#item-delete").addEventListener("click", deleteCurrentItem);

  $("#details-close").addEventListener("click", () =>
    hideModal("#details-modal")
  );
  $("#req-send").addEventListener("click", sendRequestForCurrentItem);

  $("#search-input").addEventListener("input", () => renderAll());

  $$("#admin-nav .nav-pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      const v = btn.getAttribute("data-view");
      switchView(v);
    });
  });

  setupTabs();
}

async function initFromDeepLink() {
  const url = new URL(window.location.href);
  const itemId = url.searchParams.get("item");
  if (itemId) {
    // vent litt til items er lastet
    const check = setInterval(() => {
      if (items.length) {
        clearInterval(check);
        openDetailsModal(itemId);
      }
    }, 300);
  }
}

async function init() {
  loadTheme();
  initEvents();
  await checkSession();
  await loadItems();
  await initFromDeepLink();
}

init();
