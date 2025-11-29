// Enkel JS – med admin-login, dag/natt og mulighet for å redigere annonser

window.addEventListener("DOMContentLoaded", function () {
  var STORAGE_KEY = "ekstraverdi_ads_v2";
  var ADMIN_KEY = "ekstraverdi_isAdmin";
  var THEME_KEY = "ekstraverdi_theme";

  var navTabs = document.querySelectorAll(".nav-tab");
  var adminTabs = document.querySelectorAll(".admin-tab");
  var filterSection = document.getElementById("filterSection");
  var contentArea = document.getElementById("contentArea");
  var searchInput = document.getElementById("searchInput");
  var statusChips = document.querySelectorAll("[data-status]");
  var fabAdd = document.getElementById("fabAdd");
  var adminBtn = document.getElementById("adminBtn");
  var themeToggle = document.getElementById("themeToggle");

  var newAdModal = document.getElementById("newAdModal");
  var newAdForm = document.getElementById("newAdForm");
  var adModalTitle = document.getElementById("adModalTitle");
  var adSubmitBtn = document.getElementById("adSubmitBtn");
  var imagesInput = document.getElementById("images");
  var imagePreviewList = document.getElementById("newAdImagePreview");

  var detailModal = document.getElementById("detailModal");
  var detailTitle = document.getElementById("detailTitle");
  var detailMainImage = document.getElementById("detailMainImage");
  var detailThumbs = document.getElementById("detailThumbs");
  var detailPrice = document.getElementById("detailPrice");
  var detailStatus = document.getElementById("detailStatus");
  var detailMeta = document.getElementById("detailMeta");
  var detailDescription = document.getElementById("detailDescription");
  var detailExtra = document.getElementById("detailExtra");
  var detailTags = document.getElementById("detailTags");

  var currentView = "sales"; // sales | admin | overview
  var filterStatus = "til-salgs"; // til-salgs | reservert | solgt | alle
  var searchTerm = "";
  var newAdImageFiles = [];
  var editingAdId = null;
  var isAdmin = false;

  // ------- STORAGE -------

  function loadAds() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      if (Object.prototype.toString.call(parsed) === "[object Array]") {
        return parsed;
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  function saveAds() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ads));
    } catch (e) {}
  }

  var ads = loadAds();

  // ------- ADMIN STATE -------

  function loadAdminState() {
    try {
      return localStorage.getItem(ADMIN_KEY) === "1";
    } catch (e) {
      return false;
    }
  }

  function saveAdminState() {
    try {
      localStorage.setItem(ADMIN_KEY, isAdmin ? "1" : "0");
    } catch (e) {}
  }

  function updateAdminUI() {
    if (adminBtn) {
      adminBtn.textContent = isAdmin ? "Logg ut admin" : "Logg inn som admin";
    }

    for (var i = 0; i < adminTabs.length; i++) {
      adminTabs[i].style.display = isAdmin ? "" : "none";
    }

    if (!isAdmin && (currentView === "admin" || currentView === "overview")) {
      setView("sales");
    }
  }

  isAdmin = loadAdminState();
  updateAdminUI();

  if (adminBtn) {
    adminBtn.addEventListener("click", function () {
      if (isAdmin) {
        isAdmin = false;
        saveAdminState();
        updateAdminUI();
      } else {
        var ok = window.confirm("Logge inn som admin?");
        if (!ok) return;
        isAdmin = true;
        saveAdminState();
        updateAdminUI();
      }
    });
  }

  // ------- THEME -------

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
    try {
      var t = localStorage.getItem(THEME_KEY);
      if (t === "dark" || t === "light") {
        applyTheme(t);
      } else {
        applyTheme("light");
      }
    } catch (e) {
      applyTheme("light");
    }
  }

  loadTheme();

  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      var isDark = document.body.classList.contains("dark-theme");
      var next = isDark ? "light" : "dark";
      applyTheme(next);
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch (e) {}
    });
  }

  // ------- MODAL HJELP -------

  function openModal(el) {
    if (!el) return;
    el.classList.add("show");
  }

  function closeModal(el) {
    if (!el) return;
    el.classList.remove("show");
  }

  var closeBtns = document.querySelectorAll("[data-close-modal]");
  for (var i = 0; i < closeBtns.length; i++) {
    (function (btn) {
      btn.addEventListener("click", function () {
        var modal = btn.closest(".modal-backdrop");
        closeModal(modal);
      });
    })(closeBtns[i]);
  }

  [newAdModal, detailModal].forEach(function (modal) {
    if (!modal) return;
    modal.addEventListener("click", function (e) {
      if (e.target === modal) {
        closeModal(modal);
      }
    });
  });

  // ------- VIEW-BYTTER -------

  function setView(view) {
    if ((view === "admin" || view === "overview") && !isAdmin) {
      view = "sales";
    }

    currentView = view;

    for (var i = 0; i < navTabs.length; i++) {
      navTabs[i].classList.remove("nav-tab-active");
      if (navTabs[i].getAttribute("data-view") === view) {
        navTabs[i].classList.add("nav-tab-active");
      }
    }

    if (view === "overview") {
      filterSection.style.display = "none";
    } else {
      filterSection.style.display = "";
    }

    renderCurrentView();
  }

  for (var t = 0; t < navTabs.length; t++) {
    (function (tab) {
      tab.addEventListener("click", function () {
        var view = tab.getAttribute("data-view");
        setView(view);
      });
    })(navTabs[t]);
  }

  // ------- FILTER -------

  if (searchInput) {
    searchInput.addEventListener("input", function () {
      searchTerm = searchInput.value;
      renderCurrentView();
    });
  }

  for (var s = 0; s < statusChips.length; s++) {
    (function (chip) {
      chip.addEventListener("click", function () {
        for (var j = 0; j < statusChips.length; j++) {
          statusChips[j].classList.remove("filter-chip-active");
        }
        chip.classList.add("filter-chip-active");
        filterStatus = chip.getAttribute("data-status");
        renderCurrentView();
      });
    })(statusChips[s]);
  }

  // ------- FAB: NY ANNONSE -------

  fabAdd.addEventListener("click", function () {
    editingAdId = null;
    adModalTitle.textContent = "Ny annonse";
    adSubmitBtn.textContent = "Lagre annonse";
    newAdForm.reset();
    newAdImageFiles = [];
    imagePreviewList.innerHTML = "";
    openModal(newAdModal);
  });

  // ------- BILDEPREVIEW -------

  if (imagesInput) {
    imagesInput.addEventListener("change", function () {
      var files = Array.prototype.slice.call(imagesInput.files || []);
      newAdImageFiles = files;
      imagePreviewList.innerHTML = "";

      for (var i = 0; i < files.length; i++) {
        (function (file) {
          var reader = new FileReader();
          reader.onload = function (e) {
            var div = document.createElement("div");
            div.className = "image-preview-item";
            var img = document.createElement("img");
            img.src = e.target.result;
            div.appendChild(img);
            imagePreviewList.appendChild(div);
          };
          reader.readAsDataURL(file);
        })(files[i]);
      }
    });
  }

  // ------- NY / REDIGER ANNONSE SUBMIT -------

  newAdForm.addEventListener("submit", function (e) {
    e.preventDefault();

    var title = document.getElementById("title").value.trim();
    var priceVal = document.getElementById("price").value.trim();
    var buyer = document.getElementById("buyer").value.trim();
    var category = document.getElementById("category").value.trim();
    var locationVal = document.getElementById("location").value.trim();
    var description = document.getElementById("description").value.trim();

    var promises = [];
    for (var i = 0; i < newAdImageFiles.length; i++) {
      (function (file) {
        promises.push(
          new Promise(function (resolve) {
            var reader = new FileReader();
            reader.onload = function (evt) {
              resolve(evt.target.result);
            };
            reader.readAsDataURL(file);
          })
        );
      })(newAdImageFiles[i]);
    }

    Promise.all(promises).then(function (images) {
      if (editingAdId) {
        // oppdater eksisterende annonse
        var existing = null;
        for (var i = 0; i < ads.length; i++) {
          if (ads[i].id === editingAdId) {
            existing = ads[i];
            break;
          }
        }
        if (existing) {
          existing.title = title;
          existing.price = priceVal ? Number(priceVal) : null;
          existing.buyer = buyer || null;
          existing.category = category || null;
          existing.description = description || "";
          existing.location = locationVal || null;
          if (newAdImageFiles.length > 0) {
            existing.images = images;
          }
          saveAds();
        }
      } else {
        // ny annonse
        var ad = {
          id: Date.now().toString(),
          title: title,
          price: priceVal ? Number(priceVal) : null,
          buyer: buyer || null,
          category: category || null,
          description: description || "",
          location: locationVal || null,
          status: "til-salgs",
          images: images,
          createdAt: new Date().toISOString()
        };
        ads.unshift(ad);
        saveAds();
      }

      editingAdId = null;
      closeModal(newAdModal);
      setView(isAdmin ? "admin" : "sales");
    });
  });

  // ------- HJELPEFUNKSJONER -------

  function timeAgo(iso) {
    var d = new Date(iso);
    var diffMs = Date.now() - d.getTime();
    var mins = Math.floor(diffMs / 60000);
    var hours = Math.floor(mins / 60);
    var days = Math.floor(hours / 24);
    if (mins < 1) return "akkurat nå";
    if (mins < 60) return mins + " min siden";
    if (hours < 24) return hours + " t siden";
    if (days === 1) return "i går";
    return days + " dager siden";
  }

  function formatDateLong(iso) {
    var d = new Date(iso);
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
    var result = [];
    for (var i = 0; i < ads.length; i++) {
      var ad = ads[i];

      if (filterStatus !== "alle" && ad.status !== filterStatus) continue;

      if (searchTerm) {
        var text =
          (ad.title || "") +
          " " +
          (ad.description || "") +
          " " +
          (ad.category || "") +
          " " +
          (ad.location || "");
        if (text.toLowerCase().indexOf(searchTerm.toLowerCase()) === -1) continue;
      }

      result.push(ad);
    }
    return result;
  }

  // ------- RENDER LISTE (SALES + ADMIN) -------

  function renderList(isAdminList) {
    var list = filterAdsForList();

    if (!list.length) {
      contentArea.innerHTML =
        '<p class="help-text">Ingen annonser som matcher filtrene.</p>';
      return;
    }

    contentArea.innerHTML = "";
    for (var i = 0; i < list.length; i++) {
      (function (ad) {
        var card = document.createElement("article");
        card.className = "ad-card";

        var thumb = document.createElement("div");
        thumb.className = "ad-thumb";
        if (ad.images && ad.images.length) {
          var img = document.createElement("img");
          img.src = ad.images[0];
          img.alt = ad.title;
          thumb.appendChild(img);
        }
        card.appendChild(thumb);

        var info = document.createElement("div");
        info.className = "ad-info";

        var titleRow = document.createElement("div");
        titleRow.className = "ad-title-row";

        var titleEl = document.createElement("div");
        titleEl.className = "ad-title";
        titleEl.textContent = ad.title;

        var priceEl = document.createElement("div");
        priceEl.className = "ad-price";
        priceEl.textContent =
          ad.price != null ? formatCurrency(ad.price) : "Gi bud";

        titleRow.appendChild(titleEl);
        titleRow.appendChild(priceEl);

        var meta = document.createElement("div");
        meta.className = "ad-meta";
        var statusText =
          ad.status === "til-salgs"
            ? "til salgs"
            : ad.status === "reservert"
            ? "reservert"
            : "solgt";
        meta.textContent =
          statusText + " · Lagt ut: " + formatDateLong(ad.createdAt);

        var tags = document.createElement("div");
        tags.className = "ad-tags";

        var stTag = document.createElement("span");
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
          var catTag = document.createElement("span");
          catTag.className = "tag-pill";
          catTag.textContent = ad.category;
          tags.appendChild(catTag);
        }

        if (ad.location) {
          var locTag = document.createElement("span");
          locTag.className = "tag-pill";
          locTag.textContent = ad.location;
          tags.appendChild(locTag);
        }

        var footer = document.createElement("div");
        footer.className = "ad-footer";

        var footerLeft = document.createElement("div");
        footerLeft.className = "ad-footer-left";

        var btnDetails = document.createElement("button");
        btnDetails.type = "button";
        btnDetails.className = "btn-link";
        btnDetails.textContent = "Detaljer";
        btnDetails.addEventListener("click", function () {
          openDetail(ad);
        });

        footerLeft.appendChild(btnDetails);

        if (!isAdminList) {
          var btnShare = document.createElement("button");
          btnShare.type = "button";
          btnShare.className = "btn-link";
          btnShare.textContent = "Del lenke";
          btnShare.addEventListener("click", function () {
            shareAd(ad);
          });
          footerLeft.appendChild(btnShare);
        }

        var timeEl = document.createElement("div");
        timeEl.className = "time-ago";
        timeEl.textContent = timeAgo(ad.createdAt);

        footer.appendChild(footerLeft);
        footer.appendChild(timeEl);

        info.appendChild(titleRow);
        info.appendChild(meta);
        info.appendChild(tags);
        info.appendChild(footer);

        if (isAdminList) {
          var adminControls = document.createElement("div");
          adminControls.className = "admin-controls";

          var statusSelect = document.createElement("select");
          statusSelect.className = "admin-status-select";
          var options = [
            { value: "til-salgs", label: "Til salgs" },
            { value: "reservert", label: "Reservert" },
            { value: "solgt", label: "Solgt" }
          ];
          for (var o = 0; o < options.length; o++) {
            var opt = document.createElement("option");
            opt.value = options[o].value;
            opt.textContent = options[o].label;
            if (options[o].value === ad.status) opt.selected = true;
            statusSelect.appendChild(opt);
          }
          statusSelect.addEventListener("change", function () {
            ad.status = statusSelect.value;
            saveAds();
            renderCurrentView();
          });

          var editBtn = document.createElement("button");
          editBtn.type = "button";
          editBtn.className = "btn-link";
          editBtn.textContent = "Rediger";
          editBtn.addEventListener("click", function () {
            openEditAd(ad);
          });

          var deleteBtn = document.createElement("button");
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
      })(list[i]);
    }
  }

  // ------- OVERSIKT -------

  function renderOverview() {
    var totalCount = ads.length;
    var sumTilSalgs = 0;
    var sumReservert = 0;
    var sumSolgt = 0;
    var countReservert = 0;

    for (var i = 0; i < ads.length; i++) {
      var ad = ads[i];
      if (ad.price == null) continue;

      if (ad.status === "til-salgs") {
        sumTilSalgs += ad.price;
      } else if (ad.status === "reservert") {
        sumReservert += ad.price;
        countReservert++;
      } else if (ad.status === "solgt") {
        sumSolgt += ad.price;
      }
    }

    var html = "";
    html += '<div class="overview-grid">';
    html += '<div class="overview-card">';
    html += '<div class="overview-title">Totalt antall annonser</div>';
    html += '<div class="overview-value">' + totalCount + "</div>";
    html += "</div>";

    html += '<div class="overview-card">';
    html += '<div class="overview-title">Verdi til salgs</div>';
    html +=
      '<div class="overview-value">' +
      formatCurrency(sumTilSalgs) +
      "</div>";
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

  // ------- DETALJMODAL -------

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

    var extraParts = [];
    if (ad.buyer) extraParts.push("Kjøper: " + ad.buyer);
    if (ad.location) extraParts.push("Lagerplass: " + ad.location);
    detailExtra.textContent = extraParts.join(" • ");

    detailTags.innerHTML = "";
    if (ad.category) {
      var tag = document.createElement("span");
      tag.className = "tag-pill";
      tag.textContent = ad.category;
      detailTags.appendChild(tag);
    }

    detailThumbs.innerHTML = "";
    if (ad.images && ad.images.length) {
      detailMainImage.src = ad.images[0];

      for (var i = 0; i < ad.images.length; i++) {
        (function (src, idx) {
          var btn = document.createElement("button");
          btn.type = "button";
          btn.className = "detail-thumb" + (idx === 0 ? " active" : "");
          var img = document.createElement("img");
          img.src = src;
          btn.appendChild(img);
          btn.addEventListener("click", function () {
            detailMainImage.src = src;
            var children = detailThumbs.children;
            for (var j = 0; j < children.length; j++) {
              children[j].classList.remove("active");
            }
            btn.classList.add("active");
          });
          detailThumbs.appendChild(btn);
        })(ad.images[i], i);
      }
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
      window.alert("Kopier lenken i adressefeltet for å dele.");
    }
  }

  // ------- ÅPNE REDIGER-MODUS -------

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
      for (var i = 0; i < ad.images.length; i++) {
        var div = document.createElement("div");
        div.className = "image-preview-item";
        var img = document.createElement("img");
        img.src = ad.images[i];
        div.appendChild(img);
        imagePreviewList.appendChild(div);
      }
    }

    openModal(newAdModal);
  }

  // ------- RENDER CURRENT VIEW -------

  function renderCurrentView() {
    if (currentView === "overview") {
      renderOverview();
    } else if (currentView === "admin") {
      renderList(true);
    } else {
      renderList(false);
    }
  }

  // INIT
  setView("sales");
});
