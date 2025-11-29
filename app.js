// Hele appen kjøres når DOM-en er klar
window.addEventListener("DOMContentLoaded", function () {
  var STORAGE_KEY = "ekstraverdi_ads_v1";
  var THEME_KEY = "ekstraverdi_theme_v1";

  // ---- HENT ELEMENTER ----
  var adListEl = document.getElementById("adList");
  var viewHintEl = document.getElementById("viewHint");
  var fabAdd = document.getElementById("fabAdd");
  var newAdModal = document.getElementById("newAdModal");
  var newAdForm = document.getElementById("newAdForm");
  var imagesInput = document.getElementById("images");
  var imagePreviewList = document.getElementById("newAdImagePreview");
  var searchInput = document.getElementById("searchInput");
  var statusChips = document.querySelectorAll("[data-filter-status]");
  var categoryChips = document.querySelectorAll("[data-filter-category]");
  var tabs = document.querySelectorAll(".tab");
  var themeToggle = document.getElementById("themeToggle");
  var logoutBtn = document.getElementById("logoutBtn");

  var detailModal = document.getElementById("detailModal");
  var detailTitle = document.getElementById("detailTitle");
  var detailMeta = document.getElementById("detailMeta");
  var detailMainImage = document.getElementById("detailMainImage");
  var detailThumbs = document.getElementById("detailThumbs");
  var detailPrice = document.getElementById("detailPrice");
  var detailStatus = document.getElementById("detailStatus");
  var detailDescription = document.getElementById("detailDescription");
  var detailExtra = document.getElementById("detailExtra");
  var detailTags = document.getElementById("detailTags");

  // Hvis noe av dette mangler, ikke gjør noe mer (hindrer krasj)
  if (!adListEl || !fabAdd || !newAdModal || !newAdForm) {
    return;
  }

  var newAdImageFiles = [];
  var filterStatus = "til-salgs";
  var filterCategory = "alle";
  var searchTerm = "";
  var currentView = "sales";

  // ---- STORAGE ----
  function loadAdsFromStorage() {
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

  function saveAdsToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ads));
    } catch (e) {
      // ignore
    }
  }

  var ads = loadAdsFromStorage();

  // ---- THEME ----
  function applyTheme(theme) {
    if (theme === "light") {
      document.body.classList.add("light-theme");
      if (themeToggle) themeToggle.textContent = "☀️";
    } else {
      document.body.classList.remove("light-theme");
      if (themeToggle) themeToggle.textContent = "🌙";
    }
  }

  function loadTheme() {
    try {
      var stored = localStorage.getItem(THEME_KEY);
      if (stored === "light" || stored === "dark") {
        applyTheme(stored);
      } else {
        applyTheme("dark");
      }
    } catch (e) {
      applyTheme("dark");
    }
  }

  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      var isLight = document.body.classList.contains("light-theme");
      var next = isLight ? "dark" : "light";
      applyTheme(next);
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch (e) {}
    });
  }

  loadTheme();

  // ---- MODAL HJELP ----
  function openModal(el) {
    if (!el) return;
    el.classList.add("show");
  }

  function closeModal(el) {
    if (!el) return;
    el.classList.remove("show");
  }

  var closeButtons = document.querySelectorAll("[data-close-modal]");
  for (var i = 0; i < closeButtons.length; i++) {
    (function (btn) {
      btn.addEventListener("click", function () {
        var modal = btn.closest(".modal-backdrop");
        closeModal(modal);
      });
    })(closeButtons[i]);
  }

  var modals = [newAdModal, detailModal];
  for (var m = 0; m < modals.length; m++) {
    (function (modal) {
      if (!modal) return;
      modal.addEventListener("click", function (e) {
        if (e.target === modal) {
          closeModal(modal);
        }
      });
    })(modals[m]);
  }

  // ---- TABS ----
  function updateViewHint() {
    if (!viewHintEl) return;
    if (currentView === "sales") {
      viewHintEl.textContent = "";
    } else if (currentView === "admin") {
      viewHintEl.textContent =
        "Adminvisning (samme liste nå, senere kan vi legge til redigering/sletting).";
    } else if (currentView === "overview") {
      viewHintEl.textContent = "Oversikt (kommer senere, viser samme liste nå).";
    } else if (currentView === "requests") {
      viewHintEl.textContent = "Forespørsler (kommer senere, viser samme liste nå).";
    }
  }

  for (var t = 0; t < tabs.length; t++) {
    (function (tab) {
      tab.addEventListener("click", function () {
        for (var j = 0; j < tabs.length; j++) {
          tabs[j].classList.remove("active");
        }
        tab.classList.add("active");
        currentView = tab.getAttribute("data-view") || "sales";
        updateViewHint();
        renderAds();
      });
    })(tabs[t]);
  }

  // ---- LOGG UT ----
  if (logoutBtn) {
    logoutBtn.addEventListener("click", function () {
      if (window.confirm("Vil du tømme alle annonser (demo-logg ut)?")) {
        ads = [];
        saveAdsToStorage();
        renderAds();
        window.alert("Lokale annonser er slettet.");
      }
    });
  }

  // ---- + KNAPP ----
  fabAdd.addEventListener("click", function () {
    newAdForm.reset();
    newAdImageFiles = [];
    if (imagePreviewList) imagePreviewList.innerHTML = "";
    openModal(newAdModal);
  });

  // ---- BILDEPREVIEW ----
  if (imagesInput) {
    imagesInput.addEventListener("change", function () {
      var files = Array.prototype.slice.call(imagesInput.files || []);
      newAdImageFiles = files;
      if (imagePreviewList) imagePreviewList.innerHTML = "";

      for (var i = 0; i < files.length; i++) {
        (function (file) {
          var reader = new FileReader();
          reader.onload = function (e) {
            if (!imagePreviewList) return;
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

  // ---- NY ANNONSE ----
  newAdForm.addEventListener("submit", function (e) {
    e.preventDefault();

    var titleEl = document.getElementById("title");
    var priceEl = document.getElementById("price");
    var buyerEl = document.getElementById("buyer");
    var categoryEl = document.getElementById("category");
    var locationEl = document.getElementById("location");
    var descEl = document.getElementById("description");

    var title = titleEl ? titleEl.value.trim() : "";
    var priceVal = priceEl ? priceEl.value.trim() : "";
    var buyer = buyerEl ? buyerEl.value.trim() : "";
    var category = categoryEl ? categoryEl.value.trim() : "";
    var locationVal = locationEl ? locationEl.value.trim() : "";
    var description = descEl ? descEl.value.trim() : "";

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
      saveAdsToStorage();
      closeModal(newAdModal);
      renderAds();
    });
  });

  // ---- FILTRE ----
  for (var i = 0; i < statusChips.length; i++) {
    (function (chip) {
      chip.addEventListener("click", function () {
        for (var j = 0; j < statusChips.length; j++) {
          statusChips[j].classList.remove("chip-active");
        }
        chip.classList.add("chip-active");
        filterStatus = chip.getAttribute("data-filter-status");
        renderAds();
      });
    })(statusChips[i]);
  }

  for (var i2 = 0; i2 < categoryChips.length; i2++) {
    (function (chip) {
      chip.addEventListener("click", function () {
        for (var j = 0; j < categoryChips.length; j++) {
          categoryChips[j].classList.remove("chip-active");
        }
        chip.classList.add("chip-active");
        filterCategory = chip.getAttribute("data-filter-category");
        renderAds();
      });
    })(categoryChips[i2]);
  }

  if (searchInput) {
    searchInput.addEventListener("input", function () {
      searchTerm = searchInput.value;
      renderAds();
    });
  }

  // ---- RENDER LISTE ----
  function renderAds() {
    if (!adListEl) return;

    adListEl.innerHTML = "";

    var filtered = [];
    for (var i = 0; i < ads.length; i++) {
      var ad = ads[i];
      if (filterStatus !== "alle" && ad.status !== filterStatus) continue;

      if (filterCategory !== "alle") {
        if (
          !ad.category ||
          ad.category.toLowerCase() !== filterCategory.toLowerCase()
        ) {
          continue;
        }
      }

      if (searchTerm) {
        var text =
          (ad.title || "") +
          " " +
          (ad.description || "") +
          " " +
          (ad.category || "") +
          " " +
          (ad.location || "");
        if (text.toLowerCase().indexOf(searchTerm.toLowerCase()) === -1) {
          continue;
        }
      }

      filtered.push(ad);
    }

    if (!filtered.length) {
      adListEl.innerHTML =
        '<p class="help-text">Ingen annonser som matcher filtrene ennå.</p>';
      return;
    }

    for (var k = 0; k < filtered.length; k++) {
      (function (ad) {
        var card = document.createElement("article");
        card.className = "ad-card";

        var header = document.createElement("div");
        header.className = "ad-header-row";

        var left = document.createElement("div");
        var titleEl = document.createElement("div");
        titleEl.className = "ad-title";
        titleEl.textContent = ad.title;

        var subtitle = document.createElement("div");
        subtitle.className = "ad-subtitle";
        var dateStr = formatDateShort(ad.createdAt);
        var buyerText = ad.buyer ? "selges til " + ad.buyer : "til salgs";
        subtitle.textContent = buyerText + " · Lagt ut: " + dateStr;

        left.appendChild(titleEl);
        left.appendChild(subtitle);

        var priceEl = document.createElement("div");
        priceEl.className = "ad-price";
        priceEl.textContent =
          ad.price != null ? ad.price.toLocaleString("nb-NO") + " kr" : "Gi bud";

        header.appendChild(left);
        header.appendChild(priceEl);

        var tagRow = document.createElement("div");
        tagRow.className = "tag-row";

        var statusTag = document.createElement("span");
        statusTag.className = "tag-pill tag-pill-primary";
        statusTag.textContent = ad.status === "til-salgs" ? "Til salgs" : "Solgt";
        tagRow.appendChild(statusTag);

        if (ad.category) {
          var catTag = document.createElement("span");
          catTag.className = "tag-pill";
          catTag.textContent = ad.category;
          tagRow.appendChild(catTag);
        }

        if (ad.location) {
          var locTag = document.createElement("span");
          locTag.className = "tag-pill";
          locTag.textContent = ad.location;
          tagRow.appendChild(locTag);
        }

        var imgWrapper = document.createElement("div");
        imgWrapper.className = "ad-image-wrapper";
        imgWrapper.style.height = "160px";
        imgWrapper.style.maxHeight = "160px";

        if (ad.images && ad.images.length) {
          var img = document.createElement("img");
          img.src = ad.images[0];
          img.alt = ad.title;
          img.style.width = "100%";
          img.style.height = "100%";
          img.style.objectFit = "cover";
          imgWrapper.appendChild(img);

          if (ad.images.length > 1) {
            var count = document.createElement("div");
            count.className = "ad-image-count";
            count.textContent = "+" + (ad.images.length - 1);
            imgWrapper.appendChild(count);
          }
        } else {
          imgWrapper.style.display = "flex";
          imgWrapper.style.alignItems = "center";
          imgWrapper.style.justifyContent = "center";
          imgWrapper.textContent = "Ingen bilde";
        }

        var footer = document.createElement("div");
        footer.className = "ad-footer-row";

        var footerLeft = document.createElement("div");
        footerLeft.className = "ad-footer-left";

        var btnDetails = document.createElement("button");
        btnDetails.className = "btn-small btn-small-primary";
        btnDetails.type = "button";
        btnDetails.textContent = "Detaljer";
        btnDetails.addEventListener("click", function () {
          openDetailModal(ad);
        });

        var btnShare = document.createElement("button");
        btnShare.className = "btn-small btn-small-secondary";
        btnShare.type = "button";
        btnShare.textContent = "Del lenke";
        btnShare.addEventListener("click", function () {
          if (navigator.share) {
            navigator
              .share({
                title: ad.title,
                text: "Sjekk ut denne tingen på EkstraVerdi",
                url: window.location.href
              })
              .catch(function () {});
          } else {
            window.alert("Kopier lenken i adressefeltet for å dele 🙂");
          }
        });

        footerLeft.appendChild(btnDetails);
        footerLeft.appendChild(btnShare);

        var timeEl = document.createElement("div");
        timeEl.className = "ad-time";
        timeEl.textContent = timeAgo(ad.createdAt);

        footer.appendChild(footerLeft);
        footer.appendChild(timeEl);

        card.appendChild(header);
        card.appendChild(tagRow);
        card.appendChild(imgWrapper);
        card.appendChild(footer);

        adListEl.appendChild(card);
      })(filtered[k]);
    }
  }

  // ---- DETALJMODAL ----
  function openDetailModal(ad) {
    if (!detailModal) return;

    detailTitle.textContent = ad.title;
    detailPrice.textContent =
      ad.price != null ? ad.price.toLocaleString("nb-NO") + " kr" : "Gi bud";
    detailStatus.textContent = ad.status === "til-salgs" ? "Til salgs" : "Solgt";
    detailDescription.textContent =
      ad.description || "Ingen beskrivelse lagt inn.";

    var extraBits = [];
    if (ad.buyer) extraBits.push("Kjøper: " + ad.buyer);
    if (ad.location) extraBits.push("Lagerplass: " + ad.location);
    detailExtra.textContent = extraBits.join(" • ");

    detailMeta.textContent = "Lagt ut " + formatDateLong(ad.createdAt);

    detailTags.innerHTML = "";
    var t1 = document.createElement("span");
    t1.className = "tag-pill tag-pill-primary";
    t1.textContent = ad.status === "til-salgs" ? "Til salgs" : "Solgt";
    detailTags.appendChild(t1);
    if (ad.category) {
      var t2 = document.createElement("span");
      t2.className = "tag-pill";
      t2.textContent = ad.category;
      detailTags.appendChild(t2);
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
            for (var c = 0; c < children.length; c++) {
              children[c].classList.remove("active");
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

  // ---- HJELPEFUNKSJONER ----
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

  function formatDateShort(iso) {
    var d = new Date(iso);
    return d.toLocaleDateString("nb-NO");
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

  // ---- INIT ----
  updateViewHint();
  renderAds();
});
