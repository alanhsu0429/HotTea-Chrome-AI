/**
 * UnifiedExtractor - 統一內容擷取器
 * 整合三層架構：結構化資料 → Readability → 網站規則
 */

// Readability 將在 UnifiedExtractor 建構時動態載入

class UnifiedExtractor {
  constructor(options = {}) {
    this.debug = options.debug || false;

    // 動態載入 Readability - 延遲初始化
    this.initializeReadability();

    // 網站專用規則
    this.siteRules = {
      'cnyes.com': {
        content: '.news-content, .article-content, .content',
        title: 'h1, .news-title'
      },
      'yahoo.com': {
        content: '.atoms, article, .content',
        title: 'h1, .title'
      }
    };
  }

  /**
   * 動態初始化 Readability - 延遲載入確保相依性可用
   */
  initializeReadability() {
    try {
      // 瀏覽器環境檢查
      if (typeof window !== 'undefined') {
        this.Readability = window.Readability;
        this.isProbablyReaderable = window.isProbablyReaderable;

        if (this.Readability && this.isProbablyReaderable) {
          this.debugLog('✅ Readability 動態載入成功');
          return true;
        }
      }

      // Node.js 環境
      if (typeof require !== 'undefined') {
        try {
          const readability = require('@mozilla/readability');
          this.Readability = readability.Readability;
          this.isProbablyReaderable = readability.isProbablyReaderable;
          this.debugLog('✅ Readability Node.js 載入成功');
          return true;
        } catch (requireError) {
          this.debugLog('⚠️ Node.js Readability 載入失敗:', requireError.message);
        }
      }

      this.debugLog('⚠️ Readability 尚未載入，將使用基本擷取模式');
      return false;
    } catch (error) {
      this.debugLog('❌ Readability 初始化失敗:', error);
      return false;
    }
  }

  /**
   * 主要擷取函數 - 三層架構
   * @param {Document} doc - DOM 文檔
   * @returns {Object|null} 擷取結果
   */
  async extract(doc = document) {
    try {
      this.debugLog('🚀 開始統一內容擷取...');

      let structuredData = null;
      let readabilityResult = null;

      // 第一層：擷取結構化資料（元資料輔助）
      structuredData = this.extractStructuredData(doc);
      if (structuredData) {
        this.debugLog('✅ 結構化資料擷取完成');
      }

      // 第二層：必定執行 Readability 分析
      readabilityResult = await this.extractWithReadability(doc);

      if (readabilityResult) {
        this.debugLog('✅ Readability 解析成功');
        // 合併結果
        return this.mergeResults(readabilityResult, structuredData, doc);
      }

      this.debugLog('⚠️ Readability 解析失敗，使用網站規則');

      // 第三層：網站專用規則（備用方案）
      const customResult = this.applyCustomRules(doc, structuredData);
      if (customResult) {
        this.debugLog('✅ 網站規則擷取成功');
        return customResult;
      }

      this.debugLog('❌ 所有策略都失敗了');
      return null;

    } catch (error) {
      console.error('❌ UnifiedExtractor 錯誤:', error);
      return null;
    }
  }

  /**
   * 第一層：擷取結構化資料
   * @param {Document} doc
   * @returns {Object|null} 結構化資料
   */
  extractStructuredData(doc) {
    const data = {};
    let hasData = false;

    try {
      // JSON-LD
      const jsonLdScripts = doc.querySelectorAll('script[type="application/ld+json"]');
      for (const script of jsonLdScripts) {
        try {
          const jsonData = JSON.parse(script.textContent);
          const articles = Array.isArray(jsonData) ? jsonData : [jsonData];

          for (const item of articles) {
            if (item['@type'] === 'NewsArticle' || item['@type'] === 'Article') {
              data.title = item.headline || item.name;
              data.author = item.author?.name || item.author;
              data.publishedTime = item.datePublished || item.dateCreated;
              data.description = item.description;
              hasData = true;
              break;
            }
          }
        } catch (e) {
          this.debugLog('⚠️ JSON-LD 解析失敗:', e.message);
        }
      }

      // OpenGraph 標籤
      const ogTags = {
        'og:title': 'title',
        'og:description': 'description',
        'og:article:author': 'author',
        'og:article:published_time': 'publishedTime'
      };

      for (const [property, key] of Object.entries(ogTags)) {
        const tag = doc.querySelector(`meta[property="${property}"]`);
        if (tag && !data[key]) {
          data[key] = tag.getAttribute('content');
          hasData = true;
        }
      }

      // Twitter Card
      const twitterTags = {
        'twitter:title': 'title',
        'twitter:description': 'description'
      };

      for (const [name, key] of Object.entries(twitterTags)) {
        const tag = doc.querySelector(`meta[name="${name}"]`);
        if (tag && !data[key]) {
          data[key] = tag.getAttribute('content');
          hasData = true;
        }
      }

      this.debugLog(`📊 結構化資料摘要:`, {
        title: data.title ? `${data.title.substring(0, 30)}...` : 'None',
        author: data.author || 'None',
        hasData
      });

      return hasData ? data : null;

    } catch (error) {
      this.debugLog('❌ 結構化資料擷取錯誤:', error);
      return null;
    }
  }

