// EkstraVerdi – frontend med Supabase-auth + lokale annonser

// ---- Supabase-konfig ----
const SUPABASE_URL = "https://biuiczsfripiytmyskub.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY_HERE"; // <-- LIM INN ANON KEY HER

let supabaseClient = null; // blir satt inni DOMContentLoaded

window.addEventListener("DOMContentLoaded", function () {
  const STORAGE_KEY = "ekstraverdi_ads_v2";
  const THEME_KEY = "ekstraverdi_theme";

  // Prøv å lage Supabase-klient uten å krasje hele appen
  if (window.supabase && typeof window.supabase.createClient === "function") {
    try {
      supabaseClient = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
      );
    } catch (e) {
      supabaseClient = null;
    }
  }

  // ---- DOM-elementer ----
  const navTabs = document.querySelectorAll(".nav-tab");
  const adminTabs = document.querySelectorAll(".admin-tab");
  const filterSection = document.getElementById("filterSection");
  const contentArea = document.getElementById("contentArea");
  const searchInput = document.getElementById("searchInput");
  const statusChips = document.querySelectorAll("[data-status]");
  const fabAdd = document.getElementById("fabAdd");
  const adminBtn = document.getElementById("adminBtn");
  const themeToggle = document.getElementById("themeToggle");

  const newAdModal = document.getElementById("newAdModal");
  const newAdForm = document.getElementById("newAdForm");
  const adModalTitle = document.getElementById("adModalTitle");
  const adSubmitBtn = document.getElementById("adSubmitBtn");
  const imagesInput = document.getElementById("images");
  const imagePreviewList = document.getElementById("newAdImagePreview");

  const adminLoginModal = document.getElementById("adminLoginModal");
  const adminLoginForm = document.getElementById("adminLoginForm");
  const adminEmailInput = document.getElementById("adminEmail");
  const adminPasswordInput = document.getElementById("adminPassword");
  const adminError = document.getElementById("adminError");

  const detailModal = document.getElementById("detailModal");
  const detailTitle = document.getElementById("detailTitle");
  const detailMainImage = document.getElementById("detailMainImage");
  const detailThumbs = document.getElementById("detailThumbs");
  const detailPrice = document.getElementById("detailPrice");
  const detailStatus = document.getElementById("detailStatus");
  const detailMeta = document.getElementById("detailMeta");
  const detailDescription = document.getElementById("detailDescription");
  const detailExtra = document.getElementById("detailExtra");
  const detailTags = document.getElementById("detailTags");

  // ---- state ----
  let currentView = "sales"; // "sales" | "admin" | "overview"
  let filterStatus = "til-salgs";
  let searchTerm = "";
  let newAdImageFiles = [];
  let editingAdId = null;
  let isAdmin = false;

  // ---------------- STORAGE (annonser lokalt) ----------------

  function loadAds() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function saveAds() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ads));
    } catch (e) {
      // ignorér
    }
  }

  let ads = loadAds();

  // ---------------- TEMA ----------------

  function applyTheme(theme) {
    if (theme === "dark") {
      document.body.classList.add("dark-theme");
      if (themeToggle) themeToggle.textContent = "Lys modus";
    } else {
      document.body.classList.remove("dark-theme");
      if (themeToggle) themeToggle.textContent = "Mørk modus";
    }
  }

  function loadTheme() {
    let t = null;
    try {
      t = localStorage.getItem(THEME_KEY);
    } catch (e) {}
    if (t === "dark" || t === "light") applyTheme(t);
    else applyTheme("light");
  }

  loadTheme();

  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      const isDark = document.body.classList.contains("dark-theme");
      const next = isDark ? "light" : "dark";
      applyTheme(next);
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch (e) {}
    });
  }

  // ---------------- ADMIN / AUTH (Supabase) ----------------

  function updateAdminUI() {
    if (adminBtn) {
      adminBtn.textContent = isAdmin ? "Logg ut admin" : "Logg inn som admin";
    }
    // Skjul admin-faner når ikke innlogget
    adminTabs.forEach(function (tab) {
      tab.style.display = isAdmin ? "" : "none";
    });
    if (!isAdmin && (currentView === "admin" || currentView === "overview")) {
      setView("sales");
    }
  }

  async function initAuthFromSupabase() {
    if (!supabaseClient) {
      isAdmin = false;
      updateAdminUI();
      return;
    }
    try {
      const { data } = await supabaseClient.auth.getSession();
      isAdmin = !!(data && data.session);
    } catch (e) {
      isAdmin = false;
    }
    updateAdminUI();
  }

  initAuthFromSupabase();

  if (adminBtn) {
    adminBtn.addEventListener("click", async function () {
      if (isAdmin) {
        // Logg ut
        if (supabaseClient) {
          try {
            await supabaseClient.auth.signOut();
          } catch (e) {}
        }
        isAdmin = false;
        updateAdminUI();
      } else {
        // Vis login-modal
        adminEmailInput.value = "";
        adminPasswordInput.value = "";
        adminError.style.display = "none";
        openModal(adminLoginModal);
      }
    });
  }

  adminLoginForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    adminError.style.display = "none";

    if (!supabaseClient) {
      adminError.textContent =
        "Innlogging er ikke satt opp (Supabase-klienten mangler).";
      adminError.style.display = "block";
      return;
    }

    const email = adminEmailInput.value.trim();
    const password = adminPasswordInput.value;

    try {
      const result = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (result.error) {
        adminError.textContent =
          "Feil e-post eller passord: " + result.error.message;
        adminError.style.display = "block";
        return;
      }

      isAdmin = true;
      updateAdminUI();
      closeModal(adminLoginModal);
      setView("admin");
    } catch (err) {
      adminError.textContent =
        "Kunne ikke logge inn (nettverksfeil eller lignende).";
      adminError.style.display = "block";
    }
  });

  // ---------------- MODAL-HJELPERE ----------------

  function openModal(el) {
    if (!el) return;
    el.classList.add("show");
  }

  function closeModal(el) {
    if (!el) return;
    el.classList.remove("show");
  }

  document.querySelectorAll("[data-close-modal]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      const modal = btn.closest(".modal-backdrop");
      closeModal(modal);
    });
  });

  [newAdModal, detailModal, adminLoginModal].forEach(function (modal) {
    if (!modal) return;
    modal.addEventListener("click", function (e) {
      if (e.target === modal) closeModal(modal);
    });
  });

  // ---------------- VIEW-BYTTING ----------------

  function setView(view) {
    if ((view === "admin" || view === "overview") && !isAdmin) {
      view = "sales";
    }
    currentView = view;

    navTabs.forEach(function (tab) {
      tab.classList.remove("nav-tab-active");
      if (tab.getAttribute("data-view") === view) {
        tab.classList.add("nav-tab-active");
      }
    });

    filterSection.style.display = view === "overview" ? "none" : "";
    renderCurrentView();
  }

  navTabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      const view = tab.getAttribute("data-view");
      setView(view);
    });
  });

  // ---------------- FILTER ----------------

  if (searchInput) {
    searchInput.addEventListener("input", function () {
      searchTerm = searchInput.value;
      renderCurrentView();
    });
  }

  statusChips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      statusChips.forEach(function (c) {
        c.classList.remove("filter-chip-active");
      });
      chip.classList.add("filter-chip-active");
      filterStatus = chip.getAttribute("data-status");
      renderCurrentView();
    });
  });

  // ---------------- NY ANNONSE / FAB ----------------

  fabAdd.addEventListener("click", function () {
    editingAdId = null;
    adModalTitle.textContent = "Ny annonse";
    adSubmitBtn.textContent = "Lagre annonse";
    newAdForm.reset();
    newAdImageFiles = [];
    imagePreviewList.innerHTML = "";
    openModal(newAdModal);
  });

  // Bildepreview i annonseskjema
  if (imagesInput) {
    imagesInput.addEventListener("change", function () {
      const files = Array.from(imagesInput.files || []);
      newAdImageFiles = files;
      imagePreviewList.innerHTML = "";
      files.forEach(function (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
          const div = document.createElement("div");
          div.className = "image-preview-item";
          const img = document.createElement("img");
          img.src = e.target.result;
          div.appendChild(img);
          imagePreviewList.appendChild(div);
        };
        reader.readAsDataURL(file);
      });
    });
  }

  // ---------------- LAGRE / REDIGERE ANNONSE ----------------

  newAdForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const title = document.getElementById("title").value.trim();
    const priceVal = document.getElementById("price").value.trim();
    const buyer = document.getElementById("buyer").value.trim();
    const category = document.getElementById("category").value.trim();
    const locationVal = document.getElementById("location").value.trim();
    const description = document.getElementById("description").value.trim();

    const promises = newAdImageFiles.map(function (file) {
      return new Promise(function (resolve) {
        const reader = new FileReader();
        reader.onload = function (evt) {
          resolve(evt.target.result);
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(promises).then(function (images) {
      if (editingAdId) {
        // Oppdater eksisterende annonse
        const ad = ads.find(function (a) {
          return a.id === editingAdId;
        });
        if (ad) {
          ad.title = title;
          ad.price = priceVal ? Number(priceVal) : null;
          ad.buyer = buyer || null;
          ad.category = category || null;
          ad.location = locationVal || null;
          ad.description = description || "";
          if (newAdImageFiles.length > 0) ad.images = images;
          saveAds();
        }
      } else {
        // Ny annonse
        const newAd = {
          id: Date.now().toString(),
          title: title,
          price: priceVal ? Number(priceVal) : null,
          buyer: buyer || null,
          category: category || null,
          location: locationVal || null,
          description: description || "",
          status: "til-salgs",
          images: images,
          createdAt: new Date().toISOString()
        };
        ads.unshift(newAd);
        saveAds();
      }

      editingAdId = null;
      closeModal(newAdModal);
      setView(isAdmin ? "admin" : "sales");
    });
  });

  // ---------------- HJELPEFUNKSJONER ----------------

  function timeAgo(iso) {
    const d = new Date(iso);
    const diffMs = Date.now() - d.getTime();
    const mins = Math.floor(diffMs / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    if (mins < 1) return "akkurat nå";
    if (mins < 60) return mins + " min siden";
    if (hours < 24) return hours + " t siden";
    if (days === 1) return "i går";
    return days + " dager siden";
  }

  function formatDateLong(iso) {
    const d = new Date(iso);
    return d.toLocaleString("nb-NO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function formatCurrency(n) {
    return n.toLocaleString("nb-NO") + " kr";
  }

  function filterAdsForList() {
    return ads.filter(function (ad) {
      if (filterStatus !== "alle" && ad.status !== filterStatus) return false;
      if (!searchTerm) return true;
      const text =
        (ad.title || "") +
        " " +
        (ad.description || "") +
        " " +
        (ad.category || "") +
        " " +
        (ad.location || "");
      return text.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }

  // ---------------- RENDER LISTE ----------------

  function renderList(isAdminList) {
    const list = filterAdsForList();

    if (!list.length) {
      contentArea.innerHTML =
        '<p class="help-text">Ingen annonser som matcher filtrene.</p>';
      return;
    }

    contentArea.innerHTML = "";
    list.forEach(function (ad) {
      const card = document.createElement("article");
      card.className = "ad-card";

      const thumb = document.createElement("div");
      thumb.className = "ad-thumb";
      if (ad.images && ad.images.length) {
        const img = document.createElement("img");
        img.src = ad.images[0];
        img.alt = ad.title;
        thumb.appendChild(img);
      }
      card.appendChild(thumb);

      const info = document.createElement("div");
      info.className = "ad-info";

      const titleRow = document.createElement("div");
      titleRow.className = "ad-title-row";

      const titleEl = document.createElement("div");
      titleEl.className = "ad-title";
      titleEl.textContent = ad.title;

      const priceEl = document.createElement("div");
      priceEl.className = "ad-price";
      priceEl.textContent =
        ad.price != null ? formatCurrency(ad.price) : "Gi bud";

      titleRow.appendChild(titleEl);
      titleRow.appendChild(priceEl);

      const meta = document.createElement("div");
      meta.className = "ad-meta";
      const statusText =
        ad.status === "til-salgs"
          ? "til salgs"
          : ad.status === "reservert"
          ? "reservert"
          : "solgt";
      meta.textContent =
        statusText + " · Lagt ut: " + formatDateLong(ad.createdAt);

      const tags = document.createElement("div");
      tags.className = "ad-tags";

      const stTag = document.createElement("span");
      stTag.className =
        "tag-pill tag-pill-status-" + ad.status.replace(" ", "-");
      stTag.textContent =
        ad.status === "til-salgs"
          ? "Til salgs"
          : ad.status === "reservert"
          ? "Reservert"
          : "Solgt";
      tags.appendChild(stTag);

      if (ad.category) {
        const catTag = document.createElement("span");
        catTag.className = "tag-pill";
        catTag.textContent = ad.category;
        tags.appendChild(catTag);
      }

      if (ad.location) {
        const locTag = document.createElement("span");
        locTag.className = "tag-pill";
        locTag.textContent = ad.location;
        tags.appendChild(locTag);
      }

      const footer = document.createElement("div");
      footer.className = "ad-footer";

      const footerLeft = document.createElement("div");
      footerLeft.className = "ad-footer-left";

      const btnDetails = document.createElement("button");
      btnDetails.type = "button";
      btnDetails.className = "btn-link";
      btnDetails.textContent = "Detaljer";
      btnDetails.addEventListener("click", function () {
        openDetail(ad);
      });
      footerLeft.appendChild(btnDetails);

      if (!isAdminList) {
        const btnShare = document.createElement("button");
        btnShare.type = "button";
        btnShare.className = "btn-link";
        btnShare.textContent = "Del lenke";
        btnShare.addEventListener("click", function () {
          shareAd(ad);
        });
        footerLeft.appendChild(btnShare);
      }

      const timeEl = document.createElement("div");
      timeEl.className = "time-ago";
      timeEl.textContent = timeAgo(ad.createdAt);

      footer.appendChild(footerLeft);
      footer.appendChild(timeEl);

      info.appendChild(titleRow);
      info.appendChild(meta);
      info.appendChild(tags);
      info.appendChild(footer);

      // ADMIN-KONTROLLER
      if (isAdminList) {
        const adminControls = document.createElement("div");
        adminControls.className = "admin-controls";

        const statusSelect = document.createElement("select");
        statusSelect.className = "admin-status-select";
        [
          { value: "til-salgs", label: "Til salgs" },
          { value: "reservert", label: "Reservert" },
          { value: "solgt", label: "Solgt" }
        ].forEach(function (cfg) {
          const opt = document.createElement("option");
          opt.value = cfg.value;
          opt.textContent = cfg.label;
          if (cfg.value === ad.status) opt.selected = true;
          statusSelect.appendChild(opt);
        });
        statusSelect.addEventListener("change", function () {
          ad.status = statusSelect.value;
          saveAds();
          renderCurrentView();
        });

        const editBtn = document.createElement("button");
        editBtn.type = "button";
        editBtn.className = "btn-link";
        editBtn.textContent = "Rediger";
        editBtn.addEventListener("click", function () {
          openEditAd(ad);
        });

        const deleteBtn = document.createElement("button");
        deleteBtn.type = "button";
        deleteBtn.className = "btn-small-danger";
        deleteBtn.textContent = "Slett";
        deleteBtn.addEventListener("click", function () {
          if (window.confirm("Slette denne annonsen?")) {
            ads = ads.filter(function (a) {
              return a.id !== ad.id;
            });
            saveAds();
            renderCurrentView();
          }
        });

        adminControls.appendChild(statusSelect);
        adminControls.appendChild(editBtn);
        adminControls.appendChild(deleteBtn);
        info.appendChild(adminControls);
      }

      card.appendChild(thumb);
      card.appendChild(info);
      contentArea.appendChild(card);
    });
  }

  // ---------------- OVERSIKT ----------------

  function renderOverview() {
    const totalCount = ads.length;
    let sumTilSalgs = 0;
    let sumReservert = 0;
    let sumSolgt = 0;
    let countReservert = 0;

    ads.forEach(function (ad) {
      if (ad.price == null) return;
      if (ad.status === "til-salgs") sumTilSalgs += ad.price;
      else if (ad.status === "reservert") {
        sumReservert += ad.price;
        countReservert++;
      } else if (ad.status === "solgt") {
        sumSolgt += ad.price;
      }
    });

    let html = "";
    html += '<div class="overview-grid">';

    html += '<div class="overview-card">';
    html += '<div class="overview-title">Totalt antall annonser</div>';
    html += '<div class="overview-value">' + totalCount + "</div>";
    html += "</div>";

    html += '<div class="overview-card">';
    html += '<div class="overview-title">Verdi til salgs</div>';
    html +=
      '<div class="overview-value">' + formatCurrency(sumTilSalgs) + "</div>";
    html += '<div class="overview-sub">Prisfelt må være fylt inn</div>';
    html += "</div>";

    html += '<div class="overview-card">';
    html += '<div class="overview-title">Reserverte ordre</div>';
    html += '<div class="overview-value">' + countReservert + "</div>";
    html +=
      '<div class="overview-sub">Sum pris: ' +
      formatCurrency(sumReservert) +
      "</div>";
    html += "</div>";

    html += '<div class="overview-card">';
    html += '<div class="overview-title">Totalt tjent (solgt)</div>';
    html +=
      '<div class="overview-value">' + formatCurrency(sumSolgt) + "</div>";
    html += "</div>";

    html += "</div>";

    contentArea.innerHTML = html;
  }

  // ---------------- DETALJMODAL ----------------

  function openDetail(ad) {
    detailTitle.textContent = ad.title;
    detailPrice.textContent =
      ad.price != null ? formatCurrency(ad.price) : "Gi bud";
    detailStatus.textContent =
      ad.status === "til-salgs"
        ? "Til salgs"
        : ad.status === "reservert"
        ? "Reservert"
        : "Solgt";
    detailMeta.textContent = "Lagt ut " + formatDateLong(ad.createdAt);
    detailDescription.textContent =
      ad.description || "Ingen beskrivelse lagt inn.";

    const extraParts = [];
    if (ad.buyer) extraParts.push("Kjøper: " + ad.buyer);
    if (ad.location) extraParts.push("Lagerplass: " + ad.location);
    detailExtra.textContent = extraParts.join(" • ");

    detailTags.innerHTML = "";
    if (ad.category) {
      const tag = document.createElement("span");
      tag.className = "tag-pill";
      tag.textContent = ad.category;
      detailTags.appendChild(tag);
    }

    detailThumbs.innerHTML = "";
    if (ad.images && ad.images.length) {
      detailMainImage.src = ad.images[0];
      ad.images.forEach(function (src, idx) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "detail-thumb" + (idx === 0 ? " active" : "");
        const img = document.createElement("img");
        img.src = src;
        btn.appendChild(img);
        btn.addEventListener("click", function () {
          detailMainImage.src = src;
          Array.from(detailThumbs.children).forEach(function (c) {
            c.classList.remove("active");
          });
          btn.classList.add("active");
        });
        detailThumbs.appendChild(btn);
      });
    } else {
      detailMainImage.src = "";
    }

    openModal(detailModal);
  }

  function shareAd(ad) {
    if (navigator.share) {
      navigator
        .share({
          title: ad.title,
          text: "Sjekk denne annonsen",
          url: window.location.href
        })
        .catch(function () {});
    } else {
      alert("Kopier lenken i adressefeltet for å dele.");
    }
  }

  function openEditAd(ad) {
    editingAdId = ad.id;
    adModalTitle.textContent = "Rediger annonse";
    adSubmitBtn.textContent = "Lagre endringer";

    document.getElementById("title").value = ad.title || "";
    document.getElementById("price").value =
      ad.price != null ? String(ad.price) : "";
    document.getElementById("buyer").value = ad.buyer || "";
    document.getElementById("category").value = ad.category || "";
    document.getElementById("location").value = ad.location || "";
    document.getElementById("description").value = ad.description || "";

    newAdImageFiles = [];
    imagePreviewList.innerHTML = "";
    if (ad.images && ad.images.length) {
      ad.images.forEach(function (src) {
        const div = document.createElement("div");
        div.className = "image-preview-item";
        const img = document.createElement("img");
        img.src = src;
        div.appendChild(img);
        imagePreviewList.appendChild(div);
      });
    }

    openModal(newAdModal);
  }

  // ---------------- RENDER CURRENT VIEW ----------------

  function renderCurrentView() {
    if (currentView === "overview") renderOverview();
    else if (currentView === "admin") renderList(true);
    else renderList(false);
  }

  // Init
  updateAdminUI();
  setView("sales");
});
