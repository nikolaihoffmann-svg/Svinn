import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// KONFIG – Supabase
const SUPABASE_URL = "https://biuiczsfripiytmyskub.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpdWljenNmcmlwaXl0bXlza3ViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3NzgwMzgsImV4cCI6MjA3OTM1NDAzOH0.kWIX7PK420YeBvZQsPcerYEZfPYrUpsSa8uHLTEUE3g";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Små DOM-helpers
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

// STATE
let currentUser = null;
let items = [];
let requests = [];
let currentFilter = "sale"; // sale | sold | all
let currentCategory = null;
let currentView = "market"; // market | list | overview | requests
let editingItemId = null;
let currentDetailsItemId = null;

// bilder som er valgt i "Ny/rediger" (dataURLs)
let currentImageDataUrls = [];

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
  if (!btn) return;
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
  const loginBtn = $("#login-btn");
  if (loginBtn) loginBtn.textContent = loggedIn ? "Logg ut" : "Logg inn";

  const adminNav = $("#admin-nav");
  const fab = $("#fab-add");
  if (adminNav) adminNav.classList.toggle("hidden", !loggedIn);
  if (fab) fab.classList.toggle("hidden", !loggedIn);

  // gjester = alltid på salgssiden
  if (!loggedIn) switchView("market");
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

// ------- DATA: ITEMS -------

async function loadItems() {
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Feil ved henting av items:", error);
    items = [];
    renderAll();
    return;
  }
  items = data || [];
  renderAll();
}

// Hjelper: parse én eller flere bilder ut fra image_url
// - Hvis image_url er JSON-array -> returnerer array
// - Hvis det er vanlig streng -> returnerer [streng]
function parseImages(image_url) {
  if (!image_url) return [];
  if (image_url.trim().startsWith("[")) {
    try {
      const arr = JSON.parse(image_url);
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      console.warn("Klarte ikke å parse images JSON", e);
      return [];
    }
  }
  return [image_url];
}

// Når vi lagrer: hvis flere bilder -> lagre som JSON i image_url
function encodeImagesForStorage(imagesArr) {
  if (!imagesArr || imagesArr.length === 0) return null;
  if (imagesArr.length === 1) return imagesArr[0];
  return JSON.stringify(imagesArr);
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

  const image_url = encodeImagesForStorage(currentImageDataUrls);

  const payload = {
    title,
    price,
    category,
    category_key: category ? category.toLowerCase() : null,
    location,
    description,
    is_sold: markSold,
    image_url,
  };

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

  const { error } = await supabase
    .from("items")
    .delete()
    .eq("id", editingItemId);

  if (error) {
    alert("Kunne ikke slette: " + error.message);
    return;
  }
  hideModal("#item-modal");
  editingItemId = null;
  await loadItems();
}

// ----- Ny / rediger vare -----

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

  currentImageDataUrls = [];
  const preview = $("#item-images-preview");
  preview.classList.add("hidden");
  preview.innerHTML = "";

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

  const images = parseImages(it.image_url);
  currentImageDataUrls = images;

  const preview = $("#item-images-preview");
  if (images.length) {
    preview.classList.remove("hidden");
    preview.innerHTML = images
      .map(
        (src) =>
          `<div class="preview-thumb"><img src="${src}" alt="Forhåndsvisning" /></div>`
      )
      .join("");
  } else {
    preview.classList.add("hidden");
    preview.innerHTML = "";
  }

  $("#item-delete").classList.remove("hidden");
  showModal("#item-modal");
}

// Flere-bilder file-input
const imagesInput = $("#item-images");
if (imagesInput) {
  imagesInput.addEventListener("change", (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    currentImageDataUrls = [];
    const readerPromises = files.map(
      (file) =>
        new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(file);
        })
    );

    Promise.all(readerPromises).then((results) => {
      currentImageDataUrls = results;
      const preview = $("#item-images-preview");
      preview.classList.remove("hidden");
      preview.innerHTML = results
        .map(
          (src) =>
            `<div class="preview-thumb"><img src="${src}" alt="Forhåndsvisning" /></div>`
        )
        .join("");
    });
  });
}

async function toggleSold(itemId, makeSold) {
  const { error } = await supabase
    .from("items")
    .update({
      is_sold: makeSold,
      sold_at: makeSold ? new Date().toISOString() : null,
    })
    .eq("id", itemId);

  if (error) {
    alert("Feil ved oppdatering: " + error.message);
    return;
  }
  await loadItems();
}

// ------- REQUESTS -------

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

// ------- RENDERING -------

function applyFilterAndSearch(list) {
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
  const filtered = applyFilterAndSearch(items);
  if (!filtered.length) {
    cont.innerHTML =
      '<p style="font-size:13px;color:var(--fg-soft);margin-top:8px;">Ingen varer.</p>';
    return;
  }
  cont.innerHTML = filtered.map((it) => renderItemCard(it, false)).join("");
  attachCardHandlers(cont, false);
}

