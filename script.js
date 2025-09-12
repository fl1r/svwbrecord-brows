// --- 定数定義 ---
const GAS_URL = '__GAS_URL__';
const SECRET_KEY_STORAGE = 'svwbrecord_secret_key';
const GOOGLE_CREDENTIAL_STORAGE = 'svwbrecord_google_credential';
const PLAYER_NAME_STORAGE = 'svwbrecord_player_name';
const MY_DECK_STORAGE = 'svwbrecord_my_deck';
const DRAFT_STORAGE_KEY = 'svwbrecord_draft';

// ★★★【重要】Firebaseコンソールから取得した設定情報を貼り付け ★★★
const firebaseConfig = {
  apiKey: "__FIREBASE_API_KEY__",
  authDomain: "__FIREBASE_AUTH_DOMAIN__",
  projectId: "__FIREBASE_PROJECT_ID__",
  storageBucket: "__FIREBASE_STORAGE_BUCKET__",
  messagingSenderId: "__FIREBASE_MESSAGING_SENDER_ID__",
  appId: "__FIREBASE_APP_ID__"
};

// --- DOM要素を取得 ---
const authSection = document.getElementById('authSection');
const mainContent = document.getElementById('mainContent');
const secretKeyInput = document.getElementById('secretKey');
const recordForm = document.getElementById('recordForm');
const statusElement = document.getElementById('status');
const submitButton = document.getElementById('submitButton');
const draftButton = document.getElementById('draftButton');
const signOutButton = document.getElementById('signOutButton');
const userInfoP = document.getElementById('userInfo');
const draftSection = document.getElementById('draftSection');
const clearDraftButton = document.getElementById('clearDraftButton');
const notificationButton = document.getElementById('notification-button');

// --- Firebase Messaging ---
let messaging;
if (firebase.apps.length === 0) {
  firebase.initializeApp(firebaseConfig);
}

if (firebase.messaging.isSupported()) {
  messaging = firebase.messaging();
  notificationButton.style.display = 'inline-block';
} else {
  console.log("Firebase Messaging is not supported in this browser.");
  notificationButton.style.display = 'none';
}

notificationButton.addEventListener('click', async () => {
  if (!messaging) return;
  
  try {
    // PWAとしてインストールされているかチェック (特にiOSで重要)
    if (!isPWAInstalled()) {
      alert('通知を受け取るには、まずアプリをホーム画面に追加してください。\n\nSafariの共有メニューから「ホーム画面に追加」を選択します。');
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      console.log('Notification permission granted.');
      
      const token = await messaging.getToken({
        // ★★★【重要】Firebaseコンソールから取得したVAPIDキーを貼り付け ★★★
        vapidKey: '__FIREBASE_VAPID_KEY__'
      });
      
      if (token) {
        console.log('FCM Token:', token);
        await saveFCMTokenToServer(token);
        alert('通知が有効になりました！');
        notificationButton.textContent = '通知は有効です';
        notificationButton.disabled = true;
      } else {
        console.log('No registration token available. Request permission to generate one.');
      }
    } else {
      console.log('Unable to get permission to notify.');
      alert('通知が許可されませんでした。ブラウザの設定を確認してください。');
    }
  } catch (err) {
    console.error('An error occurred while retrieving token. ', err);
    alert('通知の有効化に失敗しました。コンソールでエラーを確認してください。');
  }
});

async function saveFCMTokenToServer(token) {
  const storedSecret = localStorage.getItem(SECRET_KEY_STORAGE);
  if (!storedSecret) {
      alert('認証情報がありません。再度ログインしてください。');
      return;
  }
  const response = await fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({
      action: 'save_fcm_token',
      token: token,
      secret: storedSecret
    })
  });
  if (!response.ok) {
    throw new Error('Failed to save FCM token');
  }
  console.log('FCM token saved to server.');
}

function isPWAInstalled() {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  if (navigator.standalone) { // For older iOS Safari
    return true;
  }
  return isStandalone;
}

// --- 下書き関連の関数 ---
function saveDraftToLocalStorage() {
  const draftData = {
    playerName: document.getElementById('playerName').value,
    myDeck: document.getElementById('myDeck').value,
    opponentDeck: document.getElementById('opponentDeck').value,
    opponentRank: document.getElementById('opponentRank').value,
    turn: document.getElementById('turn').value,
    winLoss: document.getElementById('winLoss').value,
    remarks: document.getElementById('remarks').value,
  };
  localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftData));
  statusElement.textContent = '下書きを保存しました！';
  checkDraftStatus();
}

function autoRestoreDraft() {
  const draftJson = localStorage.getItem(DRAFT_STORAGE_KEY);
  if (draftJson) {
    const draftData = JSON.parse(draftJson);
    document.getElementById('playerName').value = draftData.playerName;
    document.getElementById('myDeck').value = draftData.myDeck;
    document.getElementById('opponentDeck').value = draftData.opponentDeck;
    document.getElementById('opponentRank').value = draftData.opponentRank;
    document.getElementById('turn').value = draftData.turn;
    document.getElementById('winLoss').value = draftData.winLoss;
    document.getElementById('remarks').value = draftData.remarks;
  }
}

function clearDraftFromLocalStorage() {
  localStorage.removeItem(DRAFT_STORAGE_KEY);
  checkDraftStatus();
}

function checkDraftStatus() {
  if (localStorage.getItem(DRAFT_STORAGE_KEY)) {
    draftSection.style.display = 'flex';
  } else {
    draftSection.style.display = 'none';
  }
}

