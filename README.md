# HotTea 🍵

**Latest Version: v5.10.0**

An intelligent Chrome extension powered by Chrome Built-in AI (Prompt API) that transforms boring news articles into engaging friend group conversations, making information consumption fun and effortless.

> 🎭 **"Making news as fun as chatting with friends"** - Featuring personalized dialogues, intelligent Q&A, and character avatars

## 🌟 Core Features

### 🎭 AI-Powered Dialogue Generation
- **Character Recognition**: Automatically analyzes key figures and relationships in news articles
- **Dramatized Conversations**: Converts narrative news into lively friend group chats
- **Personalized Experience**: Customizes dialogue style based on your preferences
- **Wikipedia Avatars**: Automatically generates authentic avatars for conversation characters

### 💬 Intelligent Q&A Interaction
- **Contextual Chat**: Deep dive into news content with follow-up questions
- **Conversation Memory**: Maintains coherence across multiple question-answer rounds
- **Enhanced Understanding**: Provides richer information through integrated search capabilities

### 🔍 Advanced Content Extraction
- **Multi-Layer Architecture**: Structured data → Readability → Site-specific rules
- **Smart Detection**: Automatically filters ads and navigation content
- **Broad Support**: Specialized rules for 40+ mainstream news websites

### 🎨 Modern Interface
- **Chat-Style UI**: Messaging app-inspired bubble dialogue interface
- **Responsive Design**: Perfect fit for Chrome's side panel
- **Intuitive Controls**: One-click generation, regeneration, and Q&A interactions

## 🚀 Technical Architecture

### 🏗️ Frontend Stack
- **Chrome Manifest V3**: Latest extension standard with native side panel integration
- **Chrome Prompt API**: Direct access to browser's built-in AI via `window.ai`
- **Vanilla JavaScript**: Lightweight with zero framework dependencies
- **CSS Grid + Variables**: Responsive layout with unified theme management
- **ES6 Modules**: Modular design for easy maintenance

### ⚡ Performance Optimizations
- **Three-Layer Content Extraction**: Ensures high compatibility across various websites
- **Smart Caching**: Reuses cached results within 5-minute windows
- **Parallel Processing**: Simultaneous avatar and dialogue generation
- **Memory Management**: Automatic cleanup of expired resources

## 📁 Project Structure

```
HotTea/
├── src/                          # Frontend source code
│   ├── background.js             # Service Worker background processing
│   ├── content.js                # Content script injection
│   ├── sidepanel.js              # Side panel logic controller
│   ├── sidepanel.html            # Side panel user interface
│   ├── sidepanel.css             # Responsive styling system
│   ├── api-client.js             # API client (includes Prompt API calls)
│   └── wikipedia-avatar.js       # Wikipedia avatar service
├── lib/                          # Core libraries
│   ├── content-extractor-unified.js  # Unified content extractor
│   ├── readability-browser.js    # Mozilla Readability
│   └── readability-readerable.js # Content quality assessment
├── icons/                        # Brand icon assets
├── manifest.dev.json             # Development environment config
├── manifest.prod.json            # Production environment config
├── webpack.dev.js                # Development build configuration
├── webpack.prod.js               # Production build configuration
└── CLAUDE.md                     # Development guidelines
```

## 🛠️ Build Instructions

### 🎯 Dual Environment Build System

The project supports completely separated development and production builds:

- **Development (dist-dev/)**: For local testing
- **Production (dist-prod/)**: For Chrome Web Store deployment

### 📋 Build Commands

#### Development Environment
```bash
# Development mode (file watching)
npm run dev

# Single development build
npm run build:dev
```

#### Production Environment
```bash
# Production build
npm run build:prod

# Build both versions
npm run build:all
```

### 🚀 Workflow

#### Local Development & Testing
```bash
npm run dev              # File watching mode
# Load Chrome extension: Use dist-dev/ folder
```

#### Chrome Web Store Deployment
```bash
npm run build:prod       # Build production version
# Upload: Use dist-prod/ folder
```

### 📝 Important Notes

- ✅ **Complete Separation**: Two versions won't interfere with each other
- ✅ **Clear Identification**: Easy to distinguish test vs production builds
- ⚠️ **Don't Edit** `manifest.json` directly (will be overwritten)
- ⚠️ **Modify Configs**: Edit `manifest.dev.json` or `manifest.prod.json` instead

## 🚀 Quick Start

