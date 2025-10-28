-- HotTea 卸載追蹤 Rate Limiting 安全強化
-- 防止濫用提交假卸載記錄
-- 遵循 CLAUDE.md 開發規範

-- 1. 在 uninstall_logs 表新增索引以加速 Rate Limiting 查詢
CREATE INDEX IF NOT EXISTS idx_uninstall_logs_api_key_created_at
ON uninstall_logs(api_key, created_at DESC);

-- 2. 創建 RPC 函數：檢查 Rate Limiting（24 小時內最多 3 次）
CREATE OR REPLACE FUNCTION check_uninstall_rate_limit(p_api_key TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
  v_earliest_log TIMESTAMPTZ;
  v_result JSONB;
BEGIN
  -- 計算過去 24 小時內該 API Key 的卸載記錄數量
  SELECT COUNT(*), MIN(created_at)
  INTO v_count, v_earliest_log
  FROM uninstall_logs
  WHERE api_key = p_api_key
    AND created_at > NOW() - INTERVAL '24 hours';

  -- 如果超過限制（3 次）
  IF v_count >= 3 THEN
    v_result := jsonb_build_object(
      'allowed', false,
      'reason', 'rate_limit_exceeded',
      'count', v_count,
      'reset_at', v_earliest_log + INTERVAL '24 hours',
      'message', 'Too many uninstall attempts. Please try again later.'
    );
    RETURN v_result;
  END IF;

  -- 通過 Rate Limiting 檢查
  v_result := jsonb_build_object(
    'allowed', true,
    'count', v_count,
    'remaining', 3 - v_count
  );
  RETURN v_result;
END;
$$;

-- 3. 更新 log_uninstall 函數，加入 Rate Limiting 和 API Key 驗證
CREATE OR REPLACE FUNCTION log_uninstall_secure(
  p_api_key TEXT,
  p_reason TEXT DEFAULT NULL,
  p_feedback TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_referrer TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_email TEXT;
  v_log_id UUID;
  v_rate_limit_check JSONB;
  v_result JSONB;
BEGIN
  -- 步驟 1: 驗證 API Key 是否存在且有效
  SELECT id, email INTO v_user_id, v_email
  FROM users
  WHERE api_key = p_api_key;

  IF v_user_id IS NULL THEN
    -- API Key 無效，拒絕請求
    v_result := jsonb_build_object(
      'success', false,
      'error', 'invalid_api_key',
      'message', 'Invalid API Key'
    );
    RETURN v_result;
  END IF;

  -- 步驟 2: 檢查 Rate Limiting
  v_rate_limit_check := check_uninstall_rate_limit(p_api_key);

  IF NOT (v_rate_limit_check->>'allowed')::BOOLEAN THEN
    -- Rate Limiting 超限，拒絕請求
    v_result := jsonb_build_object(
      'success', false,
      'error', 'rate_limit_exceeded',
      'message', v_rate_limit_check->>'message',
      'reset_at', v_rate_limit_check->>'reset_at'
    );
    RETURN v_result;
  END IF;

  -- 步驟 3: 插入卸載日誌
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

  -- 步驟 4: 更新 users 表
  UPDATE users
  SET is_uninstalled = true,
      uninstalled_at = NOW(),
      updated_at = NOW()
  WHERE id = v_user_id;

  -- 步驟 5: 回傳成功結果
  v_result := jsonb_build_object(
    'success', true,
    'log_id', v_log_id,
    'message', 'Uninstall logged successfully'
  );
  RETURN v_result;
END;
$$;

-- 4. 保留舊的 log_uninstall 函數作為向後相容（但標記為 deprecated）
COMMENT ON FUNCTION log_uninstall(TEXT, TEXT, TEXT, TEXT, TEXT) IS 'DEPRECATED: Use log_uninstall_secure instead. This function lacks rate limiting and security checks.';

-- 5. 顯示遷移完成訊息
DO $$
BEGIN
    RAISE NOTICE '=== HotTea 卸載追蹤 Rate Limiting 安全強化完成 ===';
    RAISE NOTICE '新增索引: idx_uninstall_logs_api_key_created_at';
    RAISE NOTICE '新建 RPC 函數: check_uninstall_rate_limit, log_uninstall_secure';
    RAISE NOTICE 'Rate Limiting 規則: 每個 API Key 限制 24 小時內最多 3 次卸載記錄';
    RAISE NOTICE '安全強化: 驗證 API Key 有效性，拒絕無效請求';
END
$$;
