-- HotTea 卸載追蹤系統
-- 記錄用戶卸載行為和流失狀態
-- 遵循 CLAUDE.md 開發規範

-- 1. 擴展 users 表，添加卸載追蹤欄位
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_heartbeat TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS uninstall_url_set_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_uninstalled BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS uninstalled_at TIMESTAMPTZ;

-- 2. 創建卸載日誌表
CREATE TABLE IF NOT EXISTS uninstall_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  email TEXT,  -- 備份 email（防止用戶被刪除）
  api_key TEXT,  -- 從 URL 參數取得
  reason TEXT,  -- 卸載原因（如果用戶填寫問卷）
  feedback TEXT,  -- 用戶反饋
  user_agent TEXT,  -- 瀏覽器資訊
  referrer TEXT,  -- 來源頁面
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 創建索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_users_last_heartbeat ON users(last_heartbeat);
CREATE INDEX IF NOT EXISTS idx_users_is_uninstalled ON users(is_uninstalled);
CREATE INDEX IF NOT EXISTS idx_uninstall_logs_created_at ON uninstall_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_uninstall_logs_user_id ON uninstall_logs(user_id);

-- 4. RPC 函數：記錄 Heartbeat
CREATE OR REPLACE FUNCTION update_heartbeat(p_api_key TEXT)
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
    RETURN false;
  END IF;

  -- 更新最後心跳時間
  UPDATE users
  SET last_heartbeat = NOW(),
      updated_at = NOW()
  WHERE id = v_user_id;

  RETURN true;
END;
$$;

-- 5. RPC 函數：記錄卸載事件
CREATE OR REPLACE FUNCTION log_uninstall(
  p_api_key TEXT,
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
  v_user_id UUID;
  v_email TEXT;
  v_log_id UUID;
BEGIN
  -- 根據 API Key 找到用戶
  SELECT id, email INTO v_user_id, v_email
  FROM users
  WHERE api_key = p_api_key;

  -- 插入卸載日誌（即使找不到用戶也記錄）
  INSERT INTO uninstall_logs (
    user_id,
    email,
    api_key,
    reason,
    feedback,
    user_agent,
    referrer
  ) VALUES (
    v_user_id,
    v_email,
    p_api_key,
    p_reason,
    p_feedback,
    p_user_agent,
    p_referrer
  )
  RETURNING id INTO v_log_id;

  -- 如果找到用戶，更新 users 表
  IF v_user_id IS NOT NULL THEN
    UPDATE users
    SET is_uninstalled = true,
        uninstalled_at = NOW(),
        updated_at = NOW()
    WHERE id = v_user_id;
  END IF;

  RETURN v_log_id;
END;
$$;

-- 6. RPC 函數：取得流失用戶（超過 N 天未活躍）
CREATE OR REPLACE FUNCTION get_inactive_users(p_days INTEGER DEFAULT 30)
RETURNS TABLE(
  id UUID,
  email TEXT,
  name TEXT,
  last_heartbeat TIMESTAMPTZ,
  days_inactive INTEGER,
  total_usage INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.email,
    u.name,
    u.last_heartbeat,
    EXTRACT(DAY FROM NOW() - u.last_heartbeat)::INTEGER AS days_inactive,
    u.total_usage
  FROM users u
  WHERE
    u.is_uninstalled = false
    AND u.last_heartbeat < NOW() - INTERVAL '1 day' * p_days
  ORDER BY u.last_heartbeat ASC;
END;
$$;

-- 7. 顯示遷移完成訊息
DO $$
BEGIN
    RAISE NOTICE '=== HotTea 卸載追蹤系統建立完成 ===';
    RAISE NOTICE '新增欄位: last_heartbeat, uninstall_url_set_at, is_uninstalled, uninstalled_at';
    RAISE NOTICE '新建表格: uninstall_logs';
    RAISE NOTICE '新建 RPC 函數: update_heartbeat, log_uninstall, get_inactive_users';
    RAISE NOTICE '現在可以追蹤用戶卸載和流失狀態';
END
$$;
