// replace-in-fileの設定ファイル

// 置換したいファイル
const files = [
  'dist/script.js',
  'dist/index.html',
];

// GAS_URLの置換設定
const gasUrlOptions = {
  files: files,
  from: /__GAS_URL__/g,
  to: process.env.PUBLIC_GAS_URL,
};

// CLIENT_IDの置換設定
const clientIdOptions = {
  files: files,
  from: /__GOOGLE_CLIENT_ID__/g,
  to: process.env.PUBLIC_GOOGLE_CLIENT_ID,
};

// 設定をエクスポート
module.exports = [gasUrlOptions, clientIdOptions];