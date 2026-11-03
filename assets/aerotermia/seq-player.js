(() => {
  if (customElements.get('seq-player')) return;
  const cache = {};
  const soften = async img => {
    const c = new OffscreenCanvas(img.naturalWidth, img.naturalHeight), x = c.getContext('2d');
    x.drawImage(img, 0, 0);
    x.globalCompositeOperation = 'destination-in'; x.filter = 'blur(0.8px)'; x.drawImage(img, 0, 0);
    return createImageBitmap(c);
  };
  const load = src => cache[src] || (cache[src] = fetch(src).then(r => r.json()).then(async d => {
    const imgs = await Promise.all(d.frames.map(async u => { const i = new Image(); i.src = u; await i.decode(); try { return await soften(i); } catch (e) { return i; } }));
    return { ...d, imgs };
  }));
  class SeqPlayer extends HTMLElement {
    connectedCallback() {
      this.style.cssText += ';display:block;position:absolute;inset:0';
      const c = this.c = document.createElement('canvas');
      c.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
      this.appendChild(c);
      const x = c.getContext('2d');
      let d = null, cw = 0, ch = 0;
      const size = () => {
        const dpr = Math.min(3, window.devicePixelRatio || 1), r = this.getBoundingClientRect();
        cw = Math.max(1, Math.round(r.width * dpr)); ch = Math.max(1, Math.round(r.height * dpr));
        if (c.width !== cw || c.height !== ch) { c.width = cw; c.height = ch; this.f = -1; }
      };
      const draw = f => {
        const s = Math.min(cw / d.w, ch / d.h), w = d.w * s, h = d.h * s;
        x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, cw, ch);
        x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
        x.drawImage(d.imgs[f], (cw - w) / 2, (ch - h) / 2, w, h);
      };
      this.ro = new ResizeObserver(size); this.ro.observe(this); size();
      load(this.getAttribute('src')).then(data => {
        if (!this.isConnected) return;
        d = data; const n = d.imgs.length, fd = 1000 / d.fps; let t0 = null;
        const tick = now => {
          if (!this.isConnected) return;
          if (t0 === null) t0 = now;
          const f = Math.floor((now - t0) / fd) % n;
          if (f !== this.f) { this.f = f; draw(f); }
          this.raf = requestAnimationFrame(tick);
        };
        this.raf = requestAnimationFrame(tick);
      });
    }
    disconnectedCallback() { cancelAnimationFrame(this.raf); this.ro && this.ro.disconnect(); this.c && this.c.remove(); }
  }
  customElements.define('seq-player', SeqPlayer);
})();
