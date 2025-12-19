// ==============================
// CANVAS SETUP
// ==============================
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

// ==============================
// SIMPLE CLIENT AUTH 
// ==============================
const loginOverlay = document.getElementById("loginOverlay");
const accessInput = document.getElementById("accessCode");
const loginBtn = document.getElementById("loginBtn");

function showLogin() {
  if (loginOverlay) loginOverlay.setAttribute("aria-hidden", "false");
  if (accessInput) accessInput.focus();
}

function hideLogin() {
  if (loginOverlay) loginOverlay.setAttribute("aria-hidden", "true");
}

// Lightweight hash (djb2) to avoid storing plaintext code in source
function djb2(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) + str.charCodeAt(i); /* h * 33 + c */
    h = h >>> 0; // keep as unsigned 32-bit
  }
  return h;
}

const STORED_HASH = 193434242;

function checkAuth(code) {
  return djb2(String(code).trim()) === STORED_HASH;
}

function attemptLogin() {
  const val = accessInput ? accessInput.value : "";
  if (checkAuth(val)) {
    sessionStorage.setItem("authed", "1");
    hideLogin();
    // focus first control
    const first = document.querySelector('.controls input, .controls select, .controls button');
    if (first) first.focus();
  } else {
    // simple feedback
    if (accessInput) {
      accessInput.value = "";
      accessInput.placeholder = "Kode salah";
      accessInput.classList.add('shake');
      setTimeout(() => accessInput.classList.remove('shake'), 500);
      accessInput.focus();
    }
  }
}

if (sessionStorage.getItem("authed") === "1") {
  hideLogin();
} else {
  showLogin();
}

if (loginBtn) loginBtn.addEventListener('click', attemptLogin);
if (accessInput) accessInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') attemptLogin(); });


// Size configurations for 4:5 (feed) and 9:16 (story)
const SIZE_CONFIG = {
  "4:5": {
    width: 1080,
    height: 1350,
    template: "assets/template.png",
    // positions are in pixels for this size
    positions: {
      product: { x: 0, y: 0, w: 1080, h: 1350 },
      logo: { x: 600, y: 1090, w: 140, h: 140 },
      originalPrice: { x: 889, y: 1125 },
      discountPrice: { x: 889, y: 1207 },

      sizeTitle: { x: 820, y: 1009 },
      sizeValue: { x: 820, y: 1050 }
    }
  },
  "9:16": {
    width: 1080,
    height: 1920,
    template: "assets/template916.png",
    // defaults scaled from 4:5 to 9:16 (you can tweak these values)
    positions: {
      product: { x: 0, y: 0, w: 1080, h: 1920 },
      logo: { x: 600, y: 1560, w: 140, h: 140 },
      originalPrice: { x: 889, y: 1595 },
      discountPrice: { x: 889, y: 1677 },

      sizeTitle: { x: 820, y: 1479 },
      sizeValue: { x: 820, y: 1520 }

    }
  }
};

// current selected size key
let currentSize = "4:5";
let canvasWidth = SIZE_CONFIG[currentSize].width;
let canvasHeight = SIZE_CONFIG[currentSize].height;
canvas.width = canvasWidth;
canvas.height = canvasHeight;

// ==============================
// POSITIONS (MUDAH DIUBAH)
// ==============================
// Use positions from SIZE_CONFIG[currentSize]
function getPositions() {
  return SIZE_CONFIG[currentSize].positions;
}

function scalePos(pos) {
  const cfg = SIZE_CONFIG[currentSize];
  const sx = canvasWidth / cfg.width;
  const sy = canvasHeight / cfg.height;
  return {
    x: Math.round((pos.x || 0) * sx),
    y: Math.round((pos.y || 0) * sy),
    w: pos.w ? Math.round(pos.w * sx) : undefined,
    h: pos.h ? Math.round(pos.h * sy) : undefined,
    sx,
    sy
  };
}

// ==============================
// STATE
// ==============================
const state = {
  template: null,
  productImage: null,
  logoImage: null,
  originalPrice: "",
  originalPriceSpecial: false,
  discountPrice: "",
  sizeVariant: "" // ⬅️ TAMBAH
};

// ==============================
// LOAD TEMPLATE
// ==============================
const templateImg = new Image();
function loadTemplateForSize(sizeKey) {
  const cfg = SIZE_CONFIG[sizeKey];
  templateImg.src = cfg.template;
  templateImg.onload = () => {
    state.template = templateImg;
    draw();
  };
}
// initial load
loadTemplateForSize(currentSize);

// ==============================
// HELPERS
// ==============================

// Format harga Indonesia
function formatIDR(value) {
  if (!value) return "";
  return new Intl.NumberFormat("id-ID").format(value);
}

