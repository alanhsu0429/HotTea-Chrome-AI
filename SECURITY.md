# 🔒 HotTea 安全指南

## 📊 安全架構概覽

HotTea Chrome Extension 採用多層安全架構，確保用戶資料和 API 密鑰的安全：

### 🔐 密鑰管理架構

```
前端 (Chrome Extension)
├── 配置檔案 (config.json) - Supabase 公開金鑰
├── 用戶驗證 - Google OAuth + Chrome Identity API
└── API 請求 - 使用用戶專屬 API Key

後端 (Supabase Edge Functions)  
├── 環境變數 - 真正的 Gemini API Key
├── 用戶驗證 - 驗證前端傳來的 API Key
└── 代理呼叫 - 安全地呼叫 Gemini API
```

## ✅ 安全特色

### 1. **API 密鑰隔離**
- ❌ **前端不包含**: Gemini API Key
- ✅ **前端僅含**: Supabase 公開 Anon Key (有 RLS 保護)
- ✅ **後端保護**: 真正的 API Key 存在 Supabase 環境變數

### 2. **雙重認證機制**
- **第一層**: Google OAuth 驗證用戶身份
- **第二層**: Supabase 生成的用戶專屬 API Key
- **結果**: 只有已驗證用戶才能使用服務

### 3. **使用量控制**
- 每個用戶有獨立的日使用量限制
- 防止 API 濫用和意外高額計費
- 透明的使用量追蹤

### 4. **安全的配置管理**
- 敏感配置與代碼分離
- 使用範本檔案 (`config.example.json`) 指導配置
- 真實配置檔案 (`config.json`) 不提交版本控制

## 🚫 安全修復記錄

### 2025-09-09 重大安全更新

#### 🔴 **修復的安全問題**

1. **移除硬編碼的 Supabase Token**
   - **位置**: `src/api-client.js`
   - **問題**: JWT token 直接暴露在客戶端代碼
   - **修復**: 改用動態載入配置檔案

2. **環境變數安全化**
   - **位置**: `.env`, `deploy.sh`, `DEPLOY_GUIDE.md`
   - **問題**: 真實 API Key 被提交到版本控制
   - **修復**: 移除硬編碼，使用環境變數

3. **部署流程安全化**
   - **位置**: `deploy.sh`
   - **問題**: 腳本中包含明文 API Key
   - **修復**: 要求使用者設定環境變數

#### ✅ **安全改進**

1. **配置檔案系統**
   ```
   config.example.json  → 提供範本
   config.json         → 實際配置 (已加入 .gitignore)
   src/config.js       → 安全的配置載入器
   ```

2. **分離關注點**
   - 開發者密鑰: 在 Supabase Dashboard (雲端環境變數)
   - 用戶配置: 在 `config.json` (擴充功能配置)
   - 前端文件: 集中在 `src/` 目錄

## 🛡️ 安全最佳實踐

### 開發者指南

1. **永遠不要**:
   - 在代碼中硬編碼任何密鑰
   - 提交 `.env` 或 `config.json` 到版本控制
   - 在文檔中使用真實的 API Key

2. **務必要**:
   - 使用 `config.example.json` 作為範本
   - 在 Supabase Dashboard 設定環境變數
   - 定期檢查代碼中的敏感資訊

3. **部署前檢查**:
   ```bash
   # 檢查是否有敏感檔案被追蹤
   git status
   
   # 搜尋可能的 API Key
   grep -r "AIza\|sk-\|pk_" src/ --exclude-dir=node_modules
   
   # 確認 .gitignore 有效
   git check-ignore config.json
   ```

### 用戶使用指南

1. **初次設定**:
   - 複製 `config.example.json` 為 `config.json`
   - 填入你的 Supabase 專案資訊
   - 不要分享 `config.json` 檔案

2. **安全使用**:
   - 定期檢查 Google 帳戶的授權應用
   - 監控 Supabase 的使用量儀表板
   - 如有疑慮立即撤銷權限

## 🔍 安全檢查清單

### 代碼審查清單
- [ ] 沒有硬編碼的 API Key 或 Token
- [ ] 敏感配置都在 `.gitignore` 中
- [ ] 使用安全的配置載入機制
- [ ] 前端只包含必要的公開資訊
- [ ] 後端妥善保護私密金鑰

### 部署前清單
- [ ] 環境變數在 Supabase Dashboard 正確設定
- [ ] `config.json` 不會被意外提交
- [ ] 文檔中沒有真實的 API Key
- [ ] Edge Functions 正確載入環境變數

### 用戶安全清單
- [ ] Google OAuth 權限範圍最小化
- [ ] 定期監控使用量
- [ ] 了解如何撤銷應用權限

## 📞 安全問題回報

如發現安全問題，請透過以下方式回報：

1. **GitHub Issues**: 標記為 `security` label
2. **不要公開**: 敏感安全問題請私下聯繫
3. **提供詳情**: 包含復現步驟和影響範圍

## 🔄 定期安全維護

- **每月**: 檢查依賴套件安全更新
- **每季**: 檢查 API Key 使用情況
- **每半年**: 全面安全架構審查
- **立即**: 收到安全警告時立即處理

---

**最後更新**: 2025-09-09  
**安全等級**: 生產就緒 ✅