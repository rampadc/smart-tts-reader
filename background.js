// This script runs in the background and handles API calls and TTS

// Processing animation
let animationInterval;
let frame = 0;
const frames = ["icons/icon-48.png", "icons/icon-48-2.png"];

function startProcessingAnimation() {
  if (animationInterval) {
    clearInterval(animationInterval);
  }

  animationInterval = setInterval(() => {
    browser.action.setIcon({ path: frames[frame % frames.length] });
    frame++;
  }, 600);
}

function stopProcessingAnimation() {
  if (animationInterval) {
    clearInterval(animationInterval);
    animationInterval = null;
  }
  // Reset to the default icon
  browser.action.setIcon({ path: "icons/icon-48.png" });
}

// Default AI API URLs
const DEFAULT_GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
const DEFAULT_OLLAMA_API_URL = "http://localhost:11434";

// Default prompt content
const DEFAULT_PROMPT_CONTENT = `You're a text-processing assistant for our text-to-speech system. Your job is to convert structured or mathematical input into clean, natural spoken language. Follow these rules strictly:

Mathematical Symbols and Operations:
+: "plus"
-: "minus"
*, \\cdot, \\times: "times"
/, \\div: "divided by" or "over"
\\frac{a}{b}: "a over b"
=: "equals"
!=, \\neq: "is not equal to"
<: "is less than"
>: "is greater than"
<=, \\le: "is less than or equal to"
>=, \\ge: "is greater than or equal to"
\\approx, \\approxeq: "is approximately equal to"
\\equiv: "is equivalent to"
\\propto: "is proportional to"
\\implies: "implies"
\\iff: "if and only if"
%: "percent"
Variables and Constants:
Latin: say the letter (e.g., "x")
Boldface: say "vector x" or "matrix X" as appropriate
Greek letters (e.g., \\alpha, \\beta, \\theta, \\sigma, \\phi): use name
\\pi: "pi", e: "e", i: "imaginary i", \\infty: "infinity"
Exponents and Roots:
x^2: "x squared", x^3: "x cubed", x^n: "x to the power of n"
x^{-1}: "x inverse"
\\sqrt{x}: "square root of x", \\sqrt[n]{x}: "nth root of x"
Subscripts and Superscripts:
x_i: "x sub i", x_{ij}: "x sub i j"
x^{(i)}: "x superscript i"
x_i^{(j)}: "x sub i superscript j"
i^{\\text{th}}: "i-th"
Functions and Operators:
f(x): "f of x", \\sin(x): "sine of x", \\ln(x): "natural log of x"
\\sum, \\prod, \\int: include limits if present
\\hat{x}, \\tilde{x}, \\bar{x}: "x hat", "x tilde", "x bar"
Set Theory and Logic:
\\in: "is in", \\notin: "is not in"
\\cup: "union", \\cap: "intersection"
\\emptyset, \\varnothing: "empty set"
\\setminus, -: "set minus"
A^c, A': "complement of A"
\\times: "Cartesian product"
|A|: "size of A"
Special Sets:
\\mathbb{N}: "natural numbers", \\mathbb{Z}: "integers", \\mathbb{Q}: "rationals", \\mathbb{R}: "real numbers", \\mathbb{C}: "complex numbers"
Brackets and Delimiters:
(): "parentheses", []: "brackets", {}: "curly braces"
|x|: "absolute value of x", \\|x\\|: "norm of x"
\\langle x, y \\rangle: "inner product of x and y"
Vectors and Matrices:
\\begin{pmatrix}...: say as "matrix, row one: ..., row two: ..."
A^T, A^{\\top}: "A transpose"
A^{-1}: "A inverse", |A|: "determinant of A"
Probability and Statistics:
P(A): "probability of A", E[X]: "expected value of X"
Var(X), Cov(X,Y), P(A|B): "probability of A given B"
\\sim: "is distributed as", \\mathcal{N}(\\mu, \\sigma^2): "normal distribution with mean mu and variance sigma squared"
Deep Learning and Machine Learning Notation:
\\mathcal{L}: "loss function"
\\nabla_{\\theta}: "gradient with respect to theta"
\\partial: "partial"
\\delta, \\Delta: "delta", "capital delta"
W, b: "weights", "bias"
\\hat{y}: "y hat" (predicted output)
y^{(i)}: "y superscript i" or "label for sample i"
X^{(i)}: "x superscript i" or "input for sample i"
z^{[l]}: "z at layer l", a^{[l]}: "activation at layer l"
\\sigma(z): "sigma of z" or "activation function of z"
\\text{ReLU}, \\text{softmax}: read as-is
\\argmax, \\argmin: "arg max", "arg min"
\\mathbb{E}: "expected value"
\\mathcal{D}: "dataset D"
\\theta, \\phi: "theta", "phi" (parameters)
\\mathrm{d}: "d" (for integrals or derivatives)
Interpretation Principles:

Use context for best phrasing.
Never speak internal formatting like LaTeX commands.
Avoid repeating math syntax; just describe the meaning clearly.
Maintain smooth phrasing for nested expressions.
Favor what a tutor would say aloud when explaining.
If the content includes programming syntax (e.g., loops, function calls, variables), return a spoken English summary suitable for TTS.
Otherwise, return the input text exactly as-is—unchanged and unformatted.

Content:
\`\`\`
\${content}
\`\`\`

Processed text:`;

