// --- 定数定義 ---
const GAS_URL = '__GAS_URL__';
const SECRET_KEY_STORAGE = 'svwb_record_secret_key';
const GOOGLE_CREDENTIAL_STORAGE = 'svwb_record_google_credential';
const PLAYER_NAME_STORAGE = 'svwb_player_name';
const MY_DECK_STORAGE = 'svwb_my_deck';
const DRAFT_STORAGE_KEY = 'svwb_record_draft';

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

// --- Service Worker & Push通知 関連 ---

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(err => console.error('Service Worker 登録失敗:', err));
  }
}

async function getVapidPublicKey() {
  const response = await fetch(`${GAS_URL}?action=get_vapid_key`);
  const data = await response.json();
  return data.public_key;
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

async function requestShortcutNotification() {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      const publicKey = await getVapidPublicKey();
      const applicationServerKey = urlBase64ToUint8Array(publicKey);
      subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
      await fetch(GAS_URL, {
        method: 'POST', body: JSON.stringify({ action: 'save_subscription', subscription }),
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }
      });
    }
    await fetch(GAS_URL, {
      method: 'POST', body: JSON.stringify({ action: 'send_notification_to_self', subscription }),
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    });
    console.log("ショートカット通知をリクエストしました。");
  } catch (err) {
    console.error("通知リクエスト処理中にエラーが発生しました:", err);
  }
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
  localStorage.removeItem(SECRET_KEY_STORAGE);
  localStorage.removeItem(GOOGLE_CREDENTIAL_STORAGE);
  google.accounts.id.disableAutoSelect();
  authSection.style.display = 'block';
  mainContent.style.display = 'none';
  userInfoP.textContent = "";
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
    requestShortcutNotification();
    checkDraftStatus();
  } else {
    authSection.style.display = 'block';
    mainContent.style.display = 'none';
  }
}

// --- フォーム操作のイベントリスナー ---

submitButton.addEventListener('click', () => submitFormData());
draftButton.addEventListener('click', () => {
    saveDraftToLocalStorage();
    requestShortcutNotification();
});
clearDraftButton.addEventListener('click', clearDraftFromLocalStorage);

function submitFormData() {
  const storedSecret = localStorage.getItem(SECRET_KEY_STORAGE);
  const storedCredential = localStorage.getItem(GOOGLE_CREDENTIAL_STORAGE);
  if (!storedSecret || !storedCredential) {
    alert('認証情報がありません。ページを再読み込みしてください。');
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
      statusElement.textContent = '記録しました！';
      document.getElementById('opponentDeck').value = "";
      document.getElementById('opponentRank').value = "";
      document.getElementById('turn').value = "";
      document.getElementById('winLoss').value = "";
      document.getElementById('remarks').value = "";
      clearDraftFromLocalStorage();
      requestShortcutNotification();
    } else {
      statusElement.textContent = 'エラー: ' + data.message;
    }
  })
  .catch(error => {
    console.error('送信エラー:', error);
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
registerServiceWorker();
checkAuth();