// Draw image FULL (COVER)
function drawImageCover(ctx, img, x, y, w, h) {
  const imgRatio = img.width / img.height;
  const areaRatio = w / h;

  let sx, sy, sw, sh;

  if (imgRatio > areaRatio) {
    // potong kiri kanan
    sh = img.height;
    sw = sh * areaRatio;
    sx = (img.width - sw) / 2;
    sy = 0;
  } else {
    // potong atas bawah
    sw = img.width;
    sh = sw / areaRatio;
    sx = 0;
    sy = (img.height - sh) / 2;
  }

  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

// ==============================
// DRAW
// ==============================
function draw() {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // ==============================
  // 5. PRODUCT IMAGE (PALING BAWAH)
  // ==============================
  if (state.productImage) {
    const positions = getPositions();
    const p = scalePos(positions.product);
    drawImageCover(ctx, state.productImage, p.x, p.y, p.w, p.h);
  }

  // ==============================
  // 4. TEMPLATE
  // ==============================
  if (state.template) {
    ctx.drawImage(state.template, 0, 0, canvasWidth, canvasHeight);
  }

  // ==============================
  // 3. LOGO BRAND
  // ==============================
  if (state.logoImage) {
    const positions = getPositions();
    const l = scalePos(positions.logo);
    ctx.drawImage(state.logoImage, l.x, l.y, l.w, l.h);
  }

  // ==============================
  // TEXT SETTINGS
  // ==============================
  ctx.textAlign = "center";
  ctx.fillStyle = "#000";

  // ==============================
  // 2. HARGA SEBELUM (atau HARGA SPESIAL)
  // ==============================
  if (state.originalPrice || state.originalPriceSpecial) {
    const positions = getPositions();
    const scaledPos = scalePos(positions.originalPrice);

    if (state.originalPriceSpecial) {
      // Draw single label "HARGA SPESIAL"
      const scaled = scalePos({ x: 0, y: 0 });
      const baseFont = 28;
      const fontSize = Math.max(10, Math.round(baseFont * Math.min(scaled.sx, scaled.sy)));
      ctx.font = `700 ${fontSize}px Poppins, sans-serif`;
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.fillText("HARGA SPESIAL", scaledPos.x, scaledPos.y);
    } else {
      // Split into three parts so the number can be bold
      const textLeft = "dari ";
      const textNum = formatIDR(state.originalPrice);
      const textRight = ", jadi";

      // scale font size with canvas scale
      const scaled = scalePos({ x: 0, y: 0 });
      const baseFont = 28;
      const fontSize = Math.max(10, Math.round(baseFont * Math.min(scaled.sx, scaled.sy)));
      const fontNormal = `300 ${fontSize}px Poppins, sans-serif`;
      const fontBold = `700 ${fontSize}px Poppins, sans-serif`;

      ctx.save();
      // measure using left alignment, then draw starting from computed X so whole line stays centered
      ctx.textAlign = "left";
      ctx.font = fontNormal;
      const wLeft = ctx.measureText(textLeft).width;
      ctx.font = fontBold;
      const wNum = ctx.measureText(textNum).width;
      ctx.font = fontNormal;
      const wRight = ctx.measureText(textRight).width;

      const totalW = wLeft + wNum + wRight;
      const startX = scaledPos.x - totalW / 2;

      let cursor = startX;
      ctx.font = fontNormal;
      ctx.fillStyle = "#fff";
      ctx.fillText(textLeft, cursor, scaledPos.y);
      cursor += wLeft;
      ctx.font = fontBold;
      ctx.fillStyle = "#fff"; // draw the number in white
      ctx.fillText(textNum, cursor, scaledPos.y);
      cursor += wNum;
      ctx.font = fontNormal;
      ctx.fillStyle = "#fff";
      ctx.fillText(textRight, cursor, scaledPos.y);
      ctx.restore();
    }
  }

  // ==============================
  // 1. HARGA AKHIR (PALING ATAS)
  // ==============================
  if (state.discountPrice) {
    const scaled = scalePos({ x: 0, y: 0 });
    const baseBig = 58;
    const bigFont = Math.max(14, Math.round(baseBig * Math.min(scaled.sx, scaled.sy)));
    ctx.font = `700 ${bigFont}px Poppins, sans-serif`;
    ctx.fillStyle = "#171717";
    const dp = scalePos(getPositions().discountPrice);
    ctx.fillText(formatIDR(state.discountPrice), dp.x, dp.y);
  }
  
  // ==============================
  // VARIASI UKURAN (CENTER ALIGN)
  // ==============================
  if (state.sizeVariant) {
    const positions = getPositions();

    const titlePos = scalePos(positions.sizeTitle);
    const valuePos = scalePos(positions.sizeValue);

    const scaled = scalePos({ x: 0, y: 0 });

    // Base font sizes (sesuai permintaan)
    const baseTitle = 24; // semibold
    const baseValue = 36; // light

    const titleFont = Math.max(12, Math.round(baseTitle * Math.min(scaled.sx, scaled.sy)));
    const valueFont = Math.max(14, Math.round(baseValue * Math.min(scaled.sx, scaled.sy)));

    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";

    // Title: "Variasi ukuran"
    ctx.font = `600 ${titleFont}px Poppins, sans-serif`;
    ctx.fillText("Variasi ukuran", titlePos.x, titlePos.y);

    // Value: "S, M, L, XL, XXL"
    ctx.font = `300 ${valueFont}px Poppins, sans-serif`;
    ctx.fillText(state.sizeVariant, valuePos.x, valuePos.y);
  }
}

// ==============================
// INPUT HANDLERS
// ==============================

// Upload product image
document.getElementById("productInput").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      state.productImage = img;
      draw();
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
});

