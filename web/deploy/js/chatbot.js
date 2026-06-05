/* Chatbot-311 Premium Frontend Widget */
import { app } from "../../../scripts/app.js";
import { api } from "../../../scripts/api.js";

// Inline flat SVGs for clean, emoticon-free modern UI
const robotSvg = `
  <svg class="chatbot311-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="11" width="18" height="10" rx="2"></rect>
    <circle cx="12" cy="5" r="2"></circle>
    <path d="M12 7v4"></path>
    <line x1="8" y1="16" x2="8" y2="16"></line>
    <line x1="16" y1="16" x2="16" y2="16"></line>
  </svg>
`;

const clipSvg = `
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
  </svg>
`;

const trashSvg = `
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    <line x1="10" y1="11" x2="10" y2="17"></line>
    <line x1="14" y1="11" x2="14" y2="17"></line>
  </svg>
`;

const plusSvg = `
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
`;


const sendSvg = `
  <svg class="chatbot311-send-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"></line>
    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
  </svg>
`;

const copySvg = `
  <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
  </svg>
`;

const xSvg = `
  <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
`;

const menuSvg = `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="3" y1="12" x2="21" y2="12"></line>
    <line x1="3" y1="6" x2="21" y2="6"></line>
    <line x1="3" y1="18" x2="21" y2="18"></line>
  </svg>
`;

// Inject CSS stylesheet dynamically
const link = document.createElement("link");
link.rel = "stylesheet";
link.href = "/extensions/ComfyUI-311-Chatbot/css/chatbot.css";
document.head.appendChild(link);

// Simple Markdown to HTML parser
function parseMarkdown(text) {
  if (!text) return "";
  
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
    
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
    return `<pre><code class="language-${lang}">${code.trim()}</code></pre>`;
  });
  
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  html = html.replace(/\n/g, "<br>");
  
  return html;
}

// Check for connected images in LiteGraph
async function getConnectedImages(node) {
  const imageInputIdx = node.inputs ? node.inputs.findIndex(input => input.name === "image") : -1;
  if (imageInputIdx === -1) return [];
  
  const linkId = node.inputs[imageInputIdx].link;
  if (!linkId) return [];
  
  const link = app.graph.links[linkId];
  if (!link) return [];
  
  const originNode = app.graph.getNodeById(link.origin_id);
  if (!originNode) return [];
  
  let imagesToFetch = [];
  
  // Case 1: LoadImage node
  if (originNode.type === "LoadImage" || originNode.comfyClass === "LoadImage") {
    const imageWidget = originNode.widgets ? originNode.widgets.find(w => w.name === "image") : null;
    if (imageWidget && imageWidget.value) {
      imagesToFetch.push({
        filename: imageWidget.value,
        url: `/view?filename=${encodeURIComponent(imageWidget.value)}&type=input`
      });
    }
  }
  
  // Case 2: Preview nodes
  if (imagesToFetch.length === 0 && originNode.imgs && originNode.imgs.length > 0) {
    originNode.imgs.forEach((img, idx) => {
      imagesToFetch.push({
        filename: `preview_${idx}.png`,
        url: img.src
      });
    });
  }
  
  // Case 3: Output images
  if (imagesToFetch.length === 0 && originNode.images && originNode.images.length > 0) {
    originNode.images.forEach((img, idx) => {
      imagesToFetch.push({
        filename: img.filename || `output_${idx}.png`,
        url: `/view?filename=${encodeURIComponent(img.filename)}&type=${img.type || "output"}&subfolder=${encodeURIComponent(img.subfolder || "")}`
      });
    });
  }
  
  if (imagesToFetch.length > 0) {
    const results = [];
    for (const imgInfo of imagesToFetch) {
      try {
        const response = await fetch(imgInfo.url);
        if (response.ok) {
          const blob = await response.blob();
          const base64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          });
          results.push({
            url: imgInfo.url,
            filename: imgInfo.filename,
            base64: base64
          });
        }
      } catch (e) {
        console.error("Error reading workflow image:", e);
      }
    }
    return results;
  }
  return [];
}

class ChatbotUI {
  constructor(node, container) {
    this.node = node;
    this.container = container;
    this.history = [];
    this.config = {};
    this.pendingAttachments = [];
    this.connectedAttachments = [];
    this.connectedSystemPrompt = null;
    this.defaultSystemPrompt = "";
    this.currentChatId = 'chat_' + Math.random().toString(36).substring(2, 15);
    this.chatName = "";
    this.isGenerating = false;
    
    this.buildUI();
    this.setupEventListeners();
    this.checkAPIStatus();
    this.fetchDefaultSystemPrompt();
    this.fetchConversations();
    
    this.connectionCheckInterval = setInterval(() => this.checkConnections(), 2000);
  }
  
