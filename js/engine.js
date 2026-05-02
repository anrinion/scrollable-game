class SwipeGameEngine {
  constructor(config, container) {
    this.config = config;
    this.container =
      typeof container === "string"
        ? document.querySelector(container)
        : container;
    if (!this.container) throw new Error("Container element not found");

    // Setup wrapper for JS translation
    this.wrapper = document.createElement("div");
    this.wrapper.className = "scroll-wrapper";
    this.container.appendChild(this.wrapper);

    this.currentLevel = null;
    this.currentState = null;
    this.nodes = {};
    this.autoTimers = [];
    this.currentComponent = null;
    this.activeBackgrounds = [];

    this.components = new Map();
    this.conditions = new Map();
    this.hooks = new Map();
    this._listeners = {};

    this._translateX = 0;
    this._translateY = 0;
    this._isAnimating = false;

    // Initialize gesture tracker
    this.gestureTracker = new GestureTracker(this.container, {
      onDragStart: () => {
        if (this._isAnimating) return;
        this.wrapper.style.transition = "none";
      },
      onDrag: ({ dx, dy }) => {
        if (this._isAnimating) return;
        this._translateX = dx;
        this._translateY = dy;
        this._applyTransform();
      },
      onRelease: ({ committed, direction, dx, dy }) => {
        if (this._isAnimating) return;
        if (committed && direction) {
          // Check if direction is valid
          const node = this.nodes[this.currentState];
          const hasTransition = node?.transitions?.some(t => t.event === direction && this._checkCondition(t.condition));
          
          if (hasTransition) {
            this._snapAndTransition(direction);
            return;
          }
        }
        // Cancel / snap back
        this._snapBack();
      }
    });
  }

  on(event, callback) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(callback);
  }

  registerComponent(name, ComponentClass) {
    this.components.set(name, ComponentClass);
  }
  registerCondition(name, fn) {
    this.conditions.set(name, fn);
  }
  registerHook(name, fn) {
    this.hooks.set(name, fn);
  }

  loadLevel(levelId) {
    const level = this.config.levels[levelId];
    if (!level) throw new Error(`Level "${levelId}" not found in config`);

    level.id = levelId;

    this._clearAutoTimers();
    this._unmountCurrentComponent();

    this.currentLevel = level;
    this.nodes = level.nodes;
    this.currentState = level.initial;

    this._translateX = 0;
    this._translateY = 0;
    this.wrapper.style.transition = "none";
    this._applyTransform();

    this._executeHook(this.nodes[this.currentState]?.onEnter);
    this._renderVirtualGrid();

    this._emit("stateChange", {
      level: this.currentLevel,
      state: this.currentState,
    });
  }

  jumpToState(levelId, stateId) {
    const level = this.config.levels[levelId];
    if (!level) return;
    
    // Set level data if we are jumping to a new level
    level.id = levelId;
    this.currentLevel = level;
    this.nodes = level.nodes;
    
    const node = this.nodes[stateId];
    if (!node) return;

    if (this.currentState && this.nodes[this.currentState]) {
      this._executeHook(this.nodes[this.currentState].onExit);
    }
    
    this._clearAutoTimers();
    this._unmountCurrentComponent();

    this.currentState = stateId;
    
    // Reset translation since the new state becomes the center
    this._translateX = 0;
    this._translateY = 0;
    this.wrapper.style.transition = "none";
    this._applyTransform();

    this._executeHook(node.onEnter);
    this._renderVirtualGrid();
    
    this._emit("stateChange", {
      level: this.currentLevel,
      state: this.currentState,
    });
  }

  handleEvent(eventType) {
    if (!this.currentLevel || !this.currentState) return;
    const node = this.nodes[this.currentState];
    if (!node || !node.transitions) return;

    for (const trans of node.transitions) {
      if (trans.event === eventType) {
        if (this._checkCondition(trans.condition)) {
          this._transitionTo(trans.target);
          return;
        }
      }
    }
  }

  _transitionTo(targetId) {
    const targetNode = this.nodes[targetId];

    if (!targetNode) {
      const nextLevel = this.config.levels[targetId];
      if (nextLevel) {
        this.loadLevel(targetId);
      } else {
        console.error(`Target "${targetId}" is neither a node nor a level.`);
      }
      return;
    }

    if (this.currentState && this.nodes[this.currentState]) {
      this._executeHook(this.nodes[this.currentState].onExit);
    }
    this._clearAutoTimers();
    this._unmountCurrentComponent();

    this.currentState = targetId;
    
    // Reset translation since the new state becomes the center
    this._translateX = 0;
    this._translateY = 0;
    this.wrapper.style.transition = "none";
    this._applyTransform();

    this._executeHook(targetNode.onEnter);
    this._renderVirtualGrid();
    
    this._emit("stateChange", {
      level: this.currentLevel,
      state: this.currentState,
    });
  }

  _renderVirtualGrid() {
    this.wrapper.innerHTML = "";
    
    // Clean up old backgrounds to stop animation loops
    this.activeBackgrounds.forEach(bg => bg.destroy());
    this.activeBackgrounds = [];

    const node = this.nodes[this.currentState];
    if (!node) return;

    // Render current node at center
    const currentEl = this._createScreenElement(node, 0, 0, this.currentLevel.id);
    this.wrapper.appendChild(currentEl);

    // Pre-render adjacent nodes
    if (node.transitions) {
      const renderedTargets = new Set(); // Avoid rendering same target multiple times
      
      for (const trans of node.transitions) {
        if (!this._checkCondition(trans.condition)) continue;
        if (trans.event === "auto" || renderedTargets.has(trans.target)) continue;
        
        let tx = 0, ty = 0;
        if (trans.event === "swipe_up") ty = this.container.clientHeight; // target is below
        else if (trans.event === "swipe_down") ty = -this.container.clientHeight; // target is above
        else if (trans.event === "swipe_left") tx = this.container.clientWidth; // target is to the right
        else if (trans.event === "swipe_right") tx = -this.container.clientWidth; // target is to the left
        else continue;

        let targetLevelId = this.currentLevel.id;
        let targetNode = this.nodes[trans.target];
        if (!targetNode && this.config.levels[trans.target]) {
          targetLevelId = trans.target;
          targetNode = this.config.levels[trans.target].nodes[this.config.levels[trans.target].initial];
        }
        
        if (targetNode) {
          const el = this._createScreenElement(targetNode, tx, ty, targetLevelId);
          this.wrapper.appendChild(el);
          renderedTargets.add(trans.target);
        }
      }
    }

    this._scheduleAutoTransitions();
  }

  _createScreenElement(node, x, y, levelId) {
    const el = document.createElement("div");
    el.className = "level-screen";
    el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    
    // Add background canvas for this specific screen
    const canvas = document.createElement("canvas");
    canvas.className = "bg-canvas";
    el.appendChild(canvas);
    
    // Initialize background
    const seed = levelId + node.id;
    const bg = new window.ProceduralBackground(canvas, seed);
    this.activeBackgrounds.push(bg);

    // Content container wrapper to sit above background
    const contentDiv = document.createElement("div");
    contentDiv.style.position = "relative";
    contentDiv.style.zIndex = "2";
    
    const content = node.content;
    if (content) {
      if (content.type === "text") {
        contentDiv.textContent = content.value;
      } else if (content.type === "html") {
        contentDiv.innerHTML = content.value;
      } else if (content.type === "component") {
        if (x === 0 && y === 0) { // Only mount component for active screen
          this._mountComponent(content.component, content.props, contentDiv);
        }
      }
    }
    
    el.appendChild(contentDiv);
    return el;
  }

  _applyTransform() {
    this.wrapper.style.transform = `translate3d(${this._translateX}px, ${this._translateY}px, 0)`;
  }

  _snapAndTransition(direction) {
    this._isAnimating = true;
    let tx = 0, ty = 0;
    if (direction === "swipe_up") ty = -this.container.clientHeight; // wrapper moves up
    else if (direction === "swipe_down") ty = this.container.clientHeight;
    else if (direction === "swipe_left") tx = -this.container.clientWidth;
    else if (direction === "swipe_right") tx = this.container.clientWidth;

    this.wrapper.style.transition = "transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
    this._translateX = tx;
    this._translateY = ty;
    this._applyTransform();

    setTimeout(() => {
      this._isAnimating = false;
      this.handleEvent(direction);
    }, 300);
  }

  _snapBack() {
    this._isAnimating = true;
    this.wrapper.style.transition = "transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
    this._translateX = 0;
    this._translateY = 0;
    this._applyTransform();
    setTimeout(() => {
      this._isAnimating = false;
    }, 300);
  }

  _scheduleAutoTransitions() {
    const node = this.nodes[this.currentState];
    if (!node || !node.transitions) return;
    node.transitions.forEach((trans) => {
      if (!trans.event.startsWith("auto")) return;
      const delay = trans.delay || 0;
      
      const timerId = setTimeout(() => {
        // Parse visualization parameter from event name
        let ty = 0;
        let tx = 0;
        let animate = false;
        
        if (trans.event === "auto_swipe_up") { ty = -this.container.clientHeight; animate = true; }
        else if (trans.event === "auto_swipe_down") { ty = this.container.clientHeight; animate = true; }
        else if (trans.event === "auto_swipe_left") { tx = -this.container.clientWidth; animate = true; }
        else if (trans.event === "auto_swipe_right") { tx = this.container.clientWidth; animate = true; }
        
        if (animate) {
          this._isAnimating = true;
          this.wrapper.style.transition = "transform 0.6s cubic-bezier(0.25, 1, 0.5, 1)";
          this._translateX = tx;
          this._translateY = ty;
          this._applyTransform();
          setTimeout(() => {
            this._isAnimating = false;
            this.handleEvent(trans.event);
          }, 600);
        } else {
          // Instant cut (e.g. "auto" or "auto_fade")
          this.handleEvent(trans.event);
        }
      }, delay);
      this.autoTimers.push(timerId);
    });
  }

  _clearAutoTimers() {
    this.autoTimers.forEach((id) => clearTimeout(id));
    this.autoTimers = [];
  }

  _checkCondition(condition) {
    if (!condition) return true;
    if (typeof condition === "string") {
      const fn = this.conditions.get(condition);
      if (typeof fn !== "function") {
        console.warn(`Condition "${condition}" not registered`);
        return false;
      }
      return fn();
    }
    if (typeof condition === "function") return condition();
    return true;
  }

  _executeHook(hookName) {
    if (!hookName) return;
    const fn = this.hooks.get(hookName);
    if (fn) fn(this.nodes[this.currentState], this);
  }

  _mountComponent(componentName, props = {}, container = this.wrapper) {
    const ComponentClass = this.components.get(componentName);
    if (!ComponentClass) {
      console.error(`Component "${componentName}" not registered`);
      return;
    }
    const instance = new ComponentClass(props);
    this.currentComponent = instance;
    instance.mount(container, (eventType) => this.handleEvent(eventType));
  }

  _unmountCurrentComponent() {
    if (
      this.currentComponent &&
      typeof this.currentComponent.unmount === "function"
    ) {
      this.currentComponent.unmount();
    }
    this.currentComponent = null;
  }

  _emit(event, ...args) {
    const cbs = this._listeners[event] || [];
    cbs.forEach((cb) => cb(...args));
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = SwipeGameEngine;
} else {
  window.SwipeGameEngine = SwipeGameEngine;
}
