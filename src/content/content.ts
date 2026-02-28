import { LocalNLPEngine } from '../nlp/localEngine';
import { ScoringResult } from '../nlp/scoringEngine';
import { STORAGE_KEYS, VibeSettings, defaultSettings } from '../core/storage';

class DOMScanner {
  private processedHashes = new Set<string>();
  private nlp = new LocalNLPEngine();
  private settings: VibeSettings = defaultSettings;
  private batchSize = 10;
  private queue: HTMLElement[] = [];
  private isProcessing = false;

  constructor() {
    this.loadSettings();
    this.initObserver();
    this.initMessageListeners();
    this.initStorageListener();
  }

  private loadSettings() {
    chrome.storage.sync.get([STORAGE_KEYS.SETTINGS], (result) => {
      if (result[STORAGE_KEYS.SETTINGS]) {
        this.settings = result[STORAGE_KEYS.SETTINGS];
        if (this.settings.focusMode) {
          console.log("[VibeCheck+] Focus Mode is ON, starting scan...");
          this.scanForPosts();
        }
      } else {
        // 설정이 없으면 기본값 저장
        chrome.storage.sync.set({ [STORAGE_KEYS.SETTINGS]: defaultSettings });
      }
    });
  }

  private initStorageListener() {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'sync' && changes[STORAGE_KEYS.SETTINGS]) {
        const oldFocusMode = this.settings.focusMode;
        this.settings = changes[STORAGE_KEYS.SETTINGS].newValue;
        
        if (!oldFocusMode && this.settings.focusMode) {
          console.log("[VibeCheck+] Focus Mode Activated");
          this.scanForPosts();
        } else if (oldFocusMode && !this.settings.focusMode) {
          console.log("[VibeCheck+] Focus Mode Deactivated");
          this.removeAllOverlays();
        }
      }
    });
  }

  private removeAllOverlays() {
    const overlays = document.querySelectorAll('.vibe-check-overlay');
    overlays.forEach(overlay => overlay.remove());
    const checkedPosts = document.querySelectorAll('[data-vibe-checked]');
    checkedPosts.forEach(post => {
        if (post instanceof HTMLElement) delete post.dataset.vibeChecked;
    });
    this.processedHashes.clear();
  }

  private initMessageListeners() {
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === "FOCUS_MODE_ACTIVATED") {
        this.showToast("Focus Mode Activated.");
      }
    });
  }

  private showToast(text: string) {
    const toast = document.createElement("div");
    toast.style.cssText = `
      position: fixed; top: 20px; right: 20px;
      background: #4a90e2; color: white;
      padding: 16px 24px; border-radius: 12px;
      z-index: 10001; box-shadow: 0 10px 25px rgba(0,0,0,0.2);
      font-family: sans-serif;
    `;
    toast.innerText = text;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  private initObserver() {
    const observer = new MutationObserver(() => this.scanForPosts());
    observer.observe(document.body, { childList: true, subtree: true });
    setInterval(() => this.scanForPosts(), 2000);
  }

  private scanForPosts() {
    if (!this.settings.focusMode) return;

    const selectors = [
      'article', '[data-testid="tweet"]', '[data-testid="post-container"]', 
      '.shreddit-post', '.feed-shared-update-v2', 'main div article'
    ];
    
    let foundNew = false;
    selectors.forEach(selector => {
      const posts = document.querySelectorAll(selector);
      posts.forEach(post => {
        if (post instanceof HTMLElement && !post.dataset.vibeChecked) {
          if (post.querySelector('.vibe-check-overlay')) return;
          post.dataset.vibeChecked = "true";
          this.queue.push(post);
          foundNew = true;
        }
      });
    });

    if (foundNew && !this.isProcessing) this.processQueue();
  }

  private async processQueue() {
    if (this.queue.length === 0 || !this.settings.focusMode) {
      this.isProcessing = false;
      return;
    }
    this.isProcessing = true;
    const batch = this.queue.splice(0, this.batchSize);
    for (const post of batch) {
      await this.checkPost(post);
    }
    setTimeout(() => this.processQueue(), 100);
  }

  private async checkPost(post: HTMLElement) {
    if (!this.settings.focusMode) return;

    let attempts = 0;
    let text = post.innerText || "";
    while (text.length < 5 && attempts < 5) {
      await new Promise(r => setTimeout(r, 200));
      text = post.innerText || "";
      attempts++;
    }

    if (text.length < 5) {
      delete post.dataset.vibeChecked;
      return;
    }

    chrome.runtime.sendMessage({ type: "REPORT_SCAN" });

    if (this.isWhitelisted(text)) return;

    const activeTags = (this.settings.blockedTags || []).filter(t => t.trim().length > 0);
    const result = await this.nlp.analyze(text, activeTags);
    
    if (result.isFiltered) {
      console.log(`[VibeCheck+] Filtering: Found keyword "${result.matchedKeyword}"`);
      this.blurPost(post, result.matchedKeyword || "Blocked Tag");
      chrome.runtime.sendMessage({ type: "REPORT_FILTER" });
    }
  }

  private isWhitelisted(text: string): boolean {
    if (!this.settings.whiteListUsers) return false;
    return this.settings.whiteListUsers.some(handle => {
      if (!handle.trim()) return false;
      const cleanHandle = handle.startsWith('@') ? handle : `@${handle}`;
      return text.includes(cleanHandle);
    });
  }

  private blurPost(post: HTMLElement, reason: string) {
    if (post.querySelector('.vibe-check-overlay')) return;

    const originalPosition = window.getComputedStyle(post).position;
    if (originalPosition === 'static') post.style.position = "relative";

    const overlay = document.createElement("div");
    overlay.className = "vibe-check-overlay";
    overlay.style.cssText = `
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(255, 255, 255, 0.01);
      backdrop-filter: blur(30px) brightness(0.85);
      -webkit-backdrop-filter: blur(30px) brightness(0.85);
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      color: #fff; z-index: 999;
      border-radius: inherit;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      overflow: hidden;
      pointer-events: auto;
    `;
    
    overlay.innerHTML = `
      <div style="text-align: center; padding: 20px; text-shadow: 0 2px 10px rgba(0,0,0,0.5);">
        <p style="margin: 0 0 15px 0; font-weight: bold; font-size: 18px; letter-spacing: -0.5px;">Filtered: ${reason}</p>
        <button id="reveal-btn" style="
          padding: 10px 24px; cursor: pointer; border: 1.5px solid rgba(255,255,255,0.8); 
          border-radius: 30px; background: rgba(0,0,0,0.2); color: white; 
          font-weight: bold; font-size: 13px; backdrop-filter: blur(5px);
          transition: all 0.2s ease;
        ">Show anyway</button>
      </div>
    `;

    overlay.querySelector("#reveal-btn")?.addEventListener("click", (e) => {
      e.stopPropagation(); e.preventDefault();
      overlay.remove();
    });

    overlay.addEventListener("click", (e) => e.stopPropagation());
    post.appendChild(overlay);
  }
}

new DOMScanner();
