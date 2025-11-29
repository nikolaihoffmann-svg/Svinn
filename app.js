// Enkel "database" i minnet
let ads = [];

// ELEMENTER
const adListEl = document.getElementById("adList");
const fabAdd = document.getElementById("fabAdd");
const newAdModal = document.getElementById("newAdModal");
const newAdForm = document.getElementById("newAdForm");
const imagesInput = document.getElementById("images");
const imagePreviewList = document.getElementById("newAdImagePreview");

const searchInput = document.getElementById("searchInput");
const statusChips = document.querySelectorAll("[data-filter-status]");
const categoryChips = document.querySelectorAll("[data-filter-category]");

// detaljmodal
const detailModal = document.getElementById("detailModal");
const detailTitle = document.getElementById("detailTitle");
const detailMeta = document.getElementById("detailMeta");
const detailMainImage = document.getElementById("detailMainImage");
const detailThumbs = document.getElementById("detailThumbs");
const detailPrice = document.getElementById("detailPrice");
const detailStatus = document.getElementById("detailStatus");
const detailDescription = document.getElementById("detailDescription");
const detailExtra = document.getElementById("detailExtra");
const detailTags = document.getElementById("detailTags");

let newAdImageFiles = [];
let filterStatus = "til-salgs";
let filterCategory = "alle";
let searchTerm = "";

// HJELP: vis modal
function openModal(el) {
  el.classList.add("show");
}

function closeModal(el) {
  el.classList.remove("show");
}

// LUKK MED [data-close-modal]
document.querySelectorAll("[data-close-modal]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const modal = btn.closest(".modal-backdrop");
    if (modal) closeModal(modal);
  });
});

// Klikk bakgrunn lukker også
[newAdModal, detailModal].forEach((modal) => {
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal(modal);
  });
});

// + KNAPP
fabAdd.addEventListener("click", () => {
  // reset skjema
  newAdForm.reset();
  newAdImageFiles = [];
  imagePreviewList.innerHTML = "";
  openModal(newAdModal);
});

// BILDER I NY ANNONSE
imagesInput.addEventListener("change", () => {
  const files = Array.from(imagesInput.files || []);
  newAdImageFiles = files;
  imagePreviewList.innerHTML = "";

  files.forEach((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
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

// LAGRE NY ANNONSE
newAdForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = document.getElementById("title").value.trim();
  const priceVal = document.getElementById("price").value.trim();
  const buyer = document.getElementById("buyer").value.trim();
  const category = document.getElementById("category").value.trim();
  const location = document.getElementById("location").value.trim();
  const description = document.getElementById("description").value.trim();

  // les bilder til data-URL (for demo; i produksjon -> Supabase URLer)
  const imagePromises = newAdImageFiles.map(
    (file) =>
      new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (evt) => resolve(evt.target.result);
        reader.readAsDataURL(file);
      })
  );
  const images = await Promise.all(imagePromises);

  const ad = {
    id: Date.now().toString(),
    title,
    price: priceVal ? Number(priceVal) : null,
    buyer: buyer || null,
    category: category || null,
    description: description || "",
    location: location || null,
    status: "til-salgs",
    images,
    createdAt: new Date().toISOString(),
  };

  ads.unshift(ad);
  closeModal(newAdModal);
  renderAds();
});

