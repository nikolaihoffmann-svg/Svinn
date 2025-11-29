const STORAGE_KEY = "ekstraverdi_ads_v1";

// LAST / LAGRE I LOCALSTORAGE
function loadAdsFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAdsToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ads));
  } catch {
    // ignorér
  }
}

// "Database" i minne
let ads = loadAdsFromStorage();

// ELEMENTER
const adListEl = document.getElementById("adList");
const viewHintEl = document.getElementById("viewHint");
const fabAdd = document.getElementById("fabAdd");
const newAdModal = document.getElementById("newAdModal");
const newAdForm = document.getElementById("newAdForm");
const imagesInput = document.getElementById("images");
const imagePreviewList = document.getElementById("newAdImagePreview");

const searchInput = document.getElementById("searchInput");
const statusChips = document.querySelectorAll("[data-filter-status]");
const categoryChips = document.querySelectorAll("[data-filter-category]");
const tabs = document.querySelectorAll(".tab");

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
let currentView = "sales";

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

// TABS – gjør at Liste (admin) osv faktisk synes å fungere
tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    currentView = tab.dataset.view || "sales";
    updateViewHint();
    renderAds();
  });
});

function updateViewHint() {
  if (currentView === "sales") {
    viewHintEl.textContent = "";
  } else if (currentView === "admin") {
    viewHintEl.textContent =
      "Adminvisning (foreløpig samme liste, senere kan vi legge til redigering/sletting osv).";
  } else if (currentView === "overview") {
    viewHintEl.textContent = "Oversikt kommer – foreløpig viser vi samme liste.";
  } else if (currentView === "requests") {
    viewHintEl.textContent = "Forespørsler kommer – foreløpig viser vi samme liste.";
  }
}

// + KNAPP
fabAdd.addEventListener("click", () => {
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
  saveAdsToStorage();
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
    titleEl.className
