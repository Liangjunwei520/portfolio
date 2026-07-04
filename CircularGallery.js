/**
 * CircularGallery - Standalone 3D Curved Gallery using OGL
 * Adapted from React Bits CircularGallery component
 */

class CircularGalleryRenderer {
  constructor(container, options = {}) {
    this.container = container;
    this.items = options.items || [];
    this.bend = options.bend || 3;
    this.textColor = options.textColor || "#ffffff";
    this.borderRadius = options.borderRadius || 0.05;
    this.font = options.font || "bold 16px 'Noto Sans SC', sans-serif";
    this.scrollSpeed = options.scrollSpeed || 2;
    this.scrollEase = options.scrollEase || 0.05;
    this.fontUrl = options.fontUrl || null;

    this.scroll = { current: 0, target: 0, last: 0, ease: this.scrollEase };
    this.screen = { width: container.clientWidth, height: container.clientHeight };
    this.viewport = { width: 0, height: 0 };
    this.medias = [];
    this.raf = null;
    this.isDragging = false;
    this.dragStart = 0;
    this.dragScrollStart = 0;

    this.init();
  }

  async init() {
    // Load custom font if provided
    if (this.fontUrl) {
      await this.loadFont(this.fontUrl);
    }

    // Create canvas
    this.canvas = document.createElement("canvas");
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.canvas.style.display = "block";
    this.container.insertBefore(this.canvas, this.container.firstChild);

    // Setup WebGL renderer
    this.gl = this.canvas.getContext("webgl", { antialias: true, alpha: true });
    if (!this.gl) {
      console.warn("WebGL not supported, falling back to 2D");
      this.useFallback = true;
      this.initFallback();
      return;
    }

    this.useFallback = false;

    // Simple WebGL program for rendering textured quads
    this.program = this.createProgram();
    this.resize();
    this.createMedia();
    this.addEventListeners();
    this.animate();
  }

