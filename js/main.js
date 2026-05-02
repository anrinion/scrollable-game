(async () => {
  const container = document.getElementById("game-container");

  const response = await fetch("data/levels_demo.json");
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
