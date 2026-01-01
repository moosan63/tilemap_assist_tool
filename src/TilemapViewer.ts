import type { TileSize, ViewState, TileInfo } from "./types";

export class TilemapViewer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private image: HTMLImageElement | null = null;
  private tileSize: TileSize = { width: 32, height: 32 };
  private view: ViewState = { scale: 1, offsetX: 0, offsetY: 0 };
  private showIndex = true;

  private isDragging = false;
  private lastMouseX = 0;
  private lastMouseY = 0;

  private onHoverTile: ((tile: TileInfo | null) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context not supported");
    this.ctx = ctx;

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener("mousedown", this.handleMouseDown.bind(this));
    this.canvas.addEventListener("mousemove", this.handleMouseMove.bind(this));
    this.canvas.addEventListener("mouseup", this.handleMouseUp.bind(this));
    this.canvas.addEventListener("mouseleave", this.handleMouseLeave.bind(this));
    this.canvas.addEventListener("wheel", this.handleWheel.bind(this), { passive: false });
  }

  private handleMouseDown(e: MouseEvent): void {
    this.isDragging = true;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
    this.canvas.classList.add("grabbing");
  }

  private handleMouseMove(e: MouseEvent): void {
    if (this.isDragging) {
      const dx = e.clientX - this.lastMouseX;
      const dy = e.clientY - this.lastMouseY;
      this.view.offsetX += dx;
      this.view.offsetY += dy;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      this.render();
    } else {
      this.updateHoverInfo(e);
    }
  }

  private handleMouseUp(): void {
    this.isDragging = false;
    this.canvas.classList.remove("grabbing");
  }

  private handleMouseLeave(): void {
    this.isDragging = false;
    this.canvas.classList.remove("grabbing");
    if (this.onHoverTile) {
      this.onHoverTile(null);
    }
  }

  private handleWheel(e: WheelEvent): void {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.1, Math.min(10, this.view.scale * delta));

    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const worldX = (mouseX - this.view.offsetX) / this.view.scale;
    const worldY = (mouseY - this.view.offsetY) / this.view.scale;

    this.view.scale = newScale;
    this.view.offsetX = mouseX - worldX * newScale;
    this.view.offsetY = mouseY - worldY * newScale;

    this.render();
  }

  private updateHoverInfo(e: MouseEvent): void {
    if (!this.image || !this.onHoverTile) return;

    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const worldX = (mouseX - this.view.offsetX) / this.view.scale;
    const worldY = (mouseY - this.view.offsetY) / this.view.scale;

    if (worldX < 0 || worldY < 0 || worldX >= this.image.width || worldY >= this.image.height) {
      this.onHoverTile(null);
      return;
    }

    const col = Math.floor(worldX / this.tileSize.width);
    const row = Math.floor(worldY / this.tileSize.height);
    const cols = Math.ceil(this.image.width / this.tileSize.width);
    const index = row * cols + col;

    this.onHoverTile({
      index,
      col,
      row,
      x: col * this.tileSize.width,
      y: row * this.tileSize.height,
      mouseX: e.clientX,
      mouseY: e.clientY,
    });
  }

  setImage(image: HTMLImageElement): void {
    this.image = image;
    this.resizeCanvas();
    this.centerImage();
    this.canvas.classList.add("visible");
    this.render();
  }

  setTileSize(size: TileSize): void {
    this.tileSize = size;
    this.render();
  }

  setShowIndex(show: boolean): void {
    this.showIndex = show;
    this.render();
  }

  setOnHoverTile(callback: (tile: TileInfo | null) => void): void {
    this.onHoverTile = callback;
  }

  setScale(scale: number): void {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const worldCenterX = (centerX - this.view.offsetX) / this.view.scale;
    const worldCenterY = (centerY - this.view.offsetY) / this.view.scale;

    this.view.scale = scale;
    this.view.offsetX = centerX - worldCenterX * scale;
    this.view.offsetY = centerY - worldCenterY * scale;
    this.render();
  }

  getScale(): number {
    return this.view.scale;
  }

  resetView(): void {
    this.view.scale = 1;
    this.centerImage();
    this.render();
  }

  resizeCanvas(): void {
    const container = this.canvas.parentElement;
    if (!container) return;
    this.canvas.width = container.clientWidth;
    this.canvas.height = container.clientHeight;
  }

  private centerImage(): void {
    if (!this.image) return;
    this.view.offsetX = (this.canvas.width - this.image.width * this.view.scale) / 2;
    this.view.offsetY = (this.canvas.height - this.image.height * this.view.scale) / 2;
  }

  render(): void {
    const { ctx, canvas, image, showIndex } = this;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!image) return;

    ctx.save();
    ctx.translate(this.view.offsetX, this.view.offsetY);
    ctx.scale(this.view.scale, this.view.scale);

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, 0, 0);

    this.drawGrid();
    this.drawRulers();

    if (showIndex) {
      this.drawTileCoordinates();
    }

    ctx.restore();
  }

  private drawGrid(): void {
    if (!this.image) return;

    const { ctx, image, tileSize } = this;
    const cols = Math.ceil(image.width / tileSize.width);
    const rows = Math.ceil(image.height / tileSize.height);

    ctx.save();
    ctx.lineWidth = 1 / this.view.scale;

    ctx.strokeStyle = "rgba(255, 100, 100, 0.8)";
    ctx.setLineDash([4 / this.view.scale, 4 / this.view.scale]);
    for (let i = 0; i <= cols; i++) {
      const x = i * tileSize.width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, image.height);
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(100, 150, 255, 0.8)";
    ctx.setLineDash([4 / this.view.scale, 4 / this.view.scale]);
    for (let i = 0; i <= rows; i++) {
      const y = i * tileSize.height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(image.width, y);
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawRulers(): void {
    if (!this.image) return;

    const { ctx, image, tileSize } = this;
    const cols = Math.ceil(image.width / tileSize.width);
    const rows = Math.ceil(image.height / tileSize.height);

    const fontSize = 9;

    ctx.save();
    ctx.font = `${fontSize}px monospace`;

    // 上部にX軸ラベル（列番号）を表示
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    for (let col = 0; col < cols; col++) {
      const x = col * tileSize.width + tileSize.width / 2;
      const y = -4;
      const text = col.toString();

      ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
      const metrics = ctx.measureText(text);
      ctx.fillRect(x - metrics.width / 2 - 2, y - fontSize, metrics.width + 4, fontSize + 2);

      ctx.fillStyle = "#ffcc00";
      ctx.fillText(text, x, y);
    }

    // 左側にY軸ラベル（行番号）を表示
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let row = 0; row < rows; row++) {
      const x = -4;
      const y = row * tileSize.height + tileSize.height / 2;
      const text = row.toString();

      ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
      const metrics = ctx.measureText(text);
      ctx.fillRect(x - metrics.width - 2, y - fontSize / 2 - 1, metrics.width + 4, fontSize + 2);

      ctx.fillStyle = "#00ccff";
      ctx.fillText(text, x, y);
    }

    ctx.restore();
  }

  private drawTileCoordinates(): void {
    if (!this.image) return;

    const { ctx, image, tileSize } = this;
    const cols = Math.ceil(image.width / tileSize.width);
    const rows = Math.ceil(image.height / tileSize.height);

    const fontSize = 9;

    ctx.save();
    ctx.font = `${fontSize}px monospace`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = col * tileSize.width + 2;
        const y = row * tileSize.height + 2;
        const text = `${col},${row}`;

        ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
        const metrics = ctx.measureText(text);
        ctx.fillRect(x - 1, y - 1, metrics.width + 3, fontSize + 2);

        ctx.fillStyle = "#fff";
        ctx.fillText(text, x, y);
      }
    }

    ctx.restore();
  }

  getImageInfo(): { width: number; height: number; cols: number; rows: number } | null {
    if (!this.image) return null;
    return {
      width: this.image.width,
      height: this.image.height,
      cols: Math.ceil(this.image.width / this.tileSize.width),
      rows: Math.ceil(this.image.height / this.tileSize.height),
    };
  }
}
