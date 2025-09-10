require('dotenv').config();

// Node.jsの標準機能だけを読み込む
const fs = require('fs');
const path = require('path');

// --- 設定 ---
const sourceDir = __dirname;
const distDir = path.join(__dirname, 'dist');
const filesToCopy = [
  'index.html',
  'style.css',
  'script.js',
  'manifest.json',
  'sw.js',
  // アイコン画像など、他にもコピーしたいファイルがあればここに追加
  // 'icon-192x192.png',
  // 'icon-512x512.png',
];

// --- ビルド処理 ---
console.log('GAS URL from env:', process.env.PUBLIC_GAS_URL);
console.log('Client ID from env:', process.env.PUBLIC_GOOGLE_CLIENT_ID);
console.log('ビルドを開始します...');

// 1. distフォルダをクリーンアップ
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir);
console.log('✅ distフォルダをクリーンアップしました。');

// 2. 必要なファイルをdistフォルダにコピー
filesToCopy.forEach(file => {
  const sourcePath = path.join(sourceDir, file);
  const destPath = path.join(distDir, file);
  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, destPath);
    console.log(`- ${file} をコピーしました。`);
  }
});
console.log('✅ ファイルのコピーが完了しました。');

// 3. 環境変数のプレースホルダーを置換
try {
  console.log('環境変数の置換を開始します...');
  
  const filesToProcess = [
    path.join(distDir, 'index.html'),
    path.join(distDir, 'script.js'),
  ];

  filesToProcess.forEach(filePath => {
    // ファイルを読み込む
    let content = fs.readFileSync(filePath, 'utf8');
    
    // GAS_URLを置換
    content = content.replace(/__GAS_URL__/g, process.env.PUBLIC_GAS_URL);
    // CLIENT_IDを置換
    content = content.replace(/__GOOGLE_CLIENT_ID__/g, process.env.PUBLIC_GOOGLE_CLIENT_ID);
    
    // 変更をファイルに書き戻す
    fs.writeFileSync(filePath, content, 'utf8');
  });

  console.log('✅ 環境変数の置換が完了しました。');
} catch (error) {
  console.error('環境変数の置換中にエラーが発生しました:', error);
  process.exit(1); // エラーがあればビルドを中止
}

console.log('ビルドが正常に完了しました！');