function renderItemsForAdmin() {
  const cont = $("#admin-items-container");
  const filtered = applyFilterAndSearch(items);
  if (!filtered.length) {
    cont.innerHTML =
      '<p style="font-size:13px;color:var(--fg-soft);margin-top:8px;">Ingen varer i listen.</p>';
    return;
  }
  cont.innerHTML = filtered.map((it) => renderItemCard(it, true)).join("");
  attachCardHandlers(cont, true);
}

function renderItemCard(it, isAdmin) {
  const statusBadge = it.is_sold
    ? '<span class="badge badge-red">Solgt</span>'
    : '<span class="badge badge-green">Til salgs</span>';

  const priceText =
    it.price != null ? `${it.price.toLocaleString("no-NO")} kr` : "Gi bud";

  const images = parseImages(it.image_url);
  const mainImage = images[0] || null;

  const imageHtml = mainImage
    ? `<div class="image-thumb"><img src="${mainImage}" alt="Bilde av ${escapeHtml(
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

// ------- Detaljer med galleri -------

function openDetailsModal(itemId) {
  const it = items.find((i) => i.id === itemId);
  if (!it) return;
  currentDetailsItemId = itemId;

  const images = parseImages(it.image_url);
  const mainImage = images[0] || null;
  const thumbs = images.slice(1);

  const priceText =
    it.price != null ? `${it.price.toLocaleString("no-NO")} kr` : "Gi bud";
  const dateStr = it.created_at
    ? new Date(it.created_at).toLocaleDateString("no-NO")
    : "";
  const soldStr =
    it.is_sold && it.sold_at
      ? "Solgt: " + new Date(it.sold_at).toLocaleDateString("no-NO")
      : "";

  const mainImageHtml = mainImage
    ? `<div class="details-main-image">
         <img src="${mainImage}" alt="Bilde av ${escapeHtml(it.title || "")}" />
       </div>`
    : "";

  const thumbsHtml =
    images.length > 1
      ? `<div class="details-thumbs">
           ${images
             .map(
               (src, index) => `
             <button class="thumb-btn${
               index === 0 ? " thumb-btn-active" : ""
             }" data-index="${index}">
               <img src="${src}" alt="Bilde ${index + 1}" />
             </button>`
             )
             .join("")}
         </div>`
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
    ${mainImageHtml}
    ${thumbsHtml}
  `;

  // koble thumbnails til hovedbilde
  const mainImgEl = $("#details-content .details-main-image img");
  const thumbBtns = Array.from(
    $("#details-content").querySelectorAll(".thumb-btn")
  );

  thumbBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = parseInt(btn.getAttribute("data-index"), 10);
      if (!isNaN(idx) && images[idx] && mainImgEl) {
        mainImgEl.src = images[idx];
      }
      thumbBtns.forEach((b) => b.classList.remove("thumb-btn-active"));
      btn.classList.add("thumb-btn-active");
    });
  });

  showModal("#details-modal");
}

// ------- Kategorier & oversikt -------

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
  const chips = [
    `<button class="category-chip${
      currentCategory === null ? " category-chip-active" : ""
    }" data-cat="__ALL__">Alle kategorier</button>`,
  ];
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
      '<p style="font-size:13px;color:var(--fg-soft);margin-top:8px;">Ingen forespørsler enda.</p>';
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

// Del-lenke
function shareItemLink(itemId) {
  const url = new URL(window.location.href);
  url.searchParams.set("item", itemId);
  const link = url.toString();

  if (navigator.share) {
    navigator.share({ title: "EkstraVerdi – vare", url: link }).catch(() => {});
  } else {
    navigator.clipboard.writeText(link).catch(() => {});
    alert("Lenke kopiert til utklippstavle:\n" + link);
  }
}

// VIEW / TABS

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
  $("#theme-toggle")?.addEventListener("click", toggleTheme);

  $("#login-btn")?.addEventListener("click", handleLoginClick);
  $("#login-cancel")?.addEventListener("click", () =>
    hideModal("#login-modal")
  );
  $("#login-submit")?.addEventListener("click", performLogin);

  $("#fab-add")?.addEventListener("click", openNewItemModal);
  $("#item-cancel")?.addEventListener("click", () =>
    hideModal("#item-modal")
  );
  $("#item-save")?.addEventListener("click", saveItemFromForm);
  $("#item-delete")?.addEventListener("click", deleteCurrentItem);

  $("#details-close")?.addEventListener("click", () =>
    hideModal("#details-modal")
  );
  $("#req-send")?.addEventListener("click", sendRequestForCurrentItem);

  $("#search-input")?.addEventListener("input", () => renderAll());

  $$("#admin-nav .nav-pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      const v = btn.getAttribute("data-view");
      switchView(v);
    });
  });

  setupTabs();
}

// Deep-link på ?item=ID
async function initFromDeepLink() {
  const url = new URL(window.location.href);
  const itemId = url.searchParams.get("item");
  if (itemId) {
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
