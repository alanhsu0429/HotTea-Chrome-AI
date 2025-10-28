// HotTea 卸載追蹤 Edge Function
// 處理擴充功能卸載回調，記錄卸載事件到資料庫
// 遵循 CLAUDE.md 開發規範

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  // CORS 處理
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  try {
    const url = new URL(req.url);
    const apiKey = url.searchParams.get('api_key');
    const reason = url.searchParams.get('reason');
    const feedback = url.searchParams.get('feedback');

    const userAgent = req.headers.get('user-agent') || '';
    const referrer = req.headers.get('referer') || '';

    console.log('📍 收到卸載追蹤請求');
    console.log('🔑 API Key:', apiKey ? `${apiKey.substring(0, 8)}...` : '無');
    console.log('📝 原因:', reason || '未提供');

    // 創建 Supabase 客戶端
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (apiKey) {
      // 有 API Key，使用安全版本記錄卸載事件（含 Rate Limiting 和驗證）
      const { data, error } = await supabase.rpc('log_uninstall_secure', {
        p_api_key: apiKey,
        p_reason: reason,
        p_feedback: feedback,
        p_user_agent: userAgent,
        p_referrer: referrer,
      });

      if (error) {
        console.error('❌ 記錄卸載失敗:', error);
      } else {
        const result = data as any;
        if (result.success) {
          console.log('✅ 卸載記錄成功:', result);
        } else {
          // Rate Limiting 或 API Key 驗證失敗
          console.warn('⚠️ 卸載記錄被拒絕:', result);

          // 如果是 Rate Limiting，重定向到特殊提示頁面
          if (result.error === 'rate_limit_exceeded') {
            return new Response(null, {
              status: 302,
              headers: {
                'Location': `https://hottea.app/rate-limit?reset_at=${encodeURIComponent(result.reset_at)}`,
                'Access-Control-Allow-Origin': '*',
              },
            });
          }

          // 如果是 API Key 無效，重定向到通用感謝頁面
          if (result.error === 'invalid_api_key') {
            return new Response(null, {
              status: 302,
              headers: {
                'Location': 'https://hottea.app/thank-you',
                'Access-Control-Allow-Origin': '*',
              },
            });
          }
        }
      }
    } else {
      console.warn('⚠️ 缺少 API Key，無法追蹤個別用戶');
    }

    // 重定向到問卷頁面或感謝頁面
    // 如果已提供原因，直接到感謝頁面；否則到問卷頁面
    const redirectUrl = reason
      ? 'https://hottea.app/thank-you'
      : `https://hottea.app/feedback${apiKey ? `?api_key=${apiKey}` : ''}`;

    console.log('🔀 重定向到:', redirectUrl);

    // 使用 HTTP 302 重定向（Chrome 的 setUninstallURL 支援 HTTP 重定向）
    return new Response(null, {
      status: 302,
      headers: {
        'Location': redirectUrl,
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('❌ 處理卸載回調失敗:', error);

    // 即使失敗也重定向到首頁
    return new Response(null, {
      status: 302,
      headers: {
        'Location': 'https://hottea.app',
      },
    });
  }
});
