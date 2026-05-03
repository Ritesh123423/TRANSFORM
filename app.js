/* global TRANSFORM_DATA */
(function () {
  'use strict';

  if (!window.TRANSFORM_DATA || typeof window.TRANSFORM_DATA.TOTAL_DAYS !== 'number') {
    document.addEventListener('DOMContentLoaded', function () {
      document.body.innerHTML =
        '<div style="padding:24px;font-family:system-ui;max-width:360px;margin:40px auto;text-align:center;line-height:1.5"><p>Could not load app data. Ensure <strong>data.js</strong> loads before <strong>app.js</strong> and scripts are allowed.</p></div>';
    });
    return;
  }

  var D = window.TRANSFORM_DATA;
  var TOTAL = D.TOTAL_DAYS;
  var MEAL_PROT_EST = [15, 7, 32, 6, 7, 7, 32, 9];
  var PROGRAM_START_KEY = 'transform_start_date';

  var screenStack = ['screen-home'];
  var viewDay = 1;
  var workoutTab = 'warmup';
  var notifTick = null;
  var countdownTimer = null;
  var resetConfirm = false;

  function $(id) {
    return document.getElementById(id);
  }

  function lsGet(key, def) {
    try {
      var v = localStorage.getItem(key);
      return v === null || v === undefined ? def : v;
    } catch (e) {
      return def;
    }
  }

  function lsSet(key, val, silent) {
    try {
      localStorage.setItem(key, String(val));
      if (!silent) showToast('Saved');
    } catch (e) {
      showToast('Could not save (storage full or blocked)');
    }
  }

  function clampDay(d) {
    var n = parseInt(d, 10);
    if (isNaN(n)) return 1;
    return Math.min(Math.max(n, 1), TOTAL);
  }

  function dayKey(day, suffix) {
    return 'day_' + day + '_' + suffix;
  }

  function getBoolDay(day, key, defFalse) {
    return lsGet(dayKey(day, key), defFalse ? 'false' : '') === 'true';
  }

  function setBoolDay(day, key, val, silent) {
    lsSet(dayKey(day, key), val ? 'true' : 'false', silent);
  }

  function getNumDay(day, key, def) {
    var s = lsGet(dayKey(day, key), '');
    var n = parseInt(s, 10);
    return isNaN(n) ? def : n;
  }

  function setNumDay(day, key, n, silent) {
    lsSet(dayKey(day, key), String(n), silent);
  }

  function getStrDay(day, key, def) {
    return lsGet(dayKey(day, key), def);
  }

  function setStrDay(day, key, s, silent) {
    lsSet(dayKey(day, key), s, silent);
  }

  function getArrDay(day, key, len) {
    var raw = lsGet(dayKey(day, key), '');
    try {
      var a = JSON.parse(raw);
      if (Array.isArray(a) && a.length === len) return a.map(Boolean);
    } catch (e) {}
    return new Array(len).fill(false);
  }

  function setArrDay(day, key, arr, silent) {
    try {
      localStorage.setItem(dayKey(day, key), JSON.stringify(arr.map(Boolean)));
      if (!silent) showToast('Saved');
    } catch (e) {
      showToast('Could not save (storage full or blocked)');
    }
  }

  function noon(d) {
    var x = new Date(d);
    x.setHours(12, 0, 0, 0);
    return x;
  }

  function formatLocalYYYYMMDD(d) {
    var y = d.getFullYear();
    var m = d.getMonth() + 1;
    var day = d.getDate();
    return y + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
  }

  function hasAnyDayStorage() {
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && /^day_\d+_/.test(k)) return true;
    }
    return false;
  }

  /**
   * New installs: program starts today (avoids "already complete" from the template date May 2025).
   * Existing saves with day_* keys but no anchor: keep DEFAULT_START_DATE_STR for continuity.
   */
  function ensureProgramStart() {
    var s = localStorage.getItem(PROGRAM_START_KEY);
    if (s && /^\d{4}-\d{2}-\d{2}$/.test(s)) {
      D._programStart = s;
      return;
    }
    if (hasAnyDayStorage()) s = D.START_DATE_STR;
    else s = formatLocalYYYYMMDD(new Date());
    localStorage.setItem(PROGRAM_START_KEY, s);
    D._programStart = s;
  }

  function programStartDateStr() {
    return D._programStart || D.START_DATE_STR;
  }

  function startDate() {
    return noon(new Date(programStartDateStr()));
  }

  /** 0-based index from start; May 5 start -> 0 on first day */
  function dayIndexFromToday() {
    return Math.round((noon(new Date()) - startDate()) / 86400000);
  }

  /** Active program day 1..TOTAL, or TOTAL+1 if finished */
  function programDayNumber() {
    var idx = dayIndexFromToday();
    if (idx < 0) return 1;
    if (idx >= TOTAL) return TOTAL + 1;
    return idx + 1;
  }

  function formatCalendarDate(dayNum) {
    var t = startDate();
    t.setDate(t.getDate() + (dayNum - 1));
    var opts = { weekday: 'long', day: 'numeric', month: 'long' };
    try {
      return t.toLocaleDateString(undefined, opts);
    } catch (e) {
      return t.toDateString();
    }
  }

  function workoutType(dayNum) {
    return D.workoutTypeForDayNum(dayNum);
  }

  function phaseNum(dayNum) {
    return D.phaseForDay(dayNum);
  }

  function exercisesFor(dayNum) {
    var type = workoutType(dayNum);
    if (type === 'REST') return [];
    var ph = phaseNum(dayNum);
    var list = D.workouts[type][ph];
    return list || [];
  }

  function exerciseCount(dayNum) {
    return exercisesFor(dayNum).length;
  }

  function badgeClass(type) {
    if (type === 'CHEST') return 'badge-chest';
    if (type === 'BODY_CORE') return 'badge-core';
    if (type === 'FULL_BODY') return 'badge-full';
    return 'badge-rest';
  }

  function badgeLabel(type) {
    if (type === 'BODY_CORE') return 'BODY+CORE';
    if (type === 'FULL_BODY') return 'FULL BODY';
    if (type === 'REST') return 'REST';
    return type;
  }

  function streakDone() {
    var pd = programDayNumber();
    var end = pd > TOTAL ? TOTAL : pd;
    if (pd <= TOTAL && !getBoolDay(pd, 'done', true)) end = pd - 1;
    var streak = 0;
    for (var i = end; i >= 1; i--) {
      if (getBoolDay(i, 'done', true)) streak++;
      else break;
    }
    return streak;
  }

  function countDoneDays() {
    var n = 0;
    for (var i = 1; i <= TOTAL; i++) {
      if (getBoolDay(i, 'done', true)) n++;
    }
    return n;
  }

  function countPerfectDays() {
    var n = 0;
    for (var i = 1; i <= TOTAL; i++) {
      if (lsGet(dayKey(i, 'perfect'), '') === 'true') n++;
    }
    return n;
  }

  function bestStreakEver() {
    var best = 0;
    var cur = 0;
    for (var i = 1; i <= TOTAL; i++) {
      if (getBoolDay(i, 'done', true)) {
        cur++;
        if (cur > best) best = cur;
      } else cur = 0;
    }
    return best;
  }

  function totalWorkoutsLogged() {
    var n = 0;
    for (var i = 1; i <= TOTAL; i++) {
      if (getBoolDay(i, 'workout', true)) n++;
    }
    return n;
  }

  function streakLevel(streak) {
    if (streak >= 30) return { name: 'Champion', tier: 'Platinum' };
    if (streak >= 14) return { name: 'Transformer', tier: 'Gold' };
    if (streak >= 7) return { name: 'Builder', tier: 'Silver' };
    if (streak >= 3) return { name: 'Fighter', tier: 'Bronze' };
    return { name: '', tier: '' };
  }

  function estimatedProtein(day) {
    var meals = getArrDay(day, 'meals', 8);
    var sum = 0;
    for (var i = 0; i < 8; i++) if (meals[i]) sum += MEAL_PROT_EST[i];
    return Math.round(sum);
  }

  function waterGlasses(day) {
    return Math.min(8, Math.max(0, getNumDay(day, 'water', 0)));
  }

  function workoutCompleteLogic(day) {
    var type = workoutType(day);
    if (type === 'REST') return getBoolDay(day, 'workout', true);
    var ex = exercisesFor(day);
    var arr = getArrDay(day, 'exercises', ex.length);
    return ex.length > 0 && arr.every(Boolean);
  }

  function dietCompleteLogic(day) {
    var meals = getArrDay(day, 'meals', 8);
    return meals.every(Boolean);
  }

  function refreshMarkDayButton(day) {
    var btn = $('btn-mark-day-complete');
    if (!btn) return;
    var wc = workoutCompleteLogic(day);
    var dc = dietCompleteLogic(day);
    btn.disabled = !(wc && dc);
    if (getBoolDay(day, 'done', true)) {
      btn.textContent = 'Day Complete ✓';
      btn.classList.remove('btn-gold');
      btn.classList.add('btn-primary');
      btn.disabled = true;
    } else {
      btn.textContent = 'Mark Day Complete';
      btn.classList.add('btn-gold');
      btn.classList.remove('btn-primary');
    }
  }

  function showToast(msg) {
    var el = $('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function () {
      el.classList.remove('show');
    }, 2000);
  }

  function showScreen(id, slide) {
    document.querySelectorAll('.screen').forEach(function (s) {
      s.classList.remove('active', 'slide-in', 'slide-back');
      s.style.display = 'none';
    });
    var el = $(id);
    if (!el) return;
    el.style.display = 'block';
    el.classList.add('active');
    if (slide === 'in') el.classList.add('slide-in');
    else if (slide === 'back') el.classList.add('slide-back');

    var hideTabs = id === 'screen-completion';
    document.body.classList.toggle('hide-tabs', hideTabs);

    if (id !== 'screen-completion') syncTabBarToCurrentScreen();

    updateOfflinePills();
    if (id === 'screen-home') renderHome();
    if (id === 'screen-today') renderToday();
    if (id === 'screen-workout') renderWorkout();
    if (id === 'screen-diet') renderDiet();
    if (id === 'screen-water') renderWater();
    if (id === 'screen-progress') renderProgress();
    if (id === 'screen-checks') renderChecks();
    if (id === 'screen-notes') renderNotes();
  }

  function navigateTo(screenId) {
    screenStack.push(screenId);
    showScreen(screenId, 'in');
    startCountdownIfNeeded();
  }

  function goBack() {
    if (screenStack.length <= 1) return;
    screenStack.pop();
    var prev = screenStack[screenStack.length - 1];
    showScreen(prev, 'back');
    startCountdownIfNeeded();
  }

  function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-tab') === tab);
    });
    if (tab === 'settings') {
      openSettings();
      return;
    }
    screenStack = [];
    if (tab === 'home') {
      screenStack.push('screen-home');
      showScreen('screen-home', null);
    } else if (tab === 'today') {
      viewDay = Math.min(Math.max(programDayNumber(), 1), TOTAL);
      screenStack.push('screen-today');
      showScreen('screen-today', null);
    } else if (tab === 'progress') {
      screenStack.push('screen-progress');
      showScreen('screen-progress', null);
    }
    stopCountdownIfUnused();
  }

  function openSettings() {
    $('sheet-overlay').classList.add('active');
    $('settings-sheet').classList.add('open');
    renderSettingsStats();
  }

  function closeSettings() {
    $('sheet-overlay').classList.remove('active');
    $('settings-sheet').classList.remove('open');
    syncTabBarToCurrentScreen();
  }

  /** Keep bottom tabs aligned with the flow (Today sub-screens still highlight Today). */
  function syncTabBarToCurrentScreen() {
    var top = screenStack.length ? screenStack[screenStack.length - 1] : 'screen-home';
    var tab = 'home';
    if (
      top === 'screen-today' ||
      top === 'screen-workout' ||
      top === 'screen-diet' ||
      top === 'screen-water' ||
      top === 'screen-checks' ||
      top === 'screen-notes'
    ) {
      tab = 'today';
    } else if (top === 'screen-progress') tab = 'progress';
    else if (top === 'screen-home') tab = 'home';
    document.querySelectorAll('.tab-btn').forEach(function (b) {
      var name = b.getAttribute('data-tab');
      if (name === 'settings') return;
      b.classList.toggle('active', name === tab);
    });
  }

  function updateOfflinePills() {
    var on = !navigator.onLine;
    ['offline-pill-today', 'offline-pill-workout', 'offline-pill-diet', 'offline-pill-water', 'offline-pill-progress', 'offline-pill-checks', 'offline-pill-notes'].forEach(function (id) {
      var p = $(id);
      if (p) p.classList.toggle('visible', on);
    });
  }

  function updateRing(dayNum) {
    var c = 2 * Math.PI * 70;
    var ring = $('ring-progress');
    if (ring) {
      ring.setAttribute('stroke-dasharray', String(c));
      ring.setAttribute('stroke-dashoffset', String(c * (1 - dayNum / TOTAL)));
    }
    var t = $('ring-day-num');
    if (t) t.textContent = String(dayNum);
  }

  function renderHome() {
    var uname = lsGet('user_name', 'Ritesh');
    var h = new Date().getHours();
    var greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    $('home-greeting').textContent = greet + ', ' + uname + ' 💪';
    $('home-date').textContent = formatCalendarDate(Math.min(programDayNumber(), TOTAL));

    var pd = programDayNumber();
    var displayDay = pd > TOTAL ? TOTAL : pd;
    updateRing(displayDay);

    var streak = streakDone();
    $('pill-streak').textContent = String(streak);
    $('pill-done').textContent = String(countDoneDays());
    var pct = Math.round((countDoneDays() / TOTAL) * 100);
    $('pill-pct').textContent = pct + '%';

    var lvl = streakLevel(streak);
    $('home-level').textContent = lvl.tier ? lvl.tier + ' · ' + lvl.name : '';

    var type = workoutType(displayDay);
    $('qc-badge').className = 'badge-type ' + badgeClass(type);
    $('qc-badge').textContent = badgeLabel(type);
    $('qc-workout-type').textContent = badgeLabel(type);
    var ec = exerciseCount(displayDay);
    $('qc-workout-sub').textContent = '9:00 PM · ' + ec + ' exercises';

    var wg = waterGlasses(displayDay);
    $('qc-water-main').textContent = wg + ' / 8 glasses';
    $('qc-water-bar').style.width = (wg / 8) * 100 + '%';

    var prot = estimatedProtein(displayDay);
    $('qc-diet-main').textContent = prot + 'g / 100g';
    $('qc-diet-bar').style.width = Math.min(100, (prot / D.proteinGoalMid) * 100) + '%';

    $('qc-cal-main').textContent = countDoneDays() + ' / ' + TOTAL;

    var dots = '';
    for (var i = 0; i < 3; i++) {
      var dnum = displayDay - 2 + i;
      if (dnum < 1 || dnum > TOTAL) {
        dots += '<span style="opacity:0.3">·</span> ';
        continue;
      }
      var done = getBoolDay(dnum, 'done', true);
      var col = done ? 'var(--success)' : dnum < displayDay ? 'var(--danger)' : 'var(--border-strong)';
      dots += '<span style="color:' + col + ';font-weight:700">●</span> ';
    }
    $('qc-dots').innerHTML = dots.trim();

    $('btn-open-day').textContent = 'Open Day ' + displayDay + ' →';

    $('home-quote').textContent = D.quotes[displayDay - 1] || '';

    var ws = $('home-week-summary');
    if (ws) {
      var showW = [7, 14, 21, 28].indexOf(displayDay) >= 0;
      if (showW) {
        var startD = displayDay - 6;
        var perfect = 0;
        var wd = 0;
        for (var j = startD; j <= displayDay; j++) {
          if (j < 1) continue;
          if (getBoolDay(j, 'done', true)) wd++;
          if (lsGet(dayKey(j, 'perfect'), '') === 'true') perfect++;
        }
        ws.classList.remove('hidden');
        ws.innerHTML =
          '<strong>Week snapshot</strong><br />Days ' +
          Math.max(1, startD) +
          '–' +
          displayDay +
          ': <strong>' +
          wd +
          '</strong> completed · <strong>' +
          perfect +
          '</strong> perfect days.';
      } else ws.classList.add('hidden');
    }
  }

  function renderCompletion() {
    $('completion-stats').innerHTML =
      'Done days: <strong>' +
      countDoneDays() +
      '</strong> · Perfect: <strong>' +
      countPerfectDays() +
      '</strong> · Best streak: <strong>' +
      bestStreakEver() +
      '</strong>';
  }

  function workoutCountdownText() {
    var now = new Date();
    var target = new Date(now);
    target.setHours(D.workoutHour, D.workoutMinute, 0, 0);
    if (now >= target) return { text: 'Workout time! Go!', ready: true };
    var ms = target - now;
    var h = Math.floor(ms / 3600000);
    var m = Math.floor((ms % 3600000) / 60000);
    var s = Math.floor((ms % 60000) / 1000);
    return { text: 'Workout in ' + h + 'h ' + m + 'm ' + s + 's', ready: false };
  }

  function startCountdownIfNeeded() {
    stopCountdownIfUnused();
    var cur = screenStack[screenStack.length - 1];
    if (cur !== 'screen-today' && cur !== 'screen-workout') return;
    countdownTimer = setInterval(function () {
      var cd = workoutCountdownText();
      var els = [$('today-countdown'), $('workout-countdown')];
      els.forEach(function (el) {
        if (!el) return;
        el.textContent = cd.text;
        el.classList.toggle('ready', cd.ready);
      });
    }, 1000);
    var cd0 = workoutCountdownText();
    if ($('today-countdown')) {
      $('today-countdown').textContent = cd0.text;
      $('today-countdown').classList.toggle('ready', cd0.ready);
    }
    if ($('workout-countdown')) {
      $('workout-countdown').textContent = cd0.text;
      $('workout-countdown').classList.toggle('ready', cd0.ready);
    }
  }

  function stopCountdownIfUnused() {
    if (countdownTimer) clearInterval(countdownTimer);
    countdownTimer = null;
  }

  function renderToday() {
    var day = Math.min(Math.max(viewDay, 1), TOTAL);
    $('today-title').textContent = 'Day ' + day;
    $('today-date-sub').textContent = formatCalendarDate(day);

    var type = workoutType(day);
    $('today-w-badge').className = 'badge-type ' + badgeClass(type);
    $('today-w-badge').textContent = badgeLabel(type);

    var ex = exercisesFor(day);
    var arr = getArrDay(day, 'exercises', ex.length);
    var doneC = ex.length ? arr.filter(Boolean).length : 0;
    $('today-w-sub').textContent = doneC + ' / ' + ex.length + ' exercises done';
    var col = type === 'CHEST' ? 'var(--chest-color)' : type === 'BODY_CORE' ? 'var(--core-color)' : type === 'FULL_BODY' ? 'var(--fullbody-color)' : 'var(--rest-color)';
    $('today-w-bar').style.background = col;
    $('today-w-bar').style.width = ex.length ? (doneC / ex.length) * 100 + '%' : '100%';

    var prot = estimatedProtein(day);
    $('today-diet-pro').textContent = prot + 'g / 100g protein';
    $('today-diet-bar').style.width = Math.min(100, (prot / D.proteinGoalMid) * 100) + '%';
    var meals = getArrDay(day, 'meals', 8);
    $('today-meals-eaten').textContent = meals.filter(Boolean).length + '/8 meals eaten';

    var wg = waterGlasses(day);
    $('today-water-line').textContent = wg + ' / 8 glasses';
    var dots = $('today-water-dots');
    dots.innerHTML = '';
    for (var i = 0; i < 8; i++) {
      var span = document.createElement('span');
      span.style.cssText =
        'display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:4px;background:' +
        (i < wg ? 'var(--water-color)' : 'var(--border)') +
        ';';
      dots.appendChild(span);
    }

    function ic(on) {
      return on ? '✓' : '○';
    }
    $('today-checks-icons').textContent =
      [getBoolDay(day, 'workout', true), getBoolDay(day, 'eggs', true), getBoolDay(day, 'sleep', true)]
        .map(function (v, idx) {
          return ['💪', '🥚', '😴'][idx] + ' ' + ic(v);
        })
        .join('   ');

    var w = getStrDay(day, 'weight', '').trim();
    $('today-notes-preview').textContent = w ? 'Weight: ' + w + ' kg' : "Tap to add today's notes";

    refreshMarkDayButton(day);
  }

  function renderWarmupCooldown(panel, items, expandable) {
    panel.innerHTML = '';
    items.forEach(function (item, idx) {
      var card = document.createElement('div');
      card.className = 'card';
      var head = document.createElement('div');
      head.innerHTML =
        '<div style="display:flex;justify-content:space-between;gap:8px"><span style="font-size:15px;font-weight:600">' +
        item.name +
        '</span><span style="font-size:13px;color:var(--text-secondary);white-space:nowrap">' +
        item.duration +
        '</span></div>';
      card.appendChild(head);
      if (expandable) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ex-how';
        btn.textContent = 'Details ›';
        var exp = document.createElement('div');
        exp.className = 'ex-steps hidden';
        exp.textContent = item.detail;
        btn.addEventListener('click', function () {
          exp.classList.toggle('hidden');
        });
        card.appendChild(btn);
        card.appendChild(exp);
      } else {
        var body = document.createElement('div');
        body.className = 'ex-steps';
        body.style.marginTop = '8px';
        body.textContent = item.detail;
        card.appendChild(body);
      }
      panel.appendChild(card);
    });
  }

  function renderWorkout() {
    var day = clampDay(viewDay);
    $('workout-header-title').textContent = 'Workout · Day ' + day;
    var type = workoutType(day);
    var ph = phaseNum(day);
    $('workout-badges-row').innerHTML =
      '<span class="badge-type ' +
      badgeClass(type) +
      '">' +
      badgeLabel(type) +
      '</span> <span style="font-size:13px;color:var(--text-secondary);margin-left:8px">Phase ' +
      ph +
      '</span>';

    document.querySelectorAll('[data-wtab]').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-wtab') === workoutTab);
    });
    $('panel-warmup').classList.toggle('hidden', workoutTab !== 'warmup');
    $('panel-ex').classList.toggle('hidden', workoutTab !== 'ex');
    $('panel-cool').classList.toggle('hidden', workoutTab !== 'cool');

    renderWarmupCooldown($('panel-warmup'), D.warmUp, true);
    renderWarmupCooldown($('panel-cool'), D.coolDown, true);

    var exPanel = $('panel-ex');
    exPanel.innerHTML = '';
    if (type === 'REST') {
      var msg = document.createElement('div');
      msg.className = 'card';
      msg.innerHTML =
        '<p style="font-size:15px;font-weight:600;margin:0 0 8px">Recovery day</p><p style="font-size:13px;color:var(--text-secondary);white-space:pre-line;margin:0 0 12px">' +
        D.restMessage +
        '</p>';
      exPanel.appendChild(msg);
      D.restActivities.forEach(function (r) {
        var c = document.createElement('div');
        c.className = 'card';
        c.innerHTML =
          '<p style="font-size:15px;font-weight:600;margin:0">' +
          r.name +
          '</p><p style="font-size:13px;color:var(--text-secondary);margin:8px 0 0">' +
          r.duration +
          '</p><p style="font-size:13px;color:var(--text-secondary);margin:8px 0 0">' +
          r.detail +
          '</p>';
        exPanel.appendChild(c);
      });
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn-gold';
      btn.style.marginTop = '12px';
      btn.textContent = getBoolDay(day, 'workout', true) ? 'Rest day logged ✓' : 'Mark rest day complete';
      btn.disabled = getBoolDay(day, 'workout', true);
      btn.addEventListener('click', function () {
        setBoolDay(day, 'workout', true, false);
        renderWorkout();
        renderToday();
        syncChecksFromState(day);
      });
      exPanel.appendChild(btn);
      return;
    }

    var exercises = exercisesFor(day);
    var arr = getArrDay(day, 'exercises', exercises.length);

    var top = document.createElement('p');
    top.className = 'section-label';
    top.style.marginTop = '0';
    top.textContent = 'Phase ' + ph + ' · ' + badgeLabel(type);
    exPanel.appendChild(top);

    var prog = document.createElement('div');
    prog.className = 'card';
    var doneN = arr.filter(Boolean).length;
    prog.innerHTML =
      '<p style="margin:0 0 8px;font-size:13px;color:var(--text-secondary)">' +
      doneN +
      ' / ' +
      exercises.length +
      ' exercises complete</p><div class="progress-track"><div class="progress-fill" style="width:' +
      (doneN / exercises.length) * 100 +
      '%;background:' +
      (type === 'CHEST' ? 'var(--chest-color)' : type === 'BODY_CORE' ? 'var(--core-color)' : 'var(--fullbody-color)') +
      '"></div></div>';
    exPanel.appendChild(prog);

    exercises.forEach(function (ex, i) {
      var row = document.createElement('div');
      row.className = 'ex-card' + (arr[i] ? ' done' : '');
      row.innerHTML =
        '<div class="ex-num">' +
        (arr[i] ? '✓' : String(i + 1)) +
        '</div><div class="ex-body"><div class="ex-name">' +
        ex.name +
        '</div><div class="ex-meta">' +
        ex.meta +
        '</div><button type="button" class="ex-how" data-how="' +
        i +
        '">How to do it ›</button><div class="ex-steps how-panel hidden"><ol>' +
        ex.steps
          .map(function (s) {
            return '<li>' + s + '</li>';
          })
          .join('') +
        '</ol></div></div><button type="button" class="ex-toggle' +
        (arr[i] ? ' on' : '') +
        '" aria-label="Done">' +
        (arr[i] ? '✓' : '') +
        '</button>';

      var howBtn = row.querySelector('[data-how]');
      var howPanel = row.querySelector('.how-panel');
      howBtn.addEventListener('click', function () {
        howPanel.classList.toggle('hidden');
      });

      var toggle = row.querySelector('.ex-toggle');
      toggle.addEventListener('click', function () {
        arr[i] = !arr[i];
        setArrDay(day, 'exercises', arr, false);
        var allDone = arr.every(Boolean);
        if (allDone) setBoolDay(day, 'workout', true, true);
        renderWorkout();
        renderToday();
        syncChecksFromState(day);
      });

      exPanel.appendChild(row);
    });
  }

  function renderDiet() {
    var day = clampDay(viewDay);
    $('diet-header-title').textContent = 'Diet · Day ' + day;
    var prot = estimatedProtein(day);
    $('diet-pro-main').textContent = prot + 'g / 100g protein';
    $('diet-pro-bar').style.width = Math.min(100, (prot / D.proteinGoalMid) * 100) + '%';
    var meals = getArrDay(day, 'meals', 8);
    $('diet-meals-count').textContent = meals.filter(Boolean).length + ' of 8 meals eaten';

    var list = $('diet-meals-list');
    list.innerHTML = '';
    D.meals.forEach(function (m, i) {
      var eaten = meals[i];
      var card = document.createElement('div');
      card.className = 'meal-card' + (eaten ? ' eaten' : '');
      card.innerHTML =
        '<div class="meal-bar"></div><div class="meal-info"><div class="meal-time">' +
        m.time +
        '</div><div class="meal-name">' +
        m.name +
        '</div><div class="meal-food">' +
        m.food +
        '</div></div><div class="meal-pro">' +
        m.protein +
        '</div><div class="meal-check"></div>';
      card.addEventListener('click', function () {
        meals[i] = !meals[i];
        setArrDay(day, 'meals', meals, false);
        if (meals.every(Boolean)) setBoolDay(day, 'diet', true, true);
        else setBoolDay(day, 'diet', false, true);
        renderDiet();
        renderToday();
        syncChecksFromState(day);
      });
      list.appendChild(card);
    });

    var ul = $('diet-tips-ul');
    ul.innerHTML = '';
    D.dietTips.forEach(function (t) {
      var li = document.createElement('li');
      li.textContent = t;
      ul.appendChild(li);
    });
  }

  function renderWater() {
    var day = clampDay(viewDay);
    var wg = waterGlasses(day);
    $('water-liters').textContent = (wg * 0.3).toFixed(1) + 'L';
    $('water-bar').style.width = (wg / 8) * 100 + '%';
    $('water-status').textContent = D.hydrationMessage(wg);

    $('water-tip').textContent = wg >= 8 ? D.waterGlassTips[7] : D.waterGlassTips[wg] || '';

    var grid = $('water-glasses');
    grid.innerHTML = '';
    for (var j = 0; j < 8; j++) {
      (function (ji) {
        var g2 = document.createElement('div');
        g2.className = 'w-glass' + (ji < wg ? ' full' : '');
        g2.textContent = '💧';
        g2.addEventListener('click', function (ev) {
          var targetLevel = ji + 1;
          var cur = waterGlasses(day);
          var newLevel = cur === targetLevel ? ji : targetLevel;
          setNumDay(day, 'water', newLevel, true);
          if (newLevel === 8 && cur < 8) showToast('Hydration goal reached!');
          var rip = document.createElement('span');
          rip.className = 'ripple';
          rip.style.left = '35%';
          rip.style.top = '35%';
          rip.style.width = '24px';
          rip.style.height = '24px';
          ev.currentTarget.appendChild(rip);
          setTimeout(function () {
            rip.remove();
          }, 500);
          renderWater();
          renderToday();
          syncChecksFromState(day);
        });
        grid.appendChild(g2);
      })(j);
    }

    var rem = $('water-reminders');
    rem.innerHTML = '';
    D.waterReminders.forEach(function (r, idx) {
      var row = document.createElement('div');
      row.className = 'reminder-row';
      row.innerHTML =
        '<strong>Glass ' +
        r.glass +
        '</strong> · ' +
        r.time +
        ' — ' +
        r.purpose +
        (wg >= r.glass ? ' ✓' : '');
      rem.appendChild(row);
    });
  }

  function renderProgress() {
    $('cal-streak').textContent = String(streakDone());
    $('cal-done').textContent = String(countDoneDays());
    $('cal-perfect').textContent = String(countPerfectDays());

    var grid = $('cal-grid');
    grid.innerHTML = '';
    var pd = programDayNumber();
    var todayNum = pd > TOTAL ? TOTAL : pd;

    for (var di = 0; di < 30; di++) {
      var dayNum = di + 1;
      var cell = document.createElement('div');
      cell.className = 'cal-cell';
      cell.textContent = String(dayNum);
      var future = dayNum > todayNum;
      var done = getBoolDay(dayNum, 'done', true);
      cell.classList.toggle('future', future);
      if (!future && !done) cell.classList.add('past-incomplete');
      if (done) cell.classList.add('done');
      if (dayNum === todayNum && !future) cell.classList.add('today');

      var mark = document.createElement('span');
      mark.className = 'mark';
      if (!future) mark.textContent = done ? '✓' : '✗';
      cell.appendChild(mark);

      cell.addEventListener(
        'click',
        function (dn) {
          return function () {
            viewDay = dn;
            navigateTo('screen-today');
          };
        }(dayNum)
      );
      grid.appendChild(cell);
    }
    var blank = document.createElement('div');
    blank.style.visibility = 'hidden';
    grid.appendChild(blank);

    var mile = $('milestones');
    var curDay = Math.min(programDayNumber(), TOTAL);
    mile.innerHTML = '';
    var track = document.createElement('div');
    track.className = 'timeline-track';
    mile.appendChild(track);
    D.milestones.forEach(function (m, idx, arr) {
      var pt = document.createElement('div');
      pt.className = 'tl-point';
      var passed = curDay >= m.day;
      var next = arr[idx + 1];
      var currentRange = passed && (!next || curDay < next.day);
      pt.classList.toggle('passed', passed);
      pt.classList.toggle('current', currentRange);
      pt.innerHTML =
        '<div class="tl-dot"></div><div class="tl-label">Day ' +
        m.day +
        '</div><div class="tl-label" style="margin-top:4px">' +
        m.label +
        '</div>';
      track.appendChild(pt);
    });
  }

  var CHECK_DEF = [
    { key: 'workout', label: 'Workout done at 9 PM', emoji: '💪', ls: 'workout', toggle: true },
    { key: 'eggs', label: 'Ate 2 eggs today', emoji: '🥚', ls: 'eggs', toggle: true },
    { key: 'nomealskip', label: 'No meal skipped', emoji: '🍽️', ls: 'nomealskip', toggle: true },
    { key: 'water', label: 'Water goal reached (2.5L)', emoji: '💧', ls: 'watergoal', toggle: true },
    { key: 'sleep', label: 'Slept 7–8 hours last night', emoji: '😴', ls: 'sleep', toggle: true },
    { key: 'diet', label: 'Diet on track (90g+ protein)', emoji: '✅', ls: 'diet', toggle: true }
  ];

  function syncChecksFromState(day) {
    var prot = estimatedProtein(day);
    if (prot >= 90) setBoolDay(day, 'diet', true, true);

    var meals = getArrDay(day, 'meals', 8);
    if (meals.every(Boolean)) setBoolDay(day, 'nomealskip', true, true);

    if (workoutCompleteLogic(day)) setBoolDay(day, 'workout', true, true);

    if ($('screen-checks') && $('screen-checks').classList.contains('active')) renderChecks();
  }

  /** Confetti/banner only once per day key per page load; never repeat after day_N_perfect was already true. */
  var perfectFxShownForKey = {};
  var perfectBannerTimer = null;

  function computeAllChecksOn(day) {
    var waterOk = waterGlasses(day) >= 8;
    var protOk = estimatedProtein(day) >= 90;
    var dietOk = protOk || getBoolDay(day, 'diet', true);
    return (
      getBoolDay(day, 'workout', true) &&
      getBoolDay(day, 'eggs', true) &&
      getBoolDay(day, 'nomealskip', true) &&
      waterOk &&
      getBoolDay(day, 'sleep', true) &&
      dietOk
    );
  }

  function persistAndMaybeCelebratePerfect(day) {
    if (!computeAllChecksOn(day)) return;

    var pk = dayKey(day, 'perfect');
    var wasPerfectBefore = lsGet(pk, '') === 'true';
    if (!wasPerfectBefore) lsSet(pk, 'true', true);

    var onChecks = $('screen-checks') && $('screen-checks').classList.contains('active');
    if (!onChecks || wasPerfectBefore) return;

    if (perfectFxShownForKey[pk]) return;
    perfectFxShownForKey[pk] = true;

    fireConfetti();
    showToast('Perfect day!');
    var banner = $('perfect-banner');
    if (!banner) return;
    if (perfectBannerTimer) clearTimeout(perfectBannerTimer);
    banner.classList.add('show');
    perfectBannerTimer = setTimeout(function () {
      banner.classList.remove('show');
      perfectBannerTimer = null;
    }, 3500);
  }

  function renderChecks() {
    var day = clampDay(viewDay);
    $('checks-header-title').textContent = 'Daily Checks · Day ' + day;
    var list = $('checks-list');
    list.innerHTML = '';

    var waterOk = waterGlasses(day) >= 8;
    var protOk = estimatedProtein(day) >= 90;

    CHECK_DEF.forEach(function (def, idx) {
      var on = false;
      if (def.ls === 'watergoal') on = waterOk;
      else if (def.ls === 'diet') on = protOk || getBoolDay(day, 'diet', true);
      else if (def.ls === 'nomealskip') on = getBoolDay(day, 'nomealskip', true);
      else if (def.ls === 'workout') on = getBoolDay(day, 'workout', true);
      else if (def.ls === 'eggs') on = getBoolDay(day, 'eggs', true);
      else if (def.ls === 'sleep') on = getBoolDay(day, 'sleep', true);

      var card = document.createElement('div');
      card.className = 'check-card' + (on ? ' on' : '');
      card.innerHTML =
        '<div class="check-left"><span class="check-emoji">' +
        def.emoji +
        '</span><span class="check-label">' +
        def.label +
        '</span></div><button type="button" class="toggle-ios ' +
        (on ? 'on-success' : 'off') +
        '" data-check="' +
        idx +
        '" aria-label="' +
        def.label +
        '"><span class="thumb"></span></button>';

      var btn = card.querySelector('.toggle-ios');
      btn.addEventListener('click', function () {
        if (def.ls === 'watergoal') {
          if (!waterOk) setNumDay(day, 'water', 8, false);
          else setNumDay(day, 'water', 0, false);
        } else if (def.ls === 'diet') {
          setBoolDay(day, 'diet', !getBoolDay(day, 'diet', true));
        } else if (def.ls === 'nomealskip') {
          setBoolDay(day, 'nomealskip', !getBoolDay(day, 'nomealskip', true));
        } else if (def.ls === 'workout') {
          setBoolDay(day, 'workout', !getBoolDay(day, 'workout', true));
        } else if (def.ls === 'eggs') {
          setBoolDay(day, 'eggs', !getBoolDay(day, 'eggs', true));
        } else if (def.ls === 'sleep') {
          setBoolDay(day, 'sleep', !getBoolDay(day, 'sleep', true));
        }
        showToast('Saved');
        renderChecks();
        renderToday();
      });

      list.appendChild(card);
    });

    persistAndMaybeCelebratePerfect(day);
  }

  function hueEnergy(v) {
    var x = (v - 1) / 9;
    var h = Math.round(120 * x);
    return 'hsl(' + h + ',70%,45%)';
  }

  function renderNotes() {
    var day = clampDay(viewDay);
    $('notes-header-title').textContent = 'Notes · Day ' + day;
    $('note-weight').value = getStrDay(day, 'weight', '');
    $('note-pushups').value = getStrDay(day, 'pushups', '');
    var en = getNumDay(day, 'energy', 5);
    $('note-energy').value = String(en);
    $('energy-badge').textContent = 'Energy: ' + en;
    $('note-energy').style.background =
      'linear-gradient(90deg,' + hueEnergy(1) + ' 0%,' + hueEnergy(10) + ' 100%)';

    $('note-r1').value = getStrDay(day, 'notes', '');
    $('note-r2').value = getStrDay(day, 'notes_well', '');
    $('note-r3').value = getStrDay(day, 'notes_intent', '');
  }

  function initNotesDelegation() {
    var panel = $('screen-notes');
    if (!panel || panel.dataset.bound === '1') return;
    panel.dataset.bound = '1';
    panel.addEventListener('input', function (e) {
      var day = viewDay;
      var t = e.target;
      var id = t.id;
      if (id === 'note-weight') setStrDay(day, 'weight', t.value, false);
      else if (id === 'note-pushups') setStrDay(day, 'pushups', t.value, false);
      else if (id === 'note-energy') {
        var n = parseInt(t.value, 10);
        setNumDay(day, 'energy', isNaN(n) ? 5 : n, false);
        $('energy-badge').textContent = 'Energy: ' + (isNaN(n) ? 5 : n);
        t.style.background =
          'linear-gradient(90deg,' + hueEnergy(1) + ' 0%,' + hueEnergy(10) + ' 100%)';
      } else if (id === 'note-r1') setStrDay(day, 'notes', t.value, false);
      else if (id === 'note-r2') setStrDay(day, 'notes_well', t.value, false);
      else if (id === 'note-r3') setStrDay(day, 'notes_intent', t.value, false);
    });
  }

  function renderSettingsStats() {
    $('set-name').value = lsGet('user_name', 'Ritesh');
    syncToggle($('tog-notif-workout'), lsGet('notif_workout', 'false') === 'true');
    syncToggle($('tog-notif-dinner'), lsGet('notif_dinner', 'false') === 'true');
    syncToggle($('tog-notif-snack'), lsGet('notif_sleep_snack', 'false') === 'true');
    $('st-total-workouts').textContent = String(totalWorkoutsLogged());
    $('st-perfect').textContent = String(countPerfectDays());
    $('st-streak').textContent = String(streakDone());
    $('st-best').textContent = String(bestStreakEver());
  }

  function syncToggle(btn, on) {
    btn.classList.remove('off', 'on-gold');
    btn.classList.add(on ? 'on-gold' : 'off');
  }

  function wireToggle(btn, key) {
    btn.addEventListener('click', function () {
      var on = btn.classList.contains('off');
      if (on && 'Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
      lsSet(key, on ? 'true' : 'false');
      syncToggle(btn, on);
    });
  }

  function maybeNotify() {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    var now = new Date();
    var h = now.getHours();
    var m = now.getMinutes();
    var key = now.toDateString();
    if (lsGet('notif_workout', '') === 'true' && h === 21 && m === 0 && lsGet('_n_w_' + key, '') !== '1') {
      lsSet('_n_w_' + key, '1', true);
      new Notification('Workout time', { body: '9:00 PM session — go train.' });
    }
    if (lsGet('notif_dinner', '') === 'true' && h === 22 && m === 30 && lsGet('_n_d_' + key, '') !== '1') {
      lsSet('_n_d_' + key, '1', true);
      new Notification('Dinner', { body: 'Time for your dinner meal.' });
    }
    if (lsGet('notif_sleep_snack', '') === 'true' && h === 23 && m === 30 && lsGet('_n_s_' + key, '') !== '1') {
      lsSet('_n_s_' + key, '1', true);
      new Notification('Sleep snack', { body: 'Slow protein before sleep.' });
    }
  }

  function fireConfetti() {
    var c = $('confetti-canvas');
    if (!c) return;
    var rect = c.getBoundingClientRect();
    c.width = rect.width || 390;
    c.height = rect.height || window.innerHeight;
    var ctx = c.getContext('2d');
    var colors = ['#D4A017', '#2E7D52', '#1A6BB5', '#D94F4F', '#1A5C9E'];
    var parts = [];
    for (var i = 0; i < 50; i++) {
      parts.push({
        x: Math.random() * c.width,
        y: Math.random() * -c.height * 0.3,
        vx: (Math.random() - 0.5) * 3,
        vy: Math.random() * 2 + 2,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.2,
        c: colors[i % colors.length],
        life: 1
      });
    }
    var t0 = Date.now();
    function tick() {
      var elapsed = Date.now() - t0;
      ctx.clearRect(0, 0, c.width, c.height);
      parts.forEach(function (p) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.08;
        p.rot += p.vr;
        p.life = Math.max(0, 1 - elapsed / 3000);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.c;
        ctx.globalAlpha = p.life;
        ctx.fillRect(-4, -4, 8, 8);
        ctx.restore();
      });
      if (elapsed < 3000) requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, c.width, c.height);
    }
    tick();
  }

  function exportData() {
    var lines = ['30-Day Body Transform — Export', 'Start: ' + programStartDateStr(), ''];
    for (var d = 1; d <= TOTAL; d++) {
      lines.push('--- Day ' + d + ' (' + formatCalendarDate(d) + ') ---');
      lines.push('Done: ' + lsGet(dayKey(d, 'done'), 'false'));
      lines.push('Workout: ' + lsGet(dayKey(d, 'workout'), 'false'));
      lines.push('Diet flag: ' + lsGet(dayKey(d, 'diet'), 'false'));
      lines.push('Water glasses: ' + lsGet(dayKey(d, 'water'), '0'));
      lines.push('Weight kg: ' + lsGet(dayKey(d, 'weight'), ''));
      lines.push('Notes: ' + lsGet(dayKey(d, 'notes'), ''));
      lines.push('');
    }
    var blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'transform-progress.txt';
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('Saved');
  }

  function clearAllData() {
    localStorage.clear();
    location.reload();
  }

  function initSwipeToday() {
    var el = $('screen-today');
    var sx = 0;
    var sy = 0;
    el.addEventListener(
      'touchstart',
      function (e) {
        sx = e.changedTouches[0].clientX;
        sy = e.changedTouches[0].clientY;
      },
      { passive: true }
    );
    el.addEventListener(
      'touchend',
      function (e) {
        var dx = e.changedTouches[0].clientX - sx;
        var dy = e.changedTouches[0].clientY - sy;
        if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;
        var prev = viewDay;
        if (dx < 0) viewDay = Math.min(TOTAL, viewDay + 1);
        else viewDay = Math.max(1, viewDay - 1);
        renderToday();
        if (viewDay !== prev) showToast('Day ' + viewDay);
      },
      { passive: true }
    );
  }

  function initDietTipsCollapsible() {
    var t = $('diet-tips-toggle');
    var body = $('diet-tips-body');
    var chev = $('diet-tips-chev');
    if (!t || !body || !chev || t.dataset.bound === '1') return;
    t.dataset.bound = '1';
    t.addEventListener('click', function () {
      body.classList.toggle('hidden');
      chev.textContent = body.classList.contains('hidden') ? '▼' : '▲';
    });
  }

  function initNav() {
    initDietTipsCollapsible();

    document.querySelectorAll('[data-back]').forEach(function (b) {
      b.addEventListener('click', goBack);
    });
    document.querySelectorAll('.tab-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        switchTab(b.getAttribute('data-tab'));
      });
    });
    $('btn-settings-gear').addEventListener('click', openSettings);
    $('sheet-overlay').addEventListener('click', closeSettings);
    $('btn-close-settings').addEventListener('click', closeSettings);

    $('btn-open-day').addEventListener('click', function () {
      viewDay = Math.min(Math.max(programDayNumber(), 1), TOTAL);
      navigateTo('screen-today');
    });

    $('qc-workout').addEventListener('click', function () {
      viewDay = Math.min(Math.max(programDayNumber(), 1), TOTAL);
      workoutTab = 'ex';
      navigateTo('screen-workout');
    });
    $('qc-water').addEventListener('click', function () {
      viewDay = Math.min(Math.max(programDayNumber(), 1), TOTAL);
      navigateTo('screen-water');
    });
    $('qc-diet').addEventListener('click', function () {
      viewDay = Math.min(Math.max(programDayNumber(), 1), TOTAL);
      navigateTo('screen-diet');
    });
    $('qc-cal').addEventListener('click', function () {
      navigateTo('screen-progress');
    });

    $('today-card-workout').addEventListener('click', function () {
      workoutTab = 'ex';
      navigateTo('screen-workout');
    });
    $('today-card-diet').addEventListener('click', function () {
      navigateTo('screen-diet');
    });
    $('today-card-water').addEventListener('click', function () {
      navigateTo('screen-water');
    });
    $('today-card-checks').addEventListener('click', function () {
      navigateTo('screen-checks');
    });
    $('today-card-notes').addEventListener('click', function () {
      navigateTo('screen-notes');
    });

    $('btn-mark-day-complete').addEventListener('click', function () {
      var day = viewDay;
      if (!workoutCompleteLogic(day) || !dietCompleteLogic(day)) return;
      setBoolDay(day, 'done', true, true);
      fireConfetti();
      showToast('Day complete!');
      refreshMarkDayButton(day);
      renderHome();
      renderProgress();
    });

    document.querySelectorAll('[data-wtab]').forEach(function (b) {
      b.addEventListener('click', function () {
        workoutTab = b.getAttribute('data-wtab');
        renderWorkout();
      });
    });

    $('set-name').addEventListener('input', function () {
      lsSet('user_name', $('set-name').value || 'Ritesh');
    });

    wireToggle($('tog-notif-workout'), 'notif_workout');
    wireToggle($('tog-notif-dinner'), 'notif_dinner');
    wireToggle($('tog-notif-snack'), 'notif_sleep_snack');

    $('btn-export').addEventListener('click', exportData);

    $('btn-reset').addEventListener('click', function () {
      if (!resetConfirm) {
        resetConfirm = true;
        $('btn-reset').textContent = 'Tap again to confirm reset';
        setTimeout(function () {
          resetConfirm = false;
          $('btn-reset').textContent = 'Reset All Data';
        }, 4000);
      } else clearAllData();
    });

    $('completion-restart').addEventListener('click', clearAllData);

    $('pwa-got-it').addEventListener('click', function () {
      lsSet('pwa_prompt_shown', 'true', true);
      $('pwa-install-banner').classList.remove('show');
    });
  }

  function initCompletionGate() {
    if (programDayNumber() > TOTAL) {
      screenStack = ['screen-completion'];
      document.querySelectorAll('.screen').forEach(function (s) {
        s.classList.remove('active', 'slide-in', 'slide-back');
        s.style.display = s.id === 'screen-completion' ? 'block' : 'none';
      });
      $('screen-completion').classList.add('active');
      document.body.classList.add('hide-tabs');
      renderCompletion();
    }
  }

  function initPwaBanner() {
    var ua = navigator.userAgent || '';
    var iOS = /iPhone|iPad|iPod/.test(ua);
    var safari = /Safari/i.test(ua) && !/CriOS|FxiOS/.test(ua);
    if (iOS && safari && lsGet('pwa_prompt_shown', '') !== 'true') {
      setTimeout(function () {
        $('pwa-install-banner').classList.add('show');
      }, 3000);
    }
  }

  function registerSW() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('./sw.js').catch(function () {});
      });
    }
  }

  window.addEventListener('online', updateOfflinePills);
  window.addEventListener('offline', updateOfflinePills);

  function init() {
    var pb = $('perfect-banner');
    if (pb) {
      pb.classList.remove('show');
    }
    if (perfectBannerTimer) {
      clearTimeout(perfectBannerTimer);
      perfectBannerTimer = null;
    }

    ensureProgramStart();

    if (!lsGet('user_name', '')) lsSet('user_name', 'Ritesh', true);

    initCompletionGate();
    initNav();
    initSwipeToday();
    initNotesDelegation();
    registerSW();
    initPwaBanner();

    notifTick = setInterval(maybeNotify, 30000);
    maybeNotify();

    updateOfflinePills();

    if (programDayNumber() > TOTAL) return;

    renderHome();
    showScreen('screen-home', null);
    syncTabBarToCurrentScreen();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
