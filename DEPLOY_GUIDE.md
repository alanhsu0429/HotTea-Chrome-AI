# 🚀 HotTea Supabase 部署指南

## 📋 前置準備

### 1. 確認工具已安裝
```bash
# 檢查 Supabase CLI
supabase --version

# 如果未安裝
brew install supabase/tap/supabase
```

### 2. 檢查現有資料
1. 登入 Supabase Dashboard：https://app.supabase.com/project/mnpzaefxnsxfctsfsxfv
2. 點擊左側「Table Editor」
3. 查看現有的表格：`user_profiles`, `api_usage`, `dialogues` 等

---

## 🎯 部署方案選擇

### 方案 A：清空重建（推薦，更乾淨）
**優點：**
- 完全使用新的簡化架構
- 沒有舊資料的干擾
- 程式碼最簡潔

**缺點：**
- 會刪除現有的所有資料

**適用情況：**
- 目前沒有重要的用戶資料
- 想要完全使用新架構

### 方案 B：保留現有資料（兼容模式）
**優點：**
- 保留現有資料
- 新舊架構並存

**缺點：**
- 資料庫會有一些冗餘表格
- 稍微複雜一些

**適用情況：**
- 有重要的現有用戶資料
- 不想重新開始

---

## 🔧 詳細部署步驟

### 準備工作
```bash
# 1. 進入專案目錄
cd /Users/hsupoyang/Desktop/HotTea

# 2. 登入 Supabase
supabase login

# 3. 連結到您的專案
supabase link --project-ref mnpzaefxnsxfctsfsxfv
```

### 方案 A：清空重建部署
```bash
# ⚠️  警告：這會刪除所有現有資料！

# 1. 重置資料庫（刪除所有資料）
supabase db reset

# 2. 推送新的簡化架構
supabase db push

# 3. 部署 Edge Function
supabase functions deploy call-gemini

echo "✅ 方案 A 部署完成"
```

### 方案 B：兼容模式部署
```bash
# 1. 使用兼容性遷移腳本
supabase db push

# 2. 部署 Edge Function
supabase functions deploy call-gemini

echo "✅ 方案 B 部署完成"
```

---

## 🔑 設定環境變數

### 在 Supabase Dashboard 中設定：
1. 前往：https://app.supabase.com/project/mnpzaefxnsxfctsfsxfv
2. 點擊左側「Settings」→「Environment Variables」
3. 點擊「Add new variable」
4. 添加以下變數：

```
Name: GEMINI_API_KEY
Value: [你的 Gemini API Key]
```

5. 點擊「Save」

### 或使用 CLI 設定：
```bash
export GEMINI_API_KEY=你的_Gemini_API_Key
supabase secrets set GEMINI_API_KEY=$GEMINI_API_KEY
```

---

## 🧪 測試部署

### 1. 測試 Edge Function
```bash
# 測試 Edge Function 是否正常運作
curl -X POST "https://mnpzaefxnsxfctsfsxfv.supabase.co/functions/v1/call-gemini" \
  -H "X-API-Key: test-api-key-for-development" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "測試訊息"}'
```

### 2. 測試資料庫 RPC
在 Supabase Dashboard → SQL Editor 執行：
```sql
-- 測試註冊用戶
SELECT * FROM register_or_get_user('test@example.com', 'Test User');

-- 測試取得用戶資訊
SELECT * FROM get_user_by_api_key('test-api-key-for-development');
```

### 3. 測試 Chrome Extension
1. 重新載入 Chrome Extension（使用 `dist-dev` 或 `dist-prod` 資料夾）
2. 點擊 Google 登入
3. 嘗試生成對話

---

## 🔍 故障排除

### 常見錯誤及解決方法：

#### 1. `supabase: command not found`
```bash
# 安裝 Supabase CLI
brew install supabase/tap/supabase
```

#### 2. `Docker not running`
```bash
# 啟動 Docker Desktop
open /Applications/Docker.app

# 等待 Docker 啟動後重試
```

#### 3. `Failed to link project`
```bash
# 確認專案 ID 正確
supabase link --project-ref mnpzaefxnsxfctsfsxfv

# 或手動設定
supabase init
# 然後編輯 supabase/config.toml 中的 project_id
```

#### 4. `Edge Function deployment failed`
```bash
# 檢查函數語法
supabase functions serve call-gemini

# 檢查環境變數
supabase secrets list
```

#### 5. `RPC function not found`
- 確認資料庫遷移已成功執行
- 在 Supabase Dashboard → SQL Editor 手動執行遷移腳本

---

## 📊 部署後檢查

### 確認以下項目：
- [ ] Edge Function 已部署：`https://mnpzaefxnsxfctsfsxfv.supabase.co/functions/v1/call-gemini`
- [ ] 環境變數已設定：`GEMINI_API_KEY`
- [ ] 資料庫表格存在：`users`, `usage_logs`
- [ ] RPC 函數存在：`register_or_get_user`, `get_today_usage`, `log_usage`, `get_user_by_api_key`
- [ ] Chrome Extension 能正常登入
- [ ] 對話生成功能正常運作

---

## 🎉 完成

部署完成後，您的 HotTea Chrome Extension 將擁有：

✅ **安全的 API Key 管理**：Gemini API Key 完全隱藏在後端  
✅ **使用量控制**：每個用戶每天限制 50 次使用  
✅ **簡潔穩定的架構**：零技術債，長期可維護  
✅ **完整的用戶管理**：Google 登入整合  

如果遇到任何問題，請檢查上述故障排除部分或重新執行相關步驟。