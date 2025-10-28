-- HotTea 對話日誌表 - 記錄完整的對話生成過程
-- 用於分析和優化對話品質

-- 建立對話日誌表
CREATE TABLE IF NOT EXISTS dialogue_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  news_url TEXT,
  news_title TEXT,
  news_content TEXT,     -- 完整新聞內容
  prompt TEXT,           -- 完整提示詞
  response JSONB,        -- 完整 API 回應
  tokens JSONB,          -- Token 統計資訊
  execution_time_ms INTEGER,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 建立索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_dialogue_logs_user_date ON dialogue_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_dialogue_logs_success ON dialogue_logs(success);
CREATE INDEX IF NOT EXISTS idx_dialogue_logs_url ON dialogue_logs(news_url);

-- 建立 RPC 函數：記錄對話日誌
CREATE OR REPLACE FUNCTION log_dialogue(
  p_api_key TEXT,
  p_news_url TEXT,
  p_news_title TEXT,
  p_news_content TEXT,
  p_prompt TEXT,
  p_response JSONB,
  p_tokens JSONB,
  p_execution_time_ms INTEGER DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_log_id UUID;
BEGIN
  -- 根據 API Key 取得用戶 ID
  SELECT id INTO v_user_id FROM users WHERE api_key = p_api_key;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Invalid API Key';
  END IF;
  
  -- 插入對話日誌
  INSERT INTO dialogue_logs (
    user_id, 
    news_url, 
    news_title, 
    news_content,
    prompt, 
    response, 
    tokens,
    execution_time_ms,
    success,
    error_message
  ) VALUES (
    v_user_id, 
    p_news_url, 
    p_news_title, 
    p_news_content,
    p_prompt, 
    p_response, 
    p_tokens,
    p_execution_time_ms,
    p_error_message IS NULL,
    p_error_message
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- 建立 RPC 函數：取得用戶對話歷史
CREATE OR REPLACE FUNCTION get_user_dialogue_logs(
  p_api_key TEXT,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
  id UUID,
  news_title TEXT,
  news_url TEXT,
  success BOOLEAN,
  tokens JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- 根據 API Key 取得用戶 ID
  SELECT users.id INTO v_user_id FROM users WHERE api_key = p_api_key;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Invalid API Key';
  END IF;
  
  -- 回傳用戶的對話歷史
  RETURN QUERY
  SELECT 
    dl.id,
    dl.news_title,
    dl.news_url,
    dl.success,
    dl.tokens,
    dl.created_at
  FROM dialogue_logs dl
  WHERE dl.user_id = v_user_id
  ORDER BY dl.created_at DESC
  LIMIT p_limit;
END;
$$;

-- 顯示遷移完成訊息
DO $$
BEGIN
    RAISE NOTICE '=== HotTea 對話日誌系統建立完成 ===';
    RAISE NOTICE '新建立的表格: dialogue_logs';
    RAISE NOTICE '新建立的 RPC 函數: log_dialogue, get_user_dialogue_logs';
    RAISE NOTICE '現在可以記錄完整的對話生成過程供分析和優化';
END
$$;