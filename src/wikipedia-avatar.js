// Wikipedia Avatar Service Module
// Provides character avatar query and caching functionality with copyright compliance

import { logger } from './utils/logger.js';
import { isEnglishLanguage } from './utils/i18n-helper.js';

class WikipediaAvatarService {
  constructor() {
    this.API_TIMEOUT = 3000; // 3 second timeout
    this.sessionCache = new Map(); // Session cache to avoid repeated queries for the same person
  }

  // Dynamically select optimal thumbnail size
  getDynamicThumbnailSize() {
    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
    const avatarSize = 40; // CSS pixels
    const targetSize = avatarSize * dpr * 2; // 2x supersampling

    // Use Wikimedia pre-rendered sizes for optimal performance
    const preRenderedSizes = [320, 640, 800, 1024, 1280, 1920];

    // Select the closest pre-rendered size
    const optimalSize = preRenderedSizes.find(size => size >= targetSize) || 320;

    logger.log(`📏 Selected image size: ${optimalSize}px (DPR: ${dpr}, Target: ${targetSize}px)`);
    return optimalSize;
  }

  // Get avatar URL for a person
  async getAvatarUrl(speakerName) {
    try {
      const thumbnailSize = this.getDynamicThumbnailSize();
      const cacheKey = `avatar_${speakerName}`;

      // Check session cache
      if (this.sessionCache.has(cacheKey)) {
        const cached = this.sessionCache.get(cacheKey);
        logger.log(`⚡ Using cached result: ${speakerName}`);
        return cached;
      }

      // Use unified best match search
      logger.log(`🔍 Starting avatar query: ${speakerName}`);
      const match = await this.findBestWikipediaMatch(speakerName);

      let avatarUrl = null;
      if (match) {
        logger.log(`📍 Found matching page: ${match.title} (${match.lang})`);
        avatarUrl = await this.queryWikipediaAPIWithRetry(match.title, match.lang);

        if (avatarUrl) {
          logger.log(`🖼️ Successfully retrieved avatar: ${speakerName} -> ${avatarUrl}`);
        } else {
          logger.log(`❌ Matching page has no avatar: ${match.title} (${match.lang})`);
        }
      } else {
        logger.log(`❌ No matching page found: ${speakerName}`);
      }

      // Cache result in session cache (including null results)
      this.sessionCache.set(cacheKey, avatarUrl);

      if (avatarUrl) {
        logger.log(`✅ Retrieved Wikipedia avatar: ${speakerName} -> ${avatarUrl}`);
        return avatarUrl;
      } else {
        logger.log(`ℹ️ Avatar not found, using default: ${speakerName}`);
        return null;
      }

    } catch (error) {
      logger.error(`❌ Failed to retrieve avatar: ${speakerName}`, error);
      return null;
    }
  }


