-- HotTea 卸載 Token 系統
-- 解決 API Key 在卸載 URL 中暴露的問題
-- 遵循 CLAUDE.md 開發規範

-- 1. 擴展 users 表，添加一次性卸載 token
ALTER TABLE users ADD COLUMN IF NOT EXISTS uninstall_token TEXT;
CREATE INDEX IF NOT EXISTS idx_users_uninstall_token ON users(uninstall_token);

-- 2. RPC 函數：設置卸載 Token
CREATE OR REPLACE FUNCTION set_uninstall_token(
  p_api_key TEXT,
  p_token TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- 根據 API Key 找到用戶
  SELECT id INTO v_user_id FROM users WHERE api_key = p_api_key;

  IF v_user_id IS NULL THEN
    RAISE WARNING 'User not found for API Key: %', p_api_key;
    RETURN false;
  END IF;

  -- 更新用戶的卸載 token
  UPDATE users
  SET 
    uninstall_token = p_token,
    uninstall_url_set_at = NOW(),
    updated_at = NOW()
  WHERE id = v_user_id;

  RETURN true;
END;
$$;

-- 3. RPC 函數：透過 Token 記錄卸載事件
CREATE OR REPLACE FUNCTION log_uninstall_by_token(
  p_token TEXT,
  p_reason TEXT DEFAULT NULL,
  p_feedback TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_referrer TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_record RECORD;
  v_log_id UUID;
BEGIN
  -- 根據 Token 找到用戶（重要：找到後立即清除 token）
  SELECT * INTO v_user_record
  FROM users
  WHERE uninstall_token = p_token
  FOR UPDATE; -- 鎖定該行以防止競爭條件

  -- 如果找不到用戶，可能 token 已被使用或無效
  IF v_user_record IS NULL THEN
    -- 仍然記錄這次嘗試，但 user_id 為 NULL
    INSERT INTO uninstall_logs (
      api_key, -- 此時無法知道 api_key
      reason,
      feedback,
      user_agent,
      referrer
    ) VALUES (
      'token: ' || p_token, -- 記錄 token 以便追蹤
      'Invalid or used token',
      p_feedback,
      p_user_agent,
      p_referrer
    )
    RETURNING id INTO v_log_id;
    
    RAISE WARNING 'Invalid or already used uninstall token: %', p_token;
    RETURN v_log_id;
  END IF;

  -- 插入卸載日誌
  INSERT INTO uninstall_logs (
    user_id,
    email,
    api_key,
    reason,
    feedback,
    user_agent,
    referrer
  ) VALUES (
    v_user_record.id,
    v_user_record.email,
    v_user_record.api_key,
    p_reason,
    p_feedback,
    p_user_agent,
    p_referrer
  )
  RETURNING id INTO v_log_id;

  -- 更新 users 表：標記為已卸載並清除 token
  UPDATE users
  SET 
    is_uninstalled = true,
    uninstalled_at = NOW(),
    uninstall_token = NULL, -- << 關鍵：清除 token，使其失效
    updated_at = NOW()
  WHERE id = v_user_record.id;

  RETURN v_log_id;
END;
$$;

-- 4. 移除舊的 log_uninstall 函數（可選，但建議）
-- 為安全起見，我們可以先將其重新命名，觀察一段時間後再刪除
ALTER FUNCTION log_uninstall(TEXT, TEXT, TEXT, TEXT, TEXT) RENAME TO deprecated_log_uninstall;


-- 5. 顯示遷移完成訊息
DO $$
BEGIN
    RAISE NOTICE '=== HotTea 卸載 Token 系統建立完成 ===';
    RAISE NOTICE '新增欄位: users.uninstall_token';
    RAISE NOTICE '新建 RPC 函數: set_uninstall_token, log_uninstall_by_token';
    RAISE NOTICE '重新命名舊函數: log_uninstall -> deprecated_log_uninstall';
    RAISE NOTICE '現在卸載流程將使用一次性 Token，提升安全性';
END
$$;
