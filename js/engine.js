class SwipeGameEngine {
  constructor(config, container) {
    this.config = config;
    this.container =
      typeof container === "string"
        ? document.querySelector(container)
        : container;
    if (!this.container) throw new Error("Container element not found");

    this.currentLevel = null;
    this.currentState = null;
    this.nodes = {};
    this.autoTimers = [];
    this.currentComponent = null;

    this.components = new Map();
    this.conditions = new Map();
    this.hooks = new Map();

    this._listeners = {};
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

    level.id = levelId; // ensures visualizer & dev tools can identify the level

    this._clearAutoTimers();
    this._unmountCurrentComponent();

    this.currentLevel = level;
    this.nodes = level.nodes;
    this.currentState = level.initial;

    this._executeHook(this.nodes[this.currentState]?.onEnter);
    this._renderCurrentNode();

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

  jumpToState(stateId) {
    const node = this.nodes[stateId];
    if (!node) return;

    if (this.currentState && this.nodes[this.currentState]) {
      this._executeHook(this.nodes[this.currentState].onExit);
    }
    this._clearAutoTimers();
    this._unmountCurrentComponent();

    this.currentState = stateId;
    this._executeHook(node.onEnter);
    this._renderCurrentNode();
    this._emit("stateChange", {
      level: this.currentLevel,
      state: this.currentState,
    });
  }

  _transitionTo(targetId) {
    const targetNode = this.nodes[targetId];

    if (!targetNode) {
      // Target might be a level ID – load that level
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
    this._executeHook(targetNode.onEnter);
    this._renderCurrentNode();
    this._emit("stateChange", {
      level: this.currentLevel,
      state: this.currentState,
    });
  }

  _renderCurrentNode() {
    const node = this.nodes[this.currentState];
    if (!node) return;
    this.container.innerHTML = "";
    const content = node.content;
    if (!content) return;

    switch (content.type) {
      case "text":
        this.container.textContent = content.value;
        break;
      case "html":
        this.container.innerHTML = content.value;
        break;
      case "component":
        this._mountComponent(content.component, content.props);
        break;
      default:
        console.warn(`Unknown content type: ${content.type}`);
    }
    this._scheduleAutoTransitions();
  }

  _scheduleAutoTransitions() {
    const node = this.nodes[this.currentState];
    if (!node || !node.transitions) return;
    node.transitions.forEach((trans) => {
      if (trans.event !== "auto") return;
      const delay = trans.delay || 0;
      const timerId = setTimeout(() => this.handleEvent("auto"), delay);
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

  _mountComponent(componentName, props = {}) {
    const ComponentClass = this.components.get(componentName);
    if (!ComponentClass) {
      console.error(`Component "${componentName}" not registered`);
      return;
    }
    const instance = new ComponentClass(props);
    this.currentComponent = instance;
    instance.mount(this.container, (eventType) => this.handleEvent(eventType));
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
