// Enkel lokal "database"
let items = [];
const STORAGE_KEY = "salgAppItems";

document.addEventListener("DOMContentLoaded", () => {
  // Elementer
  const listEl = document.getElementById("item-list");
  const addBtn = document.getElementById("add-item-btn");
  const panel = document.getElementById("item-form-panel");
  const form = document.getElementById("item-form");
  const formTitle = document.getElementById("form-title");

  const idInput = document.getElementById("item-id");
  const titleInput = document.getElementById("item-title");
  const priceInput = document.getElementById("item-price");
  const descInput = document.getElementById("item-description");
  const imageInput = document.getElementById("item-image");
  const imageDataInput = document.getElementById("item-image-data");
  const soldInput = document.getElementById("item-sold");
  const cancelBtn = document.getElementById("cancel-btn");

  const filterButtons = document.querySelectorAll(".filter-btn");
  let currentFilter = "active";

  // Last data
  loadItems();
  renderList();

  // Handlers

  addBtn.addEventListener("click", () => {
    openFormForNew();
  });

  cancelBtn.addEventListener("click", () => {
    closeForm();
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

  // Filterknapper
  filterButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      filterButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilter = btn.dataset.filter;
      renderList();
    });
  });

  // Lagre skjema
  form.addEventListener("submit", e => {
    e.preventDefault();
    const id = idInput.value || Date.now().toString();
    const title = titleInput.value.trim();
    const price = Number(priceInput.value || 0);
    const description = descInput.value.trim();
    const imageData = imageDataInput.value || "";
    const isSold = soldInput.checked;

    if (!title) {
      alert("Tittel kan ikke være tom.");
      return;
    }

    const existingIndex = items.findIndex(i => i.id === id);
    const now = new Date().toISOString();

    if (existingIndex >= 0) {
      // Oppdater
      const existing = items[existingIndex];
      items[existingIndex] = {
        ...existing,
        title,
        price,
        description,
        imageData: imageData || existing.imageData,
        isSold,
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
        createdAt: now,
        updatedAt: now
      });
    }

    saveItems();
    renderList();
    closeForm();
  });

  // Funksjoner

  function loadItems() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) items = JSON.parse(raw);
      else items = [];
    } catch (err) {
      console.error("Kunne ikke lese data:", err);
      items = [];
    }
  }

  function saveItems() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

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
      .slice() // kopier
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .forEach(item => {
        const card = createCard(item);
        listEl.appendChild(card);
      });
  }

  function createCard(item) {
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

    const badges = document.createElement("div");
    badges.className = "badges";
    const statusBadge = document.createElement("span");
    statusBadge.className = "badge " + (item.isSold ? "badge-sold" : "badge-active");
    statusBadge.textContent = item.isSold ? "Solgt" : "Til salgs";
    badges.appendChild(statusBadge);

    const actions = document.createElement("div");
    actions.className = "card-actions";

    const toggleBtn = document.createElement("button");
    toggleBtn.className = "btn-small-secondary";
    toggleBtn.textContent = item.isSold ? "Markér som til salgs" : "Markér som solgt";
    toggleBtn.addEventListener("click", () => {
      item.isSold = !item.isSold;
      item.updatedAt = new Date().toISOString();
      saveItems();
      renderList();
    });

    const editBtn = document.createElement("button");
    editBtn.className = "btn-small-primary";
    editBtn.textContent = "Rediger";
    editBtn.addEventListener("click", () => {
      openFormForEdit(item);
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn-small-danger";
    deleteBtn.textContent = "Slett";
    deleteBtn.addEventListener("click", () => {
      if (confirm("Slette denne tingen?")) {
        items = items.filter(i => i.id !== item.id);
        saveItems();
        renderList();
      }
    });

    actions.appendChild(toggleBtn);
    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    body.appendChild(headerRow);
    if (item.description) body.appendChild(descEl);
    body.appendChild(badges);
    body.appendChild(actions);

    card.appendChild(imageWrap);
    card.appendChild(body);

    return card;
  }

  function openFormForNew() {
    formTitle.textContent = "Ny ting";
    idInput.value = "";
    titleInput.value = "";
    priceInput.value = "";
    descInput.value = "";
    imageInput.value = "";
    imageDataInput.value = "";
    soldInput.checked = false;
    panel.classList.remove("hidden");
  }

  function openFormForEdit(item) {
    formTitle.textContent = "Rediger ting";
    idInput.value = item.id;
    titleInput.value = item.title;
    priceInput.value = item.price || "";
    descInput.value = item.description || "";
    imageInput.value = "";
    imageDataInput.value = item.imageData || "";
    soldInput.checked = !!item.isSold;
    panel.classList.remove("hidden");
  }

  function closeForm() {
    panel.classList.add("hidden");
  }
});
