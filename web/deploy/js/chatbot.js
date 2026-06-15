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

const searchSvg = `
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
`;

const chevronUpSvg = `
  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="18 15 12 9 6 15"></polyline>
  </svg>
`;

const chevronDownSvg = `
  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="6 9 12 15 18 9"></polyline>
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

async function getFirebaseIndexedDBToken() {
    return new Promise((resolve) => {
        try {
            const request = indexedDB.open("firebaseLocalStorageDb");
            request.onsuccess = (event) => {
                const db = event.target.result;
                try {
                    const transaction = db.transaction(["firebaseLocalStorage"], "readonly");
                    const store = transaction.objectStore("firebaseLocalStorage");
                    const getAllRequest = store.getAll();
                    getAllRequest.onsuccess = () => {
                        const records = getAllRequest.result;
                        for (const record of records || []) {
                            if (record && record.value && record.value.stsTokenManager && record.value.stsTokenManager.accessToken) {
                                resolve(record.value.stsTokenManager.accessToken);
                                return;
                            }
                        }
                        resolve(null);
                    };
                    getAllRequest.onerror = () => resolve(null);
                } catch (e) {
                    resolve(null);
                }
            };
            request.onerror = () => resolve(null);
        } catch (e) {
            resolve(null);
        }
    });
}


const editPenSvg = `
  <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 20h9"></path>
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
  </svg>
