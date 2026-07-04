// ============================
// API 配置
// ============================
const API_BASE = "http://localhost:3001/api";

// ============================
// 工具函数
// ============================

async function fetchData(endpoint) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error(`[API Error] ${endpoint}:`, err.message);
    return null;
  }
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el && text) el.textContent = text;
}

function setHTML(id, html) {
  const el = document.getElementById(id);
  if (el && html) el.innerHTML = html;
}

// ============================
// 渲染函数
// ============================

async function renderHero(content) {
  if (!content || !content.hero) return;
  setText("hero-name", content.hero.title || "梁俊伟");
  setText("hero-title", content.hero.subtitle || "室内设计师");
  setText("hero-desc", content.hero.tagline || "17年设计经验");
}

async function renderAbout(content) {
  if (!content || !content.about) return;
  const about = content.about;
  let intro = about.bio || about.bio2 || "";
  if (about.bio && about.bio2) intro += "<br><br>" + about.bio2;
  setHTML("about-intro", intro);

  const statsEl = document.getElementById("about-stats");
  if (statsEl && about.stats && about.stats.length) {
    statsEl.innerHTML = about.stats.map(s =>
      `<div class="stat-item">
        <div class="stat-number">${s.number || s.value || ""}${s.suffix || ""}</div>
        <div class="stat-label">${s.label || ""}</div>
      </div>`
    ).join("");
  }

  const contactEl = document.getElementById("contact-info");
  if (contactEl) {
    const items = [];
    if (about.phone) items.push(`<p>📱 ${about.phone}</p>`);
    if (about.email) items.push(`<p>✉️ <a href="mailto:${about.email}">${about.email}</a></p>`);
    if (about.address || about.education) items.push(`<p>📍 ${about.address || about.education || ""}</p>`);
    contactEl.innerHTML = items.join("");
  }
}

async function initCircularGallery(projects) {
  const container = document.getElementById("circular-gallery");
  if (!container || !projects || projects.length === 0) return;

  const galleryItems = projects.map(p => ({
    image: p.imageUrl || p.grayscaleUrl || "",
    text: `${p.title} · ${p.category} · ${p.area}㎡`
  }));

  if (typeof CircularGalleryRenderer !== "undefined") {
    try {
      new CircularGalleryRenderer(container, {
        items: galleryItems,
        bend: 5,
        textColor: "#ffffff",
        borderRadius: 0.06,
        scrollEase: 0.08,
        scrollSpeed: 2.5,
        font: "bold 16px 'Noto Sans SC', sans-serif"
      });
    } catch (err) {
      console.error("CircularGallery init error:", err);
      // Fallback to simple horizontal scroll
      container.innerHTML = galleryItems.map(item =>
        `<div style="flex-shrink:0;width:320px;height:220px;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.15);">
          <img src="${item.image}" style="width:100%;height:100%;object-fit:cover;">
          <div style="position:absolute;bottom:0;left:0;right:0;padding:16px;background:linear-gradient(transparent,rgba(0,0,0,0.7));color:#fff;font-size:14px;">${item.text}</div>
        </div>`
      ).join("");
    }
  } else {
    // Fallback: simple horizontal scroll gallery
    container.style.display = "flex";
    container.style.overflowX = "auto";
    container.style.gap = "20px";
    container.style.padding = "40px 0";
    container.style.scrollSnapType = "x mandatory";
    container.innerHTML = galleryItems.map(item =>
      `<div style="flex-shrink:0;width:320px;height:220px;border-radius:16px;overflow:hidden;scroll-snap-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.15);transition:transform 0.3s ease;">
        <img src="${item.image}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'">
        <div style="position:absolute;bottom:0;left:0;right:0;padding:16px;background:linear-gradient(transparent,rgba(0,0,0,0.7));color:#fff;font-size:14px;">${item.text}</div>
      </div>`
    ).join("");
  }
}

async function renderAdvantages(content) {
  const grid = document.getElementById("advantage-grid");
  if (!grid || !content || !content.strengths) return;
  grid.innerHTML = content.strengths.map(a =>
    `<div class="advantage-card">
      <span class="advantage-icon">${a.icon || "◆"}</span>
      <h3>${a.title || ""}</h3>
      <p>${a.desc || a.description || ""}</p>
    </div>`
  ).join("");
}

async function renderContact(content) {
  const cards = document.getElementById("contact-cards");
  if (!cards || !content || !content.contact) return;
  const c = content.contact;
  cards.innerHTML = `
    <div class="contact-card">
      <h3>📱 电话</h3>
      <p>${c.phone || ""}</p>
    </div>
    <div class="contact-card">
      <h3>✉️ 邮箱</h3>
      <p>${c.email || ""}</p>
    </div>
    <div class="contact-card">
      <h3>📍 地址</h3>
      <p>${c.address || ""}</p>
    </div>
    <div class="contact-card">
      <h3>💬 微信</h3>
      <p>${c.wechat || ""}</p>
    </div>
  `;
}

// ============================
// 主入口
// ============================

async function init() {
  document.getElementById("footer-year").textContent = new Date().getFullYear();
  const [contentData, projectsData] = await Promise.all([
    fetchData("/content"),
    fetchData("/projects"),
  ]);
  await renderHero(contentData);
  await renderAbout(contentData);
  await initCircularGallery(projectsData);
  await renderAdvantages(contentData);
  await renderContact(contentData);
}

document.addEventListener("DOMContentLoaded", init);
