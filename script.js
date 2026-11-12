"use strict";
(() => {
  // This landing page has no analytics, trackers, third-party scripts, or admin endpoints.
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  // Preserve the original brand asset: fall back to the original WordPress URL
  // while migrating media, rather than approximating or redrawing the emblem.
  document.querySelectorAll("img[data-fallback]").forEach((img) => {
    img.addEventListener("error", () => {
      if (img.dataset.fallbackTried === "1") return;
      img.dataset.fallbackTried = "1";
      img.src = img.dataset.fallback;
    });
  });

  // A tiny scroll meter uses requestAnimationFrame; no parallax libraries.
  const progress = document.getElementById("scroll-progress");
  let scheduled = false;
  const paintProgress = () => {
    scheduled = false;
    const doc = document.documentElement;
    const max = Math.max(1, doc.scrollHeight - window.innerHeight);
    if (progress) progress.style.transform = "scaleX(" + Math.max(0, Math.min(1, window.scrollY / max)) + ")";
  };
  window.addEventListener("scroll", () => {
    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(paintProgress);
    }
  }, { passive: true });
  window.addEventListener("resize", paintProgress, { passive: true });
  paintProgress();

  if (!reduceMotion && "IntersectionObserver" in window) {
    document.body.classList.add("js-motion");
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(({ target, isIntersecting }) => {
        if (isIntersecting) {
          target.classList.add("in-view");
          observer.unobserve(target);
        }
      });
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.06 });
    document.querySelectorAll(".rise").forEach((el) => observer.observe(el));
  }

  const list = document.getElementById("signal-list");
  if (!list) return;
  const empty = (message) => {
    list.replaceChildren();
    const p = document.createElement("p");
    p.className = "signals-empty";
    p.textContent = message;
    list.append(p);
  };
  const safeUrl = (value) => {
    try {
      const u = new URL(value, window.location.href);
      return u.protocol === "https:" || u.protocol === "http:" ? u.href : null;
    } catch {
      return null;
    }
  };
  const text = (value, max) => String(value ?? "").trim().slice(0, max);
  const dateLabel = (value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return "TANPA TANGGAL";
    const d = new Date(value + "T12:00:00");
    if (Number.isNaN(d.getTime())) return "TANPA TANGGAL";
    return d.toLocaleDateString("id-ID", { day:"2-digit", month:"short", year:"numeric" }).toUpperCase();
  };
  const renderSignals = (items) => {
    list.replaceChildren();
    if (!items.length) {
      empty("Belum ada transmisi yang dibuka.");
      return;
    }
    items.slice(0, 6).forEach((item, i) => {
      const entry = document.createElement("article");
      entry.className = "signal-entry";
      const meta = document.createElement("div");
      meta.className = "signal-meta";
      meta.textContent = "SINYAL " + String(i + 1).padStart(2, "0") + " / " + dateLabel(item.date);
      const body = document.createElement("div");
      const title = document.createElement("h3");
      title.textContent = text(item.title, 95) || "Tanpa judul";
      body.append(title);
      const desc = text(item.text, 230);
      if (desc) {
        const p = document.createElement("p");
        p.textContent = desc;
        body.append(p);
      }
      entry.append(meta, body);
      const url = item.url ? safeUrl(item.url) : null;
      if (url) {
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.rel = "noopener noreferrer";
        anchor.target = "_blank";
        anchor.setAttribute("aria-label", "Buka sinyal: " + title.textContent);
        anchor.textContent = "↗";
        entry.append(anchor);
      } else {
        const space = document.createElement("span");
        space.setAttribute("aria-hidden", "true");
        entry.append(space);
      }
      list.append(entry);
    });
  };
  fetch("data/signals.json", { cache: "no-store" })
    .then((response) => {
      if (!response.ok) throw new Error("Status HTTP " + response.status);
      return response.json();
    })
    .then((data) => {
      if (!Array.isArray(data?.signals)) throw new Error("Format sinyal tidak valid");
      renderSignals(data.signals.filter((entry) => entry && typeof entry === "object" && entry.published !== false));
    })
    .catch(() => empty("Frekuensi sedang sunyi."));
})();
