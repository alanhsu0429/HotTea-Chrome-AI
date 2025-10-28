-- HotTea 兼容性遷移 - 保留現有資料，建立新的簡化架構
-- 此遷移腳本不會刪除現有的 user_profiles, api_usage, dialogues 等表格

-- 建立新的簡化用戶表（與現有 user_profiles 並存）
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  api_key TEXT UNIQUE DEFAULT gen_random_uuid(),
  daily_quota INTEGER DEFAULT 50,
  is_premium BOOLEAN DEFAULT false,
  total_usage INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 建立新的使用記錄表（更簡化）
CREATE TABLE IF NOT EXISTS usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  prompt_length INTEGER,
  response_length INTEGER,
  success BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 建立索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_users_api_key ON users(api_key);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_date ON usage_logs(user_id, created_at);

-- 如果存在舊的 user_profiles 資料，遷移到新的 users 表
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
        -- 遷移現有用戶資料到新表
        INSERT INTO users (email, name, daily_quota, is_premium, total_usage, created_at, updated_at)
        SELECT 
            COALESCE(au.email, 'unknown@example.com'), -- 從 auth.users 取得 email
            up.display_name,
            up.daily_quota,
            up.is_premium,
            up.total_usage,
            up.created_at,
            up.updated_at
        FROM user_profiles up
        LEFT JOIN auth.users au ON au.id = up.id
        ON CONFLICT (email) DO NOTHING; -- 避免重複插入
        
        RAISE NOTICE 'Migrated existing user profiles to users table';
    END IF;
END
$$;

-- 建立 RPC 函數：註冊或取得用戶 API Key
CREATE OR REPLACE FUNCTION register_or_get_user(user_email TEXT, user_name TEXT DEFAULT NULL)
RETURNS TABLE(api_key TEXT, daily_quota INTEGER, total_usage INTEGER) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- 檢查用戶是否已存在
  SELECT * INTO user_record FROM users WHERE email = user_email;
  
  IF user_record IS NULL THEN
    -- 建立新用戶
    INSERT INTO users (email, name, api_key, daily_quota, total_usage)
    VALUES (user_email, user_name, gen_random_uuid(), 50, 0)
    RETURNING users.api_key, users.daily_quota, users.total_usage 
    INTO api_key, daily_quota, total_usage;
    
    RAISE NOTICE 'Created new user: %', user_email;
  ELSE
    -- 回傳現有用戶資訊
    SELECT user_record.api_key, user_record.daily_quota, user_record.total_usage
    INTO api_key, daily_quota, total_usage;
    
    RAISE NOTICE 'Returned existing user: %', user_email;
  END IF;
  
  RETURN NEXT;
END;
$$;

-- 建立 RPC 函數：取得今日使用量
CREATE OR REPLACE FUNCTION get_today_usage(user_api_key TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  usage_count INTEGER;
  user_id_val UUID;
BEGIN
  -- 根據 API Key 取得用戶 ID
  SELECT id INTO user_id_val FROM users WHERE api_key = user_api_key;
  
  IF user_id_val IS NULL THEN
    RETURN -1; -- API Key 無效
  END IF;
  
  -- 計算今日使用量
  SELECT COUNT(*) INTO usage_count
  FROM usage_logs
  WHERE user_id = user_id_val 
    AND created_at >= CURRENT_DATE
    AND success = true;
  
  RETURN COALESCE(usage_count, 0);
END;
$$;

-- 建立 RPC 函數：記錄使用
CREATE OR REPLACE FUNCTION log_usage(
  user_api_key TEXT,
  prompt_len INTEGER DEFAULT 0,
  response_len INTEGER DEFAULT 0,
  is_success BOOLEAN DEFAULT true
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id_val UUID;
BEGIN
  -- 根據 API Key 取得用戶 ID
  SELECT id INTO user_id_val FROM users WHERE api_key = user_api_key;
  
  IF user_id_val IS NULL THEN
    RETURN false; -- API Key 無效
  END IF;
  
  -- 插入使用記錄
  INSERT INTO usage_logs (user_id, prompt_length, response_length, success)
  VALUES (user_id_val, prompt_len, response_len, is_success);
  
  -- 更新總使用量（如果成功）
  IF is_success THEN
    UPDATE users 
    SET total_usage = total_usage + 1, updated_at = NOW()
    WHERE id = user_id_val;
  END IF;
  
  RETURN true;
END;
$$;

-- 建立 RPC 函數：根據 API Key 取得用戶資訊
CREATE OR REPLACE FUNCTION get_user_by_api_key(user_api_key TEXT)
RETURNS TABLE(
  id UUID, 
  email TEXT, 
  name TEXT, 
  daily_quota INTEGER, 
  is_premium BOOLEAN, 
  total_usage INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT users.id, users.email, users.name, users.daily_quota, users.is_premium, users.total_usage
  FROM users
  WHERE users.api_key = user_api_key;
END;
$$;

-- 插入測試用戶（僅供開發測試）
INSERT INTO users (email, name, api_key, daily_quota, is_premium, total_usage) 
VALUES ('test@hottea.app', 'Test User', 'test-api-key-for-development', 1000, true, 0)
ON CONFLICT (email) DO NOTHING;

-- 顯示遷移完成訊息
DO $$
BEGIN
    RAISE NOTICE '=== HotTea 兼容性遷移完成 ===';
    RAISE NOTICE '新建立的表格: users, usage_logs';
    RAISE NOTICE '新建立的 RPC 函數: register_or_get_user, get_today_usage, log_usage, get_user_by_api_key';
    RAISE NOTICE '現有的表格已保留，不會影響現有資料';
END
$$;