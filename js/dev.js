(async () => {
  const engine = window.__gameEngine;
  const config = window.__gameConfig;
  if (!engine || !config) return;

  const loadScript = (src) =>
    new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });

  const loadStyle = (href) =>
    new Promise((resolve) => {
      const l = document.createElement("link");
      l.rel = "stylesheet";
      l.href = href;
      l.onload = resolve;
      document.head.appendChild(l);
    });

  await Promise.all([
    loadStyle("https://unpkg.com/vis-network@9.1.6/styles/vis-network.min.css"),
    loadScript(
      "https://unpkg.com/vis-network@9.1.6/standalone/umd/vis-network.min.js",
    ),
    loadScript("js/visualizer.js"),
  ]);

  document.body.classList.add("dev-active");

  // ── Build dev panel DOM ──
  const devPanel = document.createElement("div");
  devPanel.id = "dev-panel";

  const header = document.createElement("div");
  header.className = "dev-header";

  const select = document.createElement("select");
  Object.keys(config.levels).forEach((id) => {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = id;
    select.appendChild(opt);
  });
  select.value = "level_01"; // will be corrected by engine listener below

  const goBtn = document.createElement("button");
  goBtn.textContent = "Load Level";
  goBtn.addEventListener("click", () => engine.loadLevel(select.value));

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "Close Dev";
  closeBtn.addEventListener("click", () => {
    document.body.classList.remove("dev-active");
    devPanel.remove();
  });

  header.appendChild(select);
  header.appendChild(goBtn);
  header.appendChild(closeBtn);
  devPanel.appendChild(header);

  const content = document.createElement("div");
  content.className = "dev-content";

  const visContainer = document.createElement("div");
  visContainer.id = "vis-network-container";
  content.appendChild(visContainer);

  // JSON editor section
  const jsonSection = document.createElement("div");
  jsonSection.className = "json-editor";

  const jsonHeader = document.createElement("div");
  jsonHeader.className = "json-editor-header";
  jsonHeader.innerHTML = "<span>Level JSON</span>";
  const applyBtn = document.createElement("button");
  applyBtn.textContent = "Apply";
  const copyBtn = document.createElement("button");
  copyBtn.textContent = "Copy";
  const actions = document.createElement("span");
  actions.appendChild(applyBtn);
  actions.appendChild(copyBtn);
  jsonHeader.appendChild(actions);

  const textarea = document.createElement("textarea");
  textarea.spellcheck = false;

  jsonSection.appendChild(jsonHeader);
  jsonSection.appendChild(textarea);
  content.appendChild(jsonSection);
  devPanel.appendChild(content);
  document.body.appendChild(devPanel);

  // ── Helper: show JSON for the currently selected level ──
  const updateTextarea = () => {
    const levelId = select.value;
    const level = config.levels[levelId];
    if (level) {
      textarea.value = JSON.stringify(level, null, 2);
    }
  };

  // Update textarea when user manually changes the dropdown
  select.addEventListener("change", updateTextarea);

  // Apply button: replace in‑memory config and reload
  applyBtn.addEventListener("click", () => {
    const levelId = select.value;
    try {
      const newLevel = JSON.parse(textarea.value);
      if (!newLevel.id || !newLevel.initial || !newLevel.nodes) {
        throw new Error("Level must have id, initial, and nodes");
      }
      config.levels[levelId] = newLevel;
      engine.loadLevel(levelId);
      updateTextarea();
    } catch (e) {
      alert("Invalid JSON: " + e.message);
    }
  });

  // Copy button
  copyBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(textarea.value).catch(() => {
      textarea.select();
      document.execCommand("copy");
    });
    copyBtn.textContent = "Copied!";
    setTimeout(() => (copyBtn.textContent = "Copy"), 1500);
  });

  // ── Keep dev panel in sync with engine (auto‑transitions, etc.) ──
  let currentLevelId = engine.currentLevel?.id || "level_01";
  engine.on("stateChange", ({ level }) => {
    if (level.id !== currentLevelId) {
      select.value = level.id;
      currentLevelId = level.id;
      updateTextarea();
    }
  });

  // Initial population
  updateTextarea();

  // Start the visualizer
  new SwipeGameVisualizer(engine, config, visContainer);
})();
