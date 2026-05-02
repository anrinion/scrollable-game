(async () => {
  const engine = window.__gameEngine;
  const config = window.__gameConfig;
  if (!engine || !config) return;

  document.body.classList.add("dev-active");

  const devPanel = document.createElement("div");
  devPanel.id = "dev-panel";
  devPanel.style.cssText = `
    position: fixed;
    bottom: 10px;
    right: 10px;
    background: rgba(0, 0, 0, 0.8);
    color: #0f0;
    font-family: monospace;
    font-size: 12px;
    padding: 10px;
    border-radius: 5px;
    pointer-events: none;
    z-index: 9999;
    border: 1px solid #0f0;
    min-width: 200px;
  `;

  const stateInfo = document.createElement("div");
  devPanel.appendChild(stateInfo);

  const jumpContainer = document.createElement("div");
  jumpContainer.style.marginTop = "10px";
  jumpContainer.style.borderTop = "1px solid #0f0";
  jumpContainer.style.paddingTop = "10px";
  jumpContainer.style.pointerEvents = "auto"; // allow clicking inside the overlay

  const jumpSelect = document.createElement("select");
  jumpSelect.style.cssText = "background: #000; color: #0f0; border: 1px solid #0f0; padding: 2px; max-width: 150px;";
  
  Object.keys(config.levels).forEach(levelId => {
    const optGroup = document.createElement("optgroup");
    optGroup.label = levelId;
    Object.keys(config.levels[levelId].nodes).forEach(stateId => {
       const opt = document.createElement("option");
       opt.value = `${levelId}:${stateId}`;
       opt.textContent = `${levelId} -> ${stateId}`;
       optGroup.appendChild(opt);
    });
    jumpSelect.appendChild(optGroup);
  });

  const jumpBtn = document.createElement("button");
  jumpBtn.textContent = "Jump";
  jumpBtn.style.cssText = "background: #000; color: #0f0; border: 1px solid #0f0; padding: 2px 5px; margin-left: 5px; cursor: pointer;";
  
  jumpBtn.onclick = () => {
    const [lvl, st] = jumpSelect.value.split(":");
    engine.jumpToState(lvl, st);
  };

  jumpContainer.appendChild(jumpSelect);
  jumpContainer.appendChild(jumpBtn);
  devPanel.appendChild(jumpContainer);

  document.body.appendChild(devPanel);

  const updateOverlay = () => {
    if (!engine.currentState) return;
    const node = engine.nodes[engine.currentState];
    let html = `<strong>[DEV MODE]</strong><br><br>`;
    html += `Level: <span style="color: #fff">${engine.currentLevel.id}</span><br>`;
    html += `State: <span style="color: #fff">${engine.currentState}</span><br><br>`;
    
    html += `Transitions:<br>`;
    if (node && node.transitions) {
      node.transitions.forEach(t => {
        html += `- ${t.event} &rarr; ${t.target}`;
        if (t.delay) html += ` (delay: ${t.delay}ms)`;
        html += `<br>`;
      });
    } else {
      html += `<em>None</em>`;
    }
    
    stateInfo.innerHTML = html;
    
    // Auto-update select to current state
    jumpSelect.value = `${engine.currentLevel.id}:${engine.currentState}`;
  };

  engine.on("stateChange", updateOverlay);
  updateOverlay();
})();
