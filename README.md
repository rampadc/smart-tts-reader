# Smart Reader Firefox Extension

Processes web content with Gemini AI or Ollama and converts it to speech using local Kokoro TTS (or OpenAI TTS endpoint). The prompt is focused on parsing and converting mathematical notation (LaTeX, MathJax) to spoken English.

You can now choose between Gemini AI (cloud-based) and Ollama (local) for text processing.

The TTS implementation is based on https://github.com/BassGaming/customtts.

## Configuration

### LLM provider

#### Option 1: Gemini AI (Cloud-based)

1. Get a free API key from [Google AI Studio](https://aistudio.google.com/apikey)
2. Open the extension popup by clicking the Smart Reader icon
3. Select "Gemini AI" as your AI model
4. In the "Gemini AI Configuration" section:
   - **API URL**: Use the default or customize for your needs
   - **API Key**: Enter your Gemini API key
5. Click "Save AI Configuration"

#### Option 2: Ollama (Local)

1. Install and run [Ollama](https://ollama.ai/) on your local machine
2. Pull a model (e.g., `ollama pull llama3.2:latest`)
3. Open the extension popup by clicking the Smart Reader icon
4. Select "Ollama" as your AI model
5. In the "Ollama Configuration" section:
   - **API URL**: Usually `http://localhost:11434` (default Ollama port)
   - **Model**: Enter the model name (e.g., `llama3.2:latest`, `mistral:latest`)
6. Click "Save AI Configuration"

### TTS Setup

TTS provider is OpenAI compatible, I recommend https://github.com/remsky/Kokoro-FastAPI/

1. Set up your TTS server (e.g., using Kokoro TTS or similar)
2. In the extension popup, configure the "TTS Configuration" section:
   - **TTS API URL**: Your TTS server endpoint (e.g., `http://localhost:8880/v1`)
   - **TTS API Key**: Usually "not-needed" for local setups
   - **Voice**: Voice identifier (e.g., `af_bella+af_sky`)
   - **Model**: TTS model name (e.g., `kokoro`)
   - **Speech Speed**: 0.1-10.0 (1.0 = normal speed)
   - **Streaming Mode**: Enable for real-time audio streaming
3. Click "Save TTS Configuration"

## Usage

### Method 1: HTML Block Selection

1. Click the Smart Reader extension icon to open the popup
2. Click "Select HTML Block"
3. The popup will close - now hover over elements on the page
4. Click on the HTML element you want to process
5. The extension will automatically:
   - Process the content with Gemini AI
   - Convert it to speech using TTS
   - Start playing the audio

### Method 2: Context Menu

1. Select any text on a webpage
2. Right-click and choose "Smart Reader: Process Selected Text"
3. The text will be processed and spoken automatically

### Controls

- **Stop Playback**: Use the "Stop Playback" button in the popup to halt audio
- **Real-time Processing**: Content is processed and spoken immediately after selection

## How It Works

1. **Content Selection**: User selects HTML blocks or text
2. **AI Processing**: Your chosen AI model (Gemini or Ollama) processes the content based on type:
   - **HTML**: Removes tags, preserves structure info
   - **Math**: Converts LaTeX/MathJax to spoken form (e.g., "∑" → "sum")
   - **Code**: Provides plain English summary
   - **Text**: Returns unchanged
3. **Speech Synthesis**: Processed text is sent to TTS
4. **Audio Playback**: High-quality speech is streamed and played
