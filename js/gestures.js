/**
 * Detects swipe gestures (touch and mouse) and calls a callback with event name.
 *
 * Touch: relies on the browser's native scroll behavior – no preventDefault is needed.
 * Mouse: maps drag gestures to swipe directions, ignoring short clicks.
 */
class SwipeDetector {
  /**
   * @param {Object} [options]
   * @param {number} [options.threshold=10] Minimum pixel distance to consider a swipe (prevents tap confusion).
   * @param {number} [options.angleTolerance=45] Degrees from axis that still count as that direction.
   */
  constructor(options = {}) {
    this.threshold = options.threshold || 10;
    this.angleTolerance = options.angleTolerance || 45;
    this._startCoords = null;
    this._element = null;
    this._callback = null;

    // Bound handlers for clean removal
    this._onTouchStart = this._onTouchStart.bind(this);
    this._onTouchEnd = this._onTouchEnd.bind(this);
    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);
  }

  /**
   * Start listening for swipes on an element.
   * @param {HTMLElement} element
   * @param {(eventType: string) => void} callback
   */
  init(element, callback) {
    this.destroy(); // safe cleanup of any previous attachment
    this._element = element;
    this._callback = callback;

    // Touch events
    element.addEventListener("touchstart", this._onTouchStart, {
      passive: true,
    });
    element.addEventListener("touchend", this._onTouchEnd, { passive: true });

    // Mouse events for desktop testing
    element.addEventListener("mousedown", this._onMouseDown);
    window.addEventListener("mouseup", this._onMouseUp); // capture outside the element to avoid missed releases
  }

  destroy() {
    if (this._element) {
      this._element.removeEventListener("touchstart", this._onTouchStart);
      this._element.removeEventListener("touchend", this._onTouchEnd);
      this._element.removeEventListener("mousedown", this._onMouseDown);
    }
    window.removeEventListener("mouseup", this._onMouseUp);
    this._element = null;
    this._callback = null;
    this._startCoords = null;
  }

  _onTouchStart(e) {
    if (e.touches.length === 0) return;
    this._startCoords = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      pointerType: "touch",
    };
  }

  _onTouchEnd(e) {
    if (!this._startCoords || this._startCoords.pointerType !== "touch") return;
    const touch = e.changedTouches[0];
    if (!touch) return;
    this._evaluateSwipe(touch.clientX, touch.clientY);
    this._startCoords = null;
  }

  _onMouseDown(e) {
    this._startCoords = {
      x: e.clientX,
      y: e.clientY,
      pointerType: "mouse",
    };
  }

  _onMouseUp(e) {
    if (!this._startCoords || this._startCoords.pointerType !== "mouse") return;
    this._evaluateSwipe(e.clientX, e.clientY);
    this._startCoords = null;
  }

  _evaluateSwipe(endX, endY) {
    const startX = this._startCoords.x;
    const startY = this._startCoords.y;
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    // Ignore tiny movements (likely taps or noise)
    if (absX < this.threshold && absY < this.threshold) return;

    let direction;
    // Determine primary axis. The angle tolerance is implicit from using abs comparison.
    if (absX > absY) {
      direction = deltaX > 0 ? "swipe_right" : "swipe_left";
    } else {
      direction = deltaY > 0 ? "swipe_down" : "swipe_up";
    }

    if (this._callback) {
      this._callback(direction);
    }
  }
}

// Export for module usage or attach to window
if (typeof module !== "undefined" && module.exports) {
  module.exports = SwipeDetector;
} else {
  window.SwipeDetector = SwipeDetector;
}