  buildUI() {
    this.container.innerHTML = `
      <div class="chatbot311-sidebar" id="sidebar">
        <div class="chatbot311-sidebar-header">
          <span class="chatbot311-sidebar-title">Conversations</span>
          <button class="chatbot311-btn-menu" id="btn-close-sidebar" title="Close Sidebar">${xSvg}</button>
        </div>
        <div class="chatbot311-conv-list" id="conv-list"></div>
      </div>

      <div class="chatbot311-header">
        <div class="chatbot311-title">
          <button class="chatbot311-btn-menu" id="btn-toggle-sidebar" title="Conversations">${menuSvg}</button>
          <span class="chatbot311-status-dot online"></span>
          ${robotSvg}
          <span>Chatbot-311</span>
          <div class="chatbot311-conn-badge-area">
            <span class="chatbot311-badge system" id="badge-system" style="display: none;" title="System Prompt Connected">SYS</span>
            <span class="chatbot311-badge image" id="badge-image" style="display: none;" title="Workflow Image Connected">IMG</span>
            <div class="chatbot311-model-badge" id="model-badge">Gemini 3.5</div>
          </div>
        </div>
        <div class="chatbot311-header-actions">
          <button class="chatbot311-btn-new-chat-quick" id="btn-new-chat-quick" title="New Chat">${plusSvg}</button>
          <button class="chatbot311-btn-clear" id="btn-clear" title="Clear Conversation">${trashSvg}</button>
        </div>
      </div>
      
      <div class="chatbot311-messages" id="msg-container"></div>
      
      <div class="chatbot311-drag-overlay">Drop image here to attach</div>
      
      <div class="chatbot311-preview-bar" style="display: none;" id="preview-bar"></div>
      
      <div class="chatbot311-input-area">
        <button class="chatbot311-control-btn" id="btn-attach" title="Attach Image">${clipSvg}</button>
        <textarea class="chatbot311-textarea" placeholder="Ask Gemini... (Enter to send, Shift+Enter for newline)" id="txt-input"></textarea>
        <button class="chatbot311-btn-send" id="btn-send" title="Send message">
          ${sendSvg}
        </button>
      </div>

      <div class="chatbot311-confirm-banner" style="display: none;" id="confirm-banner">
        <button class="chatbot311-btn-confirm" id="btn-confirm">Confirm</button>
      </div>
      
      <input type="file" id="file-input" accept="image/*" style="display: none;" multiple />
    `;
    
    this.sidebar = this.container.querySelector("#sidebar");
    this.convList = this.container.querySelector("#conv-list");
    this.messagesContainer = this.container.querySelector("#msg-container");
    this.previewBar = this.container.querySelector("#preview-bar");
    this.confirmBanner = this.container.querySelector("#confirm-banner");
    this.confirmBtn = this.container.querySelector("#btn-confirm");
    this.textarea = this.container.querySelector("#txt-input");
    this.sendBtn = this.container.querySelector("#btn-send");
    this.attachBtn = this.container.querySelector("#btn-attach");
    this.clearBtn = this.container.querySelector("#btn-clear");
    this.newChatQuickBtn = this.container.querySelector("#btn-new-chat-quick");
    this.fileInput = this.container.querySelector("#file-input");
    this.statusDot = this.container.querySelector(".chatbot311-status-dot");
    
    this.btnToggleSidebar = this.container.querySelector("#btn-toggle-sidebar");
    this.btnCloseSidebar = this.container.querySelector("#btn-close-sidebar");
  }
  
