const DAY = 86400000;
export const cents = value => Math.round((value + Number.EPSILON) * 100) / 100;
export const sumMoney = values => cents(values.reduce((a, b) => a + b, 0));
export const positiveAmount = n => Number.isFinite(n) && n >= 0 && n <= 1e8;
export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function dateNumber(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
  const [y, m, d] = value.split('-').map(Number);
  if (y < 1900 || y > 2200) return NaN;
  const n = Date.UTC(y, m - 1, d);
  return new Date(n).toISOString().slice(0, 10) === value ? n : NaN;
}
export function projectPeriod(p) {
  const start = dateNumber(p.startDate || todayISO());
  const d = new Date(start);
  const next = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + p.months, 1));
  const lastDay = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
  next.setUTCDate(Math.min(d.getUTCDate(), lastDay));
  return {start, end:next.getTime() - DAY, startDate:new Date(start).toISOString().slice(0, 10), endDate:new Date(next.getTime() - DAY).toISOString().slice(0, 10)};
}
export function weekdaysBetween(start, end) {
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0;
  const days = Math.floor((end - start) / DAY) + 1;
  let count = Math.floor(days / 7) * 5;
  const firstDay = new Date(start).getUTCDay();
  for (let i = 0; i < days % 7; i++) if (![0, 6].includes((firstDay + i) % 7)) count++;
  return count;
}
export function consultantDays(c, p) {
  const period = projectPeriod(p);
  const start = Math.max(dateNumber(c.startDate), period.start);
  const end = Math.min(dateNumber(c.endDate), period.end);
  const calendarDays = Number.isFinite(start) && Number.isFinite(end) && end >= start ? Math.floor((end - start) / DAY) + 1 : 0;
  const weekdays = weekdaysBetween(start, end);
  return {start, end, calendarDays, weekdays, weekendDays:calendarDays - weekdays, workedDays:Math.max(0, weekdays - c.offDays + c.extraDays)};
}
export function validCostModel(m) {
  if (!m || m.version !== 1 || typeof m.id !== 'string' || typeof m.name !== 'string' || !m.name.trim() || m.name.length > 100 || typeof m.notes !== 'string' || m.notes.length > 5000) return false;
  if (!Number.isFinite(m.usdPerEur) || m.usdPerEur <= 0 || m.usdPerEur > 1e5 || !Number.isFinite(m.budgetEurPerUsd) || m.budgetEurPerUsd <= 0 || m.budgetEurPerUsd > 1e5 || typeof m.useBudgetFx !== 'boolean') return false;
  if (!positiveAmount(m.vatRate) || m.vatRate > 100 || !positiveAmount(m.safetyRate) || m.safetyRate > 100 || !['none', 'add', 'included'].includes(m.safetyMode) || !positiveAmount(m.suggestedRate)) return false;
  if (!Array.isArray(m.lines) || m.lines.length > 100 || new Set(m.lines.map(l => l?.id)).size !== m.lines.length) return false;
  return m.lines.every(l => l && typeof l.id === 'string' && typeof l.name === 'string' && l.name.length <= 150 && ['flights', 'lodging', 'taxes', 'contractors', 'salaries', 'other'].includes(l.category) && positiveAmount(l.amount) && positiveAmount(l.quantity) && l.quantity <= 1e7 && ['USD', 'EUR'].includes(l.currency) && ['day', 'once', 'amortized'].includes(l.basis) && Number.isFinite(l.referenceDays) && l.referenceDays > 0 && l.referenceDays <= 1e6 && ['enabled', 'taxed', 'buffered'].every(k => typeof l[k] === 'boolean'));
}
export function modelExchangeRate(m) { return m.useBudgetFx ? m.budgetEurPerUsd : 1 / m.usdPerEur; }
export function calculateCostModel(m, workedDays) {
  if (!m) return {total:0, base:0, vat:0, safety:0, lines:[], daily:0, oneOff:0};
  const fx = modelExchangeRate(m);
  const lines = m.lines.filter(l => l.enabled).map(l => {
    const units = l.basis === 'once' ? 1 : l.basis === 'amortized' ? workedDays / l.referenceDays : workedDays;
    const base = l.amount * l.quantity * units * (l.currency === 'USD' ? fx : 1);
    const vat = l.taxed ? base * m.vatRate / 100 : 0;
    const safety = l.buffered && m.safetyMode === 'add' ? (base + vat) * m.safetyRate / 100 : 0;
    return {...l, base, vat, safety, rawTotal:base + vat + safety, total:cents(base + vat + safety)};
  });
  const rawTotal = lines.reduce((s, l) => s + l.rawTotal, 0);
  const total = cents(rawTotal);
  const difference = cents(total - sumMoney(lines.map(l => l.total)));
  if (difference && lines.length) {
    const largest = lines.reduce((a, b) => a.rawTotal >= b.rawTotal ? a : b);
    largest.total = cents(largest.total + difference);
    largest.roundingAdjustment = difference;
  }
  const unitCost = l => {
    const base = l.amount * l.quantity * (l.currency === 'USD' ? fx : 1) / (l.basis === 'amortized' ? l.referenceDays : 1);
    const vat = l.taxed ? base * m.vatRate / 100 : 0;
    return base + vat + (l.buffered && m.safetyMode === 'add' ? (base + vat) * m.safetyRate / 100 : 0);
  };
  return {total, base:cents(lines.reduce((s,l) => s+l.base,0)), vat:cents(lines.reduce((s,l) => s+l.vat,0)), safety:cents(lines.reduce((s,l) => s+l.safety,0)), lines,
    daily:cents(m.lines.filter(l=>l.enabled && l.basis!=='once').reduce((s,l)=>s+unitCost(l),0)),
    oneOff:cents(m.lines.filter(l=>l.enabled && l.basis==='once').reduce((s,l)=>s+unitCost(l),0))};
}
export function consultantProblems(c, p) {
  const errors = [];
  if (!c || typeof c.id !== 'string' || typeof c.name !== 'string' || c.name.length > 100) return ['Consultant invalide.'];
  if (!Number.isFinite(dateNumber(c.startDate)) || !Number.isFinite(dateNumber(c.endDate)) || c.endDate < c.startDate) return [`${c.name || 'Consultant'} : vérifiez les dates de début et de fin.`];
  if (!['sellingDayRate', 'purchaseDayRate', 'offDays', 'extraDays', 'overtimeHours', 'overtimeSellingRate', 'overtimePurchaseRate'].every(k => positiveAmount(c[k]))) return [`${c.name || 'Consultant'} : vérifiez les tarifs, jours et heures.`];
  if (c.costModel !== null && !validCostModel(c.costModel)) return [`${c.name || 'Consultant'} : modèle de coûts invalide.`];
  const days = consultantDays(c, p);
  if (c.offDays > days.weekdays) errors.push(`${c.name || 'Consultant'} : les jours non travaillés dépassent les ${days.weekdays} jours de semaine compris dans le projet.`);
  if (c.extraDays > days.weekendDays) errors.push(`${c.name || 'Consultant'} : les jours de week-end supplémentaires dépassent les ${days.weekendDays} jours disponibles dans la période du projet.`);
  if (!days.calendarDays && (c.offDays || c.extraDays || c.overtimeHours)) errors.push(`${c.name || 'Consultant'} : aucune période de présence dans le projet pour ces jours ou heures.`);
  return errors;
}
export function calculateConsultant(c, p, factor = 1) {
  const days = consultantDays(c,p);
  const workedDays = cents(days.workedDays * factor);
  const overtimeHours = cents(c.overtimeHours * factor);
  const regularRevenue = cents(workedDays * c.sellingDayRate);
  const overtimeRevenue = cents(overtimeHours * c.overtimeSellingRate);
  const revenue = sumMoney([regularRevenue, overtimeRevenue]);
  const pay = sumMoney([cents(workedDays*c.purchaseDayRate), cents(overtimeHours*c.overtimePurchaseRate)]);
  const local = calculateCostModel(days.calendarDays ? c.costModel : null, workedDays);
  const expenses = local.lines.map(l => ({...l,id:`${c.id}:local:${l.id}`,name:`${c.name} — ${l.name}`,category:l.category,calculation:'amount',quantity:l.basis==='once'?1:workedDays,price:l.basis==='once'?l.total:(workedDays?l.total/workedDays:0),rate:0,frequency:'planning',variable:l.basis!=='once',serviceId:c.id,source:'local'}));
  if (pay > 0) expenses.push({id:`${c.id}:pay`,name:`${c.name} — rémunération / achat`,category:'salaries',calculation:'amount',quantity:workedDays,price:c.purchaseDayRate,rate:0,frequency:'planning',variable:true,serviceId:c.id,total:pay,source:'pay'});
  return {...c,...days,workedDays,overtimeHours,regularRevenue,overtimeRevenue,revenue,pay,local,expenses,directCosts:sumMoney([pay,local.total]),contribution:cents(revenue-pay-local.total)};
}
export function newCostModel(id) {
  return {version:1,id,name:'Nouveau modèle',notes:'',usdPerEur:1,useBudgetFx:false,budgetEurPerUsd:1,vatRate:0,safetyMode:'none',safetyRate:0,suggestedRate:0,lines:[]};
}
