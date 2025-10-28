#!/usr/bin/env node
/**
 * HotTea 版本同步腳本
 * 自動將 package.json 版本號同步到所有 manifest 文件
 * 支援 Chrome Extension 版本格式轉換
 */

const fs = require('fs');
const path = require('path');

// 顏色輸出工具
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  gray: '\x1b[90m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function main() {
  try {
    log('blue', '🔄 HotTea 版本同步腳本 v1.0');
    log('gray', '=' * 40);

    // 讀取 package.json 版本
    const packagePath = path.join(__dirname, '..', 'package.json');
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    const fullVersion = pkg.version;

    log('blue', `📦 當前 package.json 版本: ${fullVersion}`);

    // 轉換為 Chrome 版本格式 (x.y.z → x.y)
    // Chrome Extension 只支援最多 4 個數字，且每個數字最多 5 位
    const versionParts = fullVersion.split('.');
    const chromeVersion = versionParts.slice(0, 2).join('.');

    log('yellow', `🔧 Chrome 版本格式: ${chromeVersion}`);

    // 需要同步的 manifest 文件列表
    const manifests = [
      'manifest.json',
      'manifest.dev.json',
      'manifest.prod.json'
    ];

    let updated = 0;
    let errors = 0;

    manifests.forEach(filename => {
      const filepath = path.join(__dirname, '..', filename);

      try {
        // 檢查文件是否存在
        if (!fs.existsSync(filepath)) {
          log('yellow', `⚠️  ${filename} 不存在，跳過`);
          return;
        }

        // 讀取並解析 manifest
        const manifest = JSON.parse(fs.readFileSync(filepath, 'utf8'));
        const oldVersion = manifest.version;

        // 檢查是否需要更新
        if (oldVersion === chromeVersion) {
          log('gray', `⚪ ${filename}: ${oldVersion} (無需更新)`);
          return;
        }

        // 更新版本號
        manifest.version = chromeVersion;

        // 寫回文件，保持格式化
        fs.writeFileSync(filepath, JSON.stringify(manifest, null, 2) + '\n');

        log('green', `✅ ${filename}: ${oldVersion} → ${chromeVersion}`);
        updated++;

      } catch (error) {
        log('red', `❌ 無法更新 ${filename}: ${error.message}`);
        errors++;
      }
    });

    log('gray', '=' * 40);

    if (errors === 0) {
      log('green', `🎉 版本同步完成！更新了 ${updated} 個文件`);
      process.exit(0);
    } else {
      log('red', `⚠️  同步完成但有 ${errors} 個錯誤`);
      process.exit(1);
    }

  } catch (error) {
    log('red', `❌ 腳本執行失敗: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// 如果直接執行此腳本
if (require.main === module) {
  main();
}

module.exports = { main };