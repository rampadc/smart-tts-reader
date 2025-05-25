let selectionModeActive = false;
let currentHighlightedElement = null;
let originalOutline = "";

function highlightElement(element) {
  if (currentHighlightedElement) {
    currentHighlightedElement.style.outline = originalOutline;
  }
  if (
    element &&
    element !== document.body &&
    element !== document.documentElement
  ) {
    originalOutline = element.style.outline;
    element.style.outline = "2px dashed #007bff";
    element.style.outlineOffset = "2px";
    currentHighlightedElement = element;
  } else {
    currentHighlightedElement = null;
  }
}

function removeHighlight() {
  if (currentHighlightedElement) {
    currentHighlightedElement.style.outline = originalOutline;
    currentHighlightedElement.style.outlineOffset = "";
    currentHighlightedElement = null;
    originalOutline = "";
  }
}

function handleMouseOver(event) {
  if (selectionModeActive) {
    highlightElement(event.target);
  }
}

function handleClick(event) {
  if (selectionModeActive) {
    event.preventDefault();
    event.stopPropagation();

    removeHighlight();
    selectionModeActive = false;
    document.removeEventListener("mouseover", handleMouseOver);
    document.removeEventListener("click", handleClick, true);
    document.body.style.cursor = "";
    document.removeEventListener("keydown", handleEscape);

    const selectedElement = event.target;
    const selectedHtml = selectedElement.outerHTML;
    const selectedText = selectedElement.innerText;

    console.log(
      "Content Script: HTML block selected via click. Plain text:",
      selectedText,
    );
    console.log(
      "Content Script: HTML block selected via click. Full HTML:",
      selectedHtml,
    );

    browser.runtime
      .sendMessage({
        action: "storeSelectedHtmlBlock",
        html: selectedHtml,
        text: selectedText,
      })
      .catch((err) =>
        console.error(
          "Content Script: Error sending HTML block to background:",
          err,
        ),
      );
  }
}

const handleEscape = (e) => {
  if (e.key === "Escape") {
    removeHighlight();
    selectionModeActive = false;
    document.removeEventListener("mouseover", handleMouseOver);
    document.removeEventListener("click", handleClick, true);
    document.body.style.cursor = "";
    document.removeEventListener("keydown", handleEscape);
    console.log("Content Script: Selection mode cancelled by user.");
  }
};

function getContainingBlocks(selection) {
  const containingElements = new Set();
  
  for (let i = 0; i < selection.rangeCount; i++) {
    const range = selection.getRangeAt(i);
    const walker = document.createTreeWalker(
      range.commonAncestorContainer,
      NodeFilter.SHOW_ELEMENT,
      {
        acceptNode: function(node) {
          if (range.intersectsNode(node)) {
            return NodeFilter.FILTER_ACCEPT;
          }
          return NodeFilter.FILTER_REJECT;
        }
      }
    );
    
    let node;
    while (node = walker.nextNode()) {
      // Only include block-level elements or elements with substantial content
      if (node.tagName && (
        ['P', 'DIV', 'SECTION', 'ARTICLE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 
         'LI', 'BLOCKQUOTE', 'PRE', 'CODE', 'TABLE', 'TR', 'TD', 'TH'].includes(node.tagName) ||
        (node.innerText && node.innerText.trim().length > 10)
      )) {
        containingElements.add(node);
      }
    }
    
    // Also check start and end containers
    let startElement = range.startContainer.nodeType === Node.ELEMENT_NODE ? 
      range.startContainer : range.startContainer.parentElement;
    let endElement = range.endContainer.nodeType === Node.ELEMENT_NODE ? 
      range.endContainer : range.endContainer.parentElement;
    
    while (startElement && startElement !== document.body) {
      if (startElement.tagName && (
        ['P', 'DIV', 'SECTION', 'ARTICLE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 
         'LI', 'BLOCKQUOTE', 'PRE', 'CODE', 'TABLE', 'TR', 'TD', 'TH'].includes(startElement.tagName) ||
        (startElement.innerText && startElement.innerText.trim().length > 10)
      )) {
        containingElements.add(startElement);
        break;
      }
      startElement = startElement.parentElement;
    }
    
    while (endElement && endElement !== document.body && endElement !== startElement) {
      if (endElement.tagName && (
        ['P', 'DIV', 'SECTION', 'ARTICLE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 
         'LI', 'BLOCKQUOTE', 'PRE', 'CODE', 'TABLE', 'TR', 'TD', 'TH'].includes(endElement.tagName) ||
        (endElement.innerText && endElement.innerText.trim().length > 10)
      )) {
        containingElements.add(endElement);
        break;
      }
      endElement = endElement.parentElement;
    }
  }
  
  return Array.from(containingElements);
}

browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getSelectedText") {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const tempDiv = document.createElement("div");
      for (let i = 0; i < selection.rangeCount; i++) {
        tempDiv.appendChild(selection.getRangeAt(i).cloneContents());
      }
      const plainSelectedText = tempDiv.innerText;
      const htmlSelectedContent = tempDiv.innerHTML;
      console.log(
        "Content Script: Plain text selection detected:",
        plainSelectedText,
      );
      sendResponse({
        success: true,
        text: plainSelectedText,
        html: htmlSelectedContent,
      });
    } else {
      console.log("Content Script: No plain text selection detected.");
      sendResponse({ success: false, text: "", html: "" });
    }
  } else if (request.action === "getSelectedTextWithBlocks") {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const plainSelectedText = selection.toString();
      const containingBlocks = getContainingBlocks(selection);
      
      // Combine HTML from all containing blocks
      const combinedHtml = containingBlocks.map(element => element.outerHTML).join('\n');
      
      console.log(
        "Content Script: Multi-block selection detected:",
        plainSelectedText,
      );
      console.log(
        "Content Script: Found", containingBlocks.length, "containing blocks"
      );
      
      sendResponse({
        success: true,
        text: plainSelectedText,
        html: combinedHtml,
      });
    } else {
      console.log("Content Script: No text selection for multi-block processing.");
      sendResponse({ success: false, text: "", html: "" });
    }
  } else if (request.action === "activateSelectionMode") {
    if (!selectionModeActive) {
      selectionModeActive = true;
      document.addEventListener("mouseover", handleMouseOver);
      document.addEventListener("click", handleClick, true);
      document.body.style.cursor = "crosshair";
      console.log("Content Script: HTML block selection mode activated.");
      document.addEventListener("keydown", handleEscape);
    }
  }
  return true;
});
