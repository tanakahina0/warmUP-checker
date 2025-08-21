const $ = (id)=>document.getElementById(id);
const pad = (n)=> String(n).padStart(2,'0');

function toSeconds(m, s){
  m = Number(m||0); s = Number(s||0);
  if (s >= 60) { m += Math.floor(s/60); s = s % 60; }
  return m*60 + s;
}

function roundByMode(sec, mode){
  if(mode === 'exact'){
    return Math.max(1, Math.ceil(sec)); // 小数が出たら切り上げて1秒は確保
  }
  const step = 5;
  const base = Math.round(sec / step) * step;
  if(mode === 'nearest5') return Math.max(0, base);
  if(mode === 'short5')  return Math.max(0, Math.floor(sec/step)*step);
  if(mode === 'long5')   return Math.max(0, Math.ceil(sec/step)*step);
  return Math.max(0, Math.round(sec));
}

function format(sec){
  const m = Math.floor(sec/60);
  const s = sec % 60;
  return `${m}分${pad(s)}秒`;
}

function calc(){
  const w1 = Number($('w1').value);
  const w2 = Number($('w2').value);
  const m1 = $('m1').value;
  const s1 = $('s1').value;
  const rounding = $('rounding').value;
  const margin = Number($('margin').value||0);
  if(!w1 || !w2) return showError('ワット数を入力してください');
  if(w1 <= 0 || w2 <= 0) return showError('ワット数は1以上で入力してください');
  const t1 = toSeconds(m1, s1);
  if(t1 <= 0) return showError('記載されている時間を入力してください');
  const raw = t1 * (w1 / w2);
  const withMargin = raw + margin;
  const t2 = roundByMode(withMargin, rounding);
  $('out').innerHTML = `<p class ="time">${format(t2)}</p>`;
}

function showError(msg){
  $('out').style.display = 'flex';
  $('out').innerHTML = `<p style="font-size:1.1rem">${msg}</p>`;
}

function roundingLabel(mode){
  return {
    exact:'そのまま（小数切上げ1秒）',
    nearest5:'四捨五入',
    short5:'少し短め（例:3分02秒→3分00秒）',
    long5:'少し長め（例:3分02秒→3分05秒）'
  }[mode] || mode;
}

function swap(){
  const w1 = $('w1').value, w2 = $('w2').value;
  $('w1').value = w2; $('w2').value = w1;
}

// --- Presets (localStorage) ---
const LS_KEY = 'mw-presets-v1';

function loadPresets(){
  try {
    const arr = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
    renderPresets(arr);
  } catch(e){ renderPresets([]); }
}

