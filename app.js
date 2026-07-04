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

async function renderGallery(projects) {
  const grid = document.getElementById("gallery-grid");
  if (!grid) return;
  if (!projects || projects.length === 0) {
    grid.innerHTML = '<p class="error-msg">暂无项目数据</p>';
    return;
  }
  const uploadBase = API_BASE.replace("/api", "");
  grid.innerHTML = projects.map(p => {
    const imgUrl = p.imageUrl || uploadBase + "/uploads/" + (p.image || "");
    return `<div class="gallery-card" data-project-id="${p.id || ""}">
      <div class="gallery-card-image">
        <img src="${imgUrl}" alt="${p.title || ""}" loading="lazy"
             onerror="this.parentElement.style.background='var(--gray-200)'"/>
      </div>
      <div class="gallery-card-body">
        <h3>${p.title || ""}</h3>
        <p>${p.description || ""}</p>
        <div class="gallery-card-tags">
          ${p.category ? `<span class="tag">${p.category}</span>` : ""}
          ${p.area ? `<span class="tag">${p.area}m²</span>` : ""}
        </div>
      </div>
    </div>`;
  }).join("");
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
  await renderGallery(projectsData);
  await renderAdvantages(contentData);
  await renderContact(contentData);
}

document.addEventListener("DOMContentLoaded", init);
