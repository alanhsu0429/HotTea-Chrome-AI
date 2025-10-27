# HotTea Development Guidelines 🍵

針對 HotTea Chrome 擴充功能的開發規範，結合 Test-Driven Development (TDD) 和 Tidy First 原則。

## 🎯 專案核心理解

### HotTea 的使命
將沉悶的新聞轉換為生動有趣的朋友群組對話，讓資訊獲取變得輕鬆愉快。

### 技術架構特性
- **Chrome Extension (Manifest V3)**: 側邊欄整合，內容腳本注入
- **Chrome Built-in AI (Prompt API)**: 本地 AI 處理，智能對話生成，角色識別
- **Supabase 後端**: 用戶管理，API 代理，使用量追蹤
- **現代化 UI**: CSS Grid 佈局，響應式設計，動畫過渡

### 性能目標
- AI 對話生成：< 4 秒
- 內容擷取：< 1 秒
- UI 響應時間：< 200ms
- 擴充功能載入：< 500ms

## 🔄 開發方法論

### TDD 核心循環

#### Red → Green → Refactor
1. **Red**: 寫一個會失敗的測試，定義期望的行為
2. **Green**: 寫最少的代碼讓測試通過
3. **Refactor**: 在測試通過後改善代碼結構

#### 測試優先原則
- 功能開發前先寫測試
- 修復 Bug 前先寫重現問題的測試
- 每個 commit 都必須通過所有測試

### Tidy First 原則

#### 嚴格分離兩種變更
1. **結構性變更** 🏗️: 重新組織代碼但不改變行為
   - 重命名變數/函數
   - 提取方法
   - 移動代碼位置
   - 優化 import 順序

2. **行為性變更** ✨: 添加或修改功能
   - 新增功能
   - 修改邏輯
   - 調整 API
   - 更新配置

#### 變更順序規範
- 永遠先做結構性變更
- 結構性變更後必須執行測試確認無行為變化
- 絕不在同一個 commit 混合兩種變更

## 🛠️ HotTea 專屬工作流程

### Chrome Extension 開發流程

#### 1. 功能開發循環
```
1. 寫測試 (針對功能行為)
2. 寫最簡實作
3. 建置測試 (npm run build:dev)
4. 手動驗證 (在 Chrome 中測試)
5. 重構優化
6. 提交變更
```

#### 2. UI 開發流程
```
1. 定義 UI 行為測試
2. 實作 HTML/CSS
3. 添加 JavaScript 互動
4. 驗證響應式設計
5. 測試無障礙性
6. 性能檢查
```

### AI 提示詞優化流程

#### 測試驅動的提示詞開發
```
1. 定義期望的對話格式和品質
2. 寫驗證 AI 回應的測試
3. 調整提示詞參數
4. 測試多種新聞類型
5. 監控生成時間和品質
6. 迭代優化
```

#### 性能優化循環
```
1. 建立性能基準測試
2. 識別瓶頸 (模型、參數、提示詞長度)
3. 逐項優化
4. 驗證改善效果
5. 確保品質不降
```

## 🧪 測試策略

### 測試層級

#### 1. 單元測試
- **API 客戶端**: 測試 Supabase 整合
- **內容擷取器**: 測試各種網站的內容解析
- **配置載入**: 測試環境配置管理
- **工具函數**: 測試純函數邏輯

#### 2. 整合測試
- **Extension ↔ Content Script**: 消息傳遞
- **Background ↔ Supabase**: API 呼叫流程
- **Content Script ↔ 網頁**: DOM 操作
- **Side Panel ↔ Background**: 數據流

#### 3. 端對端測試
- **完整用戶流程**: 點擊擴充功能 → 生成對話
- **錯誤處理**: 網路失敗、API 限制、無效內容
- **不同新聞網站**: 相容性測試

#### 4. 性能測試
- **AI 回應時間**: 監控 < 4秒目標
- **記憶體使用**: 防止記憶體洩漏
- **CPU 使用率**: 背景處理效率

### 測試檔案結構
```
tests/
├── unit/
│   ├── api-client.test.js
│   ├── content-extractor.test.js
│   └── utils.test.js
├── integration/
│   ├── extension-flow.test.js
│   └── supabase-integration.test.js
├── e2e/
│   ├── user-journey.test.js
│   └── news-sites.test.js
└── performance/
    ├── ai-response-time.test.js
    └── memory-usage.test.js
```

## 📋 提交規範

### Commit 消息格式
```
<類型>: <簡潔描述>

[可選的詳細說明]

[可選的相關 issue 引用]
```

### 提交類型

#### 結構性變更 🏗️
```
🏗️ [結構] 重構 API 客戶端模組
🏗️ [結構] 提取對話渲染邏輯
🏗️ [結構] 優化 import 順序
```