function savePreset(){
  const w1 = Number($('w1').value);
  const w2 = Number($('w2').value);
  const m1 = Number($('m1').value||0);
  const s1 = Number($('s1').value||0);
  const rounding = $('rounding').value;
  const margin = Number($('margin').value||0);
  if(!w1 || !w2 || (m1===0 && s1===0)) return alert('保存前に数値を入力してね。');
  const label = prompt('レシピ名（例：500W→700W 4分10秒）', `${w1}W→${w2}W ${m1}分${pad(s1)}秒`);
  if(label === null) return;
  const item = {label, w1, w2, m1, s1, rounding, margin, ts: Date.now()};
  let arr = [];
  try { arr = JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch(e){}
  arr.unshift(item);
  // 直近20件まで
  arr = arr.slice(0, 20);
  localStorage.setItem(LS_KEY, JSON.stringify(arr));
  renderPresets(arr);
}

function renderPresets(arr){
  const box = $('presets');
  box.innerHTML = '';
  if(!arr.length){ box.innerHTML = '<span class="hint">まだありません。</span>'; return; }
  arr.forEach((p, i)=>{
    const chip = document.createElement('button');
    chip.className = 'chip';
    chip.textContent = p.label;
    chip.title = 'タップで入力に反映';
    chip.onclick = ()=>{
      $('w1').value = p.w1; $('w2').value = p.w2;
      $('m1').value = p.m1; $('s1').value = p.s1;
      $('rounding').value = p.rounding; $('margin').value = p.margin;
    };
    box.appendChild(chip);
  });
}

// --- サウンド管理 ---
let isMuted = true;

function playClickSound() {
  const audio = $('click-sound');
  if (!audio) return;
  if (isMuted) return;
  audio.currentTime = 0; 
  audio.play().catch(err => console.warn('再生できませんでした:', err));
}

window.addEventListener("DOMContentLoaded", () => {
  const bgm = $("bgm");
  const click = $("click-sound");

  // 初期はミュート
  bgm.muted = true;
  click.muted = true;
  $("mute").textContent = "ミュート解除"; // 初期表示

  // 計算ボタン
  $('calc').addEventListener('click', () => {
    playClickSound();
    calc();
  });
  $('swap').addEventListener('click', swap);
  $('save').addEventListener('click', savePreset);

  // ミュートボタン
  $('mute').addEventListener('click', () => {
    isMuted = !isMuted;
    bgm.muted = isMuted;
    click.muted = isMuted;
    $('mute').textContent = isMuted ? "ミュート解除" : "ミュート";
    if (!isMuted) {
      bgm.play().catch(err => console.warn("BGM再生失敗:", err));
    }
  });

  // 音声許可モーダル
  $("allow-sound").addEventListener("click", () => {
    isMuted = false;
    bgm.muted = false;
    click.muted = false;
    $("mute").textContent = "ミュート"; // ← 「はい」でミュートボタンを「ミュート」に
    bgm.play().catch(err => console.warn("BGM再生失敗:", err));
    $("sound-modal").style.display = "none";
  });
  $("deny-sound").addEventListener("click", () => {
    isMuted = true;
    bgm.muted = true;
    click.muted = true;
    $("mute").textContent = "ミュート解除"; // ← 「いいえ」でミュートボタンを「ミュート解除」に
    $("sound-modal").style.display = "none";
  });

  // 入力内容クリア
  $("delete-label").addEventListener("click", () => {
    $("w1").value = "";
    $("w2").value = "";
    $("m1").value = "";
    $("s1").value = "";
    $("margin").value = 0;
    $("rounding").value = "exact"; // ← ここ追加！「そのまま」に戻す
    $("out").innerHTML = ""; // 計算結果も消す
  });

  // レシピ読込
  loadPresets();

  // slick初期化
  jQuery(function () {  
    jQuery('.slider').slick({
      arrows: false,
      autoplaySpeed: 30,
      cssEase: "linear",
      swipe: false,
      infinite: true,
      speed: 8000,
      autoplay: true,
      pauseOnFocus: false,
      pauseOnHover: true,
      centerMode: true,
      slidesToShow: 1,
      centerPadding: '30%',
      variableWidth: true,
    });
  });
});


// レシピ削除モーダル処理
$("delete").addEventListener("click", () => {
  const arr = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
  const listBox = $("delete-list");
  listBox.innerHTML = "";
  if (!arr.length) {
    listBox.innerHTML = "<p>保存されたレシピはありません。</p>";
  } else {
    arr.forEach((p, i) => {
      const lbl = document.createElement("label");
      lbl.style.display = "block";
      lbl.innerHTML = `<input type="checkbox" value="${i}"> ${p.label}`;
      listBox.appendChild(lbl);
    });
  }
  $("delete-modal").style.display = "flex";
});

// 削除モーダルキャンセル
$("delete-cancel").addEventListener("click", () => {
  $("delete-modal").style.display = "none";
});

// 削除ボタン → 確認モーダルへ
$("delete-confirm").addEventListener("click", () => {
  const checked = [...$("delete-list").querySelectorAll("input:checked")];
  if (checked.length === 0) {
    alert("削除するレシピを選んでください。");
    return;
  }
  $("delete-modal").style.display = "none";
  $("confirm-modal").style.display = "flex";
});

// 「はい」で削除
$("confirm-yes").addEventListener("click", () => {
  const arr = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
  const checked = [...$("delete-list").querySelectorAll("input:checked")].map(el => Number(el.value));
  const newArr = arr.filter((_, i) => !checked.includes(i));
  localStorage.setItem(LS_KEY, JSON.stringify(newArr));
  renderPresets(newArr);

  $("confirm-modal").style.display = "none";
  showToast("削除しました！");
});

// 「いいえ」で一覧に戻る
$("confirm-no").addEventListener("click", () => {
  $("confirm-modal").style.display = "none";
  $("delete-modal").style.display = "flex";
});

// 削除完了トースト表示
function showToast(msg) {
  const toast = $("delete-toast");
  toast.textContent = msg;
  toast.style.display = "block";
  setTimeout(() => {
    toast.style.display = "none";
  }, 2000);
}

const audio = document.getElementById("bgm");
audio.volume = 0.5;
