/* @ds-bundle: {"format": 4, "namespace": "AstroZ", "components": [{"name": "Button"}, {"name": "StatusChip"}, {"name": "LangToggle"}, {"name": "Icon"}, {"name": "Muggulu"}, {"name": "WishCard"}, {"name": "ProfileChip"}, {"name": "DayRibbon"}, {"name": "GunaDial"}, {"name": "KootaRow"}, {"name": "DoshaCallout"}, {"name": "DateResultCard"}, {"name": "WhySheet"}, {"name": "TodoList"}, {"name": "BottomNav"}, {"name": "BirthForm"}, {"name": "ShareCard"}]} */
(function () {
  var React = window.React;
  var h = React.createElement;
  var useState = React.useState;
  var ICONS = {"lotus": "<path d=\"M12 5c2 2.2 2.6 4.6 2 7.2-.5 2-1.3 3.3-2 3.8-.7-.5-1.5-1.8-2-3.8-.6-2.6 0-5 2-7.2z\"/><path d=\"M9.7 9.3C7.6 8.4 5.4 8.5 3.5 9.6c.7 3.5 3.8 6.2 8.5 6.4\"/><path d=\"M14.3 9.3c2.1-.9 4.3-.8 6.2.3-.7 3.5-3.8 6.2-8.5 6.4\"/><path d=\"M6 19.5h12\"/>", "half-diya": "<path d=\"M4 13.5h16c-.7 3.3-3.9 5.5-8 5.5s-7.3-2.2-8-5.5z\"/><path d=\"M12 4.5c1.7 1.9 2.5 3.4 2.5 4.8A2.5 2.5 0 0 1 12 11.8a2.5 2.5 0 0 1-2.5-2.5c0-1.4.8-2.9 2.5-4.8z\"/><path d=\"M12 4.5c-1.7 1.9-2.5 3.4-2.5 4.8a2.5 2.5 0 0 0 2.5 2.5z\" fill=\"currentColor\"/>", "crossed-circle": "<circle cx=\"12\" cy=\"12\" r=\"8\"/><path d=\"M6.4 17.6 17.6 6.4\"/>", "diya": "<path d=\"M4 13.5h16c-.7 3.3-3.9 5.5-8 5.5s-7.3-2.2-8-5.5z\"/><path d=\"M12 4.5c1.7 1.9 2.5 3.4 2.5 4.8A2.5 2.5 0 0 1 12 11.8a2.5 2.5 0 0 1-2.5-2.5c0-1.4.8-2.9 2.5-4.8z\"/><path d=\"M10 21h4\"/>", "kalasham": "<circle cx=\"12\" cy=\"5.5\" r=\"2.5\"/><path d=\"M9.6 6.6 6.5 5.2M14.4 6.6l3.1-1.4\"/><path d=\"M9 8.5h6V10H9z\"/><path d=\"M9 10c-2.6 1.4-4 3.3-4 5.3C5 18.5 8 20 12 20s7-1.5 7-4.7c0-2-1.4-3.9-4-5.3\"/><path d=\"M6.2 14h11.6\"/>", "muggulu": "<path d=\"M12 4c2.2 0 4 1.8 4 4s-1.8 4-4 4-4 1.8-4 4 1.8 4 4 4 4-1.8 4-4-1.8-4-4-4-4-1.8-4-4 1.8-4 4-4z\"/><path d=\"M4 12c0-2.2 1.8-4 4-4s4 1.8 4 4 1.8 4 4 4 4-1.8 4-4-1.8-4-4-4-4 1.8-4 4-1.8 4-4 4-4-1.8-4-4z\"/><circle cx=\"12\" cy=\"8\" r=\".9\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"8\" cy=\"12\" r=\".9\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"16\" cy=\"12\" r=\".9\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"12\" cy=\"16\" r=\".9\" fill=\"currentColor\" stroke=\"none\"/>", "thoranam": "<path d=\"M3 5c3 1.3 6 2 9 2s6-.7 9-2\"/><path d=\"M6 6.2c-1 1.8-1 4.3 0 6.3 1-2 1-4.5 0-6.3zM10 6.9c-1 2-1 5 0 7.6 1-2.6 1-5.6 0-7.6zM14 6.9c-1 2-1 5 0 7.6 1-2.6 1-5.6 0-7.6zM18 6.2c-1 1.8-1 4.3 0 6.3 1-2 1-4.5 0-6.3z\"/>", "banana-leaf": "<path d=\"M4 20C6 11 11.5 5.5 20 4c-.8 8.5-6.6 14-16 16z\"/><path d=\"M4 20 16.5 7.5\"/><path d=\"M9 15l-1.5-3M12 12l-1-3.2M9 15l3 1.2M12 12l3.2 1\"/>", "palm-leaf": "<rect x=\"3\" y=\"6.5\" width=\"18\" height=\"4.5\" rx=\"2.25\"/><rect x=\"3\" y=\"13\" width=\"18\" height=\"4.5\" rx=\"2.25\"/><path d=\"M6.5 8.75h7M6.5 15.25h9\"/><circle cx=\"17.5\" cy=\"8.75\" r=\".75\"/>", "sunrise": "<path d=\"M3.5 17h17\"/><path d=\"M7 17a5 5 0 0 1 10 0\"/><path d=\"M12 6.5v2.5M5.3 10.3l1.8 1.8M18.7 10.3l-1.8 1.8\"/><path d=\"M8.5 20.5h7\"/>", "moon": "<path d=\"M19 14.6A7.5 7.5 0 1 1 9.4 5a6 6 0 0 0 9.6 9.6z\"/>", "nakshatram": "<path d=\"M12 3.5c.6 4.4 2.6 6.9 7.5 8.5-4.9 1.6-6.9 4.1-7.5 8.5-.6-4.4-2.6-6.9-7.5-8.5 4.9-1.6 6.9-4.1 7.5-8.5z\"/>", "clock": "<circle cx=\"12\" cy=\"12\" r=\"8.5\"/><path d=\"M12 7.5V12l3 2\"/>", "why": "<circle cx=\"12\" cy=\"12\" r=\"8.5\"/><path d=\"M9.6 9.6a2.4 2.4 0 1 1 3.4 2.2c-.6.3-1 .8-1 1.5v.5\"/><circle cx=\"12\" cy=\"16.6\" r=\".9\" fill=\"currentColor\" stroke=\"none\"/>", "check": "<path d=\"M5 12.5l4.5 4.5L19 7.5\"/>", "close": "<path d=\"M6.5 6.5l11 11M17.5 6.5l-11 11\"/>", "plus": "<path d=\"M12 5v14M5 12h14\"/>", "chevron-right": "<path d=\"M9.5 5.5 16 12l-6.5 6.5\"/>", "chevron-down": "<path d=\"M5.5 9.5 12 16l6.5-6.5\"/>", "share": "<path d=\"M12 4v11M7.5 8.5 12 4l4.5 4.5\"/><path d=\"M6 12H5v8h14v-8h-1\"/>", "calendar": "<rect x=\"4\" y=\"5.5\" width=\"16\" height=\"14.5\" rx=\"2.5\"/><path d=\"M4 10h16M8.5 3.5v4M15.5 3.5v4\"/>", "muhurtham": "<rect x=\"4\" y=\"5.5\" width=\"16\" height=\"14.5\" rx=\"2.5\"/><path d=\"M4 10h16M8.5 3.5v4M15.5 3.5v4\"/><path d=\"M12 12.2c.3 1.6 1 2.3 2.6 2.6-1.6.3-2.3 1-2.6 2.6-.3-1.6-1-2.3-2.6-2.6 1.6-.3 2.3-1 2.6-2.6z\"/>", "location": "<path d=\"M12 20.5s-6-5.6-6-10.5a6 6 0 0 1 12 0c0 4.9-6 10.5-6 10.5z\"/><circle cx=\"12\" cy=\"10\" r=\"2.2\"/>", "search": "<circle cx=\"10.5\" cy=\"10.5\" r=\"6\"/><path d=\"M15 15l4.5 4.5\"/>", "offline": "<path d=\"M7.5 18H17a3.5 3.5 0 0 0 .6-6.95A5.5 5.5 0 0 0 8.2 8.4\"/><path d=\"M6.3 10.2A4 4 0 0 0 7.5 18\"/><path d=\"M4 4l16 16\"/>", "lock": "<rect x=\"5\" y=\"10.5\" width=\"14\" height=\"10\" rx=\"2.5\"/><path d=\"M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5\"/><path d=\"M12 14.5v2\"/>", "rings": "<circle cx=\"9\" cy=\"13.5\" r=\"5\"/><circle cx=\"15\" cy=\"13.5\" r=\"5\"/><path d=\"M13.5 5.5 15 4l1.5 1.5L15 7z\"/>", "house": "<path d=\"M4 11 12 4.5 20 11\"/><path d=\"M6 9.5V20h12V9.5\"/><path d=\"M10 20v-5h4v5\"/>", "briefcase": "<rect x=\"3.5\" y=\"7.5\" width=\"17\" height=\"12\" rx=\"2.5\"/><path d=\"M9 7.5V6a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 6v1.5\"/><path d=\"M3.5 12.5h17\"/>", "coins": "<ellipse cx=\"9.5\" cy=\"7\" rx=\"5.5\" ry=\"2.5\"/><path d=\"M4 7v4c0 1.4 2.5 2.5 5.5 2.5S15 12.4 15 11V7\"/><path d=\"M4 11v4c0 1.4 2.5 2.5 5.5 2.5\"/><ellipse cx=\"15\" cy=\"15\" rx=\"5\" ry=\"2.3\"/><path d=\"M10 15v2.5c0 1.3 2.2 2.3 5 2.3s5-1 5-2.3V15\"/>", "family": "<circle cx=\"8.5\" cy=\"8\" r=\"2.75\"/><circle cx=\"16\" cy=\"9.5\" r=\"2.25\"/><path d=\"M3.5 19c0-3 2.2-5.5 5-5.5s5 2.5 5 5.5\"/><path d=\"M13.6 14.6c.7-.7 1.5-1.1 2.4-1.1 2.3 0 4 2.2 4 5\"/>", "person": "<circle cx=\"12\" cy=\"8\" r=\"3.5\"/><path d=\"M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7\"/>", "more": "<circle cx=\"6\" cy=\"12\" r=\"1.2\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"12\" cy=\"12\" r=\"1.2\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"18\" cy=\"12\" r=\"1.2\" fill=\"currentColor\" stroke=\"none\"/>"};

  function cx() {
    var out = [];
    for (var i = 0; i < arguments.length; i++) if (arguments[i]) out.push(arguments[i]);
    return out.join(' ');
  }
  function L(lang) { return lang === 'en' ? 'en' : 'te'; }
  function t(lang, te, en) { return L(lang) === 'en' ? en : te; }

  var STATUS = {
    good: { te: 'శుభం', en: 'Good', icon: 'lotus' },
    mixed: { te: 'మిశ్రమం', en: 'Mixed', icon: 'half-diya' },
    avoid: { te: 'వర్జించండి', en: 'Avoid', icon: 'crossed-circle' }
  };
  var APPROX = { te: 'సుమారు', en: 'Approximate' };
  var WHY = { te: 'ఎందుకు?', en: 'Why?' };
  var FREE = { te: 'ఉచితం', en: 'Free' };

  /* ---------- Icon ---------- */
  function Icon(props) {
    var size = props.size || 24;
    var markup = ICONS[props.name] || '';
    return h('svg', {
      className: cx('az-icon', props.className),
      viewBox: '0 0 24 24', width: size, height: size,
      fill: 'none', stroke: 'currentColor', strokeWidth: 1.5,
      strokeLinecap: 'round', strokeLinejoin: 'round',
      role: props.title ? 'img' : undefined,
      'aria-hidden': props.title ? undefined : true,
      'aria-label': props.title,
      style: props.style,
      dangerouslySetInnerHTML: { __html: markup }
    });
  }

  /* ---------- Muggulu (ornament + loader) ---------- */
  function Muggulu(props) {
    var size = props.size || 64;
    var drawing = !!props.drawing;
    var dots = [];
    [4, 12, 20].forEach(function (y) { [4, 12, 20].forEach(function (x) { dots.push(h('circle', { key: x + '-' + y, cx: x, cy: y, r: 0.9, className: 'az-mug-dot' })); }); });
    var loop = 'M12 1.5C16 1.5 16 8 20 8S22.5 12 22.5 12 20 16 16 16 16 22.5 12 22.5 8 16 4 16 1.5 12 1.5 12 4 8 8 8 8 1.5 12 1.5Z';
    var ring = 'M8 4A4 4 0 0 1 16 4 4 4 0 0 1 20 8 4 4 0 0 1 20 16 4 4 0 0 1 16 20 4 4 0 0 1 8 20 4 4 0 0 1 4 16 4 4 0 0 1 4 8 4 4 0 0 1 8 4Z';
    return h('span', {
      className: cx('az-muggulu', drawing && 'is-drawing', props.className),
      role: drawing ? 'status' : undefined,
      'aria-label': drawing ? (props.label || t(props.lang, 'లెక్కిస్తోంది…', 'Calculating…')) : undefined,
      'aria-hidden': drawing ? undefined : true,
      style: { width: size, height: size }
    }, h('svg', { viewBox: '0 0 24 24', width: size, height: size, fill: 'none' },
      h('path', { d: ring, className: 'az-mug-line', pathLength: 100 }),
      h('path', { d: loop, className: 'az-mug-line az-mug-line-2', pathLength: 100 }),
      dots));
  }

  /* ---------- Button ---------- */
  function Button(props) {
    var variant = props.variant || 'primary';
    var rest = {};
    for (var k in props) if (['variant', 'icon', 'loading', 'block', 'lang', 'className', 'children', 'pressed'].indexOf(k) < 0) rest[k] = props[k];
    return h('button', Object.assign({ type: 'button' }, rest, {
      className: cx('az', 'az-' + L(props.lang), 'az-btn', 'az-btn-' + variant, props.block && 'az-btn-block', props.pressed && 'is-pressed', props.loading && 'is-loading', props.className),
      disabled: props.disabled || props.loading,
      'aria-busy': props.loading || undefined
    }),
      props.loading ? h(Muggulu, { size: 20, drawing: true, lang: props.lang }) : (props.icon ? h(Icon, { name: props.icon, size: 20 }) : null),
      h('span', null, props.children));
  }

  /* ---------- StatusChip ---------- */
  function StatusChip(props) {
    var s = STATUS[props.status] || STATUS.good;
    var lang = L(props.lang);
    return h('span', { className: cx('az', 'az-' + lang, 'az-chip', 'az-chip-' + (props.status || 'good'), 'az-chip-' + (props.variant || 'soft'), props.className) },
      h(Icon, { name: s.icon, size: 18 }),
      h('span', null, props.label || s[lang]));
  }

  function ApproxTag(props) {
    return h('span', { className: 'az-approx' }, h(Icon, { name: 'clock', size: 16 }), APPROX[L(props.lang)]);
  }

  function WhyLink(props) {
    return h('button', { type: 'button', className: 'az-why', onClick: props.onClick },
      h(Icon, { name: 'why', size: 18 }), h('span', null, props.label || WHY[L(props.lang)]));
  }

  /* ---------- LangToggle ---------- */
  function LangToggle(props) {
    var st = useState(props.value || props.defaultValue || 'te');
    var value = props.value || st[0];
    function pick(v) { st[1](v); if (props.onChange) props.onChange(v); }
    return h('div', { className: cx('az', 'az-lang', props.className), role: 'radiogroup', 'aria-label': 'Language / భాష' },
      [['te', 'తె', 'తెలుగు'], ['en', 'EN', 'English']].map(function (o) {
        var on = value === o[0];
        return h('button', { key: o[0], type: 'button', role: 'radio', 'aria-checked': on, 'aria-label': o[2], className: cx('az-lang-opt', 'az-lang-' + o[0], on && 'is-on'), onClick: function () { pick(o[0]); }, disabled: props.disabled }, o[1]);
      }));
  }

  /* ---------- WishCard ---------- */
  function WishCard(props) {
    var lang = L(props.lang);
    var state = props.state || 'default';
    var disabled = state === 'disabled' || props.disabled;
    return h('button', {
      type: 'button',
      className: cx('az', 'az-' + lang, 'az-card', 'az-wish', state === 'pressed' && 'is-pressed', state === 'loading' && 'is-loading', props.className),
      disabled: disabled, onClick: props.onClick, 'aria-busy': state === 'loading' || undefined
    },
      h('span', { className: 'az-wish-icon' }, state === 'loading' ? h(Muggulu, { size: 28, drawing: true, lang: lang }) : h(Icon, { name: props.icon || 'kalasham', size: 28 })),
      h('span', { className: 'az-wish-text' },
        h('span', { className: 'az-wish-title' }, props.title),
        props.subtitle ? h('span', { className: 'az-wish-sub' }, props.subtitle) : null,
        props.status ? h(StatusChip, { status: props.status, lang: lang, label: props.statusLabel }) : null),
      h(Icon, { name: 'chevron-right', size: 20, className: 'az-wish-chev' }));
  }

  /* ---------- ProfileChip ---------- */
  function ProfileChip(props) {
    var lang = L(props.lang);
    var initial = props.initial || (props.name ? Array.from(props.name)[0] : '');
    if (props.add) {
      return h('button', { type: 'button', className: cx('az', 'az-' + lang, 'az-profile', 'az-profile-add', props.className), onClick: props.onClick, disabled: props.disabled },
        h('span', { className: 'az-profile-avatar' }, h(Icon, { name: 'plus', size: 20 })),
        h('span', { className: 'az-profile-name' }, props.name || t(lang, 'వ్యక్తిని చేర్చండి', 'Add person')));
    }
    return h('button', {
      type: 'button', 'aria-pressed': !!props.selected,
      className: cx('az', 'az-' + lang, 'az-profile', props.selected && 'is-selected', props.state === 'pressed' && 'is-pressed', props.className),
      onClick: props.onClick, disabled: props.disabled || props.state === 'disabled'
    },
      h('span', { className: 'az-profile-avatar' }, initial),
      h('span', { className: 'az-profile-text' },
        h('span', { className: 'az-profile-name' }, props.name),
        props.relation || props.approximate ? h('span', { className: 'az-profile-rel' }, props.relation, props.relation && props.approximate ? ' · ' : '', props.approximate ? APPROX[lang] : '') : null),
      props.selected ? h(Icon, { name: 'check', size: 18, className: 'az-profile-check' }) : null);
  }

  /* ---------- DayRibbon ---------- */
  var PERIODS = {
    rahu: { te: 'రాహు కాలం', en: 'Rahu kalam', status: 'avoid' },
    yamagandam: { te: 'యమగండం', en: 'Yamagandam', status: 'avoid' },
    gulika: { te: 'గుళిక కాలం', en: 'Gulika kalam', status: 'avoid' },
    varjyam: { te: 'వర్జ్యం', en: 'Varjyam', status: 'avoid' },
    durmuhurtham: { te: 'దుర్ముహూర్తం', en: 'Durmuhurtham', status: 'avoid' },
    amrita: { te: 'అమృత కాలం', en: 'Amrita kalam', status: 'good' },
    abhijit: { te: 'అభిజిత్ ముహూర్తం', en: 'Abhijit muhurtham', status: 'good' },
    best: { te: 'మంచి సమయం', en: 'Best window', status: 'good' }
  };
  function mins(s) { var p = String(s).split(':'); return (+p[0]) * 60 + (+p[1] || 0); }
  function offset(s, sunrise) { var m = mins(s) - sunrise; return m < 0 ? m + 1440 : m; }

  function DayRibbon(props) {
    var lang = L(props.lang);
    var sr = mins(props.sunrise || '06:00');
    var total = offset(props.nextSunrise || props.sunrise || '06:00', sr);
    if (total < 720) total += 1440;
    var segs = (props.segments || []).map(function (s, i) {
      var p = PERIODS[s.kind] || { te: s.label, en: s.label, status: s.status || 'avoid' };
      var a = offset(s.start, sr), b = offset(s.end, sr); if (b < a) b += 1440;
      return { i: i, kind: s.kind, label: s.label || p[lang], status: s.status || p.status, start: s.start, end: s.end, a: a, b: b };
    });
    var now = props.now != null ? offset(props.now, sr) : null;
    var pct = function (m) { return Math.max(0, Math.min(100, (m / total) * 100)) + '%'; };
    var view = props.view || 'bar';
    var nowLabel = t(lang, 'ఇప్పుడు', 'Now');

    if (view === 'list') {
      var sorted = segs.slice().sort(function (x, y) { return x.a - y.a; });
      return h('ol', { className: cx('az', 'az-' + lang, 'az-ribbon-list', props.className) }, sorted.map(function (s) {
        var live = now != null && now >= s.a && now < s.b;
        return h('li', { key: s.i, className: cx('az-ribbon-row', 'az-ribbon-row-' + s.status, live && 'is-now') },
          h('span', { className: 'az-ribbon-row-icon' }, h(Icon, { name: STATUS[s.status].icon, size: 20 })),
          h('span', { className: 'az-ribbon-row-name' }, s.label, live ? h('span', { className: 'az-now-tag' }, nowLabel) : null),
          h('span', { className: 'az-times az-ribbon-row-time' }, s.start + ' – ' + s.end),
          h('span', { className: 'az-sr' }, STATUS[s.status][lang]));
      }));
    }

    var lanes = [['good', 'lotus'], ['avoid', 'crossed-circle']];
    var fmt = function (m) { m = ((m % 1440) + 1440) % 1440; var hh = Math.floor(m / 60), mm = m % 60; return (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm; };
    var tickMins = [0, offset('12:00', sr)];
    if (props.sunset) tickMins.push(offset(props.sunset, sr));
    tickMins.push(offset('00:00', sr), total);
    var ticks = tickMins.filter(function (m) { return m >= 0 && m <= total; }).sort(function (a, b) { return a - b; }).map(function (m) { return { f: m / total, label: fmt(sr + m) }; });
    var night = props.sunset ? offset(props.sunset, sr) : null;
    var legendKinds = [];
    segs.forEach(function (s) { if (legendKinds.indexOf(s.status) < 0) legendKinds.push(s.status); });

    return h('div', { className: cx('az', 'az-' + lang, 'az-ribbon', props.className) },
      h('div', { className: 'az-ribbon-ends' },
        h('span', null, h(Icon, { name: 'sunrise', size: 18 }), t(lang, 'సూర్యోదయం', 'Sunrise'), ' ', h('b', { className: 'az-times' }, props.sunrise)),
        props.sunset ? h('span', null, h(Icon, { name: 'moon', size: 18 }), t(lang, 'సూర్యాస్తమయం', 'Sunset'), ' ', h('b', { className: 'az-times' }, props.sunset)) : null),
      h('div', { className: 'az-ribbon-track', role: 'img', 'aria-label': segs.map(function (s) { return s.label + ' ' + s.start + '–' + s.end; }).join(', ') },
       h('div', { className: 'az-ribbon-plot' },
        night != null ? h('span', { className: 'az-ribbon-night', style: { left: pct(night), width: 'calc(100% - ' + pct(night) + ')' } }) : null,
        lanes.map(function (ln) {
          return h('div', { key: ln[0], className: 'az-ribbon-lane az-ribbon-lane-' + ln[0] },
            h('span', { className: 'az-ribbon-lane-icon' }, h(Icon, { name: ln[1], size: 16 })),
            segs.filter(function (s) { return (ln[0] === 'good') === (s.status === 'good'); }).map(function (s) {
              return h('span', { key: s.i, className: 'az-ribbon-seg az-ribbon-seg-' + s.status, style: { left: pct(s.a), width: 'calc(' + pct(s.b - s.a) + ' + 0px)' }, title: s.label + ' ' + s.start + '–' + s.end });
            }));
        }),
        now != null ? h('span', { className: 'az-ribbon-now', style: { left: pct(now) } },
          h('span', { className: 'az-ribbon-now-pill az-times' }, nowLabel + ' ' + props.now)) : null)),
      h('div', { className: 'az-ribbon-ticks az-times', 'aria-hidden': true }, ticks.map(function (k) {
        return h('span', { key: k.f, style: { left: (k.f * 100) + '%' } }, k.label);
      })),
      props.showLegend === false ? null : h('div', { className: 'az-ribbon-legend' }, legendKinds.map(function (k) {
        return h(StatusChip, { key: k, status: k, lang: lang, label: k === 'good' ? t(lang, 'శుభ సమయం', 'Good window') : (k === 'avoid' ? t(lang, 'వర్జించండి', 'Avoid') : undefined) });
      })));
  }

  /* ---------- GunaDial ---------- */
  function gunaBand(score, max) {
    var r = score / max;
    if (r >= 24 / 36) return 'good';
    if (r >= 18 / 36) return 'mixed';
    return 'avoid';
  }
  var BAND_LABEL = {
    good: { te: 'బాగా కుదిరింది', en: 'Strong match' },
    mixed: { te: 'పరవాలేదు', en: 'Fair match' },
    avoid: { te: 'తక్కువ పొంతన', en: 'Low match' }
  };
  function GunaDial(props) {
    var lang = L(props.lang);
    var max = props.max || 36;
    var score = props.score || 0;
    var size = props.size || 208;
    var band = props.status || gunaBand(score, max);
    var n = 36, R = 44, dots = [];
    var filled = Math.round((score / max) * n);
    for (var i = 0; i < n; i++) {
      var ang = (i / n) * Math.PI * 2 - Math.PI / 2;
      var x = 50 + R * Math.cos(ang), y = 50 + R * Math.sin(ang);
      var on = i < filled;
      dots.push(h('path', {
        key: i, className: cx('az-dial-petal', on && 'is-on'),
        d: 'M0 -3.2C1.6 -1.6 1.6 1.6 0 3.2 -1.6 1.6 -1.6 -1.6 0 -3.2Z',
        transform: 'translate(' + x.toFixed(2) + ' ' + y.toFixed(2) + ') rotate(' + ((i / n) * 360).toFixed(1) + ')'
      }));
    }
    var petals = null;
    if (props.celebrate && band === 'good') {
      petals = h('span', { className: 'az-petals', 'aria-hidden': true }, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (k) {
        return h('i', { key: k, style: { left: (6 + k * 9.5) + '%', animationDelay: (k % 5) * 90 + 'ms' } });
      }));
    }
    var display = Number.isInteger(score) ? score : score.toFixed(1);
    return h('div', { className: cx('az', 'az-' + lang, 'az-dial', 'az-dial-' + band, props.className), style: { width: size } },
      petals,
      h('div', { className: 'az-dial-ring', style: { width: size, height: size } },
        h('svg', { viewBox: '0 0 100 100', width: size, height: size, 'aria-hidden': true },
          h('circle', { cx: 50, cy: 50, r: 37, className: 'az-dial-inner' }),
          h('circle', { cx: 50, cy: 50, r: 34, className: 'az-dial-inner az-dial-inner-2' }),
          dots),
        h('div', { className: 'az-dial-center' },
          h('span', { className: cx('az-dial-score', !Number.isInteger(score) && 'is-decimal') }, display, h('small', null, '/' + max)),
          h('span', { className: 'az-dial-unit' }, t(lang, 'గుణాలు', 'gunas')))),
      h(StatusChip, { status: band, lang: lang, variant: 'solid', label: props.label || BAND_LABEL[band][lang] }),
      props.approximate ? h(ApproxTag, { lang: lang }) : null,
      h('span', { className: 'az-sr', role: 'status' }, display + ' / ' + max));
  }

  /* ---------- KootaRow ---------- */
  var KOOTAS = {
    varna: { te: 'వర్ణం', en: 'Varna', max: 1 },
    vashya: { te: 'వశ్యం', en: 'Vashya', max: 2 },
    tara: { te: 'తార', en: 'Tara', max: 3 },
    yoni: { te: 'యోని', en: 'Yoni', max: 4 },
    grahaMaitri: { te: 'గ్రహ మైత్రి', en: 'Graha Maitri', max: 5 },
    gana: { te: 'గణం', en: 'Gana', max: 6 },
    bhakoot: { te: 'రాశి (భకూటం)', en: 'Bhakoot', max: 7 },
    nadi: { te: 'నాడి', en: 'Nadi', max: 8 }
  };
  function KootaRow(props) {
    var lang = L(props.lang);
    var k = KOOTAS[props.koota] || { te: props.name, en: props.name, max: props.max || 1 };
    var max = props.max || k.max;
    var score = props.score || 0;
    var status = props.status || (score >= max ? 'good' : (score <= 0 ? 'avoid' : 'mixed'));
    var pips = [];
    for (var i = 0; i < max; i++) pips.push(h('i', { key: i, className: cx('az-pip', i < Math.floor(score) && 'is-on', i === Math.floor(score) && score % 1 && 'is-half') }));
    return h('div', { className: cx('az', 'az-' + lang, 'az-koota', 'az-koota-' + status, props.className) },
      h('span', { className: 'az-koota-icon' }, h(Icon, { name: STATUS[status].icon, size: 20, title: STATUS[status][lang] })),
      h('span', { className: 'az-koota-main' },
        h('span', { className: 'az-koota-name' }, props.name || k[lang]),
        props.note ? h('span', { className: 'az-koota-note' }, props.note) : null,
        h('span', { className: 'az-pips', 'aria-hidden': true }, pips)),
      h('span', { className: 'az-koota-side' },
        h('span', { className: 'az-times az-koota-score' }, score + '/' + max),
        props.onWhy !== null ? h(WhyLink, { lang: lang, onClick: props.onWhy }) : null));
  }

  /* ---------- DoshaCallout ---------- */
  function DoshaCallout(props) {
    var lang = L(props.lang);
    var status = props.cancelled ? 'good' : (props.status || 'mixed');
    return h('section', { className: cx('az', 'az-' + lang, 'az-dosha', 'az-dosha-' + status, props.className) },
      h('div', { className: 'az-dosha-head' },
        h('span', { className: 'az-dosha-icon' }, h(Icon, { name: STATUS[status].icon, size: 24 })),
        h('span', { className: 'az-dosha-title' }, props.title),
        h(StatusChip, { status: status, lang: lang, label: props.statusLabel || (props.cancelled ? t(lang, 'పరిహారమైంది', 'Cancelled') : undefined) })),
      props.children ? h('div', { className: 'az-dosha-body' }, props.children) : null,
      props.helps && props.helps.length ? h('div', { className: 'az-dosha-helps' },
        h('span', { className: 'az-dosha-helps-title' }, t(lang, 'ఏం చేస్తే మంచిది', 'What helps')),
        h('ul', null, props.helps.map(function (x, i) { return h('li', { key: i }, h(Icon, { name: 'check', size: 18 }), h('span', null, x)); }))) : null,
      props.onWhy !== null ? h(WhyLink, { lang: lang, onClick: props.onWhy }) : null);
  }

  /* ---------- DateResultCard ---------- */
  function DateResultCard(props) {
    var lang = L(props.lang);
    var status = props.status || 'good';
    var max = props.max || 100;
    return h('article', { className: cx('az', 'az-' + lang, 'az-card', 'az-date', 'az-date-' + status, props.state === 'pressed' && 'is-pressed', props.state === 'disabled' && 'is-disabled', props.className) },
      h('div', { className: 'az-date-head' },
        props.rank ? h('span', { className: 'az-date-rank' }, props.rank) : null,
        h('span', { className: 'az-date-when' },
          h('span', { className: 'az-date-day' }, props.date),
          h('span', { className: 'az-date-sub' }, [props.weekday, props.tithi].filter(Boolean).join(' · '))),
        h('span', { className: 'az-date-score' }, h('b', { className: 'az-times' }, props.score), h('small', null, '/' + max))),
      props.window ? h('div', { className: 'az-date-window' }, h(Icon, { name: 'clock', size: 18 }), h('span', { className: 'az-times' }, props.window)) : null,
      h('div', { className: 'az-date-chips' }, h(StatusChip, { status: status, lang: lang }), props.approximate ? h(ApproxTag, { lang: lang }) : null),
      props.reasons && props.reasons.length ? h('ul', { className: 'az-date-reasons' }, props.reasons.slice(0, 3).map(function (r, i) {
        var o = typeof r === 'string' ? { text: r, status: 'good' } : r;
        return h('li', { key: i, className: 'az-date-reason-' + o.status }, h(Icon, { name: STATUS[o.status].icon, size: 18, title: STATUS[o.status][lang] }), h('span', null, o.text));
      })) : null,
      h('div', { className: 'az-date-foot' },
        props.onWhy !== null ? h(WhyLink, { lang: lang, onClick: props.onWhy }) : null,
        props.action ? h(Button, { variant: 'secondary', lang: lang, onClick: props.onAction }, props.action) : null));
  }

  /* ---------- WhySheet ---------- */
  function WhySheet(props) {
    var lang = L(props.lang);
    if (props.open === false) return null;
    var sheet = h('div', { className: cx('az', 'az-' + lang, 'az-sheet'), role: 'dialog', 'aria-modal': !props.inline, 'aria-label': props.title },
      h('span', { className: 'az-sheet-grab', 'aria-hidden': true }),
      h('div', { className: 'az-sheet-head' },
        h('span', { className: 'az-sheet-kicker' }, h(Icon, { name: 'why', size: 18 }), WHY[lang]),
        h('button', { type: 'button', className: 'az-icon-btn', onClick: props.onClose, 'aria-label': t(lang, 'మూసివేయి', 'Close') }, h(Icon, { name: 'close', size: 22 }))),
      h('h2', { className: 'az-sheet-title' }, props.title),
      props.children ? h('div', { className: 'az-sheet-body' }, props.children) : null,
      props.factors && props.factors.length ? h('dl', { className: 'az-sheet-factors' }, props.factors.map(function (f, i) {
        return h('div', { key: i, className: 'az-sheet-factor' },
          h('dt', null, f.label),
          h('dd', null, f.status ? h(Icon, { name: STATUS[f.status].icon, size: 18, title: STATUS[f.status][lang], className: 'az-tone-' + f.status }) : null, h('span', null, f.value)));
      })) : null,
      props.method ? h('p', { className: 'az-sheet-method' }, h(Icon, { name: 'palm-leaf', size: 18 }), h('span', null, props.method)) : null);
    return h('div', { className: cx('az-sheet-wrap', props.inline && 'is-inline', props.className) },
      h('div', { className: 'az-sheet-scrim', onClick: props.onClose }), sheet);
  }

  /* ---------- TodoList ---------- */
  function TodoList(props) {
    var lang = L(props.lang);
    var init = (props.items || []).map(function (x) { return !!x.done; });
    var st = useState(init);
    var done = st[0];
    function toggle(i) {
      var next = done.slice(); next[i] = !next[i]; st[1](next);
      if (props.onToggle) props.onToggle(i, next[i]);
    }
    return h('section', { className: cx('az', 'az-' + lang, 'az-card', 'az-todo', props.className) },
      props.title ? h('h3', { className: 'az-todo-title' }, h(Icon, { name: 'diya', size: 22 }), props.title) : null,
      h('ul', null, (props.items || []).map(function (it, i) {
        var id = 'az-todo-' + (props.id || 'x') + '-' + i;
        return h('li', { key: i, className: cx('az-todo-item', done[i] && 'is-done') },
          h('input', { type: 'checkbox', id: id, checked: done[i], onChange: function () { toggle(i); }, disabled: props.disabled }),
          h('label', { htmlFor: id },
            h('span', { className: 'az-todo-box', 'aria-hidden': true }, h(Icon, { name: 'check', size: 18 })),
            h('span', { className: 'az-todo-text' }, it.text, it.when ? h('span', { className: 'az-todo-when' }, it.when) : null),
            it.free === false ? null : h('span', { className: 'az-free' }, FREE[lang])));
      })));
  }

  /* ---------- BottomNav ---------- */
  var NAV = [
    { id: 'today', icon: 'sunrise', te: 'నేడు', en: 'Today' },
    { id: 'wishes', icon: 'kalasham', te: 'కోరికలు', en: 'Wishes' },
    { id: 'family', icon: 'family', te: 'కుటుంబం', en: 'Family' },
    { id: 'more', icon: 'more', te: 'మరిన్ని', en: 'More' }
  ];
  function BottomNav(props) {
    var lang = L(props.lang);
    var st = useState(props.active || 'today');
    var active = props.active || st[0];
    return h('nav', { className: cx('az', 'az-' + lang, 'az-nav', props.className), 'aria-label': t(lang, 'ప్రధాన మెను', 'Main') },
      NAV.map(function (n) {
        var on = n.id === active;
        return h('button', { key: n.id, type: 'button', className: cx('az-nav-item', on && 'is-on'), 'aria-current': on ? 'page' : undefined, onClick: function () { st[1](n.id); if (props.onChange) props.onChange(n.id); } },
          h('span', { className: 'az-nav-pill' }, h(Icon, { name: n.icon, size: 24 })),
          h('span', { className: 'az-nav-label' }, n[lang]));
      }));
  }

  /* ---------- BirthForm ---------- */
  function Field(p) {
    return h('div', { className: cx('az-field', p.error && 'has-error', p.disabled && 'is-disabled') },
      h('label', { htmlFor: p.id, className: 'az-field-label' }, p.label),
      p.children,
      p.error ? h('span', { className: 'az-field-error', id: p.id + '-err' }, h(Icon, { name: 'crossed-circle', size: 16 }), p.error)
        : (p.hint ? h('span', { className: 'az-field-hint' }, p.hint) : null));
  }
  function Segmented(p) {
    return h('div', { className: 'az-seg', role: 'radiogroup', 'aria-label': p.label },
      p.options.map(function (o) {
        var on = p.value === o.value;
        return h('button', { key: o.value, type: 'button', role: 'radio', 'aria-checked': on, className: cx('az-seg-opt', on && 'is-on'), onClick: function () { p.onChange(o.value); } }, o.label);
      }));
  }
  function BirthForm(props) {
    var lang = L(props.lang);
    var v = props.values || {};
    var sGender = useState(v.gender || 'female');
    var sRel = useState(v.relation || 'self');
    var sUnknown = useState(props.state === 'timeUnknown' || !!v.timeUnknown);
    var unknown = sUnknown[0];
    var err = props.state === 'error';
    var uid = props.id || 'bf';
    var gender = [
      { value: 'female', label: t(lang, 'స్త్రీ', 'Female') },
      { value: 'male', label: t(lang, 'పురుషుడు', 'Male') },
      { value: 'other', label: t(lang, 'ఇతర', 'Other') }
    ];
    var rels = [
      ['self', 'నేను', 'Me'], ['spouse', 'జీవిత భాగస్వామి', 'Spouse'], ['son', 'కొడుకు', 'Son'], ['daughter', 'కూతురు', 'Daughter'],
      ['mother', 'అమ్మ', 'Mother'], ['father', 'నాన్న', 'Father'], ['other', 'ఇతరులు', 'Other']
    ];
    return h('form', { className: cx('az', 'az-' + lang, 'az-form', props.className), onSubmit: function (e) { e.preventDefault(); if (props.onSubmit) props.onSubmit(); }, noValidate: true },
      err ? h('div', { className: 'az-form-alert', role: 'alert' }, h(Icon, { name: 'half-diya', size: 20 }), t(lang, 'రెండు వివరాలు సరిచూడండి.', 'Please check two details.')) : null,
      h(Field, { id: uid + '-name', label: t(lang, 'పేరు', 'Name'), error: err ? t(lang, 'పేరు రాయండి — పేరు బలం కోసం కావాలి.', 'Add a name — we use it for peru balam.') : null },
        h('input', { id: uid + '-name', className: 'az-input', defaultValue: err ? '' : (v.name || ''), placeholder: t(lang, 'ఉదా. శ్రావణి', 'e.g. Sravani'), 'aria-invalid': err || undefined })),
      h(Field, { id: uid + '-gender', label: t(lang, 'లింగం', 'Gender') },
        h(Segmented, { label: t(lang, 'లింగం', 'Gender'), options: gender, value: sGender[0], onChange: sGender[1] })),
      h(Field, { id: uid + '-date', label: t(lang, 'పుట్టిన తేదీ', 'Birth date'), error: err ? t(lang, 'తేదీ సరిగా లేదు (రోజు/నెల/సంవత్సరం).', 'That date looks off (DD/MM/YYYY).') : null },
        h('div', { className: 'az-input-wrap' }, h(Icon, { name: 'calendar', size: 20 }),
          h('input', { id: uid + '-date', className: 'az-input az-times', inputMode: 'numeric', defaultValue: err ? '31/02/1994' : (v.date || ''), placeholder: 'DD / MM / YYYY', 'aria-invalid': err || undefined }))),
      h(Field, { id: uid + '-time', label: t(lang, 'పుట్టిన సమయం', 'Birth time'), disabled: unknown, hint: unknown ? null : t(lang, 'జనన పత్రంలో ఉన్న సమయం', 'As on the birth certificate') },
        h('div', { className: 'az-input-wrap' }, h(Icon, { name: 'clock', size: 20 }),
          h('input', { id: uid + '-time', className: 'az-input az-times', inputMode: 'numeric', defaultValue: v.time || '', placeholder: 'HH : MM', disabled: unknown }))),
      h('label', { className: 'az-switch' },
        h('input', { type: 'checkbox', role: 'switch', checked: unknown, onChange: function () { sUnknown[1](!unknown); } }),
        h('span', { className: 'az-switch-track', 'aria-hidden': true }, h('span', { className: 'az-switch-thumb' })),
        h('span', null, t(lang, 'సమయం తెలియదు', 'Time not known'))),
      unknown ? h('div', { className: 'az-form-note' }, h(Icon, { name: 'clock', size: 20 }),
        h('span', null, t(lang, 'పర్వాలేదు. రాశి, నక్షత్రం దాదాపు సరిగానే వస్తాయి; లగ్నం, దశ "సుమారు" అని చూపిస్తాం.', 'No problem. Rasi and nakshatram stay close; lagna and dasha will be marked "approximate".'))) : null,
      h(Field, { id: uid + '-place', label: t(lang, 'పుట్టిన ఊరు', 'Birthplace'), hint: t(lang, 'ఇంటర్నెట్ లేకపోయినా వెతకొచ్చు', 'Search works offline') },
        h('div', { className: 'az-input-wrap' }, h(Icon, { name: 'search', size: 20 }),
          h('input', { id: uid + '-place', className: 'az-input', defaultValue: v.place || '', placeholder: t(lang, 'ఊరు లేదా జిల్లా', 'Town or district') }))),
      v.placeResults ? h('ul', { className: 'az-place-results', role: 'listbox' }, v.placeResults.map(function (p, i) {
        return h('li', { key: i, role: 'option', 'aria-selected': i === 0 }, h(Icon, { name: 'location', size: 20 }), h('span', null, h('b', null, p[0]), h('small', null, p[1])));
      })) : null,
      h(Field, { id: uid + '-rel', label: t(lang, 'మీకు ఏమవుతారు', 'Relation to you') },
        h('div', { className: 'az-rel', role: 'radiogroup' }, rels.map(function (r) {
          var on = sRel[0] === r[0];
          return h('button', { key: r[0], type: 'button', role: 'radio', 'aria-checked': on, className: cx('az-rel-opt', on && 'is-on'), onClick: function () { sRel[1](r[0]); } }, lang === 'en' ? r[2] : r[1]);
        }))),
      h(Button, { variant: 'primary', block: true, lang: lang, type: 'submit' }, props.submitLabel || t(lang, 'జాతకం చూపించు', 'Show my chart')),
      h('p', { className: 'az-form-privacy' }, h(Icon, { name: 'lock', size: 18 }), t(lang, 'ఈ వివరాలు ఈ ఫోన్‌లోనే ఉంటాయి.', 'These details stay on this phone.')));
  }

  function Thoranam(props) {
    var leaves = [];
    for (var i = 0; i <= 8; i++) {
      var tt = i / 8, x = 4 + 232 * tt, y = 6 + 2 * tt * (1 - tt) * 16;
      var len = i % 2 ? 16 : 22, w = i % 2 ? 4.5 : 5.5;
      leaves.push(h('path', { key: i, className: 'az-thoranam-leaf', d: 'M' + x.toFixed(1) + ' ' + y.toFixed(1) + 'c' + (-w) + ' ' + (len * 0.3) + ' ' + (-w) + ' ' + (len * 0.7) + ' 0 ' + len + 'c' + w + ' ' + (-len * 0.3) + ' ' + w + ' ' + (-len * 0.7) + ' 0 ' + (-len) + 'z' }));
    }
    return h('svg', { className: props.className, viewBox: '0 0 240 40', width: 240, height: 40, fill: 'none', 'aria-hidden': true },
      h('path', { className: 'az-thoranam-string', d: 'M4 6Q120 22 236 6' }), leaves);
  }

  /* ---------- ShareCard ---------- */
  function ShareCard(props) {
    var lang = L(props.lang);
    var max = props.max || 36;
    var band = props.status || gunaBand(props.score || 0, max);
    var corner = function (cls) {
      return h('svg', { className: 'az-share-corner ' + cls, viewBox: '0 0 24 24', width: 40, height: 40, fill: 'none', 'aria-hidden': true, dangerouslySetInnerHTML: { __html: ICONS.muggulu } });
    };
    return h('figure', { className: cx('az', 'az-' + lang, 'az-share', props.className) },
      h(Thoranam, { className: 'az-share-thoranam' }),
      corner('tl'), corner('tr'), corner('bl'), corner('br'),
      h('span', { className: 'az-share-kicker' }, t(lang, 'పెళ్లి పొంతన', 'Marriage matching')),
      h('span', { className: 'az-share-names' }, (props.names || []).join(' & ')),
      h('span', { className: 'az-share-score' }, h('b', null, props.score), h('small', null, '/' + max)),
      h(StatusChip, { status: band, lang: lang, variant: 'solid', label: props.verdict || BAND_LABEL[band][lang] }),
      props.approximate ? h(ApproxTag, { lang: lang }) : null,
      h('figcaption', { className: 'az-share-foot' },
        h('span', { className: 'az-share-brand' }, 'AstroZ'),
        h('span', null, t(lang, 'జనన వివరాలు పంచుకోలేదు', 'No birth details shared'))));
  }

  var api = {
    Icon: Icon, Button: Button, StatusChip: StatusChip, LangToggle: LangToggle, Muggulu: Muggulu,
    WishCard: WishCard, ProfileChip: ProfileChip, DayRibbon: DayRibbon, GunaDial: GunaDial,
    KootaRow: KootaRow, DoshaCallout: DoshaCallout, DateResultCard: DateResultCard, WhySheet: WhySheet,
    TodoList: TodoList, BottomNav: BottomNav, BirthForm: BirthForm, ShareCard: ShareCard,
    icons: Object.keys(ICONS), STATUS: STATUS, PERIODS: PERIODS, KOOTAS: KOOTAS
  };
  window.AstroZ = Object.assign(window.AstroZ || {}, api);
})();
