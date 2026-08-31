(() => {
  const { actors, channels, chapters, posts, sources, social } = window.SWARM_DATA;
  const actorMap = new Map(actors.map((actor) => [actor.id, actor]));
  const sourceMap = new Map(sources.map((source) => [source.id, source]));
  const channelMap = new Map(channels.map((channel) => [channel.id, channel]));
  const postMap = new Map(posts.map((post) => [post.id, post]));
  const comments = social.comments || [];
  const postMeta = social.postMeta || {};

  const elements = {
    actorGrid: document.querySelector("#actor-grid"),
    chapterNavigation: document.querySelector("#chapter-navigation"),
    channelNavigation: document.querySelector("#channel-navigation"),
    dialog: document.querySelector("#detail-dialog"),
    dialogContent: document.querySelector("#dialog-content"),
    feedFilters: document.querySelector("#feed-filters"),
    feedSummary: document.querySelector("#feed-summary"),
    featuredActors: document.querySelector("#featured-actors"),
    globalSearch: document.querySelector("#global-search"),
    homeFeed: document.querySelector("#home-feed"),
    profileContent: document.querySelector("#profile-content"),
    sourceList: document.querySelector("#source-list"),
    themeToggle: document.querySelector("#theme-toggle"),
    timelineFeed: document.querySelector("#timeline-feed"),
    trendingTags: document.querySelector("#trending-tags")
  };

  let feedFilter = "all";
  let hashtagFilter = null;
  let searchTerm = "";
  let pendingPostId = null;

  const escapeHtml = (value = "") =>
    String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const treatmentLabel = (treatment) =>
    ({
      direct: "Direct excerpt",
      paraphrase: "Paraphrased",
      reconstructed: "Reconstructed",
      system: "System reconstruction"
    })[treatment] || treatment;

  const actorHandle = (actor) =>
    `@${actor.name.replaceAll("[", "").replaceAll("]", "").replaceAll(" ", "")}`;

  function avatar(actor, size = "medium") {
    return `<span class="avatar ${escapeHtml(actor.type)} ${size}" aria-hidden="true">${escapeHtml(actor.initials)}</span>`;
  }

  function actorIdentity(actor, compact = false) {
    return `<a class="actor-identity${compact ? " compact" : ""}" href="#profile/${encodeURIComponent(actor.id)}">
      ${avatar(actor, compact ? "small" : "medium")}
      <span>
        <strong>${escapeHtml(actor.name)}</strong>
        <small>${escapeHtml(actorHandle(actor))}</small>
      </span>
    </a>`;
  }

  function renderMentionLinks(actorIds = []) {
    if (!actorIds.length) return "";
    return `<div class="mention-row">${actorIds
      .filter((actorId) => actorMap.has(actorId))
      .map((actorId) => {
        const actor = actorMap.get(actorId);
        return `<a href="#profile/${encodeURIComponent(actor.id)}">${escapeHtml(actorHandle(actor))}</a>`;
      })
      .join("")}</div>`;
  }

  function renderHashtags(tags = []) {
    if (!tags.length) return "";
    return `<div class="hashtag-row">${tags
      .map(
        (tag) =>
          `<button type="button" data-hashtag="${escapeHtml(tag)}">#${escapeHtml(tag)}</button>`
      )
      .join("")}</div>`;
  }

  function commentsFor(postId) {
    return comments.filter((comment) => comment.postId === postId);
  }

  function renderComment(comment) {
    const actor = actorMap.get(comment.actorId);
    return `<article class="comment" id="comment-${escapeHtml(comment.id)}">
      ${actorIdentity(actor, true)}
      <div class="comment-body">
        <div class="comment-meta">
          <span>${escapeHtml(comment.time)}</span>
          <span class="treatment-label ${escapeHtml(comment.treatment)}">${escapeHtml(
            treatmentLabel(comment.treatment)
          )}</span>
        </div>
        <p>${escapeHtml(comment.content)}</p>
        ${renderMentionLinks(comment.mentions)}
        <small class="comment-basis">${escapeHtml(comment.evidenceNote)}</small>
      </div>
    </article>`;
  }

  function renderPost(post, options = {}) {
    const actor = actorMap.get(post.actorId);
    const channel = channelMap.get(post.channelId);
    const meta = postMeta[post.id] || {};
    const replies = commentsFor(post.id);
    const reactions = post.reactions || {};
    const showComments = options.showComments !== false;
    const timelineShare =
      post.kind === "timeline"
        ? `<a class="timeline-preview" href="#timeline">
            <span class="timeline-preview-icon" aria-hidden="true">◷</span>
            <span><strong>Open the incident timeline</strong><small>${chapters.length} chapters with sourced milestones</small></span>
            <span aria-hidden="true">›</span>
          </a>`
        : "";

    return `<article class="social-post${post.treatment === "system" ? " system-post" : ""}" id="post-${escapeHtml(post.id)}">
      <header class="post-header">
        ${actorIdentity(actor)}
        <div class="post-context">
          <a href="#home" data-channel-link="${escapeHtml(post.channelId)}">#${escapeHtml(channel.name)}</a>
          <span>${escapeHtml(post.time)}</span>
        </div>
        <span class="treatment-label ${escapeHtml(post.treatment)}">${escapeHtml(
          treatmentLabel(post.treatment)
        )}</span>
      </header>
      <div class="post-body">
        <p>${escapeHtml(post.content)}</p>
        ${renderMentionLinks(meta.mentions)}
        ${renderHashtags(meta.hashtags)}
        ${timelineShare}
      </div>
      <footer class="post-actions">
        <span aria-label="${reactions.insight || 0} insights">◇ ${reactions.insight || 0}</span>
        <span aria-label="${replies.length} comments">○ ${replies.length}</span>
        <span aria-label="${reactions.relay || 0} relays">↗ ${reactions.relay || 0}</span>
        <button type="button" data-evidence="${escapeHtml(post.id)}">View evidence</button>
      </footer>
      ${
        showComments && replies.length
          ? `<section class="comment-thread" aria-label="Replies to ${escapeHtml(actor.name)}">
              ${replies.map(renderComment).join("")}
            </section>`
          : ""
      }
    </article>`;
  }

  function postMatches(post) {
    if (feedFilter !== "all" && post.channelId !== feedFilter) return false;
    const tags = postMeta[post.id]?.hashtags || [];
    if (hashtagFilter && !tags.includes(hashtagFilter)) return false;
    if (!searchTerm) return true;

    const actor = actorMap.get(post.actorId);
    const replyText = commentsFor(post.id)
      .map((comment) => `${actorMap.get(comment.actorId).name} ${comment.content}`)
      .join(" ");
    const searchText = [
      post.content,
      actor.name,
      actor.role,
      channelMap.get(post.channelId).name,
      tags.join(" "),
      replyText
    ]
      .join(" ")
      .toLowerCase();
    return searchText.includes(searchTerm);
  }

  function renderHomeFeed() {
    const filtered = posts.filter(postMatches);
    elements.homeFeed.innerHTML = filtered.length
      ? filtered.map((post) => renderPost(post)).join("")
      : `<div class="empty-state"><strong>No posts found</strong><p>Try another actor, tag, or channel.</p></div>`;

    const filters = [];
    if (feedFilter !== "all") filters.push(`#${channelMap.get(feedFilter).name}`);
    if (hashtagFilter) filters.push(`#${hashtagFilter}`);
    if (searchTerm) filters.push(`search: "${searchTerm}"`);
    elements.feedSummary.textContent = filters.length
      ? `Showing ${filtered.length} posts for ${filters.join(", ")}`
      : "Showing the full conversation";
  }

  function renderTimeline() {
    elements.chapterNavigation.innerHTML = chapters
      .map(
        (chapter) =>
          `<a href="#timeline/${encodeURIComponent(chapter.id)}" data-timeline-jump="${escapeHtml(
            chapter.id
          )}"><span>${escapeHtml(chapter.number)}</span>${escapeHtml(chapter.shortTitle)}</a>`
      )
      .join("");

    elements.timelineFeed.innerHTML = chapters
      .map((chapter) => {
        const chapterPosts = posts.filter(
          (post) => post.chapterId === chapter.id && post.kind !== "timeline"
        );
        return `<section class="timeline-chapter" id="chapter-${escapeHtml(chapter.id)}">
          <header>
            <span>${escapeHtml(chapter.number)}</span>
            <div>
              <p>${escapeHtml(chapter.date)}</p>
              <h2>${escapeHtml(chapter.title)}</h2>
              <p>${escapeHtml(chapter.intro)}</p>
            </div>
          </header>
          <div class="timeline-posts">${chapterPosts
            .map((post) => renderPost(post, { showComments: false }))
            .join("")}</div>
          <aside><strong>Why this matters</strong><p>${escapeHtml(chapter.significance)}</p></aside>
        </section>`;
      })
      .join("");
  }

  function activityFor(actorId) {
    const activity = [];

    posts.forEach((post, index) => {
      if (post.actorId === actorId) {
        activity.push({ type: "post", index: index * 10 + 3, post });
      }
      if ((postMeta[post.id]?.mentions || []).includes(actorId)) {
        activity.push({ type: "mention", index: index * 10 + 2, post });
      }
    });

    comments.forEach((comment, index) => {
      const post = postMap.get(comment.postId);
      const postIndex = posts.findIndex((item) => item.id === post.id);
      if (comment.actorId === actorId) {
        activity.push({ type: "comment", index: postIndex * 10 + 1 + index / 100, post, comment });
      }
      if ((comment.mentions || []).includes(actorId)) {
        activity.push({
          type: "comment-mention",
          index: postIndex * 10 + index / 100,
          post,
          comment
        });
      }
    });

    return activity.sort((a, b) => b.index - a.index);
  }

  function renderActivityItem(item, actorId) {
    if (item.type === "post") {
      return `<article class="activity-item">
        <span class="activity-icon" aria-hidden="true">✎</span>
        <div><small>Posted in #${escapeHtml(channelMap.get(item.post.channelId).name)}</small>
        <p>${escapeHtml(item.post.content)}</p>
        <button type="button" data-jump-post="${escapeHtml(item.post.id)}">View post</button></div>
      </article>`;
    }

    if (item.type === "comment") {
      const parentActor = actorMap.get(item.post.actorId);
      return `<article class="activity-item">
        <span class="activity-icon" aria-hidden="true">○</span>
        <div><small>Replied to ${escapeHtml(parentActor.name)}</small>
        <p>${escapeHtml(item.comment.content)}</p>
        <button type="button" data-jump-post="${escapeHtml(item.post.id)}">View conversation</button></div>
      </article>`;
    }

    const sourceActor =
      item.type === "mention"
        ? actorMap.get(item.post.actorId)
        : actorMap.get(item.comment.actorId);
    const content = item.type === "mention" ? item.post.content : item.comment.content;
    return `<article class="activity-item mention-activity">
      <span class="activity-icon" aria-hidden="true">@</span>
      <div><small>Mentioned by ${escapeHtml(sourceActor.name)}</small>
      <p>${escapeHtml(content)}</p>
      <button type="button" data-jump-post="${escapeHtml(item.post.id)}">View conversation</button></div>
    </article>`;
  }

  function renderProfile(actorId) {
    const actor = actorMap.get(actorId);
    if (!actor) {
      elements.profileContent.innerHTML =
        '<div class="empty-state"><strong>Actor not found</strong><p>Return to the people directory.</p></div>';
      return;
    }

    const activity = activityFor(actorId);
    const authoredPosts = posts.filter((post) => post.actorId === actorId).length;
    const authoredComments = comments.filter((comment) => comment.actorId === actorId).length;
    const mentions = activity.filter((item) => item.type.includes("mention")).length;

    elements.profileContent.innerHTML = `
      <section class="profile-header">
        <div class="profile-cover"></div>
        <div class="profile-main">
          ${avatar(actor, "large")}
          <div class="profile-actions">
            <a class="quiet-button" href="#people">All actors</a>
            <button class="primary-button" type="button" disabled>Following record</button>
          </div>
          <h1>${escapeHtml(actor.name)}</h1>
          <p class="profile-handle">${escapeHtml(actorHandle(actor))}</p>
          <p class="profile-summary">${escapeHtml(actor.summary)}</p>
          <div class="profile-meta">
            <span>${escapeHtml(actor.role)}</span>
            <span>First seen ${escapeHtml(actor.firstSeen)}</span>
          </div>
          <div class="profile-stats">
            <span><strong>${authoredPosts}</strong> posts</span>
            <span><strong>${authoredComments}</strong> replies</span>
            <span><strong>${mentions}</strong> mentions</span>
            <span><strong>${actor.sourceIds.length}</strong> sources</span>
          </div>
        </div>
      </section>
      <div class="profile-layout">
        <section class="profile-activity">
          <header><h2>Recent activity</h2><span>${activity.length} recorded interactions</span></header>
          ${
            activity.length
              ? activity.slice(0, 16).map((item) => renderActivityItem(item, actorId)).join("")
              : `<article class="activity-item"><span class="activity-icon">@</span><div>
                  <small>Profile added from the public record</small>
                  <p>${escapeHtml(actor.summary)}</p>
                </div></article>`
          }
        </section>
        <aside class="profile-sources">
          <h2>Source support</h2>
          ${actor.sourceIds
            .map((sourceId) => {
              const source = sourceMap.get(sourceId);
              return `<a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">
                <strong>${escapeHtml(source.publisher)}</strong>
                <span>${escapeHtml(source.title)}</span>
              </a>`;
            })
            .join("")}
        </aside>
      </div>`;
  }

  function renderActors() {
    elements.actorGrid.innerHTML = actors
      .map((actor) => {
        const activity = activityFor(actor.id);
        return `<a class="actor-card" href="#profile/${encodeURIComponent(actor.id)}">
          ${avatar(actor, "medium")}
          <div>
            <h2>${escapeHtml(actor.name)}</h2>
            <p>${escapeHtml(actorHandle(actor))}</p>
            <span>${escapeHtml(actor.role)}</span>
          </div>
          <strong>${activity.length}<small> activities</small></strong>
        </a>`;
      })
      .join("");

    const featuredIds = ["phaseone10841", "phaseone", "49903", "jan183411", "lily", "strict-causal"];
    elements.featuredActors.innerHTML = featuredIds
      .map((id) => {
        const actor = actorMap.get(id);
        return `${actorIdentity(actor, true)}`;
      })
      .join("");
  }

  function renderNavigation() {
    elements.channelNavigation.innerHTML = channels
      .map(
        (channel) =>
          `<button type="button" data-channel="${escapeHtml(channel.id)}"><span>#</span>${escapeHtml(
            channel.name
          )}</button>`
      )
      .join("");

    const tagCounts = new Map();
    Object.values(postMeta).forEach((meta) => {
      (meta.hashtags || []).forEach((tag) => tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1));
    });
    elements.trendingTags.innerHTML = [...tagCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7)
      .map(
        ([tag, count]) =>
          `<button type="button" data-hashtag="${escapeHtml(tag)}"><strong>#${escapeHtml(
            tag
          )}</strong><span>${count} posts</span></button>`
      )
      .join("");
  }

  function renderSources() {
    elements.sourceList.innerHTML = sources
      .map(
        (source) => `<a class="source-card" href="${escapeHtml(
          source.url
        )}" target="_blank" rel="noreferrer">
          <div><span>${escapeHtml(source.publisher)}</span><small>${escapeHtml(source.date)}</small></div>
          <div><h2>${escapeHtml(source.title)}</h2><p>${escapeHtml(source.description)}</p></div>
          <strong>${escapeHtml(source.type)} <span aria-hidden="true">↗</span></strong>
        </a>`
      )
      .join("");
  }

  function openEvidence(postId) {
    const post = postMap.get(postId);
    const actor = actorMap.get(post.actorId);
    elements.dialogContent.innerHTML = `
      <span class="dialog-label">Evidence for this ${escapeHtml(
        treatmentLabel(post.treatment).toLowerCase()
      )}</span>
      <h2>${escapeHtml(actor.name)} in #${escapeHtml(channelMap.get(post.channelId).name)}</h2>
      <p class="dialog-summary">${escapeHtml(post.content)}</p>
      ${post.evidence
        .map((item) => {
          const source = sourceMap.get(item.sourceId);
          return `<article class="evidence-entry">
            <strong>${escapeHtml(source.publisher)}</strong>
            <span>${escapeHtml(source.title)}</span>
            <small>Locator: ${escapeHtml(item.locator)}</small>
            <p>${escapeHtml(item.note)}</p>
            <a href="${escapeHtml(item.url || source.url)}" target="_blank" rel="noreferrer">Open source <span aria-hidden="true">↗</span></a>
          </article>`;
        })
        .join("")}`;
    elements.dialog.showModal();
  }

  function openMethod() {
    elements.dialogContent.innerHTML = `
      <span class="dialog-label">Editorial method</span>
      <h2>Evidence first. Interpretation visible.</h2>
      <p class="dialog-summary">The complete message board is not public. SwarmSpace translates documented actions and relationships into plain-English social posts.</p>
      <article class="evidence-entry"><strong>Direct excerpt</strong><p>Words published in a source, kept short and attributed.</p></article>
      <article class="evidence-entry"><strong>Paraphrased</strong><p>A close plain-English rendering of a published action or message.</p></article>
      <article class="evidence-entry"><strong>Reconstructed</strong><p>Representative language based on sourced actions and relationships. It is not a quotation.</p></article>`;
    elements.dialog.showModal();
  }

  function setFeedFilter(channelId) {
    feedFilter = channelId || "all";
    hashtagFilter = null;
    document.querySelectorAll("[data-feed-filter]").forEach((button) => {
      button.classList.toggle("active", button.dataset.feedFilter === feedFilter);
    });
    document.querySelectorAll("[data-channel]").forEach((button) => {
      button.classList.toggle("active", button.dataset.channel === feedFilter);
    });
    renderHomeFeed();
  }

  function navigate() {
    const [route, parameter] = location.hash.slice(1).split("/");
    const viewName = route || "home";
    const knownViews = ["home", "timeline", "people", "profile", "sources", "about"];
    const activeView = knownViews.includes(viewName) ? viewName : "home";

    document.querySelectorAll(".view").forEach((view) => {
      view.classList.toggle("active", view.id === `${activeView}-view`);
    });
    document.querySelectorAll("[data-view-link], [data-side-link]").forEach((link) => {
      const target = link.dataset.viewLink || link.dataset.sideLink;
      link.classList.toggle(
        "active",
        target === activeView || (activeView === "profile" && target === "people")
      );
    });

    if (activeView === "profile") renderProfile(decodeURIComponent(parameter || ""));
    if (activeView === "timeline" && parameter) {
      requestAnimationFrame(() =>
        document.querySelector(`#chapter-${CSS.escape(parameter)}`)?.scrollIntoView()
      );
    } else if (activeView === "home" && pendingPostId) {
      const postId = pendingPostId;
      pendingPostId = null;
      requestAnimationFrame(() =>
        document.querySelector(`#post-${CSS.escape(postId)}`)?.scrollIntoView()
      );
    } else {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }

  function bindEvents() {
    window.addEventListener("hashchange", navigate);
    elements.globalSearch.addEventListener("input", (event) => {
      searchTerm = event.target.value.trim().toLowerCase();
      if (!location.hash.startsWith("#home")) location.hash = "home";
      renderHomeFeed();
    });
    elements.feedFilters.addEventListener("click", (event) => {
      const button = event.target.closest("[data-feed-filter]");
      if (button) setFeedFilter(button.dataset.feedFilter);
    });
    document.addEventListener("click", (event) => {
      const evidenceButton = event.target.closest("[data-evidence]");
      if (evidenceButton) openEvidence(evidenceButton.dataset.evidence);

      const hashtagButton = event.target.closest("[data-hashtag]");
      if (hashtagButton) {
        hashtagFilter = hashtagButton.dataset.hashtag;
        feedFilter = "all";
        location.hash = "home";
        renderHomeFeed();
      }

      const channelButton = event.target.closest("[data-channel]");
      if (channelButton) {
        location.hash = "home";
        setFeedFilter(channelButton.dataset.channel);
      }

      const channelLink = event.target.closest("[data-channel-link]");
      if (channelLink) setFeedFilter(channelLink.dataset.channelLink);

      const jumpButton = event.target.closest("[data-jump-post]");
      if (jumpButton) {
        pendingPostId = jumpButton.dataset.jumpPost;
        if (location.hash === "#home") {
          navigate();
          return;
        }
        location.hash = "home";
      }
    });
    document.querySelectorAll("[data-open-method]").forEach((button) => {
      button.addEventListener("click", openMethod);
    });
    document.querySelector(".dialog-close").addEventListener("click", () => elements.dialog.close());
    elements.dialog.addEventListener("click", (event) => {
      if (event.target === elements.dialog) elements.dialog.close();
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
    renderHomeFeed();
    renderTimeline();
    renderActors();
    renderSources();
    bindEvents();
    navigate();
  }

  init();
})();
