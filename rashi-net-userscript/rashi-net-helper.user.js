// ==UserScript==
// @name         עובדים-נט 21 - עוזר דיווח שעות ונסיעות
// @namespace    http://tampermonkey.net/
// @version      21.0
// @description  מילוי שעות לפי מערכת שעות שבועית, ייבוא נסיעות עם תצוגה מקדימה וזיהוי כפילויות, בדיקות תקינות לפני שמירה, סיכום וייצוא
// @author       Almog (A.T)
// @match        *://net.rashi.org.il/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @connect      docs.google.com
// @connect      googleusercontent.com
// @connect      script.google.com
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';
    if (window.__ATN_V21__) return;
    window.__ATN_V21__ = true;

    const VERSION = '21.0';

    // ==========================================
    // 🎯 סלקטורים של האתר - המקום היחיד לעדכן כשהאתר משתנה
    // ==========================================
    const SEL = {
        table: '#tableDyn1',
        rows: '#tableDyn1 tbody tr',
        assignments: '#assignments',
        taskInput: 'td:nth-of-type(15) input[type="text"]',
        addBtn: 'td:nth-of-type(18) img',
        deleteBox: 'td:nth-of-type(19) input',
        timeInputs: 'input[type="text"][maxlength="2"]',
        taskNameFields: 'input[id^="assignment_name_"]',
        units: id => `#units_${id}`,
        remarkOpen: id => [`#detailsCol_CMMPAN_${id}_1 img`, `#null_${id}divPos`],
        remarkText: id => `#work_comments_${id}`,
        remarkClose: id => `#null_${id}_1div`,
        workdayText: 'יום חול',
        hoursText: 'שעות',
        travelText: 'נסיעות',
    };

    const WEEKDAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

    // ==========================================
    // ⚙️ הגדרות (אובייקט אחד, כולל העברה מגרסה 20)
    // ==========================================
    const DEFAULTS = {
        csvLink: '',
        colDate: 'A', colPrice: 'B', colRemark: 'I',
        dateOrder: 'DMY',
        taskHours: '19265997',
        taskTravel: '19653876',
        schedule: Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map(d => [d, { on: true, start: '08:00', end: '17:00' }])),
        skipFuture: true,
        excludedDates: '',
        panelPos: null,
        panelCollapsed: false,
    };

    function loadSettings() {
        let s = GM_getValue('SETTINGS_V21', null);
        if (!s) {
            s = JSON.parse(JSON.stringify(DEFAULTS));
            s.csvLink = GM_getValue('USER_CSV_LINK', '');
            const start = GM_getValue('USER_START_TIME', '08:00');
            const end = GM_getValue('USER_END_TIME', '17:00');
            Object.values(s.schedule).forEach(d => { d.start = start; d.end = end; });
            GM_setValue('SETTINGS_V21', s);
        }
        return Object.assign(JSON.parse(JSON.stringify(DEFAULTS)), s);
    }
    let settings = loadSettings();
    const saveSettings = () => GM_setValue('SETTINGS_V21', settings);

    // ==========================================
    // 🧰 כלי עזר
    // ==========================================
    const sleep = ms => new Promise(res => setTimeout(res, ms));
    const pad = n => String(n).padStart(2, '0');
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const fmtMin = m => `${Math.floor(m / 60)}:${pad(m % 60)}`;
    const colToIndex = letters => letters.trim().toUpperCase().split('').reduce((n, c) => n * 26 + (c.charCodeAt(0) - 64), 0) - 1;

    async function waitFor(fn, timeout = 2000, interval = 50) {
        const end = Date.now() + timeout;
        while (Date.now() < end) {
            const r = fn();
            if (r) return r;
            await sleep(interval);
        }
        return null;
    }

    const dom = {
        trigger: el => {
            if (!el) return;
            ['focus', 'input', 'change', 'blur'].forEach(n => el.dispatchEvent(new Event(n, { bubbles: true })));
        },
        click: el => {
            if (!el) return;
            el.scrollIntoView({ block: 'nearest' });
            el.focus();
            ['mousedown', 'mouseup', 'click'].forEach(n => el.dispatchEvent(new MouseEvent(n, { bubbles: true })));
        },
        setAssignment: id => {
            const a = document.querySelector(SEL.assignments);
            if (a) { a.value = id; dom.trigger(a); }
        },
    };

    // --- פרסור CSV מלא (כולל שדות מרובי שורות במרכאות) ---
    function parseCSV(text) {
        const rows = [];
        let row = [], cur = '', q = false;
        for (let i = 0; i < text.length; i++) {
            const c = text[i];
            if (q) {
                if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; }
                else if (c === '"') q = false;
                else cur += c;
            } else if (c === '"') q = true;
            else if (c === ',') { row.push(cur); cur = ''; }
            else if (c === '\n' || c === '\r') {
                if (c === '\r' && text[i + 1] === '\n') i++;
                row.push(cur); rows.push(row); row = []; cur = '';
            } else cur += c;
        }
        if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
        return rows.filter(r => r.some(v => v.trim() !== ''));
    }

    // "12.50" / "₪12,50" / "1,234.5" → מספר
    function parsePrice(raw) {
        let s = String(raw || '').replace(/[^\d.,-]/g, '');
        if (!s) return NaN;
        if (s.includes(',') && s.includes('.')) s = s.replace(/,/g, '');
        else if (/,\d{1,2}$/.test(s)) s = s.replace(',', '.');
        else s = s.replace(/,/g, '');
        return parseFloat(s);
    }

    // מחזיר {d, m} או null. תומך DD/MM[/YYYY], MM/DD, YYYY-MM-DD
    function parseDate(raw, order = 'DMY') {
        const s = String(raw || '').trim();
        let d, m;
        const iso = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
        if (iso) { m = +iso[2]; d = +iso[3]; }
        else {
            const p = s.match(/(\d{1,2})[\/.\-](\d{1,2})/);
            if (!p) return null;
            [d, m] = order === 'MDY' ? [+p[2], +p[1]] : [+p[1], +p[2]];
            if (m > 12 && d <= 12) [d, m] = [m, d];
        }
        if (m < 1 || m > 12 || d < 1 || d > 31) return null;
        return { d, m, key: `${pad(d)}/${pad(m)}` };
    }

    // שנה משוערת לחודש המוצג (תומך בצפייה בדצמבר מתוך ינואר וכו')
    function inferYear(month) {
        const now = new Date();
        const cm = now.getMonth() + 1;
        let y = now.getFullYear();
        if (month - cm > 6) y--; else if (cm - month > 6) y++;
        return y;
    }

    const excludedSet = () => new Set(settings.excludedDates.split(/[\s,;]+/).map(x => parseDate(x)).filter(Boolean).map(x => x.key));

    // ==========================================
    // 📋 מודל החודש: קיבוץ שורות הטבלה לפי תאריך
    // ==========================================
    function readTimes(row) {
        const t = Array.from(row.querySelectorAll(SEL.timeInputs));
        if (t.length < 4 || t[0].value.trim() === '' || t[2].value.trim() === '') return 0;
        const v = t.slice(0, 4).map(x => parseInt(x.value, 10) || 0);
        return Math.max(0, (v[2] * 60 + v[3]) - (v[0] * 60 + v[1]));
    }

    function buildMonth() {
        const days = new Map();
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const excluded = excludedSet();
        let cur = null;

        for (const row of document.querySelectorAll(SEL.rows)) {
            const text = row.innerText;
            // שורות-משנה שנוספו מכילות לפעמים רק שדות קלט בלי טקסט - לא לדלג עליהן
            if (!text.trim() && !row.querySelector('input')) continue;
            const m = text.match(/(\d{1,2})\/(\d{1,2})/);
            if (m) {
                const key = `${pad(m[1])}/${pad(m[2])}`;
                if (!days.has(key)) {
                    const d = +m[1], mo = +m[2];
                    const date = new Date(inferYear(mo), mo - 1, d);
                    days.set(key, {
                        key, d, mo, date, weekday: date.getDay(),
                        isFuture: date > today, isExcluded: excluded.has(key),
                        isWorkday: false, mainRow: row, rows: [],
                        minutes: 0, travels: [], otherTasks: [],
                    });
                }
                cur = days.get(key);
            }
            if (!cur) continue;
            cur.rows.push(row);
            if (text.includes(SEL.workdayText)) cur.isWorkday = true;

            const taskInput = row.querySelector(SEL.taskInput);
            const taskText = taskInput ? taskInput.value : text;
            const isTravel = taskText.includes(SEL.travelText) || taskText.includes(settings.taskTravel);
            const isHours = taskText.includes(SEL.hoursText) || taskText.includes(settings.taskHours);

            if (isTravel) {
                const u = row.querySelector('input[id^="units_"]');
                const cost = u ? parsePrice(u.value) : NaN;
                if (cost > 0) cur.travels.push(cost);
            }
            if (isHours) cur.minutes += readTimes(row);
            if (!isTravel && !isHours && taskInput && taskInput.value.trim()) cur.otherTasks.push(taskInput.value.trim());
        }

        const list = [...days.values()];
        const monthCounts = {};
        list.forEach(x => { monthCounts[x.mo] = (monthCounts[x.mo] || 0) + 1; });
        const month = +Object.keys(monthCounts).sort((a, b) => monthCounts[b] - monthCounts[a])[0] || null;
        return { days, list, month };
    }

    function analyze(model) {
        const relevant = model.list.filter(x => x.mo === model.month);
        const workdays = relevant.filter(x => x.isWorkday);
        const pastWorkdays = workdays.filter(x => !x.isFuture);
        const totalMin = relevant.reduce((s, x) => s + x.minutes, 0);
        const travelSum = relevant.reduce((s, x) => s + x.travels.reduce((a, b) => a + b, 0), 0);
        const travelCount = relevant.reduce((s, x) => s + x.travels.length, 0);
        const reported = relevant.filter(x => x.minutes > 0);
        return {
            relevant, workdays, pastWorkdays, totalMin, travelSum, travelCount, reported,
            missing: pastWorkdays.filter(x => x.minutes === 0 && !x.otherTasks.length && !x.isExcluded && settings.schedule[x.weekday]?.on),
            travelNoHours: relevant.filter(x => x.travels.length && x.minutes === 0),
            longDays: relevant.filter(x => x.minutes > 12 * 60),
            futureReported: relevant.filter(x => x.isFuture && x.minutes > 0),
        };
    }

    // ==========================================
    // 🎨 UI: סגנונות, טוסט, פרוגרס, מודאל
    // ==========================================
    const STYLE = `
    .atn, .atn * { box-sizing:border-box; font-family:'Segoe UI', Tahoma, sans-serif; direction:rtl; }
    .atn-overlay { position:fixed; inset:0; background:rgba(0,0,0,.55); z-index:2147483646; display:flex; justify-content:center; align-items:center; backdrop-filter:blur(4px); }
    .atn-box { background:#fff; border-radius:18px; padding:26px; box-shadow:0 15px 40px rgba(0,0,0,.35); max-height:90vh; overflow:auto; width:520px; max-width:95vw; }
    .atn-box h2 { margin:0 0 14px; color:#004d00; font-size:22px; border-bottom:2px solid #eafaf1; padding-bottom:12px; }
    .atn-actions { display:flex; gap:10px; justify-content:flex-end; margin-top:18px; flex-wrap:wrap; }
    .atn-btn { padding:10px 18px; border:none; border-radius:9px; cursor:pointer; font-weight:bold; font-size:14px; transition:transform .15s; }
    .atn-btn:hover { transform:translateY(-1px); }
    .atn-btn:disabled { opacity:.5; cursor:not-allowed; transform:none; }
    .atn-primary { background:linear-gradient(135deg,#00a650,#008a42); color:#fff; }
    .atn-secondary { background:#f1f3f5; color:#333; }
    .atn-danger { background:#fff; color:#d32f2f; border:1px solid #f5c6c6; }
    .atn-table { width:100%; border-collapse:collapse; font-size:13.5px; }
    .atn-table th { background:#eafaf1; color:#004d00; position:sticky; top:0; }
    .atn-table th, .atn-table td { padding:6px 8px; border-bottom:1px solid #eee; text-align:right; }
    .atn-table tr.atn-off td { color:#aaa; }
    .atn-scroll { max-height:50vh; overflow:auto; border:1px solid #eee; border-radius:10px; }
    .atn-field { margin-bottom:12px; }
    .atn-field label { display:block; font-weight:bold; color:#555; margin-bottom:4px; font-size:13.5px; }
    .atn-field input[type=text], .atn-field select, .atn-field textarea { width:100%; padding:8px; border:1px solid #ccc; border-radius:6px; }
    .atn-row { display:flex; gap:10px; }
    .atn-row > * { flex:1; }
    .atn-hint { font-size:12px; color:#888; margin-top:3px; line-height:1.5; }
    .atn-cards { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:14px; }
    .atn-card { background:#f8f9fa; border:1px solid #eee; border-radius:14px; padding:14px 8px; text-align:center; cursor:pointer; transition:all .2s; }
    .atn-card:hover { transform:translateY(-3px); box-shadow:0 6px 14px rgba(0,0,0,.08); }
    .atn-card b { display:block; font-size:24px; color:#004d00; }
    .atn-card span { font-size:13px; color:#7f8c8d; font-weight:bold; }
    .atn-card.green { background:#eafaf1; border-color:#2ecc71; }
    .atn-card.warn { background:#fff8e6; border-color:#f39c12; }
    .atn-alert { padding:9px 12px; border-radius:9px; margin-bottom:8px; font-size:13.5px; cursor:pointer; }
    .atn-alert.warn { background:#fff8e6; color:#8a5a00; }
    .atn-alert.err { background:#fdecea; color:#a32020; }
    .atn-alert.ok { background:#eafaf1; color:#006630; cursor:default; }
    #atn-panel { position:fixed; bottom:20px; right:20px; z-index:2147483645; background:rgba(255,255,255,.96); padding:12px 16px 16px; border-radius:16px; box-shadow:0 10px 30px rgba(0,0,0,.15); border:1px solid #e0e0e0; min-width:230px; backdrop-filter:blur(10px); }
    #atn-panel .atn-head { display:flex; align-items:center; justify-content:space-between; color:#004d00; font-size:15px; cursor:grab; user-select:none; padding-bottom:8px; border-bottom:2px solid #eafaf1; margin-bottom:10px; gap:8px; }
    #atn-panel .atn-head button { background:none; border:none; cursor:pointer; font-size:16px; color:#004d00; }
    #atn-panel.collapsed .atn-body { display:none; }
    #atn-panel.collapsed .atn-head { margin-bottom:0; border-bottom:none; padding-bottom:0; }
    #atn-panel .atn-body { display:flex; flex-direction:column; gap:8px; }
    #atn-panel .atn-body .atn-btn { display:flex; justify-content:space-between; align-items:center; font-size:14px; }
    #atn-panel .atn-badge { font-size:12px; padding:5px 8px; border-radius:8px; text-align:center; }
    #atn-panel kbd { font-size:10px; opacity:.7; font-family:monospace; }
    .atn-toast { position:fixed; top:20px; left:50%; transform:translate(-50%,-20px); opacity:0; color:#fff; padding:13px 26px; border-radius:12px; z-index:2147483647; font-size:15px; font-weight:bold; box-shadow:0 8px 20px rgba(0,0,0,.15); transition:all .35s; text-align:center; max-width:90vw; }
    `;

    function ensureStyle() {
        if (document.getElementById('atn-style')) return;
        const st = document.createElement('style');
        st.id = 'atn-style';
        st.textContent = STYLE;
        document.head.appendChild(st);
    }

    const ui = {
        toast(msg, type = 'success', ms = 4000) {
            const colors = { success: '#00a650', warning: '#e08e0b', error: '#d32f2f', info: '#2193b0' };
            const t = document.createElement('div');
            t.className = 'atn atn-toast';
            t.style.background = colors[type] || colors.success;
            t.innerHTML = msg;
            document.body.appendChild(t);
            requestAnimationFrame(() => { t.style.transform = 'translate(-50%,0)'; t.style.opacity = '1'; });
            setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 400); }, ms);
        },
        progress(cur, total, msg) {
            let o = document.getElementById('atn-progress');
            if (!o) {
                o = document.createElement('div');
                o.id = 'atn-progress';
                o.className = 'atn atn-overlay';
                o.style.background = 'rgba(255,255,255,.75)';
                o.innerHTML = `<div class="atn-box" style="width:380px;text-align:center">
                    <h2 class="atn-p-msg" style="border:none"></h2>
                    <div style="height:14px;background:#e9ecef;border-radius:10px;overflow:hidden"><div class="atn-p-bar" style="height:100%;width:0;background:linear-gradient(90deg,#00a650,#2ecc71);transition:width .3s"></div></div>
                    <div class="atn-p-text" style="margin-top:12px;font-weight:bold;color:#555"></div></div>`;
                document.body.appendChild(o);
            }
            const pct = total > 0 ? Math.round(cur / total * 100) : 100;
            o.querySelector('.atn-p-msg').textContent = msg;
            o.querySelector('.atn-p-bar').style.width = pct + '%';
            o.querySelector('.atn-p-text').textContent = `${cur} מתוך ${total} (${pct}%)`;
            if (cur >= total) setTimeout(() => o.remove(), 500);
        },
        modal({ title, body, actions = [], width }) {
            const o = document.createElement('div');
            o.className = 'atn atn-overlay';
            o.innerHTML = `<div class="atn-box"${width ? ` style="width:${width}px"` : ''}><h2>${title}</h2><div class="atn-content"></div><div class="atn-actions"></div></div>`;
            const content = o.querySelector('.atn-content');
            if (typeof body === 'string') content.innerHTML = body; else content.appendChild(body);
            const close = () => { o.remove(); document.removeEventListener('keydown', onKey); };
            const onKey = e => { if (e.key === 'Escape') close(); };
            document.addEventListener('keydown', onKey);
            o.addEventListener('mousedown', e => { if (e.target === o) close(); });
            actions.forEach(a => {
                const b = document.createElement('button');
                b.className = `atn-btn atn-${a.kind || 'secondary'}`;
                b.innerHTML = a.label;
                b.onclick = () => a.onClick ? a.onClick(close, o) : close();
                o.querySelector('.atn-actions').appendChild(b);
            });
            document.body.appendChild(o);
            return { el: o, close };
        },
        confirm(title, body, okLabel = 'אישור') {
            return new Promise(res => {
                ui.modal({
                    title, body, actions: [
                        { label: 'ביטול', onClick: c => { c(); res(false); } },
                        { label: okLabel, kind: 'primary', onClick: c => { c(); res(true); } },
                    ],
                });
            });
        },
    };

    // נעילה כדי שלא יריצו שתי פעולות במקביל
    let busy = false;
    async function exclusive(fn) {
        if (busy) { ui.toast('⏳ פעולה אחרת עדיין רצה...', 'warning'); return; }
        busy = true;
        try { await fn(); }
        catch (e) { console.error('[עובדים-נט]', e); ui.toast('❌ שגיאה: ' + esc(e.message), 'error'); document.getElementById('atn-progress')?.remove(); }
        finally { busy = false; refreshBadge(); }
    }

    // שורות שהסקריפט הוסיף בהרצה האחרונה (לביטול)
    let lastAddedRowIds = [];

    // ==========================================
    // 🕒 מילוי שעות
    // ==========================================
    function planHours(model) {
        const plan = [];
        for (const day of model.list) {
            const sched = settings.schedule[day.weekday];
            if (day.mo !== model.month || !day.isWorkday || !sched?.on) continue;
            if (settings.skipFuture && day.isFuture) continue;
            if (day.isExcluded || day.minutes > 0 || day.otherTasks.length) continue;
            const row = day.rows.find(r => r.innerText.includes(SEL.workdayText));
            if (!row) continue;
            const times = row.querySelectorAll(SEL.timeInputs);
            const task = row.querySelector(SEL.taskInput);
            if (times.length < 4 || times[0].value.trim() !== '' || (task && task.value.trim() !== '')) continue;
            plan.push({ day, row, start: sched.start, end: sched.end });
        }
        return plan;
    }

    async function fillHours() {
        const plan = planHours(buildMonth());
        if (!plan.length) { ui.toast('👌 אין ימים ריקים למילוי', 'info'); return; }
        const body = `<p>יומלאו <b>${plan.length}</b> ימים:</p><div class="atn-scroll"><table class="atn-table">
            <tr><th>תאריך</th><th>יום</th><th>שעות</th></tr>
            ${plan.map(p => `<tr><td>${p.day.key}</td><td>${WEEKDAYS[p.day.weekday]}</td><td>${p.start}–${p.end}</td></tr>`).join('')}
            </table></div><div class="atn-hint">${settings.skipFuture ? 'ימים עתידיים לא ימולאו. ' : ''}ימי חופשה/מחלה מוגדרים בהגדרות.</div>`;
        if (!await ui.confirm('🕒 מילוי שעות', body, `מלא ${plan.length} ימים`)) return;

        dom.setAssignment(settings.taskHours);
        await sleep(1);
        let n = 0;
        for (const p of plan) {
            const task = p.row.querySelector(SEL.taskInput);
            const t = p.row.querySelectorAll(SEL.timeInputs);
            const [sh, sm] = p.start.split(':'), [eh, em] = p.end.split(':');
            dom.click(task);
            await sleep(1);
            t[0].value = sh; t[1].value = sm; t[2].value = eh; t[3].value = em;
            [task, ...Array.from(t).slice(0, 4)].forEach(dom.trigger);
            await sleep(1);
            ui.progress(++n, plan.length, 'ממלא שעות...');
        }
        ui.toast(`✅ מולאו ${n} ימים. זכרו ללחוץ על שמירה באתר!`);
    }

    // ==========================================
    // 🚗 ייבוא נסיעות
    // ==========================================
    // מקבל גם קישור רגיל של גוגל שיטס (לא חייב "פרסום לאינטרנט") אם אתם מחוברים לגוגל באותו דפדפן
    function normalizeSheetUrl(url) {
        const m = url.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
        if (!m || m[1] === 'e' || /\/pub|output=csv|format=csv|tqx=out:csv/.test(url)) return url;
        const gid = (url.match(/[#&?]gid=(\d+)/) || [])[1] || '0';
        return `https://docs.google.com/spreadsheets/d/${m[1]}/export?format=csv&gid=${gid}`;
    }

    function fetchCSV(url) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET', url: normalizeSheetUrl(url),
                onload: r => {
                    if (r.status !== 200) return reject(new Error(`הגיליון החזיר שגיאה ${r.status}`));
                    if (/^\s*<(!doctype|html)/i.test(r.responseText)) return reject(new Error('התקבל דף HTML במקום CSV - התחברו לגוגל בדפדפן או השתמשו בקישור "פרסום לאינטרנט" בפורמט CSV'));
                    resolve(r.responseText);
                },
                onerror: () => reject(new Error('שגיאת רשת במשיכת הגיליון')),
                ontimeout: () => reject(new Error('תם הזמן למשיכת הגיליון')),
                timeout: 20000,
            });
        });
    }

    function planTravel(csvText, model) {
        const rows = parseCSV(csvText);
        const ci = { d: colToIndex(settings.colDate), p: colToIndex(settings.colPrice), r: colToIndex(settings.colRemark) };
        // ספירת נסיעות קיימות לכל תאריך+סכום כדי לזהות כפילויות (גם אם יש 2 נסיעות זהות באותו יום)
        const existing = new Map();
        model.list.forEach(day => day.travels.forEach(c => {
            const k = `${day.key}|${c.toFixed(2)}`;
            existing.set(k, (existing.get(k) || 0) + 1);
        }));

        const items = [];
        let otherMonth = 0, invalid = 0;
        rows.forEach((r, i) => {
            const date = parseDate(r[ci.d], settings.dateOrder);
            const price = parsePrice(r[ci.p]);
            const remark = (r[ci.r] || '').trim();
            if (!date) { if (i > 0 && (r[ci.d] || '').trim()) invalid++; return; }
            const day = model.days.get(date.key);
            if (!day || date.m !== model.month) { otherMonth++; return; }
            const item = { line: i + 1, key: date.key, price, remark, day, status: 'new', note: '' };
            if (!(price > 0)) { item.status = 'bad'; item.note = 'אין סכום תקין'; }
            else {
                const k = `${date.key}|${price.toFixed(2)}`;
                if (existing.get(k) > 0) { existing.set(k, existing.get(k) - 1); item.status = 'dup'; item.note = 'כבר קיימת באתר'; }
                else if (day.minutes === 0 && !day.otherTasks.length) item.note = '⚠️ אין שעות ביום זה';
            }
            items.push(item);
        });
        return { items, otherMonth, invalid };
    }

    async function importTravel() {
        if (!settings.csvLink) { ui.toast('⚠️ הזינו קודם קישור לגיליון הנסיעות בהגדרות', 'warning'); openSettings(); return; }
        ui.toast('⏳ מושך נתונים מהגיליון...', 'info', 1500);
        const csv = await fetchCSV(settings.csvLink);
        const model = buildMonth();
        const { items, otherMonth, invalid } = planTravel(csv, model);

        const wrap = document.createElement('div');
        const newCount = items.filter(x => x.status === 'new').length;
        wrap.innerHTML = `
            <p>נמצאו <b>${items.length}</b> נסיעות בחודש המוצג${newCount ? `, מתוכן <b>${newCount}</b> חדשות` : ''}.</p>
            <div class="atn-scroll"><table class="atn-table">
            <tr><th></th><th>תאריך</th><th>סכום</th><th>הערה</th><th>מצב</th></tr>
            ${items.map((x, i) => `<tr class="${x.status === 'new' ? '' : 'atn-off'}">
                <td><input type="checkbox" data-i="${i}" ${x.status === 'new' ? 'checked' : ''} ${x.status === 'bad' ? 'disabled' : ''}></td>
                <td>${x.key}</td><td>${x.price > 0 ? '₪' + x.price.toFixed(2) : '-'}</td>
                <td>${esc(x.remark)}</td>
                <td>${x.status === 'new' ? '✅ חדשה' : x.status === 'dup' ? '⏭️ ' : '❌ '}${esc(x.note)}</td></tr>`).join('')}
            </table></div>
            <div class="atn-hint">${otherMonth ? `${otherMonth} שורות מחודשים אחרים הוסתרו. ` : ''}${invalid ? `${invalid} שורות עם תאריך לא תקין דולגו (בדקו את סדר התאריך בהגדרות). ` : ''}כפילויות מזוהות לפי תאריך+סכום.</div>`;

        const selected = () => [...wrap.querySelectorAll('input[type=checkbox]:checked')].map(c => items[+c.dataset.i]);
        ui.modal({
            title: '🚗 תצוגה מקדימה - ייבוא נסיעות', body: wrap, width: 680,
            actions: [
                { label: 'ביטול' },
                {
                    label: 'הזן נסיעות מסומנות', kind: 'primary',
                    onClick: c => { const sel = selected(); c(); if (sel.length) exclusive(() => runTravel(sel)); },
                },
            ],
        });
    }

    function findDateRow(key) {
        for (const r of document.querySelectorAll(SEL.rows)) {
            const m = r.innerText.match(/(\d{1,2})\/(\d{1,2})/);
            if (m && `${pad(m[1])}/${pad(m[2])}` === key) return r;
        }
        return null;
    }

    async function addTravelRow(item) {
        const dateRow = findDateRow(item.key);
        const addBtn = dateRow?.querySelector(SEL.addBtn);
        if (!addBtn) return 'לא נמצא כפתור הוספה לתאריך';

        const before = new Set(Array.from(document.querySelectorAll(SEL.taskNameFields)).map(el => el.id));
        dom.click(addBtn);
        const taskField = await waitFor(() => Array.from(document.querySelectorAll(SEL.taskNameFields)).find(el => !before.has(el.id)), 3000);
        if (!taskField) return 'האתר לא יצר שורה חדשה';
        const rowId = taskField.id.split('_').pop();
        const units = document.querySelector(SEL.units(rowId));
        if (!units) return 'לא נמצא שדה סכום';
        lastAddedRowIds.push(rowId);

        dom.setAssignment(settings.taskTravel);
        await sleep(50);
        dom.click(taskField);
        await sleep(100);
        units.value = item.price.toFixed(2).replace(/\.00$/, '');
        dom.trigger(units);
        await sleep(100);

        if (item.remark) {
            const openBtn = SEL.remarkOpen(rowId).map(s => document.querySelector(s)).find(Boolean);
            if (openBtn) {
                dom.click(openBtn);
                const ta = await waitFor(() => {
                    const t = document.querySelector(SEL.remarkText(rowId));
                    return t && t.getBoundingClientRect().width > 0 ? t : null;
                }, 2500);
                if (ta) {
                    ta.value = item.remark;
                    dom.trigger(ta);
                    await sleep(150);
                    const closeArea = document.querySelector(SEL.remarkClose(rowId));
                    if (closeArea) dom.click(closeArea);
                    else ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
                    await sleep(250);
                } else return 'ok-noremark';
            }
        }
        return 'ok';
    }

    async function runTravel(items) {
        lastAddedRowIds = [];
        const failures = [];
        let ok = 0;
        for (let i = 0; i < items.length; i++) {
            ui.progress(i, items.length, 'מזין נסיעות באתר...');
            const res = await addTravelRow(items[i]);
            if (res.startsWith('ok')) ok++;
            if (res !== 'ok') failures.push(`${items[i].key} ₪${items[i].price}: ${res === 'ok-noremark' ? 'ההערה לא נשמרה' : res}`);
        }
        ui.progress(items.length, items.length, 'הושלם');
        if (failures.length) {
            ui.modal({
                title: '⚠️ חלק מהנסיעות לא הוזנו במלואן',
                body: `<p>הוזנו ${ok} מתוך ${items.length}.</p><ul>${failures.map(f => `<li>${esc(f)}</li>`).join('')}</ul>`,
                actions: [{ label: 'סגור', kind: 'primary' }],
            });
        } else ui.toast(`🚗 הוזנו ${ok} נסיעות. זכרו ללחוץ על שמירה באתר!`);
    }

    async function undoLastImport() {
        if (!lastAddedRowIds.length) { ui.toast('אין ייבוא לביטול', 'info'); return; }
        if (!await ui.confirm('↩️ ביטול ייבוא אחרון', `<p>${lastAddedRowIds.length} השורות שנוספו בייבוא האחרון יסומנו למחיקה.</p>`, 'סמן למחיקה')) return;
        let n = 0;
        for (const id of lastAddedRowIds) {
            const box = document.getElementById(`assignment_name_${id}`)?.closest('tr')?.querySelector(SEL.deleteBox);
            if (box && !box.checked) { dom.click(box); n++; await sleep(1); }
        }
        lastAddedRowIds = [];
        ui.toast(`↩️ סומנו ${n} שורות למחיקה. לחצו שמירה באתר כדי לאשר.`);
    }

    // ==========================================
    // 🗑️ סימון הכל למחיקה
    // ==========================================
    async function clearAll() {
        const rows = Array.from(document.querySelectorAll(SEL.rows)).filter(row => {
            const task = row.querySelector(SEL.taskInput);
            const t = row.querySelector(SEL.timeInputs);
            return (task && task.value.trim()) || (t && t.value.trim());
        });
        if (!rows.length) { ui.toast('אין שורות מלאות', 'info'); return; }
        if (!await ui.confirm('🗑️ סימון למחיקה', `<p>${rows.length} שורות מלאות יסומנו למחיקה. המחיקה תתבצע רק אחרי שמירה באתר.</p>`, 'סמן הכל')) return;
        let n = 0;
        for (const row of rows) {
            const box = row.querySelector(SEL.deleteBox);
            if (box && !box.checked) { dom.click(box); n++; await sleep(1); }
        }
        ui.toast(`🧹 סומנו ${n} שורות למחיקה. זכרו ללחוץ על שמירה באתר.`);
    }

    // ==========================================
    // 📊 סיכום, בדיקות תקינות וייצוא
    // ==========================================
    function issuesHTML(a) {
        const out = [];
        const days = list => list.map(x => x.key).join(', ');
        if (a.missing.length) out.push(`<div class="atn-alert err" data-go="${a.missing[0].key}">❗ ${a.missing.length} ימי חול בלי דיווח: ${days(a.missing)}</div>`);
        if (a.travelNoHours.length) out.push(`<div class="atn-alert warn" data-go="${a.travelNoHours[0].key}">🚗 נסיעה ביום בלי שעות: ${days(a.travelNoHours)}</div>`);
        if (a.longDays.length) out.push(`<div class="atn-alert warn" data-go="${a.longDays[0].key}">⏱️ יותר מ-12 שעות ביום: ${days(a.longDays)}</div>`);
        if (a.futureReported.length) out.push(`<div class="atn-alert warn" data-go="${a.futureReported[0].key}">📅 דיווח על ימים עתידיים: ${days(a.futureReported)}</div>`);
        return out.length ? out.join('') : '<div class="atn-alert ok">✅ לא נמצאו בעיות בדיווח</div>';
    }

    function goToDate(key) {
        const row = findDateRow(key);
        if (!row) return;
        row.scrollIntoView({ block: 'center', behavior: 'smooth' });
        const old = row.style.outline;
        row.style.outline = '3px solid #f39c12';
        setTimeout(() => { row.style.outline = old; }, 2500);
    }

    function exportCSV(a) {
        const lines = [['תאריך', 'יום', 'שעות', 'נסיעות (₪)', 'משימות אחרות']];
        a.relevant.forEach(x => lines.push([x.key, WEEKDAYS[x.weekday], x.minutes ? fmtMin(x.minutes) : '', x.travels.reduce((s, c) => s + c, 0) || '', x.otherTasks.join(' | ')]));
        lines.push(['סה"כ', '', fmtMin(a.totalMin), a.travelSum.toFixed(2), '']);
        const csv = '﻿' + lines.map(l => l.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\r\n');
        const link = document.createElement('a');
        link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
        link.download = `דיווח-${pad(a.relevant[0]?.mo || 0)}.csv`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    }

    function textSummary(a) {
        return [
            `סיכום דיווח חודש ${a.relevant[0] ? pad(a.relevant[0].mo) : ''}`,
            `ימים שדווחו: ${a.reported.length} מתוך ${a.pastWorkdays.length} ימי חול שעברו`,
            `סה"כ שעות: ${fmtMin(a.totalMin)}`,
            `נסיעות: ${a.travelCount} | החזר: ₪${a.travelSum.toFixed(2)}`,
        ].join('\n');
    }

    function openSummary() {
        const a = analyze(buildMonth());
        const avg = a.reported.length ? Math.round(a.totalMin / a.reported.length) : 0;
        const wrap = document.createElement('div');
        const mainHTML = `
            <div class="atn-cards">
                <div class="atn-card ${a.missing.length ? 'warn' : ''}" data-d="days"><div>🗓️</div><b>${a.reported.length}/${a.pastWorkdays.length}</b><span>ימים שדווחו / ימי חול שעברו</span></div>
                <div class="atn-card" data-d="hours"><div>⏱️</div><b>${fmtMin(a.totalMin)}</b><span>סה"כ שעות (ממוצע ${fmtMin(avg)})</span></div>
                <div class="atn-card" data-d="travel"><div>🚗</div><b>${a.travelCount}</b><span>נסיעות</span></div>
                <div class="atn-card green" data-d="travel"><div>💰</div><b style="color:#27ae60">₪${a.travelSum.toFixed(2)}</b><span>החזר נסיעות</span></div>
            </div>
            <h3 style="margin:6px 0 8px;font-size:15px;color:#004d00">בדיקות לפני שמירה (לחיצה קופצת לתאריך)</h3>
            ${issuesHTML(a)}`;
        const details = {
            days: ['🗓️ פירוט ימים', a.relevant.filter(x => x.isWorkday || x.minutes).map(x => `<tr><td>${x.key}</td><td>${WEEKDAYS[x.weekday]}</td><td>${x.minutes ? fmtMin(x.minutes) : x.otherTasks.length ? esc(x.otherTasks.join(', ')) : x.isFuture ? 'עתידי' : '❗ חסר'}</td></tr>`)],
            hours: ['⏱️ שעות לפי יום', a.reported.map(x => `<tr><td>${x.key}</td><td>${WEEKDAYS[x.weekday]}</td><td>${fmtMin(x.minutes)}</td></tr>`)],
            travel: ['🚗 נסיעות', a.relevant.flatMap(x => x.travels.map(c => `<tr><td>${x.key}</td><td>${WEEKDAYS[x.weekday]}</td><td>₪${c.toFixed(2)}</td></tr>`))],
        };
        wrap.innerHTML = mainHTML;
        const bind = () => {
            wrap.querySelectorAll('[data-d]').forEach(c => c.onclick = () => {
                const [t, rows] = details[c.dataset.d];
                wrap.innerHTML = `<h3 style="margin:0 0 10px;color:#004d00">${t}</h3><div class="atn-scroll"><table class="atn-table">${rows.join('') || '<tr><td>אין נתונים</td></tr>'}</table></div>
                    <button class="atn-btn atn-secondary" style="margin-top:12px;width:100%">⬅️ חזרה</button>`;
                wrap.querySelector('button').onclick = () => { wrap.innerHTML = mainHTML; bind(); };
            });
            wrap.querySelectorAll('[data-go]').forEach(el => el.onclick = () => { m.close(); goToDate(el.dataset.go); });
        };
        const m = ui.modal({
            title: '📊 סיכום ובדיקת דיווח', body: wrap,
            actions: [
                { label: '📋 העתק סיכום', onClick: () => { navigator.clipboard.writeText(textSummary(a)); ui.toast('📋 הסיכום הועתק', 'info', 1500); } },
                { label: '⬇️ ייצוא לאקסל', onClick: () => exportCSV(a) },
                { label: 'סגור', kind: 'primary' },
            ],
        });
        bind();
    }

    // ==========================================
    // ⚙️ הגדרות + בדיקת תקינות סלקטורים
    // ==========================================
    function diagnostics() {
        const rows = document.querySelectorAll(SEL.rows);
        const model = buildMonth();
        const checks = [
            ['טבלת הדיווח (#tableDyn1)', !!document.querySelector(SEL.table)],
            [`שורות בטבלה: ${rows.length}`, rows.length > 0],
            [`תאריכים שזוהו: ${model.list.length} (חודש ${model.month || '?'})`, model.list.length > 0],
            [`ימי חול שזוהו: ${model.list.filter(x => x.isWorkday).length}`, model.list.some(x => x.isWorkday)],
            ['רשימת משימות (#assignments)', !!document.querySelector(SEL.assignments)],
            [`כפתורי הוספת שורה (עמודה 18): ${document.querySelectorAll(`${SEL.rows} ${SEL.addBtn}`).length}`, !!document.querySelector(`${SEL.rows} ${SEL.addBtn}`)],
            [`שדות משימה (עמודה 15): ${document.querySelectorAll(`${SEL.rows} ${SEL.taskInput}`).length}`, !!document.querySelector(`${SEL.rows} ${SEL.taskInput}`)],
            [`תיבות מחיקה (עמודה 19): ${document.querySelectorAll(`${SEL.rows} ${SEL.deleteBox}`).length}`, !!document.querySelector(`${SEL.rows} ${SEL.deleteBox}`)],
        ];
        return `<table class="atn-table">${checks.map(([t, ok]) => `<tr><td>${ok ? '✅' : '❌'}</td><td>${t}</td></tr>`).join('')}</table>
            <div class="atn-hint">אם משהו אדום - האתר כנראה השתנה. צריך לעדכן את אובייקט SEL בראש הסקריפט.</div>`;
    }

    function openSettings() {
        if (document.querySelector('.atn-settings')) return;
        const s = settings;
        const wrap = document.createElement('div');
        wrap.className = 'atn-settings';
        wrap.innerHTML = `
            <div class="atn-field"><label>🔗 קישור לגיליון הנסיעות (Google Sheets)</label>
                <input type="text" id="atn-link" value="${esc(s.csvLink)}" placeholder="קישור רגיל לגיליון או קישור CSV מפורסם">
                <div class="atn-hint">אפשר להדביק קישור רגיל לגיליון (צריך להיות מחוברים לגוגל באותו דפדפן) - אין צורך לפרסם לאינטרנט. אם יש כמה לשוניות, העתיקו את הקישור כשהלשונית הנכונה פתוחה.</div></div>
            <div class="atn-row">
                <div class="atn-field"><label>עמודת תאריך</label><input type="text" id="atn-cd" value="${esc(s.colDate)}"></div>
                <div class="atn-field"><label>עמודת סכום</label><input type="text" id="atn-cp" value="${esc(s.colPrice)}"></div>
                <div class="atn-field"><label>עמודת הערה</label><input type="text" id="atn-cr" value="${esc(s.colRemark)}"></div>
                <div class="atn-field"><label>סדר תאריך</label><select id="atn-do">
                    <option value="DMY" ${s.dateOrder === 'DMY' ? 'selected' : ''}>יום/חודש</option>
                    <option value="MDY" ${s.dateOrder === 'MDY' ? 'selected' : ''}>חודש/יום</option></select></div>
            </div>
            <div class="atn-field"><label>⏰ מערכת שעות שבועית</label>
                <table class="atn-table">${[0, 1, 2, 3, 4, 5, 6].map(d => `<tr>
                    <td><label style="font-weight:normal"><input type="checkbox" data-on="${d}" ${s.schedule[d].on ? 'checked' : ''}> ${WEEKDAYS[d]}</label></td>
                    <td><input type="time" data-st="${d}" value="${s.schedule[d].start}"></td>
                    <td><input type="time" data-en="${d}" value="${s.schedule[d].end}"></td></tr>`).join('')}</table>
                <div class="atn-hint">ממולאים רק ימים שהאתר מסמן "יום חול" וגם מסומנים כאן.</div></div>
            <div class="atn-field"><label>🏖️ ימי חופשה / מחלה (לא ימולאו ולא יסומנו כחסרים)</label>
                <input type="text" id="atn-ex" value="${esc(s.excludedDates)}" placeholder="לדוגמה: 05/04, 12/04"></div>
            <div class="atn-field"><label style="font-weight:normal"><input type="checkbox" id="atn-sf" ${s.skipFuture ? 'checked' : ''}> לא למלא שעות בימים עתידיים</label></div>
            <details><summary style="cursor:pointer;color:#555">מתקדם</summary>
                <div class="atn-row" style="margin-top:8px">
                    <div class="atn-field"><label>קוד משימת שעות</label><input type="text" id="atn-th" value="${esc(s.taskHours)}"></div>
                    <div class="atn-field"><label>קוד משימת נסיעות</label><input type="text" id="atn-tt" value="${esc(s.taskTravel)}"></div>
                </div>
                <div id="atn-diag"></div>
            </details>
            <div class="atn-hint" style="margin-top:10px">גרסה ${VERSION} · קיצורים: Alt+Shift+H שעות · Alt+Shift+T נסיעות · Alt+Shift+S סיכום</div>`;

        const v = id => wrap.querySelector('#' + id).value.trim();
        ui.modal({
            title: '⚙️ הגדרות', body: wrap, width: 560,
            actions: [
                { label: '🩺 בדיקת תקינות', onClick: () => { wrap.querySelector('details').open = true; wrap.querySelector('#atn-diag').innerHTML = diagnostics(); } },
                { label: 'ביטול' },
                {
                    label: 'שמירה', kind: 'primary', onClick: close => {
                        const link = v('atn-link');
                        if (link && !/^https?:\/\//.test(link)) { ui.toast('❌ הקישור לא תקין', 'error'); return; }
                        if (![v('atn-cd'), v('atn-cp'), v('atn-cr')].every(c => /^[A-Za-z]{1,2}$/.test(c))) { ui.toast('❌ עמודה צריכה להיות אות (A, B, ...)', 'error'); return; }
                        settings.csvLink = link;
                        settings.colDate = v('atn-cd').toUpperCase();
                        settings.colPrice = v('atn-cp').toUpperCase();
                        settings.colRemark = v('atn-cr').toUpperCase();
                        settings.dateOrder = v('atn-do');
                        settings.excludedDates = v('atn-ex');
                        settings.skipFuture = wrap.querySelector('#atn-sf').checked;
                        settings.taskHours = v('atn-th') || DEFAULTS.taskHours;
                        settings.taskTravel = v('atn-tt') || DEFAULTS.taskTravel;
                        for (let d = 0; d < 7; d++) {
                            settings.schedule[d] = {
                                on: wrap.querySelector(`[data-on="${d}"]`).checked,
                                start: wrap.querySelector(`[data-st="${d}"]`).value || '08:00',
                                end: wrap.querySelector(`[data-en="${d}"]`).value || '17:00',
                            };
                        }
                        saveSettings();
                        close();
                        refreshBadge();
                        ui.toast('✅ ההגדרות נשמרו');
                    },
                },
            ],
        });
    }

    // ==========================================
    // 🎛️ פאנל שליטה
    // ==========================================
    function refreshBadge() {
        const badge = document.getElementById('atn-badge');
        if (!badge) return;
        try {
            const a = analyze(buildMonth());
            if (a.missing.length) {
                badge.style.cssText = 'background:#fdecea;color:#a32020;cursor:pointer';
                badge.textContent = `❗ ${a.missing.length} ימים חסרים`;
            } else {
                badge.style.cssText = 'background:#eafaf1;color:#006630;cursor:pointer';
                badge.textContent = `✅ ${fmtMin(a.totalMin)} שעות · ₪${a.travelSum.toFixed(0)}`;
            }
        } catch (e) { badge.textContent = ''; }
        const undo = document.getElementById('atn-undo');
        if (undo) undo.style.display = lastAddedRowIds.length ? '' : 'none';
    }

    function createPanel() {
        if (document.getElementById('atn-panel')) return;
        ensureStyle();
        const p = document.createElement('div');
        p.id = 'atn-panel';
        p.className = 'atn' + (settings.panelCollapsed ? ' collapsed' : '');
        p.innerHTML = `
            <div class="atn-head"><span>⠿ <b>עוזר דיווח</b></span><button title="מזער/הרחב">${settings.panelCollapsed ? '▴' : '▾'}</button></div>
            <div class="atn-body">
                <div id="atn-badge" class="atn-badge"></div>
                <button class="atn-btn atn-primary" data-a="hours"><span>מלא שעות</span><span>🕒 <kbd>⇧⌥H</kbd></span></button>
                <button class="atn-btn atn-primary" data-a="travel"><span>ייבוא נסיעות</span><span>🚗 <kbd>⇧⌥T</kbd></span></button>
                <button class="atn-btn atn-primary" data-a="summary" style="background:linear-gradient(135deg,#004d00,#003300)"><span>סיכום ובדיקה</span><span>📊 <kbd>⇧⌥S</kbd></span></button>
                <button class="atn-btn atn-secondary" data-a="undo" id="atn-undo" style="display:none"><span>בטל ייבוא אחרון</span><span>↩️</span></button>
                <button class="atn-btn atn-secondary" data-a="settings"><span>הגדרות</span><span>⚙️</span></button>
                <button class="atn-btn atn-danger" data-a="clear"><span>סמן הכל למחיקה</span><span>🗑️</span></button>
            </div>`;
        if (settings.panelPos) {
            const x = Math.min(Math.max(0, settings.panelPos.left), window.innerWidth - 120);
            const y = Math.min(Math.max(0, settings.panelPos.top), window.innerHeight - 50);
            Object.assign(p.style, { left: x + 'px', top: y + 'px', right: 'auto', bottom: 'auto' });
        }
        document.body.appendChild(p);

        const actions = { hours: fillHours, travel: importTravel, summary: openSummary, undo: undoLastImport, settings: openSettings, clear: clearAll };
        p.querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
            const a = b.dataset.a;
            if (a === 'summary' || a === 'settings') actions[a]();
            else exclusive(actions[a]);
        });
        p.querySelector('#atn-badge').onclick = openSummary;

        const toggle = p.querySelector('.atn-head button');
        toggle.onclick = e => {
            e.stopPropagation();
            settings.panelCollapsed = !settings.panelCollapsed;
            p.classList.toggle('collapsed', settings.panelCollapsed);
            toggle.textContent = settings.panelCollapsed ? '▴' : '▾';
            saveSettings();
        };

        // גרירה עם שמירת מיקום
        const head = p.querySelector('.atn-head');
        head.addEventListener('mousedown', e => {
            if (e.target === toggle) return;
            const r = p.getBoundingClientRect();
            const sx = e.clientX, sy = e.clientY;
            Object.assign(p.style, { left: r.left + 'px', top: r.top + 'px', right: 'auto', bottom: 'auto' });
            const move = ev => { p.style.left = (r.left + ev.clientX - sx) + 'px'; p.style.top = (r.top + ev.clientY - sy) + 'px'; };
            const up = () => {
                document.removeEventListener('mousemove', move);
                document.removeEventListener('mouseup', up);
                settings.panelPos = { left: parseInt(p.style.left, 10), top: parseInt(p.style.top, 10) };
                saveSettings();
            };
            document.addEventListener('mousemove', move);
            document.addEventListener('mouseup', up);
            e.preventDefault();
        });

        createLogo();
        refreshBadge();
    }

    // --- לוגו A.T ויצירת קשר ---
    function createLogo() {
        if (document.getElementById('atn-logo')) return;
        const el = document.createElement('div');
        el.id = 'atn-logo';
        el.className = 'atn';
        el.style.cssText = 'position:fixed;bottom:25px;left:25px;z-index:2147483645;';
        el.innerHTML = `
            <style>
                @keyframes atn-pulse { 0%{box-shadow:0 0 0 0 rgba(0,166,80,.4)} 70%{box-shadow:0 0 0 14px rgba(0,166,80,0)} 100%{box-shadow:0 0 0 0 rgba(0,166,80,0)} }
                #atn-logo .c { width:50px;height:50px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#002913,#007538,#00a650);border:2px solid #fff;color:#fff;font-weight:900;font-size:18px;cursor:pointer;animation:atn-pulse 3s infinite;transition:transform .3s }
                #atn-logo:hover .c { transform:scale(1.1) rotate(5deg) }
                #atn-logo .tip { visibility:hidden;opacity:0;position:absolute;bottom:68px;left:0;width:330px;background:rgba(255,255,255,.97);border-radius:18px;padding:20px;box-shadow:0 15px 45px rgba(0,0,0,.15);transition:all .3s;transform:translateY(10px) }
                #atn-logo:hover .tip { visibility:visible;opacity:1;transform:none }
            </style>
            <div class="tip">
                <div style="display:inline-block;background:#eafaf1;color:#008a42;padding:5px 12px;border-radius:20px;font-size:12px;font-weight:bold;margin-bottom:10px">✨ אוטומציה מבית A.T · v${VERSION}</div>
                <h3 style="margin:0 0 8px;color:#004d00">היי! אני אלמוג 👋</h3>
                <p style="margin:0 0 12px;font-size:14px;color:#555;line-height:1.6">יצרתי את הכלי כדי שסוף החודש יהיה קל ומדויק יותר.<br><b>רעיון לשדרוג? משהו לא עובד?</b> מוזמנים לפנות:</p>
                <div style="display:flex;align-items:center;justify-content:space-between;background:#f8fcf9;border:1px solid #d5f5e3;border-radius:10px;padding:8px 12px">
                    <span style="font-family:monospace;color:#006630;font-weight:bold">almogt@cyber.org.il</span>
                    <button class="atn-btn atn-primary" style="padding:6px 12px;font-size:12px">📋 העתקה</button>
                </div>
            </div>
            <div class="c">A T</div>`;
        const btn = el.querySelector('button');
        btn.onclick = () => {
            navigator.clipboard.writeText('almogt@cyber.org.il');
            btn.textContent = '✔️ הועתק';
            setTimeout(() => { btn.textContent = '📋 העתקה'; }, 2000);
        };
        document.body.appendChild(el);
    }

    // ==========================================
    // 🚀 אתחול: פאנל רק במסגרת שבה יש את טבלת הדיווח
    // ==========================================
    document.addEventListener('keydown', e => {
        if (!e.altKey || !e.shiftKey || !document.querySelector(SEL.table)) return;
        const k = e.code;
        if (k === 'KeyH') { e.preventDefault(); exclusive(fillHours); }
        else if (k === 'KeyT') { e.preventDefault(); exclusive(importTravel); }
        else if (k === 'KeyS') { e.preventDefault(); openSummary(); }
    });

    if (typeof GM_registerMenuCommand === 'function') GM_registerMenuCommand('⚙️ הגדרות עוזר הדיווח', () => { ensureStyle(); openSettings(); });

    let badgeTimer = null;
    function tick() {
        const hasTable = !!document.querySelector(SEL.table);
        const panel = document.getElementById('atn-panel');
        if (hasTable && !panel) createPanel();
        else if (!hasTable && panel) { panel.remove(); document.getElementById('atn-logo')?.remove(); }
    }
    tick();
    setInterval(tick, 1500);
    // עדכון התג כשהמשתמש מקליד בטבלה
    document.addEventListener('change', e => {
        if (!e.target.closest?.(SEL.table)) return;
        clearTimeout(badgeTimer);
        badgeTimer = setTimeout(refreshBadge, 400);
    }, true);
})();