// --- 認証とUI制御 ---
function populateSpinner(spinnerId, data, prompt) {
  const spinner = document.getElementById(spinnerId);
  spinner.innerHTML = '';
  const promptOption = document.createElement('option');
  promptOption.value = "";
  promptOption.textContent = prompt;
  spinner.appendChild(promptOption);
  data.forEach(item => {
    if (item) {
      const option = document.createElement('option');
      option.value = item;
      option.textContent = item;
      spinner.appendChild(option);
    }
  });
}

function handleCredentialResponse(response) {
  const secret = secretKeyInput.value;
  if (!secret) {
    alert('先に合言葉を入力してください。');
    return;
  }
  localStorage.setItem(SECRET_KEY_STORAGE, secret);
  localStorage.setItem(GOOGLE_CREDENTIAL_STORAGE, response.credential);
  checkAuth();
}

signOutButton.addEventListener('click', () => {
  localStorage.clear();
  google.accounts.id.disableAutoSelect();
  authSection.style.display = 'block';
  mainContent.style.display = 'none';
  userInfoP.textContent = "";
  window.location.reload();
});

async function checkAuth() {
  const storedSecret = localStorage.getItem(SECRET_KEY_STORAGE);
  const storedCredential = localStorage.getItem(GOOGLE_CREDENTIAL_STORAGE);

  if (storedSecret && storedCredential) {
    authSection.style.display = 'none';
    mainContent.style.display = 'block';
    userInfoP.textContent = "認証済み。データを読み込み中...";

    try {
      if (document.getElementById('playerName').length <= 1) {
        await fetchSheetData();
      }
      autoRestoreDraft();
      const cachedPlayerName = localStorage.getItem(PLAYER_NAME_STORAGE);
      if (cachedPlayerName) document.getElementById('playerName').value = cachedPlayerName;
      const cachedMyDeck = localStorage.getItem(MY_DECK_STORAGE);
      if (cachedMyDeck) document.getElementById('myDeck').value = cachedMyDeck;
      userInfoP.textContent = "認証済み";
    } catch (error) {
      console.error('データ読み込みに失敗しました:', error);
      userInfoP.textContent = `エラー: ${error.message}`;
      userInfoP.style.color = 'red';
    }
    checkDraftStatus();
  } else {
    authSection.style.display = 'block';
    mainContent.style.display = 'none';
  }
}

// --- フォーム操作 ---
submitButton.addEventListener('click', () => submitFormData());
draftButton.addEventListener('click', () => {
    saveDraftToLocalStorage();
    alert('下書きを保存しました。');
});
clearDraftButton.addEventListener('click', () => {
    clearDraftFromLocalStorage();
    statusElement.textContent = '下書きを削除しました。';
});

function submitFormData() {
  const storedSecret = localStorage.getItem(SECRET_KEY_STORAGE);
  const storedCredential = localStorage.getItem(GOOGLE_CREDENTIAL_STORAGE);
  if (!storedSecret || !storedCredential) {
    alert('認証情報がありません。');
    return;
  }
  if (!document.getElementById('playerName').value || !document.getElementById('myDeck').value || !document.getElementById('opponentDeck').value || !document.getElementById('turn').value || !document.getElementById('winLoss').value) {
    alert('すべての必須項目を選択してください。');
    return;
  }

  localStorage.setItem(PLAYER_NAME_STORAGE, document.getElementById('playerName').value);
  localStorage.setItem(MY_DECK_STORAGE, document.getElementById('myDeck').value);

  statusElement.textContent = '送信中...';
  submitButton.disabled = true;
  draftButton.disabled = true;

  const formData = {
    playerName: document.getElementById('playerName').value,
    myDeck: document.getElementById('myDeck').value,
    opponentDeck: document.getElementById('opponentDeck').value,
    opponentRank: document.getElementById('opponentRank').value,
    turn: document.getElementById('turn').value,
    winLoss: document.getElementById('winLoss').value,
    remarks: document.getElementById('remarks').value,
    secret: storedSecret,
    id_token: storedCredential
  };

  fetch(GAS_URL, {
    method: 'POST',
    body: JSON.stringify(formData),
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
  })
  .then(response => response.json())
  .then(data => {
    if (data.result === 'success') {
      statusElement.textContent = '記録しました！通知が送信されます。';
      document.getElementById('opponentDeck').value = "";
      document.getElementById('opponentRank').value = "";
      document.getElementById('turn').value = "";
      document.getElementById('winLoss').value = "";
      document.getElementById('remarks').value = "";
      clearDraftFromLocalStorage();
    } else {
      statusElement.textContent = 'エラー: ' + data.message;
    }
  })
  .catch(error => {
    statusElement.textContent = '送信エラー: ' + error.message;
  })
  .finally(() => {
    submitButton.disabled = false;
    draftButton.disabled = false;
  });
}

async function fetchSheetData() {
  try {
    const response = await fetch(GAS_URL);
    if (!response.ok) {
      throw new Error(`サーバーとの通信に失敗しました (HTTP ${response.status})`);
    }
    const data = await response.json();
    if (data.result === 'error') {
      throw new Error(data.message);
    }
    populateSpinner('playerName', data.playerNames, "（プレイヤーを選択）");
    populateSpinner('myDeck', data.deckNames, "（自分のデッキを選択）");
    populateSpinner('opponentDeck', data.deckNames, "（相手のデッキを選択）");
    populateSpinner('opponentRank', data.rankNames, "（ランクを選択）");
    populateSpinner('turn', ['先攻', '後攻'], "（先後を選択）");
    populateSpinner('winLoss', ['勝ち', '負け'], "（勝敗を選択）");
  } catch (error) {
    throw new Error(`初期データの読み込みに失敗しました。詳細: ${error.message}`);
  }
}

// --- ページの初期化処理 ---
checkAuth();

