(function(){
  "use strict";

  /* ---------------- Data ---------------- */
  var devices = [
    {id:"TCC-01", name:"Main Lobby Bin",    loc:"Administration Bldg", fill:90, batt:100},
    {id:"TCC-02", name:"Canteen Bin",       loc:"Food Court",          fill:72, batt:86},
    {id:"TCC-03", name:"Library Bin",       loc:"Learning Res. Center",fill:41, batt:64},
    {id:"TCC-04", name:"Corridor Bin",      loc:"Academic Bldg A",     fill:23, batt:37},
    {id:"TCC-05", name:"Covered Court Bin", loc:"Gymnasium",           fill:58, batt:12}
  ];

  var selected = 0;
  var running  = true;
  var alerts   = [];
  var hist = { fill: [], batt: [] };
  var fleetHist = { fill: [], batt: [] };
  var HIST_LEN = 30;

  var $ = function(id){ return document.getElementById(id); };
  var round = function(n){ return Math.round(n); };
  var clamp = function(n,a,b){ return Math.max(a, Math.min(b, n)); };

  /* ---------------- Helpers ---------------- */
  function statusOf(d){
    if (d.batt <= 15) return {t:"Current Status: Low Battery", s:"crit"};
    if (d.fill >= 95) return {t:"Current Status: Empty Me",    s:"crit"};
    if (d.fill >= 75) return {t:"Current Status: Nearly Full", s:"warn"};
    return {t:"Current Status: Functional", s:"ok"};
  }
  function shortStatus(d){
    if (d.batt <= 15) return {t:"Low Battery", s:"crit"};
    if (d.fill >= 95) return {t:"Empty Me",    s:"crit"};
    if (d.fill >= 75) return {t:"Nearly Full", s:"warn"};
    return {t:"Functional", s:""};
  }
  function fillColor(f){ return f > 85 ? "#E85D3D" : (f > 60 ? "#2AA9C4" : "#3EB45A"); }
  function nowTime(){ return new Date().toLocaleTimeString([], {hour12:false}); }

  function addAlert(level, title, msg){
    alerts.unshift({level:level, title:title, msg:msg, time:nowTime()});
    if (alerts.length > 30) alerts.pop();
    renderAlerts();
  }

  function seedHistory(){
    var d = devices[selected];
    hist.fill = []; hist.batt = [];
    for (var i = 0; i < HIST_LEN; i++){
      var p = i / (HIST_LEN - 1);
      hist.fill.push(clamp(d.fill - (1 - p) * 8 + (Math.random() * 6 - 3), 0, 100));
      hist.batt.push(clamp(d.batt + (1 - p) * 6 + (Math.random() * 4 - 2), 0, 100));
    }
    hist.fill[HIST_LEN - 1] = d.fill;
    hist.batt[HIST_LEN - 1] = d.batt;
  }

  function recordFleet(){
    var fill = 0, batt = 0;
    devices.forEach(function(d){ fill += d.fill; batt += d.batt; });
    fleetHist.fill.push(fill / devices.length);
    fleetHist.batt.push(batt / devices.length);
    if (fleetHist.fill.length > HIST_LEN) fleetHist.fill.shift();
    if (fleetHist.batt.length > HIST_LEN) fleetHist.batt.shift();
  }

  /* ---------------- Renderers ---------------- */
  function renderMonitor(){
    var d = devices[selected];
    $("monId").textContent   = d.id;
    $("monName").textContent = d.name;
    $("monLoc").textContent  = d.loc;

    $("fill").style.height = d.fill + "%";
    $("fill").style.background = fillColor(d.fill);
    $("fillPct").textContent = round(d.fill) + "%";
    $("battPct").textContent = round(d.batt) + "%";

    $("fillVal").textContent = round(d.fill) + "%";
    $("battVal").textContent = round(d.batt) + "%";
    $("fillRange").value = round(d.fill);
    $("battRange").value = round(d.batt);

    var on = Math.ceil(d.batt / 20);
    var segs = document.querySelectorAll("#battery .seg");
    for (var i = 0; i < segs.length; i++) segs[i].classList.toggle("on", i < on);
    $("battery").classList.toggle("low", d.batt <= 15);

    var st = statusOf(d);
    var el = $("status");
    el.className = "status-chip" + (st.s === "ok" ? "" : " " + st.s);
    el.textContent = st.t;
  }

  function renderTable(){
    var focused = document.activeElement && document.activeElement.closest("tr.device");
    var focusedIndex = focused ? +focused.getAttribute("data-i") : -1;
    var html = "";
    for (var i = 0; i < devices.length; i++){
      var d = devices[i], st = shortStatus(d);
      html += '<tr class="device' + (i === selected ? " sel" : "") + '" data-i="' + i + '">' +
        '<td><button type="button" class="device-select" aria-pressed="' + (i === selected) + '">' + d.id + '<span style="display:block;font-size:11px;color:#7B8794">' + d.name + '</span></button></td>' +
        '<td>' + d.loc + '</td>' +
        '<td><span class="mini-bar"><i style="width:' + round(d.fill) + '%;background:' + fillColor(d.fill) + '"></i></span> ' +
          '<b>' + round(d.fill) + '%</b></td>' +
        '<td class="batt-txt' + (d.batt <= 15 ? " low" : "") + '">' + round(d.batt) + '%</td>' +
        '<td><span class="chip ' + st.s + '">' + st.t + '</span></td>' +
        '<td>' + d.stamp + '</td>' +
      '</tr>';
    }
    $("deviceRows").innerHTML = html;
    if (focusedIndex >= 0) $("deviceRows").querySelectorAll(".device-select")[focusedIndex].focus();
  }

  function renderAlerts(){
    var html = "";
    if (!alerts.length){
      html = '<div class="empty">No events recorded.</div>';
    } else {
      for (var i = 0; i < alerts.length; i++){
        var a = alerts[i];
        var ico = a.level === "crit" ? "&#9888;" : (a.level === "ok" ? "&#10003;" : "&#9888;");
        html += '<div class="alert ' + a.level + '">' +
          '<span class="ico">' + ico + '</span>' +
          '<div><b>' + a.title + '</b><span>' + a.msg + '</span>' +
          '<div style="color:#AAB2BA;font-size:10.5px;margin-top:2px">' + a.time + '</div></div></div>';
      }
    }
    $("alertList").innerHTML = html;
    $("alertTag").textContent = countActive() + " ACTIVE UNITS";
  }

  function countActive(){
    return devices.filter(function(d){ return shortStatus(d).s !== ""; }).length;
  }

  function renderKpis(){
    var f = 0, b = 0;
    for (var i = 0; i < devices.length; i++){ f += devices[i].fill; b += devices[i].batt; }
    $("kpiFill").textContent = round(f / devices.length) + "%";
    $("kpiBatt").textContent = round(b / devices.length) + "%";
    $("kpiOnline").textContent = devices.length + "/" + devices.length;

    var act = countActive();
    $("kpiAlerts").textContent = act;
    $("kpiAlertsD").textContent = act ? "needs attention" : "no issues";
    $("kpiAlertsD").className = "delta" + (act ? " down" : "");

    var f0 = fleetHist.fill[0], b0 = fleetHist.batt[0];
    var fr = $("kpiFillD"), br = $("kpiBattD");
    if (fleetHist.fill.length > 1){
      var rising = f / devices.length >= f0;
      fr.textContent = (rising ? "▲ fleet rising" : "▼ fleet dropping");
      fr.className = "delta" + (rising ? " down" : "");
    }
    if (fleetHist.batt.length > 1){
      var up = b / devices.length >= b0;
      br.textContent = (up ? "▲ fleet rising" : "▼ fleet dropping");
      br.className = "delta" + (up ? "" : " down");
    }
  }

  /* ---------------- Chart ---------------- */
  function drawChart(canvas, data, color){
    var rect = canvas.getBoundingClientRect();
    if (!rect.width) return;
    var dpr = window.devicePixelRatio || 1;
    canvas.width  = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    var ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var W = rect.width, H = rect.height;
    var padL = 34, padR = 10, padT = 12, padB = 20;
    var iw = W - padL - padR, ih = H - padT - padB;

    ctx.clearRect(0, 0, W, H);
    ctx.font = "10px Segoe UI, Arial";
    ctx.textBaseline = "middle";

    // grid
    for (var v = 0; v <= 100; v += 25){
      var y = padT + ih - (v / 100) * ih;
      ctx.strokeStyle = v === 0 ? "#C9D0D6" : "#EDF0F3";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
      ctx.fillStyle = "#8A939D";
      ctx.textAlign = "right";
      ctx.fillText(v + "%", padL - 6, y);
    }

    if (data.length < 2) return;
    var xOf = function(i){ return padL + (i / (data.length - 1)) * iw; };
    var yOf = function(v){ return padT + ih - (clamp(v, 0, 100) / 100) * ih; };

    // area
    var grad = ctx.createLinearGradient(0, padT, 0, padT + ih);
    grad.addColorStop(0, color + "55");
    grad.addColorStop(1, color + "05");
    ctx.beginPath();
    ctx.moveTo(xOf(0), yOf(data[0]));
    for (var i = 1; i < data.length; i++) ctx.lineTo(xOf(i), yOf(data[i]));
    ctx.lineTo(xOf(data.length - 1), padT + ih);
    ctx.lineTo(xOf(0), padT + ih);
    ctx.closePath();
    ctx.fillStyle = grad; ctx.fill();

    // line
    ctx.beginPath();
    ctx.moveTo(xOf(0), yOf(data[0]));
    for (var j = 1; j < data.length; j++) ctx.lineTo(xOf(j), yOf(data[j]));
    ctx.strokeStyle = color; ctx.lineWidth = 2.5;
    ctx.lineJoin = "round"; ctx.stroke();

    // last point
    var lx = xOf(data.length - 1), ly = yOf(data[data.length - 1]);
    ctx.beginPath(); ctx.arc(lx, ly, 8, 0, Math.PI * 2);
    ctx.fillStyle = color + "33"; ctx.fill();
    ctx.beginPath(); ctx.arc(lx, ly, 4, 0, Math.PI * 2);
    ctx.fillStyle = color; ctx.fill();
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5; ctx.stroke();

    // labels
    ctx.fillStyle = "#8A939D"; ctx.textAlign = "left";
    ctx.fillText("30 ticks ago", padL, H - 9);
    ctx.textAlign = "right";
    ctx.fillText("now", W - padR, H - 9);
    ctx.textAlign = "left";
    ctx.fillStyle = color; ctx.font = "bold 11px Segoe UI, Arial";
    ctx.fillText(round(data[data.length - 1]) + "%", padL + 4, padT + 8);
  }

  function renderCharts(){
    drawChart($("fillChart"), hist.fill, "#2AA9C4");
    drawChart($("battChart"), hist.batt, "#3EB45A");
  }

  function renderAll(){
    renderMonitor(); renderTable(); renderKpis(); renderAlerts(); renderCharts();
  }

  function logStatusChange(d, before){
    var after = shortStatus(d).t;
    if (before !== after){
      var level = after === "Functional" ? "ok" : (after === "Nearly Full" ? "warn" : "crit");
      addAlert(level, d.id + " - " + after, d.name + " (" + d.loc + ")");
    }
  }

  /* ---------------- Simulation ---------------- */
  function tick(){
    if (!running) return;

    for (var i = 0; i < devices.length; i++){
      var d = devices[i];
      var before = shortStatus(d).t;

      d.fill = clamp(d.fill + Math.random() * 1.4 - 0.25, 0, 100);
      d.batt = clamp(d.batt + Math.random() * 0.5 - 0.35, 0, 100);
      d.stamp = nowTime();

      logStatusChange(d, before);
    }

    var s = devices[selected];
    hist.fill.push(s.fill); if (hist.fill.length > HIST_LEN) hist.fill.shift();
    hist.batt.push(s.batt); if (hist.batt.length > HIST_LEN) hist.batt.shift();

    recordFleet();
    renderAll();
  }

  /* ---------------- Events ---------------- */
  $("deviceRows").addEventListener("click", function(e){
    var button = e.target.closest(".device-select");
    if (!button) return;
    var tr = button.closest("tr.device");
    selected = +tr.getAttribute("data-i");
    seedHistory();
    renderAll();
    document.querySelectorAll(".device-select")[selected].focus();
  });

  $("fillRange").addEventListener("input", function(){
    var before = shortStatus(devices[selected]).t;
    devices[selected].fill = +this.value;
    devices[selected].stamp = nowTime();
    hist.fill[hist.fill.length - 1] = +this.value;
    recordFleet();
    logStatusChange(devices[selected], before);
    renderAll();
  });
  $("battRange").addEventListener("input", function(){
    var before = shortStatus(devices[selected]).t;
    devices[selected].batt = +this.value;
    devices[selected].stamp = nowTime();
    hist.batt[hist.batt.length - 1] = +this.value;
    recordFleet();
    logStatusChange(devices[selected], before);
    renderAll();
  });

  $("toggle").addEventListener("click", function(){
    running = !running;
    this.textContent = running ? "Pause Sim" : "Resume Sim";
    $("livePill").textContent = running ? "● SIMULATION RUNNING" : "❚❚ SIMULATION PAUSED";
    $("livePill").className = "live-pill" + (running ? "" : " paused");
    $("footLive").textContent = running ? "● simulation running" : "❚❚ simulation paused";
    $("footLive").style.color = running ? "#3EB45A" : "#F7941D";
    addAlert(running ? "ok" : "warn",
      running ? "Simulation resumed" : "Simulation paused",
      "Telemetry stream " + (running ? "restarted" : "halted by operator"));
  });

  $("reset").addEventListener("click", function(){
    var d = devices[selected];
    d.fill = 0; d.batt = 100; d.stamp = nowTime();
    seedHistory();
    recordFleet();
    addAlert("ok", d.id + " reset", d.name + " emptied, battery reported 100%");
    renderAll();
  });

  window.addEventListener("resize", renderCharts);

  function clock(){
    var n = new Date();
    $("clock").textContent = n.toLocaleDateString([], {weekday:"short", month:"short", day:"numeric"})
      + "  " + n.toLocaleTimeString([], {hour12:false});
  }

  /* ---------------- Init ---------------- */
  devices.forEach(function(d){ d.stamp = nowTime(); });
  seedHistory();
  recordFleet();
  addAlert("warn", "TCC-01 - Nearly Full", "Main Lobby Bin (Administration Bldg)");
  addAlert("crit", "TCC-05 - Low Battery", "Covered Court Bin (Gymnasium)");
  addAlert("ok",   "System online",        "5 units connected to gateway TCC-GW-01");
  renderAll();
  clock();
  setInterval(clock, 1000);
  setInterval(tick, 2000);
})();
