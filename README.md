# Smart Reader Firefox Extension

A Firefox extension that processes web content with Gemini AI and converts it to speech using local Kokoro TTS (or OpenAI TTS endpoint). The prompt for Gemini is focused on parsing and converting mathematical notation (LaTeX, MathJax) to spoken English.

I have tried Ollama models but so far found Gemini to be most accurate.

The TTS implementation is based on https://github.com/BassGaming/customtts.

## Features

- **HTML Block Selection**: Click and select specific HTML elements from web pages
- **AI-Powered Text Processing**: Uses Google Gemini AI to:
  - Parse and convert mathematical notation (LaTeX, MathJax) to spoken English
  - Summarize code blocks for better TTS comprehension
  - Clean HTML tags for clear speech output
  - Pass through normal text unchanged
- **High-Quality TTS**: Integrated with TTS for superior speech synthesis
  - Streaming audio support for immediate playback
  - Multiple voice options
  - Configurable speech speed
  - OpenAI-compatible API format

## Installation

1. Clone or download this repository
2. Open Firefox and navigate to `about:debugging`
3. Click "This Firefox" in the sidebar
4. Click "Load Temporary Add-on"
5. Select the `manifest.json` file from the `tts-firefox-preprocess` folder

## Configuration

### Gemini AI Setup

1. Get a free API key from [Google AI Studio](https://aistudio.google.com/apikey)
2. Open the extension popup by clicking the Smart Reader icon
3. In the "Gemini AI Configuration" section:
   - **API URL**: Use the default or customize for your needs
   - **API Key**: Enter your Gemini API key
4. Click "Save Gemini Configuration"

### TTS Setup

You'll need a running TTS server (compatible with OpenAI TTS API format):

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
2. **AI Processing**: Gemini AI processes the content based on type:
   - **HTML**: Removes tags, preserves structure info
   - **Math**: Converts LaTeX/MathJax to spoken form (e.g., "∑" → "sum")
   - **Code**: Provides plain English summary
   - **Text**: Returns unchanged
3. **Speech Synthesis**: Processed text is sent to TTS
4. **Audio Playback**: High-quality speech is streamed and played

## API Compatibility

### Gemini AI

- Uses Google's Generative Language API
- Compatible with current and future Gemini models
- Configurable API endpoints for flexibility

### TTS

- OpenAI TTS API compatible format
- Supports both streaming (PCM) and standard (MP3) modes
- Works with various TTS backends (Kokoro, etc.)

## Troubleshooting

### Common Issues

**"Gemini API key not set"**

- Ensure you've entered a valid API key in the configuration
- Check that your API key has proper permissions

**"TTS API URL not configured"**

- Verify your CustomTTS server is running
- Check the API URL format (should include `/v1` endpoint)

**No audio playback**

- Confirm TTS server is accessible
- Try disabling streaming mode if having issues
- Check browser audio permissions

**"TTS API URL not configured"**

- Verify your TTS server is running
- Check the API URL format (should include `/v1` endpoint)

**Extension not loading**

- Reload the extension in `about:debugging`
- Clear browser cache and restart Firefox

### Debug Information

Check the browser console (F12) for detailed logs:

- Background script logs start with "Background:"
- Popup script logs start with "Popup:"
- Content script logs start with "Content Script:"

## Development

### File Structure

```
tts-firefox-preprocess/
├── background.js      # Main extension logic, API handling
├── content.js         # Page interaction, HTML selection
├── popup.html         # Extension popup interface
├── popup.js           # Popup logic and configuration
├── popup.css          # Popup styling
├── manifest.json      # Extension manifest
└── icons/             # Extension icons
```

### Key Functions

- `processTextWithTTS()`: Handles TTS API communication
- `processPCMStream()`: Manages streaming audio playback
- `updateSelection()`: Updates popup when content is selected

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly with different content types
5. Submit a pull request

## License

This project is open source. Please check the LICENSE file for details.

## Dependencies

- **Firefox**: Version 79.0 or higher
- **Gemini AI**: Google's Generative Language API
- **TTS Server**: OpenAI-compatible TTS API

## Support

For issues and feature requests, please use the GitHub issue tracker.
