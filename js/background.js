class ProceduralBackground {
  constructor(canvas, seedStr) {
    this.canvas = canvas;
    this.ctx = this.canvas.getContext('2d');
    this.isDestroyed = false;
    
    this.particles = [];
    this.density = 0.00015;

    // Use string hash for seed
    const hash = this.hashString(seedStr);
    this.hue = hash % 360;
    
    // Determine particle flow based on hash
    const flowType = (hash % 10);
    if (flowType < 3) {
      this.speedY = -((hash % 100) / 100 * 1 + 0.5);
      this.speedX = ((hash % 50) / 50 - 0.5) * 0.5;
    } else if (flowType < 6) {
      this.speedY = ((hash % 100) / 100 * 2 + 1);
      this.speedX = ((hash % 50) / 50 - 0.5);
    } else {
      this.speedY = ((hash % 100) / 100 - 0.5) * 0.5;
      this.speedX = ((hash % 50) / 50 - 0.5) * 1.5;
    }

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.canvas);
    this.resize();

    this.lastTime = performance.now();
    this.animate();
  }

  destroy() {
    this.isDestroyed = true;
    this.resizeObserver.disconnect();
  }

  resize() {
    this.width = this.canvas.clientWidth;
    this.height = this.canvas.clientHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    
    const targetCount = Math.floor(this.width * this.height * this.density);
    
    while (this.particles.length < targetCount) {
      this.particles.push(this.createParticle());
    }
    if (this.particles.length > targetCount) {
      this.particles.length = targetCount;
    }
  }

  createParticle() {
    return {
      x: Math.random() * this.width,
      y: Math.random() * this.height,
      size: Math.random() * 2 + 1,
      opacity: Math.random() * 0.5 + 0.1,
      vxOff: (Math.random() - 0.5) * 0.5,
      vyOff: (Math.random() - 0.5) * 0.5
    };
  }

  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  animate() {
    if (this.isDestroyed) return;

    const time = performance.now();
    const dt = Math.min((time - this.lastTime) / 16, 3);
    this.lastTime = time;

    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, `hsl(${this.hue}, 40%, 10%)`);
    gradient.addColorStop(1, `hsl(${(this.hue + 30) % 360}, 50%, 5%)`);
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.fillStyle = '#ffffff';
    for (const p of this.particles) {
      p.x += (this.speedX + p.vxOff) * dt;
      p.y += (this.speedY + p.vyOff) * dt;

      if (p.x < 0) p.x = this.width;
      if (p.x > this.width) p.x = 0;
      if (p.y < 0) p.y = this.height;
      if (p.y > this.height) p.y = 0;

      this.ctx.globalAlpha = p.opacity;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.globalAlpha = 1.0;

    requestAnimationFrame(() => this.animate());
  }
}

window.ProceduralBackground = ProceduralBackground;