  /**
   * 第二層：使用 Readability 解析（核心引擎）
   * @param {Document} doc
   * @returns {Object|null} Readability 結果
   */
  async extractWithReadability(doc) {
    try {
      // 動態檢查並重新初始化 Readability（如果需要）
      if (!this.Readability || !this.isProbablyReaderable) {
        this.debugLog('⚠️ Readability 尚未載入，嘗試重新初始化...');
        if (!this.initializeReadability()) {
          this.debugLog('⚠️ Readability 初始化失敗，跳過此層');
          return null;
        }
      }

      // 檢查頁面是否適合 Readability
      const isReadable = this.isProbablyReaderable(doc, {
        minContentLength: 200,
        minScore: 20
      });

      if (!isReadable) {
        this.debugLog('⚠️ 頁面可能不適合 Readability 解析');
      }

      // 複製 DOM 避免修改原始頁面
      const documentClone = doc.cloneNode(true);

      // 🛡️ 移除 Cookie Notice 元素（避免 Readability 誤判）
      this.removeCookieNoticeElements(documentClone);

      // 建立 Readability 實例
      const reader = new this.Readability(documentClone, {
        debug: this.debug,
        maxElemsToParse: 0, // 無限制
        nbTopCandidates: 5,
        charThreshold: 500,
        classesToPreserve: [],
        keepClasses: false,
        disableJSONLD: false // 允許使用 JSON-LD
      });

      // 執行解析
      const result = reader.parse();

      if (result) {
        this.debugLog('🔧 Readability 解析結果:', {
          title: result.title ? `${result.title.substring(0, 30)}...` : 'None',
          contentLength: result.textContent?.length || 0,
          excerpt: result.excerpt ? `${result.excerpt.substring(0, 50)}...` : 'None'
        });

        // 驗證內容品質
        if (result.textContent && result.textContent.length > 100) {
          return result;
        } else {
          this.debugLog('⚠️ Readability 內容過短，品質不足');
          return null;
        }
      }

      this.debugLog('⚠️ Readability 未能解析出內容');
      return null;

    } catch (error) {
      this.debugLog('❌ Readability 解析失敗:', error);
      return null;
    }
  }

  /**
   * 移除 Cookie Notice 相關元素
   * 避免 Readability 誤判 Cookie 政策為主要內容
   * @param {Document} doc - 文檔物件
   */
  removeCookieNoticeElements(doc) {
    try {
      // OneTrust Cookie Notice 選擇器（CNBC 等網站使用）
      const cookieSelectors = [
        '#onetrust-consent-sdk',
        '#ot-pc-sdk',
        '#ot-sdk-cookie-policy',
        '[id^="onetrust"]',
        '[class*="cookie-notice"]',
        '[class*="cookie-banner"]',
        '[class*="cookie-consent"]',
        '[class*="gdpr-banner"]',
        '[aria-label*="Cookie"]',
        '[aria-label*="cookie"]'
      ];

      let removedCount = 0;

      cookieSelectors.forEach(selector => {
        try {
          const elements = doc.querySelectorAll(selector);
          elements.forEach(el => {
            el.remove();
            removedCount++;
          });
        } catch (err) {
          // 忽略選擇器錯誤，繼續處理其他選擇器
        }
      });

      if (removedCount > 0) {
        this.debugLog(`🛡️ 已移除 ${removedCount} 個 Cookie Notice 元素`);
      }

    } catch (error) {
      this.debugLog('⚠️ 移除 Cookie Notice 元素時發生錯誤:', error);
      // 不中斷流程，繼續執行 Readability
    }
  }

  /**
   * 合併 Readability 結果與結構化資料
   * @param {Object} readabilityResult
   * @param {Object} structuredData
   * @param {Document} doc
   * @returns {Object}
   */
  mergeResults(readabilityResult, structuredData, doc) {
    const merged = {
      // 主要內容來自 Readability
      title: readabilityResult.title,
      content: readabilityResult.textContent, // 使用純文字版本
      htmlContent: readabilityResult.content,  // 保留 HTML 版本供未來使用

      // 元資料優先使用結構化資料
      author: readabilityResult.byline || structuredData?.author,
      publishedTime: readabilityResult.publishedTime || structuredData?.publishedTime,
      excerpt: readabilityResult.excerpt || structuredData?.description,

      // 額外資訊
      length: readabilityResult.length,
      siteName: readabilityResult.siteName,
      lang: readabilityResult.lang,
      dir: readabilityResult.dir,

      // 系統資訊
      source: 'Readability+Structured',
      confidence: this.calculateConfidence(readabilityResult, structuredData),
      url: doc.location?.href || ''
    };

    // 使用結構化資料補強標題
    if (!merged.title && structuredData?.title) {
      merged.title = structuredData.title;
    }

    // 如果 Readability 沒有標題，從頁面提取
    if (!merged.title) {
      merged.title = this.extractPageTitle(doc);
    }

    return merged;
  }

