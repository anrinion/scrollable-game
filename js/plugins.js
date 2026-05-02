/**
 * BasePlugin defines the standard interface for all custom level components.
 * Plugins handle their own rendering and dispatch events back to the FSM.
 */
class BasePlugin {
  constructor(props) {
    this.props = props || {};
    this.container = null;
    this.dispatch = null;
  }

  /**
   * Called by the engine when the component needs to be rendered.
   * @param {HTMLElement} container - The DOM element to render into.
   * @param {function} dispatch - Callback to send events to the FSM (e.g., dispatch('swipe_up')).
   */
  mount(container, dispatch) {
    this.container = container;
    this.dispatch = dispatch;
    this.render();
  }

  /**
   * Implement custom rendering logic here.
   */
  render() {
    throw new Error("BasePlugin.render() must be implemented by subclass");
  }

  /**
   * Called by the engine when transitioning away from this state.
   * Clean up any event listeners, timers, etc.
   */
  unmount() {
    if (this.container) {
      this.container.innerHTML = "";
    }
  }
}

/**
 * Example Plugin: ButtonChoicePlugin
 * Renders multiple buttons that dispatch distinct events when clicked.
 * 
 * Props expected:
 * {
 *   "question": "Which way?",
 *   "buttons": [
 *     { "label": "Go Left", "event": "swipe_left" },
 *     { "label": "Go Right", "event": "swipe_right" }
 *   ]
 * }
 */
class ButtonChoicePlugin extends BasePlugin {
  render() {
    const wrapper = document.createElement("div");
    wrapper.style.display = "flex";
    wrapper.style.flexDirection = "column";
    wrapper.style.gap = "15px";
    wrapper.style.alignItems = "center";
    wrapper.style.justifyContent = "center";
    
    // Render question/title if provided
    if (this.props.question) {
      const title = document.createElement("h2");
      title.textContent = this.props.question;
      title.style.margin = "0 0 10px 0";
      wrapper.appendChild(title);
    }
    
    // Render buttons
    if (Array.isArray(this.props.buttons)) {
      this.props.buttons.forEach(btnConfig => {
        const btn = document.createElement("button");
        btn.textContent = btnConfig.label || btnConfig.event;
        // Basic styling extending the global button styles
        btn.style.padding = "15px 30px";
        btn.style.fontSize = "1.2rem";
        btn.style.background = "rgba(255, 255, 255, 0.9)";
        btn.style.color = "#000";
        btn.style.border = "none";
        btn.style.borderRadius = "8px";
        btn.style.cursor = "pointer";
        btn.style.fontWeight = "bold";
        btn.style.transition = "transform 0.1s ease";
        
        btn.onmousedown = () => btn.style.transform = "scale(0.95)";
        btn.onmouseup = () => btn.style.transform = "scale(1)";
        btn.onmouseleave = () => btn.style.transform = "scale(1)";
        
        btn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.dispatch(btnConfig.event);
        };
        
        wrapper.appendChild(btn);
      });
    }
    
    this.container.appendChild(wrapper);
  }
}

// Export to global scope
if (typeof module !== "undefined" && module.exports) {
  module.exports = { BasePlugin, ButtonChoicePlugin };
} else {
  window.BasePlugin = BasePlugin;
  window.ButtonChoicePlugin = ButtonChoicePlugin;
}