#### 行為性變更
```
✨ [功能] 添加維基百科頭像支援
🐛 [修復] 修正對話泡泡寬度問題
🎨 [UI] 調整按鈕位置到 20%
⚡ [性能] 升級到 Gemini 2.5 Flash Lite
🔒 [安全] 加強 API Key 驗證
📝 [文件] 更新開發指南
🧪 [測試] 添加內容擷取測試
```

### Commit 要求檢查清單
- [ ] 所有測試通過
- [ ] 無 linter 警告
- [ ] 手動測試驗證
- [ ] 性能影響評估
- [ ] 安全性檢查
- [ ] 變更類型明確標示

## 🎯 代碼品質標準

### 代碼組織原則

#### 1. 關注點分離
- **UI 層**: 純展示邏輯，無業務邏輯
- **業務邏輯層**: 獨立可測試的純函數
- **數據層**: API 呼叫、狀態管理
- **配置層**: 環境設定、常數定義

#### 2. 依賴管理
- 明確的依賴注入
- 避免循環依賴
- 最小化外部依賴

#### 3. 錯誤處理
```javascript
// 好的錯誤處理
async function extractContent(url) {
  try {
    const content = await fetchContent(url);
    return { success: true, data: content };
  } catch (error) {
    console.error('Content extraction failed:', error);
    return {
      success: false,
      error: error.message,
      fallback: 'Please try refreshing the page'
    };
  }
}
```

### 性能要求

#### 響應時間目標
- AI 對話生成: < 4秒
- 內容擷取: < 1秒
- UI 互動反饋: < 200ms
- 擴充功能啟動: < 500ms

#### 資源使用限制
- 記憶體使用: < 50MB
- CPU 使用: 背景 < 5%
- 網路請求: 批次處理，避免頻繁請求

## 🔧 開發工具和命令

### 常用命令
```bash
# 開發環境建置
npm run build:dev

# 生產環境建置
npm run build:prod

# 執行測試
npm test

# 執行 linter
npm run lint

# 型別檢查
npm run typecheck
```

### VS Code 建議設定
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "javascript.validate.enable": false,
  "emmet.includeLanguages": {
    "javascript": "javascriptreact"
  }
}
```

## 🚀 新功能開發範例

### 範例：添加新聞分類功能

#### 1. 寫測試 (Red)
```javascript
// tests/unit/news-classifier.test.js
describe('NewsClassifier', () => {
  test('should classify technology news correctly', () => {
    const newsContent = 'Apple released new iPhone...';
    const classifier = new NewsClassifier();

    const result = classifier.classify(newsContent);

    expect(result.category).toBe('technology');
    expect(result.confidence).toBeGreaterThan(0.8);
  });
});
```

#### 2. 最簡實作 (Green)
```javascript
// src/news-classifier.js
class NewsClassifier {
  classify(content) {
    // 最簡實作，讓測試通過
    if (content.includes('iPhone') || content.includes('Apple')) {
      return { category: 'technology', confidence: 0.9 };
    }
    return { category: 'general', confidence: 0.5 };
  }
}
```

#### 3. 重構改善 (Refactor)
```javascript
// src/news-classifier.js
class NewsClassifier {
  constructor() {
    this.keywords = {
      technology: ['iPhone', 'Apple', 'AI', 'software'],
      sports: ['football', 'basketball', 'Olympics'],
      business: ['stock', 'market', 'economy']
    };
  }

  classify(content) {
    const scores = {};

    for (const [category, keywords] of Object.entries(this.keywords)) {
      scores[category] = this.calculateScore(content, keywords);
    }

    const bestCategory = Object.keys(scores).reduce((a, b) =>
      scores[a] > scores[b] ? a : b
    );

    return {
      category: bestCategory,
      confidence: scores[bestCategory]
    };
  }

  calculateScore(content, keywords) {
    const matches = keywords.filter(keyword =>
      content.toLowerCase().includes(keyword.toLowerCase())
    );
    return matches.length / keywords.length;
  }
}
```

#### 4. 整合到主系統
```javascript
// src/background.js - 結構性變更
import { NewsClassifier } from './news-classifier.js';

// 行為性變更 - 在生成對話時加入分類
function generatePrompt(articleData) {
  const classifier = new NewsClassifier();
  const category = classifier.classify(articleData.content);

  // 根據分類調整提示詞...
}
```

## 📈 持續改進

### 定期回顧
- 每週回顧測試覆蓋率
- 每月性能數據分析
- 季度代碼品質評估

### 技術債務管理
- 標記需要重構的代碼
- 優先處理影響性能的債務
- 在新功能開發前清理相關債務

### 用戶回饋整合
- 收集使用數據
- 分析常見問題
- 優先修復影響體驗的問題

---

## 🎉 結語

這些指南旨在確保 HotTea 的持續高品質發展。記住：

> **好的代碼是寫給人看的，只是順便也能讓電腦執行。**

遵循這些原則，讓我們一起打造出色的 HotTea 體驗！ 🍵✨