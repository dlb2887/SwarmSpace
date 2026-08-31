(() => {
  const { actors, channels, chapters, posts, sources } = window.SWARM_DATA;
  const actorMap = new Map(actors.map((actor) => [actor.id, actor]));
  const sourceMap = new Map(sources.map((source) => [source.id, source]));
  const channelMap = new Map(channels.map((channel) => [channel.id, channel]));

  const elements = {
    actorGrid: document.querySelector("#actor-grid"),
    chapterNavigation: document.querySelector("#chapter-navigation"),
    channelNavigation: document.querySelector("#channel-navigation"),
    clearFilter: document.querySelector("#clear-filter"),
    dialog: document.querySelector("#detail-dialog"),
    dialogContent: document.querySelector("#dialog-content"),
    featuredActors: document.querySelector("#featured-actors"),
    filterSummary: document.querySelector("#filter-summary"),
    progressBar: document.querySelector("#progress-bar"),
    progressChapter: document.querySelector("#progress-chapter"),
    progressPercent: document.querySelector("#progress-percent"),
    sourceList: document.querySelector("#source-list"),
    themeToggle: document.querySelector("#theme-toggle"),
    timelineFeed: document.querySelector("#timeline-feed")
  };

  let channelFilter = null;

  function avatar(actor, compact = false) {
    const scorerClass = actor.type === "scorer" ? " scorer" : "";
    return `<span class="avatar${scorerClass}" style="--avatar-color: ${actor.color}" aria-hidden="true">${actor.initials}</span>`;
  }

  function treatmentLabel(treatment) {
    return {
      direct: "Direct excerpt",
      paraphrase: "Paraphrased",
      reconstructed: "Reconstructed",
      system: "System reconstruction"
    }[treatment];
  }

  function renderNavigation() {
    elements.chapterNavigation.innerHTML = chapters
      .map(
        (chapter, index) =>
          `<a class="chapter-link${index === 0 ? " active" : ""}" href="#chapter-${chapter.id}" data-chapter-link="${chapter.id}">
            <span>${chapter.number}</span>${chapter.shortTitle}
          </a>`
      )
      .join("");

    elements.channelNavigation.innerHTML = channels
      .map(
        (channel) =>
          `<button class="channel-button" type="button" data-channel="${channel.id}" title="${channel.summary}">
            <i>${channel.icon}</i>${channel.name}
          </button>`
      )
      .join("");
  }

  function renderTimeline() {
    const filteredPosts = channelFilter
      ? posts.filter((post) => post.channelId === channelFilter)
      : posts;

    elements.timelineFeed.innerHTML = chapters
      .map((chapter) => {
        const chapterPosts = filteredPosts.filter((post) => post.chapterId === chapter.id);
        if (!chapterPosts.length) return "";

        return `<section class="chapter" id="chapter-${chapter.id}" data-chapter="${chapter.id}">
          <header class="chapter-header">
            <span class="chapter-number">${chapter.number}</span>
            <h2>${chapter.title}</h2>
            <p class="chapter-date">${chapter.date}</p>
            <p class="chapter-intro">${chapter.intro}</p>
          </header>
          <div class="post-list">
            ${chapterPosts.map(renderPost).join("")}
          </div>
          <div class="chapter-takeaway">
            <strong>Why this matters</strong>
            <p>${chapter.significance}</p>
          </div>
        </section>`;
      })
      .join("");

    document.querySelectorAll("[data-evidence]").forEach((button) => {
      button.addEventListener("click", () => openEvidence(button.dataset.evidence));
    });

    elements.clearFilter.hidden = !channelFilter;
    elements.filterSummary.textContent = channelFilter
      ? `Showing #${channelMap.get(channelFilter).name}`
      : "Showing the complete story";
  }

  function renderPost(post) {
    const actor = actorMap.get(post.actorId);
    const reactions = post.reactions || {};
    const systemClass = post.treatment === "system" ? " system-post" : "";
    const actorType = actor.type === "agent" ? actor.role : actor.type;

    return `<article class="post${systemClass}" id="post-${post.id}">
      <header class="post-header">
        ${avatar(actor)}
        <div class="post-identity">
          <p class="post-name">${actor.name}<span class="actor-type">${actorType}</span></p>
          <p class="post-meta">#${channelMap.get(post.channelId).name} · ${post.time}</p>
        </div>
        <span class="treatment-badge ${post.treatment}">${treatmentLabel(post.treatment)}</span>
      </header>
      <p class="post-content">${post.content}</p>
      <footer class="post-actions">
        ${reactions.insight ? `<span class="reaction">◇ ${reactions.insight}</span>` : ""}
        ${reactions.relay ? `<span class="reaction">↗ ${reactions.relay}</span>` : ""}
        <button class="evidence-button" type="button" data-evidence="${post.id}">
          ${post.evidence.length} ${post.evidence.length === 1 ? "source" : "sources"} <span aria-hidden="true">→</span>
        </button>
      </footer>
    </article>`;
  }

  function renderActors() {
    elements.actorGrid.innerHTML = actors
      .map(
        (actor) => `<article class="actor-card" tabindex="0" role="button" data-actor="${actor.id}">
          ${avatar(actor)}
          <h2>${actor.name}</h2>
          <p class="actor-role">${actor.role} · ${actor.type}</p>
          <p>${actor.summary}</p>
        </article>`
      )
      .join("");

    document.querySelectorAll("[data-actor]").forEach((card) => {
      const open = () => openActor(card.dataset.actor);
      card.addEventListener("click", open);
      card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          open();
        }
      });
    });

    elements.featuredActors.innerHTML = ["phaseone", "49903", "uri23816b", "strict-causal"]
      .map((id) => {
        const actor = actorMap.get(id);
        return `<div class="featured-actor">
          ${avatar(actor, true)}
          <div><strong>${actor.name}</strong><span>${actor.role}</span></div>
        </div>`;
      })
      .join("");
  }

  function renderSources() {
    elements.sourceList.innerHTML = sources
      .map(
        (source) => `<a class="source-card" href="${source.url}" target="_blank" rel="noreferrer">
          <div>
            <span class="source-publisher">${source.publisher}</span>
            <p>${source.date}</p>
          </div>
          <div>
            <h2>${source.title}</h2>
            <p>${source.description}</p>
          </div>
          <span class="source-kind">${source.type} ↗</span>
        </a>`
      )
      .join("");
  }

  function openEvidence(postId) {
    const post = posts.find((item) => item.id === postId);
    const actor = actorMap.get(post.actorId);
    elements.dialogContent.innerHTML = `
      <span class="dialog-label">Evidence for this ${treatmentLabel(post.treatment).toLowerCase()}</span>
      <h2 class="dialog-title">${actor.name} in #${channelMap.get(post.channelId).name}</h2>
      <p class="dialog-summary">${post.content}</p>
      ${post.evidence
        .map((item) => {
          const source = sourceMap.get(item.sourceId);
          return `<div class="evidence-entry">
            <strong>${source.publisher} · ${source.title}</strong>
            <span>Locator: ${item.locator}</span>
            <p>${item.note}</p>
            <a href="${item.url || source.url}" target="_blank" rel="noreferrer">Open the source ↗</a>
          </div>`;
        })
        .join("")}`;
    elements.dialog.showModal();
  }

  function openActor(actorId) {
    const actor = actorMap.get(actorId);
    const actorPosts = posts.filter((post) => post.actorId === actorId);
    elements.dialogContent.innerHTML = `
      <span class="dialog-label">${actor.type}</span>
      <h2 class="dialog-title">${actor.name}</h2>
      <p class="actor-role">${actor.role}</p>
      <p class="dialog-summary">${actor.summary}</p>
      <div class="evidence-entry">
        <strong>First sourced appearance</strong>
        <span>${actor.firstSeen}</span>
        <p>${actorPosts.length} timeline ${actorPosts.length === 1 ? "appearance" : "appearances"} in this reconstruction.</p>
      </div>
      ${actor.sourceIds
        .map((sourceId) => {
          const source = sourceMap.get(sourceId);
          return `<div class="evidence-entry">
            <strong>${source.publisher}</strong>
            <span>${source.title}</span>
            <a href="${source.url}" target="_blank" rel="noreferrer">Open the source ↗</a>
          </div>`;
        })
        .join("")}`;
    elements.dialog.showModal();
  }

  function openMethod() {
    elements.dialogContent.innerHTML = `
      <span class="dialog-label">Editorial method</span>
      <h2 class="dialog-title">Evidence first. Interpretation visible.</h2>
      <p class="dialog-summary">
        The complete message board is not public. SwarmSpace reconstructs representative,
        plain-English conversations from published reports without presenting them as recovered logs.
      </p>
      <div class="evidence-entry">
        <strong>Direct excerpt</strong>
        <p>Words published in a source, kept short and attributed.</p>
      </div>
      <div class="evidence-entry">
        <strong>Paraphrased</strong>
        <p>A close plain-English rendering of an action, message, or conclusion described by a source.</p>
      </div>
      <div class="evidence-entry">
        <strong>Reconstructed</strong>
        <p>Representative dialogue assembled from sourced actions and relationships. It is not a quotation.</p>
      </div>`;
    elements.dialog.showModal();
  }

  function navigate() {
    const viewName = location.hash.slice(1).split("/")[0] || "timeline";
    const knownView = ["timeline", "actors", "sources", "about"].includes(viewName)
      ? viewName
      : "timeline";

    document.querySelectorAll(".view").forEach((view) => {
      view.classList.toggle("active", view.id === `${knownView}-view`);
    });
    document.querySelectorAll("[data-view-link]").forEach((link) => {
      link.classList.toggle("active", link.dataset.viewLink === knownView);
    });

    if (knownView !== "timeline") window.scrollTo({ top: 0, behavior: "auto" });
  }

  function updateProgress() {
    if (!document.querySelector("#timeline-view").classList.contains("active")) return;
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const percentage = scrollable > 0 ? Math.min(100, Math.max(0, (window.scrollY / scrollable) * 100)) : 0;
    elements.progressBar.style.width = `${percentage}%`;
    elements.progressPercent.textContent = `${Math.round(percentage)}%`;

    const chapterElements = [...document.querySelectorAll(".chapter")];
    let current = chapterElements[0];
    for (const chapter of chapterElements) {
      if (chapter.getBoundingClientRect().top <= 180) current = chapter;
    }
    if (!current) return;
    const chapter = chapters.find((item) => item.id === current.dataset.chapter);
    elements.progressChapter.textContent = chapter.title;
    document.querySelectorAll("[data-chapter-link]").forEach((link) => {
      link.classList.toggle("active", link.dataset.chapterLink === chapter.id);
    });
  }

  function bindEvents() {
    window.addEventListener("hashchange", navigate);
    window.addEventListener("scroll", updateProgress, { passive: true });
    document.querySelector("#start-reading").addEventListener("click", () => {
      document.querySelector(".chapter")?.scrollIntoView({ behavior: "smooth" });
    });
    document.querySelectorAll("[data-open-method]").forEach((button) => {
      button.addEventListener("click", openMethod);
    });
    document.querySelector(".dialog-close").addEventListener("click", () => elements.dialog.close());
    elements.dialog.addEventListener("click", (event) => {
      if (event.target === elements.dialog) elements.dialog.close();
    });
    elements.channelNavigation.addEventListener("click", (event) => {
      const button = event.target.closest("[data-channel]");
      if (!button) return;
      channelFilter = button.dataset.channel;
      document.querySelectorAll("[data-channel]").forEach((item) => {
        item.classList.toggle("active", item.dataset.channel === channelFilter);
      });
      renderTimeline();
      document.querySelector("#reading-toolbar").scrollIntoView({ behavior: "smooth" });
    });
    elements.clearFilter.addEventListener("click", () => {
      channelFilter = null;
      document.querySelectorAll("[data-channel]").forEach((item) => item.classList.remove("active"));
      renderTimeline();
    });
    elements.themeToggle.addEventListener("click", () => {
      const nextTheme = document.documentElement.dataset.theme === "light" ? "dark" : "light";
      document.documentElement.dataset.theme = nextTheme;
      localStorage.setItem("swarmspace-theme", nextTheme);
    });
  }

  function init() {
    const savedTheme = localStorage.getItem("swarmspace-theme");
    if (savedTheme) document.documentElement.dataset.theme = savedTheme;
    renderNavigation();
    renderTimeline();
    renderActors();
    renderSources();
    bindEvents();
    navigate();
    updateProgress();
  }

  init();
})();
