# 🔑 API Key 變更總結

## ✅ 已完成的變更

### 環境變數名稱更新

**原來**: `GEMINI_API_KEY`  
**現在**: `GEMINI_QUESTION_API_KEY`

---

## 📝 變更原因

1. **功能分離**: 延伸問題功能與主對話功能使用不同的 API Key
2. **成本控制**: 可獨立管理不同功能的 Gemini API 配額
3. **靈活性**: 未來可以針對不同功能使用不同的 API Key 或模型

---

## 📂 修改的檔案

### Edge Function
- ✅ `supabase/functions/suggest-questions/index.ts`
  - Line 159: `GEMINI_QUESTION_API_KEY` 環境變數
  - Line 225: Gemini API 呼叫使用新的 Key

### 文檔
- ✅ `SUGGESTED_QUESTIONS_DEPLOY.md` - 部署指南已更新
- ✅ `QUICK_DEPLOY.md` - 新增快速部署指南

---

## 🚀 你需要執行的命令

### 1. 設定新的環境變數

```bash
# 設定延伸問題專用的 Gemini API Key
supabase secrets set GEMINI_QUESTION_API_KEY=<your-gemini-api-key>
```

### 2. 部署 Edge Function

```bash
# 部署或更新 Edge Function
supabase functions deploy suggest-questions
```

### 3. 驗證設定

```bash
# 檢查環境變數
supabase secrets list

# 應該看到：
# GEMINI_QUESTION_API_KEY ✅
# SUPABASE_URL ✅
# SUPABASE_ANON_KEY ✅
```

---

## 🎯 API Key 架構總覽

```
HotTea 專案 API Keys
│
├─ GEMINI_API_KEY (主對話功能)
│  └─ Edge Function: call-gemini
│     └─ Model: Gemini 2.5 Flash
│
├─ GEMINI_QUESTION_API_KEY (延伸問題功能) ← 新增
│  └─ Edge Function: suggest-questions
│     └─ Model: Gemini 2.0 Flash Lite
│
├─ SUPABASE_URL
│  └─ Supabase 專案 URL
│
└─ SUPABASE_ANON_KEY
   └─ Supabase 匿名金鑰
```

---

## ✅ 部署檢查清單

- [ ] 執行 `supabase secrets set GEMINI_QUESTION_API_KEY=<key>`
- [ ] 執行 `supabase functions deploy suggest-questions`
- [ ] 執行 `supabase secrets list` 確認
- [ ] 測試 Edge Function（使用 curl 或前端）
- [ ] 確認延伸問題功能正常運作

---

## 📚 相關文檔

- `QUICK_DEPLOY.md` - 快速部署指南（5 分鐘）
- `SUGGESTED_QUESTIONS_DEPLOY.md` - 詳細部署指南
- `FEATURE_SUMMARY.md` - 功能開發總結

---

## 🎉 變更完成

所有代碼已更新為使用 `GEMINI_QUESTION_API_KEY`，現在可以獨立管理延伸問題功能的 API 配額！