### 📥 Installation
1. Install HotTea from [Chrome Web Store](https://chrome.google.com/webstore) (coming soon)
2. Or download the source code for development installation

### 📖 How to Use

#### Generate Dialogues
1. **Browse News**: Open any news article on supported websites
2. **Open Side Panel**: Click the HotTea icon 🍵 in your browser toolbar
3. **One-Click Generate**: Click the "Spill the Tea!" button
4. **Enjoy**: Read the AI-transformed friend group conversation

#### Q&A Interaction
1. **Ask Questions**: Type your question in the input box below the dialogue
2. **Smart Answers**: AI responds based on the news content
3. **Deep Discussion**: Supports multiple rounds of conversation

#### Personalized Experience
- **Customization**: System adjusts dialogue style based on your preferences
- **Character Avatars**: Automatically generates authentic avatars for news figures
- **Regenerate**: Not satisfied? Generate different conversation styles

## 🎯 Supported Websites

### US Financial News
- Wall Street Journal (wsj.com)
- Bloomberg (bloomberg.com)
- CNBC (cnbc.com)
- Reuters (reuters.com)
- Financial Times (ft.com)

### Tech News
- The Verge (theverge.com)
- Ars Technica (arstechnica.com)
- Wired (wired.com)
- TechCrunch (techcrunch.com)

### General News
- BBC (bbc.com/bbc.co.uk)
- CNN (cnn.com)
- The Guardian (theguardian.com)
- New York Times (nytimes.com)
- Associated Press (apnews.com)
- NPR (npr.org)
- Washington Post (washingtonpost.com)

### Taiwan Media
- United Daily News (udn.com)
- Central News Agency (cna.com.tw)
- Mirror Media (mirrormedia.mg)
- CommonWealth Magazine (cw.com.tw)
- Liberty Times (ltn.com.tw)
- China Times (chinatimes.com)
- TVBS (tvbs.com.tw)
- CTS News (cts.com.tw)

### Cryptocurrency News
- BlockTempo (blocktempo.com)
- CoinDesk (coindesk.com)
- CoinTelegraph (cointelegraph.com)

### Smart Universal Support
- **Structured Data Priority**: JSON-LD, OpenGraph, Twitter Card, Microdata
- **Multi-Layer Extraction Strategy**: Site-specific rules → Structured data → Smart scoring
- **Built-in Caching**: Reuses results for repeated visits within 5 minutes
- **Quality Validation System**: Automatically filters navigation content to ensure accuracy

## 🔐 Privacy & Security

### 🛡️ Data Protection
- **Local Extraction**: News content is identified and extracted locally, not stored on servers
- **Minimal Data Collection**: Only stores login information and usage statistics
- **Transparent Usage**: Clear disclosure of data purposes, no hidden tracking
- **User Control**: Revoke permissions or delete account anytime

### 🔒 Security Architecture
- **Frontend Prompt API**: Direct use of browser's built-in `window.ai` API, no need to store or manage API keys in the extension, enhancing security
- **100% Local AI Processing**: All AI operations run locally in the browser, zero backend dependency for AI features
- **Privacy First**: No conversation data leaves your device

### 🔍 Open Source Transparency
- **Open Code**: Frontend code is completely open source for review
- **Security Audits**: Community security checks and reports welcome
- **Continuous Improvement**: Regular security updates and vulnerability patches

## 🛠️ Development Highlights

### Advanced Content Extraction Technology
- **Multi-Layer Extraction Strategy**: Structured data + Site-specific rules + Smart scoring
- **40+ Site-Specific Rules**: Complete support for mainstream international news websites
- **Structured Data Parsing**: JSON-LD, OpenGraph, Twitter Card, Microdata
- **Smart Content Validation**: Automatically identifies and filters navigation content

### Performance & Stability
- **Built-in Caching System**: Reuses cached results for repeated visits within 5 minutes
- **Error Recovery Mechanism**: Multiple backup extraction strategies
- **Detailed Debug Logging**: Complete extraction process analysis
- **Memory Management**: Automatic cleanup of expired cache entries

### Code Quality
- **Zero Technical Debt Architecture**: All unused code removed
- **Modular Design**: Single Responsibility Principle
- **Complete JSDoc Comments**: Detailed API documentation
- **Long-term Stability**: Future-oriented design patterns

## 📄 License

MIT License - See LICENSE file for details

## 🤝 Contributing

Issues and Pull Requests are welcome!

## 📞 Contact

Report issues or suggestions via GitHub Issues