// RENDER LISTE
function renderAds() {
  adListEl.innerHTML = "";

  const filtered = ads.filter((ad) => {
    if (filterStatus !== "alle" && ad.status !== filterStatus) return false;

    if (filterCategory !== "alle") {
      if (!ad.category || ad.category.toLowerCase() !== filterCategory.toLowerCase()) {
        return false;
      }
    }

    if (searchTerm) {
      const text =
        (ad.title || "") +
        " " +
        (ad.description || "") +
        " " +
        (ad.category || "") +
        " " +
        (ad.location || "");
      if (!text.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    }

    return true;
  });

  if (!filtered.length) {
    adListEl.innerHTML =
      '<p class="help-text">Ingen annonser som matcher filtrene ennå.</p>';
    return;
  }

  filtered.forEach((ad) => {
    const card = document.createElement("article");
    card.className = "ad-card";

    const header = document.createElement("div");
    header.className = "ad-header-row";

    const left = document.createElement("div");
    const titleEl = document.createElement("div");
    titleEl.className = "ad-title";
    titleEl.textContent = ad.title;

    const subtitle = document.createElement("div");
    subtitle.className = "ad-subtitle";

    const dateStr = formatDateShort(ad.createdAt);
    const buyerText = ad.buyer ? `selges til ${ad.buyer}` : "til salgs";
    subtitle.textContent = `Dekk ${buyerText} · Lagt ut: ${dateStr}`.replace("Dekk ", "");

    left.appendChild(titleEl);
    left.appendChild(subtitle);

    const priceEl = document.createElement("div");
    priceEl.className = "ad-price";
    priceEl.textContent =
      ad.price != null ? `${ad.price.toLocaleString("nb-NO")} kr` : "Gi bud";

    header.appendChild(left);
    header.appendChild(priceEl);

    // tags
    const tagRow = document.createElement("div");
    tagRow.className = "tag-row";

    const statusTag = document.createElement("span");
    statusTag.className = "tag-pill tag-pill-primary";
    statusTag.textContent = ad.status === "til-salgs" ? "Til salgs" : "Solgt";
    tagRow.appendChild(statusTag);

    if (ad.category) {
      const catTag = document.createElement("span");
      catTag.className = "tag-pill";
      catTag.textContent = ad.category;
      tagRow.appendChild(catTag);
    }

    if (ad.location) {
      const locTag = document.createElement("span");
      locTag.className = "tag-pill";
      locTag.textContent = ad.location;
      tagRow.appendChild(locTag);
    }

    // bilde
    const imgWrapper = document.createElement("div");
    imgWrapper.className = "ad-image-wrapper";

    if (ad.images && ad.images.length) {
      const img = document.createElement("img");
      img.src = ad.images[0];
      img.alt = ad.title;
      imgWrapper.appendChild(img);

      if (ad.images.length > 1) {
        const count = document.createElement("div");
        count.className = "ad-image-count";
        count.textContent = `+${ad.images.length - 1}`;
        imgWrapper.appendChild(count);
      }
    } else {
      imgWrapper.style.display = "flex";
      imgWrapper.style.alignItems = "center";
      imgWrapper.style.justifyContent = "center";
      imgWrapper.textContent = "Ingen bilde";
    }

    // footer
    const footer = document.createElement("div");
    footer.className = "ad-footer-row";

    const footerLeft = document.createElement("div");
    footerLeft.className = "ad-footer-left";

    const btnDetails = document.createElement("button");
    btnDetails.className = "btn-small btn-small-primary";
    btnDetails.type = "button";
    btnDetails.textContent = "Detaljer";
    btnDetails.addEventListener("click", () => openDetailModal(ad));

    const btnShare = document.createElement("button");
    btnShare.className = "btn-small btn-small-secondary";
    btnShare.type = "button";
    btnShare.textContent = "Del lenke";
    btnShare.addEventListener("click", () => {
      if (navigator.share) {
        navigator
          .share({
            title: ad.title,
            text: "Sjekk ut denne tingen på EkstraVerdi",
            url: window.location.href,
          })
          .catch(() => {});
      } else {
        alert("Kopier lenken i adressefeltet for å dele 🙂");
      }
    });

    footerLeft.appendChild(btnDetails);
    footerLeft.appendChild(btnShare);

    const timeEl = document.createElement("div");
    timeEl.className = "ad-time";
    timeEl.textContent = timeAgo(ad.createdAt);

    footer.appendChild(footerLeft);
    footer.appendChild(timeEl);

    card.appendChild(header);
    card.appendChild(tagRow);
    card.appendChild(imgWrapper);
    card.appendChild(footer);

    adListEl.appendChild(card);
  });
}

// DETALJMODAL
function openDetailModal(ad) {
  detailTitle.textContent = ad.title;
  const dateStr = formatDateLong(ad.createdAt);
  detailMeta.textContent = `Lagt ut ${dateStr}`;

  detailPrice.textContent =
    ad.price != null ? `${ad.price.toLocaleString("nb-NO")} kr` : "Gi bud";
  detailStatus.textContent = ad.status === "til-salgs" ? "Til salgs" : "Solgt";

  detailDescription.textContent =
    ad.description || "Ingen beskrivelse lagt inn.";
  const extraBits = [];
  if (ad.buyer) extraBits.push(`Kjøper: ${ad.buyer}`);
  if (ad.location) extraBits.push(`Lagerplass: ${ad.location}`);
  detailExtra.textContent = extraBits.join(" • ");

  // tags
  detailTags.innerHTML = "";
  const t1 = document.createElement("span");
  t1.className = "tag-pill tag-pill-primary";
  t1.textContent = ad.status === "til-salgs" ? "Til salgs" : "Solgt";
  detailTags.appendChild(t1);
  if (ad.category) {
    const t2 = document.createElement("span");
    t2.className = "tag-pill";
    t2.textContent = ad.category;
    detailTags.appendChild(t2);
  }

  // bilder / galleri
  detailThumbs.innerHTML = "";
  if (ad.images && ad.images.length) {
    detailMainImage.src = ad.images[0];

    ad.images.forEach((src, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "detail-thumb" + (idx === 0 ? " active" : "");
      const img = document.createElement("img");
      img.src = src;
      btn.appendChild(img);
      btn.addEventListener("click", () => {
        detailMainImage.src = src;
        Array.from(detailThumbs.children).forEach((c) =>
          c.classList.remove("active")
        );
        btn.classList.add("active");
      });
      detailThumbs.appendChild(btn);
    });
  } else {
    detailMainImage.src = "";
  }

  openModal(detailModal);
}

/* FILTRE */

statusChips.forEach((chip) => {
  chip.addEventListener("click", () => {
    statusChips.forEach((c) => c.classList.remove("chip-active"));
    chip.classList.add("chip-active");
    filterStatus = chip.dataset.filterStatus;
    renderAds();
  });
});

categoryChips.forEach((chip) => {
  chip.addEventListener("click", () => {
    categoryChips.forEach((c) => c.classList.remove("chip-active"));
    chip.classList.add("chip-active");
    filterCategory = chip.dataset.filterCategory;
    renderAds();
  });
});

searchInput.addEventListener("input", () => {
  searchTerm = searchInput.value;
  renderAds();
});

/* HJELPEFUNKSJONER */

function timeAgo(iso) {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);

  if (mins < 1) return "akkurat nå";
  if (mins < 60) return `${mins} min siden`;
  if (hours < 24) return `${hours} t siden`;
  if (days === 1) return "i går";
  return `${days} dager siden`;
}

function formatDateShort(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("nb-NO");
}

function formatDateLong(iso) {
  const d = new Date(iso);
  return d.toLocaleString("nb-NO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Første render (tom liste)
renderAds();
