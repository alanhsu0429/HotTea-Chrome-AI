# HotTea 🍵

**最新版本：v5.10.0**

一個智能的 Chrome 擴充程式，結合 Google Gemini AI 與 Supabase 後端，將沉悶的新聞轉換為生動有趣的朋友群組對話，讓資訊獲取變得輕鬆愉快。

> 🎭 **"讓新聞像朋友聊天一樣有趣"** - 支援個人化對話、智能問答、角色頭像生成

## 🌟 核心功能

### 🎭 智能對話生成
- **AI 角色識別**: 自動分析新聞中的主要人物與背景關係
- **戲劇化對話**: 將敘述性新聞轉換為生動的朋友群組聊天
- **個人化體驗**: 根據用戶名稱客製化對話風格與內容
- **維基百科頭像**: 自動為對話角色生成相關的真實頭像

### 💬 智能問答互動
- **延續對話**: 針對新聞內容進行深度問答
- **上下文記憶**: 維持問答歷史的連貫性
- **Google Search 增強**: 整合搜尋結果提供更豐富的資訊

### 🔍 先進內容擷取
- **三層架構**: 結構化資料 → Readability → 網站規則
- **智能識別**: 自動過濾廣告與導航內容
- **多網站支援**: 40+ 主流新聞網站專用規則

### 🎨 現代化介面
- **聊天風格**: 仿即時通訊的泡泡對話介面
- **響應式設計**: 完美適應 Chrome 側邊欄
- **直觀操作**: 一鍵生成、重新生成、問答互動

## 🚀 技術架構

### 🏗️ 前端技術棧
- **Chrome Manifest V3**: 最新擴充功能規範，原生側邊欄整合
- **Chrome Prompt API**: 透過 `window.ai` 直接存取瀏覽器內建 AI 模型
- **Vanilla JavaScript**: 輕量化，無框架依賴
- **CSS Grid + Variables**: 響應式佈局與統一主題管理
- **ES6 Modules**: 模組化設計，易於維護

### 🔒 後端基礎設施 (Supabase)
- **用戶管理**: 透過 Google OAuth 2.0 進行身份認證
- **數據儲存 (PostgreSQL)**: 儲存用戶資料與使用量
- **Edge Functions**: 用於處理用戶註冊與卸載追蹤等輔助功能

### ⚡ 性能優化
- **三層內容擷取**: 確保各種網站的高相容性
- **智能快取**: 5 分鐘內重複訪問使用快取
- **並行處理**: 頭像與對話同步生成
- **記憶體管理**: 自動清理過期資源

## 📁 專案結構

```
HotTea/
├── src/                          # 前端源代碼
│   ├── background.js             # Service Worker 背景處理
│   ├── content.js                # 網頁內容腳本注入
│   ├── sidepanel.js              # 側邊欄邏輯控制
│   ├── sidepanel.html            # 側邊欄用戶介面
│   ├── sidepanel.css             # 響應式樣式系統
│   ├── api-client.js             # API 客戶端 (包含 Prompt API 呼叫)
│   ├── config.js                 # 安全配置載入器
│   └── wikipedia-avatar.js       # 維基百科頭像服務
├── lib/                          # 核心函式庫
│   ├── content-extractor-unified.js  # 統一內容擷取器
│   ├── readability-browser.js    # Mozilla Readability
│   └── readability-readerable.js # 內容品質評估
├── supabase/                     # 後端服務 (用戶管理)
│   ├── functions/log-uninstall/  # Edge Function: 卸載日誌
│   └── migrations/               # 資料庫結構定義
├── icons/                        # 品牌圖標資源
├── manifest.dev.json             # 開發環境配置
├── manifest.prod.json            # 生產環境配置
├── config.example.json           # 配置範本
├── webpack.dev.js                # 開發建置配置
├── webpack.prod.js               # 生產建置配置
├── GEMINI.md                     # 開發規範
├── DEPLOY_GUIDE.md              # 部署指南
└── SECURITY.md                   # 安全說明
```

## 🛠️ 建構說明

### 🎯 雙環境建構系統

專案支援完全分離的開發環境和生產環境建構，具備不同的 OAuth Client ID：

- **開發版 (dist-dev/)**：用於本地測試，使用開發專用的 Google OAuth Client ID
- **生產版 (dist-prod/)**：用於 Chrome Web Store 上架，使用生產專用的 Client ID

### 📋 建構指令

#### 開發環境
```bash
# 開發模式（檔案監控）
npm run dev

# 單次開發版建構
npm run build:dev
```