  setupEventListeners() {
    this.sendBtn.addEventListener("click", () => this.sendMessage());
    if (this.confirmBtn) {
      this.confirmBtn.addEventListener("click", () => this.confirmResume());
    }
    
    this.textarea.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
    
    this.textarea.addEventListener("input", () => {
      this.textarea.style.height = "auto";
      this.textarea.style.height = (this.textarea.scrollHeight) + "px";
    });
    
    this.clearBtn.addEventListener("click", () => this.clearChat());
    this.newChatQuickBtn.addEventListener("click", () => this.startNewChat());
    this.attachBtn.addEventListener("click", () => this.fileInput.click());
    this.fileInput.addEventListener("change", (e) => this.handleFileSelect(e));
    
    // Sidebar triggers
    this.btnToggleSidebar.addEventListener("click", () => {
      this.container.classList.toggle("sidebar-open");
    });
    this.btnCloseSidebar.addEventListener("click", () => {
      this.container.classList.remove("sidebar-open");
    });
    
    // Close sidebar clicking outside
    this.messagesContainer.addEventListener("click", () => {
      this.container.classList.remove("sidebar-open");
    });
    
    this.container.addEventListener("dragenter", (e) => {
      e.preventDefault();
      this.container.classList.add("drag-over");
    });
    
    this.container.addEventListener("dragover", (e) => {
      e.preventDefault();
    });
    
    this.container.addEventListener("dragleave", (e) => {
      if (!this.container.contains(e.relatedTarget)) {
        this.container.classList.remove("drag-over");
      }
    });
    
    this.container.addEventListener("drop", (e) => {
      e.preventDefault();
      this.container.classList.remove("drag-over");
      this.handleFileDrop(e);
    });
    
    api.addEventListener("chatbot311-update-history", (event) => {
      const { node_id, history } = event.detail;
      if (String(node_id) === String(this.node.id)) {
        this.history = history;
        this.renderMessages();
      }
    });

    api.addEventListener("chatbot311-chat-paused", (event) => {
      const { node_id, sound_alert } = event.detail;
      if (String(node_id) === String(this.node.id)) {
        if (this.confirmBanner) {
          this.confirmBanner.style.display = "flex";
        }
        if (sound_alert) {
          try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5 note
            gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.3); // 300ms beep
          } catch (err) {
            console.warn('Failed to play sound alert:', err);
          }
        }
      }
    });
  }

  async confirmResume() {
    if (!this.confirmBtn) return;
    this.confirmBtn.disabled = true;
    this.confirmBtn.innerText = "Confirming...";
    try {
      const response = await fetch("/chatbot-311/chat/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          node_id: this.node.id.toString(),
          action: "confirm",
          history: this.history
        })
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          if (this.confirmBanner) {
            this.confirmBanner.style.display = "none";
          }
        } else {
          console.error("Failed to resume chat:", data.error);
        }
      }
    } catch (e) {
      console.error("Error resuming chat:", e);
    } finally {
      this.confirmBtn.disabled = false;
      this.confirmBtn.innerText = "Confirm";
    }
  }
  
  async checkAPIStatus() {
    try {
      const response = await fetch("/chatbot-311/proxy/gemini");
      if (response.ok) {
        this.statusDot.className = "chatbot311-status-dot online";
        this.showOfflineOverlay(false);
      } else {
        this.statusDot.className = "chatbot311-status-dot offline";
        this.showOfflineOverlay(true);
      }
    } catch (e) {
      this.statusDot.className = "chatbot311-status-dot offline";
      this.showOfflineOverlay(true);
    }
  }

  showOfflineOverlay(show) {
    let overlay = this.container.querySelector(".chatbot311-offline-overlay");
    if (show) {
      if (!overlay) {
        overlay = document.createElement("div");
        overlay.className = "chatbot311-offline-overlay";
        overlay.innerHTML = `
          <div class="chatbot311-offline-card">
            <svg class="chatbot311-offline-icon" viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            <h3>Connection Offline</h3>
            <p>The local server is currently unreachable. Please start ComfyUI to enable chat features.</p>
          </div>
        `;
        this.container.appendChild(overlay);
      }
      overlay.style.display = "flex";
    } else {
      if (overlay) {
        overlay.style.display = "none";
      }
    }
  }
  
  async fetchDefaultSystemPrompt() {
    try {
      const response = await fetch("/chatbot-311/system-prompt");
      if (response.ok) {
        const data = await response.json();
        this.defaultSystemPrompt = data.system_prompt || "";
      }
    } catch (e) {
      console.error("Failed to fetch default system prompt:", e);
    }
  }
  
  async fetchConversations() {
    try {
      const response = await fetch("/chatbot-311/conversations");
      if (response.ok) {
        const convs = await response.json();
        this.renderConversationsList(convs);
      }
    } catch (e) {
      console.error("Failed to fetch conversations list:", e);
    }
  }
  
  renderConversationsList(convs) {
    this.convList.innerHTML = "";
    if (convs.length === 0) {
      this.convList.innerHTML = `<div style="text-align: center; color: var(--cb311-text-muted); font-size: 10px; padding: 20px 0;">No saved chats</div>`;
      return;
    }
    
    convs.forEach(c => {
      const item = document.createElement("div");
      item.className = `chatbot311-conv-item ${c.id === this.currentChatId ? 'active' : ''}`;
      item.innerHTML = `
        <span class="chatbot311-conv-name" title="${c.name}">${c.name}</span>
        <button class="chatbot311-conv-btn-delete" title="Delete chat">${trashSvg}</button>
      `;
      
      item.addEventListener("click", () => this.loadConversation(c.id));
      
      const delBtn = item.querySelector(".chatbot311-conv-btn-delete");
      delBtn.addEventListener("click", (e) => this.deleteConversation(c.id, e));
      
      this.convList.appendChild(item);
    });
  }
  
  async loadConversation(id) {
    try {
      const response = await fetch(`/chatbot-311/conversations/${id}`);
      if (response.ok) {
        const data = await response.json();
        this.currentChatId = data.id;
        this.chatName = data.name;
        this.history = data.history;
        this.renderMessages();
        this.updateNodeValue();
        this.container.classList.remove("sidebar-open");
        this.fetchConversations();
      }
    } catch (e) {
      console.error("Failed loading conversation:", e);
    }
  }
  
  async saveActiveConversation() {
    if (this.history.length === 0) return;
    
    // Auto generate title
    if (!this.chatName) {
      const firstMsg = this.history[0];
      const content = firstMsg.content;
      if (Array.isArray(content)) {
        const textPart = content.find(p => p.type === "text");
        this.chatName = textPart ? textPart.text : "Image Chat";
      } else {
        this.chatName = content || "Untitled Chat";
      }
      this.chatName = this.chatName.slice(0, 30).trim();
    }
    
    try {
      const response = await fetch("/chatbot-311/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: this.currentChatId,
          name: this.chatName,
          history: this.history
        })
      });
      if (response.ok) {
        const data = await response.json();
        this.currentChatId = data.id;
        this.fetchConversations();
      }
    } catch (e) {
      console.error("Failed auto-saving conversation:", e);
    }
  }
  
  async deleteConversation(id, event) {
    event.stopPropagation();
    if (!confirm("Are you sure you want to delete this conversation?")) return;
    
    try {
      const response = await fetch(`/chatbot-311/conversations/${id}`, {
        method: "DELETE"
      });
      if (response.ok) {
        if (this.currentChatId === id) {
          this.startNewChat();
        } else {
          this.fetchConversations();
        }
      }
    } catch (e) {
      console.error("Failed deleting conversation:", e);
    }
  }
  
  startNewChat() {
    this.currentChatId = 'chat_' + Math.random().toString(36).substring(2, 15);
    this.chatName = "";
    this.history = [];
    this.renderMessages();
    this.updateNodeValue();
    this.container.classList.remove("sidebar-open");
    this.fetchConversations();
  }
  
  getConnectedSystemPrompt() {
    const systemInputIdx = this.node.inputs ? this.node.inputs.findIndex(input => input.name === "system") : -1;
    if (systemInputIdx === -1) return null;
    
    const linkId = this.node.inputs[systemInputIdx].link;
    if (!linkId) return null;
    
    const link = app.graph.links[linkId];
    if (!link) return null;
    
    const originNode = app.graph.getNodeById(link.origin_id);
    if (!originNode) return null;
    
    if (originNode.widgets && originNode.widgets.length > 0) {
      const textWidget = originNode.widgets.find(w => w.name === "text" || w.name === "string" || w.name === "value" || w.type === "text" || w.type === "customtext");
      if (textWidget) {
        return String(textWidget.value);
      }
      if (typeof originNode.widgets[0].value === "string") {
        return String(originNode.widgets[0].value);
      }
    }
    return null;
  }
  
  async checkConnections() {
    // Check connected images
    const connImgs = await getConnectedImages(this.node);
    const badgeImage = this.container.querySelector("#badge-image");
    if (connImgs && connImgs.length > 0) {
      const oldUrls = (this.connectedAttachments || []).map(a => a.url).join(",");
      const newUrls = connImgs.map(a => a.url).join(",");
      if (oldUrls !== newUrls) {
        this.connectedAttachments = connImgs;
        badgeImage.style.display = "inline-block";
        badgeImage.title = `Connected ${connImgs.length} images`;
        this.updatePreviewBar();
      }
    } else {
      if (this.connectedAttachments && this.connectedAttachments.length > 0) {
        this.connectedAttachments = [];
        badgeImage.style.display = "none";
        this.updatePreviewBar();
      }
    }

    // Check connected system prompt
    const sysPrompt = this.getConnectedSystemPrompt();
    const badgeSystem = this.container.querySelector("#badge-system");
    if (sysPrompt !== null) {
      if (this.connectedSystemPrompt !== sysPrompt) {
        this.connectedSystemPrompt = sysPrompt;
        badgeSystem.style.display = "inline-block";
        badgeSystem.title = `Connected system prompt: "${sysPrompt.slice(0, 100)}..."`;
      }
    } else {
      if (this.connectedSystemPrompt) {
        this.connectedSystemPrompt = null;
        badgeSystem.style.display = "none";
      }
    }
  }
  
  handleFileSelect(e) {
    const files = Array.from(e.target.files);
    files.forEach(file => this.processFile(file));
  }
  
  handleFileDrop(e) {
    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith("image/"));
    files.forEach(file => this.processFile(file));
  }
  
  processFile(file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      this.pendingAttachments.push({
        id: 'img_' + Math.random().toString(36).substring(2, 9),
        filename: file.name,
        base64: event.target.result
      });
      this.updatePreviewBar();
    };
    reader.readAsDataURL(file);
  }
  
  updatePreviewBar() {
    const hasPending = this.pendingAttachments && this.pendingAttachments.length > 0;
    const hasConnected = this.connectedAttachments && this.connectedAttachments.length > 0;
    
    if (hasPending || hasConnected) {
      this.previewBar.style.display = "flex";
      this.previewBar.innerHTML = "";
      
      if (hasPending) {
        this.pendingAttachments.forEach(att => {
          const item = document.createElement("div");
          item.className = "chatbot311-preview-item";
          item.innerHTML = `
            <div class="chatbot311-preview-thumb" style="background-image: url('${att.base64}');">
              <button class="chatbot311-preview-remove" data-id="${att.id}">✕</button>
            </div>
            <span class="chatbot311-preview-name">${att.filename} (Upload)</span>
          `;
          
          const removeBtn = item.querySelector(".chatbot311-preview-remove");
          removeBtn.addEventListener("click", () => {
            this.pendingAttachments = this.pendingAttachments.filter(a => a.id !== att.id);
            this.updatePreviewBar();
          });
          
          this.previewBar.appendChild(item);
        });
      }
      
      if (hasConnected) {
        this.connectedAttachments.forEach(att => {
          const item = document.createElement("div");
          item.className = "chatbot311-preview-item";
          item.innerHTML = `
            <div class="chatbot311-preview-thumb" style="background-image: url('${att.base64}');"></div>
            <span class="chatbot311-preview-name">${att.filename} (Graph)</span>
          `;
          this.previewBar.appendChild(item);
        });
      }
    } else {
      this.previewBar.style.display = "none";
      this.previewBar.innerHTML = "";
    }
  }
  
  setValue(val) {
    if (!val) return;
    let history = [];
    let config = {};
    
    try {
      const parsed = typeof val === "string" ? JSON.parse(val) : val;
      if (Array.isArray(parsed)) {
        history = parsed;
      } else if (parsed && typeof parsed === "object") {
        history = parsed.history || [];
        config = parsed.config || {};
        if (parsed.currentChatId) {
          this.currentChatId = parsed.currentChatId;
        }
        if (parsed.chatName) {
          this.chatName = parsed.chatName;
        }
      }
    } catch (e) {
      console.error("Error setting widget value:", e);
    }
    
    this.history = history;
    this.config = config;
    this.renderMessages();
    this.fetchConversations();
  }
  
  renderMessages() {
    this.messagesContainer.innerHTML = "";
    
    if (this.history.length === 0) {
      this.messagesContainer.innerHTML = `
        <div style="text-align: center; color: var(--cb311-text-muted); font-size: 11px; margin-top: 24px; padding: 0 20px;">
          Ask Gemini to craft prompts. Connect inputs, upload images, or start typing below.
        </div>
      `;
      return;
    }
    
    this.history.forEach((msg, idx) => {
      const bubble = this.createMessageBubble(msg.role, msg.content, idx);
      this.messagesContainer.appendChild(bubble);
    });
    
    this.scrollBottom();
  }
  
  createMessageBubble(role, content, index = null) {
    const bubble = document.createElement("div");
    bubble.className = `chatbot311-message ${role}`;
    
    const inner = document.createElement("div");
    inner.className = "chatbot311-message-content";
    
    let text = "";
    let images = [];
    
    if (Array.isArray(content)) {
      content.forEach(part => {
        if (part.type === "text") {
          text = part.text;
        } else if (part.type === "image_url") {
          images.push(part.image_url.url);
        }
      });
    } else {
      text = content || "";
    }
    
    if (images.length > 0) {
      const imgsContainer = document.createElement("div");
      imgsContainer.className = "chatbot311-message-images";
      images.forEach(imgUrl => {
        const img = document.createElement("img");
        img.className = "chatbot311-message-img";
        img.src = imgUrl;
        imgsContainer.appendChild(img);
      });
      inner.appendChild(imgsContainer);
    }
    
    const textSpan = document.createElement("span");
    textSpan.innerHTML = parseMarkdown(text);
    inner.appendChild(textSpan);
    
    bubble.appendChild(inner);
    
    if (index !== null) {
      const toolbar = document.createElement("div");
      toolbar.className = "chatbot311-msg-toolbar";
      
      const copyBtn = document.createElement("button");
      copyBtn.className = "chatbot311-msg-btn";
      copyBtn.innerHTML = copySvg;
      copyBtn.title = "Copy message text";
      copyBtn.addEventListener("click", () => {
        navigator.clipboard.writeText(text);
      });
      toolbar.appendChild(copyBtn);
      
      const delBtn = document.createElement("button");
      delBtn.className = "chatbot311-msg-btn delete";
      delBtn.innerHTML = xSvg;
      delBtn.title = "Delete message";
      delBtn.addEventListener("click", () => this.deleteMessage(index));
      toolbar.appendChild(delBtn);
      
      bubble.appendChild(toolbar);
    }
    
    return bubble;
  }
  
  scrollBottom() {
    setTimeout(() => {
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }, 10);
  }
  
  showTypingIndicator(show) {
    const existing = this.container.querySelector("#typing-indicator");
    if (show && !existing) {
      const indicator = document.createElement("div");
      indicator.className = "chatbot311-message assistant";
      indicator.id = "typing-indicator";
      indicator.innerHTML = `
        <div class="chatbot311-message-content">
          <div class="chatbot311-typing-indicator">
            <span class="chatbot311-typing-dot"></span>
            <span class="chatbot311-typing-dot"></span>
            <span class="chatbot311-typing-dot"></span>
          </div>
        </div>
      `;
      this.messagesContainer.appendChild(indicator);
      this.scrollBottom();
    } else if (!show && existing) {
      existing.remove();
    }
  }
  
  setSendButtonState(sending) {
    if (sending) {
      this.sendBtn.style.opacity = "0.5";
      this.sendBtn.style.pointerEvents = "none";
    } else {
      this.sendBtn.style.opacity = "1";
      this.sendBtn.style.pointerEvents = "auto";
    }
  }
  
  async sendMessage() {
    if (this.isGenerating) return;
    
    const text = this.textarea.value.trim();
    const allAttachments = [...(this.pendingAttachments || []), ...(this.connectedAttachments || [])];
    
    if (!text && allAttachments.length === 0) return;
    
    this.isGenerating = true;
    this.setSendButtonState(true);
    
    let content = text;
    if (allAttachments.length > 0) {
      content = [];
      content.push({ type: "text", text: text || "Analyze these images." });
      allAttachments.forEach(att => {
        content.push({
          type: "image_url",
          image_url: { url: att.base64 }
        });
      });
    }
    
    this.history.push({ role: "user", content });
    this.renderMessages();
    
    this.textarea.value = "";
    this.textarea.style.height = "auto";
    this.pendingAttachments = [];
    this.fileInput.value = "";
    this.updatePreviewBar();
    
    this.showTypingIndicator(true);
    
    // Save user message immediately
    await this.saveActiveConversation();
    
    // Build messages payload for API (connected system prompt vs default system prompt)
    const apiMessages = [];
    const activeSystemPrompt = this.connectedSystemPrompt || this.defaultSystemPrompt;
    if (activeSystemPrompt && activeSystemPrompt.trim()) {
      apiMessages.push({
        role: "system",
        content: activeSystemPrompt.trim()
      });
    }
    
    this.history.forEach(msg => {
      apiMessages.push({
        role: msg.role,
        content: msg.content
      });
    });
    
    try {
      const response = await fetch("/chatbot-311/proxy/gemini/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          stream: true
        })
      });
      
      this.showTypingIndicator(false);
      
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || `Server responded with status ${response.status}`);
      }
      
      const bubble = this.createMessageBubble("assistant", "");
      this.messagesContainer.appendChild(bubble);
      const textSpan = bubble.querySelector(".chatbot311-message-content span");
      this.scrollBottom();
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      let accumulated = "";
      
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();
        
        for (const line of lines) {
          const cleaned = line.trim();
          if (!cleaned) continue;
          if (cleaned === "data: [DONE]") break;
          
          if (cleaned.startsWith("data: ")) {
            try {
              const parsed = JSON.parse(cleaned.slice(6));
              const delta = parsed.choices[0].delta.content || "";
              accumulated += delta;
              textSpan.innerHTML = parseMarkdown(accumulated);
              this.scrollBottom();
            } catch (e) {
              // Suppress partial chunk errors
            }
          }
        }
      }
      
      this.history.push({ role: "assistant", content: accumulated });
      this.updateNodeValue();
      
      // Save full conversation with assistant response
      await this.saveActiveConversation();
      
    } catch (e) {
      console.error(e);
      this.showTypingIndicator(false);
      this.addMessage("assistant", `Error: ${e.message}`);
      this.updateNodeValue();
    } finally {
      this.isGenerating = false;
      this.setSendButtonState(false);
    }
  }
  
  addMessage(role, content) {
    this.history.push({ role, content });
    this.renderMessages();
  }
  
  deleteMessage(idx) {
    this.history.splice(idx, 1);
    this.renderMessages();
    this.updateNodeValue();
    this.saveActiveConversation();
  }
  
  clearChat() {
    if (this.history.length === 0) return;
    if (!confirm("¿Estás seguro de que deseas limpiar esta conversación?")) return;
    
    this.history = [];
    this.chatName = "";
    this.renderMessages();
    this.updateNodeValue();
    // Delete file from disk if it was saved
    fetch(`/chatbot-311/conversations/${this.currentChatId}`, { method: "DELETE" })
      .then(() => this.fetchConversations());
  }
  
  updateNodeValue() {
    const val = JSON.stringify({
      config: this.config,
      history: this.history,
      currentChatId: this.currentChatId,
      chatName: this.chatName
    });
    const widget = (this.node.widgets || []).find(w => w.name === "ui_widget") || this.node.widgets[0];
    if (widget) {
      widget.value = val;
    }
    this.node.trigger("change");
  }
  
  destroy() {
    clearInterval(this.connectionCheckInterval);
  }
}

