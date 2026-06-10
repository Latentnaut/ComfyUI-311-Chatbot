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

const undoSvg = `
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 7v6h6"></path>
    <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"></path>
  </svg>
`;

const checkSvg = `
  <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="#10b981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
`;

const editPenSvg = `
  <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 20h9"></path>
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
  </svg>
`;

// Inject CSS stylesheet dynamically
const link = document.createElement("link");
link.rel = "stylesheet";
link.href = "/extensions/ComfyUI-311-Chatbot/css/chatbot.css";
document.head.appendChild(link);

function unescapeHtml(html) {
  if (!html) return "";
  return html
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

// Simple Markdown to HTML parser
function parseMarkdown(text, delimiters = []) {
  if (!text) return "";
  
  // 1. Extract fenced code blocks from raw text before escaping HTML
  const codeBlocks = [];
  let html = text.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
    const id = `__CODE_BLOCK_${codeBlocks.length}__`;
    const rawCode = code.trim();
    // Escape for HTML rendering only
    const escapedCodeForHtml = rawCode
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
      
    // SINGLE LINE template string to avoid white-space rendering issues in pre-wrap
    codeBlocks.push(`<div class="chatbot311-codeblock-container"><pre><code class="language-${lang}">${escapedCodeForHtml}</code></pre><button class="chatbot311-codeblock-copy-btn" data-raw-prompt="${encodeURIComponent(rawCode)}" title="Copy code">${copySvg}</button></div>`);
    return id;
  });
  
  // 2. Escape HTML entities on the rest of the text
  html = html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
    
  // 3. Inline code
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  
  // 4. Wrap custom delimiters in code blocks
  const customDelimBlocks = [];
  if (delimiters && delimiters.length > 0) {
    delimiters.forEach(d => {
      // Escape delimiter html tags for regex matching
      const escapedStartHtml = d.start.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const escapedEndHtml = d.end.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      
      const escapedStartHtmlRegex = escapedStartHtml.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const escapedEndHtmlRegex = escapedEndHtml.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');

      const regex = new RegExp(escapedStartHtmlRegex + '([\\s\\S]*?)' + escapedEndHtmlRegex, 'gm');
      html = html.replace(regex, (match, content) => {
        const id = `__CUSTOM_DELIM_${customDelimBlocks.length}__`;
        const rawContent = unescapeHtml(content.trim());
        // SINGLE LINE template string to avoid white-space rendering issues in pre-wrap
        customDelimBlocks.push(`<div class="chatbot311-codeblock-container"><pre><code class="language-text">${escapedStartHtml}\n${content.trim()}\n${escapedEndHtml}</code></pre><button class="chatbot311-codeblock-copy-btn" data-raw-prompt="${encodeURIComponent(rawContent)}" title="Copy prompt only (without tags)">${copySvg}</button></div>`);
        return id;
      });
    });
  }
  
  // 5. Statefully process lines for headers, lists, and paragraphs
  const lines = html.split('\n');
  let inBulletList = false;
  let inNumberedList = false;
  const processedLines = [];
  
  function cleanTrailingNewlines() {
    if (processedLines.length > 0) {
      const lastIdx = processedLines.length - 1;
      if (processedLines[lastIdx] === '\n') {
        processedLines.pop();
      } else if (processedLines[lastIdx].endsWith('\n')) {
        processedLines[lastIdx] = processedLines[lastIdx].slice(0, -1);
      }
    }
  }
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Skip if it's a code block or custom delimiter placeholder
    if ((trimmed.startsWith('__CODE_BLOCK_') && trimmed.endsWith('__')) ||
        (trimmed.startsWith('__CUSTOM_DELIM_') && trimmed.endsWith('__'))) {
      if (inBulletList) { processedLines.push('</ul>'); inBulletList = false; }
      if (inNumberedList) { processedLines.push('</ol>'); inNumberedList = false; }
      cleanTrailingNewlines();
      processedLines.push(line); // No trailing newline for block tags
      continue;
    }
    
    // Headers
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      if (inBulletList) { processedLines.push('</ul>'); inBulletList = false; }
      if (inNumberedList) { processedLines.push('</ol>'); inNumberedList = false; }
      cleanTrailingNewlines();
      const level = headerMatch[1].length;
      processedLines.push(`<h${level} class="chatbot311-h${level}">${headerMatch[2]}</h${level}>`); // No trailing newline for block tags
      continue;
    }
    
    // Bullet list items
    const bulletMatch = line.match(/^\s*[-*+]\s+(.+)$/);
    if (bulletMatch) {
      if (inNumberedList) { processedLines.push('</ol>'); inNumberedList = false; }
      if (!inBulletList) { 
        cleanTrailingNewlines();
        processedLines.push('<ul class="chatbot311-list-ul">'); 
        inBulletList = true; 
      }
      processedLines.push(`<li>${bulletMatch[1]}</li>`); // No trailing newline for block tags
      continue;
    }
    
    // Numbered list items
    const numberedMatch = line.match(/^\s*(\d+)\.\s+(.+)$/);
    if (numberedMatch) {
      if (inBulletList) { processedLines.push('</ul>'); inBulletList = false; }
      if (!inNumberedList) { 
        cleanTrailingNewlines();
        processedLines.push('<ol class="chatbot311-list-ol">'); 
        inNumberedList = true; 
      }
      processedLines.push(`<li>${numberedMatch[2]}</li>`); // No trailing newline for block tags
      continue;
    }
    
    // Blockquotes (markdown > )
    const quoteMatch = line.match(/^\s*(?:&gt;|>)\s+(.+)$/);
    if (quoteMatch) {
      if (inBulletList) { processedLines.push('</ul>'); inBulletList = false; }
      if (inNumberedList) { processedLines.push('</ol>'); inNumberedList = false; }
      cleanTrailingNewlines();
      processedLines.push(`<blockquote class="chatbot311-blockquote">${quoteMatch[1]}</blockquote>`);
      continue;
    }
    
    // Empty line
    if (trimmed === '') {
      if (!inBulletList && !inNumberedList) {
        if (processedLines.length > 0) {
          const last = processedLines[processedLines.length - 1];
          // Only add newline if previous line didn't end in block tag or newline
          if (!last.endsWith('\n') && 
              !last.startsWith('<h') && 
              !last.startsWith('</ul') && 
              !last.startsWith('</ol') && 
              !last.startsWith('<pre') && 
              !last.startsWith('</pre>') && 
              !last.startsWith('<blockquote') && 
              !last.startsWith('</blockquote>')) {
            processedLines.push('\n');
          }
        }
      }
      continue;
    }
    
    // Standard text line
    if (inBulletList) { processedLines.push('</ul>'); inBulletList = false; }
    if (inNumberedList) { processedLines.push('</ol>'); inNumberedList = false; }
    processedLines.push(line + '\n'); // Keep natural trailing newline
  }
  
  if (inBulletList) processedLines.push('</ul>');
  if (inNumberedList) processedLines.push('</ol>');
  
  html = processedLines.join('');
  
  // 6. Bold and Italic
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  
  // Clean up any newlines adjacent to codeblocks, headers, and lists
  // to prevent extra visual whitespace/empty lines in pre-wrap rendering
  html = html
    .replace(/\n+(__CODE_BLOCK_\d+__)/g, "$1")
    .replace(/(__CODE_BLOCK_\d+__)\n+/g, "$1")
    .replace(/\n+(__CUSTOM_DELIM_\d+__)/g, "$1")
    .replace(/(__CUSTOM_DELIM_\d+__)\n+/g, "$1")
    .replace(/\n+(<h[1-6]\b)/g, "$1")
    .replace(/(<\/h[1-6]>)\n+/g, "$1")
    .replace(/\n+(<ul\b)/g, "$1")
    .replace(/(<\/ul>)\n+/g, "$1")
    .replace(/\n+(<\/ul>)/g, "$1")
    .replace(/\n+(<ol\b)/g, "$1")
    .replace(/(<\/ol>)\n+/g, "$1")
    .replace(/\n+(<\/ol>)/g, "$1");
  
  // 7. Restore placeholders
  codeBlocks.forEach((block, idx) => {
    html = html.replace(`__CODE_BLOCK_${idx}__`, block);
  });
  
  customDelimBlocks.forEach((block, idx) => {
    html = html.replace(`__CUSTOM_DELIM_${idx}__`, block);
  });
  
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
  
  // Case 1: Standard LoadImage or custom loader nodes (e.g. check widgets for image filename)
  const imageWidget = originNode.widgets ? originNode.widgets.find(w => w.name === "image" || w.name === "image_path" || w.name === "file_name") : null;
  if (imageWidget && imageWidget.value && typeof imageWidget.value === "string") {
    const val = imageWidget.value.toLowerCase();
    if (val.endsWith(".png") || val.endsWith(".jpg") || val.endsWith(".jpeg") || val.endsWith(".webp") || val.endsWith(".gif")) {
      const type = originNode.type === "LoadImage" || originNode.comfyClass === "LoadImage" ? "input" : "output";
      imagesToFetch.push({
        filename: imageWidget.value,
        url: api.apiURL(`/view?filename=${encodeURIComponent(imageWidget.value)}&type=${type}`)
      });
    }
  }
  
  // Case 2: Node outputs from app.node_outputs (results of the last execution)
  const nodeOutputs = app.node_outputs?.[originNode.id];
  if (imagesToFetch.length === 0 && nodeOutputs && nodeOutputs.images && nodeOutputs.images.length > 0) {
    nodeOutputs.images.forEach((img, idx) => {
      imagesToFetch.push({
        filename: img.filename || `output_${idx}.png`,
        url: api.apiURL(`/view?filename=${encodeURIComponent(img.filename)}&type=${img.type || "output"}&subfolder=${encodeURIComponent(img.subfolder || "")}`)
      });
    });
  }
  
  // Case 3: Output images on the node object itself
  if (imagesToFetch.length === 0 && originNode.images && originNode.images.length > 0) {
    originNode.images.forEach((img, idx) => {
      imagesToFetch.push({
        filename: img.filename || `output_${idx}.png`,
        url: api.apiURL(`/view?filename=${encodeURIComponent(img.filename)}&type=${img.type || "output"}&subfolder=${encodeURIComponent(img.subfolder || "")}`)
      });
    });
  }
  
  // Case 4: Preview images (.imgs property)
  if (imagesToFetch.length === 0 && originNode.imgs && originNode.imgs.length > 0) {
    originNode.imgs.forEach((img, idx) => {
      let src = img.src;
      if (src && !src.startsWith("blob:") && !src.startsWith("data:") && !src.startsWith("http")) {
        src = api.apiURL(src);
      }
      imagesToFetch.push({
        filename: `preview_${idx}.png`,
        url: src
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
    this.undoStack = [];
    this.undoBtn = null;
    
    this.buildUI();
    this.setupEventListeners();
    this.checkAPIStatus();
    this.fetchDefaultSystemPrompt();
    this.fetchConversations();
    this.checkPausedStatus();
    
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
          <button class="chatbot311-btn-undo" id="btn-undo" title="Undo" style="display: none;">${undoSvg}</button>
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
    this.undoBtn = this.container.querySelector("#btn-undo");
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
    
    if (this.undoBtn) {
      this.undoBtn.addEventListener("click", () => this.undoLastAction());
    }
    
    // Code block copy delegation click handler
    this.messagesContainer.addEventListener("click", (e) => {
      const copyBtn = e.target.closest(".chatbot311-codeblock-copy-btn");
      if (copyBtn) {
        const rawPrompt = decodeURIComponent(copyBtn.getAttribute("data-raw-prompt") || "");
        if (rawPrompt) {
          navigator.clipboard.writeText(rawPrompt);
          copyBtn.innerHTML = checkSvg;
          copyBtn.classList.add("copied");
          setTimeout(() => {
            copyBtn.innerHTML = copySvg;
            copyBtn.classList.remove("copied");
          }, 1500);
        }
      }
    });
    
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
        this.updateNodeValue();
        this.saveActiveConversation();
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

    api.addEventListener("chatbot311-show-typing", (event) => {
      const { node_id, show } = event.detail;
      if (String(node_id) === String(this.node.id)) {
        this.showTypingIndicator(show);
      }
    });

    // Global paste handler: paste clipboard images when the node is selected
    this._globalPasteHandler = (e) => {
      const isSelected = app.canvas?.selected_nodes && app.canvas.selected_nodes[this.node.id] !== undefined;
      if (!isSelected) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      let hasImages = false;
      for (const item of items) {
        if (item.type.indexOf("image") !== -1) {
          const file = item.getAsFile();
          if (file) {
            hasImages = true;
            this.processFile(file);
          }
        }
      }

      if (hasImages) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("paste", this._globalPasteHandler);

    this._selectionChangeHandler = () => {
      const selection = window.getSelection();
      const selectedText = selection.toString().trim();
      
      if (selectedText) {
        let node = selection.anchorNode;
        let insideAssistantMessage = false;
        while (node) {
          if (node.classList && node.classList.contains("chatbot311-message") && node.classList.contains("assistant")) {
            insideAssistantMessage = true;
            break;
          }
          node = node.parentNode;
        }
        
        if (insideAssistantMessage) {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          this.showFloatingQuoteButton(rect, selectedText);
          return;
        }
      }
      
      this.hideFloatingQuoteButton();
    };
    document.addEventListener("selectionchange", this._selectionChangeHandler);
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
      const apiKeyWidget = this.node.widgets?.find(w => w && w.name === "api_key");
      const apiKey = apiKeyWidget ? (apiKeyWidget.value || "").trim() : "";
      const headers = {};
      if (apiKey) {
        headers["X-Gemini-API-Key"] = apiKey;
      }
      
      const response = await fetch("/chatbot-311/proxy/gemini", { headers });
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

  async checkPausedStatus() {
    try {
      const response = await fetch(`/chatbot-311/chat/paused-status/${this.node.id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.paused) {
          if (this.confirmBanner) {
            this.confirmBanner.style.display = "flex";
          }
        }
      }
    } catch (e) {
      console.warn("Failed to check paused status:", e);
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
        this.undoStack = [];
        this.updateUndoButtonVisibility();
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
    this.undoStack = [];
    this.updateUndoButtonVisibility();
    this.renderMessages();
    this.updateNodeValue();
    this.container.classList.remove("sidebar-open");
    this.fetchConversations();
  }
  
  getConnectedInputValue(inputName) {
    const inputIdx = this.node.inputs ? this.node.inputs.findIndex(input => input.name === inputName) : -1;
    if (inputIdx === -1) return null;
    
    const linkId = this.node.inputs[inputIdx].link;
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

    // Check connected system prompts
    const sysGeneral = this.getConnectedInputValue("system_general") || this.getConnectedInputValue("system");
    const sysVariable = this.getConnectedInputValue("system_variable");
    const badgeSystem = this.container.querySelector("#badge-system");
    
    if (sysGeneral !== null || sysVariable !== null) {
      const parts = [];
      if (sysGeneral !== null) parts.push(`General: "${sysGeneral.slice(0, 50)}..."`);
      if (sysVariable !== null) parts.push(`Variable: "${sysVariable.slice(0, 50)}..."`);
      const tooltip = "Connected system prompt(s):\n" + parts.join("\n");
      
      const newSystemKey = (sysGeneral || "") + "|||" + (sysVariable || "");
      if (this.connectedSystemPrompt !== newSystemKey) {
        this.connectedSystemPrompt = newSystemKey;
        badgeSystem.style.display = "inline-block";
        badgeSystem.title = tooltip;
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
    textSpan.innerHTML = parseMarkdown(text, this.getDelimiters());
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
        copyBtn.innerHTML = checkSvg;
        copyBtn.classList.add("copied");
        setTimeout(() => {
          copyBtn.innerHTML = copySvg;
          copyBtn.classList.remove("copied");
        }, 1500);
      });
      toolbar.appendChild(copyBtn);
      
      const reuseBtn = document.createElement("button");
      reuseBtn.className = "chatbot311-msg-btn";
      reuseBtn.innerHTML = editPenSvg;
      reuseBtn.title = "Reuse message (deletes subsequent)";
      reuseBtn.addEventListener("click", () => {
        this.reuseMessage(index);
      });
      toolbar.appendChild(reuseBtn);
      
      const delBtn = document.createElement("button");
      delBtn.className = "chatbot311-msg-btn delete";
      delBtn.innerHTML = xSvg;
      delBtn.title = "Delete message";
      delBtn.addEventListener("click", () => {
        if (confirm("Are you sure you want to delete this message?")) {
          this.deleteMessage(index);
        }
      });
      toolbar.appendChild(delBtn);
      
      bubble.appendChild(toolbar);
    }
    
    return bubble;
  }
  
  scrollBottom() {
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    setTimeout(() => {
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }, 50);
    setTimeout(() => {
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }, 300);
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
    let activeSystemPrompt = this.connectedSystemPrompt || this.defaultSystemPrompt;

    // Read active delimiters from node widgets to inject into Gemini system instructions
    const delimitersInfo = [];
    const numDelimWidget = this.node.widgets?.find(w => w && w.name === "number_of_delimiters");
    const count = numDelimWidget ? (parseInt(numDelimWidget.value) || 0) : 0;
    for (let i = 1; i <= count; i++) {
      const startW = this.node.widgets?.find(w => w && w.name === `starting_delimiter_${i}`);
      const endW = this.node.widgets?.find(w => w && w.name === `ending_delimiter_${i}`);
      if (startW && endW) {
        delimitersInfo.push({
          index: i,
          start: startW.value,
          end: endW.value
        });
      }
    }

    if (delimitersInfo.length > 0) {
      activeSystemPrompt = (activeSystemPrompt || "").trim() + 
        "\n\n### IMPORTANT: ACTIVE OUTPUT DELIMITERS\n" +
        "If the user asks you to write, generate, or output a specific prompt, text, code, or JSON that they want to extract, you MUST enclose the final clean copy-pasteable output at the very end of your response using these exact delimiters (without markdown code blocks around the delimiters themselves):\n" +
        delimitersInfo.map(d => `- Delimiter ${d.index}: Wrap the final output between '${d.start}' and '${d.end}'`).join("\n") +
        "\n\nExample of final output format:\n" +
        `${delimitersInfo[0].start}\n(Your generated prompt/output here)\n${delimitersInfo[0].end}`;
    }

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

    // Ensure the latest user message in apiMessages has the image if present in earlier messages,
    // because Gemini's OpenAI-compatible API ignores images in past history.
    if (apiMessages.length > 0) {
      const lastMsg = apiMessages[apiMessages.length - 1];
      if (lastMsg.role === "user") {
        let hasImage = false;
        if (Array.isArray(lastMsg.content)) {
          hasImage = lastMsg.content.some(part => part.type === "image_url");
        }
        
        if (!hasImage) {
          // Find the most recent image in the conversation history
          let foundImages = [];
          for (let i = apiMessages.length - 2; i >= 0; i--) {
            const msg = apiMessages[i];
            if (msg.role === "user" && Array.isArray(msg.content)) {
              const imgs = msg.content.filter(part => part.type === "image_url");
              if (imgs.length > 0) {
                foundImages = imgs;
                break;
              }
            }
          }
          
          if (foundImages.length > 0) {
            // Convert lastMsg.content to array if it is a string
            if (typeof lastMsg.content === "string") {
              lastMsg.content = [{ type: "text", text: lastMsg.content }];
            }
            // Append the found images
            lastMsg.content = [...lastMsg.content, ...foundImages];
          }
        }
      }
    }
    
    try {
      const apiKeyWidget = this.node.widgets?.find(w => w && w.name === "api_key");
      const apiKey = apiKeyWidget ? (apiKeyWidget.value || "").trim() : "";
      const headers = { "Content-Type": "application/json" };
      if (apiKey) {
        headers["X-Gemini-API-Key"] = apiKey;
      }
      
      const response = await fetch("/chatbot-311/proxy/gemini/v1/chat/completions", {
        method: "POST",
        headers: headers,
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
              textSpan.innerHTML = parseMarkdown(accumulated, this.getDelimiters());
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
  
  saveUndoState() {
    if (!this.undoStack) this.undoStack = [];
    this.undoStack.push(JSON.stringify(this.history));
    if (this.undoStack.length > 10) this.undoStack.shift();
    this.updateUndoButtonVisibility();
  }

  undoLastAction() {
    if (!this.undoStack || this.undoStack.length === 0) return;
    const previousState = this.undoStack.pop();
    this.history = JSON.parse(previousState);
    this.renderMessages();
    this.updateNodeValue();
    this.saveActiveConversation();
    this.updateUndoButtonVisibility();
  }

  updateUndoButtonVisibility() {
    if (this.undoBtn) {
      this.undoBtn.style.display = this.undoStack && this.undoStack.length > 0 ? "flex" : "none";
    }
  }

  reuseMessage(idx) {
    if (confirm("Are you sure you want to reuse this message? All subsequent messages will be deleted.")) {
      this.saveUndoState();
      const msg = this.history[idx];
      let text = "";
      if (Array.isArray(msg.content)) {
        const textPart = msg.content.find(p => p.type === "text");
        text = textPart ? textPart.text : "";
      } else {
        text = msg.content || "";
      }
      
      if (msg.role === "user") {
        this.textarea.value = text;
        this.textarea.style.height = "auto";
        this.textarea.style.height = (this.textarea.scrollHeight) + "px";
      }
      
      this.history = this.history.slice(0, idx + 1);
      this.renderMessages();
      this.updateNodeValue();
      this.saveActiveConversation();
    }
  }

  deleteMessage(idx) {
    this.saveUndoState();
    this.history.splice(idx, 1);
    this.renderMessages();
    this.updateNodeValue();
    this.saveActiveConversation();
  }
  
  clearChat() {
    if (this.history.length === 0) return;
    if (!confirm("Are you sure you want to clear this conversation?")) return;
    
    this.saveUndoState();
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
  
  getDelimiters() {
    const delimiters = [];
    const numDelimWidget = this.node.widgets?.find(w => w && w.name === "number_of_delimiters");
    const count = numDelimWidget ? (parseInt(numDelimWidget.value) || 0) : 0;
    for (let i = 1; i <= count; i++) {
      const startW = this.node.widgets?.find(w => w && w.name === `starting_delimiter_${i}`);
      const endW = this.node.widgets?.find(w => w && w.name === `ending_delimiter_${i}`);
      if (startW && endW) {
        delimiters.push({
          start: startW.value,
          end: endW.value
        });
      }
    }
    return delimiters;
  }

  showFloatingQuoteButton(rect, text) {
    if (!this.floatingQuoteBtn) {
      this.floatingQuoteBtn = document.createElement("button");
      this.floatingQuoteBtn.className = "chatbot311-floating-quote-btn";
      this.floatingQuoteBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px; vertical-align: middle;">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        <span>Citar</span>
      `;
      this.floatingQuoteBtn.addEventListener("mousedown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const activeText = this.floatingQuoteBtn.getAttribute("data-text") || text;
        this.quoteText(activeText);
        this.hideFloatingQuoteButton();
        window.getSelection().removeAllRanges();
      });
      document.body.appendChild(this.floatingQuoteBtn);
    }
    
    const btnWidth = 70;
    const btnHeight = 28;
    const left = rect.left + (rect.width / 2) - (btnWidth / 2) + window.scrollX;
    const top = rect.top - btnHeight - 8 + window.scrollY;
    
    this.floatingQuoteBtn.style.left = `${left}px`;
    this.floatingQuoteBtn.style.top = `${top}px`;
    this.floatingQuoteBtn.style.display = "flex";
    this.floatingQuoteBtn.setAttribute("data-text", text);
  }
  
  hideFloatingQuoteButton() {
    if (this.floatingQuoteBtn) {
      this.floatingQuoteBtn.style.display = "none";
    }
  }
  
  quoteText(text) {
    const quoteStr = `> ${text}\n\n`;
    const cursor = this.textarea.selectionStart;
    const currentVal = this.textarea.value;
    
    this.textarea.value = currentVal.slice(0, cursor) + quoteStr + currentVal.slice(cursor);
    
    this.textarea.style.height = "auto";
    this.textarea.style.height = (this.textarea.scrollHeight) + "px";
    
    setTimeout(() => {
      this.textarea.focus();
      const newCursor = cursor + quoteStr.length;
      this.textarea.setSelectionRange(newCursor, newCursor);
    }, 20);
  }
  
  destroy() {
    clearInterval(this.connectionCheckInterval);
    if (this._globalPasteHandler) {
      window.removeEventListener("paste", this._globalPasteHandler);
    }
    if (this._selectionChangeHandler) {
      document.removeEventListener("selectionchange", this._selectionChangeHandler);
    }
    if (this.floatingQuoteBtn) {
      this.floatingQuoteBtn.remove();
    }
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
        
        if (!node.size || node.size[0] < 200 || node.size[1] < 200) {
          node.size = [380, 580];
          if (node.setSize) {
            node.setSize([380, 580]);
          }
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
      nodeType.canvasOnly = true; // Force classic canvas rendering for compatibility with Nodes 2.0
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
            if (soundAlertWidget.type === "converted-widget") {
              soundAlertWidget.type = soundAlertWidget.original_type || "BOOLEAN";
            }
            if (isInteractive) {
              if (soundAlertWidget.element) {
                soundAlertWidget.element.style.display = "";
              }
              delete soundAlertWidget.computeSize;
              delete soundAlertWidget.draw;
            } else {
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
              if (startW.type === "converted-widget") {
                startW.type = startW.original_type || "STRING";
              }
              if (i <= count) {
                if (startW.element) {
                  startW.element.style.display = "";
                }
                delete startW.computeSize;
                delete startW.draw;
              } else {
                if (startW.element) {
                  startW.element.style.display = "none";
                }
                startW.computeSize = () => [0, -4];
                startW.draw = function() {};
              }
            }
            
            if (endW) {
              if (endW.type === "converted-widget") {
                endW.type = endW.original_type || "STRING";
              }
              if (i <= count) {
                if (endW.element) {
                  endW.element.style.display = "";
                }
                delete endW.computeSize;
                delete endW.draw;
              } else {
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
          
          const apiKeyWidget = node.widgets?.find(w => w && w.name === "api_key");
          if (apiKeyWidget) {
            const originalCallback = apiKeyWidget.callback;
            apiKeyWidget.callback = function() {
              const res = originalCallback ? originalCallback.apply(this, arguments) : undefined;
              if (node.chatbotUI) {
                node.chatbotUI.checkAPIStatus();
              }
              return res;
            };
          }
          
          updateNodeLayout();

          // Auto heal size on load if it's excessively large (e.g. runaway layout corruption)
          if (node.size && node.size[1] > 3000) {
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
            let loadedSeedVal = null;
            let numberCount = 0;
            
            vals.forEach(val => {
              if (typeof val === "boolean") {
                loadedSoundAlertVal = val;
              } else if (typeof val === "number") {
                if (numberCount === 0) {
                  loadedNumDelimitersVal = val;
                } else {
                  loadedSeedVal = val;
                }
                numberCount++;
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
            if (loadedSeedVal !== null) {
              const seedWidget = (node.widgets || []).find(w => w && w.name === "seed");
              if (seedWidget) {
                seedWidget.value = loadedSeedVal;
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
              
              if (startW) {
                const val = String(startW.value || "").trim();
                if (!val || 
                    val.startsWith("{") || 
                    val.startsWith("[") || 
                    val === "Interactive Chat (Pause)" || 
                    val === "One-Shot Prompt" || 
                    val === "Pass Last Output (Bypass)" || 
                    val === "true" || 
                    val === "false") {
                  startW.value = `<prompt_${i}>`;
                }
              }
              
              if (endW) {
                const val = String(endW.value || "").trim();
                if (!val || 
                    val.startsWith("{") || 
                    val.startsWith("[") || 
                    val === "Interactive Chat (Pause)" || 
                    val === "One-Shot Prompt" || 
                    val === "Pass Last Output (Bypass)" || 
                    val === "true" || 
                    val === "false") {
                  endW.value = `</prompt_${i}>`;
                }
              }
            }
          }
          
          updateNodeLayout();

          if (node.chatbotUI) {
            node.chatbotUI.checkAPIStatus();
          }

          // Auto heal size on load if it's excessively large (e.g. runaway layout corruption)
          if (node.size && node.size[1] > 3000) {
            node.setSize([380, 580]);
          }
          
          return res;
        };
        
        return r;
      };
    }
  }
});
