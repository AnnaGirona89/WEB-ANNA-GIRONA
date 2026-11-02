(function () {
  "use strict";

  const content = document.getElementById("content");
  const gridPanel = document.querySelector('[data-display-panel="grid"]');
  const listPanel = document.querySelector('[data-display-panel="list"]');

  /* ---------- Media con fallback automático (img -> video -> placeholder texto) ---------- */

  function buildMedia(project) {
    const wrapper = document.createElement("div");
    wrapper.className = "project-card__media";

    const img = document.createElement("img");
    img.src = `assets/${project.slug}/cover.jpg`;
    img.alt = [project.client, project.title].filter(Boolean).join(" — ");
    img.loading = "lazy";

    img.addEventListener("error", () => {
      const video = document.createElement("video");
      video.src = `assets/${project.slug}/cover.mp4`;
      video.muted = true;
      video.loop = true;
      video.autoplay = true;
      video.playsInline = true;

      video.addEventListener("error", () => {
        video.remove();
        wrapper.classList.add("is-missing");
        wrapper.dataset.fallbackLabel = [project.client, project.title]
          .filter(Boolean)
          .join(" ");
      });

      img.replaceWith(video);
    });

    wrapper.appendChild(img);
    return wrapper;
  }

  /* ---------- Render grid ---------- */

  function renderGrid(projects) {
    gridPanel.innerHTML = "";
    projects.forEach((project) => {
      const card = document.createElement("article");
      card.className = "project-card";

      card.appendChild(buildMedia(project));

      const meta = document.createElement("div");
      meta.className = "project-card__meta";

      const title = document.createElement("p");
      title.className = "project-card__title";
      title.innerHTML = project.client
        ? `<span class="project-card__client">${project.client}</span> — ${project.title}`
        : project.title;

      const tags = document.createElement("p");
      tags.className = "project-card__tags";
      tags.textContent = project.tags.join(" · ");

      meta.appendChild(title);
      meta.appendChild(tags);
      card.appendChild(meta);

      gridPanel.appendChild(card);
      observeReveal(card);
    });
  }

  /* ---------- Render lista ---------- */

  function renderList(projects) {
    listPanel.innerHTML = "";
    projects.forEach((project, i) => {
      const row = document.createElement("div");
      row.className = "project-row";

      const index = document.createElement("span");
      index.className = "project-row__index";
      index.textContent = String(i + 1).padStart(2, "0");

      const title = document.createElement("span");
      title.className = "project-row__title";
      title.innerHTML = project.client
        ? `<span class="project-row__client">${project.client}</span> — ${project.title}`
        : project.title;

      const tags = document.createElement("span");
      tags.className = "project-row__tags";
      tags.textContent = project.tags.join(" · ");

      row.appendChild(index);
      row.appendChild(title);
      row.appendChild(tags);

      listPanel.appendChild(row);
      observeReveal(row);
    });
  }

  /* ---------- Animación de entrada al hacer scroll ---------- */

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { root: content, rootMargin: "0px 0px -8% 0px", threshold: 0.1 }
  );

  function observeReveal(el) {
    revealObserver.observe(el);
  }

  /* ---------- Toggle grid / lista ---------- */

  function initDisplayToggle() {
    const buttons = document.querySelectorAll(".display-toggle");
    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        const target = button.dataset.display;

        buttons.forEach((b) => b.classList.toggle("is-active", b === button));

        gridPanel.hidden = target !== "grid";
        listPanel.hidden = target !== "list";
      });
    });
  }

  /* ---------- Navegación Trabajo / Personal / About Me ---------- */

  function initNav() {
    const navLinks = document.querySelectorAll(".nav-link");
    const views = document.querySelectorAll("[data-view-panel]");

    navLinks.forEach((link) => {
      link.addEventListener("click", () => {
        const target = link.dataset.view;

        navLinks.forEach((l) => l.classList.toggle("is-active", l === link));
        views.forEach((view) => {
          view.hidden = view.dataset.viewPanel !== target;
        });

        content.scrollTo({ top: 0 });
      });
    });
  }

  /* ---------- Init ---------- */

  const trabajoProjects = PROJECTS.filter((p) => p.category === "trabajo");
  const personalProjects = PROJECTS.filter((p) => p.category === "personal");

  renderGrid(trabajoProjects);
  renderList(trabajoProjects);

  const personalPanel = document.querySelector('[data-view-panel="personal"] .projects--grid');
  if (personalPanel) {
    personalProjects.forEach((project) => {
      const card = document.createElement("article");
      card.className = "project-card";
      card.appendChild(buildMedia(project));

      const meta = document.createElement("div");
      meta.className = "project-card__meta";
      const title = document.createElement("p");
      title.className = "project-card__title";
      title.textContent = project.title;
      const tags = document.createElement("p");
      tags.className = "project-card__tags";
      tags.textContent = project.tags.join(" · ");
      meta.appendChild(title);
      meta.appendChild(tags);
      card.appendChild(meta);

      personalPanel.appendChild(card);
      observeReveal(card);
    });
  }

  initDisplayToggle();
  initNav();
})();
