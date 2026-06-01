/* ── Guldala Tort Chat Widget v1.0 ──────────────────────────
   Embed on any HTML page. Configure via window.GuldalaChatConfig.

   Config options:
     botToken    — Telegram bot token (or use endpoint for PHP proxy)
     ownerChatId — Telegram chat_id to receive orders
     endpoint    — URL to send-order.php (hides token from frontend)
     siteName    — Display name in widget header
──────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  /* ── Config ─────────────────────────────────────────────── */
  var C        = window.GuldalaChatConfig || {};
  var TOKEN    = C.botToken    || '';
  var OWNER    = C.ownerChatId || '';
  var ENDPOINT = C.endpoint    || '';          // PHP proxy URL (recommended)
  var SITE     = C.siteName    || 'Guldala Tort';

  /* ── Conversation data ───────────────────────────────────── */
  var CATEGORIES = [
    { label: '🎂 Торты'   },
    { label: '🥧 Пироги'  },
    { label: '🍮 Десерты' },
  ];

  var PRICES_HTML =
    '<b>🍰 Прайс-лист ' + esc(SITE) + '</b><br><br>' +
    '🎂 День рождения — от 3 000 тг/кг<br>' +
    '💍 Свадебный — от 5 000 тг/кг<br>' +
    '🧒 Детский — от 3 500 тг/кг<br>' +
    '✨ Другой повод — от 3 000 тг/кг<br><br>' +
    '📦 Минимум: 1 кг (8–10 порций)<br>' +
    '⏰ Срок изготовления: от 2 дней<br><br>' +
    '<i>Для точного расчёта — оформите заказ, мы уточним!</i>';

  /* ── State ───────────────────────────────────────────────── */
  var step  = 'MENU';
  var order = {};

  /* ── DOM refs ────────────────────────────────────────────── */
  var panel, messages, inputArea, chatBtn;

  /* ── Helpers ─────────────────────────────────────────────── */
  function esc(s) {
    return String(s)
      .replace(/&/g,  '&amp;')
      .replace(/</g,  '&lt;')
      .replace(/>/g,  '&gt;')
      .replace(/"/g,  '&quot;');
  }

  function addMsg(html, role) {
    var wrap   = document.createElement('div');
    wrap.className = 'gc-msg gc-msg--' + role;
    var bubble = document.createElement('div');
    bubble.className = 'gc-bubble';
    bubble.innerHTML = html;
    wrap.appendChild(bubble);
    messages.appendChild(wrap);
    messages.scrollTop = messages.scrollHeight;
    return bubble;
  }

  function botMsg(html) { return addMsg(html, 'bot'); }
  function userMsg(txt)  { addMsg(esc(txt), 'user'); }

  function typingDots() {
    var wrap = document.createElement('div');
    wrap.className = 'gc-msg gc-msg--bot';
    var bubble = document.createElement('div');
    bubble.className = 'gc-bubble gc-typing';
    bubble.innerHTML = '<span></span><span></span><span></span>';
    wrap.appendChild(bubble);
    messages.appendChild(wrap);
    messages.scrollTop = messages.scrollHeight;
    return wrap;
  }

  function clearInput() { inputArea.innerHTML = ''; }

  function showButtons(buttons) {
    clearInput();
    var row = document.createElement('div');
    row.className = 'gc-btns';
    buttons.forEach(function (b) {
      var btn = document.createElement('button');
      btn.className = 'gc-btn';
      btn.innerHTML  = b.label;
      btn.onclick    = b.action;
      row.appendChild(btn);
    });
    inputArea.appendChild(row);
  }

  function showTextInput(placeholder, validate) {
    clearInput();
    var row = document.createElement('div');
    row.className = 'gc-input-row';

    var inp = document.createElement('input');
    inp.type        = 'text';
    inp.className   = 'gc-input';
    inp.placeholder = placeholder;
    inp.autocomplete = 'off';

    var sendBtn = document.createElement('button');
    sendBtn.className = 'gc-send-btn';
    sendBtn.innerHTML = '&#10148;';

    function submit() {
      var val = inp.value.trim();
      if (!val) return;
      validate(val);
    }

    sendBtn.onclick = submit;
    inp.addEventListener('keypress', function (e) {
      if (e.key === 'Enter') submit();
    });

    row.appendChild(inp);
    row.appendChild(sendBtn);
    inputArea.appendChild(row);
    setTimeout(function () {
      inp.focus();
      messages.scrollTop = messages.scrollHeight;
    }, 50);

    inp.addEventListener('focus', function () {
      setTimeout(function () { messages.scrollTop = messages.scrollHeight; }, 350);
    });
  }

  /* ── Flow steps ──────────────────────────────────────────── */
  function goMenu() {
    step  = 'MENU';
    order = {};
    botMsg(
      'Привет! 👋 Добро пожаловать в <b>' + esc(SITE) + '</b> 🎂<br><br>' +
      'Мы делаем вкусные и красивые торты на любой праздник.<br><br>' +
      'Чем могу помочь?'
    );
    showButtons([
      { label: '🛒 Сделать заказ', action: goOrder  },
      { label: '💰 Узнать цены',  action: goPrices },
    ]);
  }

  function goPrices() {
    userMsg('💰 Узнать цены');
    botMsg(PRICES_HTML);
    showButtons([
      { label: '🛒 Сделать заказ', action: goOrder },
      { label: '🔙 Назад',         action: goMenu  },
    ]);
  }

  function goOrder() {
    step = 'CATEGORY';
    userMsg('🛒 Сделать заказ');
    botMsg('<b>Шаг 1 из 5.</b> Выберите категорию:');
    showButtons(
      CATEGORIES.map(function (t) {
        return { label: t.label, action: function () { pickCategory(t.label); } };
      })
    );
  }

  function pickCategory(label) {
    step = 'DESCRIPTION';
    order.category = label;
    userMsg(label);
    botMsg(
      'Категория: <b>' + esc(label) + '</b> ✅<br><br>' +
      '<b>Шаг 2 из 5.</b> Что именно хотите заказать?<br>' +
      '<i>Опишите свободно: вид, вкус, оформление, надпись — всё что важно</i>'
    );
    showTextInput('Опишите ваш заказ', function (val) {
      if (val.length > 1000) {
        botMsg('⚠️ Слишком длинное описание (максимум 1000 символов).');
        return;
      }
      pickDescription(val);
    });
  }

  function pickDescription(val) {
    step = 'PORTIONS';
    order.description = val;
    userMsg(val);
    botMsg(
      'Записано ✅<br><br>' +
      '<b>Шаг 3 из 5.</b> Сколько нужно порций?<br>' +
      '<i>Введите число от 1 до 500, например: 12</i>'
    );
    showTextInput('Количество порций (напр. 12)', function (val) {
      if (!(/^\d+$/.test(val)) || +val < 1 || +val > 500) {
        botMsg('⚠️ Пожалуйста, введите целое число от 1 до 500.');
        return;
      }
      pickPortions(val);
    });
  }

  function pickPortions(val) {
    step = 'DATE';
    order.portions = val;
    userMsg(val);
    botMsg(
      'Порций: <b>' + esc(val) + '</b> ✅<br><br>' +
      '<b>Шаг 4 из 5.</b> Когда нужен заказ?<br>' +
      '<i>Например: 15 июля 2025 или 15.07.2025</i>'
    );
    showTextInput('Дата (напр. 15.07.2025)', function (val) {
      if (val.length > 100) {
        botMsg('⚠️ Дата слишком длинная, напишите покороче.');
        return;
      }
      pickDate(val);
    });
  }

  function pickDate(val) {
    step = 'NAME';
    order.date = val;
    userMsg(val);
    botMsg(
      'Дата: <b>' + esc(val) + '</b> ✅<br><br>' +
      '<b>Шаг 5а из 5.</b> Как вас зовут?'
    );
    showTextInput('Ваше имя', function (val) {
      if (val.length > 100) {
        botMsg('⚠️ Имя слишком длинное.');
        return;
      }
      pickName(val);
    });
  }

  function pickName(val) {
    step = 'PHONE';
    order.name = val;
    userMsg(val);
    botMsg(
      'Имя: <b>' + esc(val) + '</b> ✅<br><br>' +
      '<b>Шаг 5б из 5.</b> Ваш номер телефона<br>' +
      '<i>Например: +7 777 123 45 67</i>'
    );
    showTextInput('Номер телефона', function (val) {
      if (!/^[\+\d][\d\s\-\(\)]{6,19}$/.test(val)) {
        botMsg('⚠️ Пожалуйста, введите корректный номер телефона.');
        return;
      }
      pickPhone(val);
    });
  }

  function pickPhone(val) {
    step = 'CONFIRM';
    order.phone = val;
    userMsg(val);
    botMsg(
      '📋 <b>Ваш заказ:</b><br><br>' +
      '🗂 Категория: '  + esc(order.category)    + '<br>' +
      '📝 Описание: '   + esc(order.description) + '<br>' +
      '🍽 Порций: '     + esc(order.portions)    + '<br>' +
      '📅 Дата: '       + esc(order.date)        + '<br>' +
      '👤 Имя: '        + esc(order.name)        + '<br>' +
      '📞 Телефон: '    + esc(order.phone)       + '<br><br>' +
      'Всё верно? Подтверждаете заказ?'
    );
    showButtons([
      { label: '✅ Подтвердить',   action: confirmOrder },
      { label: '🔄 Начать заново', action: function () {
          userMsg('🔄 Начать заново');
          goMenu();
        }
      },
    ]);
  }

  function confirmOrder() {
    step = 'DONE';
    userMsg('✅ Подтвердить');
    clearInput();

    var dots    = typingDots();
    var msgText =
      '🆕 НОВЫЙ ЗАКАЗ — ' + SITE + '\n\n' +
      '🗂 Категория: '  + order.category    + '\n' +
      '📝 Описание: '   + order.description + '\n' +
      '🍽 Порций: '     + order.portions    + '\n' +
      '📅 Дата: '       + order.date        + '\n' +
      '👤 Имя: '        + order.name        + '\n' +
      '📞 Телефон: '    + order.phone       + '\n' +
      '🌐 Источник: сайт';

    sendOrder(msgText).then(function (ok) {
      messages.removeChild(dots);

      if (ok) {
        botMsg(
          '✅ <b>Заказ принят!</b><br><br>' +
          'Спасибо! Мы получили вашу заявку и скоро свяжемся с вами 🎉'
        );
      } else {
        botMsg(
          '✅ <b>Заказ записан!</b><br><br>' +
          'Спасибо! Мы свяжемся с вами по указанному номеру 📞'
        );
      }

      showButtons([{ label: '🛒 Новый заказ', action: function () {
        userMsg('🛒 Новый заказ');
        goMenu();
      }}]);
    });
  }

  /* ── API call ────────────────────────────────────────────── */
  function sendOrder(text) {
    if (!ENDPOINT && (!TOKEN || !OWNER)) {
      console.warn(
        '[GuldalaChat] Заказ не отправлен: укажите botToken+ownerChatId или endpoint в GuldalaChatConfig.'
      );
      return Promise.resolve(false);
    }

    var url  = ENDPOINT || ('https://api.telegram.org/bot' + TOKEN + '/sendMessage');
    var body = ENDPOINT
      ? JSON.stringify({ text: text })
      : JSON.stringify({ chat_id: OWNER, text: text });

    return fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    body,
    })
      .then(function (r) { return r.ok; })
      .catch(function ()  { return false; });
  }

  /* ── Build DOM ───────────────────────────────────────────── */
  function buildWidget() {
    /* floating button */
    chatBtn = document.createElement('button');
    chatBtn.id = 'gc-chat-btn';
    chatBtn.setAttribute('aria-label', 'Открыть чат');
    chatBtn.innerHTML = '💬<span class="gc-notif"></span>';
    chatBtn.addEventListener('click', togglePanel);

    /* panel */
    panel = document.createElement('div');
    panel.id = 'gc-panel';
    panel.className = 'gc-hidden';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Чат ' + SITE);

    /* header */
    var header = document.createElement('div');
    header.id = 'gc-header';
    header.innerHTML =
      '<div id="gc-header-info">' +
        '<div id="gc-header-avatar">🎂</div>' +
        '<div id="gc-header-text">' +
          '<span id="gc-header-title">' + esc(SITE) + '</span>' +
          '<span id="gc-header-sub">Онлайн • Ответим быстро</span>' +
        '</div>' +
      '</div>';

    var closeBtn = document.createElement('button');
    closeBtn.id = 'gc-close';
    closeBtn.setAttribute('aria-label', 'Закрыть чат');
    closeBtn.innerHTML = '&#10005;';
    closeBtn.addEventListener('click', function () {
      panel.classList.add('gc-hidden');
    });
    header.appendChild(closeBtn);

    /* messages */
    messages = document.createElement('div');
    messages.id = 'gc-messages';

    /* input */
    inputArea = document.createElement('div');
    inputArea.id = 'gc-input-area';

    panel.appendChild(header);
    panel.appendChild(messages);
    panel.appendChild(inputArea);

    document.body.appendChild(chatBtn);
    document.body.appendChild(panel);

    goMenu();

    /* Mobile keyboard fix — resize panel to visible viewport */
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', function () {
        if (window.innerWidth > 430 || panel.classList.contains('gc-hidden')) return;
        panel.style.height = window.visualViewport.height + 'px';
        panel.style.top    = window.visualViewport.offsetTop + 'px';
        panel.style.bottom = 'auto';
        messages.scrollTop = messages.scrollHeight;
      });
    }
  }

  function togglePanel() {
    var hidden = panel.classList.toggle('gc-hidden');
    if (!hidden) {
      messages.scrollTop = messages.scrollHeight;
      /* hide notification dot once opened */
      var notif = chatBtn.querySelector('.gc-notif');
      if (notif) notif.style.display = 'none';
    }
  }

  /* ── Init ────────────────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildWidget);
  } else {
    buildWidget();
  }
})();