// Function to build prompt content
function buildPromptContent(promptType, customPrompt, contentForLLM) {
  if (promptType === "custom" && customPrompt) {
    return customPrompt.replace(/\$\{content\}/g, contentForLLM);
  } else {
    return DEFAULT_PROMPT_CONTENT.replace(/\$\{content\}/g, contentForLLM);
  }
}

// Temporary storage for the last selected HTML block
let lastSelectedHtmlBlock = {
  selectedText: "",
  selectedHtml: "",
};

// Flag to track if selection was initiated from popup vs context menu
let selectionFromPopup = false;

// TTS configuration
let ttsApiUrl = "";
let ttsApiKey = "";
let speechSpeed = 1.0;
let voice = "af_bella+af_sky";
let model = "kokoro";
let streamingMode = true;
let currentAudio = null;

let audioContext = null;
let pcmStreamStopped = false;
let pcmPlaybackTime = 0;

// Load TTS settings
browser.storage.local
  .get([
    "ttsApiUrl",
    "ttsApiKey",
    "speechSpeed",
    "voice",
    "model",
    "streamingMode",
  ])
  .then((data) => {
    ttsApiUrl = data.ttsApiUrl || "http://localhost:8880/v1";
    ttsApiKey = data.ttsApiKey || "not-needed";
    speechSpeed = data.speechSpeed || 1.0;
    voice = data.voice || "af_bella+af_sky";
    model = data.model || "kokoro";
    streamingMode =
      data.streamingMode !== undefined ? data.streamingMode : true;

    console.log("Background: TTS configuration loaded:");
    console.log("Background: - API URL:", ttsApiUrl);
    console.log("Background: - API Key:", ttsApiKey ? "****" : "undefined");
    console.log("Background: - Voice:", voice);
    console.log("Background: - Model:", model);
    console.log("Background: - Speed:", speechSpeed);
    console.log("Background: - Streaming:", streamingMode);
  })
  .catch((error) => {
    console.error("Background: Failed to load TTS settings:", error);
  });

// Function to reload TTS settings
async function reloadTtsSettings() {
  try {
    const data = await browser.storage.local.get([
      "ttsApiUrl",
      "ttsApiKey",
      "speechSpeed",
      "voice",
      "model",
      "streamingMode",
    ]);
    ttsApiUrl = data.ttsApiUrl || "http://localhost:8880/v1";
    ttsApiKey = data.ttsApiKey || "not-needed";
    speechSpeed = data.speechSpeed || 1.0;
    voice = data.voice || "af_bella+af_sky";
    model = data.model || "kokoro";
    streamingMode =
      data.streamingMode !== undefined ? data.streamingMode : true;

    console.log("Background: TTS settings reloaded:");
    console.log("Background: - API URL:", ttsApiUrl);
    console.log("Background: - API Key:", ttsApiKey ? "****" : "undefined");
    console.log("Background: - Voice:", voice);
    console.log("Background: - Model:", model);
    console.log("Background: - Speed:", speechSpeed);
    console.log("Background: - Streaming:", streamingMode);
  } catch (error) {
    console.error("Background: Failed to reload TTS settings:", error);
  }
}

