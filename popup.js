document.addEventListener("DOMContentLoaded", async () => {
  const selectHtmlBlockButton = document.getElementById("selectHtmlBlock");
  const statusDiv = document.getElementById("status");
  const errorDiv = document.getElementById("error");

  const geminiApiUrlInput = document.getElementById("geminiApiUrl");
  const geminiApiKeyInput = document.getElementById("geminiApiKey");
  const ollamaApiUrlInput = document.getElementById("ollamaApiUrl");
  const ollamaModelInput = document.getElementById("ollamaModel");
  const geminiRadio = document.getElementById("geminiRadio");
  const ollamaRadio = document.getElementById("ollamaRadio");
  const geminiConfig = document.getElementById("geminiConfig");
  const ollamaConfig = document.getElementById("ollamaConfig");
  const saveAiConfigButton = document.getElementById("saveAiConfig");
  const aiConfigStatusDiv = document.getElementById("aiConfigStatus");

  const defaultPromptRadio = document.getElementById("defaultPromptRadio");
  const customPromptRadio = document.getElementById("customPromptRadio");
  const customPromptConfig = document.getElementById("customPromptConfig");
  const customPromptInput = document.getElementById("customPrompt");
  const templateSelect = document.getElementById("templateSelect");
  const loadTemplateButton = document.getElementById("loadTemplate");
  const savePromptConfigButton = document.getElementById("savePromptConfig");
  const promptConfigStatusDiv = document.getElementById("promptConfigStatus");

  const ttsApiUrlInput = document.getElementById("ttsApiUrl");
  const ttsApiKeyInput = document.getElementById("ttsApiKey");
  const voiceInput = document.getElementById("voice");
  const modelInput = document.getElementById("model");
  const speechSpeedInput = document.getElementById("speechSpeed");
  const streamingModeInput = document.getElementById("streamingMode");
  const saveTtsConfigButton = document.getElementById("saveTtsConfig");
  const stopPlaybackButton = document.getElementById("stopPlayback");
  const ttsConfigStatusDiv = document.getElementById("ttsConfigStatus");

  console.log("Popup: DOMContentLoaded event fired.");

  if (selectHtmlBlockButton) {
    console.log(
      'Popup: "Select HTML Block" button element found successfully.',
    );
  } else {
    console.error(
      'Popup: ERROR: "Select HTML Block" button element NOT FOUND! Check popup.html ID.',
    );
  }

  // Load saved AI configuration
  const storage = await browser.storage.sync.get([
    "geminiApiKey",
    "geminiApiUrl",
    "ollamaApiUrl",
    "ollamaModel",
    "aiModel",
    "promptType",
    "customPrompt",
  ]);
  const storedApiKey = storage.geminiApiKey;
  const storedApiUrl = storage.geminiApiUrl;
  const storedOllamaUrl = storage.ollamaApiUrl;
  const storedOllamaModel = storage.ollamaModel;
  const storedAiModel = storage.aiModel || "gemini";
  const storedPromptType = storage.promptType || "default";
  const storedCustomPrompt = storage.customPrompt || "";

  // Set AI model radio selection
  if (storedAiModel === "ollama") {
    ollamaRadio.checked = true;
    geminiConfig.style.display = "none";
    ollamaConfig.style.display = "block";
  } else {
    geminiRadio.checked = true;
    geminiConfig.style.display = "block";
    ollamaConfig.style.display = "none";
  }

  // Set Gemini API URL (with default if not set)
  const defaultApiUrl =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
  geminiApiUrlInput.value = storedApiUrl || defaultApiUrl;

  // Set Gemini API Key
  geminiApiKeyInput.value = storedApiKey || "";

  // Set Ollama configuration
  ollamaApiUrlInput.value = storedOllamaUrl || "http://localhost:11434";
  ollamaModelInput.value = storedOllamaModel || "llama3.2:latest";

  // Set prompt configuration
  if (storedPromptType === "custom") {
    customPromptRadio.checked = true;
    customPromptConfig.style.display = "block";
  } else {
    defaultPromptRadio.checked = true;
    customPromptConfig.style.display = "none";
  }
  customPromptInput.value = storedCustomPrompt;

  // Set initial prompt status
  if (storedPromptType === "custom" && storedCustomPrompt) {
    promptConfigStatusDiv.textContent = "Custom prompt loaded.";
    promptConfigStatusDiv.style.color = "green";
  } else {
    promptConfigStatusDiv.textContent = "Using default prompt.";
    promptConfigStatusDiv.style.color = "gray";
  }

  // Set status message
  if (storedAiModel === "ollama") {
    if (storedOllamaUrl) {
      aiConfigStatusDiv.textContent = "Ollama configuration loaded.";
      aiConfigStatusDiv.style.color = "green";
    } else {
      aiConfigStatusDiv.textContent = "Please configure Ollama settings.";
      aiConfigStatusDiv.style.color = "gray";
    }
  } else {
    if (storedApiKey) {
      aiConfigStatusDiv.textContent = "Gemini configuration loaded.";
      aiConfigStatusDiv.style.color = "green";
    } else {
      aiConfigStatusDiv.textContent = "Please enter your Gemini API configuration.";
      aiConfigStatusDiv.style.color = "gray";
    }
  }

  // Load saved TTS configuration
  const ttsStorage = await browser.storage.local.get([
    "ttsApiUrl",
    "ttsApiKey",
    "speechSpeed",
    "voice",
    "model",
    "streamingMode",
  ]);
  ttsApiUrlInput.value = ttsStorage.ttsApiUrl || "http://localhost:8880/v1";
  ttsApiKeyInput.value = ttsStorage.ttsApiKey || "not-needed";
  voiceInput.value = ttsStorage.voice || "af_bella+af_sky";
  modelInput.value = ttsStorage.model || "kokoro";
  speechSpeedInput.value = ttsStorage.speechSpeed || 1.0;
  streamingModeInput.checked =
    ttsStorage.streamingMode !== undefined ? ttsStorage.streamingMode : true;

  if (ttsStorage.ttsApiUrl) {
    ttsConfigStatusDiv.textContent = "TTS configuration loaded.";
    ttsConfigStatusDiv.style.color = "green";
  } else {
    ttsConfigStatusDiv.textContent = "Please configure TTS settings.";
    ttsConfigStatusDiv.style.color = "gray";
  }
  console.log(
    "Popup: AI configuration initialized - Model:",
    storedAiModel,
    "Gemini API URL:",
    geminiApiUrlInput.value,
    "API Key:",
    geminiApiKeyInput.value ? "****" : "empty",
  );

  // Handle AI model radio button changes
  geminiRadio.addEventListener("change", () => {
    if (geminiRadio.checked) {
      geminiConfig.style.display = "block";
      ollamaConfig.style.display = "none";
    }
  });

  ollamaRadio.addEventListener("change", () => {
    if (ollamaRadio.checked) {
      geminiConfig.style.display = "none";
      ollamaConfig.style.display = "block";
    }
  });

  // Handle prompt type radio button changes
  defaultPromptRadio.addEventListener("change", () => {
    if (defaultPromptRadio.checked) {
      customPromptConfig.style.display = "none";
    }
  });

  customPromptRadio.addEventListener("change", () => {
    if (customPromptRadio.checked) {
      customPromptConfig.style.display = "block";
    }
  });

  // Prompt template functionality
  const promptTemplates = {
    summarize: "Summarize the following content in clear, concise language suitable for text-to-speech:\n\n${content}\n\nSummary:",
    explain: "Explain the following content in simple terms that anyone can understand:\n\n${content}\n\nSimple explanation:",
    bullets: "Extract the key points from the following content and present them as a clear, spoken list:\n\n${content}\n\nKey points:"
  };

  loadTemplateButton.addEventListener("click", () => {
    const selectedTemplate = templateSelect.value;
    if (selectedTemplate && promptTemplates[selectedTemplate]) {
      customPromptInput.value = promptTemplates[selectedTemplate];
      customPromptRadio.checked = true;
      customPromptConfig.style.display = "block";
      templateSelect.value = "";
    }
  });

  savePromptConfigButton.addEventListener("click", async () => {
    const promptType = defaultPromptRadio.checked ? "default" : "custom";
    const customPrompt = customPromptInput.value.trim();

    if (promptType === "custom" && !customPrompt) {
      promptConfigStatusDiv.textContent = "Custom prompt cannot be empty.";
      promptConfigStatusDiv.style.color = "red";
      return;
    }

    if (promptType === "custom" && !customPrompt.includes("${content}")) {
      promptConfigStatusDiv.textContent = "Custom prompt should include ${content} placeholder.";
      promptConfigStatusDiv.style.color = "red";
      return;
    }

    await browser.storage.sync.set({
      promptType: promptType,
      customPrompt: customPrompt,
    });

    promptConfigStatusDiv.textContent = promptType === "custom" ? 
      "Custom prompt saved!" : "Using default prompt.";
    promptConfigStatusDiv.style.color = "green";
    console.log("Popup: Saved prompt configuration - Type:", promptType);
  });

  saveAiConfigButton.addEventListener("click", async () => {
    const selectedModel = geminiRadio.checked ? "gemini" : "ollama";
    
    if (selectedModel === "gemini") {
      const apiKey = geminiApiKeyInput.value.trim();
      const apiUrl = geminiApiUrlInput.value.trim();

      if (!apiKey) {
        aiConfigStatusDiv.textContent = "Gemini API key cannot be empty.";
        aiConfigStatusDiv.style.color = "red";
        console.warn("Popup: Attempted to save empty Gemini API key.");
        return;
      }

      if (!apiUrl) {
        aiConfigStatusDiv.textContent = "Gemini API URL cannot be empty.";
        aiConfigStatusDiv.style.color = "red";
        console.warn("Popup: Attempted to save empty Gemini API URL.");
        return;
      }

      await browser.storage.sync.set({
        aiModel: selectedModel,
        geminiApiKey: apiKey,
        geminiApiUrl: apiUrl,
      });
      aiConfigStatusDiv.textContent = "Gemini configuration saved!";
      aiConfigStatusDiv.style.color = "green";
      console.log(
        "Popup: Saved Gemini configuration - URL:",
        apiUrl,
        "API Key:",
        "****",
      );
    } else {
      const ollamaUrl = ollamaApiUrlInput.value.trim();
      const ollamaModel = ollamaModelInput.value.trim();

      if (!ollamaUrl) {
        aiConfigStatusDiv.textContent = "Ollama API URL cannot be empty.";
        aiConfigStatusDiv.style.color = "red";
        console.warn("Popup: Attempted to save empty Ollama API URL.");
        return;
      }

      if (!ollamaModel) {
        aiConfigStatusDiv.textContent = "Ollama model cannot be empty.";
        aiConfigStatusDiv.style.color = "red";
        console.warn("Popup: Attempted to save empty Ollama model.");
        return;
      }

      await browser.storage.sync.set({
        aiModel: selectedModel,
        ollamaApiUrl: ollamaUrl,
        ollamaModel: ollamaModel,
      });
      aiConfigStatusDiv.textContent = "Ollama configuration saved!";
      aiConfigStatusDiv.style.color = "green";
      console.log(
        "Popup: Saved Ollama configuration - URL:",
        ollamaUrl,
        "Model:",
        ollamaModel,
      );
    }
  });

  saveTtsConfigButton.addEventListener("click", async () => {
    const ttsApiUrl = ttsApiUrlInput.value.trim();
    const ttsApiKey = ttsApiKeyInput.value.trim();
    const voice = voiceInput.value.trim();
    const model = modelInput.value.trim();
    const speechSpeed = parseFloat(speechSpeedInput.value);
    const streamingMode = streamingModeInput.checked;

    if (!ttsApiUrl) {
      ttsConfigStatusDiv.textContent = "TTS API URL cannot be empty.";
      ttsConfigStatusDiv.style.color = "red";
      console.warn("Popup: Attempted to save empty TTS API URL.");
      return;
    }

    if (isNaN(speechSpeed) || speechSpeed < 0.1 || speechSpeed > 10.0) {
      ttsConfigStatusDiv.textContent =
        "Speech speed must be between 0.1 and 10.0.";
      ttsConfigStatusDiv.style.color = "red";
      console.warn("Popup: Invalid speech speed value.");
      return;
    }

    await browser.storage.local.set({
      ttsApiUrl: ttsApiUrl,
      ttsApiKey: ttsApiKey,
      voice: voice,
      model: model,
      speechSpeed: speechSpeed,
      streamingMode: streamingMode,
    });
    ttsConfigStatusDiv.textContent = "TTS configuration saved!";
    ttsConfigStatusDiv.style.color = "green";
    console.log("Popup: Saved TTS configuration");
  });

  stopPlaybackButton.addEventListener("click", async () => {
    try {
      await browser.runtime.sendMessage({ action: "stopPlayback" });
      console.log("Popup: Stop playback message sent.");
    } catch (e) {
      console.error("Popup: Error sending stop playback message:", e);
    }
  });

  // Add test TTS button for debugging
  const testTtsButton = document.createElement("button");
  testTtsButton.textContent = "Test TTS";
  testTtsButton.style.marginTop = "8px";
  testTtsButton.addEventListener("click", async () => {
    try {
      ttsConfigStatusDiv.textContent = "Testing TTS...";
      ttsConfigStatusDiv.style.color = "blue";

      console.log("Popup: Starting TTS test...");
      console.log("Popup: Sending test message to background script");

      const response = await browser.runtime.sendMessage({
        action: "speakText",
        text: "This is a test of the TTS system.",
      });

      console.log("Popup: TTS test response received:", response);
      console.log("Popup: TTS test response type:", typeof response);

      if (response && response.success) {
        ttsConfigStatusDiv.textContent = "TTS test successful!";
        ttsConfigStatusDiv.style.color = "green";
        console.log("Popup: TTS test reported success");
      } else if (response && response.error) {
        ttsConfigStatusDiv.textContent = "TTS test failed: " + response.error;
        ttsConfigStatusDiv.style.color = "red";
        console.error("Popup: TTS test failed with error:", response.error);
      } else {
        ttsConfigStatusDiv.textContent = "TTS test - no response received";
        ttsConfigStatusDiv.style.color = "orange";
        console.error("Popup: TTS test - invalid response:", response);
      }
    } catch (e) {
      ttsConfigStatusDiv.textContent = "TTS test error: " + e.message;
      ttsConfigStatusDiv.style.color = "red";
      console.error("Popup: TTS test error:", e);
      console.error("Popup: TTS test error stack:", e.stack);
    }
  });

  // Insert test button after stop button
  stopPlaybackButton.parentNode.insertBefore(testTtsButton, ttsConfigStatusDiv);

  // The popup will ALWAYS ask the background script for the current selected text.
  // This initial call might return empty if no block has been selected yet.
  try {
    console.log(
      "Popup: Requesting current selected text/HTML block from background on load.",
    );
    const currentSelection = await browser.runtime.sendMessage({
      action: "getCurrentSelection",
    });

    if (currentSelection && currentSelection.selectedText) {
      statusDiv.textContent = "Text loaded for processing.";
      errorDiv.textContent = "";
      console.log(
        "Popup: Loaded text into display:",
        currentSelection.selectedText,
      );
      console.log(
        "Popup: Background reports full HTML available:",
        currentSelection.selectedHtml !== "",
      );
      // Get current AI configuration
      const currentAiConfig = await browser.storage.sync.get([
        "aiModel",
        "geminiApiKey",
        "geminiApiUrl",
        "ollamaApiUrl",
        "ollamaModel",
      ]);
      
      await processLoadedText(
        currentSelection.selectedText,
        {
          aiModel: currentAiConfig.aiModel || "gemini",
          geminiApiKey: currentAiConfig.geminiApiKey,
          geminiApiUrl: currentAiConfig.geminiApiUrl,
          ollamaApiUrl: currentAiConfig.ollamaApiUrl,
          ollamaModel: currentAiConfig.ollamaModel,
          promptType: currentAiConfig.promptType || "default",
          customPrompt: currentAiConfig.customPrompt || "",
        }
      ); // Call processing
    } else {
      statusDiv.textContent = "Select an HTML block to begin.";
      console.log(
        "Popup: No current selection found in background on initial load. Awaiting user action.",
      );
    }
  } catch (err) {
    console.error(
      "Popup: Error getting current selection from background:",
      err,
    );
  }

  window.updateSelection = async function (selectedText, selectedHtml) {
    console.log("Popup: updateSelection called directly by background script.");
    statusDiv.textContent = "HTML block selected. Processing...";
    errorDiv.textContent = "";
    console.log(
      "Popup: Text display updated by background script with newly selected HTML block text:",
      selectedText,
    );
    
    // Get current AI configuration
    const currentAiConfig = await browser.storage.sync.get([
      "aiModel",
      "geminiApiKey",
      "geminiApiUrl",
      "ollamaApiUrl",
      "ollamaModel",
      "promptType",
      "customPrompt",
    ]);
    
    await processLoadedText(
      selectedText,
      {
        aiModel: currentAiConfig.aiModel || "gemini",
        geminiApiKey: currentAiConfig.geminiApiKey,
        geminiApiUrl: currentAiConfig.geminiApiUrl,
        ollamaApiUrl: currentAiConfig.ollamaApiUrl,
        ollamaModel: currentAiConfig.ollamaModel,
        promptType: currentAiConfig.promptType || "default",
        customPrompt: currentAiConfig.customPrompt || "",
      }
    ); // Call processing
  };

  selectHtmlBlockButton.addEventListener("click", async () => {
    console.log('Popup: "Select HTML Block" button clicked - Listener Fired!');
    statusDiv.textContent =
      "Click on an HTML element on the page to select it...";
    errorDiv.textContent = "";
    console.log(
      'Popup: "Select HTML Block" button clicked. Notifying background this is popup-initiated.',
    );

    // Notify background that this selection is popup-initiated
    await browser.runtime.sendMessage({ action: "initiatePopupSelection" });

    console.log("Popup: Sending activation message to content script.");
    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    await browser.tabs.sendMessage(tab.id, { action: "activateSelectionMode" });
    window.close(); // Close the popup so the user can interact with the page
    console.log('Popup: Popup closed after "Select HTML Block" button click.');
  });

  async function processLoadedText(textToProcess, aiConfig) {
    console.log(
      "Popup: Initiating automatic process with text:",
      textToProcess.substring(0, 50) + "...",
    );
    console.log("Popup: Using AI model:", aiConfig.aiModel);

    if (!textToProcess) {
      errorDiv.textContent = "No text to process.";
      statusDiv.textContent = "";
      console.warn(
        "Popup: textToProcess is empty. Aborting automatic process.",
      );
      return;
    }

    if (aiConfig.aiModel === "gemini") {
      if (!aiConfig.geminiApiKey) {
        errorDiv.textContent = "Please enter and save a Gemini API key.";
        statusDiv.textContent = "";
        console.warn("Popup: geminiApiKey is empty. Aborting automatic process.");
        return;
      }

      if (!aiConfig.geminiApiUrl) {
        errorDiv.textContent = "Please enter and save a Gemini API URL.";
        statusDiv.textContent = "";
        console.warn("Popup: geminiApiUrl is empty. Aborting automatic process.");
        return;
      }
    } else if (aiConfig.aiModel === "ollama") {
      if (!aiConfig.ollamaApiUrl) {
        errorDiv.textContent = "Please enter and save an Ollama API URL.";
        statusDiv.textContent = "";
        console.warn("Popup: ollamaApiUrl is empty. Aborting automatic process.");
        return;
      }

      if (!aiConfig.ollamaModel) {
        errorDiv.textContent = "Please enter and save an Ollama model.";
        statusDiv.textContent = "";
        console.warn("Popup: ollamaModel is empty. Aborting automatic process.");
        return;
      }
    }

    statusDiv.textContent = `Processing text with ${aiConfig.aiModel === "gemini" ? "Gemini AI" : "Ollama"}...`;
    errorDiv.textContent = "";

    console.log(
      'Popup: Automatically attempting to send "processText" message to background script.',
    );
    try {
      const response = await browser.runtime.sendMessage({
        action: "processText",
        text: textToProcess,
        aiModel: aiConfig.aiModel,
        geminiApiKey: aiConfig.geminiApiKey,
        geminiApiUrl: aiConfig.geminiApiUrl,
        ollamaApiUrl: aiConfig.ollamaApiUrl,
        ollamaModel: aiConfig.ollamaModel,
        promptType: aiConfig.promptType,
        customPrompt: aiConfig.customPrompt,
      });
      console.log(
        'Popup: "processText" message sent to background script for automatic process.',
      );

      if (response && response.error) {
        errorDiv.textContent = "Error: " + response.error;
        statusDiv.textContent = "";
        console.error(
          "Popup: Received error response from background script for automatic processText:",
          response.error,
        );
      } else if (response && response.processedText) {
        statusDiv.textContent = "Sending to TTS for speech...";
        console.log(
          "Popup: Received processed text from background script for automatic process:",
          response.processedText,
        );
        console.log(
          "Popup: processedText length:",
          response.processedText.length,
        );
        console.log("Popup: About to call speakText with full text");

        try {
          console.log(
            "Popup: Sending speakText message to background script...",
          );
          console.log("Popup: speakText payload:", {
            action: "speakText",
            text: response.processedText.substring(0, 100) + "...",
          });

          const ttsResponse = await browser.runtime.sendMessage({
            action: "speakText",
            text: response.processedText,
          });

          console.log("Popup: TTS message sent, waiting for response...");
          console.log("Popup: Received TTS response:", ttsResponse);
          console.log("Popup: TTS response type:", typeof ttsResponse);
          console.log(
            "Popup: TTS response keys:",
            ttsResponse ? Object.keys(ttsResponse) : "null/undefined",
          );

          if (ttsResponse && ttsResponse.success) {
            statusDiv.textContent = "Playing audio via TTS...";
            console.log("Popup: TTS reported success, audio should be playing");
          } else if (ttsResponse && ttsResponse.error) {
            statusDiv.textContent = "";
            errorDiv.textContent = "TTS Error: " + ttsResponse.error;
            console.error("Popup: TTS reported error:", ttsResponse.error);
          } else {
            statusDiv.textContent = "";
            errorDiv.textContent =
              "TTS: No valid response received from background script";
            console.error("Popup: TTS response was invalid:", ttsResponse);
          }
        } catch (ttsError) {
          statusDiv.textContent = "";
          errorDiv.textContent = "TTS Error: " + ttsError.message;
          console.error("Popup: TTS exception caught:", ttsError);
          console.error("Popup: TTS exception stack:", ttsError.stack);
        }
        console.log('Popup: "speakText" message processing complete.');
        // Optional: Close popup automatically after speaking, or keep open for status
        // setTimeout(() => window.close(), 3000);
      } else {
        errorDiv.textContent = "No response received from background script.";
        statusDiv.textContent = "";
        console.error(
          "Popup: Undefined or invalid response from background script:",
          response,
        );
      }
    } catch (e) {
      errorDiv.textContent =
        "An unexpected error occurred during automatic processing: " +
        e.message;
      statusDiv.textContent = "";
      console.error(
        "Popup: Uncaught error during automatic message sending or processing:",
        e,
      );
    }
  }
});
