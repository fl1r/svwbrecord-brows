// Node.jsの標準機能だけを読み込む
require('dotenv').config();
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
  'firebase-messaging-sw.js'
  // アイコン画像など、他にもコピーしたいファイルがあればここに追加
];

// --- ビルド処理 ---

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
    path.join(distDir, 'firebase-messaging-sw.js'),
  ];

  const replacements = {
    '__GAS_URL__': process.env.PUBLIC_GAS_URL,
    '__GOOGLE_CLIENT_ID__': process.env.PUBLIC_GOOGLE_CLIENT_ID,
    '__FIREBASE_API_KEY__': process.env.PUBLIC_FIREBASE_API_KEY,
    '__FIREBASE_AUTH_DOMAIN__': process.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
    '__FIREBASE_PROJECT_ID__': process.env.PUBLIC_FIREBASE_PROJECT_ID,
    '__FIREBASE_STORAGE_BUCKET__': process.env.PUBLIC_FIREBASE_STORAGE_BUCKET,
    '__FIREBASE_MESSAGING_SENDER_ID__': process.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    '__FIREBASE_APP_ID__': process.env.PUBLIC_FIREBASE_APP_ID,
    '__FIREBASE_VAPID_KEY__': process.env.PUBLIC_FIREBASE_VAPID_KEY,
  };

  filesToProcess.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      for (const placeholder in replacements) {
        content = content.replace(new RegExp(placeholder, 'g'), replacements[placeholder]);
      }
      fs.writeFileSync(filePath, content, 'utf8');
    }
  });

  console.log('✅ 環境変数の置換が完了しました。');
} catch (error) {
  console.error('環境変数の置換中にエラーが発生しました:', error);
  process.exit(1);
}

console.log('ビルドが正常に完了しました！');