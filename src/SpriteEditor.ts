import type { ViewState, SpriteRect, SpriteExport } from "./types";

export type Tool = "select" | "rect";

export class SpriteEditor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private image: HTMLImageElement | null = null;
  private imageName: string = "";
  private view: ViewState = { scale: 1, offsetX: 0, offsetY: 0 };
  private sprites: SpriteRect[] = [];
  private selectedId: string | null = null;
  private tool: Tool = "select";

  private isDragging = false;
  private isDrawing = false;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private drawStartX = 0;
  private drawStartY = 0;
  private currentRect: { x: number; y: number; width: number; height: number } | null = null;

  private onSpritesChange: (() => void) | null = null;
  private onSelectionChange: ((id: string | null) => void) | null = null;

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
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (this.tool === "rect" && this.image) {
      const worldX = (mouseX - this.view.offsetX) / this.view.scale;
      const worldY = (mouseY - this.view.offsetY) / this.view.scale;

      if (worldX >= 0 && worldY >= 0 && worldX < this.image.width && worldY < this.image.height) {
        this.isDrawing = true;
        this.drawStartX = Math.round(worldX);
        this.drawStartY = Math.round(worldY);
        this.currentRect = { x: this.drawStartX, y: this.drawStartY, width: 0, height: 0 };
      }
    } else if (this.tool === "select") {
      const clickedSprite = this.getSpriteAtPoint(mouseX, mouseY);
      if (clickedSprite) {
        this.selectedId = clickedSprite.id;
        if (this.onSelectionChange) {
          this.onSelectionChange(this.selectedId);
        }
        this.render();
      } else {
        this.isDragging = true;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        this.canvas.classList.add("grabbing");
      }
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    if (this.isDrawing && this.image) {
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      let worldX = (mouseX - this.view.offsetX) / this.view.scale;
      let worldY = (mouseY - this.view.offsetY) / this.view.scale;

      worldX = Math.max(0, Math.min(this.image.width, Math.round(worldX)));
      worldY = Math.max(0, Math.min(this.image.height, Math.round(worldY)));

      const x = Math.min(this.drawStartX, worldX);
      const y = Math.min(this.drawStartY, worldY);
      const width = Math.abs(worldX - this.drawStartX);
      const height = Math.abs(worldY - this.drawStartY);

      this.currentRect = { x, y, width, height };
      this.render();
    } else if (this.isDragging) {
      const dx = e.clientX - this.lastMouseX;
      const dy = e.clientY - this.lastMouseY;
      this.view.offsetX += dx;
      this.view.offsetY += dy;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      this.render();
    }
  }

  private handleMouseUp(): void {
    if (this.isDrawing && this.currentRect && this.currentRect.width > 0 && this.currentRect.height > 0) {
      const id = this.generateId();
      const sprite: SpriteRect = {
        id,
        name: `sprite_${this.sprites.length}`,
        x: this.currentRect.x,
        y: this.currentRect.y,
        width: this.currentRect.width,
        height: this.currentRect.height,
      };
      this.sprites.push(sprite);
      this.selectedId = id;

      if (this.onSpritesChange) {
        this.onSpritesChange();
      }
      if (this.onSelectionChange) {
        this.onSelectionChange(id);
      }
    }

    this.isDrawing = false;
    this.currentRect = null;
    this.isDragging = false;
    this.canvas.classList.remove("grabbing");
    this.render();
  }

  private handleMouseLeave(): void {
    if (this.isDrawing && this.currentRect && this.currentRect.width > 0 && this.currentRect.height > 0) {
      this.handleMouseUp();
    } else {
      this.isDrawing = false;
      this.currentRect = null;
      this.isDragging = false;
      this.canvas.classList.remove("grabbing");
      this.render();
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

  private getSpriteAtPoint(screenX: number, screenY: number): SpriteRect | null {
    const worldX = (screenX - this.view.offsetX) / this.view.scale;
    const worldY = (screenY - this.view.offsetY) / this.view.scale;

    for (let i = this.sprites.length - 1; i >= 0; i--) {
      const s = this.sprites[i];
      if (worldX >= s.x && worldX <= s.x + s.width && worldY >= s.y && worldY <= s.y + s.height) {
        return s;
      }
    }
    return null;
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 9);
  }

  setImage(image: HTMLImageElement, name: string): void {
    this.image = image;
    this.imageName = name;
    this.resizeCanvas();
    this.centerImage();
    this.canvas.classList.add("visible");
    this.render();
  }

  setTool(tool: Tool): void {
    this.tool = tool;
    if (tool === "rect") {
      this.canvas.classList.add("crosshair");
      this.canvas.classList.remove("grabbing");
    } else {
      this.canvas.classList.remove("crosshair");
    }
  }

  getTool(): Tool {
    return this.tool;
  }

  setOnSpritesChange(callback: () => void): void {
    this.onSpritesChange = callback;
  }

  setOnSelectionChange(callback: (id: string | null) => void): void {
    this.onSelectionChange = callback;
  }

  getSprites(): SpriteRect[] {
    return this.sprites;
  }

  getSelectedId(): string | null {
    return this.selectedId;
  }

  setSelectedId(id: string | null): void {
    this.selectedId = id;
    this.render();
  }

  updateSpriteName(id: string, name: string): void {
    const sprite = this.sprites.find((s) => s.id === id);
    if (sprite) {
      sprite.name = name;
    }
  }

  deleteSprite(id: string): void {
    this.sprites = this.sprites.filter((s) => s.id !== id);
    if (this.selectedId === id) {
      this.selectedId = null;
      if (this.onSelectionChange) {
        this.onSelectionChange(null);
      }
    }
    if (this.onSpritesChange) {
      this.onSpritesChange();
    }
    this.render();
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
    const { ctx, canvas, image } = this;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!image) return;

    ctx.save();
    ctx.translate(this.view.offsetX, this.view.offsetY);
    ctx.scale(this.view.scale, this.view.scale);

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, 0, 0);

    this.drawSprites();

    if (this.currentRect) {
      this.drawCurrentRect();
    }

    ctx.restore();
  }

  private drawSprites(): void {
    const { ctx } = this;

    for (const sprite of this.sprites) {
      const isSelected = sprite.id === this.selectedId;

      ctx.strokeStyle = isSelected ? "#e94560" : "#4caf50";
      ctx.lineWidth = 2 / this.view.scale;
      ctx.setLineDash([]);
      ctx.strokeRect(sprite.x, sprite.y, sprite.width, sprite.height);

      ctx.fillStyle = isSelected ? "rgba(233, 69, 96, 0.2)" : "rgba(76, 175, 80, 0.1)";
      ctx.fillRect(sprite.x, sprite.y, sprite.width, sprite.height);

      const fontSize = Math.max(10, 12 / this.view.scale);
      ctx.font = `${fontSize}px monospace`;
      ctx.fillStyle = isSelected ? "#e94560" : "#4caf50";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";

      const padding = 2 / this.view.scale;
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      const textMetrics = ctx.measureText(sprite.name);
      ctx.fillRect(sprite.x, sprite.y - fontSize - padding * 2, textMetrics.width + padding * 2, fontSize + padding);

      ctx.fillStyle = isSelected ? "#e94560" : "#4caf50";
      ctx.fillText(sprite.name, sprite.x + padding, sprite.y - fontSize - padding);
    }
  }

  private drawCurrentRect(): void {
    if (!this.currentRect) return;

    const { ctx } = this;
    const { x, y, width, height } = this.currentRect;

    ctx.strokeStyle = "#ffcc00";
    ctx.lineWidth = 2 / this.view.scale;
    ctx.setLineDash([4 / this.view.scale, 4 / this.view.scale]);
    ctx.strokeRect(x, y, width, height);

    ctx.fillStyle = "rgba(255, 204, 0, 0.2)";
    ctx.fillRect(x, y, width, height);
  }

  getImageInfo(): { width: number; height: number; name: string } | null {
    if (!this.image) return null;
    return {
      width: this.image.width,
      height: this.image.height,
      name: this.imageName,
    };
  }

  exportJSON(): SpriteExport {
    return {
      image: this.imageName,
      sprites: this.sprites.map(({ name, x, y, width, height }) => ({
        name,
        x,
        y,
        width,
        height,
      })),
    };
  }
}