`;

const warningSvg = `
  <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
    <line x1="12" y1="9" x2="12" y2="13"></line>
    <line x1="12" y1="17" x2="12.01" y2="17"></line>
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
        
        let highlightedContent = content.trim();
        // Highlight Image N, ImageN, Image 1, Image1, etc. in bold and blue
        highlightedContent = highlightedContent.replace(/\b(Image\s*(?:\d+|N))\b/gi, '<span class="chatbot311-delim-image">$1</span>');
        
        // Highlight JSON keys inside prompt blocks
        // 1. Sublevel keys (4+ spaces/tabs) -> bold white
        highlightedContent = highlightedContent.replace(/^([ \t]{4,8})"([^"]+)"\s*:/gm, '$1"<span class="chatbot311-json-key-sub">$2</span>":');
        // 2. First-level keys (1-3 spaces/tabs) -> bold orange
        highlightedContent = highlightedContent.replace(/^([ \t]{1,3})"([^"]+)"\s*:/gm, '$1"<span class="chatbot311-json-key-main">$2</span>":');

        // SINGLE LINE template string to avoid white-space rendering issues in pre-wrap
        customDelimBlocks.push(`<div class="chatbot311-codeblock-container"><pre><code class="language-text"><span class="chatbot311-delim-tag">${escapedStartHtml}</span>\n${highlightedContent}\n<span class="chatbot311-delim-tag">${escapedEndHtml}</span></code></pre><button class="chatbot311-codeblock-copy-btn" data-raw-prompt="${encodeURIComponent(rawContent)}" title="Copy prompt only (without tags)">${copySvg}</button></div>`);
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
    this.lastUsedModel = "gemini-3.5-flash";
    
    this.buildUI();
    this.setupEventListeners();
    this.checkAPIStatus();
    this.fetchDefaultSystemPrompt();
    this.fetchConversations();
    this.checkPausedStatus();
    this.updateInputAreaVisibility();
    
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
          <button class="chatbot311-btn-search" id="btn-search-toggle" title="Search">${searchSvg}</button>
          <button class="chatbot311-btn-clear" id="btn-clear" title="Clear Conversation">${trashSvg}</button>
        </div>
      </div>
      
      <!-- Search Bar -->
      <div class="chatbot311-search-bar" id="search-bar" style="display: none;">
        <input type="text" class="chatbot311-search-input" placeholder="Search..." id="txt-search" autocomplete="off" />
        <span class="chatbot311-search-count" id="search-count">0/0</span>
        <button class="chatbot311-search-btn" id="btn-search-prev" title="Previous">${chevronUpSvg}</button>
        <button class="chatbot311-search-btn" id="btn-search-next" title="Next">${chevronDownSvg}</button>
        <button class="chatbot311-search-btn" id="btn-search-close" title="Close">${xSvg}</button>
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
    
    // Search elements
    this.searchToggleBtn = this.container.querySelector("#btn-search-toggle");
    this.searchBar = this.container.querySelector("#search-bar");
    this.searchInput = this.container.querySelector("#txt-search");
    this.searchPrevBtn = this.container.querySelector("#btn-search-prev");
    this.searchNextBtn = this.container.querySelector("#btn-search-next");
    this.searchCloseBtn = this.container.querySelector("#btn-search-close");

    // Input area adjust resizer
    this.inputArea = this.container.querySelector(".chatbot311-input-area");
    if (this.inputArea) {
      const resizer = document.createElement("div");
      resizer.className = "chatbot311-input-resizer";
      resizer.id = "input-resizer";
      resizer.title = "Adjust height (Double-click to reset)";
      this.inputArea.appendChild(resizer);
    }
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
      if (!this.isTextareaResized) {
        this.textarea.style.height = "auto";
        this.textarea.style.height = (this.textarea.scrollHeight) + "px";
      }
    });

    this.textarea.addEventListener("blur", () => {
      this.updateNodeValue(true);
    });

    // Setup input area drag-to-resize height logic
    const resizer = this.container.querySelector("#input-resizer");
    if (resizer && this.textarea && this.inputArea) {
      let isDragging = false;
      let startY = 0;
      let startHeight = 0;

      const onMouseMove = (e) => {
        if (!isDragging) return;
        const dy = startY - e.clientY;
        let newHeight = startHeight + dy;
        if (newHeight < 56) newHeight = 56;
        if (newHeight > 500) newHeight = 500;
        this.textarea.style.height = newHeight + "px";
        this.isTextareaResized = true;
        
        // Keep the messages scroll anchored to the bottom during input box resizing
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
      };

      const onMouseUp = () => {
        isDragging = false;
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        this.inputArea.classList.remove("resizing");
      };

      resizer.addEventListener("mousedown", (e) => {
        isDragging = true;
        startY = e.clientY;
        startHeight = this.textarea.clientHeight;
        this.textarea.style.maxHeight = "none";
        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
        this.inputArea.classList.add("resizing");
        e.preventDefault();
      });

      resizer.addEventListener("dblclick", () => {
        this.isTextareaResized = false;
        this.textarea.style.height = "auto";
        this.textarea.style.maxHeight = "120px";
        this.textarea.style.height = (this.textarea.scrollHeight) + "px";
        this.scrollBottom();
      });
    }
    
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
      const { node_id, history, clear_draft, model } = event.detail;
      if (String(node_id) === String(this.node.id)) {
        this.history = history;
        if (model) {
          this.updateModelBadge(model);
        }
        this.renderMessages();
        if (clear_draft && this.textarea) {
          this.textarea.value = "";
          this.textarea.style.height = "auto";
          this.isTextareaResized = false;
        }
        this.updateNodeValue();
        this.saveActiveConversation();
        this.isGenerating = false;
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

    // Listen to ComfyUI execution events to hide the confirm banner if execution finishes or is cancelled
    this._onExecuting = (event) => {
      const nodeId = event.detail;
      if (nodeId === null || String(nodeId) !== String(this.node.id)) {
        if (this.confirmBanner) {
          this.confirmBanner.style.display = "none";
        }
        this.isGenerating = false;
      } else {
        // Node started executing!
        // If there is draft text in the textarea, simulate sending it
        const text = this.textarea ? this.textarea.value.trim() : "";
        if (text) {
          const modeWidget = this.node.widgets?.find(w => w && w.name === "mode");
          const rawMode = modeWidget ? modeWidget.value : "";
          const currentMode = Array.isArray(rawMode) ? rawMode[0] : rawMode;

          if (currentMode === "Manual (Pause & Confirm)" || currentMode === "Manual One-Shot (Immediate)") {
            const numDelimWidget = this.node.widgets?.find(w => w && w.name === "number_of_delimiters");
            const count = numDelimWidget ? (parseInt(numDelimWidget.value) || 0) : 0;
            let startD = "<prompt_1>";
            let endD = "</prompt_1>";
            if (count >= 1) {
              const startW = this.node.widgets?.find(w => w && w.name === "starting_delimiter_1");
              const endW = this.node.widgets?.find(w => w && w.name === "ending_delimiter_1");
              if (startW && endW) {
                startD = startW.value;
                endD = endW.value;
              }
            }
            const wrappedText = `${startD}\n${text}\n${endD}`;
            this.history.push({ role: "assistant", content: wrappedText });
            this.renderMessages();
            this.textarea.value = "";
            this.textarea.style.height = "auto";
            this.isTextareaResized = false;
            this.pendingAttachments = [];
            this.fileInput.value = "";
            this.updatePreviewBar();
            this.saveActiveConversation();
          } else if (!this.isGenerating) {
            const allAttachments = [...(this.pendingAttachments || []), ...(this.connectedAttachments || [])];
            let content = text;
            if (allAttachments.length > 0) {
              content = [];
              content.push({ type: "text", text: text });
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
            this.isTextareaResized = false;
            this.pendingAttachments = [];
            this.fileInput.value = "";
            this.updatePreviewBar();
            
            this.showTypingIndicator(true);
            this.isGenerating = true;
          }
        }
      }
    };
    api.addEventListener("executing", this._onExecuting);

    this._onExecutionInterrupted = () => {
      if (this.confirmBanner) {
        this.confirmBanner.style.display = "none";
      }
      this.isGenerating = false;
      this.showTypingIndicator(false);
    };
    api.addEventListener("execution_interrupted", this._onExecutionInterrupted);

    this._onExecutionError = () => {
      if (this.confirmBanner) {
        this.confirmBanner.style.display = "none";
      }
      this.isGenerating = false;
      this.showTypingIndicator(false);
    };
    api.addEventListener("execution_error", this._onExecutionError);

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
          this.showFloatingQuoteButton(rect, selectedText, range);
          return;
        }
      }
      
      this.hideFloatingQuoteButton();
    };
    document.addEventListener("selectionchange", this._selectionChangeHandler);

    if (this.messagesContainer) {
      this._messagesScrollHandler = () => {
        this.handleNodeDrawOrMove();
      };
      this.messagesContainer.addEventListener("scroll", this._messagesScrollHandler);
    }

    // Search events
    if (this.searchToggleBtn) {
      this.searchToggleBtn.addEventListener("click", () => this.toggleSearchBar());
    }
    if (this.searchCloseBtn) {
      this.searchCloseBtn.addEventListener("click", () => this.hideSearchBar());
    }
    if (this.searchInput) {
      this.searchInput.addEventListener("input", (e) => {
        this.performSearch(e.target.value);
      });
      this.searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          if (e.shiftKey) {
            this.prevMatch();
          } else {
            this.nextMatch();
          }
        } else if (e.key === "Escape") {
          e.preventDefault();
          this.hideSearchBar();
        }
      });
    }
    if (this.searchPrevBtn) {
      this.searchPrevBtn.addEventListener("click", () => this.prevMatch());
    }
    if (this.searchNextBtn) {
      this.searchNextBtn.addEventListener("click", () => this.nextMatch());
    }
  }

  showConfirmDialog(message) {
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = "chatbot311-confirm-modal-overlay";
      overlay.innerHTML = `
        <div class="chatbot311-confirm-modal-card">
          <div class="chatbot311-confirm-modal-icon">
            ${warningSvg}
          </div>
          <div class="chatbot311-confirm-modal-content">
            <p>${message}</p>
          </div>
          <div class="chatbot311-confirm-modal-actions">
            <button class="chatbot311-confirm-modal-btn cancel" id="confirm-modal-btn-cancel">Cancel</button>
            <button class="chatbot311-confirm-modal-btn confirm" id="confirm-modal-btn-confirm">Confirm</button>
          </div>
        </div>
      `;
      
      this.container.appendChild(overlay);
      
      const card = overlay.querySelector(".chatbot311-confirm-modal-card");
      
      requestAnimationFrame(() => {
        overlay.classList.add("active");
        card.classList.add("active");
      });
      
      const cleanUp = (result) => {
        overlay.classList.remove("active");
        card.classList.remove("active");
        setTimeout(() => {
          overlay.remove();
          resolve(result);
        }, 200);
      };
      
      overlay.querySelector("#confirm-modal-btn-confirm").addEventListener("click", () => cleanUp(true));
      overlay.querySelector("#confirm-modal-btn-cancel").addEventListener("click", () => cleanUp(false));
      
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) {
          cleanUp(false);
        }
      });
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
      const apiKeyWidget = this.node.widgets?.find(w => w && w.name === "api_key");
      let apiKey = apiKeyWidget ? String(apiKeyWidget.value || "").trim() : "";
      if (!apiKey) {
        apiKey = String(this.getConnectedInputValue("api_key") || "").trim();
      }
      if (apiKey && (
        apiKey.toLowerCase() === "your_api_key_here" || 
        apiKey.toLowerCase().includes("optional") || 
        apiKey.toLowerCase().includes("defaults to env") ||
        apiKey.toLowerCase().includes("api key or proxy") ||
        /^<\/?[a-z_]+\d*>$/i.test(apiKey)
      )) {
        apiKey = "";
      }
      const headers = {};
      if (apiKey) {
        headers["X-Gemini-API-Key"] = apiKey;
      }
      
      const useCreditsWidget = this.node.widgets?.find(w => w && w.name === "use_comfyui_credits");
      const useCredits = useCreditsWidget ? !!useCreditsWidget.value : false;
      if (useCredits) {
        headers["X-Use-ComfyUI-Credits"] = "true";
      }
      
      let authToken = "";
      const authWidget = this.node.widgets?.find(w => w && w.name === "auth_token_comfy_org");
      if (authWidget && authWidget.value) {
        authToken = String(authWidget.value).trim();
      }
      // Primary fallback: use the same properties ComfyUI frontend uses in queuePrompt
      if (!authToken && api.authToken) {
        authToken = api.authToken;
      }
      if (!authToken && api.apiKey) {
        authToken = api.apiKey;
      }
      if (!authToken) {
        try {
          const authStore = await api.getAuthStore?.();
          if (authStore) {
            if (typeof authStore.getAuthToken === "function") {
              authToken = await authStore.getAuthToken();
            } else if (typeof authStore.getIdToken === "function") {
              authToken = await authStore.getIdToken();
            }
          }
        } catch (err) {
          console.warn("Failed to get auth token from ComfyUI auth store:", err);
        }
      }
      if (!authToken) {
        try {
          authToken = localStorage.getItem("comfy_org_token") || localStorage.getItem("comfy_api_key") || "";
        } catch (e) {}
      }
      if (!authToken) {
        authToken = await getFirebaseIndexedDBToken() || "";
      }
      authToken = (authToken || "").trim();
      if (authToken) {
        headers["X-Comfy-Org-Auth-Token"] = authToken;
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
        
        if (data.model) {
          this.updateModelBadge(data.model);
        } else if (data.config && data.config.lastUsedModel) {
          this.updateModelBadge(data.config.lastUsedModel);
        } else {
          this.updateModelBadge("gemini-3.5-flash");
        }
        
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
          history: this.history,
          model: this.lastUsedModel
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
    const confirmed = await this.showConfirmDialog("Are you sure you want to delete this conversation?");
    if (!confirmed) return;
    
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
    
    // Case 1: Check node outputs from the last execution (highly dynamic values)
    const originSlot = link.origin_slot;
    const nodeOutputs = app.node_outputs?.[originNode.id];
    let val = undefined;
    
    if (nodeOutputs) {
      if (Array.isArray(nodeOutputs)) {
        val = nodeOutputs[originSlot];
      } else if (typeof nodeOutputs === "object") {
        if (nodeOutputs[originSlot] !== undefined) {
          val = nodeOutputs[originSlot];
        } else {
          const slot = originNode.outputs?.[originSlot];
          if (slot) {
            const slotName = slot.name;
            if (slotName && nodeOutputs[slotName] !== undefined) {
              val = nodeOutputs[slotName];
            } else if (slotName && nodeOutputs[slotName.toLowerCase()] !== undefined) {
              val = nodeOutputs[slotName.toLowerCase()];
            } else if (slotName && nodeOutputs[slotName.toUpperCase()] !== undefined) {
              val = nodeOutputs[slotName.toUpperCase()];
            }
          }
          if (val === undefined) {
            const keys = Object.keys(nodeOutputs);
            if (keys.length === 1) {
              val = nodeOutputs[keys[0]];
            } else if (keys.length > 0) {
              const commonKeys = ["string", "text", "value", "val", "prompt", "output"];
              for (const k of commonKeys) {
                if (nodeOutputs[k] !== undefined) {
                  val = nodeOutputs[k];
                  break;
                }
                const upperK = k.toUpperCase();
                if (nodeOutputs[upperK] !== undefined) {
                  val = nodeOutputs[upperK];
                  break;
                }
              }
            }
          }
        }
      }
    }
    
    if (val !== undefined && val !== null) {
      if (Array.isArray(val) && val.length > 0) {
        if (typeof val[0] === "string") return val[0];
        if (val[0] && typeof val[0] === "object") {
          if (val[0].string !== undefined) return String(val[0].string);
          if (val[0].text !== undefined) return String(val[0].text);
        }
      } else if (typeof val === "string") {
        return val;
      } else if (val && typeof val === "object") {
        if (val.string !== undefined) return String(val.string);
        if (val.text !== undefined) return String(val.text);
      }
    }
    
    // Case 2: Check origin node widgets (fallback for primitive/static values)
    if (originNode.widgets && originNode.widgets.length > 0) {
      const textWidget = originNode.widgets.find(w => 
        w.name === "text" || 
        w.name === "string" || 
        w.name === "value" || 
        w.name === inputName ||
        (w.name && w.name.toLowerCase() === inputName.toLowerCase()) ||
        w.type === "text" || 
        w.type === "customtext"
      );
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
    const sysGeneral = this.getConnectedInputValue("system_general");
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
            <div class="chatbot311-preview-thumb" style="background-image: url('${att.base64}');" title="${att.filename} (Upload)">
              <button class="chatbot311-preview-remove" data-id="${att.id}">✕</button>
            </div>
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
            <div class="chatbot311-preview-thumb" style="background-image: url('${att.base64}');" title="${att.filename} (Graph)"></div>
          `;
          this.previewBar.appendChild(item);
        });
      }
    } else {
      this.previewBar.style.display = "none";
      this.previewBar.innerHTML = "";
    }
  }
  
  updateModelBadge(modelName) {
    const badge = this.container.querySelector("#model-badge");
    if (!badge) return;
    
    let friendlyName = "Gemini 3.5";
    if (modelName) {
      const lower = modelName.toLowerCase();
      if (lower.includes("gemini-3.5-flash") || lower.includes("gemini-3-5-flash")) {
        friendlyName = "Gemini 3.5 Flash";
      } else if (lower.includes("gemini-3.1-flash-lite") || lower.includes("gemini-3-1-flash-lite")) {
        friendlyName = "Gemini 3.1 Flash";
      } else if (lower.includes("gemini-3.1-pro")) {
        friendlyName = "Gemini 3.1 Pro";
      } else if (lower.includes("gemini-2.5-flash")) {
        friendlyName = "Gemini 2.5 Flash";
      } else if (lower.includes("gemini-2.5-pro")) {
        friendlyName = "Gemini 2.5 Pro";
      } else {
        friendlyName = modelName
          .replace(/-/g, " ")
          .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
        if (!friendlyName.startsWith("Gemini")) {
          friendlyName = "Gemini " + friendlyName;
        }
      }
    }
    badge.textContent = friendlyName;
    if (this.config) {
      this.config.lastUsedModel = modelName;
    }
    this.lastUsedModel = modelName;
  }
  
  setValue(val) {
    if (!val) return;
    let history = [];
    let config = {};
    let draft = "";
    
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
        if (parsed.hasOwnProperty("draft")) {
          draft = parsed.draft || "";
        }
      }
    } catch (e) {
      console.error("Error setting widget value:", e);
    }
    
    this.history = history;
    this.config = config;
    if (this.config && this.config.lastUsedModel) {
      this.updateModelBadge(this.config.lastUsedModel);
    } else {
      this.updateModelBadge("gemini-3.5-flash");
    }
    if (this.textarea) {
      this.textarea.value = draft;
      this.textarea.style.height = "auto";
      if (draft) {
        this.textarea.style.height = (this.textarea.scrollHeight) + "px";
      }
    }
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
    
    if (this.searchBar && this.searchBar.style.display !== "none" && this.searchInput && this.searchInput.value) {
      this.performSearch(this.searchInput.value, false);
    } else {
      this.scrollBottom();
    }
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
    
    // Format assistant execution/API errors into user-friendly warnings
    if (role === "assistant" && typeof text === "string" && text.includes("Error")) {
      if (text.includes("API key not valid") || text.includes("valid API key")) {
        text = "⚠️ **API Key Missing:** Please configure your Gemini API Key in the `api_key` widget of this node.";
      } else if (text.includes("rate_limited") || text.includes("429") || text.toLowerCase().includes("quota")) {
        text = "⚠️ **Rate Limit Exceeded:** You have exceeded the API request quota. Please wait a moment before trying again.";
      }
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
        this.deleteMessage(index);
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

    // Intercept Send button if NOT paused — the chat operates via Queue Prompt (Run) only
    const modeWidget = this.node.widgets?.find(w => w && w.name === "mode");
    const rawMode = modeWidget ? modeWidget.value : "";
    const currentMode = Array.isArray(rawMode) ? rawMode[0] : rawMode;
    const isPaused = this.confirmBanner && this.confirmBanner.style.display === "flex";

    if (!isPaused) {
      if (currentMode === "LLM Chat (Pause & Confirm)") {
        const bubble = this.createMessageBubble("assistant", "⚠️ **Interactive Chat Mode:** In this mode, press **Queue Prompt** (Run) in ComfyUI to start the workflow. When it reaches this node, it will pause and allow you to chat. Type your message and press **Confirm** to continue the workflow.");
        this.messagesContainer.appendChild(bubble);
        this.scrollBottom();
        return;
      } else if (currentMode === "LLM One-Shot (Immediate)") {
        const bubble = this.createMessageBubble("assistant", "⚠️ **One-Shot Mode:** Leave your prompt written in the text box (without sending) and press **Queue Prompt** (Run) in ComfyUI. The node will process it automatically with the connected system prompts and images, then continue the workflow.");
        this.messagesContainer.appendChild(bubble);
        this.scrollBottom();
        return;
      } else if (currentMode === "Bypass (Pass Last Output)") {
        const bubble = this.createMessageBubble("assistant", "⚠️ **Bypass Mode:** This node simply passes through the last response without any interaction. Press **Queue Prompt** (Run) to continue the workflow.");
        this.messagesContainer.appendChild(bubble);
        this.scrollBottom();
        return;
      } else if (currentMode === "Manual (Pause & Confirm)") {
        const bubble = this.createMessageBubble("assistant", "⚠️ **Manual Mode:** In this mode, press **Queue Prompt** (Run) in ComfyUI to start. The node will pause, allowing you to write your text, press **Send**, and then click **Confirm**.");
        this.messagesContainer.appendChild(bubble);
        this.scrollBottom();
        return;
      } else if (currentMode === "Manual One-Shot (Immediate)") {
        const bubble = this.createMessageBubble("assistant", "⚠️ **Manual One-Shot Mode:** Leave your prompt written in the text box (without sending) and press **Queue Prompt** (Run) in ComfyUI. The node will wrap it in delimiters and pass it downstream immediately without pausing.");
        this.messagesContainer.appendChild(bubble);
        this.scrollBottom();
        return;
      }
    }

    if (currentMode === "Manual (Pause & Confirm)" || currentMode === "Manual One-Shot (Immediate)") {
      // Get the first delimiter values
      const numDelimWidget = this.node.widgets?.find(w => w && w.name === "number_of_delimiters");
      const count = numDelimWidget ? (parseInt(numDelimWidget.value) || 0) : 0;
      let startD = "<prompt_1>";
      let endD = "</prompt_1>";
      if (count >= 1) {
        const startW = this.node.widgets?.find(w => w && w.name === "starting_delimiter_1");
        const endW = this.node.widgets?.find(w => w && w.name === "ending_delimiter_1");
        if (startW && endW) {
          startD = startW.value;
          endD = endW.value;
        }
      }
      const wrappedText = `${startD}\n${text}\n${endD}`;

      this.history.push({ role: "assistant", content: wrappedText });
      this.renderMessages();

      this.textarea.value = "";
      this.textarea.style.height = "auto";
      this.isTextareaResized = false;
      this.pendingAttachments = [];
      this.fileInput.value = "";
      this.updatePreviewBar();

      await this.saveActiveConversation();
      return;
    }
    
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
    this.isTextareaResized = false;
    this.pendingAttachments = [];
    this.fileInput.value = "";
    this.updatePreviewBar();
    
    this.showTypingIndicator(true);
    
    // Save user message immediately
    await this.saveActiveConversation();
    
    // Build messages payload for API (connected system prompt vs default system prompt)
    const apiMessages = [];
    let activeSystemPrompt = this.defaultSystemPrompt;
    if (this.connectedSystemPrompt) {
      const parts = this.connectedSystemPrompt.split("|||");
      const sysGeneralVal = parts[0] ? parts[0].trim() : "";
      const sysVariableVal = parts[1] ? parts[1].trim() : "";
      
      const systemParts = [];
      if (sysGeneralVal) {
        systemParts.push(sysGeneralVal);
      } else if (this.defaultSystemPrompt && this.defaultSystemPrompt.trim()) {
        systemParts.push(this.defaultSystemPrompt.trim());
      }
      if (sysVariableVal) {
        systemParts.push(sysVariableVal);
      }
      if (systemParts.length > 0) {
        activeSystemPrompt = systemParts.join("\n\n");
      }
    }

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

      // Strip image_url from all older user messages in apiMessages to avoid payload bloat
      for (let i = 0; i < apiMessages.length - 1; i++) {
        const msg = apiMessages[i];
        if (msg.role === "user" && Array.isArray(msg.content)) {
          const cleanContent = msg.content.filter(part => part.type !== "image_url");
          if (cleanContent.length === 1 && cleanContent[0].type === "text") {
            msg.content = cleanContent[0].text;
          } else {
            msg.content = cleanContent;
          }
        }
      }
    }
    
    try {
      const apiKeyWidget = this.node.widgets?.find(w => w && w.name === "api_key");
      let apiKey = apiKeyWidget ? String(apiKeyWidget.value || "").trim() : "";
      if (!apiKey) {
        apiKey = String(this.getConnectedInputValue("api_key") || "").trim();
      }
      if (apiKey && (
        apiKey.toLowerCase() === "your_api_key_here" || 
        apiKey.toLowerCase().includes("optional") || 
        apiKey.toLowerCase().includes("defaults to env") ||
        apiKey.toLowerCase().includes("api key or proxy") ||
        /^<\/?[a-z_]+\d*>$/i.test(apiKey)
      )) {
        apiKey = "";
      }
      const headers = { "Content-Type": "application/json" };
      if (apiKey) {
        headers["X-Gemini-API-Key"] = apiKey;
      }
      
      const useCreditsWidget = this.node.widgets?.find(w => w && w.name === "use_comfyui_credits");
      const useCredits = useCreditsWidget ? !!useCreditsWidget.value : false;
      if (useCredits) {
        headers["X-Use-ComfyUI-Credits"] = "true";
      }
      
      let authToken = "";
      const authWidget = this.node.widgets?.find(w => w && w.name === "auth_token_comfy_org");
      if (authWidget && authWidget.value) {
        authToken = String(authWidget.value).trim();
      }
      // Primary fallback: use the same properties ComfyUI frontend uses in queuePrompt
      if (!authToken && api.authToken) {
        authToken = api.authToken;
      }
      if (!authToken && api.apiKey) {
        authToken = api.apiKey;
      }
      if (!authToken) {
        try {
          const authStore = await api.getAuthStore?.();
          if (authStore) {
            if (typeof authStore.getAuthToken === "function") {
              authToken = await authStore.getAuthToken();
            } else if (typeof authStore.getIdToken === "function") {
              authToken = await authStore.getIdToken();
            }
          }
        } catch (err) {
          console.warn("Failed to get auth token from ComfyUI auth store:", err);
        }
      }
      if (!authToken) {
        try {
          authToken = localStorage.getItem("comfy_org_token") || localStorage.getItem("comfy_api_key") || "";
        } catch (e) {}
      }
      if (!authToken) {
        authToken = await getFirebaseIndexedDBToken() || "";
      }
      authToken = (authToken || "").trim();
      if (authToken) {
        headers["X-Comfy-Org-Auth-Token"] = authToken;
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
        let errMessage = "";
        try {
          // Clone the response so we can read it twice if needed
          const clonedResp = response.clone();
          const errData = await clonedResp.json();
          let cleanErr = null;
          
          if (errData && errData.result && Array.isArray(errData.result) && errData.result[0] && errData.result[0].error) {
            cleanErr = errData.result[0].error;
          } else if (errData && errData.error) {
            cleanErr = errData.error;
          } else if (errData && errData.detail) {
            errMessage = errData.detail;
          }

          if (cleanErr && cleanErr.message) {
            errMessage = cleanErr.message;
            if (cleanErr.code) {
              errMessage = `API Error (${cleanErr.code}): ${errMessage}`;
            }
          } else if (!errMessage) {
            errMessage = JSON.stringify(errData);
          }
        } catch (parseErr) {
          try {
            errMessage = await response.text();
          } catch (textErr) {
            errMessage = `Server responded with status ${response.status}`;
          }
        }
        
        // Add custom friendly warnings for common API failures
        if (errMessage.includes("API key not valid") || errMessage.includes("valid API key")) {
          errMessage = "⚠️ **API Key Missing:** Please configure your Gemini API Key in the `api_key` widget of this node or in the `.env` file inside the `ComfyUI-311-Chatbot` directory.";
        } else if (errMessage.includes("rate_limited") || errMessage.includes("429")) {
          errMessage = "⚠️ **Rate Limit Exceeded:** You have exceeded the API request quota. Please wait a moment before trying again.";
        }
        
        throw new Error(errMessage);
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
              
              if (parsed.model) {
                this.updateModelBadge(parsed.model);
              }
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
      this.addMessage("assistant", e.message.startsWith("⚠️") ? e.message : `Error: ${e.message}`);
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
    this.undoStack.push(JSON.stringify({
      history: this.history,
      draft: this.textarea ? this.textarea.value : ""
    }));
    if (this.undoStack.length > 10) this.undoStack.shift();
    this.updateUndoButtonVisibility();
  }

  undoLastAction() {
    if (!this.undoStack || this.undoStack.length === 0) return;
    const previousState = this.undoStack.pop();
    try {
      const state = JSON.parse(previousState);
      if (state && typeof state === "object" && "history" in state) {
        this.history = state.history;
        if (this.textarea) {
          this.textarea.value = state.draft || "";
          this.textarea.style.height = "auto";
          this.textarea.style.height = (this.textarea.scrollHeight) + "px";
        }
      } else {
        // Fallback for legacy stringified history states
        this.history = state;
      }
    } catch (e) {
      console.error("Failed to parse undo state:", e);
    }
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

  triggerUndoHint() {
    if (this.undoBtn) {
      this.undoBtn.classList.add("highlight-pulse");
      setTimeout(() => {
        this.undoBtn.classList.remove("highlight-pulse");
      }, 1000);
    }
  }

  reuseMessage(idx) {
    this.saveUndoState();
    const msg = this.history[idx];
    let text = "";
    if (Array.isArray(msg.content)) {
      const textPart = msg.content.find(p => p.type === "text");
      text = textPart ? textPart.text : "";
    } else {
      text = msg.content || "";
    }
    
    this.textarea.value = text;
    this.textarea.style.height = "auto";
    this.textarea.style.height = (this.textarea.scrollHeight) + "px";
    this.textarea.focus();
    
    // Slice up to idx (excluding the reused message itself and any subsequent messages)
    this.history = this.history.slice(0, idx);
    this.renderMessages();
    this.updateNodeValue();
    this.saveActiveConversation();
  }

  deleteMessage(idx) {
    this.saveUndoState();
    this.history.splice(idx, 1);
    this.renderMessages();
    this.updateNodeValue();
    this.saveActiveConversation();
    this.triggerUndoHint();
  }
  
  async clearChat() {
    if (this.history.length === 0) return;
    const confirmed = await this.showConfirmDialog("Are you sure you want to clear this conversation?");
    if (!confirmed) return;
    
    this.saveUndoState();
    this.history = [];
    this.chatName = "";
    this.renderMessages();
    this.updateNodeValue();
    // Delete file from disk if it was saved
    fetch(`/chatbot-311/conversations/${this.currentChatId}`, { method: "DELETE" })
      .then(() => this.fetchConversations());
  }
  
  updateNodeValue(skipTrigger = false) {
    if (this.config) {
      this.config.lastUsedModel = this.lastUsedModel;
    }
    const val = JSON.stringify({
      config: this.config,
      history: this.history,
      currentChatId: this.currentChatId,
      chatName: this.chatName,
      draft: this.textarea ? this.textarea.value : ""
    });
    const widget = (this.node.widgets || []).find(w => w.name === "ui_widget") || this.node.widgets[0];
    if (widget) {
      widget.value = val;
    }
    if (!skipTrigger) {
      this.node.trigger("change");
    }
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

  showFloatingQuoteButton(rect, text, range) {
    this._activeRange = range || null;
    if (!this.floatingQuoteBtn) {
      this.floatingQuoteBtn = document.createElement("button");
      this.floatingQuoteBtn.className = "chatbot311-floating-quote-btn";
      this.floatingQuoteBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px; vertical-align: middle;">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        <span>Quote</span>
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

    // Save position state to detect node moving or canvas dragging/zooming
    this._lastNodePos = [this.node.pos[0], this.node.pos[1]];
    if (app.canvas && app.canvas.ds && app.canvas.ds.offset) {
      this._lastCanvasOffset = [app.canvas.ds.offset[0], app.canvas.ds.offset[1]];
      this._lastCanvasScale = app.canvas.ds.scale;
    } else {
      this._lastCanvasOffset = null;
      this._lastCanvasScale = null;
    }
  }
  
  hideFloatingQuoteButton() {
    if (this.floatingQuoteBtn) {
      this.floatingQuoteBtn.style.display = "none";
    }
    this._activeRange = null;
  }

  handleNodeDrawOrMove() {
    if (!this.floatingQuoteBtn || !this._activeRange) return;

    const rect = this._activeRange.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) {
      this.hideFloatingQuoteButton();
      return;
    }

    // Check if the selection is scrolled out of messagesContainer's visible area
    if (this.messagesContainer) {
      const containerRect = this.messagesContainer.getBoundingClientRect();
      if (rect.bottom < containerRect.top || rect.top > containerRect.bottom) {
        this.floatingQuoteBtn.style.display = "none";
        return;
      }
    }

    const btnWidth = 70;
    const btnHeight = 28;
    const left = rect.left + (rect.width / 2) - (btnWidth / 2) + window.scrollX;
    const top = rect.top - btnHeight - 8 + window.scrollY;

    this.floatingQuoteBtn.style.left = `${left}px`;
    this.floatingQuoteBtn.style.top = `${top}px`;
    this.floatingQuoteBtn.style.display = "flex";
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
  
  toggleSearchBar() {
    if (!this.searchBar) return;
    if (this.searchBar.style.display === "none") {
      this.showSearchBar();
    } else {
      this.hideSearchBar();
    }
  }

  showSearchBar() {
    if (!this.searchBar) return;
    this.searchBar.style.display = "flex";
    if (this.searchToggleBtn) {
      this.searchToggleBtn.classList.add("active");
    }
    this.searchInput.focus();
    if (this.searchInput.value) {
      this.performSearch(this.searchInput.value);
    }
  }

  hideSearchBar() {
    if (!this.searchBar) return;
    this.searchBar.style.display = "none";
    if (this.searchToggleBtn) {
      this.searchToggleBtn.classList.remove("active");
    }
    this.clearHighlights(this.messagesContainer);
    this.searchMatches = [];
    this.currentSearchIndex = -1;
    this.updateSearchCount();
  }

  performSearch(query, shouldScroll = true) {
    this.searchMatches = this.highlightText(this.messagesContainer, query);
    
    if (this.searchMatches.length > 0) {
      if (this.currentSearchIndex < 0 || this.currentSearchIndex >= this.searchMatches.length) {
        this.currentSearchIndex = 0;
      }
      this.showMatch(this.currentSearchIndex, shouldScroll);
    } else {
      this.currentSearchIndex = -1;
      this.updateSearchCount();
    }
  }

  showMatch(index, shouldScroll = true) {
    if (!this.searchMatches) return;
    this.searchMatches.forEach(m => m.classList.remove("active"));
    
    if (index >= 0 && index < this.searchMatches.length) {
      const activeMatch = this.searchMatches[index];
      activeMatch.classList.add("active");
      
      if (shouldScroll) {
        activeMatch.scrollIntoView({ block: "center", behavior: "smooth" });
      }
      
      this.updateSearchCount();
    }
  }

  updateSearchCount() {
    const countEl = this.container.querySelector("#search-count");
    if (countEl) {
      if (this.searchMatches && this.searchMatches.length > 0) {
        countEl.textContent = `${this.currentSearchIndex + 1}/${this.searchMatches.length}`;
      } else {
        countEl.textContent = "0/0";
      }
    }
  }

  nextMatch() {
    if (!this.searchMatches || this.searchMatches.length === 0) return;
    this.currentSearchIndex = (this.currentSearchIndex + 1) % this.searchMatches.length;
    this.showMatch(this.currentSearchIndex, true);
  }

  prevMatch() {
    if (!this.searchMatches || this.searchMatches.length === 0) return;
    this.currentSearchIndex = (this.currentSearchIndex - 1 + this.searchMatches.length) % this.searchMatches.length;
    this.showMatch(this.currentSearchIndex, true);
  }

  highlightText(container, query) {
    this.clearHighlights(container);
    
    if (!query) return [];
    
    const matches = [];
    const regex = new RegExp(this.escapeRegExp(query), "gi");
    
    const walk = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          let parent = node.parentNode;
          while (parent && parent !== container) {
            if (parent.classList && (
              parent.classList.contains("chatbot311-msg-toolbar") || 
              parent.classList.contains("chatbot311-codeblock-copy-btn") ||
              parent.classList.contains("chatbot311-search-bar")
            )) {
              return NodeFilter.FILTER_REJECT;
            }
            parent = parent.parentNode;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );
    
    const textNodes = [];
    let currentNode;
    while (currentNode = walk.nextNode()) {
      textNodes.push(currentNode);
    }
    
    for (let i = textNodes.length - 1; i >= 0; i--) {
      const node = textNodes[i];
      const text = node.nodeValue;
      let match;
      
      if (regex.test(text)) {
        regex.lastIndex = 0;
        const fragments = [];
        let lastIndex = 0;
        
        while ((match = regex.exec(text)) !== null) {
          const matchText = match[0];
          const matchIndex = match.index;
          
          if (matchIndex > lastIndex) {
            fragments.push(document.createTextNode(text.substring(lastIndex, matchIndex)));
          }
          
          const span = document.createElement("span");
          span.className = "chatbot311-search-highlight";
          span.textContent = matchText;
          fragments.push(span);
          
          lastIndex = regex.lastIndex;
        }
        
        if (lastIndex < text.length) {
          fragments.push(document.createTextNode(text.substring(lastIndex)));
        }
        
        const parent = node.parentNode;
        if (parent) {
          const sibling = node.nextSibling;
          fragments.forEach(frag => {
            parent.insertBefore(frag, sibling);
          });
          parent.removeChild(node);
        }
      }
    }
    
    return Array.from(container.querySelectorAll(".chatbot311-search-highlight"));
  }

  clearHighlights(container) {
    const highlights = container.querySelectorAll(".chatbot311-search-highlight");
    highlights.forEach(span => {
      const parent = span.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(span.textContent), span);
        parent.normalize();
      }
    });
  }

  escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  destroy() {
    clearInterval(this.connectionCheckInterval);
    if (this._globalPasteHandler) {
      window.removeEventListener("paste", this._globalPasteHandler);
    }
    if (this._selectionChangeHandler) {
      document.removeEventListener("selectionchange", this._selectionChangeHandler);
    }
    if (this._messagesScrollHandler && this.messagesContainer) {
      this.messagesContainer.removeEventListener("scroll", this._messagesScrollHandler);
    }
    if (this.floatingQuoteBtn) {
      this.floatingQuoteBtn.remove();
    }
    if (this._onExecuting) {
      api.removeEventListener("executing", this._onExecuting);
    }
    if (this._onExecutionInterrupted) {
      api.removeEventListener("execution_interrupted", this._onExecutionInterrupted);
    }
    if (this._onExecutionError) {
      api.removeEventListener("execution_error", this._onExecutionError);
    }
  }

  updateInputAreaVisibility() {
    const modeWidget = this.node.widgets?.find(w => w && w.name === "mode");
    const rawMode = modeWidget ? modeWidget.value : "";
    const currentMode = Array.isArray(rawMode) ? rawMode[0] : rawMode;
    
    const inputArea = this.container.querySelector(".chatbot311-input-area");
    if (inputArea) {
      if (currentMode === "Bypass (Pass Last Output)") {
        inputArea.style.display = "none";
      } else {
        inputArea.style.display = "flex";
      }
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
            if (chatbot.config) {
              chatbot.config.lastUsedModel = chatbot.lastUsedModel;
            }
            return {
              config: chatbot.config,
              history: chatbot.history,
              currentChatId: chatbot.currentChatId,
              chatName: chatbot.chatName,
              node_id: node.id,
              draft: chatbot.textarea ? chatbot.textarea.value : ""
            };
          },
          setValue(val) {
            chatbot.setValue(val);
          },
          getState() {
            if (chatbot.config) {
              chatbot.config.lastUsedModel = chatbot.lastUsedModel;
            }
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
        
        let sizeObserver = null;
        let lastNodeWidth = 0;
        let lastNodeHeight = 0;

        node.syncWidgetSize = (size) => {
          const actualSize = size || node.size;
          if (!actualSize) return;

          if (widget.element && widget.element.parentElement) {
            const parent = widget.element.parentElement;
            
            // Register MutationObserver once parent is available
            if (!sizeObserver && typeof MutationObserver !== "undefined") {
              sizeObserver = new MutationObserver(() => {
                node.syncWidgetSize();
              });
              sizeObserver.observe(parent, { attributes: true, attributeFilter: ["style"] });
            }
            
            const targetWidth = actualSize[0] - 20;
            const topOffset = parseFloat(parent.style.top) || 260;
            const targetHeight = Math.max(250, actualSize[1] - topOffset - 16);
            
            // Only update DOM styles if node size or widget width differs
            if (actualSize[0] !== lastNodeWidth || actualSize[1] !== lastNodeHeight || parent.style.width !== targetWidth + "px") {
              lastNodeWidth = actualSize[0];
              lastNodeHeight = actualSize[1];
              
              widget.width = targetWidth;
              widget.height = targetHeight;
              
              parent.style.setProperty("width", targetWidth + "px", "important");
              parent.style.setProperty("max-width", "none", "important");
              parent.style.setProperty("margin", "0px", "important");
              parent.style.setProperty("padding", "0px", "important");
              parent.style.setProperty("box-sizing", "border-box", "important");
              
              widget.element.style.setProperty("width", "100%", "important");
              widget.element.style.setProperty("max-width", "none", "important");
              widget.element.style.setProperty("margin", "0px", "important");
              widget.element.style.setProperty("box-sizing", "border-box", "important");
              
              parent.style.setProperty("height", targetHeight + "px", "important");
              widget.element.style.height = "100%";
            }
          }
        };
        node.syncWidgetSize();
        
        if (!node.size || node.size[0] < 200 || node.size[1] < 200) {
          node.size = [380, 580];
          if (node.setSize) {
            node.setSize([380, 580]);
          }
        }
        
        const onRemoved = node.onRemoved;
        node.onRemoved = function() {
          if (sizeObserver) {
            sizeObserver.disconnect();
          }
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

        const originalDrawForeground = node.onDrawForeground;
        node.onDrawForeground = function(ctx, canvas) {
          const res = originalDrawForeground ? originalDrawForeground.apply(this, arguments) : undefined;
          if (node.chatbotUI) {
            node.chatbotUI.handleNodeDrawOrMove();
          }
          return res;
        };
        
        node.onResize = function(size) {
          if (node.syncWidgetSize) {
            node.syncWidgetSize();
          }
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
          const isInteractive = modeWidget ? ["LLM Chat (Pause & Confirm)", "Manual (Pause & Confirm)"].includes(modeWidget.value) : true;
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
          
          // 3. Chat input area visibility based on Bypass mode
          if (node.chatbotUI) {
            node.chatbotUI.updateInputAreaVisibility();
          }
          
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

          // Set defaults for seed and control_after_generate on creation
          const seedW = node.widgets?.find(w => w && w.name === "seed");
          const controlW = node.widgets?.find(w => w && (w.name === "control_after_generate" || w.name === "control after generate"));
          if (controlW && (controlW.value === undefined || controlW.value === "fixed")) {
            controlW.value = "increment";
          }
          if (seedW && seedW.value === undefined) {
            seedW.value = 0;
          }

          // Auto heal size on load if it's excessively large (e.g. runaway layout corruption)
          if (node.size && node.size[1] > 3000) {
            node.setSize([380, 580]);
          }
        }, 100);
        
        node.onSerialize = function(data) {
          if (node.widgets) {
            data.widgets_values_by_name = {};
            for (const w of node.widgets) {
              if (w && w.name) {
                data.widgets_values_by_name[w.name] = w.value;
              }
            }
          }
        };

        const originalConfigure = node.onConfigure;
        node.onConfigure = function(data) {
          const res = originalConfigure ? originalConfigure.apply(this, arguments) : undefined;
          
          if (data) {
            // Priority 1: Restore by name if saved by name
            if (data.widgets_values_by_name) {
              const byName = data.widgets_values_by_name;
              for (const w of node.widgets || []) {
                if (w && w.name && byName[w.name] !== undefined) {
                  w.value = byName[w.name];
                }
              }
              // Verify/heal delimiters
              const numDelimW = (node.widgets || []).find(w => w && w.name === "number_of_delimiters");
              const count = numDelimW ? (parseInt(numDelimW.value) || 1) : 1;
              for (let i = 1; i <= 20; i++) {
                const startW = (node.widgets || []).find(w => w && w.name === `starting_delimiter_${i}`);
                const endW = (node.widgets || []).find(w => w && w.name === `ending_delimiter_${i}`);
                if (startW && (byName[`starting_delimiter_${i}`] === undefined || !byName[`starting_delimiter_${i}`])) {
                  startW.value = `<prompt_${i}>`;
                }
                if (endW && (byName[`ending_delimiter_${i}`] === undefined || !byName[`ending_delimiter_${i}`])) {
                  endW.value = `</prompt_${i}>`;
                }
              }
            } 
            // Priority 2: Robust heuristic fallback for older workflows (positional only)
            else if (data.widgets_values) {
              const vals = data.widgets_values;
              
              // 1. Identify delimiters start in the values array
              let firstDelimIndex = -1;
              for (let i = 2; i < vals.length; i++) {
                const v = vals[i];
                if (typeof v === "string") {
                  const trimmed = v.trim();
                  if (trimmed.startsWith("<") || trimmed.includes("prompt_") || /^<\/?[a-z_]+\d*>$/i.test(trimmed)) {
                    firstDelimIndex = i;
                    break;
                  }
                }
              }
              
              let loadedModeVal = null;
              let loadedSoundAlertVal = null;
              let loadedAPIKeyVal = null;
              let loadedSeedVal = null;
              let loadedNumDelimitersVal = null;
              let loadedUseCreditsVal = null;
              let loadedHistoryVal = null;
              
              const controlVals = firstDelimIndex !== -1 ? vals.slice(0, firstDelimIndex) : vals;
              
              const numIndices = [];
              controlVals.forEach((v, idx) => {
                if (typeof v === "number") {
                  numIndices.push(idx);
                }
              });
              
              const boolIndices = [];
              controlVals.forEach((v, idx) => {
                if (typeof v === "boolean") {
                  boolIndices.push(idx);
                }
              });
              
              const invalidDelimVals = [
                "Interactive Chat (Pause)", 
                "One-Shot Prompt", 
                "Pass Last Output (Bypass)", 
                "LLM Disabled (Manual)",
                "LLM Chat (Pause & Confirm)",
                "LLM One-Shot (Immediate)",
                "Manual (Pause & Confirm)",
                "Manual One-Shot (Immediate)",
                "Bypass (Pass Last Output)",
                "fixed", "increment", "decrement", "randomize"
              ];
              
              loadedModeVal = controlVals[0];
              if (boolIndices.length > 0) {
                loadedSoundAlertVal = controlVals[boolIndices[0]];
              }
              
              if (numIndices.includes(2)) {
                loadedNumDelimitersVal = controlVals[2];
                if (numIndices.includes(4)) {
                  loadedSeedVal = controlVals[4];
                }
                if (typeof controlVals[3] === "string" && !invalidDelimVals.includes(controlVals[3])) {
                  loadedAPIKeyVal = controlVals[3];
                }
              } else if (numIndices.includes(3)) {
                loadedSeedVal = controlVals[3];
                if (numIndices.includes(5)) {
                  loadedNumDelimitersVal = controlVals[5];
                } else if (numIndices.includes(4)) {
                  loadedNumDelimitersVal = controlVals[4];
                }
                if (typeof controlVals[2] === "string" && !invalidDelimVals.includes(controlVals[2])) {
                  loadedAPIKeyVal = controlVals[2];
                }
              } else {
                const numbers = controlVals.filter(v => typeof v === "number");
                if (numbers.length >= 2) {
                  if (controlVals.length > 5) {
                    loadedSeedVal = numbers[0];
                    loadedNumDelimitersVal = numbers[1];
                  } else {
                    loadedNumDelimitersVal = numbers[0];
                    loadedSeedVal = numbers[1];
                  }
                } else if (numbers.length === 1) {
                  loadedNumDelimitersVal = numbers[0];
                }
              }
              
              let count = parseInt(loadedNumDelimitersVal);
              if (isNaN(count) || count < 1 || count > 20) {
                count = 1;
              }
              loadedNumDelimitersVal = count;
              
              if (firstDelimIndex !== -1) {
                const postDelimVals = vals.slice(firstDelimIndex);
                const postBooleans = postDelimVals.filter(v => typeof v === "boolean");
                if (postBooleans.length > 0) {
                  loadedUseCreditsVal = postBooleans[0];
                }
              }
              
              vals.forEach(val => {
                if (val && typeof val === "string") {
                  const trimmed = val.trim();
                  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
                    loadedHistoryVal = val;
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
                  let normMode = loadedModeVal;
                  if (normMode === "Interactive Chat (Pause)") normMode = "LLM Chat (Pause & Confirm)";
                  else if (normMode === "One-Shot Prompt") normMode = "LLM One-Shot (Immediate)";
                  else if (normMode === "LLM Disabled (Manual)") normMode = "Manual (Pause & Confirm)";
                  else if (normMode === "Pass Last Output (Bypass)") normMode = "Bypass (Pass Last Output)";
                  modeWidget.value = normMode;
                }
              }
              if (loadedSoundAlertVal !== null) {
                const soundAlertWidget = (node.widgets || []).find(w => w && w.name === "sound_alert");
                if (soundAlertWidget) {
                  soundAlertWidget.value = loadedSoundAlertVal;
                }
              }
              if (loadedAPIKeyVal !== null) {
                const apiKeyWidget = (node.widgets || []).find(w => w && w.name === "api_key");
                if (apiKeyWidget) {
                  apiKeyWidget.value = String(loadedAPIKeyVal);
                }
              }
              if (loadedUseCreditsVal !== null) {
                const useCreditsWidget = (node.widgets || []).find(w => w && w.name === "use_comfyui_credits");
                if (useCreditsWidget) {
                  useCreditsWidget.value = loadedUseCreditsVal;
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
              
              const apiKeyW = (node.widgets || []).find(w => w && w.name === "api_key");
              if (apiKeyW) {
                const akVal = String(apiKeyW.value || "").trim();
                if (/^<\/?[a-z_]+\d*>$/i.test(akVal)) {
                  apiKeyW.value = "";
                }
              }
              
              if (firstDelimIndex !== -1) {
                let delimValIdx = firstDelimIndex;
                for (let i = 1; i <= 20; i++) {
                  const startW = (node.widgets || []).find(w => w && w.name === `starting_delimiter_${i}`);
                  const endW = (node.widgets || []).find(w => w && w.name === `ending_delimiter_${i}`);
                  
                  if (startW) {
                    const savedVal = vals[delimValIdx];
                    if (savedVal !== undefined) {
                      if (typeof savedVal === "string" && !invalidDelimVals.includes(savedVal) && !savedVal.startsWith("{") && !savedVal.startsWith("[")) {
                        startW.value = savedVal;
                      } else {
                        startW.value = `<prompt_${i}>`;
                      }
                      delimValIdx++;
                    } else {
                      startW.value = `<prompt_${i}>`;
                    }
                  }
                  
                  if (endW) {
                    const savedVal = vals[delimValIdx];
                    if (savedVal !== undefined) {
                      if (typeof savedVal === "string" && !invalidDelimVals.includes(savedVal) && !savedVal.startsWith("{") && !savedVal.startsWith("[")) {
                        endW.value = savedVal;
                      } else {
                        endW.value = `</prompt_${i}>`;
                      }
                      delimValIdx++;
                    } else {
                      endW.value = `</prompt_${i}>`;
                    }
                  }
                }
              }
            }
          }
          
          updateNodeLayout();
          if (node.chatbotUI) {
            node.chatbotUI.checkAPIStatus();
          }
          
          // Post-configure sanitization:
          // If "control_after_generate" ended up with a number (like 13) or invalid value due to positional shifts,
          // reset it to "increment" and set seed to 0.
          const seedW = (node.widgets || []).find(w => w && w.name === "seed");
          const controlW = (node.widgets || []).find(w => w && (w.name === "control_after_generate" || w.name === "control after generate"));
          if (controlW) {
            const val = controlW.value;
            if (typeof val === "number" || !["fixed", "increment", "decrement", "randomize"].includes(val)) {
              controlW.value = "increment";
              if (seedW) {
                seedW.value = 0;
              }
            }
          }

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