  /**
   * 第三層：應用網站專用規則
   * @param {Document} doc
   * @param {Object} structuredData
   * @returns {Object|null}
   */
  applyCustomRules(doc, structuredData) {
    try {
      const hostname = doc.location?.hostname || '';
      const domain = this.getDomain(hostname);

      if (this.siteRules[domain]) {
        this.debugLog(`🎯 應用 ${domain} 專用規則`);
        return this.extractWithCustomRule(doc, this.siteRules[domain], structuredData);
      }

      // 基本回退策略
      return this.basicTextExtraction(doc, structuredData);

    } catch (error) {
      this.debugLog('❌ 自定義規則應用失敗:', error);
      return null;
    }
  }

  /**
   * 使用網站規則擷取內容
   * @param {Document} doc
   * @param {Object} rule
   * @param {Object} structuredData
   * @returns {Object|null}
   */
  extractWithCustomRule(doc, rule, structuredData) {
    const contentSelectors = rule.content.split(', ');

    for (const selector of contentSelectors) {
      const element = doc.querySelector(selector.trim());
      if (element) {
        const text = this.extractTextFromElement(element);
        if (text && text.length > 100) {
          return {
            title: this.extractTitleWithRule(doc, rule.title) || structuredData?.title,
            content: this.cleanText(text),
            source: `Custom rule: ${this.getDomain(doc.location?.hostname)}`,
            confidence: 'medium',
            url: doc.location?.href || ''
          };
        }
      }
    }
    return null;
  }

  /**
   * 基本文字擷取（最後回退）
   * @param {Document} doc
   * @param {Object} structuredData
   * @returns {Object|null}
   */
  basicTextExtraction(doc, structuredData) {
    this.debugLog('🔄 使用基本文字擷取...');

    const contentSelectors = ['article', 'main', '.content', '.article-content', '.post-content'];

    for (const selector of contentSelectors) {
      const element = doc.querySelector(selector);
      if (element) {
        const text = this.extractTextFromElement(element);
        if (text && text.length > 200) {
          return {
            title: structuredData?.title || this.extractPageTitle(doc),
            content: this.cleanText(text),
            source: 'Basic extraction',
            confidence: 'low',
            url: doc.location?.href || ''
          };
        }
      }
    }

    return null;
  }

  /**
   * 計算擷取信心度
   * @param {Object} readabilityResult
   * @param {Object} structuredData
   * @returns {string}
   */
  calculateConfidence(readabilityResult, structuredData) {
    let score = 0;

    // Readability 結果品質
    if (readabilityResult.length > 1000) score += 3;
    else if (readabilityResult.length > 500) score += 2;
    else score += 1;

    // 是否有結構化資料支援
    if (structuredData) score += 2;

    // 是否有完整元資料
    if (readabilityResult.title && readabilityResult.byline) score += 1;

    if (score >= 5) return 'high';
    if (score >= 3) return 'medium';
    return 'low';
  }

  /**
   * 提取元素文字內容
   * @param {Element} element
   * @returns {string}
   */
  extractTextFromElement(element) {
    if (!element) return '';

    const clone = element.cloneNode(true);
    const scripts = clone.querySelectorAll('script, style, noscript');
    scripts.forEach(script => script.remove());

    return clone.textContent || clone.innerText || '';
  }

  /**
   * 清理文字內容
   * @param {string} text
   * @returns {string}
   */
  cleanText(text) {
    if (!text) return '';

    return text
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n\n')
      .trim()
      .substring(0, 2500);
  }

  /**
   * 提取頁面標題
   * @param {Document} doc
   * @returns {string}
   */
  extractPageTitle(doc) {
    const h1 = doc.querySelector('h1');
    if (h1 && h1.textContent.trim()) {
      return h1.textContent.trim();
    }

    const title = doc.title || '';
    return title.split('|')[0].split('-')[0].trim() || '無標題';
  }

  /**
   * 使用規則提取標題
   * @param {Document} doc
   * @param {string} titleRule
   * @returns {string|null}
   */
  extractTitleWithRule(doc, titleRule) {
    if (!titleRule) return null;

    const selectors = titleRule.split(', ');
    for (const selector of selectors) {
      const element = doc.querySelector(selector.trim());
      if (element) {
        const title = element.textContent.trim();
        if (title && title.length > 5 && title.length < 200) {
          return title;
        }
      }
    }
    return null;
  }

  /**
   * 從 hostname 取得主域名
   * @param {string} hostname
   * @returns {string}
   */
  getDomain(hostname) {
    if (!hostname) return '';
    return hostname.replace(/^(www\.|m\.)/, '');
  }

  /**
   * 除錯日誌輸出
   * @param {string} message
   * @param {...any} args
   */
  debugLog(message, ...args) {
    if (this.debug) {
      console.log('🔧 [UnifiedExtractor]', message, ...args);
    }
  }
}

// Node.js 環境匯出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UnifiedExtractor;
}

// 瀏覽器環境匯出
if (typeof window !== 'undefined') {
  window.UnifiedExtractor = UnifiedExtractor;
}