  // Name normalization function - used to compare if two names are the same
  normalizeName(name) {
    if (!name) return '';

    // Remove extra whitespace and punctuation, convert to lowercase
    return name
      .toLowerCase()
      .replace(/[，。、；：！？]/g, '') // Remove Chinese punctuation
      .replace(/[,.\-;:!?'"]/g, '')    // Remove English punctuation
      .replace(/\s+/g, ' ')            // Merge extra whitespace
      .trim();
  }

  // Check if there is an exact match
  isExactMatch(searchTerm, candidateTitle) {
    const normalizedSearch = this.normalizeName(searchTerm);
    const normalizedTitle = this.normalizeName(candidateTitle);

    // 1. Exact equality
    if (normalizedSearch === normalizedTitle) {
      logger.log(`✅ Exact match: "${searchTerm}" === "${candidateTitle}"`);
      return true;
    }

    // 2. Check for containment relationship (avoid partial matches)
    const searchWords = normalizedSearch.split(/\s+/).filter(w => w.length > 0);
    const titleWords = normalizedTitle.split(/\s+/).filter(w => w.length > 0);

    // All search words must appear completely in the title
    const allWordsMatch = searchWords.every(searchWord =>
      titleWords.some(titleWord =>
        titleWord === searchWord ||
        (searchWord.length > 2 && titleWord.includes(searchWord))
      )
    );

    // Ensure search word count is reasonable (avoid overly broad matches)
    const lengthRatio = searchWords.length / titleWords.length;
    const isReasonableMatch = lengthRatio >= 0.3; // At least 30% word match

    if (allWordsMatch && isReasonableMatch) {
      logger.log(`✅ Partial exact match: "${searchTerm}" ~ "${candidateTitle}" (${searchWords.length}/${titleWords.length} words)`);
      return true;
    }

    logger.log(`❌ No match: "${searchTerm}" ≠ "${candidateTitle}"`);
    return false;
  }

  // Search Wikipedia using OpenSearch API and verify exact match page titles
  async searchWikipediaTitle(searchTerm, lang = 'zh') {
    try {
      const baseUrl = lang === 'zh'
        ? 'https://zh.wikipedia.org/w/api.php'
        : 'https://en.wikipedia.org/w/api.php';

      // Add Traditional Chinese variant parameters for Chinese Wikipedia
      const variantParam = lang === 'zh' ? '&converttitles=1&uselang=zh-tw&variant=zh-tw' : '';
      // Use more precise search: classic profile + increase candidate count
      const url = `${baseUrl}?action=opensearch&search=${encodeURIComponent(searchTerm)}&profile=classic&limit=5&format=json&origin=*${variantParam}`;

      logger.log(`🔍 Starting precise search: "${searchTerm}" (${lang})`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.API_TIMEOUT);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'HotTea-Extension/5.8 (https://github.com/your-repo/hottea)'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const [term, titles] = await response.json();

      if (!titles || titles.length === 0) {
        logger.log(`❌ OpenSearch returned no results: "${searchTerm}" (${lang})`);
        return null;
      }

      logger.log(`📋 OpenSearch candidate results: "${searchTerm}" (${lang}) ->`, titles);

      // Verify each candidate result one by one to find exact match
      for (let i = 0; i < titles.length; i++) {
        const candidate = titles[i];

        if (this.isExactMatch(searchTerm, candidate)) {
          logger.log(`✅ Found exact match: "${searchTerm}" -> "${candidate}" (${lang}, candidate #${i+1})`);
          return candidate;
        }
      }

      logger.log(`❌ No exact match: "${searchTerm}" (${lang}) - candidates: [${titles.join(', ')}]`);
      return null; // No exact match found
    } catch (error) {
      logger.warn(`⚠️ OpenSearch failed: ${searchTerm} (${lang})`, error);
      return null; // Return null on error
    }
  }

  // Fetch avatar from Wikipedia (improved search flow)
  async fetchFromWikipedia(name) {
    try {
      // 1. Search Chinese Wikipedia using OpenSearch for best title
      const zhTitle = await this.searchWikipediaTitle(name, 'zh');
      if (zhTitle) {
        let avatarUrl = await this.queryWikipediaAPIWithRetry(zhTitle, 'zh');
        if (avatarUrl) {
          return avatarUrl;
        }
      }

      // 2. Search English Wikipedia using OpenSearch
      const enTitle = await this.searchWikipediaTitle(name, 'en');
      if (enTitle) {
        let avatarUrl = await this.queryWikipediaAPIWithRetry(enTitle, 'en');
        if (avatarUrl) {
          return avatarUrl;
        }
      }

      // 3. Fallback to hardcoded mapping
      const englishName = this.getEnglishName(name);
      if (englishName && englishName !== name) {
        avatarUrl = await this.queryWikipediaAPIWithRetry(englishName, 'en');
        if (avatarUrl) {
          return avatarUrl;
        }
      }

      return null;
    } catch (error) {
      logger.error('Wikipedia query failed:', error);
      return null;
    }
  }

  // API query with fallback retry for different sizes
  async queryWikipediaAPIWithRetry(title, lang) {
    // Fallback size sequence: from optimal quality to acceptable quality
    const fallbackSizes = [this.getDynamicThumbnailSize(), 320, 200, 100];

    for (let i = 0; i < fallbackSizes.length; i++) {
      const size = fallbackSizes[i];
      try {
        logger.log(`🔄 Trying size ${size}px: ${title} (${lang})`);
        const result = await this.queryWikipediaAPI(title, lang, size);
        if (result) {
          if (i > 0) {
            logger.log(`⚠️ Fallback successful, using ${size}px: ${title}`);
          }
          return result;
        }
      } catch (error) {
        logger.warn(`❌ Size ${size}px failed: ${title} - ${error.message}`);
        if (i === fallbackSizes.length - 1) {
          throw error; // Last attempt failed, throw error
        }
      }
    }

    return null;
  }

  // Query Wikipedia API
  async queryWikipediaAPI(title, lang = 'zh', customSize = null) {
    const baseUrl = lang === 'zh'
      ? 'https://zh.wikipedia.org/w/api.php'
      : 'https://en.wikipedia.org/w/api.php';

    // Use dynamic size or specified size
    const thumbnailSize = customSize || this.getDynamicThumbnailSize();
    // Add Traditional Chinese variant parameters for Chinese Wikipedia
    const variantParam = lang === 'zh' ? '&converttitles=1&uselang=zh-tw&variant=zh-tw' : '';
    const url = `${baseUrl}?action=query&titles=${encodeURIComponent(title)}&prop=pageimages&pithumbsize=${thumbnailSize}&format=json&formatversion=2&pilicense=any&piprop=thumbnail&redirects=1&origin=*${variantParam}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.API_TIMEOUT);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'HotTea-Extension/5.3 (https://github.com/your-repo/hottea)'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const pages = data.query?.pages;

      if (pages && pages.length > 0) {
        const page = pages[0];

        if (page.thumbnail?.source) {
          // Verify if image has legal licensing
          if (await this.isLegalImage(page.thumbnail.source)) {
            logger.log(`📸 Found image: ${title} (${lang}) -> ${page.thumbnail.source}`);
            return page.thumbnail.source;
          } else {
            logger.warn(`⚠️ Image licensing issue: ${page.thumbnail.source}`);
          }
        } else {
          logger.log(`❌ No image: ${title} (${lang})`);
        }
      } else {
        logger.log(`❌ Page does not exist: ${title} (${lang})`);
      }

      return null;
    } catch (error) {
      if (error.name === 'AbortError') {
        logger.warn(`⏱️ Wikipedia API timeout: ${title} (${lang})`);
      } else {
        logger.error(`❌ Wikipedia API error: ${title} (${lang})`, error);
      }
      return null;
    }
  }

  // Verify image licensing (simplified version, mainly checks source)
  async isLegalImage(imageUrl) {
    try {
      // Wikipedia/Wikimedia images are generally legally licensed
      // More strict licensing checks can be implemented via imageinfo API
      return imageUrl.includes('upload.wikimedia.org');
    } catch (error) {
      logger.warn('Image licensing check failed:', error);
      return false;
    }
  }

  // Chinese-to-English name mapping (functional requirement for bilingual Wikipedia search)
  // NOTE: Chinese characters are DATA, not UI text - they are lookup keys for matching
  // names from Chinese Wikipedia or Chinese news sources to their English equivalents.
  // This enables the extension to find correct Wikipedia pages regardless of source language.
  getEnglishName(chineseName) {
    const nameMap = {
      '馬斯克': 'Elon Musk',
      '郭台銘': 'Terry Gou',
      '蔡英文': 'Tsai Ing-wen',
      '柯文哲': 'Ko Wen-je',
      '韓國瑜': 'Han Kuo-yu',
      '賴清德': 'Lai Ching-te',
      '彭博記者': 'Bloomberg News',
      '川普': 'Donald Trump',
      '拜登': 'Joe Biden',
      '習近平': 'Xi Jinping',
      '普丁': 'Vladimir Putin',
      '李嘉誠': 'Li Ka-shing',
      '馬雲': 'Jack Ma',
      '馬化騰': 'Ma Huateng',
      '雷軍': 'Lei Jun',
      '任正非': 'Ren Zhengfei'
    };

    return nameMap[chineseName] || null;
  }


  // Get complete person information (avatar, bio, licensing info)
  async getPersonInfo(personName) {
    try {
      const cacheKey = `person_info_${personName}`;

      // Check session cache
      if (this.sessionCache.has(cacheKey)) {
        const cached = this.sessionCache.get(cacheKey);
        logger.log(`⚡ Using cached person info: ${personName}`);
        return cached;
      }

      // Use unified best match search
      const match = await this.findBestWikipediaMatch(personName);

      if (!match) {
        logger.log(`❌ No matching Wikipedia page found: ${personName}`);
        return null;
      }

      const { title, lang } = match;
      const baseUrl = lang === 'zh'
        ? 'https://zh.wikipedia.org/w/api.php'
        : 'https://en.wikipedia.org/w/api.php';

      // Construct API URL - fetch summary, image, and licensing info in one call
      // Add Traditional Chinese variant parameters for Chinese Wikipedia
      const variantParam = lang === 'zh' ? '&converttitles=1&uselang=zh-tw&variant=zh-tw' : '';
      const url = `${baseUrl}?action=query&titles=${encodeURIComponent(title)}&prop=extracts|pageimages|imageinfo&exsentences=3&explaintext=1&pithumbsize=300&iiprop=extmetadata&iiextmetadatafilter=Artist|Credit|LicenseShortName|AttributionRequired&format=json&formatversion=2&pilicense=any&piprop=thumbnail&redirects=1&origin=*${variantParam}`;

      logger.log(`🔍 Fetching complete person info: ${title} (${lang})`);
      logger.log(`📍 Using match result: ${match.title} (${match.lang}) -> ${match.wikiUrl}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.API_TIMEOUT);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'HotTea-Extension/5.6 (https://github.com/your-repo/hottea)'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        logger.error(`❌ API request failed: HTTP ${response.status} for ${title} (${lang})`);
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      // Check for title conversion info
      let convertedTitle = null;
      if (data.query?.converted) {
        logger.log('🔄 Title conversion info:', data.query.converted);
        // converted is an array containing from and to
        convertedTitle = data.query.converted[0]?.to;
        logger.log(`🔄 Title converted: "${data.query.converted[0]?.from}" → "${convertedTitle}"`);
      }

      const pages = data.query?.pages;

      if (!pages || pages.length === 0) {
        logger.log(`❌ API response has no page data: ${title} (${lang})`);
        return null;
      }

      const page = pages[0];

      // Use converted title (if available) or original page title
      let finalTitle = convertedTitle || page.title || personName;

      logger.log(`📄 API response page data:`, {
        title: page.title,
        convertedTitle: convertedTitle,
        finalTitle: finalTitle,
        hasExtract: !!page.extract,
        extractLength: page.extract?.length || 0,
        hasThumbnail: !!page.thumbnail,
        hasImageInfo: !!page.imageinfo
      });

      const result = {
        name: finalTitle,  // Use final title (prefer converted title)
        extract: page.extract || '',
        imageUrl: page.thumbnail?.source || null,
        attribution: {
          artist: '',
          license: '',
          credit: '',
          attributionRequired: false
        },
        wikiUrl: match.wikiUrl || null // Add Wikipedia page link
      };

      // Parse image licensing information
      if (page.imageinfo && page.imageinfo[0]?.extmetadata) {
        const metadata = page.imageinfo[0].extmetadata;
        logger.log(`🏷️ Found image metadata, parsing licensing info`);

        result.attribution = {
          artist: this.cleanMetadataText(metadata.Artist?.value || ''),
          license: this.cleanMetadataText(metadata.LicenseShortName?.value || ''),
          credit: this.cleanMetadataText(metadata.Credit?.value || ''),
          attributionRequired: metadata.AttributionRequired?.value === 'true'
        };

        logger.log(`🏷️ Licensing info parsed:`, {
          hasArtist: !!result.attribution.artist,
          hasLicense: !!result.attribution.license,
          hasCredit: !!result.attribution.credit
        });
      } else {
        logger.log(`❌ No image metadata to parse`);
      }

      // Cache result
      this.sessionCache.set(cacheKey, result);

      logger.log(`✅ Person info retrieved successfully: ${personName} (${lang})`, {
        hasExtract: !!result.extract,
        extractLength: result.extract?.length || 0,
        hasImage: !!result.imageUrl,
        hasAttribution: !!result.attribution.artist,
        imageUrl: result.imageUrl
      });

      return result;

    } catch (error) {
      logger.error(`❌ Failed to retrieve person info: ${personName}`, error);

      // Return basic structure to avoid frontend errors
      return {
        name: personName,
        extract: '',
        imageUrl: null,
        attribution: {
          artist: '',
          license: '',
          credit: '',
          attributionRequired: false
        },
        wikiUrl: null
      };
    }
  }

