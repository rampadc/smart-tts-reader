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
    const selectedHtml = preprocessHTML(selectedElement.outerHTML);
    const selectedText = selectedElement.innerText;

    console.log(
      "Content Script: HTML block selected via click. Plain text:",
      selectedText,
    );
    console.log(
      "Content Script: HTML block selected via click. Processed HTML:",
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

function preprocessHTML(html) {
  // Use DOMParser instead of innerHTML for initial parsing
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, "text/html");
  const temp = doc.body.firstChild;

  // Get all text nodes for safe text processing
  const walker = document.createTreeWalker(
    temp,
    NodeFilter.SHOW_TEXT,
    null,
    false,
  );

  const textNodes = [];
  let node;
  while ((node = walker.nextNode())) {
    textNodes.push(node);
  }

  // Handle math delimiters: $...$ and $$...$$
  const mathRegex = /\$\$(.*?)\$\$|\$(.*?)\$/g;
  // Handle LaTeX delimiters: \(...\) and \[...\]
  const latexRegex = /\\\[(.*?)\\\]|\\\((.*?)\\\)/g;

  textNodes.forEach((textNode) => {
    let content = textNode.textContent;
    let needsReplacement = false;

    // Check if this text node contains math notation
    if (mathRegex.test(content) || latexRegex.test(content)) {
      needsReplacement = true;

      // Apply math delimiter replacements
      content = content.replace(mathRegex, (match, p1, p2) => {
        const formula = p1 || p2;
        return `<math-expression>${formula}</math-expression>`;
      });

      // Apply LaTeX delimiter replacements
      content = content.replace(latexRegex, (match, p1, p2) => {
        const formula = p1 || p2;
        return `<math-expression>${formula}</math-expression>`;
      });
    }

    if (needsReplacement) {
      // Create replacement elements using DOMParser instead of innerHTML
      const replacementParser = new DOMParser();
      const replacementDoc = replacementParser.parseFromString(
        `<div>${content}</div>`,
        "text/html",
      );
      const replacement = replacementDoc.body.firstChild;

      const parent = textNode.parentNode;

      // Move all child nodes from replacement to parent
      while (replacement.firstChild) {
        parent.insertBefore(replacement.firstChild, textNode);
      }

      // Remove the original text node
      parent.removeChild(textNode);
    }
  });

  // Mark code blocks
  const codeBlocks = temp.querySelectorAll("pre, code");
  codeBlocks.forEach((block) => {
    block.setAttribute("type", "code-block");
  });

  // Mark math environments
  const mathElements = temp.querySelectorAll(
    ".math, .MathJax, .MathJax_Preview",
  );
  mathElements.forEach((math) => {
    math.setAttribute("type", "math-content");
  });

  // Handle tables
  const tables = temp.querySelectorAll("table");
  tables.forEach((table) => {
    table.setAttribute("speech-type", "structured-content");
  });

  // Handle lists
  const lists = temp.querySelectorAll("ul, ol");
  lists.forEach((list) => {
    list.setAttribute("speech-type", "list");
  });

  return temp.innerHTML;
}

function getContainingBlocks(selection) {
  const containingElements = new Set();
  const seenText = new Set();

  for (let i = 0; i < selection.rangeCount; i++) {
    const range = selection.getRangeAt(i);

    // Get only the selected content's container
    const fragment = range.cloneContents();
    const tempDiv = document.createElement("div");
    tempDiv.appendChild(fragment);

    // Find all relevant block elements within the selection
    const blockElements = tempDiv.querySelectorAll(
      "p, div, section, article, h1, h2, h3, h4, h5, h6, li, blockquote, pre, code, table, tr, td, th",
    );

    if (blockElements.length > 0) {
      // Add found block elements
      blockElements.forEach((element) => {
        const text = element.innerText.trim();
        if (text.length > 0 && !seenText.has(text)) {
          containingElements.add(element);
          seenText.add(text);
        }
      });
    } else {
      // If no block elements found, add the selection content directly
      const text = tempDiv.innerText.trim();
      if (text.length > 0 && !seenText.has(text)) {
        containingElements.add(tempDiv);
        seenText.add(text);
      }
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
      const htmlSelectedContent = preprocessHTML(tempDiv.innerHTML);
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
      const blocks = getContainingBlocks(selection);

      // Create a wrapper div
      const wrapper = document.createElement("div");

      // Add each block to the wrapper
      blocks.forEach((block) => {
        const clone = block.cloneNode(true);
        wrapper.appendChild(clone);
      });

      // Process the HTML to handle math notation and other elements
      const processedHtml = preprocessHTML(wrapper.innerHTML);

      console.log(
        "Content Script: Multi-block selection detected:",
        plainSelectedText,
      );
      console.log("Content Script: Found", blocks.length, "blocks");

      sendResponse({
        success: true,
        text: plainSelectedText,
        html: processedHtml,
      });
    } else {
      console.log(
        "Content Script: No text selection for multi-block processing.",
      );
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
