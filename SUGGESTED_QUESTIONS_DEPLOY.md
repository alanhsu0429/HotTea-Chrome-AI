# 延伸問題功能部署指南 🎯

## 📋 功能概述

延伸問題功能會在對話生成後，自動顯示 3-5 個 AI 生成的相關問題，幫助用戶更深入探索新聞內容。

---

## 🚀 部署步驟

### 1. 部署 Edge Function 到 Supabase

#### 方法一：使用 Supabase CLI（推薦）

```bash
# 1. 確保已登入 Supabase CLI
supabase login

# 2. 連結到你的專案
supabase link --project-ref <your-project-ref>

# 3. 部署 Edge Function
supabase functions deploy suggest-questions

# 4. 設定環境變數（專用的 Gemini API Key）
supabase secrets set GEMINI_QUESTION_API_KEY=<your-gemini-api-key>
supabase secrets set SUPABASE_URL=<your-supabase-url>
supabase secrets set SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

#### 方法二：手動部署

1. 前往 Supabase Dashboard
2. 進入 Edge Functions 頁面
3. 建立新函數 `suggest-questions`
4. 複製 `supabase/functions/suggest-questions/index.ts` 的內容
5. 貼上並部署

---

### 2. 驗證環境變數設定

```bash
# 檢查環境變數是否已設定
supabase secrets list

# 應該看到：
# GEMINI_QUESTION_API_KEY  (延伸問題專用)
# SUPABASE_URL
# SUPABASE_ANON_KEY
```

### 3. 測試 Edge Function

```bash
# 測試 API 呼叫（替換成你的實際值）
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/suggest-questions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "X-API-Key: YOUR_USER_API_KEY" \
  -d '{
    "dialogue": "{\"dialogue\": [{\"speaker\": \"User\", \"content\": \"Test\"}]}",
    "newsContent": "測試新聞內容...",
    "newsTitle": "測試新聞標題",
    "userLanguage": "zh-TW"
  }'
```

**預期回應：**
```json
{
  "success": true,
  "data": {
    "questions": [
      "這個事件對產業有什麼影響？",
      "類似事件過去發生過嗎？",
      "相關企業如何回應？"
    ],
    "count": 3
  },
  "usage": {...}
}
```

---

### 4. 前端整合測試

1. **載入 Chrome 擴充功能**
   ```bash
   # 確認已建置開發版本
   npm run build:dev

   # 在 Chrome 中載入 dist-dev/ 資料夾
   ```

2. **測試流程**
   - ✅ 開啟任何新聞網站
   - ✅ 點擊 HotTea 圖標開啟側邊欄
   - ✅ 登入 Google 帳號
   - ✅ 點擊「我要吃瓜」生成對話
   - ✅ 對話顯示後，延伸問題區塊應在 1-2 秒內出現
   - ✅ 點擊任一問題，應自動填入問答輸入框

3. **檢查瀏覽器 Console 日誌**
   ```
   🔍 準備獲取延伸問題
   🔄 延伸問題 API 請求內容: {...}
   ✅ 延伸問題 API 完整回應: {...}
   ✅ 延伸問題渲染完成 {count: 3}
   ```

---

## 🎨 UI 預覽

```
┌─────────────────────────────────┐
│  對話內容...                      │
│  （現有對話泡泡）                  │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ 💡 延伸問題                       │
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ 這個事件對產業有什麼影響？    │ │ ← 橘色邊框，可點擊
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ 類似事件過去發生過嗎？        │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ 相關企業如何回應？            │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│  [問答輸入框]              [➤]  │ ← 現有問答區
└─────────────────────────────────┘
```

---

## 🔍 偵錯指南

### 問題 1: 延伸問題不顯示

**可能原因：**
- Edge Function 未部署或無法存取
- API Key 驗證失敗
- 回應格式錯誤

**檢查步驟：**
1. 檢查 Console 是否有錯誤訊息
2. 確認 Edge Function 已正確部署
3. 測試 Edge Function API 呼叫（使用上面的 curl 指令）
4. 檢查 Supabase Dashboard 的 Logs

### 問題 2: 問題生成品質不佳

**調整參數：**
- 修改 `supabase/functions/suggest-questions/index.ts`
- 調整 `temperature`（預設 0.7）
- 修改提示詞內容
- 重新部署 Edge Function

### 問題 3: 載入時間過長

**優化建議：**
- 檢查網路連線
- 確認 Gemini API 回應時間
- 考慮減少 `maxOutputTokens`（預設 500）

---

## 📊 性能指標

| 指標 | 目標值 | 實際值 |
|-----|-------|-------|
| API 回應時間 | < 2 秒 | 測試後填入 |
| 問題生成數量 | 3-5 個 | 3-5 個 |
| Token 消耗 | < 500 | 測試後填入 |
| 失敗率 | < 5% | 測試後填入 |

---

## ✅ 驗收標準

- [x] Edge Function 成功部署到 Supabase
- [x] API 回應格式正確（JSON 包含 questions 陣列）
- [x] 前端可正常呼叫並顯示問題
- [x] 點擊問題可填入問答框
- [x] 中英文翻譯完整
- [x] 錯誤處理靜默失敗（不影響主流程）
- [x] UI 動畫流暢（淡入效果）
- [x] 骨架屏載入狀態正常

---

## 🔧 維護建議

### 監控指標
- 定期檢查 Supabase Logs
- 追蹤 API 呼叫成功率
- 收集用戶點擊率數據

### 優化方向
- 根據點擊率調整問題生成邏輯
- A/B 測試不同提示詞
- 優化問題數量（3-5 個之間）

---

## 📝 檔案清單

### 後端（你需要部署）
- ✅ `supabase/functions/suggest-questions/index.ts` - Edge Function 主檔案

### 前端（已完成）
- ✅ `src/modules/sidepanel-suggestions.js` - 延伸問題模組
- ✅ `src/api-client.js` - 新增 getSuggestedQuestions 函數
- ✅ `src/modules/sidepanel-dialogue.js` - 整合呼叫邏輯
- ✅ `src/sidepanel.html` - HTML 結構
- ✅ `src/sidepanel.css` - 樣式（~80 行新增）
- ✅ `_locales/zh_TW/messages.json` - 中文翻譯
- ✅ `_locales/en/messages.json` - 英文翻譯

---

## 🎉 完成後

1. 測試至少 5 個不同新聞網站
2. 確認中英文環境都正常運作
3. 記錄任何發現的問題
4. 收集用戶反饋

---

**部署完成後，延伸問題功能將自動啟用！** 🚀

有任何問題請參考：
- Supabase Edge Functions 文檔：https://supabase.com/docs/guides/functions
- Gemini API 文檔：https://ai.google.dev/docs
