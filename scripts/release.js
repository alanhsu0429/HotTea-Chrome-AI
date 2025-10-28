#!/usr/bin/env node
/**
 * HotTea 版本發布輔助工具
 * 自動化版本發布流程：更新版本 → 同步 manifest → 建構
 */

const { execSync } = require('child_process');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

// 顏色輸出工具
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function execCommand(command, description) {
  try {
    log('cyan', `⚡ ${description}...`);
    execSync(command, { stdio: 'inherit' });
    return true;
  } catch (error) {
    log('red', `❌ ${description} 失敗: ${error.message}`);
    return false;
  }
}

function getCurrentVersion() {
  const packagePath = path.join(__dirname, '..', 'package.json');
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  return pkg.version;
}

function getNextVersion(current, type) {
  const parts = current.split('.').map(Number);

  switch (type) {
    case 'patch':
      parts[2]++;
      break;
    case 'minor':
      parts[1]++;
      parts[2] = 0;
      break;
    case 'major':
      parts[0]++;
      parts[1] = 0;
      parts[2] = 0;
      break;
    default:
      throw new Error(`未知的版本類型: ${type}`);
  }

  return parts.join('.');
}

function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  log('blue', '🚀 HotTea 版本發布工具 v1.0');
  log('yellow', '=' * 50);

  const currentVersion = getCurrentVersion();
  log('cyan', `📦 當前版本: ${currentVersion}`);

  console.log('\n選擇版本升級類型:');
  console.log(`1. patch (${currentVersion} → ${getNextVersion(currentVersion, 'patch')})`);
  console.log(`2. minor (${currentVersion} → ${getNextVersion(currentVersion, 'minor')})`);
  console.log(`3. major (${currentVersion} → ${getNextVersion(currentVersion, 'major')})`);
  console.log('4. 取消');

  rl.question('\n請輸入選項 (1/2/3/4): ', (answer) => {
    const types = { '1': 'patch', '2': 'minor', '3': 'major' };
    const versionType = types[answer];

    if (answer === '4') {
      log('yellow', '✋ 發布已取消');
      rl.close();
      return;
    }

    if (!versionType) {
      log('red', '❌ 無效選項，發布已取消');
      rl.close();
      process.exit(1);
    }

    const nextVersion = getNextVersion(currentVersion, versionType);

    log('yellow', '\n' + '=' * 50);
    log('bold', `🎯 即將發布 HotTea v${nextVersion}`);
    log('yellow', '發布流程:');
    log('gray', '1. 更新 package.json 版本號');
    log('gray', '2. 同步所有 manifest.json 版本號');
    log('gray', '3. 建構開發版和生產版');
    log('gray', '4. 建立 Git 標籤');

    rl.question('\n確認發布？(y/N): ', (confirm) => {
      if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
        log('yellow', '✋ 發布已取消');
        rl.close();
        return;
      }

      log('blue', '\n🎬 開始發布流程...');

      let success = true;

      // 步驟 1: 更新版本號
      if (success) {
        success = execCommand(
          `npm version ${versionType}`,
          `更新版本號到 ${nextVersion}`
        );
      }

      // 步驟 2: 建構所有版本（版本同步會在 prebuild 自動執行）
      if (success) {
        success = execCommand(
          'npm run build:all',
          '建構開發版和生產版'
        );
      }

      // 完成
      if (success) {
        log('yellow', '\n' + '=' * 50);
        log('green', '🎉 版本發布準備完成！');
        log('cyan', `✨ 新版本: v${nextVersion}`);

        console.log('\n📋 後續步驟:');
        log('yellow', '1. 檢查 dist-dev/ 和 dist-prod/ 目錄');
        log('yellow', '2. 測試擴充功能功能是否正常');
        log('yellow', '3. git push origin main');
        log('yellow', '4. git push --tags');
        log('yellow', '5. 上傳 dist-prod/ 到 Chrome Web Store');

        console.log('\n📁 建構產出:');
        log('cyan', '• dist-dev/  - 開發版 (本地測試)');
        log('cyan', '• dist-prod/ - 生產版 (Chrome Store 上架)');

      } else {
        log('red', '\n❌ 發布失敗，請檢查錯誤訊息');
        process.exit(1);
      }

      rl.close();
    });
  });
}

// 如果直接執行此腳本
if (require.main === module) {
  main();
}