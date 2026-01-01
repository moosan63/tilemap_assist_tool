import "./style.css";
import { TilemapViewer } from "./TilemapViewer";

class App {
  private viewer: TilemapViewer;
  private fileInput: HTMLInputElement;
  private tileWidthInput: HTMLInputElement;
  private tileHeightInput: HTMLInputElement;
  private showIndexCheckbox: HTMLInputElement;
  private dropZone: HTMLElement;
  private canvas: HTMLCanvasElement;
  private imageInfo: HTMLElement;
  private tileInfo: HTMLElement;
  private hoverInfo: HTMLElement;
  private zoomLevel: HTMLElement;
  private tooltip: HTMLElement;

  constructor() {
    this.fileInput = document.getElementById("file-input") as HTMLInputElement;
    this.tileWidthInput = document.getElementById("tile-width") as HTMLInputElement;
    this.tileHeightInput = document.getElementById("tile-height") as HTMLInputElement;
    this.showIndexCheckbox = document.getElementById("show-index") as HTMLInputElement;
    this.dropZone = document.getElementById("drop-zone") as HTMLElement;
    this.canvas = document.getElementById("canvas") as HTMLCanvasElement;
    this.imageInfo = document.getElementById("image-info") as HTMLElement;
    this.tileInfo = document.getElementById("tile-info") as HTMLElement;
    this.hoverInfo = document.getElementById("hover-info") as HTMLElement;
    this.zoomLevel = document.getElementById("zoom-level") as HTMLElement;
    this.tooltip = document.getElementById("tooltip") as HTMLElement;

    this.viewer = new TilemapViewer(this.canvas);
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.fileInput.addEventListener("change", this.handleFileSelect.bind(this));

    this.tileWidthInput.addEventListener("input", this.handleTileSizeChange.bind(this));
    this.tileHeightInput.addEventListener("input", this.handleTileSizeChange.bind(this));

    this.showIndexCheckbox.addEventListener("change", () => {
      this.viewer.setShowIndex(this.showIndexCheckbox.checked);
    });

    const container = document.getElementById("canvas-container")!;
    container.addEventListener("dragover", this.handleDragOver.bind(this));
    container.addEventListener("dragleave", this.handleDragLeave.bind(this));
    container.addEventListener("drop", this.handleDrop.bind(this));

    document.getElementById("zoom-in")!.addEventListener("click", () => {
      const newScale = Math.min(10, this.viewer.getScale() * 1.2);
      this.viewer.setScale(newScale);
      this.updateZoomLevel();
    });

    document.getElementById("zoom-out")!.addEventListener("click", () => {
      const newScale = Math.max(0.1, this.viewer.getScale() / 1.2);
      this.viewer.setScale(newScale);
      this.updateZoomLevel();
    });

    document.getElementById("zoom-reset")!.addEventListener("click", () => {
      this.viewer.resetView();
      this.updateZoomLevel();
    });

    this.viewer.setOnHoverTile((tile) => {
      if (tile) {
        this.hoverInfo.textContent = `ホバー: (${tile.col}, ${tile.row}) Index: ${tile.index}`;
        this.tooltip.textContent = `X: ${tile.col}, Y: ${tile.row}`;
        this.tooltip.style.left = `${tile.mouseX + 12}px`;
        this.tooltip.style.top = `${tile.mouseY + 12}px`;
        this.tooltip.classList.add("visible");
      } else {
        this.hoverInfo.textContent = "";
        this.tooltip.classList.remove("visible");
      }
    });

    window.addEventListener("resize", () => {
      this.viewer.resizeCanvas();
      this.viewer.render();
    });

    this.canvas.addEventListener("wheel", () => {
      this.updateZoomLevel();
    });
  }

  private handleFileSelect(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.loadImage(input.files[0]);
    }
  }

  private handleDragOver(e: DragEvent): void {
    e.preventDefault();
    this.dropZone.classList.add("drag-over");
  }

  private handleDragLeave(): void {
    this.dropZone.classList.remove("drag-over");
  }

  private handleDrop(e: DragEvent): void {
    e.preventDefault();
    this.dropZone.classList.remove("drag-over");

    if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
        this.loadImage(file);
      }
    }
  }

  private loadImage(file: File): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.dropZone.classList.add("hidden");
        this.viewer.setImage(img);
        this.viewer.setScale(2);
        this.updateImageInfo();
        this.handleTileSizeChange();
        this.updateZoomLevel();
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  private handleTileSizeChange(): void {
    const width = parseInt(this.tileWidthInput.value, 10) || 32;
    const height = parseInt(this.tileHeightInput.value, 10) || 32;
    this.viewer.setTileSize({ width, height });
    this.updateTileInfo();
  }

  private updateImageInfo(): void {
    const info = this.viewer.getImageInfo();
    if (info) {
      this.imageInfo.textContent = `画像: ${info.width} × ${info.height} px`;
    }
  }

  private updateTileInfo(): void {
    const info = this.viewer.getImageInfo();
    if (info) {
      this.tileInfo.textContent = `タイル: ${info.cols} × ${info.rows} = ${info.cols * info.rows} 枚`;
    }
  }

  private updateZoomLevel(): void {
    const scale = this.viewer.getScale();
    this.zoomLevel.textContent = `${Math.round(scale * 100)}%`;
  }
}

new App();
