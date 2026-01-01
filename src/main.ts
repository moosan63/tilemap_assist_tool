import "./style.css";
import { TilemapViewer } from "./TilemapViewer";
import { SpriteEditor } from "./SpriteEditor";
import * as TOML from "smol-toml";

class App {
  // Tilemap
  private viewer: TilemapViewer;
  private fileInput: HTMLInputElement;
  private tileWidthInput: HTMLInputElement;
  private tileHeightInput: HTMLInputElement;
  private showIndexCheckbox: HTMLInputElement;
  private dropZone: HTMLElement;
  private canvasContainer: HTMLElement;
  private canvas: HTMLCanvasElement;
  private bgWhiteCheckbox: HTMLInputElement;
  private imageInfo: HTMLElement;
  private tileInfo: HTMLElement;
  private hoverInfo: HTMLElement;
  private zoomLevel: HTMLElement;
  private tooltip: HTMLElement;

  // Sprite Editor
  private spriteEditor: SpriteEditor;
  private spriteFileInput: HTMLInputElement;
  private spriteDropZone: HTMLElement;
  private spriteCanvasContainer: HTMLElement;
  private spriteCanvas: HTMLCanvasElement;
  private spriteBgWhiteCheckbox: HTMLInputElement;
  private spriteImageInfo: HTMLElement;
  private spriteCount: HTMLElement;
  private spriteZoomLevel: HTMLElement;
  private spriteList: HTMLElement;
  private toolSelect: HTMLButtonElement;
  private toolRect: HTMLButtonElement;

  constructor() {
    // Tilemap elements
    this.fileInput = document.getElementById("file-input") as HTMLInputElement;
    this.tileWidthInput = document.getElementById("tile-width") as HTMLInputElement;
    this.tileHeightInput = document.getElementById("tile-height") as HTMLInputElement;
    this.showIndexCheckbox = document.getElementById("show-index") as HTMLInputElement;
    this.bgWhiteCheckbox = document.getElementById("bg-white") as HTMLInputElement;
    this.dropZone = document.getElementById("drop-zone") as HTMLElement;
    this.canvasContainer = document.getElementById("canvas-container") as HTMLElement;
    this.canvas = document.getElementById("canvas") as HTMLCanvasElement;
    this.imageInfo = document.getElementById("image-info") as HTMLElement;
    this.tileInfo = document.getElementById("tile-info") as HTMLElement;
    this.hoverInfo = document.getElementById("hover-info") as HTMLElement;
    this.zoomLevel = document.getElementById("zoom-level") as HTMLElement;
    this.tooltip = document.getElementById("tooltip") as HTMLElement;

    // Sprite editor elements
    this.spriteFileInput = document.getElementById("sprite-file-input") as HTMLInputElement;
    this.spriteDropZone = document.getElementById("sprite-drop-zone") as HTMLElement;
    this.spriteCanvasContainer = document.getElementById("sprite-canvas-container") as HTMLElement;
    this.spriteCanvas = document.getElementById("sprite-canvas") as HTMLCanvasElement;
    this.spriteBgWhiteCheckbox = document.getElementById("sprite-bg-white") as HTMLInputElement;
    this.spriteImageInfo = document.getElementById("sprite-image-info") as HTMLElement;
    this.spriteCount = document.getElementById("sprite-count") as HTMLElement;
    this.spriteZoomLevel = document.getElementById("sprite-zoom-level") as HTMLElement;
    this.spriteList = document.getElementById("sprite-list") as HTMLElement;
    this.toolSelect = document.getElementById("tool-select") as HTMLButtonElement;
    this.toolRect = document.getElementById("tool-rect") as HTMLButtonElement;

    this.viewer = new TilemapViewer(this.canvas);
    this.spriteEditor = new SpriteEditor(this.spriteCanvas);

    this.setupTabListeners();
    this.setupTilemapListeners();
    this.setupSpriteEditorListeners();
  }

