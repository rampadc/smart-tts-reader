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
          relu(x): "rectified linear unit of x" or "ReLU of x"
          softmax(x): "softmax of x"
          sigmoid(x): "sigmoid of x"
          tanh(x): "tanh of x"
          matmul(A, B): "matrix multiplication of A and B" or "A times B" (contextual)
          conv2d(input, filters): "two D convolution of input with filters"
          pool(x): "pooling of x"
          flatten(x): "flatten x"
          dropout(x, rate): "dropout of x with rate"
          loss(y_true, y_pred): "loss of y true and y predicted"
          grad_ij(f(W), w_ij): "partial derivative of f of W with respect to W at position i, j"
          Interpretation Principles:

          Use context for best phrasing.
          Never speak internal formatting like LaTeX commands.
          Avoid repeating math syntax; just describe the meaning clearly.
          Maintain smooth phrasing for nested expressions.
          Favor what a tutor would say aloud when explaining.
          If the content is within a <code> block and contains mathematical expressions, interpret them using the rules above and return the spoken English equivalent.
          If the content includes programming syntax (e.g., loops, function calls, variables), return a spoken English summary suitable for TTS.
          Otherwise, return the input text exactly as-is—unchanged and unformatted.`;

function buildPromptContent(promptType, customPrompt, contentForLLM) {
  if (promptType === "custom" && customPrompt.trim()) {
    return customPrompt.trim() + "\n\nContent to process:\n" + contentForLLM;
  }
  return DEFAULT_PROMPT_CONTENT + "\n\nContent to process:\n" + contentForLLM;
}

// Flag to track if selection was initiated from popup vs context menu
let selectionFromPopup = false;

// TTS configuration
let ttsApiUrl = "";
let ttsApiKey = "";
let speechSpeed = 1.0;
let voice = "af_bella+af_sky";
let model = "kokoro";
let streamingMode = true;
// Audio state management
const AUDIO_STATES = {
  IDLE: "idle",
  PLAYING: "playing",
  STOPPING: "stopping",
};
let audioState = AUDIO_STATES.IDLE;
let currentAudio = null;

let audioContext = null;
let pcmStreamStopped = false;
let pcmPlaybackTime = 0;

// Function to safely cleanup audio resources
async function cleanupAudioResources() {
  audioState = AUDIO_STATES.STOPPING;

  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }

  if (audioContext) {
    pcmStreamStopped = true;
    try {
      await audioContext.close();
    } catch (error) {
      console.error("Error closing audio context:", error);
    }
    audioContext = null;
  }

  pcmPlaybackTime = 0;
  audioState = AUDIO_STATES.IDLE;
}

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

browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log(
    "Background: Received message with action:",
    request.action,
    "from sender:",
    sender.id || "self",
  );



  if (request.action === "storeSelectedHtmlBlock") {
    console.log("Background: Received HTML block from content script, length:", request.html.length);
    
    // Extract text from HTML immediately
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = request.html;
    const textContent = tempDiv.innerText || tempDiv.textContent || '';
    
    if (textContent && textContent.trim()) {
      console.log("Background: Processing HTML block immediately, text length:", textContent.length);
      
      // Get AI configuration and process immediately
      (async () => {
        try {
          const aiStorage = await browser.storage.sync.get([
            "geminiApiKey",
            "geminiApiUrl",
            "ollamaApiUrl", 
            "ollamaModel",
            "aiModel",
            "promptType",
            "customPrompt",
          ]);

          const geminiApiKey = aiStorage.geminiApiKey;
          const geminiApiUrl = aiStorage.geminiApiUrl || DEFAULT_GEMINI_API_URL;
          const ollamaApiUrl = aiStorage.ollamaApiUrl || DEFAULT_OLLAMA_API_URL;
          const ollamaModel = aiStorage.ollamaModel || "llama3.2:latest";
          const aiModel = aiStorage.aiModel || "gemini";
          const promptType = aiStorage.promptType || "default";
          const customPrompt = aiStorage.customPrompt || "";

          // Validate AI configuration
          if (aiModel === "gemini" && (!geminiApiKey || !geminiApiUrl)) {
            console.error("Background: Gemini API key or URL not configured");
            return;
          }
          if (aiModel === "ollama" && (!ollamaApiUrl || !ollamaModel)) {
            console.error("Background: Ollama API URL or model not configured");
            return;
          }

          // Process with AI immediately
          const result = await handleProcessText(
            textContent,
            aiModel,
            geminiApiKey,
            geminiApiUrl,
            ollamaApiUrl,
            ollamaModel,
            promptType,
            customPrompt
          );

          if (result.error) {
            console.error("Background: Error processing HTML block:", result.error);
          } else {
            console.log("Background: HTML block processed successfully");
          }
        } catch (error) {
          console.error("Background: Error in immediate HTML block processing:", error);
        }
      })();
    }
    
    sendResponse({ success: true });
    return true;
  }

  if (request.action === "initiatePopupSelection") {
    console.log("Background: Received popup-initiated selection request");
    selectionFromPopup = true;
    sendResponse({ success: true });
    return true;
  }

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

    const contentForLLM = textToProcess;

    const promptContent = buildPromptContent(
      promptType,
      customPrompt,
      contentForLLM,
    );

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
          sendResponse({
            error: `No processed text received from ${aiModel}.`,
          });
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

    // Reload TTS settings to ensure they're current
    reloadTtsSettings()
      .then(() => {
        console.log("Background: TTS settings refreshed, current values:");
        console.log("Background: TTS API URL:", ttsApiUrl);

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

    return true;
  }

  if (request.action === "stopPlayback") {
    console.log('Background: Handling "stopPlayback" action.');
    cleanupAudioResources()
      .then(() => {
        sendResponse({ success: true });
      })
      .catch((error) => {
        console.error("Background: Error stopping playback:", error);
        sendResponse({ error: error.message });
      });
    return true;
  }

  if (request.action === "reloadTtsSettings") {
    console.log("Background: Received reloadTtsSettings message");

    reloadTtsSettings()
      .then(() => {
        sendResponse({ success: true });
      })
      .catch((error) => {
        console.error("Background: Error reloading TTS settings:", error);
        sendResponse({ error: error.message });
      });
    return true;
  }

  console.log(
    "Background: Unknown or unhandled message action:",
    request.action,
  );
});

console.log("Background: Message listener initialized.");

// Create context menu items
browser.contextMenus.create({
  id: "selectHtmlBlock",
  title: "Select HTML Block for TTS",
  contexts: ["page"],
});

browser.contextMenus.create({
  id: "processSelectedText",
  title: "Process Selected Text + HTML Context",
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
  } else if (info.menuItemId === "processSelectedText") {
    console.log("Background: Context menu 'Process Selected Text + HTML Context' clicked");
    selectionFromPopup = false; // Mark as context menu selection
    // Send message to content script to get selected text and containing HTML blocks
    browser.tabs
      .sendMessage(tab.id, { action: "getSelectedTextWithBlocks" })
      .then((response) => {
        if (response && response.text) {
          console.log(
            "Background: Received multi-block selection from content script",
          );
          // Process immediately without storing
          const textContent = response.text;
          const htmlContent = response.html;
          
          if (htmlContent && htmlContent.trim()) {
            // Process HTML content with context immediately
            (async () => {
              try {
                const aiStorage = await browser.storage.sync.get([
                  "geminiApiKey",
                  "geminiApiUrl",
                  "ollamaApiUrl", 
                  "ollamaModel",
                  "aiModel",
                  "promptType",
                  "customPrompt",
                ]);

                const geminiApiKey = aiStorage.geminiApiKey;
                const geminiApiUrl = aiStorage.geminiApiUrl || DEFAULT_GEMINI_API_URL;
                const ollamaApiUrl = aiStorage.ollamaApiUrl || DEFAULT_OLLAMA_API_URL;
                const ollamaModel = aiStorage.ollamaModel || "llama3.2:latest";
                const aiModel = aiStorage.aiModel || "gemini";
                const promptType = aiStorage.promptType || "default";
                const customPrompt = aiStorage.customPrompt || "";

                // Extract text from HTML for processing
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = htmlContent;
                const processText = tempDiv.innerText || tempDiv.textContent || textContent;

                const result = await handleProcessText(
                  processText,
                  aiModel,
                  geminiApiKey,
                  geminiApiUrl,
                  ollamaApiUrl,
                  ollamaModel,
                  promptType,
                  customPrompt
                );

                if (result.error) {
                  browser.notifications.create({
                    type: "basic",
                    iconUrl: "icons/icon-48.png",
                    title: "Smart Reader Error",
                    message: "Processing failed: " + result.error,
                  });
                } else {
                  browser.notifications.create({
                    type: "basic",
                    iconUrl: "icons/icon-48.png",
                    title: "Smart Reader",
                    message: "Processing completed successfully",
                  });
                }
              } catch (error) {
                console.error("Background: Error processing HTML context selection:", error);
                browser.notifications.create({
                  type: "basic",
                  iconUrl: "icons/icon-48.png",
                  title: "Smart Reader Error",
                  message: "An unexpected error occurred: " + error.message,
                });
              }
            })();
          }
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

async function autoProcessSelection() {
  console.log("Background: autoProcessSelection called");
  
  try {
    // This function is now mainly used for context menu selections
    // HTML block selections are processed immediately in storeSelectedHtmlBlock
    
    // Get current tab for text selection
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      throw new Error("No active tab found");
    }

    // Get text selection from content script
    const selectionResponse = await browser.tabs.sendMessage(tab.id, {
      action: "getSelectedText"
    });

    if (!selectionResponse || !selectionResponse.success) {
      throw new Error("No text selected or could not get selection");
    }

    const selectedText = selectionResponse.text;
    if (!selectedText || selectedText.trim() === "") {
      throw new Error("No text selected");
    }

    console.log("Background: Processing selected text, length:", selectedText.length);

    // Get AI configuration
    const aiStorage = await browser.storage.sync.get([
      "geminiApiKey",
      "geminiApiUrl",
      "ollamaApiUrl", 
      "ollamaModel",
      "aiModel",
      "promptType",
      "customPrompt",
    ]);

    const geminiApiKey = aiStorage.geminiApiKey;
    const geminiApiUrl = aiStorage.geminiApiUrl || DEFAULT_GEMINI_API_URL;
    const ollamaApiUrl = aiStorage.ollamaApiUrl || DEFAULT_OLLAMA_API_URL;
    const ollamaModel = aiStorage.ollamaModel || "llama3.2:latest";
    const aiModel = aiStorage.aiModel || "gemini";
    const promptType = aiStorage.promptType || "default";
    const customPrompt = aiStorage.customPrompt || "";

    // Validate AI configuration
    if (aiModel === "gemini" && (!geminiApiKey || !geminiApiUrl)) {
      throw new Error("Gemini API key or URL not configured");
    }
    if (aiModel === "ollama" && (!ollamaApiUrl || !ollamaModel)) {
      throw new Error("Ollama API URL or model not configured");
    }

    // Process with AI
    const processResult = await handleProcessText(
      selectedText,
      aiModel,
      geminiApiKey,
      geminiApiUrl,
      ollamaApiUrl,
      ollamaModel,
      promptType,
      customPrompt
    );

    if (processResult.error) {
      throw new Error(processResult.error);
    }

    console.log("Background: Auto-processing completed successfully");
    return processResult;

  } catch (error) {
    console.error("Background: Error in autoProcessSelection:", error);
    throw error;
  }
}

async function handleProcessText(
  text,
  aiModel,
  geminiApiKey,
  geminiApiUrl,
  ollamaApiUrl,
  ollamaModel,
  promptType,
  customPrompt,
) {
  const contentForLLM = text.trim();
  const promptContent = buildPromptContent(
    promptType,
    customPrompt,
    contentForLLM,
  );

  console.log("Background: LLM prompt constructed.");

  try {
    startProcessingAnimation();
    let response, data, processedText;

    if (aiModel === "gemini") {
      console.log("Background: Attempting fetch to Gemini API:", geminiApiUrl);

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
        const errorText = await response.text();
        console.error(
          "Background: Gemini API error:",
          response.status,
          errorText,
        );
        stopProcessingAnimation();
        return {
          error: `Gemini API error: ${response.statusText}. Please check your API key and URL.`,
        };
      }

      data = await response.json();
      processedText = data.candidates[0].content.parts[0].text;
    } else if (aiModel === "ollama") {
      console.log("Background: Attempting fetch to Ollama API:", ollamaApiUrl);

      const ollamaEndpoint = ollamaApiUrl.endsWith("/")
        ? ollamaApiUrl + "api/generate"
        : ollamaApiUrl + "/api/generate";

      response = await fetch(ollamaEndpoint, {
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
          "Background: Ollama API error:",
          response.status,
          errorText,
        );
        stopProcessingAnimation();
        return {
          error: `Ollama API error: ${response.statusText}. Make sure Ollama is running and the model is available.`,
        };
      }

      data = await response.json();
      processedText = data.response;
    }

    console.log("Background: Fetch request sent. Checking response status.");

    if (processedText) {
      console.log(
        "Background: LLM processed text (before TTS):",
        processedText.trim(),
      );

      // Automatically send to TTS after AI processing
      console.log("Background: Automatically sending to TTS...");
      try {
        const ttsResult = await processTextWithTTS(processedText.trim());
        stopProcessingAnimation();
        if (ttsResult && ttsResult.error) {
          return { error: ttsResult.error };
        }
        console.log("Background: TTS playback started successfully");
        return {
          processedText: processedText.trim(),
          ttsSuccess: true,
        };
      } catch (ttsError) {
        console.error("Background: TTS error:", ttsError);
        return {
          processedText: processedText.trim(),
          error: "TTS failed: " + ttsError.message,
        };
      }
    } else {
      console.warn("Background: No processed text received from LLM");
      stopProcessingAnimation();
      return { error: "No processed text received from LLM" };
    }
  } catch (error) {
    console.error("Background: Error in handleProcessText:", error);
    stopProcessingAnimation();
    return { error: "Processing failed: " + error.message };
  }
}

// TTS processing function
async function processTextWithTTS(text) {
  // Clean up any existing audio before starting new playback
  await cleanupAudioResources();

  // Prevent multiple simultaneous playbacks
  if (audioState !== AUDIO_STATES.IDLE) {
    console.log("Background: Audio playback already in progress");
    return;
  }

  audioState = AUDIO_STATES.PLAYING;
  console.log(
    "Background: processTextWithTTS called with text length:",
    text.length,
  );

  if (!ttsApiUrl) {
    console.error("Background: TTS API URL not configured");
    audioState = AUDIO_STATES.IDLE;
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

  // Audio resources already cleaned up by cleanupAudioResources()
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
      audioState = AUDIO_STATES.IDLE;
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
      audioState = AUDIO_STATES.IDLE;
      throw new Error(
        `TTS API request failed with status: ${response.status}, response: ${errorText}`,
      );
    }

    const blob = await response.blob();
    console.log("Background: Received audio blob, size:", blob.size);
    const url = URL.createObjectURL(blob);
    currentAudio = new Audio(url);
    currentAudio.onended = () => {
      URL.revokeObjectURL(url);
      currentAudio = null;
      audioState = AUDIO_STATES.IDLE;
    };
    currentAudio.onerror = (error) => {
      console.error("Background: Audio playback error:", error);
      URL.revokeObjectURL(url);
      currentAudio = null;
      audioState = AUDIO_STATES.IDLE;
    };
    console.log("Background: Starting audio playback");
    return currentAudio.play();
  }
}

// PCM streaming processing function
async function processPCMStream(response) {
  const sampleRate = 24000;
  const numChannels = 1;

  // Ensure clean state before starting
  if (audioState !== AUDIO_STATES.PLAYING) {
    console.log(
      "Background: Cannot start PCM stream while not in playing state",
    );
    return;
  }

  audioContext = new (window.AudioContext || window.webkitAudioContext)({
    sampleRate: sampleRate,
  });
  pcmStreamStopped = false;
  pcmPlaybackTime = audioContext.currentTime;

  const reader = response.body.getReader();
  let leftover = new Uint8Array(0);

  async function readAndPlay() {
    while (!pcmStreamStopped && audioState === AUDIO_STATES.PLAYING) {
      const { value, done } = await reader.read();
      if (done) {
        audioState = AUDIO_STATES.IDLE;
        break;
      }
      if (!value || value.length === 0) continue;
      if (!audioContext || audioState !== AUDIO_STATES.PLAYING) break;

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
