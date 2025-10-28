
// supabase/functions/log-uninstall/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // 您可以將 '*' 換成您的網站域名，例如 'https://hottea.app'
  'Access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
}

// 結構化日誌
function log(level: 'INFO' | 'WARN' | 'ERROR', message: string, data?: any) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    service: 'log-uninstall',
    message,
    ...data
  }));
}

serve(async (req) => {
  // 處理 CORS 預檢請求
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { token, reason, feedback } = await req.json();

    if (!token) {
      log('WARN', 'Missing token in request body');
      return new Response(JSON.stringify({ error: 'Token is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 安全地建立 Supabase 管理員客戶端
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    log('INFO', 'Processing uninstall token', { tokenPrefix: token.substring(0, 8) });

    // 呼叫我們在資料庫中建立的 RPC 函式
    const { data, error } = await supabaseAdmin.rpc('log_uninstall_by_token', {
      p_token: token,
      p_reason: reason,
      p_feedback: feedback,
      p_user_agent: req.headers.get('user-agent'),
      p_referrer: req.headers.get('referrer')
    });

    if (error) {
      log('ERROR', 'RPC log_uninstall_by_token failed', { error: error.message });
      throw error;
    }

    log('INFO', 'Successfully logged uninstall', { logId: data });

    return new Response(JSON.stringify({ success: true, logId: data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    log('ERROR', 'Unexpected error in log-uninstall function', { errorMessage: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
})
