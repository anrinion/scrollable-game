(async () => {
  const container = document.getElementById("game-container");

  const params = new URLSearchParams(window.location.search);
  const versionParam = params.get("version");
  
  // Whitelist acceptable versions
  const validVersions = ["demo", "game"];
  
  if (!validVersions.includes(versionParam)) {
    // Show version selector menu
    const menuEl = document.createElement("div");
    menuEl.className = "level-screen";
    
    let html = `<h1 style="margin-bottom: 2rem;">Select Version</h1>`;
    html += `<div style="display: flex; flex-direction: column; gap: 15px;">`;
    validVersions.forEach(v => {
      const isDev = params.get("dev") === "true" ? "&dev=true" : "";
      html += `<button onclick="window.location.href='?version=${v}${isDev}'">Play ${v.toUpperCase()}</button>`;
    });
    html += `</div>`;
    
    menuEl.innerHTML = html;
    container.appendChild(menuEl);
    return; // Stop initialization
  }

  const version = versionParam;

  const response = await fetch(`data/levels_${version}.json`);
  const config = await response.json();

  const engine = new SwipeGameEngine(config, container);
  
  // Register custom plugins
  engine.registerComponent("ButtonChoicePlugin", ButtonChoicePlugin);

  engine.loadLevel("level_01");

  // Expose for dev tools
  window.__gameEngine = engine;
  window.__gameConfig = config;

  // Load dev module only when URL param is present
  if (new URLSearchParams(window.location.search).get("dev") === "true") {
    const script = document.createElement("script");
    script.src = "js/dev.js";
    document.body.appendChild(script);
  }
})();