  loadFont(url) {
    return new Promise((resolve) => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = url;
      link.onload = () => resolve();
      document.head.appendChild(link);
    });
  }

  createProgram() {
    const gl = this.gl;
    const vs = `
      attribute vec2 a_position;
      attribute vec2 a_texCoord;
      uniform mat4 u_projection;
      uniform mat4 u_modelView;
      varying vec2 v_texCoord;
      void main() {
        gl_Position = u_projection * u_modelView * vec4(a_position, 0.0, 1.0);
        v_texCoord = a_texCoord;
      }
    `;
    const fs = `
      precision mediump float;
      varying vec2 v_texCoord;
      uniform sampler2D u_texture;
      void main() {
        vec4 color = texture2D(u_texture, v_texCoord);
        if (color.a < 0.1) discard;
        gl_FragColor = color;
      }
    `;

    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vs);
    gl.compileShader(vertexShader);

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fs);
    gl.compileShader(fragmentShader);

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Program link error:", gl.getProgramInfoLog(program));
      return null;
    }

    return program;
  }

  initFallback() {
    // Fallback: create a CSS-based curved gallery
    this.fallbackContainer = document.createElement("div");
    this.fallbackContainer.className = "circular-gallery-fallback";
    this.fallbackContainer.style.cssText = `
      display: flex;
      gap: 20px;
      overflow-x: auto;
      padding: 40px 0;
      scroll-snap-type: x mandatory;
      -webkit-overflow-scrolling: touch;
    `;
    this.items.forEach((item, i) => {
      const card = document.createElement("div");
      card.style.cssText = `
        flex-shrink: 0;
        width: 320px;
        height: 220px;
        border-radius: 16px;
        overflow: hidden;
        scroll-snap-align: center;
        box-shadow: 0 8px 32px rgba(0,0,0,0.15);
        transition: transform 0.3s ease, box-shadow 0.3s ease;
        cursor: pointer;
      `;
      card.innerHTML = `
        <img src="${item.image}" alt="${item.text}" style="width:100%;height:100%;object-fit:cover;">
        <div style="position:absolute;bottom:0;left:0;right:0;padding:16px;background:linear-gradient(transparent,rgba(0,0,0,0.7));color:#fff;">
          <div style="font-size:14px;font-weight:600;">${item.text}</div>
        </div>
      `;
      card.addEventListener("mouseenter", () => {
        card.style.transform = "scale(1.05) translateY(-4px)";
        card.style.boxShadow = "0 16px 48px rgba(0,0,0,0.25)";
      });
      card.addEventListener("mouseleave", () => {
        card.style.transform = "scale(1) translateY(0)";
        card.style.boxShadow = "0 8px 32px rgba(0,0,0,0.15)";
      });
      this.fallbackContainer.appendChild(card);
    });
    this.container.appendChild(this.fallbackContainer);
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.screen.width * dpr;
    this.canvas.height = this.screen.height * dpr;
    this.canvas.style.width = this.screen.width + "px";
    this.canvas.style.height = this.screen.height + "px";
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);

    const fov = 60 * Math.PI / 180;
    const height = 2 * Math.tan(fov / 2) * 5;
    const width = height * (this.screen.width / this.screen.height);
    this.viewport = { width, height };
  }

  createMedia() {
    const gl = this.gl;
    const program = this.program;

    if (!program) return;

    const aPosition = gl.getAttribLocation(program, "a_position");
    const aTexCoord = gl.getAttribLocation(program, "a_texCoord");
    const uProjection = gl.getUniformLocation(program, "u_projection");
    const uModelView = gl.getUniformLocation(program, "u_modelView");

    // Create buffer
    this.posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,  1, -1,  -1,  1,
      -1,  1,  1, -1,   1,  1
    ]), gl.STATIC_DRAW);

    this.texBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      0, 1,  1, 1,  0, 0,
      0, 0,  1, 1,  1, 0
    ]), gl.STATIC_DRAW);

    // Create textures and planes for each item
    this.planes = [];
    this.textures = [];

    this.items.forEach((item, index) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = item.image;

      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

      img.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      };

      this.textures.push(texture);

      const plane = {
        position: new Float32Array(6 * 3),
        rotation: 0,
        targetRotation: 0,
        item: item
      };

      this.planes.push(plane);
    });

    this.aPosition = aPosition;
    this.aTexCoord = aTexCoord;
    this.uProjection = uProjection;
    this.uModelView = uModelView;
  }

  animate() {
    this.scroll.current += (this.scroll.target - this.scroll.current) * this.scrollEase;

    this.render();
    this.raf = requestAnimationFrame(() => this.animate());
  }

  render() {
    const gl = this.gl;
    if (!gl || this.useFallback) return;

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const fov = 60 * Math.PI / 180;
    const aspect = this.screen.width / this.screen.height;
    const near = 0.1;
    const far = 100;
    const f = 1.0 / Math.tan(fov / 2);

    const projection = [
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (far + near) / (near - far), -1,
      0, 0, (2 * far * near) / (near - far), 0
    ];

    const modelView = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, -5, 1];

    gl.useProgram(this.program);
    gl.uniformMatrix4fv(this.uProjection, false, new Float32Array(projection));
    gl.uniformMatrix4fv(this.uModelView, false, new Float32Array(modelView));

    const itemWidth = 3.0;
    const itemSpacing = 0.5;
    const totalWidth = this.items.length * (itemWidth + itemSpacing);
    const scrollOffset = this.scroll.current * (itemWidth + itemSpacing) * this.scrollSpeed;

    this.planes.forEach((plane, index) => {
      const texture = this.textures[index];
      if (!texture) return;

      const worldX = (index * (itemWidth + itemSpacing)) - (totalWidth / 2) + scrollOffset;
      const worldZ = Math.sin(worldX / totalWidth * Math.PI * 2) * this.bend * 2;
      const worldRotY = Math.cos(worldX / totalWidth * Math.PI * 2) * this.bend * 0.3;

      // Model matrix for this plane
      const cosR = Math.cos(worldRotY);
      const sinR = Math.sin(worldRotY);

      const modelView = [
        cosR, 0, sinR, 0,
        0, 1, 0, 0,
        -sinR, 0, cosR, 0,
        -worldX, 0, -worldZ - 5, 1
      ];

      gl.uniformMatrix4fv(this.uModelView, false, new Float32Array(modelView));

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(gl.getUniformLocation(this.program, "u_texture"), 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
      gl.enableVertexAttribArray(this.aPosition);
      gl.vertexAttribPointer(this.aPosition, 2, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, this.texBuffer);
      gl.enableVertexAttribArray(this.aTexCoord);
      gl.vertexAttribPointer(this.aTexCoord, 2, gl.FLOAT, false, 0, 0);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
    });
  }

  addEventListeners() {
    if (this.useFallback) return;

    window.addEventListener("resize", () => this.resize());

    let lastWheelTime = 0;
    this.container.addEventListener("wheel", (e) => {
      e.preventDefault();
      const now = Date.now();
      if (now - lastWheelTime < 50) return;
      lastWheelTime = now;

      this.scroll.target += e.deltaY * 0.01 * this.scrollSpeed;
    }, { passive: false });

    let startX = 0;
    this.container.addEventListener("mousedown", (e) => {
      startX = e.clientX;
      this.isDragging = true;
      this.dragScrollStart = this.scroll.target;
      this.container.style.cursor = "grabbing";
    });

    window.addEventListener("mousemove", (e) => {
      if (!this.isDragging) return;
      const diff = e.clientX - startX;
      this.scroll.target = this.dragScrollStart - diff * 0.01;
    });

    window.addEventListener("mouseup", () => {
      this.isDragging = false;
      this.container.style.cursor = "grab";
    });

    this.container.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") this.scroll.target -= this.scrollSpeed;
      if (e.key === "ArrowRight") this.scroll.target += this.scrollSpeed;
    });
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    if (this.fallbackContainer && this.fallbackContainer.parentNode) {
      this.fallbackContainer.parentNode.removeChild(this.fallbackContainer);
    }
  }
}

// Export for use
if (typeof module !== "undefined" && module.exports) {
  module.exports = CircularGalleryRenderer;
}