  // Search Chinese Wikipedia
  async searchChineseWikipedia(name) {
    logger.log(`🔍 Searching Chinese Wikipedia: ${name}`);
    const zhTitle = await this.searchWikipediaTitle(name, 'zh');

    if (zhTitle) {
      logger.log(`📄 Chinese Wikipedia found: "${zhTitle}"`);

      // Check if it's a valid article (not a disambiguation page)
      // NOTE: '消歧義' is the Chinese term for "disambiguation" - this is DATA used for
      // detecting disambiguation pages on Chinese Wikipedia, not UI text. Both Chinese
      // and English terms are checked to ensure compatibility with all Wikipedia variants.
      if (!zhTitle.includes('消歧義') && !zhTitle.includes('disambiguation')) {
        logger.log(`✅ Chinese Wikipedia match successful: ${zhTitle}`);
        return {
          title: zhTitle,
          lang: 'zh',
          wikiUrl: `https://zh.wikipedia.org/wiki/${encodeURIComponent(zhTitle)}?variant=zh-tw`
        };
      } else {
        logger.log(`❌ Chinese Wikipedia is disambiguation page, skipping: ${zhTitle}`);
      }
    } else {
      logger.log(`❌ Chinese Wikipedia no results: ${name}`);
    }

    return null;
  }

