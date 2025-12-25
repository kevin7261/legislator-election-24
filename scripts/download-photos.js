/**
 * 下載立委照片腳本
 * 從立法院網站下載所有當選立委的照片到本地
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// 讀取照片 URL 映射
const mappingPath = path.join(__dirname, 'photo-url-mapping.json');
const photoMapping = JSON.parse(fs.readFileSync(mappingPath, 'utf-8'));

// 讀取 CSV 檔案
const csvPath = path.join(__dirname, '../public/data/csv/elected_legislators_final.csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');
const lines = csvContent.split('\n').filter((line) => line.trim());

// 解析 CSV（跳過標題行）
const candidates = [];
for (let i = 1; i < lines.length; i++) {
  const [county, district, name, party, votes] = lines[i].split(',');
  if (name) {
    candidates.push({
      name: name.trim(),
      party: party.trim(),
      votes: parseInt(votes, 10),
    });
  }
}

// 創建圖片目錄
const imagesDir = path.join(__dirname, '../public/data/images');
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

/**
 * 下載圖片
 */
function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    protocol
      .get(url, (response) => {
        if (response.statusCode === 200) {
          const fileStream = fs.createWriteStream(filepath);
          response.pipe(fileStream);
          fileStream.on('finish', () => {
            fileStream.close();
            resolve();
          });
        } else if (response.statusCode === 301 || response.statusCode === 302) {
          // 處理重定向
          const redirectUrl = response.headers.location;
          if (redirectUrl) {
            downloadImage(redirectUrl, filepath).then(resolve).catch(reject);
          } else {
            reject(new Error(`重定向但沒有 location header: ${response.statusCode}`));
          }
        } else {
          reject(new Error(`HTTP ${response.statusCode}: ${url}`));
        }
      })
      .on('error', (err) => {
        reject(err);
      });
  });
}

/**
 * 姓名模糊匹配
 */
function findPhotoUrl(candidateName) {
  // 先嘗試完全匹配
  let entry = photoMapping.find((m) => m.name === candidateName);
  if (entry) return entry.photoUrl;

  // 嘗試移除空格後匹配
  const nameNoSpace = candidateName.replace(/\s+/g, '');
  entry = photoMapping.find((m) => m.name.replace(/\s+/g, '') === nameNoSpace);
  if (entry) return entry.photoUrl;

  // 嘗試替換不同的點號符號
  const nameNormalized = candidateName.replace(/\./g, '‧').replace(/·/g, '‧');
  entry = photoMapping.find((m) => m.name === nameNormalized);
  if (entry) return entry.photoUrl;

  // 嘗試只匹配姓名部分（移除後面的英文或原住民名）
  const mainName = candidateName.split(/\s+/)[0];
  entry = photoMapping.find((m) => m.name.startsWith(mainName));
  if (entry) return entry.photoUrl;

  return null;
}

/**
 * 主函數
 */
async function main() {
  console.log(`開始下載 ${candidates.length} 位立委的照片...`);

  let successCount = 0;
  let failCount = 0;
  const failed = [];

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    const photoUrl = findPhotoUrl(candidate.name);

    if (!photoUrl) {
      console.error(`[${i + 1}/${candidates.length}] ✗ ${candidate.name} - 找不到照片 URL`);
      failCount++;
      failed.push({ name: candidate.name, error: '找不到照片 URL' });
      continue;
    }

    const filename = `${candidate.name}.jpg`;
    const filepath = path.join(imagesDir, filename);

    // 如果檔案已存在，跳過
    if (fs.existsSync(filepath)) {
      // 檢查是否為 HTML 文件（之前下載失敗的）
      const content = fs.readFileSync(filepath, 'utf-8').slice(0, 100);
      if (content.includes('<!DOCTYPE') || content.includes('<html')) {
        console.log(`[${i + 1}/${candidates.length}] ${candidate.name} - 已存在但內容錯誤，重新下載`);
        fs.unlinkSync(filepath);
      } else {
        console.log(`[${i + 1}/${candidates.length}] ${candidate.name} - 已存在，跳過`);
        successCount++;
        continue;
      }
    }

    try {
      await downloadImage(photoUrl, filepath);
      console.log(`[${i + 1}/${candidates.length}] ✓ ${candidate.name} - 下載成功`);
      successCount++;

      // 延遲一下，避免請求過快
      await new Promise((resolve) => setTimeout(resolve, 200));
    } catch (error) {
      console.error(
        `[${i + 1}/${candidates.length}] ✗ ${candidate.name} - 下載失敗: ${error.message}`
      );
      failCount++;
      failed.push({ name: candidate.name, url: photoUrl, error: error.message });
    }
  }

  console.log('\n下載完成！');
  console.log(`成功: ${successCount}`);
  console.log(`失敗: ${failCount}`);

  if (failed.length > 0) {
    console.log('\n失敗的清單:');
    failed.forEach((item) => {
      console.log(`  - ${item.name}: ${item.error}`);
    });
  }
}

main().catch(console.error);
