/*
 * mr.mandu — DEMONSTRAÇÃO INTERATIVA (GitHub Pages)
 *
 * Versão de apresentação que roda 100% no navegador: não há servidor nem banco.
 * Os dados ficam no localStorage de quem está testando. As regras de agenda
 * (funcionamento, intervalo, horários ocupados, antecedência, conflitos)
 * espelham as do sistema real em src/server/scheduling e src/server/services.
 */
(() => {
  "use strict";

  // ---------------------------------------------------------------------------
  // Utilidades
  // ---------------------------------------------------------------------------
  const STORAGE_KEY = "mrmandu-demo-v1";
  const ACTIVE = ["PENDING", "CONFIRMED"];
  const STATUS_LABEL = { PENDING: "Pendente", CONFIRMED: "Confirmado", COMPLETED: "Concluído", CANCELLED: "Cancelado" };
  const SUB_LABEL = { PENDING: "Aguardando ativação", ACTIVE: "Ativo", CANCELLED: "Cancelado" };
  const DOW = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  const DOW_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  const pad = (n) => String(n).padStart(2, "0");
  const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const dateOf = (k) => { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d, 12); };
  const todayKey = () => keyOf(new Date());
  const addDays = (k, n) => { const d = dateOf(k); d.setDate(d.getDate() + n); return keyOf(d); };
  const dow = (k) => dateOf(k).getDay();
  const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  const toHM = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
  const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
  const fmtDate = (k) => k.split("-").reverse().join("/");
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const fmtLong = (k) => cap(new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(dateOf(k)));
  const fmtShort = (k) => `${DOW_SHORT[dow(k)]}, ${Number(k.slice(8))}/${k.slice(5, 7)}`;
  const money = (c) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(c / 100);
  const dur = (m) => (m < 60 ? `${m} min` : m % 60 ? `${Math.floor(m / 60)}h${pad(m % 60)}` : `${m / 60}h`);
  const phone = (p) => (p && p.length === 11 ? `(${p.slice(0, 2)}) ${p.slice(2, 7)}-${p.slice(7)}` : p || "—");
  const initials = (n) => { const p = n.trim().split(/\s+/); return ((p[0] || "")[0] + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase(); };
  const first = (n) => n.trim().split(/\s+/)[0];
  const uid = (p) => `${p}-${Math.random().toString(36).slice(2, 9)}`;
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  const ICONS = {
    home: '<path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="0"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    card: '<rect x="2" y="5" width="20" height="14"/><circle cx="8" cy="12" r="2"/><path d="M14 10h5M14 14h4"/>',
    layers: '<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 12 10 5 10-5"/><path d="m2 17 10 5 10-5"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
    users: '<circle cx="9" cy="8" r="4"/><path d="M1 21c0-4 3.5-6 8-6s8 2 8 6M17 4a4 4 0 0 1 0 8M23 21c0-3-2-5-5-5.7"/>',
    logout: '<path d="M9 21H4V3h5M16 17l5-5-5-5M21 12H9"/>',
    dash: '<rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/>',
    list: '<path d="M9 6h12M9 12h12M9 18h12M3 6h.01M3 12h.01M3 18h.01"/>',
    scissors: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    left: '<path d="m15 18-6-6 6-6"/>',
    right: '<path d="m9 18 6-6-6-6"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    resched: '<rect x="3" y="4" width="18" height="18"/><path d="M16 2v4M8 2v4M3 10h18M12 14v3l2 1"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  };
  const icon = (n) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="square" aria-hidden="true">${ICONS[n] || ""}</svg>`;

  // ---------------------------------------------------------------------------
  // Dados de demonstração
  // ---------------------------------------------------------------------------
  function seed() {
    const barbers = [
      { id: "b-victor", name: "Victor", specialty: "Degradê e navalha", bio: "Especialista em degradê, acabamento na navalha e cortes modernos.", email: "victor@mrmandu.com", active: true },
      { id: "b-mandu", name: "Mandu", specialty: "Cortes clássicos", bio: "Fundador da casa. Tesoura, pente e a tradição da barbearia clássica.", email: "mandu@mrmandu.com", active: true },
      { id: "b-joaozinho", name: "Joãozinho", specialty: "Barba e barboterapia", bio: "Design de barba, toalha quente e barboterapia completa.", email: "joaozinho@mrmandu.com", active: true },
      { id: "b-gonca", name: "Gonça", specialty: "Cortes texturizados", bio: "Texturizados, cachos e cortes com volume.", email: "gonca@mrmandu.com", active: true },
      { id: "b-ramon", name: "Ramon", specialty: "Desenhos e freestyle", bio: "Desenhos, risquinhos e cortes freestyle.", email: "ramon@mrmandu.com", active: true },
    ];
    const services = [
      { id: "s-acab", name: "Acabamento", desc: "Pezinho e contorno para manter o corte em dia.", price: 2000, dur: 15, active: true },
      { id: "s-sobr", name: "Sobrancelha", desc: "Limpeza e alinhamento na navalha.", price: 2000, dur: 15, active: true },
      { id: "s-barba", name: "Barba", desc: "Modelagem e acabamento na navalha com toalha quente.", price: 3500, dur: 30, active: true },
      { id: "s-corte", name: "Corte Masculino", desc: "Corte na tesoura e/ou máquina com lavagem e finalização.", price: 4500, dur: 30, active: true },
      { id: "s-combo", name: "Corte + Barba", desc: "O combo completo: corte, barba com toalha quente e finalização.", price: 6500, dur: 60, active: true },
    ];
    const clients = [
      { id: "c-carlos", name: "Carlos Oliveira", email: "carlos@cliente.com", phone: "11933333333", active: true },
      { id: "c-rafael", name: "Rafael Souza", email: "rafael@cliente.com", phone: "11944444444", active: true },
      { id: "c-lucas", name: "Lucas Pereira", email: "lucas@cliente.com", phone: "11955555555", active: true },
      { id: "c-marcos", name: "Marcos Lima", email: "marcos@cliente.com", phone: "11966666666", active: true },
    ];
    const hours = DOW.map((_, d) => ({ day: d, active: d !== 0, start: "09:00", end: d === 6 ? "17:00" : "19:00", bs: "12:00", be: "13:00" }));
    const plans = [
      { id: "p-barba", name: "Plano Barba", desc: "Barba feita toda semana.", benefits: ["Até 4 barbas por mês", "Toalha quente inclusa"], price: 9900, active: true },
      { id: "p-corte", name: "Plano Corte", desc: "Para manter o corte sempre alinhado.", benefits: ["Até 4 cortes por mês", "Agendamento prioritário"], price: 12900, active: true },
      { id: "p-completo", name: "Plano Completo", desc: "Corte e barba ilimitados.", benefits: ["Cortes e barbas ilimitados", "Sobrancelha inclusa", "10% de desconto em produtos"], price: 19900, active: true },
    ];

    const appts = [];
    const today = todayKey();
    const now = nowMin();
    const times = ["09:00", "10:00", "11:00", "14:00", "15:30", "17:00"];
    let n = 0;
    for (let off = -21; off <= 7; off++) {
      const date = addDays(today, off);
      const d = dow(date);
      if (d === 0) continue;
      barbers.forEach((b, bi) => {
        for (let s = 0; s < 2; s++) {
          n++;
          const time = times[(s * 3 + bi + Math.abs(off)) % times.length];
          const svc = services[(n * 7 + bi) % services.length];
          const end = toMin(time) + svc.dur;
          if (end > toMin(hours[d].end)) continue;
          const cl = clients[(n + bi) % clients.length];
          const past = off < 0 || (off === 0 && end <= now);
          const status = past ? (n % 9 === 0 ? "CANCELLED" : "COMPLETED") : n % 3 === 0 ? "PENDING" : "CONFIRMED";
          appts.push({ id: `a${n}`, clientId: cl.id, barberId: b.id, serviceId: svc.id, date, start: time, end: toHM(end), status, price: svc.price, notes: "", reason: status === "CANCELLED" ? "Cliente solicitou cancelamento" : "" });
        }
      });
    }
    return {
      v: 1,
      session: null,
      settings: { name: "MR.MANDU BARBERS", phone: "11999999999", address: "Av. Paulista, 1000", city: "São Paulo — SP", slot: 30, minAdvance: 60, maxDays: 60, cancelHours: 2, loyaltyGoal: 10, loyaltyReward: "1 corte grátis" },
      hours, services, barbers, clients, appts, plans,
      subs: [
        { id: "sub-1", clientId: "c-carlos", planId: "p-completo", status: "ACTIVE", price: 19900, since: addDays(today, -20) },
        { id: "sub-2", clientId: "c-rafael", planId: "p-corte", status: "PENDING", price: 12900, since: addDays(today, -1) },
      ],
      redemptions: [],
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) { const s = JSON.parse(raw); if (s && s.v === 1) return s; }
    } catch { /* armazenamento indisponível: segue com dados novos */ }
    return seed();
  }
  let S = load();
  const save = () => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(S)); } catch { /* modo privado */ } };

  // Estado de interface (não persistido)
  const ui = { menu: false, tab: "proximos", modal: null, wiz: null, filters: { status: "", barberId: "", date: "" } };

  // ---------------------------------------------------------------------------
  // Regras de agenda (espelham o sistema real)
  // ---------------------------------------------------------------------------
  const svcOf = (id) => S.services.find((s) => s.id === id);
  const barberOf = (id) => S.barbers.find((b) => b.id === id);
  const clientOf = (id) => S.clients.find((c) => c.id === id);
  const planOf = (id) => S.plans.find((p) => p.id === id);
  const activeBarbers = () => S.barbers.filter((b) => b.active);

  function intervals(date) {
    const h = S.hours[dow(date)];
    if (!h || !h.active) return [];
    let list = [{ s: toMin(h.start), e: toMin(h.end) }];
    if (h.bs && h.be && toMin(h.be) > toMin(h.bs)) {
      const bs = toMin(h.bs), be = toMin(h.be);
      list = list.flatMap((iv) => {
        if (!(iv.s < be && bs < iv.e)) return [iv];
        const out = [];
        if (bs > iv.s) out.push({ s: iv.s, e: bs });
        if (be < iv.e) out.push({ s: be, e: iv.e });
        return out;
      });
    }
    return list;
  }

  const busyOf = (barberId, date, exclude) =>
    S.appts.filter((a) => a.barberId === barberId && a.date === date && ACTIVE.includes(a.status) && a.id !== exclude).map((a) => ({ s: toMin(a.start), e: toMin(a.end) }));

  function earliest(date, clientRules) {
    const t = todayKey();
    if (date < t) return Infinity;
    if (date > t) return -Infinity;
    return nowMin() + 1 + (clientRules ? S.settings.minAdvance : 0);
  }

  function gridFor(barberId, date, duration, exclude, clientRules) {
    const busy = busyOf(barberId, date, exclude);
    const min = earliest(date, clientRules);
    const out = [];
    for (const iv of intervals(date)) {
      for (let s = iv.s; s + duration <= iv.e; s += S.settings.slot) {
        const ok = s >= min && !busy.some((b) => s < b.e && b.s < s + duration);
        out.push({ t: toHM(s), ok });
      }
    }
    return out;
  }

  function availability(barberIds, date, duration, exclude, clientRules) {
    const map = new Map();
    barberIds.forEach((id) => gridFor(id, date, duration, exclude, clientRules).forEach((x) => map.set(x.t, (map.get(x.t) || false) || x.ok)));
    return [...map.entries()].sort((a, b) => toMin(a[0]) - toMin(b[0])).map(([t, ok]) => ({ t, ok }));
  }

  /** Valida se o horário pode ser reservado; retorna mensagem de erro ou null. */
  function checkSlot(barberId, date, time, duration, exclude, clientRules) {
    const b = barberOf(barberId);
    if (!b || !b.active) return "Barbeiro indisponível no momento.";
    if (date < todayKey()) return "Não é possível agendar em um horário que já passou.";
    if (clientRules && date > addDays(todayKey(), S.settings.maxDays)) return "Data muito distante. Escolha uma data mais próxima.";
    const s = toMin(time), e = s + duration;
    if (s < earliest(date, clientRules)) return "Não é possível agendar em um horário que já passou.";
    if (!intervals(date).some((iv) => s >= iv.s && e <= iv.e)) return "Horário fora do funcionamento da barbearia.";
    if (busyOf(barberId, date, exclude).some((x) => s < x.e && x.s < e)) return "Este horário não está mais disponível. Escolha outro horário.";
    return null;
  }

  function createAppointment({ clientId, serviceId, barberId, date, time, notes }, byAdmin) {
    const svc = svcOf(serviceId);
    if (!svc || !svc.active) return { error: "Este serviço não está disponível no momento." };
    let candidates = [barberId];
    if (barberId === "any") {
      const load = (id) => S.appts.filter((a) => a.barberId === id && a.date === date && ACTIVE.includes(a.status)).length;
      candidates = activeBarbers().map((b) => b.id).sort((a, b) => load(a) - load(b));
    }
    let lastErr = "Nenhum barbeiro disponível neste horário.";
    for (const id of candidates) {
      const err = checkSlot(id, date, time, svc.dur, null, !byAdmin);
      if (err) { lastErr = candidates.length > 1 ? "Nenhum barbeiro disponível neste horário." : err; continue; }
      const appt = { id: uid("a"), clientId, barberId: id, serviceId, date, start: time, end: toHM(toMin(time) + svc.dur), status: byAdmin ? "CONFIRMED" : "PENDING", price: svc.price, notes: notes || "", reason: "" };
      S.appts.push(appt);
      save();
      return { appt };
    }
    return { error: lastErr };
  }

  const startsAt = (a) => dateOf(a.date).setHours(Math.floor(toMin(a.start) / 60), toMin(a.start) % 60, 0, 0);
  const hasStarted = (a) => startsAt(a) <= Date.now();
  const hoursUntil = (a) => (startsAt(a) - Date.now()) / 3_600_000;

  function loyalty(clientId) {
    const completed = S.appts.filter((a) => a.clientId === clientId && a.status === "COMPLETED").length;
    const redeemed = S.redemptions.filter((r) => r.clientId === clientId).length;
    const goal = S.settings.loyaltyGoal;
    const earned = Math.floor(completed / goal);
    return { completed, redeemed, goal, earned, stamps: completed - earned * goal, available: Math.max(0, earned - redeemed), reward: S.settings.loyaltyReward };
  }

  // ---------------------------------------------------------------------------
  // Sessão e navegação
  // ---------------------------------------------------------------------------
  const me = () => {
    const s = S.session;
    if (!s) return null;
    if (s.role === "CLIENT") { const c = clientOf(s.id); return c && { ...c, role: "CLIENT", label: "Cliente" }; }
    if (s.role === "BARBER") { const b = barberOf(s.id); return b && { ...b, role: "BARBER", label: "Barbeiro" }; }
    return { id: "admin", name: "Administrador Mandu", email: "admin@mrmandu.com", role: "ADMIN", label: "Administrador" };
  };
  const HOME = { CLIENT: "#/cliente", BARBER: "#/barbeiro", ADMIN: "#/admin" };

  function route() {
    const h = location.hash.replace(/^#/, "") || "/";
    const [path, qs] = h.split("?");
    return { path, parts: path.split("/").filter(Boolean), q: new URLSearchParams(qs || "") };
  }
  const go = (hash) => { if (location.hash === hash) render(); else location.hash = hash; };

  function toast(msg, ok = true) {
    const el = document.createElement("div");
    el.className = `toast ${ok ? "ok" : "err"}`;
    el.textContent = msg;
    document.getElementById("toasts").appendChild(el);
    setTimeout(() => el.remove(), 3600);
  }

  // ---------------------------------------------------------------------------
  // Componentes
  // ---------------------------------------------------------------------------
  const logo = (size = 22) => `<span class="logo" style="font-size:${size}px"><span>mr.</span><b>mandu</b></span>`;
  const badge = (st) => `<span class="badge b-${st}">${STATUS_LABEL[st]}</span>`;
  const avatar = (name, cls = "") => `<span class="avatar ${cls}">${esc(initials(name))}</span>`;
  const empty = (title, text, action) => `<div class="empty"><h3>${title}</h3>${text ? `<p>${text}</p>` : ""}${action || ""}</div>`;

  function apptActions(a, role, opts = {}) {
    const active = ACTIVE.includes(a.status);
    const staff = role !== "CLIENT";
    const started = hasStarted(a);
    const out = [];
    if (opts.details !== false) out.push(`<button class="btn ghost sm" data-act="details" data-id="${a.id}">${icon("eye")} Detalhes</button>`);
    if (staff && a.status === "PENDING") out.push(`<button class="btn secondary sm" data-act="confirm" data-id="${a.id}">${icon("check")} Confirmar</button>`);
    if (staff && active && started) out.push(`<button class="btn secondary sm" data-act="complete" data-id="${a.id}">${icon("check")} Concluir</button>`);
    if (active && (staff || !started)) {
      out.push(`<button class="btn outline sm" data-act="resched" data-id="${a.id}">${icon("resched")} Reagendar</button>`);
      out.push(`<button class="btn danger sm" data-act="cancel" data-id="${a.id}">${icon("x")} Cancelar</button>`);
    }
    return `<div class="acts">${out.join("")}</div>`;
  }

  function apptRow(a, role, person) {
    const svc = svcOf(a.serviceId), b = barberOf(a.barberId), c = clientOf(a.clientId);
    const who = person === "barber" ? `com ${esc(b?.name)}` : `${esc(c?.name)}${role === "ADMIN" ? ` · ${esc(b?.name)}` : ""}`;
    return `<li><div class="row">
      <div class="info"><div class="when"><b>${a.start}</b><small>${fmtShort(a.date)}</small></div>
      <div><div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center"><strong style="font-weight:500">${esc(svc?.name)}</strong>${badge(a.status)}</div><p>${who} · ${money(a.price)}</p></div></div>
      ${apptActions(a, role)}</div></li>`;
  }

  function calendar(selected, month, min, max, closed, act) {
    const [y, m] = month.split("-").map(Number);
    const firstKey = `${month}-01`;
    const cells = Array.from({ length: dow(firstKey) }, () => "<span></span>");
    for (let k = firstKey; k.slice(0, 7) === month; k = addDays(k, 1)) {
      const dis = k < min || (max && k > max) || closed.includes(dow(k));
      cells.push(`<button type="button" data-act="${act}" data-date="${k}" ${dis ? "disabled" : ""} class="${k === selected ? "on" : ""} ${k === todayKey() ? "today" : ""}" aria-label="${fmtDate(k)}">${Number(k.slice(8))}</button>`);
    }
    const prev = month > min.slice(0, 7), next = !max || month < max.slice(0, 7);
    return `<div class="cal">
      <div class="cal-head"><button type="button" class="icon-btn" data-act="cal-month" data-dir="-1" ${prev ? "" : "disabled"} aria-label="Mês anterior">${icon("left")}</button>
      <b>${MONTHS[m - 1]} ${y}</b>
      <button type="button" class="icon-btn" data-act="cal-month" data-dir="1" ${next ? "" : "disabled"} aria-label="Próximo mês">${icon("right")}</button></div>
      <div class="cal-grid">${["D", "S", "T", "Q", "Q", "S", "S"].map((d) => `<span class="dow">${d}</span>`).join("")}${cells.join("")}</div></div>`;
  }

  function slotsView(list, selected, act) {
    if (!list.length) return empty("Fechado neste dia", "Escolha outra data.");
    const free = list.filter((s) => s.ok).length;
    if (!free) return empty("Sem horários disponíveis", "Escolha outra data.");
    return `<div class="slots">${list.map((s) => `<button type="button" data-act="${act}" data-time="${s.t}" ${s.ok ? "" : "disabled title='Horário indisponível'"} class="${s.t === selected ? "on" : ""}">${s.t}</button>`).join("")}</div>
      <p class="cap muted" style="margin-top:12px;display:flex;justify-content:space-between"><span>Riscado = ocupado</span><span>${free} livres</span></p>`;
  }

  function timeline(barberId, date, role) {
    const iv = intervals(date);
    const appts = S.appts.filter((a) => a.barberId === barberId && a.date === date && a.status !== "CANCELLED");
    const busy = appts.map((a) => ({ s: toMin(a.start), e: toMin(a.end) }));
    const items = appts.map((a) => ({ t: a.start, a }));
    iv.forEach((x) => { for (let t = x.s; t < x.e; t += S.settings.slot) { const e = Math.min(t + S.settings.slot, x.e); if (!busy.some((b) => t < b.e && b.s < e)) items.push({ t: toHM(t) }); } });
    items.sort((a, b) => toMin(a.t) - toMin(b.t));
    if (!items.length) return empty("Sem expediente", "Dia fechado.");
    return `<ol class="timeline">${items.map((it) => {
      if (!it.a) return `<li class="tl-free"><span>${it.t}</span><i></i><em>Livre</em></li>`;
      const a = it.a, c = clientOf(a.clientId), svc = svcOf(a.serviceId);
      return `<li class="tl-appt s-${a.status}"><div class="row"><div class="info"><div class="when"><b>${a.start}</b></div>
        <div><div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center"><strong style="font-weight:500">${esc(c?.name)}</strong>${badge(a.status)}</div><p>${esc(svc?.name)} · até ${a.end}${a.notes ? ` · “${esc(a.notes)}”` : ""}</p></div></div>
        ${apptActions(a, role)}</div></li>`;
    }).join("")}</ol>`;
  }

  function weekStrip(barberId, date, base) {
    const start = addDays(date, -((dow(date) + 6) % 7));
    return `<div class="week">${Array.from({ length: 7 }, (_, i) => {
      const k = addDays(start, i);
      const count = S.appts.filter((a) => a.barberId === barberId && a.date === k && a.status !== "CANCELLED").length;
      return `<button type="button" data-act="goto" data-href="${base}?d=${k}" class="${k === date ? "on" : ""}"><small>${DOW_SHORT[dow(k)]}</small><b>${Number(k.slice(8))}</b><small>${count ? `${count} atend.` : "—"}</small></button>`;
    }).join("")}</div>`;
  }

  function dateBar(date, base) {
    return `<div class="datebar">
      <button class="icon-btn" data-act="goto" data-href="${base}?d=${addDays(date, -1)}" aria-label="Dia anterior">${icon("left")}</button>
      <button class="icon-btn" data-act="goto" data-href="${base}?d=${addDays(date, 1)}" aria-label="Próximo dia">${icon("right")}</button>
      ${date !== todayKey() ? `<button class="btn ghost sm" data-act="goto" data-href="${base}">Hoje</button>` : ""}
      <input type="date" class="input" style="width:auto;height:40px" value="${date}" data-act-change="pick-date" data-base="${base}" aria-label="Escolher data" />
      <span class="muted" style="font-size:14px">${fmtLong(date)}</span></div>`;
  }

  function loyaltyCard(l, wide) {
    const left = l.goal - l.stamps;
    return `<div class="box pad">
      <p class="cap muted">Clube do Mandu</p>
      <p class="title" style="margin-top:12px">${l.stamps}<span class="muted">/${l.goal}</span></p>
      <p class="muted" style="margin-top:8px;font-size:14px">Faltam ${left} atendimento${left === 1 ? "" : "s"} para ${esc(l.reward)}.</p>
      <div class="stamps ${wide ? "wide" : ""}">${Array.from({ length: l.goal }, (_, i) => `<div class="${i < l.stamps ? "on" : ""}">${i < l.stamps ? "✓" : i + 1}</div>`).join("")}</div>
      ${l.available ? `<p class="notice" style="margin-top:20px">Você tem ${l.available} recompensa${l.available === 1 ? "" : "s"}: ${esc(l.reward)}. Apresente na barbearia.</p>` : ""}
    </div>`;
  }

  // ---------------------------------------------------------------------------
  // Páginas públicas
  // ---------------------------------------------------------------------------
  function publicHeader() {
    const u = me();
    return `<header class="site-head">
      <a href="#/" aria-label="Início">${logo()}</a>
      <nav class="cap"><button data-act="scroll" data-id="servicos">Serviços</button><button data-act="scroll" data-id="barbeiros">Barbeiros</button><button data-act="scroll" data-id="contato">Contato</button></nav>
      <div style="display:flex;gap:20px;align-items:center" class="cap">
        <a href="${u ? HOME[u.role] : "#/entrar"}" style="opacity:.75">${u ? "Meu painel" : "Entrar"}</a>
        <button data-act="book" style="font-weight:700">Agendar horário</button>
      </div></header>`;
  }

  function homePage() {
    const services = S.services.filter((s) => s.active);
    const barbers = activeBarbers();
    return `<div class="public">${publicHeader()}<main>
      <section class="hero">
        <h1 class="display"><span style="display:block;padding-left:var(--gutter)">Seu estilo.</span><span style="display:block;transform:translateX(-2%)">Nosso trabalho.</span></h1>
        <div class="hero-meta">
          <p class="cap">Barbearia premium<br/>Cortes, barba e acabamento</p>
          <p style="font-size:18px;line-height:1.35;opacity:.85">Agende seu horário na MR.MANDU BARBERS e tenha uma experiência de barbearia premium.</p>
          <div class="actions"><button class="btn lg" data-act="book">Agendar horário ${icon("arrow")}</button><a class="btn lg outline" href="#/entrar">Entrar</a></div>
        </div>
      </section>
      <section class="sec" id="servicos">
        <div class="sec-head cap"><span class="muted">01</span><h2>Serviços</h2><span class="muted" style="text-align:right">${services.length} serviços</span></div>
        <ul class="archive">${services.map((s, i) => `<li><button data-act="book" data-service="${s.id}">
          <span class="serif">${esc(s.name)}</span><span class="cap muted">${pad(i + 1)}</span><span class="cap">${esc(s.desc)}</span>
          <span class="cap" style="font-weight:700;display:flex;justify-content:space-between;gap:12px"><span>${dur(s.dur)}</span><span>${money(s.price)} ↗</span></span></button></li>`).join("")}</ul>
      </section>
      <section class="sec" id="barbeiros">
        <div class="sec-head cap"><span class="muted">02</span><h2>Barbeiros</h2><span class="muted" style="text-align:right">Escolha com quem cortar</span></div>
        <ul class="archive">${barbers.map((b, i) => `<li><button data-act="book" data-barber="${b.id}">
          <span class="serif">${esc(b.name)}</span><span class="cap muted">${pad(i + 1)}</span><span class="cap">${esc(b.specialty)}</span><span class="cap" style="font-weight:700;text-align:right">Agendar ↗</span></button></li>`).join("")}</ul>
      </section>
      <section class="sec" id="contato">
        <div class="sec-head cap"><span class="muted">03</span><h2>Contato & horários</h2><span class="muted" style="text-align:right">${esc(S.settings.city)}</span></div>
        <div class="grid md2" style="gap:40px">
          <div><p class="cap muted">Endereço</p><p style="font-size:20px;margin-top:8px">${esc(S.settings.address)}</p><p class="muted" style="font-size:20px">${esc(S.settings.city)}</p>
            <p class="cap" style="margin-top:24px">Telefone · ${phone(S.settings.phone)}</p></div>
          <ul style="list-style:none;display:grid;gap:6px;font-size:14px">${[1, 2, 3, 4, 5, 6, 0].map((d) => { const h = S.hours[d]; return `<li style="display:flex;justify-content:space-between"><span class="muted">${DOW[d]}</span><span>${h.active ? `${h.start} – ${h.end}` : "Fechado"}</span></li>`; }).join("")}</ul>
        </div>
      </section>
      <section class="sec" style="overflow:hidden"><button data-act="book" style="text-align:left;width:100%"><p class="cap">Pronto para o próximo corte? →</p><p class="display" style="margin-top:20px">Agende já.</p></button></section>
      <footer class="foot cap muted" style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px"><span>© ${new Date().getFullYear()} MR.MANDU BARBERS · Demonstração</span><a href="../" style="text-decoration:underline">Apresentação do projeto</a></footer>
    </main></div>`;
  }

  function loginPage() {
    const r = route();
    return `<div class="public">${publicHeader()}<main class="content" style="max-width:1100px;margin:0 auto">
      <div class="page-head"><div><h1 class="title">Entrar como</h1><p>Escolha um perfil para testar. Na demonstração, as credenciais já vêm preenchidas.</p></div></div>
      <div class="grid md3" style="gap:16px">
        <div class="box pad" style="display:flex;flex-direction:column;gap:16px">
          <p class="cap muted">01 · Cliente</p><h2 style="font-weight:400;font-size:26px">Cliente</h2>
          <p class="muted" style="font-size:14px;flex:1">Agende, reagende e acompanhe seus horários, o Clube do Mandu e o seu plano.</p>
          <div class="field"><label>E-mail</label><input class="input" value="carlos@cliente.com" readonly /></div>
          <div class="field"><label>Senha</label><input class="input" type="password" value="Mandu@2026" readonly /></div>
          <button class="btn lg block" data-act="login" data-role="CLIENT" data-id="c-carlos" data-next="${esc(r.q.get("next") || "")}">Entrar como Carlos</button>
          <button class="btn outline block" data-act="open-register">Criar nova conta</button>
        </div>
        <div class="box pad" style="display:flex;flex-direction:column;gap:16px">
          <p class="cap muted">02 · Equipe</p><h2 style="font-weight:400;font-size:26px">Barbeiro</h2>
          <p class="muted" style="font-size:14px;flex:1">Veja a agenda do dia, confirme, reagende e conclua atendimentos. Cada barbeiro vê apenas os seus.</p>
          <div class="field"><label>Qual barbeiro?</label><select class="input" id="pick-barber">${activeBarbers().map((b) => `<option value="${b.id}">${esc(b.name)} — ${esc(b.email)}</option>`).join("")}</select></div>
          <div class="field"><label>Senha</label><input class="input" type="password" value="Mandu@2026" readonly /></div>
          <button class="btn lg block" data-act="login" data-role="BARBER">Entrar como barbeiro</button>
        </div>
        <div class="box pad" style="display:flex;flex-direction:column;gap:16px">
          <p class="cap muted">03 · Equipe</p><h2 style="font-weight:400;font-size:26px">Administrador</h2>
          <p class="muted" style="font-size:14px;flex:1">Dashboard, agenda de cada barbeiro, agendamentos, clientes, serviços, planos e horários.</p>
          <div class="field"><label>E-mail</label><input class="input" value="admin@mrmandu.com" readonly /></div>
          <div class="field"><label>Senha</label><input class="input" type="password" value="Mandu@2026" readonly /></div>
          <button class="btn lg block" data-act="login" data-role="ADMIN">Entrar como admin</button>
        </div>
      </div></main></div>`;
  }

  // ---------------------------------------------------------------------------
  // Painéis
  // ---------------------------------------------------------------------------
  function shell(user, nav, body) {
    const { path } = route();
    const isActive = (it) => (it.exact ? path === it.href.slice(1) : path === it.href.slice(1) || path.startsWith(`${it.href.slice(1)}/`));
    const links = nav.map((it) => `<a href="${it.href}" class="${isActive(it) && !(it.sub && it.sub.some((s) => path === s.href.slice(1))) ? "active" : ""}">${icon(it.icon)} ${it.label}</a>${it.sub ? `<div class="sub">${it.sub.map((s) => `<a href="${s.href}" class="${path === s.href.slice(1) ? "active" : ""}">${esc(s.label)}</a>`).join("")}</div>` : ""}`).join("");
    const navHtml = `<nav class="nav">${links}<button data-act="logout">${icon("logout")} Sair</button></nav>`;
    return `<div class="shell">
      <aside class="sidebar"><a href="#/" class="logo" style="font-size:28px"><span>mr.</span><b>mandu</b></a>${navHtml}<p class="who">${esc(user.label)} · demonstração</p></aside>
      <div style="min-width:0">
        <header class="topbar">
          <div style="display:flex;align-items:center;gap:10px"><button class="menu-btn" data-act="menu" aria-label="Menu">${icon(ui.menu ? "x" : "menu")}</button><a href="#/" class="logo">${logo()}</a></div>
          <div class="user-chip"><span>${esc(user.name)}<small>${esc(user.label)}</small></span>${avatar(user.name)}</div>
        </header>
        ${ui.menu ? `<div class="mobile-nav fadein">${navHtml}</div>` : ""}
        <main class="content ${ui.animate ? "fadein" : ""}">${body}</main>
      </div></div>`;
  }

  const clientNav = [
    { href: "#/cliente", label: "Início", icon: "home", exact: true },
    { href: "#/cliente/agendamentos", label: "Agendamentos", icon: "calendar" },
    { href: "#/cliente/clube", label: "Clube do Mandu", icon: "card" },
    { href: "#/cliente/plano", label: "Plano", icon: "layers" },
    { href: "#/cliente/perfil", label: "Perfil", icon: "user" },
  ];
  const barberNav = [
    { href: "#/barbeiro", label: "Hoje", icon: "dash", exact: true },
    { href: "#/barbeiro/agenda", label: "Agenda", icon: "calendar" },
  ];
  const adminNav = () => [
    { href: "#/admin", label: "Dashboard", icon: "dash", exact: true },
    { href: "#/admin/agenda", label: "Agenda", icon: "calendar", sub: activeBarbers().map((b) => ({ href: `#/admin/agenda/${b.id}`, label: b.name })) },
    { href: "#/admin/agendamentos", label: "Agendamentos", icon: "list" },
    { href: "#/admin/clientes", label: "Clientes", icon: "users" },
    { href: "#/admin/servicos", label: "Serviços", icon: "scissors" },
    { href: "#/admin/planos", label: "Planos & Clube", icon: "layers" },
    { href: "#/admin/horarios", label: "Horários", icon: "clock" },
  ];

  // ---- Cliente ----
  const myAppts = (u) => S.appts.filter((a) => a.clientId === u.id).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
  const upcoming = (u) => myAppts(u).filter((a) => ACTIVE.includes(a.status) && (a.date > todayKey() || (a.date === todayKey() && toMin(a.end) > nowMin())));

  function clientHome(u) {
    const next = upcoming(u)[0];
    const sub = S.subs.find((s) => s.clientId === u.id && s.status !== "CANCELLED");
    const nextHtml = next ? (() => {
      const svc = svcOf(next.serviceId), b = barberOf(next.barberId);
      return `<div class="box"><div class="pad" style="display:grid;gap:24px">
        <div><div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">${badge(next.status)}<span class="muted" style="font-size:14px">${fmtLong(next.date)}</span></div>
        <p style="font-size:clamp(3.5rem,10vw,6.5rem);line-height:.85;letter-spacing:-.03em;margin-top:16px">${next.start}</p>
        <p style="font-size:20px;text-transform:uppercase;margin-top:10px">${esc(svc.name)}</p></div>
        <div style="display:flex;gap:28px;flex-wrap:wrap;font-size:14px"><span style="display:flex;gap:10px;align-items:center">${avatar(b.name)}<span><span class="cap muted">Barbeiro</span><br/>${esc(b.name)}</span></span>
        <span><span class="cap muted">Horário</span><br/>${next.start} – ${next.end}</span><span><span class="cap muted">Valor</span><br/>${money(next.price)}</span></div></div>
        <div style="border-top:1px solid var(--faint);padding:14px 20px">${apptActions(next, "CLIENT")}</div></div>`;
    })() : empty("Você ainda não possui agendamentos.", "Escolha o serviço, o barbeiro e o melhor horário para você.", `<button class="btn" data-act="book">Agendar meu primeiro horário</button>`);
    return `<div class="page-head"><div><p class="cap muted">${fmtLong(todayKey())}</p><h1 class="title" style="margin-top:8px">Olá, ${esc(first(u.name))}</h1></div>
      <button class="btn lg" data-act="book">${icon("plus")} Novo agendamento</button></div>
      <p class="cap muted" style="margin-bottom:12px">Seu próximo horário</p>${nextHtml}
      <div class="grid md2" style="margin-top:20px;gap:16px">
        <a href="#/cliente/clube">${loyaltyCard(loyalty(u.id))}</a>
        <a href="#/cliente/plano" class="box pad" style="display:flex;flex-direction:column;justify-content:space-between">
          <div><p class="cap muted">Plano</p><p class="title" style="margin-top:12px;font-size:clamp(1.6rem,3vw,2.2rem)">${sub ? esc(planOf(sub.planId).name) : "Sem plano"}</p>
          <p class="muted" style="font-size:14px;margin-top:8px">${sub ? `${SUB_LABEL[sub.status]} · ${money(sub.price)}/mês` : "Conheça os planos mensais e economize."}</p></div>
          <span class="cap" style="font-weight:700;margin-top:28px">${sub ? "Ver meu plano" : "Ver planos"} ↗</span></a>
      </div>`;
  }

  function clientAppointments(u) {
    const all = myAppts(u);
    const up = upcoming(u);
    const cancelled = all.filter((a) => a.status === "CANCELLED").reverse();
    const past = all.filter((a) => a.status !== "CANCELLED" && !up.includes(a)).reverse();
    const lists = { proximos: up, historico: past, cancelados: cancelled };
    const labels = { proximos: "Próximos", historico: "Concluídos", cancelados: "Cancelados" };
    const list = lists[ui.tab] || up;
    return `<div class="page-head"><div><h1 class="title">Agendamentos</h1><p>Seus próximos horários e o histórico de atendimentos.</p></div><button class="btn" data-act="book">${icon("plus")} Novo agendamento</button></div>
      <div class="tabs">${Object.keys(lists).map((k) => `<button class="${ui.tab === k ? "on" : ""}" data-act="tab" data-tab="${k}">${labels[k]} <span class="muted">${lists[k].length}</span></button>`).join("")}</div>
      ${list.length ? `<ul class="list">${list.map((a) => apptRow(a, "CLIENT", "barber")).join("")}</ul>` : ui.tab === "proximos" ? empty("Você ainda não possui agendamentos.", "", `<button class="btn" data-act="book">Agendar meu primeiro horário</button>`) : empty("Nada por aqui", "")}`;
  }

  function clientClub(u) {
    const l = loyalty(u.id);
    return `<div class="page-head"><div><h1 class="title">Clube do Mandu</h1><p>Fidelidade que vira benefício. Quanto mais você vem, mais você ganha.</p></div></div>
      ${loyaltyCard(l, true)}
      <div class="grid g2 g4" style="margin-top:16px">${[["Atendimentos", l.completed, "concluídos"], ["Recompensas", l.earned, "conquistadas"], ["Resgatadas", l.redeemed, ""], ["Disponíveis", l.available, ""]].map(([a, b, c]) => `<div class="stat"><span class="cap muted">${a}</span><b>${b}</b><small>${c}</small></div>`).join("")}</div>
      <div class="grid md3" style="margin-top:56px;gap:32px">${[["01", "Agende e compareça", "Cada atendimento concluído vale 1 selo no seu cartão."], ["02", `Complete ${l.goal} selos`, "Os selos entram automaticamente quando o barbeiro conclui o atendimento."], ["03", "Resgate na barbearia", `Ganhe ${esc(l.reward)}. O resgate é registrado pela barbearia.`]].map(([n, t, d]) => `<div><p class="cap muted">${n}</p><p style="font-size:20px;margin-top:10px">${t}</p><p class="muted" style="font-size:14px;margin-top:8px">${d}</p></div>`).join("")}</div>`;
  }

  function clientPlan(u) {
    const sub = S.subs.find((s) => s.clientId === u.id && s.status !== "CANCELLED");
    return `<div class="page-head"><div><h1 class="title">Plano</h1><p>Assinatura mensal para quem mantém o visual sempre em dia.</p></div></div>
      ${sub ? `<div class="box pad" style="margin-bottom:32px;display:flex;flex-wrap:wrap;gap:20px;justify-content:space-between;align-items:flex-end">
        <div><p class="cap muted">Seu plano</p><p class="title" style="margin-top:10px">${esc(planOf(sub.planId).name)}</p>
        <p class="muted" style="margin-top:10px;font-size:14px"><span class="badge" style="color:${sub.status === "ACTIVE" ? "var(--ok)" : "var(--warn)"}">${SUB_LABEL[sub.status]}</span> &nbsp;${money(sub.price)}/mês</p>
        ${sub.status === "PENDING" ? `<p class="muted" style="margin-top:12px;font-size:14px;max-width:520px">Solicitação recebida. Na demonstração, entre como administrador em "Planos & Clube" para ativar.</p>` : ""}</div>
        <button class="btn outline" data-act="cancel-sub" data-id="${sub.id}">${sub.status === "PENDING" ? "Cancelar solicitação" : "Cancelar plano"}</button></div>` : ""}
      <p class="cap muted" style="margin-bottom:16px">${sub ? "Outros planos" : "Escolha seu plano"}</p>
      <div class="grid md3" style="gap:16px">${S.plans.filter((p) => p.active).map((p) => {
        const cur = sub && sub.planId === p.id;
        return `<div class="box pad" style="display:flex;flex-direction:column;${cur ? "border-color:var(--fg)" : ""}">
          <p class="serif" style="font-size:34px">${esc(p.name)}</p><p class="muted" style="font-size:14px;margin-top:8px">${esc(p.desc)}</p>
          <p style="font-size:clamp(2.2rem,4vw,3rem);letter-spacing:-.03em;margin-top:24px">${money(p.price)}<span class="muted" style="font-size:14px">/mês</span></p>
          <ul style="list-style:none;margin:24px 0;display:grid;gap:8px;font-size:14px;flex:1">${p.benefits.map((b) => `<li>✓ ${esc(b)}</li>`).join("")}</ul>
          ${cur ? `<p class="notice" style="text-align:center">Seu plano atual</p>` : `<button class="btn lg block" data-act="request-plan" data-id="${p.id}" ${sub ? "disabled" : ""}>Quero este plano</button>`}</div>`;
      }).join("")}</div>`;
  }

  function clientProfile(u) {
    return `<div style="max-width:640px"><div class="page-head"><div><h1 class="title">Perfil</h1><p>Gerencie suas informações.</p></div></div>
      <form class="box pad" data-form="profile" style="display:grid;gap:16px">
        <div class="field"><label>E-mail</label><input class="input" value="${esc(u.email)}" disabled /></div>
        <div class="field"><label for="pf-name">Nome completo</label><input class="input" id="pf-name" name="name" value="${esc(u.name)}" required minlength="3" maxlength="100" /></div>
        <div class="field"><label for="pf-phone">Telefone</label><input class="input" id="pf-phone" name="phone" value="${esc(phone(u.phone))}" inputmode="tel" /></div>
        <div><button class="btn" type="submit">Salvar alterações</button></div>
      </form></div>`;
  }

  // ---- Agendamento (wizard) ----
  function startWizard(opts = {}) {
    const svcOk = opts.serviceId && svcOf(opts.serviceId)?.active ? opts.serviceId : null;
    const barberOk = opts.barberId && barberOf(opts.barberId)?.active ? opts.barberId : null;
    ui.wiz = { mode: opts.mode || "client", step: svcOk ? (barberOk ? 2 : 1) : 0, serviceId: svcOk, barberId: barberOk, date: null, time: null, notes: "", clientId: "", month: todayKey().slice(0, 7), done: null };
  }

  function wizardView() {
    const w = ui.wiz;
    const admin = w.mode === "admin";
    const svc = w.serviceId && svcOf(w.serviceId);
    const barber = w.barberId && w.barberId !== "any" ? barberOf(w.barberId) : null;
    const STEPS = ["Serviço", "Barbeiro", "Data", "Horário", "Resumo"];
    if (w.done) {
      const a = S.appts.find((x) => x.id === w.done);
      return `<div class="fadein" style="max-width:560px;margin:0 auto;text-align:center">
        <p style="font-size:56px">✓</p><h1 class="title" style="margin-top:8px">Agendamento realizado com sucesso!</h1>
        <p class="muted" style="margin-top:12px">${a.status === "PENDING" ? "Seu horário foi reservado e aguarda confirmação da barbearia." : "Horário confirmado."}</p>
        <dl class="summary box pad" style="text-align:left;margin-top:28px">${[["Serviço", svcOf(a.serviceId).name], ["Barbeiro", barberOf(a.barberId).name], ["Data", fmtDate(a.date)], ["Horário", a.start], ["Valor", money(a.price)], ...(admin ? [["Cliente", clientOf(a.clientId).name]] : [])].map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
        <div class="actions" style="justify-content:center;margin-top:28px"><a class="btn lg" href="${admin ? "#/admin/agendamentos" : "#/cliente/agendamentos"}">${admin ? "Ver agendamentos" : "Ver meus horários"}</a><button class="btn lg outline" data-act="wiz-restart">Novo agendamento</button></div></div>`;
    }
    const closed = S.hours.filter((h) => !h.active).map((h) => h.day);
    let body = "";
    if (w.step === 0) {
      body = `<h2 class="title" style="font-size:28px">Escolha o serviço</h2><div class="grid md2" style="margin-top:20px">${S.services.filter((s) => s.active).map((s) => `<button class="opt ${s.id === w.serviceId ? "on" : ""}" data-act="wiz-service" data-id="${s.id}">
        <div style="display:flex;justify-content:space-between;gap:12px"><h4>${esc(s.name)}</h4><h4>${money(s.price)}</h4></div><p>${esc(s.desc)}</p><p class="cap" style="margin-top:10px">${dur(s.dur)}</p></button>`).join("")}</div>`;
    } else if (w.step === 1) {
      body = `<h2 class="title" style="font-size:28px">Escolha o barbeiro</h2><div class="grid md2" style="margin-top:20px">
        <button class="opt ${w.barberId === "any" ? "on" : ""}" data-act="wiz-barber" data-id="any"><div style="display:flex;gap:14px;align-items:center"><span class="avatar lg">${icon("users")}</span><div><h4>Qualquer barbeiro</h4><p>Primeiro disponível no horário</p></div></div></button>
        ${activeBarbers().map((b) => `<button class="opt ${b.id === w.barberId ? "on" : ""}" data-act="wiz-barber" data-id="${b.id}"><div style="display:flex;gap:14px;align-items:center">${avatar(b.name, "lg")}<div><h4>${esc(b.name)}</h4><p>${esc(b.specialty)}</p></div></div></button>`).join("")}</div>`;
    } else if (w.step === 2) {
      body = `<h2 class="title" style="font-size:28px">Escolha a data</h2><div style="margin-top:20px">${calendar(w.date, w.month, todayKey(), admin ? null : addDays(todayKey(), S.settings.maxDays), closed, "wiz-date")}</div>`;
    } else if (w.step === 3) {
      const ids = w.barberId === "any" ? activeBarbers().map((b) => b.id) : [w.barberId];
      body = `<h2 class="title" style="font-size:28px">Escolha o horário</h2><p class="muted" style="margin:6px 0 20px;font-size:14px">${fmtLong(w.date)}</p>${slotsView(availability(ids, w.date, svc.dur, null, !admin), w.time, "wiz-time")}`;
    } else {
      body = `<h2 class="title" style="font-size:28px">Confirme seu agendamento</h2><div class="box pad" style="margin-top:20px">
        <dl class="summary big">${[["Serviço", svc.name], ["Barbeiro", barber ? barber.name : "Qualquer barbeiro disponível"], ["Data", fmtDate(w.date)], ["Horário", w.time], ["Valor", money(svc.price)]].map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
        ${admin ? `<div class="field" style="margin-top:24px"><label for="wiz-client">Cliente</label><select class="input" id="wiz-client" data-act-change="wiz-client"><option value="">Selecione o cliente</option>${S.clients.filter((c) => c.active).map((c) => `<option value="${c.id}" ${c.id === w.clientId ? "selected" : ""}>${esc(c.name)} — ${esc(c.email)}</option>`).join("")}</select></div>` : ""}
        <div class="field" style="margin-top:24px"><label for="wiz-notes">Observações (opcional)</label><textarea class="input" id="wiz-notes" maxlength="500" data-act-change="wiz-notes" placeholder="Alguma preferência para o atendimento?">${esc(w.notes)}</textarea></div>
        <button class="btn lg block" style="margin-top:24px" data-act="wiz-confirm" ${admin && !w.clientId ? "disabled" : ""}>${icon("check")} Confirmar agendamento</button></div>`;
    }
    const canNext = [!!w.serviceId, !!w.barberId, !!w.date, !!w.time, false][w.step];
    return `<div class="steps">${STEPS.map((s, i) => `<button type="button" data-act="wiz-step" data-step="${i}" ${i < w.step ? "" : "disabled"} style="text-align:left" class="${i === w.step ? "cur" : ""}"><div class="${i <= w.step ? "on" : ""}"></div><span>${i + 1}. ${s}</span></button>`).join("")}</div>
      <div class="wiz"><section class="fadein">${body}</section>
      <aside class="box pad" style="align-self:start"><p class="cap muted" style="margin-bottom:16px">Seu agendamento</p><dl class="summary">${[["Serviço", svc ? svc.name : "—"], ["Barbeiro", w.barberId === "any" ? "Qualquer disponível" : barber ? barber.name : "—"], ["Data", w.date ? fmtDate(w.date) : "—"], ["Horário", w.time || "—"], ["Valor", svc ? money(svc.price) : "—"]].map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl></aside></div>
      <div class="stickybar">${w.step > 0 ? `<button class="btn lg outline" data-act="wiz-step" data-step="${w.step - 1}">${icon("left")} Voltar</button>` : ""}${w.step < 4 ? `<button class="btn lg" style="margin-left:auto" data-act="wiz-step" data-step="${w.step + 1}" ${canNext ? "" : "disabled"}>Continuar ${icon("arrow")}</button>` : ""}</div>`;
  }

  // ---- Barbeiro ----
  function barberHome(u) {
    const t = todayKey();
    const mine = S.appts.filter((a) => a.barberId === u.id);
    const today = mine.filter((a) => a.date === t && a.status !== "CANCELLED");
    const next = mine.filter((a) => ACTIVE.includes(a.status) && (a.date > t || (a.date === t && toMin(a.end) > nowMin()))).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))[0];
    return `<div class="page-head"><div><p class="cap muted">${fmtLong(t)}</p><h1 class="title" style="margin-top:8px">Bom trabalho, ${esc(u.name)}</h1></div></div>
      <div class="grid g2 g4">${[["Hoje", today.length, "agendamentos"], ["Próximo", next ? next.start : "—", next ? `${fmtShort(next.date)} · ${esc(clientOf(next.clientId).name)}` : "nenhum"], ["Pendentes", mine.filter((a) => a.status === "PENDING" && a.date >= t).length, "aguardando confirmação"], ["Concluídos", mine.filter((a) => a.status === "COMPLETED").length, "no total"]].map(([a, b, c]) => `<div class="stat"><span class="cap muted">${a}</span><b>${b}</b><small>${c}</small></div>`).join("")}</div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin:36px 0 12px"><p class="cap muted">Agenda de hoje</p><a class="cap" style="font-weight:700" href="#/barbeiro/agenda">Ver semana →</a></div>
      ${timeline(u.id, t, "BARBER")}`;
  }

  function barberAgenda(u, date) {
    return `<div class="page-head"><div><h1 class="title">Minha agenda</h1><p>Somente os seus atendimentos.</p></div></div>
      ${weekStrip(u.id, date, "#/barbeiro/agenda")}${dateBar(date, "#/barbeiro/agenda")}${timeline(u.id, date, "BARBER")}`;
  }

  // ---- Admin ----
  function adminDashboard() {
    const t = todayKey();
    const month = t.slice(0, 7);
    const doneMonth = S.appts.filter((a) => a.status === "COMPLETED" && a.date.startsWith(month));
    const todayList = S.appts.filter((a) => a.date === t).sort((a, b) => a.start.localeCompare(b.start));
    const days = Array.from({ length: 7 }, (_, i) => addDays(t, i - 6));
    const counts = days.map((d) => S.appts.filter((a) => a.date === d && a.status !== "CANCELLED").length);
    const revenue = days.map((d) => S.appts.filter((a) => a.date === d && a.status === "COMPLETED").reduce((s, a) => s + a.price, 0));
    const bars = (vals, fmt) => { const max = Math.max(1, ...vals); return `<div class="bars">${vals.map((v, i) => `<div><em>${fmt(v)}</em><i style="height:${Math.max(2, (v / max) * 100)}%"></i><small>${DOW_SHORT[dow(days[i])]}</small></div>`).join("")}</div>`; };
    return `<div class="page-head"><div><h1 class="title">Dashboard</h1><p>${fmtLong(t)}</p></div><button class="btn" data-act="admin-new">${icon("plus")} Novo agendamento</button></div>
      <div class="grid g2 g5">${[["Agendamentos hoje", todayList.filter((a) => a.status !== "CANCELLED").length, ""], ["Clientes", S.clients.filter((c) => c.active).length, "cadastrados"], ["Concluídos", doneMonth.length, "neste mês"], ["Faturamento", money(doneMonth.reduce((s, a) => s + a.price, 0)), "concluídos no mês"], ["Pendentes", S.appts.filter((a) => a.status === "PENDING" && a.date >= t).length, "aguardando confirmação"]].map(([a, b, c]) => `<div class="stat"><span class="cap muted">${a}</span><b>${b}</b><small>${c}</small></div>`).join("")}</div>
      <div class="grid md2" style="margin-top:16px;gap:16px"><div class="box pad"><p class="cap muted" style="margin-bottom:20px">Agendamentos · 7 dias</p>${bars(counts, String)}</div><div class="box pad"><p class="cap muted" style="margin-bottom:20px">Faturamento · 7 dias</p>${bars(revenue, (v) => (v ? `R$${Math.round(v / 100)}` : ""))}</div></div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin:36px 0 12px"><p class="cap muted">Agenda do dia</p><a class="cap" style="font-weight:700" href="#/admin/agenda">Agenda completa →</a></div>
      ${todayList.length ? `<ul class="list">${todayList.map((a) => apptRow(a, "ADMIN", "client")).join("")}</ul>` : empty("Nenhum agendamento hoje", "")}`;
  }

  function adminAgenda(date) {
    return `<div class="page-head"><div><h1 class="title">Agenda</h1><p>Todos os barbeiros no dia. Clique em um nome para ver a agenda dedicada.</p></div></div>
      ${dateBar(date, "#/admin/agenda")}
      <div class="grid md2" style="gap:16px">${activeBarbers().map((b) => `<div><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><a href="#/admin/agenda/${b.id}?d=${date}" style="font-size:20px;text-transform:uppercase">${esc(b.name)} ↗</a><span class="cap muted">${S.appts.filter((a) => a.barberId === b.id && a.date === date && a.status !== "CANCELLED").length} atend.</span></div>${timeline(b.id, date, "ADMIN")}</div>`).join("")}</div>`;
  }

  function adminBarberAgenda(barberId, date) {
    const b = barberOf(barberId);
    if (!b) return empty("Barbeiro não encontrado", "");
    const base = `#/admin/agenda/${b.id}`;
    return `<a href="#/admin/agenda" class="cap muted">← Agenda geral</a>
      <div class="page-head" style="margin-top:16px"><div style="display:flex;gap:16px;align-items:center">${avatar(b.name, "lg")}<div><p class="cap muted">Agenda de</p><h1 class="title">${esc(b.name)}</h1><p>${esc(b.specialty)}</p></div></div>
      <button class="btn" data-act="admin-new" data-barber="${b.id}">${icon("plus")} Agendar com ${esc(b.name)}</button></div>
      <div class="chips" style="margin-bottom:16px">${activeBarbers().map((x) => `<a class="chip ${x.id === b.id ? "on" : ""}" href="#/admin/agenda/${x.id}?d=${date}">${esc(x.name)}</a>`).join("")}</div>
      ${weekStrip(b.id, date, base)}${dateBar(date, base)}${timeline(b.id, date, "ADMIN")}`;
  }

  function adminAppointments() {
    const f = ui.filters;
    const list = S.appts.filter((a) => (!f.status || a.status === f.status) && (!f.barberId || a.barberId === f.barberId) && (!f.date || a.date === f.date))
      .sort((a, b) => (b.date + b.start).localeCompare(a.date + a.start)).slice(0, 60);
    return `<div class="page-head"><div><h1 class="title">Agendamentos</h1><p>Crie, confirme, reagende, conclua ou cancele.</p></div><button class="btn" data-act="admin-new">${icon("plus")} Novo agendamento</button></div>
      <div class="box" style="padding:12px;margin-bottom:16px;display:grid;gap:8px;grid-template-columns:repeat(auto-fit,minmax(180px,1fr))">
        <input type="date" class="input" value="${f.date}" data-act-change="filter" data-key="date" aria-label="Data" />
        <select class="input" data-act-change="filter" data-key="barberId" aria-label="Barbeiro"><option value="">Todos os barbeiros</option>${S.barbers.map((b) => `<option value="${b.id}" ${f.barberId === b.id ? "selected" : ""}>${esc(b.name)}</option>`).join("")}</select>
        <select class="input" data-act-change="filter" data-key="status" aria-label="Status"><option value="">Todos os status</option>${Object.keys(STATUS_LABEL).map((s) => `<option value="${s}" ${f.status === s ? "selected" : ""}>${STATUS_LABEL[s]}</option>`).join("")}</select>
        <button class="btn ghost" data-act="clear-filters">Limpar filtros</button></div>
      ${list.length ? `<ul class="list">${list.map((a) => apptRow(a, "ADMIN", "client")).join("")}</ul>` : empty("Nenhum agendamento encontrado", "Ajuste os filtros.")}`;
  }

  function adminClients() {
    return `<div class="page-head"><div><h1 class="title">Clientes</h1><p>${S.clients.length} clientes cadastrados.</p></div></div>
      <div class="table-wrap"><table><thead><tr><th>Nome</th><th>Telefone</th><th>E-mail</th><th>Agend.</th><th>Último atendimento</th><th>Clube</th><th></th></tr></thead><tbody>
      ${S.clients.map((c) => {
        const mine = S.appts.filter((a) => a.clientId === c.id);
        const last = mine.filter((a) => a.status === "COMPLETED").sort((a, b) => b.date.localeCompare(a.date))[0];
        const l = loyalty(c.id);
        return `<tr><td><strong style="font-weight:500">${esc(c.name)}</strong></td><td class="muted" style="white-space:nowrap">${phone(c.phone)}</td><td class="muted">${esc(c.email)}</td><td>${mine.length}</td><td class="muted">${last ? fmtDate(last.date) : "—"}</td><td>${l.stamps}/${l.goal}${l.available ? ` · <b>${l.available} 🎁</b>` : ""}</td>
          <td><button class="btn ghost sm" data-act="client-detail" data-id="${c.id}">Ver</button></td></tr>`;
      }).join("")}</tbody></table></div>`;
  }

  function adminServices() {
    return `<div class="page-head"><div><h1 class="title">Serviços</h1><p>Preços e duração exibidos no agendamento.</p></div><button class="btn" data-act="service-form">${icon("plus")} Novo serviço</button></div>
      <ul class="list">${S.services.map((s) => `<li><div class="row" style="${s.active ? "" : "opacity:.55"}"><div class="info"><div><strong style="font-weight:500;font-size:17px">${esc(s.name)}</strong>${s.active ? "" : ` <span class="badge b-CANCELLED" style="text-decoration:none">Inativo</span>`}<p>${esc(s.desc)}</p></div></div>
        <div class="acts" style="align-items:center;gap:16px"><span class="muted" style="font-size:14px">${dur(s.dur)}</span><span style="font-size:18px;min-width:90px">${money(s.price)}</span>
        <button class="switch ${s.active ? "on" : ""}" role="switch" aria-checked="${s.active}" aria-label="Ativar/desativar ${esc(s.name)}" data-act="toggle-service" data-id="${s.id}"></button>
        <button class="btn ghost sm" data-act="service-form" data-id="${s.id}">Editar</button></div></div></li>`).join("")}</ul>`;
  }

  function adminPlans() {
    const subs = S.subs.filter((s) => s.status !== "CANCELLED");
    const mrr = subs.filter((s) => s.status === "ACTIVE").reduce((t, s) => t + s.price, 0);
    return `<div class="page-head"><div><h1 class="title">Planos & Clube</h1><p>${subs.filter((s) => s.status === "ACTIVE").length} assinante(s) ativo(s) · ${money(mrr)}/mês recorrente</p></div></div>
      <p class="cap muted" style="margin-bottom:12px">Planos</p>
      <ul class="list">${S.plans.map((p) => `<li><div class="row"><div class="info"><div><strong style="font-weight:500;font-size:17px">${esc(p.name)}</strong><p>${p.benefits.map(esc).join(" · ")}</p></div></div><div class="acts"><span style="font-size:18px">${money(p.price)}<span class="muted" style="font-size:12px">/mês</span></span></div></div></li>`).join("")}</ul>
      <p class="cap muted" style="margin:32px 0 12px">Assinaturas</p>
      ${subs.length ? `<ul class="list">${subs.map((s) => `<li><div class="row"><div class="info"><div><strong style="font-weight:500">${esc(clientOf(s.clientId).name)}</strong> <span class="badge" style="color:${s.status === "ACTIVE" ? "var(--ok)" : "var(--warn)"}">${SUB_LABEL[s.status]}</span><p>${esc(planOf(s.planId).name)} · ${money(s.price)}/mês</p></div></div>
        <div class="acts">${s.status === "PENDING" ? `<button class="btn secondary sm" data-act="activate-sub" data-id="${s.id}">${icon("check")} Ativar</button>` : ""}<button class="btn danger sm" data-act="admin-cancel-sub" data-id="${s.id}">${icon("x")} Cancelar</button></div></div></li>`).join("")}</ul>` : empty("Nenhuma assinatura", "")}
      <div class="box pad" style="margin-top:32px"><p class="cap muted">Clube do Mandu</p><p style="margin-top:10px;font-size:14px" class="muted">A cada <b style="color:var(--fg)">${S.settings.loyaltyGoal}</b> atendimentos concluídos o cliente ganha <b style="color:var(--fg)">${esc(S.settings.loyaltyReward)}</b>. Resgates são registrados em Clientes → Ver.</p></div>`;
  }

  function adminHours() {
    return `<div class="page-head"><div><h1 class="title">Horários</h1><p>Nenhum agendamento é aceito fora destes horários ou durante o intervalo.</p></div></div>
      <form data-form="hours" class="box">
        ${[1, 2, 3, 4, 5, 6, 0].map((d) => { const h = S.hours[d]; return `<div style="display:grid;gap:10px;padding:14px 18px;border-bottom:1px solid var(--faint);grid-template-columns:repeat(auto-fit,minmax(130px,1fr));align-items:center">
          <label style="display:flex;gap:12px;align-items:center"><input type="checkbox" name="active-${d}" ${h.active ? "checked" : ""} style="width:18px;height:18px;accent-color:#fefefe" /> <strong style="font-weight:500">${DOW[d]}</strong></label>
          <input class="input" type="time" step="900" name="start-${d}" value="${h.start}" aria-label="Abre" /><input class="input" type="time" step="900" name="end-${d}" value="${h.end}" aria-label="Fecha" />
          <input class="input" type="time" step="900" name="bs-${d}" value="${h.bs}" aria-label="Início do intervalo" /><input class="input" type="time" step="900" name="be-${d}" value="${h.be}" aria-label="Fim do intervalo" /></div>`; }).join("")}
        <div style="padding:16px 18px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;align-items:center"><span class="cap muted">Dia · Abre · Fecha · Intervalo (início/fim)</span><button class="btn" type="submit">Salvar horários</button></div>
      </form>`;
  }

  // ---------------------------------------------------------------------------
  // Modais
  // ---------------------------------------------------------------------------
  function modalFrame(title, sub, body, wide) {
    return `<div class="overlay"><div class="modal ${wide ? "wide" : ""}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="modal-head"><div><h3>${esc(title)}</h3>${sub ? `<p>${sub}</p>` : ""}</div><button data-act="close-modal" aria-label="Fechar">${icon("x")}</button></div>
      <div class="modal-body">${body}</div></div></div>`;
  }

  function renderModal() {
    const root = document.getElementById("modal-root");
    const m = ui.modal;
    if (!m) { root.innerHTML = ""; return; }
    const u = me();
    const a = m.id ? S.appts.find((x) => x.id === m.id) : null;
    let html = "";
    if (m.type === "details" && a) {
      const staff = u.role !== "CLIENT", c = clientOf(a.clientId);
      html = modalFrame("Detalhes do agendamento", "", `<dl class="summary" style="grid-template-columns:1fr 1fr">${[["Serviço", svcOf(a.serviceId).name], ["Status", null], ["Data", fmtDate(a.date)], ["Horário", `${a.start} – ${a.end}`], ["Barbeiro", barberOf(a.barberId).name], ["Valor", money(a.price)], ...(staff ? [["Cliente", c.name], ["Telefone", phone(c.phone)]] : [])].map(([k, v]) => `<div><dt>${k}</dt><dd>${v === null ? badge(a.status) : esc(v)}</dd></div>`).join("")}</dl>
        ${a.reason ? `<p class="muted" style="margin-top:16px;font-size:14px">Motivo do cancelamento: ${esc(a.reason)}</p>` : ""}
        ${staff ? `<form data-form="notes" style="margin-top:20px;display:grid;gap:10px"><div class="field"><label for="notes">Observações</label><textarea class="input" id="notes" name="notes" maxlength="500" placeholder="Preferências do cliente...">${esc(a.notes)}</textarea></div><div><button class="btn secondary sm" type="submit">Salvar observações</button></div></form>` : a.notes ? `<p style="margin-top:16px;font-size:14px">“${esc(a.notes)}”</p>` : ""}`);
    } else if (m.type === "cancel" && a) {
      html = modalFrame("Cancelar agendamento?", `${esc(svcOf(a.serviceId).name)} em ${fmtDate(a.date)} às ${a.start}. O horário será liberado.`, `<form data-form="cancel"><div class="field"><label for="reason">Motivo (opcional)</label><input class="input" id="reason" name="reason" maxlength="300" /></div>
        <div class="modal-foot"><button type="button" class="btn outline" data-act="close-modal">Voltar</button><button class="btn solid-danger" type="submit">Cancelar agendamento</button></div></form>`);
    } else if (m.type === "complete" && a) {
      html = modalFrame("Concluir atendimento?", `${esc(svcOf(a.serviceId).name)} de ${esc(clientOf(a.clientId).name)}. Conta 1 selo no Clube do Mandu.`, `<div class="modal-foot" style="margin-top:0;border:0;padding:0"><button class="btn outline" data-act="close-modal">Voltar</button><button class="btn" data-act="do-complete" data-id="${a.id}">Concluir</button></div>`);
    } else if (m.type === "resched" && a) {
      const isAdmin = u.role === "ADMIN";
      const bId = m.barberId || a.barberId;
      const slots = m.date ? availability([bId], m.date, svcOf(a.serviceId).dur, a.id, u.role === "CLIENT") : null;
      html = modalFrame("Reagendar", `${esc(svcOf(a.serviceId).name)} · atual: ${fmtDate(a.date)} às ${a.start}`, `
        ${isAdmin ? `<div class="field" style="margin-bottom:16px"><label for="rs-barber">Barbeiro</label><select class="input" id="rs-barber" data-act-change="rs-barber">${activeBarbers().map((b) => `<option value="${b.id}" ${b.id === bId ? "selected" : ""}>${esc(b.name)}</option>`).join("")}</select></div>` : ""}
        <div class="grid md2" style="gap:20px">${calendar(m.date, m.month, todayKey(), null, S.hours.filter((h) => !h.active).map((h) => h.day), "rs-date")}
        <div>${slots ? slotsView(slots, m.time, "rs-time") : `<p class="empty muted" style="font-size:14px">Selecione uma data para ver os horários.</p>`}</div></div>
        <div class="modal-foot"><button class="btn outline" data-act="close-modal">Voltar</button><button class="btn" data-act="do-resched" ${m.date && m.time ? "" : "disabled"}>Confirmar novo horário</button></div>`, true);
    } else if (m.type === "client-detail") {
      const c = clientOf(m.clientId), l = loyalty(c.id);
      const hist = S.appts.filter((x) => x.clientId === c.id).sort((x, y) => (y.date + y.start).localeCompare(x.date + x.start)).slice(0, 8);
      html = modalFrame(c.name, `${esc(c.email)} · ${phone(c.phone)}`, `${loyaltyCard(l)}
        <button class="btn secondary" style="margin-top:12px" data-act="redeem" data-id="${c.id}" ${l.available ? "" : "disabled"}>Registrar resgate (${l.available})</button>
        <p class="cap muted" style="margin:24px 0 8px">Últimos agendamentos</p>
        <ul class="list">${hist.map((x) => `<li style="display:flex;justify-content:space-between;gap:12px;padding:10px 12px;font-size:14px"><span>${fmtDate(x.date)} ${x.start} · ${esc(svcOf(x.serviceId).name)} · ${esc(barberOf(x.barberId).name)}</span>${badge(x.status)}</li>`).join("")}</ul>`, true);
    } else if (m.type === "service-form") {
      const s = m.id ? svcOf(m.id) : { name: "", desc: "", price: 0, dur: 30 };
      html = modalFrame(m.id ? "Editar serviço" : "Novo serviço", m.id ? "Agendamentos existentes mantêm o preço original." : "", `<form data-form="service" style="display:grid;gap:14px">
        <div class="field"><label for="sv-name">Nome</label><input class="input" id="sv-name" name="name" value="${esc(s.name)}" required minlength="2" maxlength="80" /></div>
        <div class="field"><label for="sv-desc">Descrição</label><textarea class="input" id="sv-desc" name="desc" maxlength="300">${esc(s.desc)}</textarea></div>
        <div class="grid g2"><div class="field"><label for="sv-price">Preço (R$)</label><input class="input" id="sv-price" name="price" type="number" min="0" step="0.01" value="${(s.price / 100).toFixed(2)}" required /></div>
        <div class="field"><label for="sv-dur">Duração (min)</label><input class="input" id="sv-dur" name="dur" type="number" min="5" max="480" step="5" value="${s.dur}" required /></div></div>
        <div class="modal-foot"><button type="button" class="btn outline" data-act="close-modal">Cancelar</button><button class="btn" type="submit">${m.id ? "Salvar" : "Criar serviço"}</button></div></form>`);
    } else if (m.type === "register") {
      html = modalFrame("Criar conta", "Na demonstração, a conta fica salva só neste navegador.", `<form data-form="register" style="display:grid;gap:14px">
        <div class="field"><label for="rg-name">Nome completo</label><input class="input" id="rg-name" name="name" required minlength="3" maxlength="100" autocomplete="name" /></div>
        <div class="field"><label for="rg-email">E-mail</label><input class="input" id="rg-email" name="email" type="email" required autocomplete="email" /></div>
        <div class="field"><label for="rg-phone">Telefone</label><input class="input" id="rg-phone" name="phone" required inputmode="tel" placeholder="(11) 98888-7777" /></div>
        <div class="field"><label for="rg-pass">Senha</label><input class="input" id="rg-pass" name="password" type="password" required minlength="8" autocomplete="new-password" /></div>
        <div class="modal-foot"><button type="button" class="btn outline" data-act="close-modal">Cancelar</button><button class="btn" type="submit">Criar conta</button></div></form>`);
    }
    root.innerHTML = html;
    const firstInput = root.querySelector("input:not([type=hidden]), textarea");
    if (firstInput && m.type !== "resched") firstInput.focus();
  }

  // ---------------------------------------------------------------------------
  // Renderização e rotas
  // ---------------------------------------------------------------------------
  function render() {
    const app = document.getElementById("app");
    const r = route();
    const u = me();
    const area = r.parts[0];
    let html;

    if (!area) html = homePage();
    else if (area === "entrar") html = loginPage();
    else {
      const need = { cliente: "CLIENT", barbeiro: "BARBER", admin: "ADMIN" }[area];
      if (!need) { go("#/"); return; }
      if (!u) { go("#/entrar"); return; }
      if (u.role !== need) { toast("Permissão insuficiente: você foi redirecionado para o seu painel.", false); go(HOME[u.role]); return; }
      const date = /^\d{4}-\d{2}-\d{2}$/.test(r.q.get("d") || "") ? r.q.get("d") : todayKey();
      const sub = r.parts[1];
      if (need === "CLIENT") {
        let body;
        if (sub === "agendamentos") body = clientAppointments(u);
        else if (sub === "agendar") { if (!ui.wiz || ui.wiz.mode !== "client") startWizard(); body = `<p class="cap muted">Novo agendamento</p><h1 class="title" style="margin:8px 0 28px">Reserve seu horário</h1>${wizardView()}`; }
        else if (sub === "clube") body = clientClub(u);
        else if (sub === "plano") body = clientPlan(u);
        else if (sub === "perfil") body = clientProfile(u);
        else body = clientHome(u);
        html = shell(u, clientNav, body);
      } else if (need === "BARBER") {
        html = shell(u, barberNav, sub === "agenda" ? barberAgenda(u, date) : barberHome(u));
      } else {
        let body;
        if (sub === "agenda") body = r.parts[2] ? adminBarberAgenda(r.parts[2], date) : adminAgenda(date);
        else if (sub === "agendamentos") body = adminAppointments();
        else if (sub === "novo") { if (!ui.wiz || ui.wiz.mode !== "admin") startWizard({ mode: "admin" }); body = `<h1 class="title" style="margin-bottom:28px">Novo agendamento</h1>${wizardView()}`; }
        else if (sub === "clientes") body = adminClients();
        else if (sub === "servicos") body = adminServices();
        else if (sub === "planos") body = adminPlans();
        else if (sub === "horarios") body = adminHours();
        else body = adminDashboard();
        html = shell(u, adminNav(), body);
      }
    }
    app.innerHTML = html;
    renderModal();
  }

  const rerender = () => { render(); };
  const closeModal = () => { ui.modal = null; renderModal(); };

  // ---------------------------------------------------------------------------
  // Ações
  // ---------------------------------------------------------------------------
  function bookFrom(el) {
    const u = me();
    const opts = { serviceId: el.dataset.service, barberId: el.dataset.barber };
    if (u && u.role === "CLIENT") { startWizard(opts); go("#/cliente/agendar"); return; }
    if (u && u.role === "ADMIN") { startWizard({ ...opts, mode: "admin" }); go("#/admin/novo"); return; }
    ui.pendingBook = opts;
    toast("Entre como cliente para agendar.");
    go("#/entrar?next=agendar");
  }

  const actions = {
    "reset-demo": () => { if (!confirm("Recomeçar a demonstração? Todos os dados de teste voltam ao início.")) return; S = seed(); save(); ui.wiz = null; ui.modal = null; toast("Demonstração reiniciada."); go("#/"); },
    scroll: (el) => document.getElementById(el.dataset.id)?.scrollIntoView({ behavior: "smooth" }),
    book: bookFrom,
    menu: () => { ui.menu = !ui.menu; rerender(); },
    goto: (el) => go(el.dataset.href),
    login: (el) => {
      const role = el.dataset.role;
      const id = role === "BARBER" ? document.getElementById("pick-barber").value : el.dataset.id || "admin";
      S.session = { role, id };
      save();
      ui.menu = false;
      const name = me().name;
      toast(`Bem-vindo, ${first(name)}!`);
      if (role === "CLIENT" && (el.dataset.next === "agendar" || ui.pendingBook)) { startWizard(ui.pendingBook || {}); ui.pendingBook = null; go("#/cliente/agendar"); return; }
      go(HOME[role]);
    },
    "open-register": () => { ui.modal = { type: "register" }; renderModal(); },
    logout: () => { S.session = null; save(); ui.wiz = null; ui.menu = false; toast("Você saiu."); go("#/"); },
    tab: (el) => { ui.tab = el.dataset.tab; rerender(); },
    details: (el) => { ui.modal = { type: "details", id: el.dataset.id }; renderModal(); },
    cancel: (el) => {
      const a = S.appts.find((x) => x.id === el.dataset.id);
      if (me().role === "CLIENT" && hoursUntil(a) < S.settings.cancelHours) { toast(`O prazo para cancelar é de ${S.settings.cancelHours}h de antecedência.`, false); return; }
      ui.modal = { type: "cancel", id: a.id }; renderModal();
    },
    confirm: (el) => { const a = S.appts.find((x) => x.id === el.dataset.id); if (a.status !== "PENDING") return; a.status = "CONFIRMED"; save(); toast("Agendamento confirmado."); rerender(); },
    complete: (el) => { ui.modal = { type: "complete", id: el.dataset.id }; renderModal(); },
    "do-complete": (el) => { const a = S.appts.find((x) => x.id === el.dataset.id); a.status = "COMPLETED"; save(); ui.modal = null; toast("Atendimento concluído."); rerender(); },
    resched: (el) => {
      const a = S.appts.find((x) => x.id === el.dataset.id);
      if (me().role === "CLIENT" && hoursUntil(a) < S.settings.cancelHours) { toast(`O prazo para reagendar é de ${S.settings.cancelHours}h de antecedência.`, false); return; }
      ui.modal = { type: "resched", id: a.id, date: null, time: null, month: todayKey().slice(0, 7), barberId: a.barberId }; renderModal();
    },
    "rs-date": (el) => { ui.modal.date = el.dataset.date; ui.modal.time = null; renderModal(); },
    "rs-time": (el) => { ui.modal.time = el.dataset.time; renderModal(); },
    "do-resched": () => {
      const m = ui.modal, u = me(), a = S.appts.find((x) => x.id === m.id), svc = svcOf(a.serviceId);
      const err = checkSlot(m.barberId, m.date, m.time, svc.dur, a.id, u.role === "CLIENT");
      if (err) { toast(err, false); m.time = null; renderModal(); return; }
      Object.assign(a, { barberId: m.barberId, date: m.date, start: m.time, end: toHM(toMin(m.time) + svc.dur), status: u.role === "CLIENT" ? "PENDING" : a.status });
      save(); ui.modal = null; toast("Agendamento reagendado."); rerender();
    },
    "cal-month": (el) => {
      const target = ui.modal && ui.modal.type === "resched" ? ui.modal : ui.wiz;
      const [y, mo] = target.month.split("-").map(Number);
      const d = new Date(y, mo - 1 + Number(el.dataset.dir), 1);
      target.month = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
      if (ui.modal && ui.modal.type === "resched") renderModal(); else rerender();
    },
    "close-modal": closeModal,
    "wiz-service": (el) => { ui.wiz.serviceId = el.dataset.id; ui.wiz.time = null; ui.wiz.step = 1; rerender(); },
    "wiz-barber": (el) => { ui.wiz.barberId = el.dataset.id; ui.wiz.time = null; ui.wiz.step = 2; rerender(); },
    "wiz-date": (el) => { ui.wiz.date = el.dataset.date; ui.wiz.time = null; ui.wiz.step = 3; rerender(); },
    "wiz-time": (el) => { ui.wiz.time = el.dataset.time; ui.wiz.step = 4; rerender(); },
    "wiz-step": (el) => { ui.wiz.step = Number(el.dataset.step); rerender(); },
    "wiz-restart": () => { startWizard({ mode: ui.wiz.mode }); rerender(); },
    "wiz-confirm": () => {
      const w = ui.wiz, u = me();
      const notes = document.getElementById("wiz-notes")?.value.trim().slice(0, 500) || "";
      const res = createAppointment({ clientId: w.mode === "admin" ? w.clientId : u.id, serviceId: w.serviceId, barberId: w.barberId, date: w.date, time: w.time, notes }, w.mode === "admin");
      if (res.error) { toast(res.error, false); w.time = null; w.step = 3; rerender(); return; }
      w.done = res.appt.id; toast("Agendamento realizado com sucesso!"); rerender(); window.scrollTo({ top: 0 });
    },
    "admin-new": (el) => { startWizard({ mode: "admin", barberId: el.dataset.barber }); go("#/admin/novo"); },
    "clear-filters": () => { ui.filters = { status: "", barberId: "", date: "" }; rerender(); },
    "client-detail": (el) => { ui.modal = { type: "client-detail", clientId: el.dataset.id }; renderModal(); },
    redeem: (el) => { const l = loyalty(el.dataset.id); if (!l.available) return; S.redemptions.push({ id: uid("r"), clientId: el.dataset.id, date: todayKey() }); save(); toast("Recompensa resgatada."); renderModal(); rerender(); },
    "service-form": (el) => { ui.modal = { type: "service-form", id: el.dataset.id || null }; renderModal(); },
    "toggle-service": (el) => { const s = svcOf(el.dataset.id); s.active = !s.active; save(); toast(s.active ? "Serviço ativado." : "Serviço desativado."); rerender(); },
    "request-plan": (el) => {
      const u = me(); if (S.subs.some((s) => s.clientId === u.id && s.status !== "CANCELLED")) return;
      const p = planOf(el.dataset.id);
      S.subs.push({ id: uid("sub"), clientId: u.id, planId: p.id, status: "PENDING", price: p.price, since: todayKey() }); save();
      toast("Solicitação enviada! A barbearia ativa o plano após o pagamento."); rerender();
    },
    "cancel-sub": (el) => { if (!confirm("Cancelar o plano?")) return; S.subs.find((s) => s.id === el.dataset.id).status = "CANCELLED"; save(); toast("Plano cancelado."); rerender(); },
    "activate-sub": (el) => { S.subs.find((s) => s.id === el.dataset.id).status = "ACTIVE"; save(); toast("Assinatura ativada."); rerender(); },
    "admin-cancel-sub": (el) => { if (!confirm("Cancelar esta assinatura?")) return; S.subs.find((s) => s.id === el.dataset.id).status = "CANCELLED"; save(); toast("Assinatura cancelada."); rerender(); },
  };

  const changeActions = {
    "pick-date": (el) => { if (el.value) go(`${el.dataset.base}?d=${el.value}`); },
    filter: (el) => { ui.filters[el.dataset.key] = el.value; rerender(); },
    "wiz-client": (el) => { ui.wiz.clientId = el.value; rerender(); },
    "wiz-notes": (el) => { ui.wiz.notes = el.value.slice(0, 500); },
    "rs-barber": (el) => { ui.modal.barberId = el.value; ui.modal.time = null; renderModal(); },
  };

  const forms = {
    cancel: (fd) => { const a = S.appts.find((x) => x.id === ui.modal.id); Object.assign(a, { status: "CANCELLED", reason: String(fd.get("reason") || "").trim().slice(0, 300) }); save(); ui.modal = null; toast("Agendamento cancelado. O horário foi liberado."); rerender(); },
    notes: (fd) => { const a = S.appts.find((x) => x.id === ui.modal.id); a.notes = String(fd.get("notes") || "").trim().slice(0, 500); save(); toast("Observações salvas."); rerender(); },
    profile: (fd) => {
      const c = clientOf(me().id), name = String(fd.get("name")).trim(), ph = String(fd.get("phone")).replace(/\D/g, "");
      if (name.length < 3) return toast("Informe o nome completo.", false);
      if (!/^\d{10,11}$/.test(ph)) return toast("Telefone inválido. Use DDD + número.", false);
      c.name = name; c.phone = ph; save(); toast("Dados atualizados."); rerender();
    },
    service: (fd) => {
      const data = { name: String(fd.get("name")).trim(), desc: String(fd.get("desc")).trim(), price: Math.round(Number(fd.get("price")) * 100), dur: Number(fd.get("dur")) };
      if (data.name.length < 2 || !(data.price >= 0) || !(data.dur >= 5)) return toast("Verifique os dados informados.", false);
      if (ui.modal.id) Object.assign(svcOf(ui.modal.id), data); else S.services.push({ id: uid("s"), active: true, ...data });
      save(); toast(ui.modal.id ? "Serviço atualizado." : "Serviço criado."); ui.modal = null; rerender();
    },
    register: (fd) => {
      const email = String(fd.get("email")).trim().toLowerCase(), ph = String(fd.get("phone")).replace(/\D/g, ""), pass = String(fd.get("password"));
      if (S.clients.some((c) => c.email === email)) return toast("Este e-mail já está cadastrado.", false);
      if (!/^\d{10,11}$/.test(ph)) return toast("Telefone inválido. Use DDD + número.", false);
      if (pass.length < 8 || !/\d/.test(pass) || !/[a-z]/i.test(pass)) return toast("A senha deve ter 8+ caracteres, com letras e números.", false);
      const c = { id: uid("c"), name: String(fd.get("name")).trim(), email, phone: ph, active: true };
      S.clients.push(c); S.session = { role: "CLIENT", id: c.id }; save(); ui.modal = null;
      toast("Conta criada com sucesso. Bem-vindo!"); go("#/cliente");
    },
    hours: (fd) => {
      const next = S.hours.map((h) => ({ ...h, active: fd.get(`active-${h.day}`) === "on", start: fd.get(`start-${h.day}`), end: fd.get(`end-${h.day}`), bs: fd.get(`bs-${h.day}`), be: fd.get(`be-${h.day}`) }));
      const bad = next.find((h) => h.active && (toMin(h.end) <= toMin(h.start) || (h.bs && h.be && (toMin(h.be) <= toMin(h.bs) || toMin(h.bs) < toMin(h.start) || toMin(h.be) > toMin(h.end)))));
      if (bad) return toast(`Horário inválido em ${DOW[bad.day]}.`, false);
      S.hours = next; save(); toast("Horários salvos. A agenda já usa os novos horários."); rerender();
    },
  };

  // ---------------------------------------------------------------------------
  // Eventos (delegação)
  // ---------------------------------------------------------------------------
  document.addEventListener("click", (ev) => {
    // Clique no fundo escuro fecha o modal (sem interferir nos formulários dentro dele)
    if (ev.target.classList && ev.target.classList.contains("overlay")) { closeModal(); return; }
    const el = ev.target.closest("[data-act]");
    if (!el || el.disabled) return;
    const fn = actions[el.dataset.act];
    if (fn) { ev.preventDefault(); fn(el, ev); }
  });
  document.addEventListener("change", (ev) => {
    const el = ev.target.closest("[data-act-change]");
    if (el && changeActions[el.dataset.actChange]) changeActions[el.dataset.actChange](el);
  });
  document.addEventListener("input", (ev) => {
    const el = ev.target.closest("[data-act-change='wiz-notes']");
    if (el) changeActions["wiz-notes"](el);
  });
  document.addEventListener("submit", (ev) => {
    const form = ev.target.closest("[data-form]");
    if (!form) return;
    ev.preventDefault();
    forms[form.dataset.form]?.(new FormData(form));
  });
  document.addEventListener("keydown", (ev) => { if (ev.key === "Escape" && ui.modal) closeModal(); });
  window.addEventListener("hashchange", () => { ui.menu = false; ui.animate = true; render(); ui.animate = false; window.scrollTo({ top: 0 }); });

  ui.animate = true;
  render();
  ui.animate = false;
})();