// Listen for TTS settings changes
browser.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local") {
    if (changes.ttsApiUrl) {
      ttsApiUrl = changes.ttsApiUrl.newValue;
      console.log("Background: TTS API URL updated:", ttsApiUrl);
    }
    if (changes.ttsApiKey) {
      ttsApiKey = changes.ttsApiKey.newValue;
      console.log(
        "Background: TTS API Key updated:",
        ttsApiKey ? "****" : "undefined",
      );
    }
    if (changes.speechSpeed) {
      speechSpeed = changes.speechSpeed.newValue;
      console.log("Background: Speech speed updated:", speechSpeed);
    }
    if (changes.voice) {
      voice = changes.voice.newValue;
      console.log("Background: Voice updated:", voice);
    }
    if (changes.model) {
      model = changes.model.newValue;
      console.log("Background: Model updated:", model);
    }
    if (changes.streamingMode) {
      streamingMode = changes.streamingMode.newValue;
      console.log("Background: Streaming mode updated:", streamingMode);
    }
  }
});

console.log("Background: Message listener initialized.");

// Create context menu items
browser.contextMenus.create({
  id: "selectHtmlBlock",
  title: "Select HTML Block for TTS",
  contexts: ["page"],
});

browser.contextMenus.create({
  id: "selectMultipleBlocks",
  title: "Process Selected Text + HTML Blocks",
  contexts: ["selection"],
});

// Handle context menu clicks
browser.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "selectHtmlBlock") {
    console.log("Background: Context menu 'Select HTML Block' clicked");
    selectionFromPopup = false; // Mark as context menu selection
    // Send message to content script to activate selection mode
    browser.tabs
      .sendMessage(tab.id, { action: "activateSelectionMode" })
      .catch((err) => {
        console.error(
          "Background: Error sending activateSelectionMode to content script:",
          err,
        );
      });
  } else if (info.menuItemId === "selectMultipleBlocks") {
    console.log(
      "Background: Context menu 'Process Selected Text + HTML Blocks' clicked",
    );
    selectionFromPopup = false; // Mark as context menu selection
    // Send message to content script to get selected text and containing HTML blocks
    browser.tabs
      .sendMessage(tab.id, { action: "getSelectedTextWithBlocks" })
      .then((response) => {
        if (response && response.selectedText) {
          console.log(
            "Background: Received multi-block selection from content script",
          );
          lastSelectedHtmlBlock = {
            selectedText: response.selectedText,
            selectedHtml: response.selectedHtml,
          };
          // Auto-process the selected text immediately
          autoProcessSelection();
        }
      })
      .catch((err) => {
        console.error(
          "Background: Error getting selected text with blocks:",
          err,
        );
      });
  }
});

browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log(
    "Background: Received message with action:",
    request.action,
    "from sender:",
    sender.id || "self",
  ); // Added sender info

  if (request.action === "processText") {
    console.log('Background: Handling "processText" action.');
    const textToProcess = request.text;
    const aiModel = request.aiModel || "gemini";
    const geminiApiKey = request.geminiApiKey;
    const geminiApiUrl = request.geminiApiUrl || DEFAULT_GEMINI_API_URL;
    const ollamaApiUrl = request.ollamaApiUrl || DEFAULT_OLLAMA_API_URL;
    const ollamaModel = request.ollamaModel || "llama3.2:latest";
    const promptType = request.promptType || "default";
    const customPrompt = request.customPrompt || "";

    console.log("Background: Debug - AI Model:", aiModel);
    console.log("Background: Debug - Prompt Type:", promptType);
    console.log(
      "Background: Debug - Request object keys:",
      Object.keys(request),
    );

    if (aiModel === "gemini") {
      if (!geminiApiKey) {
        console.error(
          "Background: Gemini API key is missing in request. Aborting processText.",
        );
        sendResponse({
          error:
            "Gemini API key is missing. Please set it in the extension popup.",
        });
        return;
      }

      if (!geminiApiUrl) {
        console.error(
          "Background: Gemini API URL is missing in request. Aborting processText.",
        );
        sendResponse({
          error:
            "Gemini API URL is missing. Please set it in the extension popup.",
        });
        return;
      }
    } else if (aiModel === "ollama") {
      if (!ollamaApiUrl) {
        console.error(
          "Background: Ollama API URL is missing in request. Aborting processText.",
        );
        sendResponse({
          error:
            "Ollama API URL is missing. Please set it in the extension popup.",
        });
        return;
      }

      if (!ollamaModel) {
        console.error(
          "Background: Ollama model is missing in request. Aborting processText.",
        );
        sendResponse({
          error:
            "Ollama model is missing. Please set it in the extension popup.",
        });
        return;
      }
    }

    let contentForLLM;
    // We prioritize the full HTML for LLM if it exists, otherwise use the plain text.
    if (lastSelectedHtmlBlock.selectedHtml) {
      contentForLLM = lastSelectedHtmlBlock.selectedHtml;
      console.log(
        "Background: Using previously selected HTML block (full HTML) for LLM input.",
      );
    } else {
      contentForLLM = textToProcess;
      console.log(
        "Background: Using plain text from popup textarea (or context menu) for LLM input.",
      );
    }
    console.log(
      "Background: Final content (raw) sent to LLM:",
      contentForLLM.substring(0, 200) + "...",
    );

    const promptContent = buildPromptContent(promptType, customPrompt, contentForLLM);

    console.log("Background: LLM prompt constructed.");

    (async () => {
      try {
        startProcessingAnimation();
        let response, data, processedText;

        if (aiModel === "gemini") {
          console.log(
            "Background: Attempting fetch to Gemini API:",
            geminiApiUrl,
          );
          response = await fetch(`${geminiApiUrl}?key=${geminiApiKey}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: promptContent,
                    },
                  ],
                },
              ],
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            console.error(
              "Background: Gemini API error response (status not OK):",
              response.status,
              errorData,
            );
            sendResponse({
              error: `Gemini API error: ${errorData.error?.message || response.statusText}. Please check your API key.`,
            });
            return;
          }

          data = await response.json();
          processedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        } else if (aiModel === "ollama") {
          console.log(
            "Background: Attempting fetch to Ollama API:",
            ollamaApiUrl,
          );
          response = await fetch(`${ollamaApiUrl}/api/generate`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: ollamaModel,
              prompt: promptContent,
              stream: false,
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(
              "Background: Ollama API error response (status not OK):",
              response.status,
              errorText,
            );
            sendResponse({
              error: `Ollama API error: ${response.statusText}. Make sure Ollama is running and the model is available.`,
            });
            return;
          }

          data = await response.json();
          processedText = data.response;
        }

        console.log(
          "Background: Fetch request sent. Checking response status.",
        );

        if (processedText) {
          console.log(
            "Background: LLM processed text (before TTS):",
            processedText.trim(),
          );

          // Automatically send to TTS after AI processing
          console.log("Background: Automatically sending to TTS...");
          try {
            await processTextWithTTS(processedText.trim());
            stopProcessingAnimation();
            console.log("Background: TTS playback started successfully");
            sendResponse({
              processedText: processedText.trim(),
              ttsSuccess: true,
            });
          } catch (ttsError) {
            console.error("Background: TTS error:", ttsError);
            sendResponse({
              processedText: processedText.trim(),
              ttsError: "TTS failed: " + ttsError.message,
            });
          }
        } else {
          console.warn(
            "Background: No processed text received from AI. Response data:",
            data,
          );
          sendResponse({ error: `No processed text received from ${aiModel}.` });
        }
      } catch (error) {
        console.error(
          `Background: Uncaught error during fetch to ${aiModel} API:`,
          error,
        );
        sendResponse({
          error:
            `Failed to connect to ${aiModel} API. Please check your connection and configuration: ` +
            error.message,
        });
      }
    })();
    return true;
  }

  if (request.action === "speakText") {
    console.log('Background: Handling "speakText" action.');
    const textToSpeak = request.text;
    console.log(
      "Background: Sending text to TTS endpoint:",
      textToSpeak.substring(0, 100) + "...",
    );

    // Reload TTS settings to ensure they're current
    reloadTtsSettings()
      .then(() => {
        console.log("Background: TTS settings refreshed, current values:");
        console.log("Background: TTS API URL:", ttsApiUrl);
        console.log(
          "Background: TTS API Key:",
          ttsApiKey ? "****" : "undefined",
        );
        console.log("Background: TTS Voice:", voice);
        console.log("Background: TTS Model:", model);
        console.log("Background: TTS Streaming Mode:", streamingMode);

        // Now proceed with TTS
        processTextWithTTS(textToSpeak)
          .then(() => {
            console.log(
              "Background: processTextWithTTS completed successfully",
            );
            sendResponse({ success: true });
          })
          .catch((e) => {
            console.error("Background: TTS error:", e);
            sendResponse({ error: "Failed to speak text: " + e.message });
          });
      })
      .catch((reloadError) => {
        console.error(
          "Background: Failed to reload TTS settings:",
          reloadError,
        );
        sendResponse({
          error: "Failed to load TTS configuration: " + reloadError.message,
        });
      });

    return true; // Keep channel open for async response
  }

  if (request.action === "stopPlayback") {
    console.log('Background: Handling "stopPlayback" action.');
    pcmStreamStopped = true;
    if (audioContext) {
      audioContext.close();
      audioContext = null;
    }
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }
    sendResponse({ success: true });
    return true;
  }

  if (request.action === "htmlBlockSelected") {
    console.log(
      'Background: Handling "htmlBlockSelected" action (from content script).',
    );
    lastSelectedHtmlBlock = {
      selectedText: request.selectedText,
      selectedHtml: request.selectedHtml,
    };
    console.log(
      "Background: Received HTML block from content script. Stored plain text:",
      request.selectedText.substring(0, 100) + "...",
    );
    console.log(
      "Background: Stored full HTML (potentially for LLM):",
      request.selectedHtml.substring(0, 100) + "...",
    );
    console.log(
      "Background: HTML block selection complete, will trigger popup update",
    );

    try {
      const popupViews = browser.extension.getViews({ type: "popup" });
      if (popupViews.length > 0) {
        console.log(
          "Background: Found open popup. Calling updateSelection directly on popup view.",
        );
        // Call the function directly on the popup window instead of sending a message
        if (typeof popupViews[0].updateSelection === "function") {
          popupViews[0].updateSelection(
            lastSelectedHtmlBlock.selectedText,
            lastSelectedHtmlBlock.selectedHtml,
          );
          console.log(
            "Background: Successfully called updateSelection on popup.",
          );
        } else {
          console.warn(
            "Background: updateSelection function not found on popup view.",
          );
        }
      } else if (!selectionFromPopup) {
        console.log(
          "Background: No popup open, auto-processing selected block from context menu.",
        );
        // Auto-process the selected text when no popup is open (context menu selection)
        autoProcessSelection();
      } else {
        console.log(
          "Background: Selection was from popup, waiting for popup to reopen for processing.",
        );
        // Reset the flag for next selection
        selectionFromPopup = false;
      }
    } catch (e) {
      console.warn(
        "Background: Could not get popup views or call function:",
        e,
      );
    }

    sendResponse({ success: true });
    return true;
  }

  if (request.action === "initiatePopupSelection") {
    console.log('Background: Handling "initiatePopupSelection" action.');
    selectionFromPopup = true; // Mark as popup-initiated selection
    sendResponse({ success: true });
    return true;
  }

  if (request.action === "getCurrentSelection") {
    console.log(
      'Background: Handling "getCurrentSelection" action (from popup).',
    );

    let currentResponse = { ...lastSelectedHtmlBlock };

    (async () => {
      try {
        const tabs = await browser.tabs.query({
          active: true,
          currentWindow: true,
        });
        const plainTextResponse = await browser.tabs.sendMessage(tabs[0].id, {
          action: "getSelectedText",
        });

        if (plainTextResponse && plainTextResponse.selectedText) {
          lastSelectedHtmlBlock = {
            selectedText: plainTextResponse.selectedText,
            selectedHtml: "",
          };
          currentResponse = { ...lastSelectedHtmlBlock };
          console.log(
            "Background: Found and prioritized fresh plain text selection.",
          );
        }
      } catch (e) {
        console.warn(
          "Background: Could not get fresh plain text selection from content script:",
          e,
        );
      }

      console.log(
        "Background: About to send current selection to popup. selectedText:",
        currentResponse.selectedText.substring(0, 100) + "...",
        "selectedHtml:",
        currentResponse.selectedHtml.substring(0, 100) + "...",
      );
      sendResponse(currentResponse);
    })();
    return true;
  }

  console.log(
    "Background: Unknown or unhandled message action:",
    request.action,
  );
});

// Helper function to auto-process selection
async function autoProcessSelection() {
  try {
    // Get AI configuration
    const storage = await browser.storage.sync.get([
      "aiModel",
      "geminiApiKey",
      "geminiApiUrl",
      "ollamaApiUrl",
      "ollamaModel",
      "promptType",
      "customPrompt",
    ]);
    const aiModel = storage.aiModel || "gemini";
    const geminiApiKey = storage.geminiApiKey;
    const geminiApiUrl = storage.geminiApiUrl || DEFAULT_GEMINI_API_URL;
    const ollamaApiUrl = storage.ollamaApiUrl || DEFAULT_OLLAMA_API_URL;
    const ollamaModel = storage.ollamaModel || "llama3.2:latest";
    const promptType = storage.promptType || "default";
    const customPrompt = storage.customPrompt || "";

    if (aiModel === "gemini" && !geminiApiKey) {
      console.error("Background: No Gemini API key found for auto-processing.");
      return;
    }

    if (aiModel === "ollama" && !ollamaApiUrl) {
      console.error("Background: No Ollama API URL found for auto-processing.");
      return;
    }

    console.log(`Background: Auto-processing with ${aiModel} API...`);

    // Use the same processing logic as the processText action
    let contentForLLM =
      lastSelectedHtmlBlock.selectedHtml || lastSelectedHtmlBlock.selectedText;

    const promptContent = buildPromptContent(promptType, customPrompt, contentForLLM);

    startProcessingAnimation();
    let response, data, processedText;

    if (aiModel === "gemini") {
      response = await fetch(`${geminiApiUrl}?key=${geminiApiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: promptContent,
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error(
          "Background: Gemini API error during auto-processing:",
          errorData,
        );
        stopProcessingAnimation();
        return;
      }

      data = await response.json();
      processedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    } else if (aiModel === "ollama") {
      response = await fetch(`${ollamaApiUrl}/api/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: ollamaModel,
          prompt: promptContent,
          stream: false,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          "Background: Ollama API error during auto-processing:",
          errorText,
        );
        stopProcessingAnimation();
        return;
      }

      data = await response.json();
      processedText = data.response;
    }

    if (processedText) {
      console.log("Background: Auto-processing complete, sending to TTS...");
      await processTextWithTTS(processedText.trim());
      stopProcessingAnimation();
      console.log("Background: Auto-processing and TTS complete.");
    } else {
      console.warn(
        `Background: No processed text from ${aiModel} during auto-processing.`,
      );
      stopProcessingAnimation();
    }
  } catch (error) {
    console.error("Background: Error during auto-processing:", error);
    stopProcessingAnimation();
  }
}

// TTS processing function
async function processTextWithTTS(text) {
  console.log(
    "Background: processTextWithTTS called with text length:",
    text.length,
  );

  if (!ttsApiUrl) {
    console.error("Background: TTS API URL not configured");
    throw new Error("TTS API URL not configured");
  }

  console.log("Background: TTS API URL is configured:", ttsApiUrl);

  const payload = {
    model: model,
    input: text,
    voice: voice,
    response_format: streamingMode ? "pcm" : "mp3",
    speed: speechSpeed,
  };

  console.log("Background: TTS payload:", payload);

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${ttsApiKey}`,
  };

  const endpoint = ttsApiUrl.endsWith("/")
    ? ttsApiUrl + "audio/speech"
    : ttsApiUrl + "/audio/speech";

  console.log("Background: TTS endpoint:", endpoint);

  // Stop any current playback
  if (currentAudio) {
    currentAudio.pause();
    URL.revokeObjectURL(currentAudio.src);
    currentAudio = null;
  }
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
  pcmStreamStopped = false;

  console.log("Background: Sending request to TTS API:", endpoint);

  if (streamingMode) {
    console.log("Background: Using streaming mode");
    const response = await fetch(endpoint, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(payload),
    });

    console.log("Background: TTS streaming response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Background: TTS streaming error response:", errorText);
      throw new Error(
        `TTS API request failed with status: ${response.status}, response: ${errorText}`,
      );
    }

    return processPCMStream(response);
  } else {
    console.log("Background: Using non-streaming mode");
    const response = await fetch(endpoint, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(payload),
    });

    console.log(
      "Background: TTS non-streaming response status:",
      response.status,
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Background: TTS non-streaming error response:", errorText);
      throw new Error(
        `TTS API request failed with status: ${response.status}, response: ${errorText}`,
      );
    }

    const blob = await response.blob();
    console.log("Background: Received audio blob, size:", blob.size);
    const url = URL.createObjectURL(blob);
    currentAudio = new Audio(url);
    console.log("Background: Starting audio playback");
    return currentAudio.play();
  }
}

// PCM streaming processing function
async function processPCMStream(response) {
  const sampleRate = 24000;
  const numChannels = 1;

  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
  audioContext = new (window.AudioContext || window.webkitAudioContext)({
    sampleRate: sampleRate,
  });
  pcmStreamStopped = false;
  pcmPlaybackTime = audioContext.currentTime;

  const reader = response.body.getReader();
  let leftover = new Uint8Array(0);

  async function readAndPlay() {
    while (!pcmStreamStopped) {
      const { value, done } = await reader.read();
      if (done) break;
      if (!value || value.length === 0) continue;
      if (!audioContext) break;

      let pcmData = new Uint8Array(leftover.length + value.length);
      pcmData.set(leftover, 0);
      pcmData.set(value, leftover.length);

      const bytesPerSample = 2;
      const totalSamples = Math.floor(
        pcmData.length / bytesPerSample / numChannels,
      );
      const usableBytes = totalSamples * bytesPerSample * numChannels;

      const usablePCM = pcmData.slice(0, usableBytes);
      leftover = pcmData.slice(usableBytes);

      const audioBuffer = audioContext.createBuffer(
        numChannels,
        totalSamples,
        sampleRate,
      );

      for (let channel = 0; channel < numChannels; channel++) {
        const channelData = audioBuffer.getChannelData(channel);
        for (let i = 0; i < totalSamples; i++) {
          const index = (i * numChannels + channel) * bytesPerSample;
          const sample = (usablePCM[index + 1] << 8) | usablePCM[index];
          channelData[i] =
            (sample & 0x8000 ? sample | ~0xffff : sample) / 32768;
        }
      }

      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);

      const now = audioContext.currentTime;
      if (pcmPlaybackTime < now) {
        pcmPlaybackTime = now;
      }
      source.start(pcmPlaybackTime);
      pcmPlaybackTime += audioBuffer.duration;

      source.onended = () => {
        source.disconnect();
      };
    }
    leftover = new Uint8Array(0);
  }

  return readAndPlay();
}

console.log("Background: Creating context menu item.");
browser.contextMenus.create({
  id: "processSelectedText",
  title: "Smart Reader: Process Selected Text",
  contexts: ["selection"],
});

browser.contextMenus.onClicked.addListener((info, tab) => {
  console.log("Background: Context menu item clicked.");
  if (info.menuItemId === "processSelectedText") {
    (async () => {
      const storage = await browser.storage.sync.get([
        "geminiApiKey",
        "geminiApiUrl",
      ]);
      const storedApiKey = storage.geminiApiKey;
      const storedApiUrl = storage.geminiApiUrl || DEFAULT_GEMINI_API_URL;

      if (!storedApiKey) {
        browser.notifications.create({
          type: "basic",
          iconUrl: "icons/icon-48.png",
          title: "Smart Reader Error",
          message:
            "Gemini API key not set. Please configure it in the extension popup.",
        });
        return;
      }

      lastSelectedHtmlBlock = {
        selectedText: info.selectionText,
        selectedHtml: "",
      };
      console.log(
        "Background: Context menu selection detected. Processing plain text:",
        info.selectionText.substring(0, 100) + "...",
      );

      try {
        const response = await browser.runtime.sendMessage({
          action: "processText",
          text: info.selectionText,
          geminiApiKey: storedApiKey,
          geminiApiUrl: storedApiUrl,
        });

        if (response && response.error) {
          browser.notifications.create({
            type: "basic",
            iconUrl: "icons/icon-48.png",
            title: "Smart Reader Error",
            message: "LLM processing failed: " + response.error,
          });
          console.error("Background: Context menu LLM error:", response.error);
        } else if (response && response.processedText) {
          browser.notifications.create({
            type: "basic",
            iconUrl: "icons/icon-48.png",
            title: "Smart Reader Summary",
            message: response.processedText,
          });
          console.log(
            "Background: Context menu LLM processed text:",
            response.processedText.substring(0, 100) + "...",
          );
          // TTS is now automatic in processText, no need to call separately
          if (response.ttsError) {
            console.error(
              "Background: Context menu TTS error:",
              response.ttsError,
            );
          } else if (response.ttsSuccess) {
            console.log("Background: Context menu TTS started successfully");
          }
        }
      } catch (e) {
        browser.notifications.create({
          type: "basic",
          iconUrl: "icons/icon-48.png",
          title: "Smart Reader Error",
          message:
            "An unexpected error occurred during processing: " + e.message,
        });
        console.error("Background: Context menu unexpected error:", e);
      }
    })();
  }
});
