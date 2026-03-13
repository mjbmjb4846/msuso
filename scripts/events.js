(function () {
  const EVENTS_JSON_PATH = "events/events.json";
  const DEFAULT_DIVISION = "B";
  const DIVISION_STORAGE_KEY = "msuso.events.selectedDivision";

  const EVENT_TYPE_COLORS = {
    test: "#3b82f6",
    lab: "orange",
    build: "purple",
  };

  const EVENT_TYPE_FALLBACK_DESCRIPTION = {
    test: "Study content knowledge, strategy, and problem-solving skills.",
    lab: "Practice hands-on techniques, data analysis, and scientific process.",
    build: "Design, build, test, and iterate for competition performance.",
  };

  function injectStyles() {
    if (document.getElementById("events-slider-style")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "events-slider-style";
    style.textContent = `
      .events-switch-wrap {
        display: flex;
        justify-content: center;
        margin-bottom: var(--space-8);
      }

      .events-switch {
        position: relative;
        display: inline-grid;
        grid-template-columns: 1fr 1fr;
        padding: 0.25rem;
        background: rgba(255, 255, 255, 0.88);
        border: 1px solid rgba(0, 0, 0, 0.08);
        border-radius: 999px;
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
        backdrop-filter: blur(4px);
      }

      .events-switch-indicator {
        position: absolute;
        top: 0.25rem;
        bottom: 0.25rem;
        left: 0.25rem;
        width: calc(50% - 0.25rem);
        border-radius: 999px;
        background: var(--color-primary);
        transition: transform 220ms ease;
        z-index: 0;
      }

      .events-switch[data-active-division="C"] .events-switch-indicator {
        transform: translateX(100%);
      }

      .events-switch button {
        position: relative;
        z-index: 1;
        border: none;
        border-radius: 999px;
        padding: 0.55rem 1rem;
        font: inherit;
        font-weight: 600;
        cursor: pointer;
        background: transparent;
        color: var(--color-text-secondary);
        transition: color 160ms ease, transform 160ms ease;
      }

      .events-switch button:hover {
        transform: translateY(-1px);
      }

      .events-switch button[aria-pressed="true"] {
        color: white;
      }

      .events-section-fade {
        animation: eventsFadeIn 220ms ease;
      }

      @keyframes eventsFadeIn {
        from {
          opacity: 0;
          transform: translateY(8px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `;

    document.head.appendChild(style);
  }

  function slugify(name) {
    return String(name || "")
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/'/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }

  function normalizeDivision(value) {
    if (Array.isArray(value)) {
      return value
        .map((entry) => String(entry).trim().toUpperCase())
        .filter((entry) => entry === "B" || entry === "C");
    }

    if (typeof value === "string") {
      const upper = value.toUpperCase();
      const divisions = [];
      if (upper.includes("B")) divisions.push("B");
      if (upper.includes("C")) divisions.push("C");
      return divisions;
    }

    return [];
  }

  function normalizeStringList(value) {
    if (!Array.isArray(value)) {
      return [];
    }
    return value
      .filter((entry) => typeof entry === "string")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }

  function normalizeEventTypes(value) {
    if (Array.isArray(value)) {
      const normalized = value
        .map((entry) => String(entry).trim().toLowerCase())
        .filter(Boolean);
      return [...new Set(normalized)];
    }

    if (typeof value === "string") {
      const normalized = value
        .split(/[,/|+]/g)
        .map((entry) => entry.trim().toLowerCase())
        .filter(Boolean);
      return [...new Set(normalized)];
    }

    return [];
  }

  function toDisplayTypeLabel(type) {
    if (!type) return "";
    return type.charAt(0).toUpperCase() + type.slice(1);
  }

  function getDescription(eventEntry, eventTypes) {
    if (typeof eventEntry.description === "string" && eventEntry.description.trim()) {
      return eventEntry.description.trim();
    }

    if (eventTypes.length === 1 && EVENT_TYPE_FALLBACK_DESCRIPTION[eventTypes[0]]) {
      return EVENT_TYPE_FALLBACK_DESCRIPTION[eventTypes[0]];
    }

    return "Explore resources, guidance, and preparation tips for this event.";
  }

  function makeCard(eventEntry, division) {
    const card = document.createElement("msu-card");
    const title = String(eventEntry.name || "").trim();
    const slug = slugify(title);
    const eventTypes = normalizeEventTypes(eventEntry["event-type"]);
    const tags = normalizeStringList(eventEntry.tags);

    card.setAttribute("title", title || "Untitled Event");
    card.setAttribute("description", getDescription(eventEntry, eventTypes));
    card.setAttribute("href", `events/${division.toLowerCase()}/${slug}.html`);

    if (tags.length > 0) {
      card.setAttribute("badges", JSON.stringify(tags));
    }

    const colorBadges = eventTypes.map((eventType) => ({
      text: toDisplayTypeLabel(eventType),
      color: EVENT_TYPE_COLORS[eventType] || "#64748b",
    }));

    if (colorBadges.length > 0) {
      card.setAttribute("color-badges", JSON.stringify(colorBadges));
    }

    return card;
  }

  function groupByCategory(events) {
    const orderedCategories = [];
    const groups = new Map();

    for (const eventEntry of events) {
      const rawCategory = typeof eventEntry["event-category"] === "string"
        ? eventEntry["event-category"].trim()
        : "";
      const category = rawCategory || "Other Events";

      if (!groups.has(category)) {
        groups.set(category, []);
        orderedCategories.push(category);
      }

      groups.get(category).push(eventEntry);
    }

    return { orderedCategories, groups };
  }

  function buildDivisionSlider(container, onChange, initialDivision) {
    const wrap = document.createElement("div");
    wrap.className = "events-switch-wrap";

    const slider = document.createElement("div");
    slider.className = "events-switch";
    slider.dataset.activeDivision = initialDivision;
    slider.setAttribute("role", "group");
    slider.setAttribute("aria-label", "Select event division");

    const indicator = document.createElement("span");
    indicator.className = "events-switch-indicator";
    indicator.setAttribute("aria-hidden", "true");
    slider.appendChild(indicator);

    const divisions = ["B", "C"];
    const buttons = new Map();

    function setActiveDivision(division) {
      slider.dataset.activeDivision = division;
      for (const [name, btn] of buttons.entries()) {
        btn.setAttribute("aria-pressed", name === division ? "true" : "false");
      }
    }

    function toggleDivision() {
      const current = slider.dataset.activeDivision === "C" ? "C" : "B";
      const next = current === "B" ? "C" : "B";
      setActiveDivision(next);
      onChange(next);
    }

    for (const division of divisions) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = `Division ${division}`;
      button.dataset.division = division;
      button.setAttribute("aria-pressed", division === initialDivision ? "true" : "false");
      buttons.set(division, button);
      slider.appendChild(button);
    }

    slider.addEventListener("click", () => {
      toggleDivision();
    });

    wrap.appendChild(slider);
    container.appendChild(wrap);

    return {
      setActiveDivision,
    };
  }

  function getStoredDivision() {
    try {
      const value = localStorage.getItem(DIVISION_STORAGE_KEY);
      if (value === "B" || value === "C") {
        return value;
      }
    } catch (_error) {
      // Ignore storage read failures and use defaults.
    }
    return null;
  }

  function storeDivision(division) {
    try {
      localStorage.setItem(DIVISION_STORAGE_KEY, division);
    } catch (_error) {
      // Ignore storage write failures to avoid blocking UI updates.
    }
  }

  function renderEventsSection(events, division, refs) {
    const divisionEvents = events.filter((eventEntry) => {
      if (!eventEntry || typeof eventEntry !== "object") return false;
      if (eventEntry.active !== true) return false;

      const divisions = normalizeDivision(eventEntry.division);
      return divisions.includes(division);
    });

    const titleSuffix = division === "B" ? "Division B Events" : "Division C Events";
    refs.title.textContent = `${refs.baseTitle} ${titleSuffix}`;
    const subTitleSuffix = division === "B" ? "Division B event" : "Division C event";
    refs.subtitle.textContent = `Explore resources and information for each ${subTitleSuffix}.`;

    refs.categories.innerHTML = "";
    refs.categories.classList.remove("events-section-fade");
    void refs.categories.offsetWidth;
    refs.categories.classList.add("events-section-fade");

    if (divisionEvents.length === 0) {
      const empty = document.createElement("p");
      empty.style.fontSize = "var(--font-size-lg)";
      empty.style.color = "var(--color-text-secondary)";
      empty.style.marginBottom = "var(--space-8)";
      empty.textContent = `No active Division ${division} events are currently available.`;
      refs.categories.appendChild(empty);
      return;
    }

    const { orderedCategories, groups } = groupByCategory(divisionEvents);

    for (const category of orderedCategories) {
      const heading = document.createElement("h3");
      heading.style.marginBottom = "var(--space-4)";
      heading.style.color = "var(--color-primary)";
      heading.textContent = category;
      refs.categories.appendChild(heading);

      const grid = document.createElement("div");
      grid.className = "grid grid-4";
      grid.style.marginBottom = "var(--space-8)";

      const categoryEvents = groups.get(category) || [];
      for (const eventEntry of categoryEvents) {
        grid.appendChild(makeCard(eventEntry, division));
      }

      refs.categories.appendChild(grid);
    }
  }

  function extractEvents(payload) {
    if (Array.isArray(payload)) return payload;
    if (payload && typeof payload === "object" && Array.isArray(payload.events)) {
      return payload.events;
    }
    return [];
  }

  function setupSwipe(container, onSwipeLeft, onSwipeRight) {
    let startX = null;
    let startY = null;

    container.addEventListener("touchstart", (event) => {
      if (!event.touches || event.touches.length === 0) return;
      startX = event.touches[0].clientX;
      startY = event.touches[0].clientY;
    }, { passive: true });

    container.addEventListener("touchend", (event) => {
      if (startX === null || startY === null) return;
      if (!event.changedTouches || event.changedTouches.length === 0) return;

      const deltaX = event.changedTouches[0].clientX - startX;
      const deltaY = event.changedTouches[0].clientY - startY;
      startX = null;
      startY = null;

      if (Math.abs(deltaX) < 60 || Math.abs(deltaX) < Math.abs(deltaY)) {
        return;
      }

      if (deltaX < 0) {
        onSwipeLeft();
      } else {
        onSwipeRight();
      }
    }, { passive: true });
  }

  async function initDynamicEvents() {
    const eventsSection = document.getElementById("events");
    if (!eventsSection) return;

    const title = eventsSection.querySelector("[data-events-title]");
    const subtitle = eventsSection.querySelector("[data-events-subtitle]");
    const controls = eventsSection.querySelector("[data-events-controls]");
    const categories = eventsSection.querySelector("[data-events-categories]");

    if (!title || !subtitle || !controls || !categories) {
      return;
    }

    injectStyles();

    let payload;
    try {
      const response = await fetch(EVENTS_JSON_PATH, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Failed to load ${EVENTS_JSON_PATH}: ${response.status}`);
      }
      payload = await response.json();
    } catch (error) {
      subtitle.textContent = "Unable to load event listing data right now.";
      categories.innerHTML = "";
      console.error(error);
      return;
    }

    const events = extractEvents(payload);
    let currentDivision = getStoredDivision() || DEFAULT_DIVISION;

    const refs = {
      title,
      subtitle,
      controls,
      categories,
      baseTitle: title.dataset.eventsBaseTitle || "2026",
    };

    const sliderController = buildDivisionSlider(controls, (nextDivision) => {
      currentDivision = nextDivision;
      storeDivision(currentDivision);
      renderEventsSection(events, currentDivision, refs);
    }, currentDivision);

    function setDivision(nextDivision) {
      if (nextDivision !== "B" && nextDivision !== "C") {
        return;
      }
      currentDivision = nextDivision;
      sliderController.setActiveDivision(currentDivision);
      storeDivision(currentDivision);
      renderEventsSection(events, currentDivision, refs);
    }

    setupSwipe(eventsSection, () => {
      if (currentDivision === "B") {
        setDivision("C");
      }
    }, () => {
      if (currentDivision === "C") {
        setDivision("B");
      }
    });

    setDivision(currentDivision);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initDynamicEvents);
  } else {
    initDynamicEvents();
  }
})();