  // Search English Wikipedia
  async searchEnglishWikipedia(name) {
    logger.log(`🔍 Searching English Wikipedia: ${name}`);
    const enTitle = await this.searchWikipediaTitle(name, 'en');

    if (enTitle) {
      logger.log(`📄 English Wikipedia found: "${enTitle}"`);
      logger.log(`✅ English Wikipedia match successful: ${enTitle}`);
      return {
        title: enTitle,
        lang: 'en',
        wikiUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(enTitle)}`
      };
    } else {
      logger.log(`❌ English Wikipedia no results: ${name}`);
    }

    return null;
  }

  // Search hardcoded mapping table
  async searchHardcodedMapping(name) {
    logger.log(`🔍 Searching hardcoded mapping: ${name}`);
    const englishName = this.getEnglishName(name);

    if (englishName && englishName !== name) {
      logger.log(`📋 Mapping found: "${name}" -> "${englishName}"`);
      logger.log(`✅ Mapping match successful: ${englishName}`);
      return {
        title: englishName,
        lang: 'en',
        wikiUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(englishName)}`
      };
    } else {
      logger.log(`❌ Mapping no results: ${name}`);
    }

    return null;
  }

  // Universal Wikipedia best match search
  async findBestWikipediaMatch(name) {
    try {
      logger.log(`🔍 Starting multi-stage search: ${name}`);

      // Detect user language preference
      const preferEnglish = isEnglishLanguage();
      logger.log(`🌐 User language preference: ${preferEnglish ? 'English' : 'Chinese'}`);

      if (preferEnglish) {
        // English user flow: prioritize English content
        logger.log(`🔍 English user flow starting`);

        // 1. Search English Wikipedia first
        logger.log(`🔍 Stage 1: Searching English Wikipedia`);
        const enResult = await this.searchEnglishWikipedia(name);
        if (enResult) return enResult;

        // 2. Search Chinese Wikipedia and try to get English version
        logger.log(`🔍 Stage 2: Searching Chinese Wikipedia and looking for English version`);
        const zhResult = await this.searchChineseWikipedia(name);
        if (zhResult) {
          // Try to find English version
          logger.log(`🔍 Stage 2a: Checking Chinese page's English cross-language link`);
          const enFromZh = await this.getLanglinks(zhResult.title, 'zh', 'en');
          if (enFromZh) {
            logger.log(`🌐 Chinese page has English version: "${zhResult.title}" → "${enFromZh}"`);
            logger.log(`✅ Cross-language link successful, using English version: ${enFromZh}`);
            return {
              title: enFromZh,
              lang: 'en',
              wikiUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(enFromZh)}`
            };
          } else {
            logger.log(`❌ Chinese page has no English version, falling back to Chinese version: ${zhResult.title}`);
            return zhResult;
          }
        }

        // 3. Use hardcoded mapping (mapping itself is in English)
        logger.log(`🔍 Stage 3: Searching hardcoded mapping`);
        const hardcodedResult = await this.searchHardcodedMapping(name);
        if (hardcodedResult) return hardcodedResult;

      } else {
        // Chinese user flow: prioritize Chinese content (maintain original logic)
        logger.log(`🔍 Chinese user flow starting`);

        // 1. Search Chinese Wikipedia using OpenSearch for best title
        logger.log(`🔍 Stage 1: Searching Chinese Wikipedia`);
        const zhResult = await this.searchChineseWikipedia(name);
        if (zhResult) return zhResult;

        // 2. Search English Wikipedia using OpenSearch
        logger.log(`🔍 Stage 2: Searching English Wikipedia`);
        const enResult = await this.searchEnglishWikipedia(name);

        if (enResult) {
          // 2a. Check if English page has corresponding Chinese version
          logger.log(`🔍 Stage 2a: Checking English page's Chinese cross-language link`);
          const zhFromEn = await this.getLanglinks(enResult.title, 'en', 'zh');

          if (zhFromEn) {
            logger.log(`🌐 English page has Chinese version: "${enResult.title}" → "${zhFromEn}"`);
            logger.log(`✅ Cross-language link successful, using Chinese version: ${zhFromEn}`);
            return {
              title: zhFromEn,
              lang: 'zh',
              wikiUrl: `https://zh.wikipedia.org/wiki/${encodeURIComponent(zhFromEn)}?variant=zh-tw`
            };
          } else {
            logger.log(`❌ English page has no Chinese version, using English version: ${enResult.title}`);
            return enResult;
          }
        }

        // 3. Fallback to hardcoded mapping
        logger.log(`🔍 Stage 3: Searching hardcoded mapping`);
        const hardcodedResult = await this.searchHardcodedMapping(name);

        if (hardcodedResult) {
          // 3a. Check if hardcoded English name has Chinese version
          logger.log(`🔍 Stage 3a: Checking hardcoded name's Chinese cross-language link`);
          const zhFromHardcoded = await this.getLanglinks(hardcodedResult.title, 'en', 'zh');

          if (zhFromHardcoded) {
            logger.log(`🌐 Hardcoded name has Chinese version: "${hardcodedResult.title}" → "${zhFromHardcoded}"`);
            logger.log(`✅ Hardcoded cross-language link successful, using Chinese version: ${zhFromHardcoded}`);
            return {
              title: zhFromHardcoded,
              lang: 'zh',
              wikiUrl: `https://zh.wikipedia.org/wiki/${encodeURIComponent(zhFromHardcoded)}?variant=zh-tw`
            };
          } else {
            logger.log(`❌ Hardcoded name has no Chinese version, using English version: ${hardcodedResult.title}`);
            return hardcodedResult;
          }
        }
      }

      logger.log(`❌ All search stages failed: ${name}`);
      return null;
    } catch (error) {
      logger.error(`❌ Failed to find Wikipedia match: ${name}`, error);
      return null;
    }
  }

  // Get cross-language links, converting page title from one language to another
  async getLanglinks(title, fromLang, toLang) {
    try {
      const baseUrl = fromLang === 'zh'
        ? 'https://zh.wikipedia.org/w/api.php'
        : 'https://en.wikipedia.org/w/api.php';

      // Add Traditional Chinese variant parameters for Chinese Wikipedia
      const variantParam = fromLang === 'zh' ? '&converttitles=1&uselang=zh-tw&variant=zh-tw' : '';
      const url = `${baseUrl}?action=query&titles=${encodeURIComponent(title)}&prop=langlinks&lllang=${toLang}&lllimit=1&format=json&origin=*${variantParam}`;

      logger.log(`🌐 Querying cross-language link: "${title}" (${fromLang}) → (${toLang})`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.API_TIMEOUT);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'HotTea-Extension/5.6 (https://github.com/your-repo/hottea)'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const pages = data.query?.pages;

      if (pages) {
        const pageId = Object.keys(pages)[0];
        const page = pages[pageId];
        const langlinks = page.langlinks;

        if (langlinks && langlinks.length > 0) {
          let targetTitle = langlinks[0]['*'];
          logger.log(`🌐 Found cross-language link: "${title}" (${fromLang}) → "${targetTitle}" (${toLang})`);
          return targetTitle;
        } else {
          logger.log(`❌ No cross-language link: "${title}" (${fromLang}) → (${toLang})`);
        }
      } else {
        logger.log(`❌ Page does not exist: "${title}" (${fromLang})`);
      }

      return null;
    } catch (error) {
      if (error.name === 'AbortError') {
        logger.warn(`⏱️ Cross-language query timeout: ${title} (${fromLang} → ${toLang})`);
      } else {
        logger.error(`❌ Cross-language query failed: ${title} (${fromLang} → ${toLang})`, error);
      }
      return null;
    }
  }

  // Clean metadata text (remove HTML tags)
  cleanMetadataText(text) {
    if (!text) return '';

    // Remove HTML tags and clean extra whitespace
    return text
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace &nbsp;
      .replace(/&amp;/g, '&')  // Replace &amp;
      .replace(/&lt;/g, '<')   // Replace &lt;
      .replace(/&gt;/g, '>')   // Replace &gt;
      .replace(/\s+/g, ' ')    // Merge extra whitespace
      .trim();
  }
}

// Export singleton instance
export const wikipediaAvatarService = new WikipediaAvatarService();