#### 生產環境（上架用）
```bash
# 生產版建構
npm run build:prod

# 同時建構兩版本
npm run build:all
```

### 🚀 使用流程

#### 本地開發測試
```bash
npm run dev              # 檔案監控模式
# 載入 Chrome 擴充功能：使用 dist-dev/ 資料夾
```

#### Chrome Web Store 上架
```bash
npm run build:prod       # 建構上架版本
# 上傳：使用 dist-prod/ 資料夾
```

### 📝 重要注意事項

- ✅ **完全分離**：兩個版本不會互相干擾
- ✅ **清晰識別**：一眼就知道哪個是測試版，哪個是上架版
- ⚠️ **不要直接編輯** `manifest.json`（會被覆蓋）
- ⚠️ **修改配置**：請編輯 `manifest.dev.json` 或 `manifest.prod.json`

## 🚀 快速開始

### 📥 安裝擴充程式
1. 從 [Chrome Web Store](https://chrome.google.com/webstore) 安裝 HotTea（即將上線）
2. 或下載原始碼進行開發安裝

### 🔐 首次使用
1. 點擊瀏覽器工具欄中的 HotTea 圖標 🍵
2. 使用 Google 帳號登入（安全且快速）
3. 系統自動分配個人 API 使用額度

### 📖 開始使用

#### 生成對話
1. **瀏覽新聞**: 開啟任何新聞網站的文章頁面
2. **開啟側邊欄**: 點擊瀏覽器工具欄中的 HotTea 圖標 🍵
3. **一鍵生成**: 點擊「我要吃瓜」按鈕
4. **享受對話**: 閱讀 AI 轉換後的朋友群組聊天

#### 問答互動
1. **繼續提問**: 在對話下方的輸入框輸入問題
2. **智能回答**: AI 會基於新聞內容回答你的問題
3. **深度討論**: 支援多輪對話，越聊越深入

#### 個人化體驗
- **客製化**: 系統會根據你的名稱調整對話風格
- **角色頭像**: 自動生成新聞人物的真實頭像
- **重新生成**: 不滿意可以重新生成不同風格的對話

## 🎯 支援的網站

### 美國財經新聞
- Wall Street Journal (wsj.com)
- Bloomberg (bloomberg.com)
- CNBC (cnbc.com)
- Reuters (reuters.com)
- Financial Times (ft.com)

### 科技新聞
- The Verge (theverge.com)
- Ars Technica (arstechnica.com)
- Wired (wired.com)
- TechCrunch (techcrunch.com)

### 綜合新聞
- BBC (bbc.com/bbc.co.uk)
- CNN (cnn.com)
- The Guardian (theguardian.com)
- New York Times (nytimes.com)
- Associated Press (apnews.com)
- NPR (npr.org)
- Washington Post (washingtonpost.com)

### 台灣媒體
- 聯合新聞網 (udn.com)
- 中央社 (cna.com.tw)
- 鏡週刊 (mirrormedia.mg)
- 天下雜誌 (cw.com.tw)
- 自由時報 (ltn.com.tw)
- 中時新聞網 (chinatimes.com)
- TVBS (tvbs.com.tw)
- 華視新聞網 (cts.com.tw)

### 加密貨幣新聞
- BlockTempo (blocktempo.com)
- CoinDesk (coindesk.com)
- CoinTelegraph (cointelegraph.com)

### 智能通用支援
- **結構化數據優先**: JSON-LD、OpenGraph、Twitter Card、Microdata
- **多層擷取策略**: 網站特定規則 → 結構化數據 → 智能評分
- **內建快取機制**: 5分鐘內重複訪問使用快取結果
- **品質驗證系統**: 自動過濾導航內容，確保擷取準確性

## 🔐 隱私與安全

### 🛡️ 資料保護
- **本地擷取**: 新聞內容在本地識別與擷取，不存於伺服器
- **最小資料收集**: 僅儲存 Google 登入資訊與使用量統計
- **透明使用**: 明確告知資料用途，無隱藏追蹤
- **用戶控制**: 可隨時撤銷權限或刪除帳戶

### 🔒 安全架構
- **前端 Prompt API**: 直接使用瀏覽器內建的 `window.ai` API，無需在擴充功能中儲存或管理 API Key，提升了安全性。
- **後端職責分離**: Supabase 後端僅處理用戶身份驗證與數據統計，不經手 AI 提示詞或對話內容。
- **使用量控制**: 每用戶每日限額由後端管理，防止濫用。

### 🔍 開源透明
- **程式碼開放**: 前端程式碼完全開源，可審查檢驗
- **安全稽核**: 歡迎社群進行安全檢查與回報
- **持續改進**: 定期安全更新與漏洞修補

## 🛠️ 開發特色

### 先進內容擷取技術
- **多層擷取策略**: 結構化數據 + 網站特定規則 + 智能評分
- **40+ 網站專用規則**: 主流國際新聞網站完整支援
- **結構化數據解析**: JSON-LD、OpenGraph、Twitter Card、Microdata
- **智能內容驗證**: 自動識別和過濾導航內容

### 效能與穩定性
- **內建快取系統**: 5分鐘內重複訪問使用快取結果
- **錯誤恢復機制**: 多重備援擷取策略
- **詳細除錯日誌**: 完整的擷取過程分析
- **記憶體管理**: 自動清理過期快取項目

### 程式碼品質
- **零技術債架構**: 清除所有未使用代碼
- **模組化設計**: 單一職責原則
- **完整 JSDoc 註釋**: 詳細的 API 文檔
- **長期穩定性**: 面向未來的設計模式

## 📝 版本歷史

### v5.10.0 (Current) - 延伸問題與多語言增強
- 💡 **延伸問題生成**: AI 自動生成 3-5 個相關延伸問題，引導深度探索
- 🌐 **完整多語言支援**: 中文/英文自動適配（提示詞、UI、錯誤訊息全面國際化）
- 📊 **結構化日誌系統**: Edge Functions 完整請求追蹤與性能監控
- 🎨 **UI 優化**: 延伸問題摺疊/展開動畫，點擊自動填入問答框
- 🔧 **建置系統優化**: 版本同步腳本自動化，雙環境建置流程完善

### v5.9.0 - 問答系統與內容驗證強化
- 💬 **智能問答增強**: Google Search 整合，相關性評分機制（0-100分）
- 🔍 **內容驗證器**: 自動過濾 Cookie Notice、付費牆等干擾內容
- ⚡ **三層內容擷取**: 結構化資料 → Readability → 網站規則，提升準確率
- 📝 **上下文記憶**: 問答歷史管理，支援多輪連貫對話
- 🌍 **語言檢測**: 自動識別用戶語言偏好

### v5.6.0 - 個人化與穩定性大幅提升
- 💬 **智能問答功能**: 支援針對新聞的延續對話
- 👤 **個人化體驗**: 根據用戶名稱客製化對話風格
- 🖼️ **維基百科頭像**: 自動生成新聞人物真實頭像
- 🔒 **智財保護**: 提示詞生成移至後端安全處理
- 🎨 **UI 優化**: 整合 HotTea 字體 Logo，提升視覺體驗

### v5.5.0 - 後端架構升級
- 🏗️ **Supabase 整合**: 完整後端基礎設施
- 🔐 **Google OAuth**: 安全用戶認證系統
- 📊 **使用量管理**: 透明的配額控制機制
- ⚡ **Edge Functions**: 全球低延遲 API 代理

### v5.4.0 - 性能與穩定性
- 🚀 **Gemini 2.5 Flash Lite**: 升級至最新高效能模型
- 🎯 **三層擷取**: 統一內容擷取架構
- 📱 **響應式優化**: 完美適應各種螢幕尺寸
- 🐛 **錯誤處理**: 強化穩定性與用戶體驗

### v5.3.0 - 智能功能增強
- 🧠 **智能角色識別**: 自動分析新聞人物關係
- 🎭 **戲劇化提升**: 更生動的對話生成算法
- 📋 **開發規範**: 建立 TDD + Tidy First 開發流程
- 🔧 **代碼重構**: 零技術債，長期可維護架構

### v4.0 - 戲劇化對話系統
- 🎭 全新戲劇化 AI 提示詞，增強對話張力
- 💬 聊天風格介面，仿照即時通訊設計
- 🔧 CSS Grid 重構，解決所有排版問題
- 🎨 CSS 變數系統，統一主題管理

### v3.0 - Chrome Side Panel 整合
- 📱 原生側邊欄支援，取代注入式介面
- 🛡️ Manifest V3 完全相容
- 🔄 動態腳本注入機制

### v2.0 - AI 對話轉換
- 🤖 整合 Gemini AI 進行對話生成
- 👥 智能角色識別和個性化對話
- 🏗️ 模組化架構重構

## 📄 授權條款

MIT License - 詳見 LICENSE 檔案

## 🤝 貢獻指南

歡迎提交 Issue 和 Pull Request！

## 📞 聯絡方式

透過 GitHub Issues 回報問題或提出建議