// Size variant input
document.getElementById("sizeVariant").addEventListener("input", (e) => {
  const upper = e.target.value.toUpperCase();

  // update input field supaya kelihatan langsung uppercase
  e.target.value = upper;

  // simpan ke state
  state.sizeVariant = upper;

  draw();
});

// Logo dropdown
document.getElementById("logoSelect").addEventListener("change", (e) => {
  const value = e.target.value;
  if (!value) {
    state.logoImage = null;
    draw();
    return;
  }

  const img = new Image();
  img.onload = () => {
    state.logoImage = img;
    draw();
  };
  img.src = value;
});

// Price inputs
const originalPriceInput = document.getElementById("originalPrice");
const discountPriceInput = document.getElementById("discountPrice");

const originalTypeSelect = document.getElementById("originalType");

originalPriceInput.addEventListener("input", () => {
  // if user types, switch to custom mode
  if (originalTypeSelect) originalTypeSelect.value = 'custom';
  state.originalPriceSpecial = false;
  state.originalPrice = formatNumberInput(originalPriceInput);
  draw();
});

if (originalTypeSelect) {
  originalTypeSelect.addEventListener('change', (e) => {
    const v = e.target.value;
    if (v === 'special') {
      state.originalPriceSpecial = true;
      state.originalPrice = "";
      originalPriceInput.value = "";
      originalPriceInput.setAttribute('disabled', 'disabled');
    } else {
      state.originalPriceSpecial = false;
      originalPriceInput.removeAttribute('disabled');
    }
    draw();
  });
}

discountPriceInput.addEventListener("input", () => {
  state.discountPrice = formatNumberInput(discountPriceInput);
  draw();
});

// Post size selector: switch between sizes (4:5 feed, 9:16 story)
const postSizeSelect = document.getElementById("postSize");
postSizeSelect.addEventListener("change", (e) => {
  const v = e.target.value || "4:5";
  if (!SIZE_CONFIG[v]) return;
  currentSize = v;
  const cfg = SIZE_CONFIG[currentSize];
  canvasWidth = cfg.width;
  canvasHeight = cfg.height;
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  // load template for this size
  loadTemplateForSize(currentSize);
});


// ==============================
// DOWNLOAD
// ==============================
function download(type) {
  // Build filename: "[brand]-dari [hargaAwal]-jadi [hargaAkhir].jpg"
  function sanitizeFilename(name) {
    return name.replace(/[\\/:*?"<>|]+/g, "").trim();
  }

  const logoSelect = document.getElementById("logoSelect");
  let brand = "brand";
  if (logoSelect && logoSelect.selectedOptions && logoSelect.selectedOptions.length) {
    brand = logoSelect.selectedOptions[0].textContent || brand;
  }

  const orig = formatIDR(state.originalPrice) || "";
  const disc = formatIDR(state.discountPrice) || "";

  let filename = `${brand}-dari ${orig}-jadi ${disc}.jpg`;
  filename = filename.replace(/\s+/g, " ").trim();
  filename = sanitizeFilename(filename);

  canvas.toBlob(
    (blob) => {
      const link = document.createElement("a");
      link.download = filename || "promo.jpg";
      link.href = URL.createObjectURL(blob);
      link.click();
      URL.revokeObjectURL(link.href);
    },
    "image/jpeg",
    0.95
  );
}

// ==============================
// HELPERS
// ==============================

function formatNumberInput(inputEl) {
  // Ambil hanya angka
  let raw = inputEl.value.replace(/\D/g, "");

  // BATAS MAKS 7 DIGIT
  if (raw.length > 7) {
    raw = raw.slice(0, 7);
  }

  if (!raw) {
    inputEl.value = "";
    return "";
  }

  // Format ke id-ID (1.000.000)
  const formatted = new Intl.NumberFormat("id-ID").format(raw);
  inputEl.value = formatted;

  return raw; // angka bersih
}

fetch("assets/logos.json")
  .then(res => res.json())
  .then(logos => {
    const select = document.getElementById("logoSelect");

    logos.forEach(filename => {
      const option = document.createElement("option");
      option.value = `assets/logos/${filename}`;
      option.textContent = filename
        .replace(/\.[^/.]+$/, "")   // hapus .png
        .replace(/[-_]/g, " ")      // ganti - _
        .replace(/\b\w/g, l => l.toUpperCase()); // kapital

      select.appendChild(option);
    });
  })
  .catch(err => {
    console.error("Failed to load logos.json", err);
  });


document.getElementById("downloadJPG").onclick = () => download();
