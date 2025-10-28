# Chrome Web Store 審核說明

## HotTea v5.10 權限說明

### 權限清單
```json
"permissions": [
  "sidePanel",
  "tabs",
  "scripting",
  "storage",
  "identity"
]
```

### 各權限用途說明

#### 1. tabs 權限
**用途**：讓 Side Panel 識別用戶當前瀏覽的網頁，以便擷取內容進行對話生成。

**技術原因**：
- Side Panel 需要獲取當前活動標籤的 URL 和標題
- `activeTab` 權限在 Side Panel 中無法正常工作（Chrome 官方限制）
- 只能使用 `tabs` 權限來查詢當前活動標籤

**使用範圍**：
- 僅訪問當前活動標籤的 URL 和標題
- 不會讀取或記錄用戶的瀏覽歷史
- 不會訪問背景標籤或其他標籤頁

**程式碼範例**：
```javascript
// 只查詢當前活動標籤
const [tab] = await chrome.tabs.query({ 
  active: true, 
  lastFocusedWindow: true
});
// 僅使用 tab.url 和 tab.title
```

#### 2. scripting 權限
**用途**：提供 chrome.scripting.executeScript API，用於在當前頁面注入內容擷取腳本。

**使用範圍**：
- 只在用戶點擊「我要吃瓜」時注入腳本
- 注入的腳本僅用於擷取頁面內容（文字、標題）
- 不會修改頁面內容或用戶資料

#### 3. sidePanel 權限
**用途**：啟用 Chrome Side Panel API，提供側邊欄用戶介面。

#### 4. storage 權限
**用途**：儲存用戶登入狀態和偏好設定。

#### 5. identity 權限
**用途**：使用 Chrome Identity API 進行 Google OAuth 登入。

### Host Permissions
```json
"host_permissions": [
  "https://*.supabase.co/*",
  "*://*/*"
]
```

#### 說明：
1. **https://*.supabase.co/*** - 連接後端 API 服務（Supabase），用於用戶認證和對話生成
2. ***://**** - 允許在所有網站注入內容擷取腳本

#### 為什麼需要 *://*/* 權限？

**技術原因**：
- Chrome Side Panel 無法使用 `activeTab` 權限
- Side Panel 是持久性 UI，不是透過用戶點擊觸發的臨時 UI
- 沒有 host permissions 就無法在頁面注入內容擷取腳本

**使用範圍**：
- 只在用戶主動點擊「我要吃瓜」按鈕時才注入腳本
- 腳本僅讀取頁面文字內容（標題、段落）
- 不會修改頁面內容
- 不會收集用戶個人資料或敏感資訊
- 腳本執行完畢後立即移除

**產品需求**：
- 支援「任何網站」的產品定位
- 用戶可以在任何新聞、部落格、文章網站使用
- 避免限制在特定網站清單

### 審核問答準備

**Q: 為什麼需要 tabs 權限？**
A: Side Panel 需要識別用戶當前瀏覽的網頁 URL 以提取內容。由於 Chrome 技術限制，`activeTab` 權限在 Side Panel 中無法提供 tab.url 訪問權限，因此必須使用 `tabs` 權限。我們只查詢當前活動標籤，不會訪問瀏覽歷史或其他標籤。

**Q: 為什麼需要 scripting 權限？**
A: 用於注入內容擷取腳本到當前頁面，以分析和提取文章內容。這是實現內容擷取功能的必要權限，只會在用戶主動操作時使用。

**Q: 為什麼需要 *://*/* host permissions？**
A: 由於 Chrome Side Panel 的技術限制，activeTab 權限無法在 Side Panel 中正常工作。我們需要 host permissions 來在用戶主動點擊時注入內容擷取腳本。這是實現「支援任何網站」功能的必要權限。

**Q: 是否會追蹤用戶瀏覽行為？**
A: 不會。我們只在用戶主動點擊「我要吃瓜」按鈕時，讀取當前頁面的 URL 和標題用於內容擷取，不會記錄或追蹤用戶的瀏覽歷史。

**Q: 注入的腳本會做什麼？**
A: 注入的腳本僅用於分析當前頁面的文章內容（標題、段落、文字），提取後立即移除，不會修改頁面內容或收集用戶個人資訊。

**Q: 會否在背景自動執行腳本？**
A: 不會。腳本只會在用戶主動點擊「我要吃瓜」按鈕時執行。沒有背景執行、自動執行或定時執行的功能。

**Q: 為什麼不限制在特定網站？**
A: 我們的產品定位是「任何網站的內容都能生成對話」，包括新聞、部落格、維基百科等。限制特定網站會大幅降低產品實用性。

### 隱私承諾
- ✅ 只在用戶主動點擊按鈕時才訪問頁面
- ✅ 只讀取文字內容，不訪問表單、密碼、cookie
- ✅ 不記錄或儲存瀏覽歷史
- ✅ 不追蹤用戶行為或建立用戶檔案
- ✅ 不在背景執行或定時執行腳本
- ✅ 腳本執行完畢後立即清理
- ✅ 所有數據處理透明公開

### 安全措施
- 只提取文字內容，不執行頁面上的程式碼
- 不訪問敏感 DOM 元素（input、form、iframe）
- 使用 Content Security Policy 防止惡意腳本
- 所有網路請求僅連接自有後端服務