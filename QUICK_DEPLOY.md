# 🚀 延伸問題功能快速部署指南

## ⚡ 5 分鐘完成部署

### 步驟 1: 設定環境變數

```bash
# 設定延伸問題專用的 Gemini API Key
supabase secrets set GEMINI_QUESTION_API_KEY=<your-gemini-api-key>

# 如果尚未設定基礎環境變數，也需要設定：
supabase secrets set SUPABASE_URL=<your-supabase-url>
supabase secrets set SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

### 步驟 2: 部署 Edge Function

```bash
# 確保已登入
supabase login

# 連結到專案
supabase link --project-ref <your-project-ref>

# 部署延伸問題功能
supabase functions deploy suggest-questions
```

### 步驟 3: 驗證部署

```bash
# 檢查環境變數
supabase secrets list

# 應該看到：
# ✅ GEMINI_QUESTION_API_KEY
# ✅ SUPABASE_URL
# ✅ SUPABASE_ANON_KEY
```

### 步驟 4: 測試功能

1. 重新載入 Chrome 擴充功能（`dist-dev/`）
2. 開啟任何新聞網站
3. 點擊 HotTea → 生成對話
4. 確認延伸問題區塊顯示（對話下方）

---

## 🔑 API Key 說明

### GEMINI_QUESTION_API_KEY（新增）

- **用途**: 專門用於延伸問題生成
- **模型**: Gemini 2.0 Flash Lite（輕量快速）
- **好處**:
  - ✅ 與主對話功能分離
  - ✅ 可獨立管理配額
  - ✅ 便於成本追蹤
  - ✅ 不同的 rate limit 設定

### 與 GEMINI_API_KEY 的區別

| 項目 | GEMINI_API_KEY | GEMINI_QUESTION_API_KEY |
|-----|----------------|------------------------|
| 用途 | 主對話生成 | 延伸問題生成 |
| Edge Function | `call-gemini` | `suggest-questions` |
| 模型 | Gemini 2.5 Flash | Gemini 2.0 Flash Lite |
| 優先級 | 高（核心功能） | 中（增強功能） |

---

## 🧪 快速測試

```bash
# 測試 API 呼叫
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/suggest-questions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "X-API-Key: YOUR_USER_API_KEY" \
  -d '{
    "dialogue": "{\"dialogue\": [{\"speaker\": \"User\", \"content\": \"測試\"}]}",
    "newsContent": "這是一則關於人工智慧的新聞...",
    "newsTitle": "AI 技術突破",
    "userLanguage": "zh-TW"
  }'
```

**預期回應：**
```json
{
  "success": true,
  "data": {
    "questions": [
      "這項技術對產業有什麼影響？",
      "相關企業如何應對？",
      "未來發展趨勢如何？"
    ],
    "count": 3
  }
}
```

---

## ❌ 常見問題排查

### 問題 1: `GEMINI_QUESTION_API_KEY 未設定`

```bash
# 解決方法：設定環境變數
supabase secrets set GEMINI_QUESTION_API_KEY=<your-api-key>

# 重新部署
supabase functions deploy suggest-questions
```

### 問題 2: API 回應 401 Unauthorized

**原因**: 用戶 API Key 驗證失敗

**檢查**:
- 確認用戶已登入 Google
- 檢查 `currentUser.apiKey` 是否存在
- 確認資料庫 `users` 表有該用戶

### 問題 3: 延伸問題不顯示

**可能原因**:
1. Edge Function 未部署
2. 環境變數未設定
3. 網路請求失敗

**偵錯步驟**:
```javascript
// 開啟 Chrome DevTools Console
// 查看是否有錯誤訊息
// 搜尋關鍵字: "延伸問題"
```

---

## ✅ 部署完成檢查清單

- [ ] `GEMINI_QUESTION_API_KEY` 環境變數已設定
- [ ] Edge Function `suggest-questions` 部署成功
- [ ] `supabase secrets list` 顯示正確
- [ ] curl 測試回應正常
- [ ] Chrome 擴充功能顯示延伸問題
- [ ] 點擊問題可填入問答框
- [ ] 中英文環境都正常運作

---

## 📊 監控指標

部署後建議追蹤：

```bash
# 查看 Edge Function Logs
supabase functions logs suggest-questions

# 關注指標：
# - API 成功率
# - 回應時間
# - Token 消耗量
# - 錯誤類型
```

---

## 🎉 部署完成！

延伸問題功能已成功啟用，現在用戶可以：

1. ✨ 看到 3-5 個智能延伸問題
2. 🖱️ 點擊問題自動填入問答框
3. 🌐 享受中英文自動適配
4. ⚡ 體驗流暢的動畫效果

**下一步**: 收集用戶反饋，優化問題生成品質！🚀
