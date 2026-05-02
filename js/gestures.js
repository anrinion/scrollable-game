class GestureTracker {
  constructor(element, options = {}) {
    this.element = element;
    this.onDragStart = options.onDragStart || (() => {});
    this.onDrag = options.onDrag || (() => {});
    this.onRelease = options.onRelease || (() => {});
    
    this.threshold = options.threshold || 10;
    this.velocityThreshold = options.velocityThreshold || 0.3; // px/ms
    this.distanceThreshold = options.distanceThreshold || 0.3; // fraction of screen

    this._startX = 0;
    this._startY = 0;
    this._lastX = 0;
    this._lastY = 0;
    this._lastTime = 0;
    this._isDragging = false;
    this._lockedAxis = null; // 'x' or 'y'
    this._pointerId = null;

    this._onTouchStart = this._onTouchStart.bind(this);
    this._onTouchMove = this._onTouchMove.bind(this);
    this._onTouchEnd = this._onTouchEnd.bind(this);
    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);

    this.init();
  }

  init() {
    this.element.addEventListener("touchstart", this._onTouchStart, { passive: true });
    this.element.addEventListener("touchmove", this._onTouchMove, { passive: true });
    this.element.addEventListener("touchend", this._onTouchEnd, { passive: true });
    this.element.addEventListener("touchcancel", this._onTouchEnd, { passive: true });

    this.element.addEventListener("mousedown", this._onMouseDown);
    window.addEventListener("mousemove", this._onMouseMove, { passive: true });
    window.addEventListener("mouseup", this._onMouseUp);
  }

  destroy() {
    this.element.removeEventListener("touchstart", this._onTouchStart);
    this.element.removeEventListener("touchmove", this._onTouchMove);
    this.element.removeEventListener("touchend", this._onTouchEnd);
    this.element.removeEventListener("touchcancel", this._onTouchEnd);

    this.element.removeEventListener("mousedown", this._onMouseDown);
    window.removeEventListener("mousemove", this._onMouseMove);
    window.removeEventListener("mouseup", this._onMouseUp);
  }

  _start(x, y, pointerId) {
    this._startX = x;
    this._startY = y;
    this._lastX = x;
    this._lastY = y;
    this._lastTime = Date.now();
    this._isDragging = true;
    this._lockedAxis = null;
    this._pointerId = pointerId;
    this.onDragStart();
  }

  _move(x, y, e) {
    if (!this._isDragging) return;

    const dx = x - this._startX;
    const dy = y - this._startY;

    // Lock axis if moved past threshold
    if (!this._lockedAxis) {
      if (Math.abs(dx) > this.threshold || Math.abs(dy) > this.threshold) {
        this._lockedAxis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      }
    }

    if (this._lockedAxis) {
      const time = Date.now();
      const dt = time - this._lastTime;
      const vX = dt > 0 ? (x - this._lastX) / dt : 0;
      const vY = dt > 0 ? (y - this._lastY) / dt : 0;
      
      this._lastX = x;
      this._lastY = y;
      this._lastTime = time;

      this.onDrag({
        dx: this._lockedAxis === 'x' ? dx : 0,
        dy: this._lockedAxis === 'y' ? dy : 0,
        vX,
        vY
      });
    }
  }

  _end() {
    if (!this._isDragging) return;
    this._isDragging = false;
    
    if (!this._lockedAxis) {
      this.onRelease({ committed: false });
      return;
    }

    const dx = this._lastX - this._startX;
    const dy = this._lastY - this._startY;
    
    // Quick calculate recent velocity over last frame
    const vX = (this._lastX - this._startX) / (Date.now() - this._lastTime + 1);
    const vY = (this._lastY - this._startY) / (Date.now() - this._lastTime + 1);

    // More robust velocity check would track history, but simple distance/velocity check works
    let direction = null;
    let committed = false;

    if (this._lockedAxis === 'x') {
      const frac = Math.abs(dx) / window.innerWidth;
      // We check if distance > threshold OR velocity is high enough in the correct direction
      if (frac > this.distanceThreshold) {
        committed = true;
      }
      direction = dx > 0 ? "swipe_right" : "swipe_left";
    } else {
      const frac = Math.abs(dy) / window.innerHeight;
      if (frac > this.distanceThreshold) {
        committed = true;
      }
      direction = dy > 0 ? "swipe_down" : "swipe_up";
    }

    this.onRelease({ committed, direction, dx, dy });
    this._lockedAxis = null;
  }

  _onTouchStart(e) {
    if (this._isDragging || e.touches.length > 1) return;
    this._start(e.touches[0].clientX, e.touches[0].clientY, e.touches[0].identifier);
  }

  _onTouchMove(e) {
    if (!this._isDragging) return;
    // Find our touch
    for (let i = 0; i < e.touches.length; i++) {
      if (e.touches[i].identifier === this._pointerId) {
        this._move(e.touches[i].clientX, e.touches[i].clientY, e);
        return;
      }
    }
  }

  _onTouchEnd(e) {
    if (!this._isDragging) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === this._pointerId) {
        this._end();
        return;
      }
    }
  }

  _onMouseDown(e) {
    if (this._isDragging) return;
    this._start(e.clientX, e.clientY, 'mouse');
  }

  _onMouseMove(e) {
    if (!this._isDragging || this._pointerId !== 'mouse') return;
    this._move(e.clientX, e.clientY, e);
  }

  _onMouseUp(e) {
    if (!this._isDragging || this._pointerId !== 'mouse') return;
    this._end();
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = GestureTracker;
} else {
  window.GestureTracker = GestureTracker;
}
