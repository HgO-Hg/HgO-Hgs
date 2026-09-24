(function () {
  'use strict';

  /* ============================================================
  *本网站由HgO-Hg制作,AI辅助制作.如有任何问题请联系374981268@QQ.com
  *本网站的制作初心是为了给各位懒得(或难于)自己设计的QSL卡片提供一个方便的工具,并非技术交流.如有任何技术问题欢迎指正!
  *此为javascript代码.
   * ============================================================ */

  var FONT_FALLBACK = '"Helvetica Neue", Helvetica, Arial, "Microsoft YaHei", "PingFang SC", sans-serif';
  var DEFAULT_FONT  = 'system-ui, -apple-system, "Segoe UI", "Microsoft YaHei", "PingFang SC", sans-serif';

  /* -------- 预设定义 -------- */
  var PRESETS = {
    default: {
      name: '经典红',
      swatch: ['#c0392b', '#616161'],
      vals: {
        callColor:           '#c0392b',
        headLineColor:       '#c0392b',
        tableBorderColor:    '#c0392b',
        lineColor:           '#c0392b',
        tableTextColor:      '#616161',
        tableTextStrokeColor:'#ffffff',
        fontFamily:          DEFAULT_FONT
      }
    },
    mono: {
      name: '简约黑白',
      swatch: ['#1a1a1a', '#666666'],
      vals: {
        callColor:           '#1a1a1a',
        headLineColor:       '#1a1a1a',
        tableBorderColor:    '#1a1a1a',
        lineColor:           '#1a1a1a',
        tableTextColor:      '#1a1a1a',
        tableTextStrokeColor:'#ffffff',
        fontFamily:          'Arial, Helvetica, sans-serif'
      }
    },
    ocean: {
      name: '海洋蓝',
      swatch: ['#1565c0', '#42a5f5'],
      vals: {
        callColor:           '#1565c0',
        headLineColor:       '#1976d2',
        tableBorderColor:    '#1565c0',
        lineColor:           '#42a5f5',
        tableTextColor:      '#0d47a1',
        tableTextStrokeColor:'#ffffff',
        fontFamily:          '"Microsoft YaHei", "PingFang SC", sans-serif'
      }
    },
    forest: {
      name: '森林绿',
      swatch: ['#2e7d32', '#66bb6a'],
      vals: {
        callColor:           '#2e7d32',
        headLineColor:       '#388e3c',
        tableBorderColor:    '#2e7d32',
        lineColor:           '#66bb6a',
        tableTextColor:      '#1b5e20',
        tableTextStrokeColor:'#ffffff',
        fontFamily:          '"Microsoft YaHei", "PingFang SC", sans-serif'
      }
    },
    retro: {
      name: '复古暖棕',
      swatch: ['#8d6e63', '#a1887f'],
      vals: {
        callColor:           '#8d6e63',
        headLineColor:       '#795548',
        tableBorderColor:    '#795548',
        lineColor:           '#a1887f',
        tableTextColor:      '#4e342e',
        tableTextStrokeColor:'#fff8e1',
        fontFamily:          'Georgia, "Times New Roman", serif'
      }
    },
    purple: {
      name: '浪漫紫',
      swatch: ['#6a1b9a', '#ab47bc'],
      vals: {
        callColor:           '#6a1b9a',
        headLineColor:       '#8e24aa',
        tableBorderColor:    '#6a1b9a',
        lineColor:           '#ab47bc',
        tableTextColor:      '#4a148c',
        tableTextStrokeColor:'#ffffff',
        fontFamily:          '"Microsoft YaHei", "PingFang SC", sans-serif'
      }
    }
  };

  var currentPresetKey = 'default';

  var frontCanvas = document.getElementById('front');
  var backCanvas  = document.getElementById('back');

  var imgs = { front: null, back: null, logo: null, backLogo: null };
  var dragFrontState = null;
  var dragBackState  = null;
  var rafId = null;

  /* ---------------- 基础工具 ---------------- */
  function $(id) { return document.getElementById(id); }
  function num(id) { var v = parseFloat($(id).value); return isNaN(v) ? 0 : v; }
  function val(id) { return $(id).value; }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }

  function roundRectPath(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y,     x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x,     y + h, r);
    ctx.arcTo(x,     y + h, x,     y,     r);
    ctx.arcTo(x,     y,     x + w, y,     r);
    ctx.closePath();
  }

  function drawCover(ctx, img, x, y, w, h) {
    var ir = img.width / img.height, br = w / h;
    var sx = 0, sy = 0, sw = img.width, sh = img.height;
    if (ir > br) { sw = img.height * br; sx = (img.width - sw) / 2; }
    else         { sh = img.width / br;  sy = (img.height - sh) / 2; }
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  }

  function drawContain(ctx, img, x, y, w, h) {
    var ir = img.width / img.height, br = w / h, dw, dh;
    if (ir > br) { dw = w; dh = w / ir; }
    else         { dw = h * ir; dh = h; }
    ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  }

  function fitFont(ctx, text, maxW, size, weight, family) {
    family = family || FONT_FALLBACK;
    ctx.font = weight + ' ' + size + 'px ' + family;
    var guard = 0;
    while (text && ctx.measureText(text).width > maxW && size > 0.8 && guard++ < 300) {
      size *= 0.95;
      ctx.font = weight + ' ' + size + 'px ' + family;
    }
    return size;
  }

  /* 用于命中检测的尺寸测量（不依赖具体 canvas 变换） */
  var _measureCanvas = document.createElement('canvas');
  var _measureCtx = _measureCanvas.getContext('2d');

  function measureFitText(text, maxW, size, weight, family) {
    family = family || FONT_FALLBACK;
    _measureCtx.font = weight + ' ' + size + 'px ' + family;
    var guard = 0;
    while (text && _measureCtx.measureText(text).width > maxW && size > 0.8 && guard++ < 300) {
      size *= 0.95;
      _measureCtx.font = weight + ' ' + size + 'px ' + family;
    }
    return {
      size: size,
      width: text ? _measureCtx.measureText(text).width : 0
    };
  }

  /* ---------------- 字体 ---------------- */
  function getFontFamily() {
    var sel = val('fontFamily');
    if (sel === 'custom') {
      var cf = val('customFont').trim();
      return cf || FONT_FALLBACK;
    }
    return sel || FONT_FALLBACK;
  }

  /* ---------------- 方向计算 ---------------- */
  function getSizes() {
    var w0 = num('cardW'), h0 = num('cardH');
    var basePortrait = (val('cardOrientation') === 'portrait');

    function swapFor(flipSel) {
      var swap = basePortrait;
      if (val(flipSel) === 'flip') swap = !swap;
      return swap;
    }
    var fs = swapFor('frontFlip');
    var bs = swapFor('backFlip');

    return {
      frontW: fs ? h0 : w0,
      frontH: fs ? w0 : h0,
      backW:  bs ? h0 : w0,
      backH:  bs ? w0 : h0
    };
  }

  /* ---------------- 元素矩形（用于命中检测） ---------------- */
  function tableRect(c, W, H) {
    var tw = W * c.tp.w / 100;
    var th = c.tp.rowH * c.rows.length;
    return {
      x: W * c.tp.x / 100 - tw / 2,
      y: H * c.tp.y / 100 - th / 2,
      w: tw, h: th
    };
  }

  function getFrontLogoRect(c, W, H) {
    if (!imgs.logo) return null;
    var lh = Math.min(c.logoH, H * 0.30);
    var lw = imgs.logo.width / imgs.logo.height * lh;
    var maxLW = W * 0.45;
    var k = lw > maxLW ? maxLW / lw : 1;
    var drawW = lw * k, drawH = lh * k;
    var lcx = W * c.logoX / 100;
    var lcy = H * c.logoY / 100;
    return { x: lcx - drawW / 2, y: lcy - drawH / 2, w: drawW, h: drawH };
  }

  function getFrontFooterRect(c, W, H) {
    if (!c.footer) return null;
    var fSz = H * 0.038 * (c.footerSize / 100);
    var m = measureFitText(c.footer, W * 0.92, fSz, '500', c.fontFamily);
    var fx = W * c.footerX / 100;
    var fy = H * c.footerY / 100;
    var pad = Math.max(1.5, m.size * 0.25);
    return {
      x: fx - m.width / 2 - pad,
      y: fy - m.size * 0.7 - pad,
      w: m.width + pad * 2,
      h: m.size * 1.4 + pad * 2
    };
  }

  function getBackLogoRect(c, W, H) {
    if (!imgs.backLogo) return null;
    var blh = Math.min(c.backLogoH, H * 0.35);
    var blw = imgs.backLogo.width / imgs.backLogo.height * blh;
    var bcx = W * c.backLogoX / 100;
    var bcy = H * c.backLogoY / 100;
    return { x: bcx - blw / 2, y: bcy - blh / 2, w: blw, h: blh };
  }

  function getBackTextRect(c, W, H) {
    if (!c.showBackText || !c.backText) return null;
    var bSz = H * 0.075 * (c.backTextSize / 100);
    var m = measureFitText(c.backText, W * 0.92, bSz, '700', c.fontFamily);
    var bx = W * c.backTextX / 100;
    var by = H * c.backTextY / 100;
    var pad = Math.max(1.5, m.size * 0.25);
    return {
      x: bx - m.width / 2 - pad,
      y: by - m.size * 0.7 - pad,
      w: m.width + pad * 2,
      h: m.size * 1.4 + pad * 2
    };
  }

  function inRect(p, r) {
    return r && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  }

  /* ---------------- 读取配置 ---------------- */
  function getCfg() {
    return {
      radius: num('radius'),
      fontFamily: getFontFamily(),

      myCall: val('myCall'),
      callColor: val('callColor'),
      callX: num('callX'),
      callY: num('callY'),
      callSize: num('callSize'),

      headLineEnable: $('headLineEnable').checked,
      headLineColor: val('headLineColor'),
      headLineAlpha: num('headLineAlpha') / 100,
      headLineWidth: num('headLineWidth'),
      headLineY: num('headLineY'),

      footer: val('footer'),
      footerColor: val('footerColor'),
      footerX: num('footerX'),
      footerY: num('footerY'),
      footerSize: num('footerSize'),
      footerStrokeEnable: $('footerStrokeEnable').checked,
      footerStroke: num('footerStroke'),
      footerStrokeColor: val('footerStrokeColor'),
      footerStrokeAlpha: num('footerStrokeAlpha') / 100,

      logoH: num('logoH'),
      logoX: num('logoX'),
      logoY: num('logoY'),

      frontFit: val('frontFit'),
      bgDim: num('bgDim') / 100,

      panelAlpha: num('panelAlpha') / 100,
      tableTextOpacity: num('tableTextOpacity') / 100,
      tableTextColor: val('tableTextColor'),
      tableTextStrokeEnable: $('tableTextStrokeEnable').checked,
      tableTextStroke: num('tableTextStroke'),
      tableTextStrokeColor: val('tableTextStrokeColor'),
      tableTextStrokeAlpha: num('tableTextStrokeAlpha') / 100,
      tableBorderColor: val('tableBorderColor'),
      lineColor: val('lineColor'),

      tp: {
        x: num('tpX'), y: num('tpY'), w: num('tpW'),
        rowH: num('rowH'), fs: num('fontScale') / 100
      },

      rows: [
        ['我方呼号 MY CALL', ''],
        ['对方呼号 TO',      ''],
        ['时间 TIME',        ''],
        ['频率 FREQ',        ''],
        ['模式 MODE',        ''],
        ['信号报告 RST',     '']
      ],

      backFit: val('backFit'),
      backBgDim: num('backBgDim') / 100,

      backLogoH: num('backLogoH'),
      backLogoX: num('backLogoX'),
      backLogoY: num('backLogoY'),

      showBackText: $('showBackText').checked,
      backText: val('backText'),
      backTextColor: val('backTextColor'),
      backTextX: num('backTextX'),
      backTextY: num('backTextY'),
      backTextSize: num('backTextSize'),
      backTextStrokeEnable: $('backTextStrokeEnable').checked,
      backTextStroke: num('backTextStroke'),
      backTextStrokeColor: val('backTextStrokeColor'),
      backTextStrokeAlpha: num('backTextStrokeAlpha') / 100
    };
  }

  /* ---------------- 初始化画布 ---------------- */
  function prepCanvas(canvas, wmm, hmm, dpi) {
    var ppm = dpi / 25.4;
    canvas.width  = Math.max(1, Math.round(wmm * ppm));
    canvas.height = Math.max(1, Math.round(hmm * ppm));
    var ctx = canvas.getContext('2d');
    ctx.setTransform(ppm, 0, 0, ppm, 0, 0);
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    return ctx;
  }

  /* ============================ 正面 ============================ */
  function renderFront() {
    var c = getCfg();
    var s = getSizes();
    var W = s.frontW, H = s.frontH;
    var ctx = prepCanvas(frontCanvas, W, H, num('dpi'));

    ctx.save();
    roundRectPath(ctx, 0, 0, W, H, c.radius);
    ctx.clip();

    /* --- 背景 --- */
    if (imgs.front) {
      if (c.frontFit === 'contain') {
        ctx.fillStyle = '#f0ece4';
        ctx.fillRect(0, 0, W, H);
        drawContain(ctx, imgs.front, 0, 0, W, H);
      } else {
        drawCover(ctx, imgs.front, 0, 0, W, H);
      }
    } else {
      var g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, '#fdfbf7');
      g.addColorStop(1, '#e9e2d5');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }

    if (c.bgDim > 0) {
      ctx.fillStyle = 'rgba(0,0,0,' + c.bgDim + ')';
      ctx.fillRect(0, 0, W, H);
    }

    drawFrontContent(ctx, c, W, H);

    ctx.restore();

    roundRectPath(ctx, 0.3, 0.3, W - 0.6, H - 0.6, Math.max(0, c.radius - 0.3));
    ctx.strokeStyle = 'rgba(0,0,0,0.20)';
    ctx.lineWidth = 0.6;
    ctx.stroke();
  }

  function drawFrontContent(ctx, c, W, H) {
    var pad = W * 0.05;

    /* --- LOGO --- */
    if (imgs.logo) {
      var lh = Math.min(c.logoH, H * 0.30);
      var lw = imgs.logo.width / imgs.logo.height * lh;
      var maxLW = W * 0.45;
      var k = lw > maxLW ? maxLW / lw : 1;
      var drawW = lw * k, drawH = lh * k;
      var lcx = W * c.logoX / 100;
      var lcy = H * c.logoY / 100;
      ctx.drawImage(imgs.logo, lcx - drawW / 2, lcy - drawH / 2, drawW, drawH);
    }

    /* --- 大号呼号 --- */
    if (c.myCall) {
      var callPx = W * c.callX / 100;
      var callPy = H * c.callY / 100;
      var callSz = H * 0.115 * (c.callSize / 100);
      fitFont(ctx, c.myCall, W - pad * 2, callSz, '800', c.fontFamily);
      ctx.fillStyle = c.callColor;
      ctx.textAlign = 'right';
      ctx.fillText(c.myCall, callPx, callPy);
      ctx.textAlign = 'left';
    }

    /* --- 头部横线 --- */
    if (c.headLineEnable) {
      var hlY = H * c.headLineY / 100;
      ctx.beginPath();
      ctx.moveTo(pad, hlY);
      ctx.lineTo(W - pad, hlY);
      ctx.strokeStyle = c.headLineColor;
      ctx.globalAlpha = c.headLineAlpha;
      ctx.lineWidth = c.headLineWidth;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    /* --- 表格 --- */
    var tw = W * c.tp.w / 100;
    var th = c.tp.rowH * c.rows.length;
    var tx = W * c.tp.x / 100 - tw / 2;
    var ty = H * c.tp.y / 100 - th / 2;
    drawTable(ctx, c, tx, ty, tw, th);

    /* --- 页脚地址 --- */
    if (c.footer) {
      var fx = W * c.footerX / 100;
      var fy = H * c.footerY / 100;
      var fSz = H * 0.038 * (c.footerSize / 100);

      ctx.textAlign = 'center';
      fitFont(ctx, c.footer, W * 0.92, fSz, '500', c.fontFamily);

      if (c.footerStrokeEnable && c.footerStroke > 0) {
        ctx.save();
        ctx.lineJoin = 'round';
        ctx.miterLimit = 2;
        ctx.globalAlpha = c.footerStrokeAlpha;
        ctx.strokeStyle = c.footerStrokeColor;
        ctx.lineWidth = c.footerStroke;
        ctx.strokeText(c.footer, fx, fy);
        ctx.restore();
      }

      ctx.fillStyle = c.footerColor;
      ctx.globalAlpha = 0.95;
      ctx.fillText(c.footer, fx, fy);
      ctx.globalAlpha = 1;
      ctx.textAlign = 'left';
    }
  }

  function drawTable(ctx, c, x, y, w, h) {
    var rows   = c.rows;
    var n      = rows.length;
    var rowH   = h / n;
    var labelW = w * 0.40;

    ctx.save();
    roundRectPath(ctx, x, y, w, h, 1.5);
    ctx.clip();

    ctx.fillStyle = 'rgba(255,255,255,' + c.panelAlpha + ')';
    ctx.fillRect(x, y, w, h);

    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    ctx.fillRect(x, y, labelW, h);

    ctx.strokeStyle = c.lineColor;
    ctx.lineWidth = 0.25;
    for (var i = 1; i < n; i++) {
      var ly = y + i * rowH;
      ctx.beginPath();
      ctx.moveTo(x, ly);
      ctx.lineTo(x + w, ly);
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.moveTo(x + labelW, y);
    ctx.lineTo(x + labelW, y + h);
    ctx.stroke();

    roundRectPath(ctx, x, y, w, h, 1.5);
    ctx.strokeStyle = c.tableBorderColor;
    ctx.lineWidth = 0.5;
    ctx.stroke();

    ctx.restore();

    var padX = 2.6;
    for (var j = 0; j < n; j++) {
      var label = rows[j][0];
      var cy = y + j * rowH + rowH / 2;

      ctx.save();
      ctx.textAlign = 'left';
      fitFont(ctx, label, labelW - padX * 2, rowH * 0.36 * c.tp.fs, '600', c.fontFamily);

      if (c.tableTextStrokeEnable && c.tableTextStroke > 0) {
        ctx.save();
        ctx.lineJoin = 'round';
        ctx.miterLimit = 2;
        ctx.globalAlpha = c.tableTextOpacity * c.tableTextStrokeAlpha;
        ctx.strokeStyle = c.tableTextStrokeColor;
        ctx.lineWidth = c.tableTextStroke;
        ctx.strokeText(label, x + padX, cy);
        ctx.restore();
      }

      ctx.globalAlpha = c.tableTextOpacity;
      ctx.fillStyle = c.tableTextColor;
      ctx.fillText(label, x + padX, cy);

      ctx.restore();
    }
  }

  /* ============================ 背面 ============================ */
  function renderBack() {
    var c = getCfg();
    var s = getSizes();
    var W = s.backW, H = s.backH;
    var ctx = prepCanvas(backCanvas, W, H, num('dpi'));

    ctx.save();
    roundRectPath(ctx, 0, 0, W, H, c.radius);
    ctx.clip();

    if (imgs.back) {
      if (c.backFit === 'contain') {
        ctx.fillStyle = '#101418';
        ctx.fillRect(0, 0, W, H);
        drawContain(ctx, imgs.back, 0, 0, W, H);
      } else {
        drawCover(ctx, imgs.back, 0, 0, W, H);
      }
    } else {
      var g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, '#e8eef5');
      g.addColorStop(1, '#cbd8e6');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(20,40,60,0.45)';
      ctx.font = '500 ' + (H * 0.05) + 'px ' + c.fontFamily;
      ctx.fillText('上传风景照作为卡片背面', W / 2, H / 2);
      ctx.textAlign = 'left';
    }

    if (c.backBgDim > 0) {
      ctx.fillStyle = 'rgba(0,0,0,' + c.backBgDim + ')';
      ctx.fillRect(0, 0, W, H);
    }

    if (imgs.backLogo) {
      var blh = Math.min(c.backLogoH, H * 0.35);
      var blw = imgs.backLogo.width / imgs.backLogo.height * blh;
      var bcx = W * c.backLogoX / 100;
      var bcy = H * c.backLogoY / 100;
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.35)';
      ctx.shadowBlur = 3;
      ctx.drawImage(imgs.backLogo, bcx - blw / 2, bcy - blh / 2, blw, blh);
      ctx.restore();
    }

    if (c.showBackText && c.backText) {
      var bx = W * c.backTextX / 100;
      var by = H * c.backTextY / 100;
      var bSz = H * 0.075 * (c.backTextSize / 100);

      ctx.textAlign = 'center';
      fitFont(ctx, c.backText, W * 0.92, bSz, '700', c.fontFamily);

      if (c.backTextStrokeEnable && c.backTextStroke > 0) {
        ctx.save();
        ctx.lineJoin = 'round';
        ctx.miterLimit = 2;
        ctx.globalAlpha = c.backTextStrokeAlpha;
        ctx.strokeStyle = c.backTextStrokeColor;
        ctx.lineWidth = c.backTextStroke;
        ctx.strokeText(c.backText, bx, by);
        ctx.restore();
      }

      ctx.fillStyle = c.backTextColor;
      ctx.fillText(c.backText, bx, by);
      ctx.textAlign = 'left';
    }

    ctx.restore();

    roundRectPath(ctx, 0.3, 0.3, W - 0.6, H - 0.6, Math.max(0, c.radius - 0.3));
    ctx.strokeStyle = 'rgba(0,0,0,0.20)';
    ctx.lineWidth = 0.6;
    ctx.stroke();
  }

  /* ---------------- 渲染调度 ---------------- */
  function render() {
    if (rafId) return;
    rafId = requestAnimationFrame(function () {
      rafId = null;
      renderFront();
      renderBack();
    });
  }

  /* ---------------- 预设面板构建 ---------------- */
  function buildPresetGrid() {
    var grid = $('presetGrid');
    grid.innerHTML = '';

    Object.keys(PRESETS).forEach(function (key) {
      var p = PRESETS[key];
      var card = document.createElement('div');
      card.className = 'presetCard' + (key === currentPresetKey ? ' active' : '');
      card.setAttribute('data-key', key);

      var sw1 = document.createElement('div');
      sw1.className = 'presetSwatch';
      sw1.style.background = 'linear-gradient(90deg,' + p.swatch[0] + ' 0 50%,' + p.swatch[1] + ' 50% 100%)';

      var nm = document.createElement('div');
      nm.className = 'presetName';
      nm.textContent = p.name;

      card.appendChild(sw1);
      card.appendChild(nm);

      card.addEventListener('click', function () {
        currentPresetKey = key;
        Array.prototype.forEach.call(
          grid.querySelectorAll('.presetCard'),
          function (el) { el.classList.toggle('active', el.getAttribute('data-key') === key); }
        );
      });

      grid.appendChild(card);
    });
  }

  function applyPreset(key) {
    var p = PRESETS[key];
    if (!p) return;

    Object.keys(p.vals).forEach(function (id) {
      var el = $(id);
      if (el) el.value = p.vals[id];
    });

    $('customFontRow').style.display = 'none';
    syncLabels();
    render();
  }

  $('applyPreset').addEventListener('click', function () {
    applyPreset(currentPresetKey);
  });

  /* ==================================================
   * 滑块 + 数字输入框 双向绑定
   * ================================================== */
  function buildRangeNumberPairs() {
    var ranges = document.querySelectorAll('#panel input[type=range]');

    Array.prototype.forEach.call(ranges, function (r) {
      if (r._num) return;

      var wrap = document.createElement('div');
      wrap.className = 'rangeWrap';
      r.parentNode.insertBefore(wrap, r);
      wrap.appendChild(r);

      var n = document.createElement('input');
      n.type = 'number';
      n.min = r.min;
      n.max = r.max;
      n.step = r.step;
      n.value = r.value;
      n.className = 'numInp';
      wrap.appendChild(n);

      r._num = n;

      r.addEventListener('input', function () {
        if (document.activeElement !== n) n.value = r.value;
      });

      n.addEventListener('input', function () {
        var v = parseFloat(n.value);
        if (isNaN(v)) return;
        var min = parseFloat(r.min), max = parseFloat(r.max);
        if (v < min) v = min;
        if (v > max) v = max;
        r.value = v;
        r.dispatchEvent(new Event('input', { bubbles: true }));
      });

      n.addEventListener('blur', function () {
        var v = parseFloat(n.value);
        if (isNaN(v)) { n.value = r.value; return; }
        var min = parseFloat(r.min), max = parseFloat(r.max);
        if (v < min) v = min;
        if (v > max) v = max;
        n.value = v;
        r.value = v;
        r.dispatchEvent(new Event('input', { bubbles: true }));
      });
    });
  }

  function syncAllNumberInputs() {
    var ranges = document.querySelectorAll('#panel input[type=range]');
    Array.prototype.forEach.call(ranges, function (r) {
      if (r._num && document.activeElement !== r._num) {
        r._num.value = r.value;
      }
    });
  }

  /* ---------------- 滑块数值显示 ---------------- */
  function st(id, v) { var el = $(id); if (el) el.textContent = v; }

  function syncLabels() {
    st('vCallSize',         $('callSize').value);
    st('vCallX',            $('callX').value);
    st('vCallY',            $('callY').value);

    st('vHeadLineAlpha',    $('headLineAlpha').value);
    st('vHeadLineWidth',    $('headLineWidth').value);
    st('vHeadLineY',        $('headLineY').value);

    st('vFooterSize',       $('footerSize').value);
    st('vFooterX',          $('footerX').value);
    st('vFooterY',          $('footerY').value);
    st('vFooterStroke',     $('footerStroke').value);
    st('vFooterStrokeAlpha',$('footerStrokeAlpha').value);

    st('vLogoH',            $('logoH').value);
    st('vLogoX',            $('logoX').value);
    st('vLogoY',            $('logoY').value);
    st('vBgDim',            $('bgDim').value);

    st('vPanel',            $('panelAlpha').value);
    st('vTableTextOpacity', $('tableTextOpacity').value);
    st('vTableTextStroke',  $('tableTextStroke').value);
    st('vTableTextStrokeAlpha', $('tableTextStrokeAlpha').value);

    st('vTpX',              $('tpX').value);
    st('vTpY',              $('tpY').value);
    st('vTpW',              $('tpW').value);
    st('vRowH',             $('rowH').value);
    st('vFs',               $('fontScale').value);

    st('vBackBgDim',        $('backBgDim').value);
    st('vBackLogoH',        $('backLogoH').value);
    st('vBackLogoX',        $('backLogoX').value);
    st('vBackLogoY',        $('backLogoY').value);

    st('vBackTextSize',     $('backTextSize').value);
    st('vBackTextX',        $('backTextX').value);
    st('vBackTextY',        $('backTextY').value);
    st('vBackTextStroke',   $('backTextStroke').value);
    st('vBackTextStrokeAlpha', $('backTextStrokeAlpha').value);

    syncAllNumberInputs();
  }

  /* ---------------- 重置配置 ---------------- */
  var RESET_MAP = {
    size: {
      vals: { cardW:140, cardH:90, preset:'140,90', dpi:'300', radius:3,
              cardOrientation:'landscape', frontFlip:'same', backFlip:'same' }
    },
    preset: {
      after: function () {
        currentPresetKey = 'default';
        buildPresetGrid();
      }
    },
    font: {
      vals: { fontFamily: DEFAULT_FONT, customFont:'' },
      after: function () { $('customFontRow').style.display = 'none'; }
    },
    call: {
      vals: { myCall:'', callColor:'#c0392b', callSize:100, callX:95, callY:11 }
    },
    headline: {
      vals: { headLineColor:'#c0392b', headLineAlpha:55, headLineWidth:0.4, headLineY:20 },
      checks: { headLineEnable: true }
    },
    footer: {
      vals: { footer:'', footerColor:'#12263a', footerSize:100, footerX:50, footerY:90,
              footerStroke:0.35, footerStrokeColor:'#ffffff', footerStrokeAlpha:100 },
      checks: { footerStrokeEnable: true }
    },
    frontLogo: {
      vals: { logoH:14, logoX:12, logoY:12 },
      imgs: ['logo']
    },
    frontBg: {
      vals: { frontFit:'cover', bgDim:0 },
      imgs: ['front']
    },
    tableStyle: {
      vals: { panelAlpha:92, tableTextOpacity:100, tableTextColor:'#616161',
              tableTextStroke:0.35, tableTextStrokeColor:'#ffffff', tableTextStrokeAlpha:100,
              tableBorderColor:'#c0392b', lineColor:'#c0392b' },
      checks: { tableTextStrokeEnable: true }
    },
    tableLayout: {
      vals: { tpX:50, tpY:52, tpW:76, rowH:7, fontScale:100 }
    },
    backPhoto: {
      vals: { backFit:'cover', backBgDim:0 },
      imgs: ['back']
    },
    backLogo: {
      vals: { backLogoH:12, backLogoX:50, backLogoY:12 },
      imgs: ['backLogo']
    },
    backText: {
      vals: { backText:'', backTextColor:'#ffffff', backTextSize:100, backTextX:50, backTextY:88,
              backTextStroke:0.35, backTextStrokeColor:'#000000', backTextStrokeAlpha:70 },
      checks: { showBackText: true, backTextStrokeEnable: true }
    }
  };

  function resetGroup(name) {
    var g = RESET_MAP[name];
    if (!g) return;

    if (g.vals) {
      Object.keys(g.vals).forEach(function (id) {
        var el = $(id);
        if (el) el.value = g.vals[id];
      });
    }
    if (g.checks) {
      Object.keys(g.checks).forEach(function (id) {
        var el = $(id);
        if (el) el.checked = g.checks[id];
      });
    }
    if (g.imgs) {
      g.imgs.forEach(function (key) {
        imgs[key] = null;
        var inp = $(key + 'File');
        if (inp) inp.value = '';
      });
    }
    if (g.after) g.after();

    syncLabels();
    render();
  }

  Array.prototype.forEach.call(
    document.querySelectorAll('.resetBtn'),
    function (btn) {
      btn.addEventListener('click', function () {
        resetGroup(this.getAttribute('data-reset'));
      });
    }
  );

  /* ---------------- 通用事件绑定 ---------------- */
  Array.prototype.forEach.call(
    document.querySelectorAll('#panel input, #panel select'),
    function (el) {
      if (el.type === 'file') return;
      if (el.classList.contains('numInp')) return;
      el.addEventListener('input',  function () { syncLabels(); render(); });
      el.addEventListener('change', function () { syncLabels(); render(); });
    }
  );

  /* 字体自定义 */
  $('fontFamily').addEventListener('change', function () {
    $('customFontRow').style.display = (this.value === 'custom') ? 'flex' : 'none';
    render();
  });
  $('customFont').addEventListener('input', function () { render(); });

  /* 尺寸预设 */
  $('preset').addEventListener('change', function () {
    if (this.value === 'custom') return;
    var p = this.value.split(',').map(Number);
    $('cardW').value = p[0];
    $('cardH').value = p[1];
    render();
  });
  ['cardW', 'cardH'].forEach(function (id) {
    $(id).addEventListener('input', function () { $('preset').value = 'custom'; });
  });

  /* 图片上传 */
  function bindImage(inputId, key) {
    $(inputId).addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0];
      if (!f) return;
      var url = URL.createObjectURL(f);
      var img = new Image();
      img.onload = function () {
        imgs[key] = img;
        URL.revokeObjectURL(url);
        render();
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        alert('图片加载失败，请换一张试试。');
      };
      img.src = url;
    });
  }
  bindImage('logoFile', 'logo');
  bindImage('frontFile', 'front');
  bindImage('backFile', 'back');
  bindImage('backLogoFile', 'backLogo');

  /* ==================================================
   * 画布拖动：表格 / 正面 LOGO / 页脚 / 背面 LOGO / 背面叠字
   * ================================================== */

  function eventToCanvasPoint(e, canvas, W, H) {
    var rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width  * W,
      y: (e.clientY - rect.top)  / rect.height * H
    };
  }

  /* ---------- 正面 canvas ---------- */
  frontCanvas.addEventListener('pointerdown', function (e) {
    var c = getCfg();
    var s = getSizes();
    var W = s.frontW, H = s.frontH;
    var p = eventToCanvasPoint(e, frontCanvas, W, H);

    var footerR = getFrontFooterRect(c, W, H);
    if (inRect(p, footerR)) {
      dragFrontState = {
        type: 'footer',
        offX: p.x - W * c.footerX / 100,
        offY: p.y - H * c.footerY / 100
      };
      frontCanvas.setPointerCapture(e.pointerId);
      frontCanvas.style.cursor = 'grabbing';
      e.preventDefault();
      return;
    }

    var tableR = tableRect(c, W, H);
    if (inRect(p, tableR)) {
      dragFrontState = {
        type: 'table',
        offX: p.x - (tableR.x + tableR.w / 2),
        offY: p.y - (tableR.y + tableR.h / 2)
      };
      frontCanvas.setPointerCapture(e.pointerId);
      frontCanvas.style.cursor = 'grabbing';
      e.preventDefault();
      return;
    }

    var logoR = getFrontLogoRect(c, W, H);
    if (inRect(p, logoR)) {
      dragFrontState = {
        type: 'logo',
        offX: p.x - W * c.logoX / 100,
        offY: p.y - H * c.logoY / 100
      };
      frontCanvas.setPointerCapture(e.pointerId);
      frontCanvas.style.cursor = 'grabbing';
      e.preventDefault();
    }
  });

  frontCanvas.addEventListener('pointermove', function (e) {
    var c = getCfg();
    var s = getSizes();
    var W = s.frontW, H = s.frontH;
    var p = eventToCanvasPoint(e, frontCanvas, W, H);

    if (!dragFrontState) {
      var hit = false;
      if (inRect(p, getFrontFooterRect(c, W, H))) hit = true;
      if (!hit && inRect(p, tableRect(c, W, H))) hit = true;
      if (!hit && inRect(p, getFrontLogoRect(c, W, H))) hit = true;
      frontCanvas.style.cursor = hit ? 'grab' : 'default';
      return;
    }

    var nx, ny;

    if (dragFrontState.type === 'table') {
      nx = (p.x - dragFrontState.offX) / W * 100;
      ny = (p.y - dragFrontState.offY) / H * 100;
      $('tpX').value = clamp(nx, 0, 100).toFixed(1);
      $('tpY').value = clamp(ny, 0, 100).toFixed(1);

    } else if (dragFrontState.type === 'footer') {
      nx = (p.x - dragFrontState.offX) / W * 100;
      ny = (p.y - dragFrontState.offY) / H * 100;
      $('footerX').value = clamp(nx, 0, 100).toFixed(1);
      $('footerY').value = clamp(ny, 0, 100).toFixed(1);

    } else if (dragFrontState.type === 'logo') {
      nx = (p.x - dragFrontState.offX) / W * 100;
      ny = (p.y - dragFrontState.offY) / H * 100;
      $('logoX').value = clamp(nx, 0, 100).toFixed(1);
      $('logoY').value = clamp(ny, 0, 100).toFixed(1);
    }

    syncLabels();
    render();
  });

  function endFrontDrag(e) {
    if (!dragFrontState) return;
    dragFrontState = null;
    frontCanvas.style.cursor = 'default';
    try { frontCanvas.releasePointerCapture(e.pointerId); } catch (_) {}
  }
  frontCanvas.addEventListener('pointerup', endFrontDrag);
  frontCanvas.addEventListener('pointercancel', endFrontDrag);

  /* ---------- 背面 canvas ---------- */
  backCanvas.addEventListener('pointerdown', function (e) {
    var c = getCfg();
    var s = getSizes();
    var W = s.backW, H = s.backH;
    var p = eventToCanvasPoint(e, backCanvas, W, H);

    var textR = getBackTextRect(c, W, H);
    if (inRect(p, textR)) {
      dragBackState = {
        type: 'backText',
        offX: p.x - W * c.backTextX / 100,
        offY: p.y - H * c.backTextY / 100
      };
      backCanvas.setPointerCapture(e.pointerId);
      backCanvas.style.cursor = 'grabbing';
      e.preventDefault();
      return;
    }

    var logoR = getBackLogoRect(c, W, H);
    if (inRect(p, logoR)) {
      dragBackState = {
        type: 'backLogo',
        offX: p.x - W * c.backLogoX / 100,
        offY: p.y - H * c.backLogoY / 100
      };
      backCanvas.setPointerCapture(e.pointerId);
      backCanvas.style.cursor = 'grabbing';
      e.preventDefault();
    }
  });

  backCanvas.addEventListener('pointermove', function (e) {
    var c = getCfg();
    var s = getSizes();
    var W = s.backW, H = s.backH;
    var p = eventToCanvasPoint(e, backCanvas, W, H);

    if (!dragBackState) {
      var hit = false;
      if (inRect(p, getBackTextRect(c, W, H))) hit = true;
      if (!hit && inRect(p, getBackLogoRect(c, W, H))) hit = true;
      backCanvas.style.cursor = hit ? 'grab' : 'default';
      return;
    }

    var nx, ny;

    if (dragBackState.type === 'backText') {
      nx = (p.x - dragBackState.offX) / W * 100;
      ny = (p.y - dragBackState.offY) / H * 100;
      $('backTextX').value = clamp(nx, 0, 100).toFixed(1);
      $('backTextY').value = clamp(ny, 0, 100).toFixed(1);

    } else if (dragBackState.type === 'backLogo') {
      nx = (p.x - dragBackState.offX) / W * 100;
      ny = (p.y - dragBackState.offY) / H * 100;
      $('backLogoX').value = clamp(nx, 0, 100).toFixed(1);
      $('backLogoY').value = clamp(ny, 0, 100).toFixed(1);
    }

    syncLabels();
    render();
  });

  function endBackDrag(e) {
    if (!dragBackState) return;
    dragBackState = null;
    backCanvas.style.cursor = 'default';
    try { backCanvas.releasePointerCapture(e.pointerId); } catch (_) {}
  }
  backCanvas.addEventListener('pointerup', endBackDrag);
  backCanvas.addEventListener('pointercancel', endBackDrag);

  /* ---------------- 导出 ---------------- */
  function downloadCanvas(canvas, filename) {
    var a = document.createElement('a');
    a.download = filename;
    a.href = canvas.toDataURL('image/png');
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  function safeName(s) {
    return (s || 'card').replace(/[\\/:*?"<>|\s]+/g, '_');
  }

  $('dlFront').addEventListener('click', function () {
    downloadCanvas(frontCanvas, 'QSL_' + safeName(val('myCall')) + '_正面.png');
  });
  $('dlBack').addEventListener('click', function () {
    downloadCanvas(backCanvas, 'QSL_' + safeName(val('myCall')) + '_背面.png');
  });

  $('dlBoth').addEventListener('click', function () {
    var base = 'QSL_' + safeName(val('myCall'));
    downloadCanvas(frontCanvas, base + '_正面.png');
    setTimeout(function () {
      downloadCanvas(backCanvas, base + '_背面.png');
    }, 300);
  });

  /* ---------------- 启动 ---------------- */
  buildRangeNumberPairs();
  buildPresetGrid();
  syncLabels();
  render();

})();