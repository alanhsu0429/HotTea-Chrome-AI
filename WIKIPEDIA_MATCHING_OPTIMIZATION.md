# 維基百科人物匹配優化計畫

## 問題描述

目前 HotTea 在進行維基百科人物匹配時，面臨**同名人物誤配對**的問題：

- 新聞中的較不知名人物可能被配對到維基百科上的知名同名人物
- 造成顯示錯誤的頭像和資訊
- 影響用戶體驗的準確性

### 具體情境示例
```
新聞內容：「台積電工程師李小明獲得創新獎」
維基搜尋結果：「李小明（歌手）」
問題：顯示歌手照片給工程師，造成誤導
```

## 根本原因分析

### 1. 維基百科 API 搜尋機制
- OpenSearch API 會優先返回**最知名**的同名人物
- 排序基於頁面權重（PageRank）、瀏覽量、入鏈數量
- 缺乏上下文理解能力

### 2. 我們目前的匹配邏輯
```javascript
// 目前過於簡單的匹配邏輯
if (zhTitle && !zhTitle.includes('消歧義')) {
  return { title: zhTitle, lang: 'zh' };
}
```

### 3. 容易誤配的人物類型
- **地方性人物**：地方政治人物、企業主管
- **專業領域人物**：工程師、醫師、學者
- **新興人物**：近期崛起、尚未有維基條目
- **同名機率高的姓名**：李小明、王大同等常見名字

## 優化策略規劃

### 策略A：上下文匹配系統 🎯 **優先實作**

#### 實作概念
```javascript
// 從新聞內容提取上下文線索
const contextHints = extractContextFromNews(newsContent);
// 例如：{ profession: "工程師", company: "台積電", event: "創新獎" }

// 在維基百科驗證時檢查相關性
const relevanceScore = calculateRelevance(wikiContent, contextHints);
```

#### 具體做法
1. **關鍵詞提取**：從新聞內容識別職業、機構、事件
2. **維基內容比對**：檢查維基條目是否包含相關資訊
3. **相關性評分**：計算匹配的可信度

#### 預期效果
- 大幅降低誤配率
- 提升匹配準確性
- 保持良好的性能表現

### 策略B：信心分數機制 🎯 **優先實作**

#### 評分標準
```javascript
const confidenceScores = {
  exactMatch: 0.9,           // 完全匹配（姓名+上下文）
  contextMatch: 0.7,         // 上下文部分匹配
  professionMatch: 0.6,      // 職業匹配
  nameOnly: 0.3,             // 僅姓名匹配
  threshold: 0.6             // 顯示門檻
};
```

#### 顯示邏輯
```javascript
if (confidenceScore >= threshold) {
  showAvatar(wikipediaResult);
} else {
  showEmojiAvatar(); // 使用預設 emoji
}
```

### 策略C：消歧義頁面智能處理 📅 **中期實作**

#### 目標
- 主動處理維基百科消歧義頁面
- 從多個同名人物中選擇最相關的條目
- 避免直接跳過消歧義頁面

#### 實作要點
```javascript
// 檢測到消歧義頁面時
if (isDisambiguationPage(title)) {
  const candidates = extractDisambiguationList(wikiContent);
  const bestMatch = selectBestCandidate(candidates, contextHints);
  return bestMatch;
}
```

### 策略D：多重驗證系統 📅 **中期實作**

#### 驗證維度
1. **時間驗證**：檢查人物活躍時期與新聞時間的合理性
2. **地理驗證**：比對人物活動地區與新聞發生地
3. **職業驗證**：確認維基條目職業與新聞提及職業的一致性
4. **機構驗證**：檢查所屬機構的匹配度

### 策略E：機器學習輔助 🔮 **長期規劃**

#### 可能方向
- 訓練文本相似度模型
- 建立人物實體識別系統
- 利用知識圖譜進行關聯分析

## 實作優先級

### Phase 1: 立即改善 (v5.8.0)
- [ ] 實作上下文關鍵詞提取
- [ ] 建立信心分數評估機制
- [ ] 設定顯示門檻，避免低信心匹配

### Phase 2: 核心優化 (v5.9.0)
- [ ] 消歧義頁面智能選擇
- [ ] 多重驗證系統
- [ ] 用戶回饋機制（誤配報告）

### Phase 3: 進階功能 (v6.0.0)
- [ ] 機器學習模型整合
- [ ] 動態學習用戶偏好
- [ ] 建立本地化人物資料庫

## 性能考量

### 平衡點分析
```
準確性 ↑ vs 覆蓋率 ↓
性能 ↓ vs 精確度 ↑
複雜度 ↑ vs 維護性 ↓
```

### 效能優化策略
- 使用緩存減少重複計算
- 異步處理，避免阻塞主流程
- 設定合理的超時時間

## 評估指標

### 量化指標
- **匹配準確率**：正確匹配 / 總匹配數
- **覆蓋率**：有頭像顯示 / 總人物數
- **響應時間**：頭像載入時間
- **用戶滿意度**：基於回饋的評分

### 測試案例
建立標準測試集：
- 50個常見姓名的新聞案例
- 包含各種職業、地區的人物
- 已知正確答案的對照組

## 實作細節備忘

### 關鍵代碼位置
- `src/wikipedia-avatar.js` - 主要匹配邏輯
- `findBestWikipediaMatch()` - 核心搜尋方法
- `getPersonInfo()` - 人物資訊獲取

### 需要新增的函數
```javascript
extractContextFromNews(newsContent)     // 上下文提取
calculateRelevanceScore(wiki, context)  // 相關性計算
isDisambiguationPage(title)             // 消歧義頁面檢測
selectBestCandidate(candidates, hints)  // 最佳候選選擇
```

### 配置參數
```javascript
const MATCHING_CONFIG = {
  confidenceThreshold: 0.6,
  contextWeight: 0.4,
  professionWeight: 0.3,
  timeWeight: 0.2,
  locationWeight: 0.1
};
```

## 相關資源

### 維基百科 API 文檔
- [OpenSearch API](https://www.mediawiki.org/wiki/API:Opensearch)
- [Query API](https://www.mediawiki.org/wiki/API:Query)
- [消歧義頁面結構](https://zh.wikipedia.org/wiki/Wikipedia:消歧義)

### 可參考的開源項目
- [Wikidata Entity Linking](https://github.com/wikimedia/wikidata)
- [DBpedia Spotlight](https://github.com/dbpedia-spotlight/dbpedia-spotlight)

---

**最後更新**：2024-12-26
**負責人**：HotTea 開發團隊
**狀態**：規劃中，待實作