  private setupTabListeners(): void {
    const tabs = document.querySelectorAll(".tab");
    const tabContents = document.querySelectorAll(".tab-content");

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const targetTab = tab.getAttribute("data-tab");

        tabs.forEach((t) => t.classList.remove("active"));
        tabContents.forEach((c) => c.classList.remove("active"));

        tab.classList.add("active");
        document.getElementById(`${targetTab}-tab`)?.classList.add("active");

        if (targetTab === "tilemap") {
          this.viewer.resizeCanvas();
          this.viewer.render();
        } else if (targetTab === "sprite") {
          this.spriteEditor.resizeCanvas();
          this.spriteEditor.render();
        }
      });
    });
  }

  private setupTilemapListeners(): void {
    this.fileInput.addEventListener("change", this.handleFileSelect.bind(this));

    this.tileWidthInput.addEventListener("input", this.handleTileSizeChange.bind(this));
    this.tileHeightInput.addEventListener("input", this.handleTileSizeChange.bind(this));

    this.showIndexCheckbox.addEventListener("change", () => {
      this.viewer.setShowIndex(this.showIndexCheckbox.checked);
    });

    this.bgWhiteCheckbox.addEventListener("change", () => {
      this.canvasContainer.classList.toggle("bg-white", this.bgWhiteCheckbox.checked);
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
      this.spriteEditor.resizeCanvas();
      this.spriteEditor.render();
    });

    this.canvas.addEventListener("wheel", () => {
      this.updateZoomLevel();
    });
  }

  private setupSpriteEditorListeners(): void {
    this.spriteFileInput.addEventListener("change", (e) => {
      const input = e.target as HTMLInputElement;
      if (input.files && input.files[0]) {
        this.loadSpriteImage(input.files[0]);
      }
    });

    const container = document.getElementById("sprite-canvas-container")!;
    container.addEventListener("dragover", (e) => {
      e.preventDefault();
      this.spriteDropZone.classList.add("drag-over");
    });
    container.addEventListener("dragleave", () => {
      this.spriteDropZone.classList.remove("drag-over");
    });
    container.addEventListener("drop", (e) => {
      e.preventDefault();
      this.spriteDropZone.classList.remove("drag-over");
      if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
        const file = e.dataTransfer.files[0];
        if (file.type.startsWith("image/")) {
          this.loadSpriteImage(file);
        }
      }
    });

    // Tool buttons
    this.toolSelect.addEventListener("click", () => {
      this.spriteEditor.setTool("select");
      this.toolSelect.classList.add("active");
      this.toolRect.classList.remove("active");
    });

    this.toolRect.addEventListener("click", () => {
      this.spriteEditor.setTool("rect");
      this.toolRect.classList.add("active");
      this.toolSelect.classList.remove("active");
    });

    this.spriteBgWhiteCheckbox.addEventListener("change", () => {
      this.spriteCanvasContainer.classList.toggle("bg-white", this.spriteBgWhiteCheckbox.checked);
    });

    // Zoom controls
    document.getElementById("sprite-zoom-in")!.addEventListener("click", () => {
      const newScale = Math.min(10, this.spriteEditor.getScale() * 1.2);
      this.spriteEditor.setScale(newScale);
      this.updateSpriteZoomLevel();
    });

    document.getElementById("sprite-zoom-out")!.addEventListener("click", () => {
      const newScale = Math.max(0.1, this.spriteEditor.getScale() / 1.2);
      this.spriteEditor.setScale(newScale);
      this.updateSpriteZoomLevel();
    });

    document.getElementById("sprite-zoom-reset")!.addEventListener("click", () => {
      this.spriteEditor.resetView();
      this.updateSpriteZoomLevel();
    });

    this.spriteCanvas.addEventListener("wheel", () => {
      this.updateSpriteZoomLevel();
    });

    // Import/Export TOML
    document.getElementById("import-toml")!.addEventListener("change", (e) => {
      this.importTOML(e);
    });

    document.getElementById("export-toml")!.addEventListener("click", () => {
      this.exportTOML();
    });

    // Sprite editor callbacks
    this.spriteEditor.setOnSpritesChange(() => {
      this.updateSpriteList();
      this.updateSpriteCount();
    });

    this.spriteEditor.setOnSelectionChange((id) => {
      this.updateSpriteListSelection(id);
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

  private loadSpriteImage(file: File): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.spriteDropZone.classList.add("hidden");
        this.spriteEditor.setImage(img, file.name);
        this.spriteEditor.setScale(2);
        this.updateSpriteImageInfo();
        this.updateSpriteZoomLevel();
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

  private updateSpriteImageInfo(): void {
    const info = this.spriteEditor.getImageInfo();
    if (info) {
      this.spriteImageInfo.textContent = `画像: ${info.width} × ${info.height} px`;
    }
  }

  private updateSpriteCount(): void {
    const count = this.spriteEditor.getSprites().length;
    this.spriteCount.textContent = `スプライト: ${count}`;
  }

  private updateSpriteZoomLevel(): void {
    const scale = this.spriteEditor.getScale();
    this.spriteZoomLevel.textContent = `${Math.round(scale * 100)}%`;
  }

  private updateSpriteList(): void {
    const sprites = this.spriteEditor.getSprites();
    const selectedId = this.spriteEditor.getSelectedId();

    this.spriteList.innerHTML = sprites
      .map(
        (sprite) => `
      <div class="sprite-item ${sprite.id === selectedId ? "selected" : ""}" data-id="${sprite.id}">
        <div class="sprite-item-header">
          <input type="text" class="sprite-item-name" value="${sprite.name}" data-id="${sprite.id}" />
          <button class="sprite-item-delete" data-id="${sprite.id}">削除</button>
        </div>
        <input type="text" class="sprite-item-comment" value="${sprite.comment}" data-id="${sprite.id}" placeholder="コメント..." />
        <div class="sprite-item-info">x:${sprite.x} y:${sprite.y} w:${sprite.width} h:${sprite.height}</div>
      </div>
    `
      )
      .join("");

    // Add event listeners
    this.spriteList.querySelectorAll(".sprite-item").forEach((item) => {
      item.addEventListener("click", (e) => {
        const target = e.target as HTMLElement;
        if (
          target.classList.contains("sprite-item-name") ||
          target.classList.contains("sprite-item-comment") ||
          target.classList.contains("sprite-item-delete")
        ) {
          return;
        }
        const id = item.getAttribute("data-id");
        if (id) {
          this.spriteEditor.setSelectedId(id);
          this.updateSpriteListSelection(id);
        }
      });
    });

    this.spriteList.querySelectorAll(".sprite-item-name").forEach((input) => {
      input.addEventListener("change", (e) => {
        const target = e.target as HTMLInputElement;
        const id = target.getAttribute("data-id");
        if (id) {
          this.spriteEditor.updateSpriteName(id, target.value);
        }
      });
    });

    this.spriteList.querySelectorAll(".sprite-item-comment").forEach((input) => {
      input.addEventListener("change", (e) => {
        const target = e.target as HTMLInputElement;
        const id = target.getAttribute("data-id");
        if (id) {
          this.spriteEditor.updateSpriteComment(id, target.value);
        }
      });
    });

    this.spriteList.querySelectorAll(".sprite-item-delete").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = (e.target as HTMLElement).getAttribute("data-id");
        if (id) {
          this.spriteEditor.deleteSprite(id);
        }
      });
    });
  }

  private updateSpriteListSelection(selectedId: string | null): void {
    this.spriteList.querySelectorAll(".sprite-item").forEach((item) => {
      const id = item.getAttribute("data-id");
      if (id === selectedId) {
        item.classList.add("selected");
      } else {
        item.classList.remove("selected");
      }
    });
  }

  private exportTOML(): void {
    const data = this.spriteEditor.exportJSON();

    let tomlStr = `image = "${data.image}"\n`;

    for (const sprite of data.sprites) {
      tomlStr += "\n";
      if (sprite.comment) {
        tomlStr += `# ${sprite.comment}\n`;
      }
      tomlStr += "[[sprites]]\n";
      tomlStr += `name = "${sprite.name}"\n`;
      tomlStr += `x = ${sprite.x}\n`;
      tomlStr += `y = ${sprite.y}\n`;
      tomlStr += `width = ${sprite.width}\n`;
      tomlStr += `height = ${sprite.height}\n`;
    }

    const blob = new Blob([tomlStr], { type: "application/toml" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = data.image.replace(/\.[^.]+$/, "") + "_sprites.toml";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private importTOML(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (!input.files || !input.files[0]) return;

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = (ev) => {
      try {
        const tomlText = ev.target?.result as string;
        const data = TOML.parse(tomlText) as {
          sprites?: Array<{ name: string; x: number; y: number; width: number; height: number }>;
        };

        // コメントを抽出（smol-tomlはコメントを保持しないので手動で解析）
        const comments = this.extractCommentsFromTOML(tomlText);

        if (data.sprites && Array.isArray(data.sprites)) {
          const spritesWithComments = data.sprites.map((sprite, index) => ({
            ...sprite,
            comment: comments[index] || "",
          }));
          this.spriteEditor.importSprites({ sprites: spritesWithComments });
        }
      } catch (err) {
        console.error("TOML parse error:", err);
        alert("TOMLの読み込みに失敗しました");
      }
    };

    reader.readAsText(file);
    input.value = "";
  }

  // [[sprites]] ブロックの直前にあるコメントを抽出
  private extractCommentsFromTOML(tomlText: string): string[] {
    const comments: string[] = [];
    const lines = tomlText.split("\n");

    let pendingComment = "";
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith("#")) {
        // コメント行: # の後の空白を除去して保存
        pendingComment = line.slice(1).trim();
      } else if (line === "[[sprites]]") {
        // [[sprites]] ブロックの開始: 直前のコメントを保存
        comments.push(pendingComment);
        pendingComment = "";
      } else if (line !== "") {
        // 空行でない他の行があればコメントをリセット
        pendingComment = "";
      }
    }

    return comments;
  }
}

new App();