app.registerExtension({
  name: "Chatbot311.Extension",
  
  getCustomWidgets() {
    return {
      CHAT_311: (node, inputName, inputData, app) => {
        const element = document.createElement("div");
        element.className = "chatbot311-container";
        
        const chatbot = new ChatbotUI(node, element);
        
        // ComfyUI V2 handles widget sizing via computeLayoutSize,
        // reading getMinHeight/getMaxHeight from widget options.
        // No manual computeSize overrides needed.
        
        const widget = node.addDOMWidget(inputName, "CHAT_311", element, {
          hideOnZoom: false,
          getMinHeight() {
            return 250;
          },
          getValue() {
            return {
              config: chatbot.config,
              history: chatbot.history,
              currentChatId: chatbot.currentChatId,
              chatName: chatbot.chatName,
              node_id: node.id
            };
          },
          setValue(val) {
            chatbot.setValue(val);
          },
          getState() {
            return {
              config: chatbot.config,
              history: chatbot.history,
              currentChatId: chatbot.currentChatId,
              chatName: chatbot.chatName
            };
          }
        });
        
        // No widget.computeSize or widget.draw overrides.
        // ComfyUI V2 uses computeLayoutSize with getMinHeight from widget options.
        // The chatbot fills remaining space via CSS height: 100%.
        
        node.chatbotWidget = widget;
        node.chatbotUI = chatbot;
        
        node.size = [380, 580];
        if (node.setSize) {
          node.setSize([380, 580]);
        }
        
        const onRemoved = node.onRemoved;
        node.onRemoved = function() {
          if (chatbot) chatbot.destroy();
          if (onRemoved) onRemoved.apply(this, arguments);
        };
        
        return widget;
      }
    };
  },
  
  async beforeRegisterNodeDef(nodeType, nodeData, app) {
    if (nodeData.name === "Chatbot311") {
      const onConnectionsChange = nodeType.prototype.onConnectionsChange;
      nodeType.prototype.onConnectionsChange = function(type, index, connected, link_info, input_info) {
        if (onConnectionsChange) {
          onConnectionsChange.apply(this, arguments);
        }
        if (this.chatbotUI) {
          this.chatbotUI.checkConnections();
        }
      };

      const onNodeCreated = nodeType.prototype.onNodeCreated;
      nodeType.prototype.onNodeCreated = function() {
        const r = onNodeCreated ? onNodeCreated.apply(this, arguments) : undefined;
        const node = this;
        
        node.onResize = function(size) {
          // Let ComfyUI V2 handle layout. Just redraw.
          if (node.graph) {
            node.graph.setDirtyCanvas(true, true);
          }
        };
        
        const updateDelimiterOutputs = (count) => {
          if (!node.outputs) return;
          const maxDelims = 20;
          for (let i = 1; i <= maxDelims; i++) {
            const outputName = `Delimiter_${i}`;
            const idx = node.outputs.findIndex(o => o.name === outputName);
            if (i <= count) {
              if (idx === -1) {
                node.addOutput(outputName, "STRING");
              }
            } else {
              if (idx !== -1) {
                node.removeOutput(idx);
              }
            }
          }
        };

        const updateNodeLayout = () => {
          const modeWidget = node.widgets?.find(w => w.name === "mode");
          const soundAlertWidget = node.widgets?.find(w => w.name === "sound_alert");
          const numDelimWidget = node.widgets?.find(w => w.name === "number_of_delimiters");
          
          // 1. Sound alert visibility
          const isInteractive = modeWidget ? modeWidget.value === "Interactive Chat (Pause)" : true;
          if (soundAlertWidget) {
            if (isInteractive) {
              if (soundAlertWidget.type === "converted-widget") {
                soundAlertWidget.type = soundAlertWidget.original_type || "BOOLEAN";
              }
              if (soundAlertWidget.element) {
                soundAlertWidget.element.style.display = "";
              }
              delete soundAlertWidget.computeSize;
              delete soundAlertWidget.draw;
            } else {
              if (soundAlertWidget.type !== "converted-widget") {
                soundAlertWidget.original_type = soundAlertWidget.type;
                soundAlertWidget.type = "converted-widget";
              }
              if (soundAlertWidget.element) {
                soundAlertWidget.element.style.display = "none";
              }
              soundAlertWidget.computeSize = () => [0, -4];
              soundAlertWidget.draw = function() {};
            }
          }
          
          // 2. Delimiter widgets visibility
          const count = numDelimWidget ? (parseInt(numDelimWidget.value) || 0) : 0;
          for (let i = 1; i <= 20; i++) {
            const startW = node.widgets?.find(w => w.name === `starting_delimiter_${i}`);
            const endW = node.widgets?.find(w => w.name === `ending_delimiter_${i}`);
            
            if (startW) {
              if (i <= count) {
                if (startW.type === "converted-widget") {
                  startW.type = startW.original_type || "STRING";
                }
                if (startW.element) {
                  startW.element.style.display = "";
                }
                delete startW.computeSize;
                delete startW.draw;
              } else {
                if (startW.type !== "converted-widget") {
                  startW.original_type = startW.type;
                  startW.type = "converted-widget";
                }
                if (startW.element) {
                  startW.element.style.display = "none";
                }
                startW.computeSize = () => [0, -4];
                startW.draw = function() {};
              }
            }
            
            if (endW) {
              if (i <= count) {
                if (endW.type === "converted-widget") {
                  endW.type = endW.original_type || "STRING";
                }
                if (endW.element) {
                  endW.element.style.display = "";
                }
                delete endW.computeSize;
                delete endW.draw;
              } else {
                if (endW.type !== "converted-widget") {
                  endW.original_type = endW.type;
                  endW.type = "converted-widget";
                }
                if (endW.element) {
                  endW.element.style.display = "none";
                }
                endW.computeSize = () => [0, -4];
                endW.draw = function() {};
              }
            }
          }
          
          // Update outputs dynamically (Autogrow)
          updateDelimiterOutputs(count);
          
          // ComfyUI V2 handles minimum sizing via computeLayoutSize automatically.

          // Manual DOM resizing removed. Sizing is controlled by computeSize and CSS height/width: 100%.
          
          if (node.graph) {
            node.graph.setDirtyCanvas(true, true);
          }
        };
        
        setTimeout(() => {
          const modeWidget = node.widgets?.find(w => w && w.name === "mode");
          if (modeWidget) {
            const originalCallback = modeWidget.callback;
            modeWidget.callback = function() {
              const res = originalCallback ? originalCallback.apply(this, arguments) : undefined;
              updateNodeLayout();
              return res;
            };
          }
          
          const numDelimWidget = node.widgets?.find(w => w && w.name === "number_of_delimiters");
          if (numDelimWidget) {
            const originalCallback = numDelimWidget.callback;
            numDelimWidget.callback = function() {
              const res = originalCallback ? originalCallback.apply(this, arguments) : undefined;
              updateNodeLayout();
              return res;
            };
          }
          
          updateNodeLayout();

          // Auto heal size on load if it's excessively large
          if (node.size && node.size[1] > 800) {
            node.setSize([380, 580]);
          }
        }, 100);
        
        const originalConfigure = node.onConfigure;
        node.onConfigure = function(data) {
          const res = originalConfigure ? originalConfigure.apply(this, arguments) : undefined;
          
          if (data && data.widgets_values) {
            const vals = data.widgets_values;
            let loadedHistoryVal = null;
            let loadedModeVal = null;
            let loadedSoundAlertVal = null;
            let loadedNumDelimitersVal = null;
            
            vals.forEach(val => {
              if (typeof val === "boolean") {
                loadedSoundAlertVal = val;
              } else if (typeof val === "number") {
                loadedNumDelimitersVal = val;
              } else if (typeof val === "string") {
                const trimmed = val.trim();
                if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
                  loadedHistoryVal = val;
                } else if (["Interactive Chat (Pause)", "One-Shot Prompt", "Pass Last Output (Bypass)"].includes(val)) {
                  loadedModeVal = val;
                }
              }
            });
            
            if (loadedHistoryVal !== null) {
              const chatWidget = (node.widgets || []).find(w => w && w.name === "ui_widget");
              if (chatWidget) {
                chatWidget.value = loadedHistoryVal;
                if (node.chatbotUI) {
                  node.chatbotUI.setValue(loadedHistoryVal);
                }
              }
            }
            if (loadedModeVal !== null) {
              const modeWidget = (node.widgets || []).find(w => w && w.name === "mode");
              if (modeWidget) {
                modeWidget.value = loadedModeVal;
              }
            }
            if (loadedSoundAlertVal !== null) {
              const soundAlertWidget = (node.widgets || []).find(w => w && w.name === "sound_alert");
              if (soundAlertWidget) {
                soundAlertWidget.value = loadedSoundAlertVal;
              }
            }
            if (loadedNumDelimitersVal !== null) {
              const numDelimWidget = (node.widgets || []).find(w => w && w.name === "number_of_delimiters");
              if (numDelimWidget) {
                numDelimWidget.value = loadedNumDelimitersVal;
              }
            }
            
            // Clean up shifted values if they got corrupted
            const numDelimWidget = (node.widgets || []).find(w => w && w.name === "number_of_delimiters");
            if (numDelimWidget) {
              const numVal = parseInt(numDelimWidget.value);
              if (isNaN(numVal) || numVal < 1 || numVal > 20) {
                numDelimWidget.value = 1;
              } else {
                numDelimWidget.value = numVal;
              }
            }
            
            for (let i = 1; i <= 20; i++) {
              const startW = (node.widgets || []).find(w => w && w.name === `starting_delimiter_${i}`);
              const endW = (node.widgets || []).find(w => w && w.name === `ending_delimiter_${i}`);
              if (startW && (typeof startW.value !== "string" || startW.value.trim().startsWith("{") || startW.value.trim().startsWith("["))) {
                startW.value = `<prompt_${i}>`;
              }
              if (endW && (typeof endW.value !== "string" || endW.value.trim().startsWith("{") || endW.value.trim().startsWith("["))) {
                endW.value = `</prompt_${i}>`;
              }
            }
          }
          
          updateNodeLayout();

          // Auto heal size on load if it's excessively large
          if (node.size && node.size[1] > 800) {
            node.setSize([380, 580]);
          }
          
          return res;
        };
        
        return r;
      };
    }
  }
});
