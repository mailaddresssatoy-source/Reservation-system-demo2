const LIFF_ID = '2010522633-RyI51ikg';
const GAS_URL = 'https://script.google.com/macros/s/AKfycbzvodEQj_qt8Li4PCrIO-phnJPnM3N4fSKSHx4pS2uMw3RtEKTS4KXZsFBw7U0pFyN62A/exec';

let availability = {};

let state = {
  type: '',
  date: '',
  time: '',
  y: 2026,
  m: 6
};

const $ = id => document.getElementById(id);
const screens = ['s1', 's2', 's3', 'loading', 's4', 'talk'];

function show(id) {
  screens.forEach(s => $(s).classList.remove('active'));
  $(id).classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function key(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function fmt(k) {
  if (!k) return '未選択';
  const d = new Date(k + 'T00:00:00');
  const weeks = ['日', '月', '火', '水', '木', '金', '土'];
  return `${d.getMonth() + 1}月${d.getDate()}日（${weeks[d.getDay()]}）`;
}

function stat(k) {
  const t = availability[k];

  if (!t || !t.length) {
    return { c: 'day-ng', l: '<i class="bi bi-x-lg"></i>' };
  }

  if (t.length <= 2) {
    return { c: 'day-few', l: '<i class="bi bi-triangle"></i>' };
  }

  return { c: 'day-ok', l: '<i class="bi bi-circle"></i>' };
}

async function loadAvailability() {
  try {
    const start = `${state.y}-${String(state.m + 1).padStart(2, '0')}-01`;
    const type = encodeURIComponent(state.type || '来店予約');
    const url = `${GAS_URL}?start=${start}&days=14&type=${type}`;

    $('monthLabel').textContent = '読み込み中...';
    $('days').innerHTML = '';

    const response = await fetch(url);
    availability = await response.json();

    renderCal();
  } catch (error) {
    console.error(error);
    alert('空き状況の取得に失敗しました。');
  }
}

function renderCal() {
  const days = $('days');
  days.innerHTML = '';
  $('monthLabel').textContent = `${state.y}年${state.m + 1}月`;

  const first = new Date(state.y, state.m, 1);
  const start = first.getDay();
  const last = new Date(state.y, state.m + 1, 0).getDate();

  for (let i = 0; i < start; i++) {
    const e = document.createElement('div');
    e.className = 'day day-empty';
    days.appendChild(e);
  }

  for (let d = 1; d <= last; d++) {
    const k = key(state.y, state.m, d);
    const s = stat(k);

    const b = document.createElement('button');
    b.type = 'button';
    b.className = `day ${s.c}${state.date === k ? ' day-selected' : ''}`;
    b.innerHTML = `<span class="day-num">${d}</span><span class="day-status">${s.l}</span>`;

    if (s.c === 'day-ng') {
      b.disabled = true;
    } else {
      b.onclick = () => {
        state.date = k;
        state.time = '';

        $('detail').classList.add('open');

        renderCal();
        renderTimes();

        setTimeout(() => {
          $('detail').scrollIntoView({ behavior: 'smooth' });
        }, 120);
      };
    }

    days.appendChild(b);
  }
}

function renderTimes() {
  const box = $('times');
  box.innerHTML = '';

  $('timeTitle').textContent = `${fmt(state.date)} の空き時間`;

  (availability[state.date] || []).forEach(t => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `slot${state.time === t ? ' slot-selected' : ''}`;
    b.textContent = t;

    b.onclick = () => {
      state.time = t;
      renderTimes();
      document.querySelector('.form').scrollIntoView({ behavior: 'smooth' });
    };

    box.appendChild(b);
  });
}

document.querySelectorAll('.choice').forEach(b => {
  b.onclick = async () => {
    state.type = b.dataset.type;
    state.date = '';
    state.time = '';

    $('typeLabel').textContent = state.type;
    $('addrWrap').classList.toggle('show', state.type === '出張買取予約');
    $('detail').classList.remove('open');

    show('s2');
    await loadAvailability();
  };
});

$('prev').onclick = async () => {
  state.m--;

  if (state.m < 0) {
    state.m = 11;
    state.y--;
  }

  state.date = '';
  state.time = '';
  $('detail').classList.remove('open');

  await loadAvailability();
};

$('next').onclick = async () => {
  state.m++;

  if (state.m > 11) {
    state.m = 0;
    state.y++;
  }

  state.date = '';
  state.time = '';
  $('detail').classList.remove('open');

  await loadAvailability();
};

$('toConfirm').onclick = () => {
  if (!state.date || !state.time) {
    return alert('ご希望日時を選択してください。');
  }

  if (!$('name').value.trim()) {
    return alert('お名前を入力してください。');
  }

  if (state.type === '出張買取予約' && !$('addr').value.trim()) {
    return alert('出張先のご住所を入力してください。');
  }

  fillConfirm();
  show('s3');
};

function fillConfirm() {
  const tel = $('tel').value.trim() || '未入力';
  const addr = $('addr').value.trim() || '未入力';
  const memo = $('memo').value.trim() || 'なし';

  $('cfType').textContent = state.type;
  $('cfDate').textContent = `${fmt(state.date)} ${state.time}`;
  $('cfName').textContent = $('name').value.trim();
  $('cfTel').textContent = tel;
  $('cfAddr').textContent = addr;
  $('cfMemo').textContent = memo;
  $('cfAddrRow').style.display = state.type === '出張買取予約' ? 'flex' : 'none';
}

$('edit').onclick = () => show('s2');

$('reserve').onclick = async () => {
  show('loading');

  const steps = [
    '予約内容を確認しています…',
    'Googleカレンダーへ登録中…',
    'LINEへ確認メッセージを送信しています…'
  ];

  $('loadingText').textContent = steps[0];

  await new Promise(r => setTimeout(r, 1000));

  $('loadingText').textContent = steps[1];

  const reservation = {
    type: state.type,
    date: state.date,
    time: state.time,
    name: $('name').value.trim(),
    tel: $('tel').value.trim(),
    address: $('addr').value.trim(),
    memo: $('memo').value.trim()
  };

  try {
    const response = await fetch(GAS_URL, {
      method: 'POST',
      body: JSON.stringify(reservation)
    });

    const result = await response.json();

    if (!result.success) {
      alert(result.message);
      show('s2');
      await loadAvailability();
      return;
    }

    $('loadingText').textContent = steps[2];

    await new Promise(r => setTimeout(r, 1000));

    fillDone();
    show('s4');

  } catch (e) {
    console.error(e);
    alert('予約登録に失敗しました。');
    show('s2');
  }
};

function fillDone() {
  const dt = `${fmt(state.date)} ${state.time}`;

  $('doneType').textContent = state.type;
  $('doneDate').textContent = dt;
  $('talkMsg').innerHTML = `【ご予約内容】<br>${state.type}<br><br>【ご予約日時】<br>${dt}`;
}

$('toLine').onclick = () => {
  if (typeof liff !== 'undefined' && liff.isInClient()) {
    liff.closeWindow();
  } else {
    show('talk');
  }
};

$('restart').onclick = () => {
  state = {
    type: '',
    date: '',
    time: '',
    y: 2026,
    m: 6
  };

  availability = {};

  $('detail').classList.remove('open');

  document.querySelectorAll('input, textarea').forEach(e => {
    e.value = '';
  });

  show('s1');
};

$('backBtn').onclick = () => {
  if ($('s2').classList.contains('active')) {
    show('s1');
  } else if ($('s3').classList.contains('active')) {
    show('s2');
  } else if ($('s4').classList.contains('active')) {
    show('s3');
  } else {
    show('s1');
  }
};

async function initLiff() {
  if (typeof liff === 'undefined') {
    console.log('LIFF SDKが読み込まれていません。通常のWebページとして表示します。');
    return;
  }

  try {
    await liff.init({ liffId: LIFF_ID });

    console.log('LIFF initialized');
    console.log('LINE内で開いている:', liff.isInClient());

    if (!liff.isLoggedIn()) {
      liff.login();
      return;
    }
  } catch (error) {
    console.error('LIFF初期化エラー:', error);
  }
}

initLiff();