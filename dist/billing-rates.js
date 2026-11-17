import {dateNumber, weekdaysBetween} from './planning.js?v=3';
const DAY=86400000;
export const quantity=n=>Math.round((n+Number.EPSILON)*1e6)/1e6;
export const cash=n=>Math.round((n+Number.EPSILON)*100)/100;
export const KINDS=[['site','Sur site'],['other','Voyage / remote']];
export function hoursPerDay(c={},profile={}){return c.hoursPerDay??profile.hoursPerDay??8;}
export function monthBounds(month,c){if(!/^\d{4}-\d{2}$/.test(month))return null;const start=Date.parse(month+'-01T00:00:00Z');if(!Number.isFinite(start)||new Date(start).toISOString().slice(0,7)!==month)return null;const d=new Date(start),monthEnd=Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0);const first=Math.max(start,dateNumber(c.startDate)),last=Math.min(monthEnd,dateNumber(c.endDate));const calendarDays=last>=first?Math.floor((last-first)/DAY)+1:0;const weekdays=weekdaysBetween(first,last);return {start:first,end:last,calendarDays,weekdays,weekends:calendarDays-weekdays};}
export function monthList(c){if(!Number.isFinite(dateNumber(c.startDate))||!Number.isFinite(dateNumber(c.endDate))||c.endDate<c.startDate)return [];const result=[];let d=new Date(c.startDate+'T00:00:00Z');d.setUTCDate(1);for(let i=0;i<121&&d.toISOString().slice(0,7)<=c.endDate.slice(0,7);i++){result.push(d.toISOString().slice(0,7));d.setUTCMonth(d.getUTCMonth()+1);}return result;}
export function newMonth(c,month,id){const bounds=monthBounds(month,c);return {id,month,extraWorkDays:0,siteWorkedDays:bounds?.weekdays||0,otherWorkedDays:0,siteDays:bounds?.weekdays||0,otherDays:0,siteRate:c.sellingDayRate||0,otherRate:c.otherSellingRate??c.sellingDayRate??0,siteOvertimeHours:0,otherOvertimeHours:0,siteOvertimeDayRate:c.sellingDayRate||0,otherOvertimeDayRate:c.otherSellingRate??c.sellingDayRate??0};}
export function rowLines(row){return KINDS.map(([kind])=>({kind,days:row[kind+'Days'],dayRate:row[kind+'Rate'],overtimeHours:row[kind+'OvertimeHours'],overtimeDayRate:row[kind+'OvertimeDayRate']}));}
export function lineRawAmount(line,hours){return line.days*line.dayRate+line.overtimeHours/hours*line.overtimeDayRate;}
export function lineAmount(line,hours){return cash(lineRawAmount(line,hours));}
// Reconcile display subtotals with the final cent rounding, keeping equivalent days unrounded in monetary formulas.
export function priceLines(lines,hours){
 const result=lines.map(l=>({...l,amount:lineAmount(l,hours)}));
 const total=cash(lines.reduce((s,l)=>s+lineRawAmount(l,hours),0));
 const gap=cash(total-result.reduce((s,l)=>s+l.amount,0));
 if(gap&&result.length){const largest=result.reduce((a,b)=>a.amount>=b.amount?a:b);largest.amount=cash(largest.amount+gap);}
 return result;
}
export function lineDays(line,hours){return line.days+line.overtimeHours/hours;}
export function monthlyMetrics(c,profile){const h=hoursPerDay(c,profile),rows=c.monthlyRows||[];let worked=0,regular=0,overtime=0,siteEq=0,otherEq=0,revenue=0;const monthly=rows.map(row=>{const lines=rowLines(row),work=row.siteWorkedDays+row.otherWorkedDays,bill=row.siteDays+row.otherDays,oh=row.siteOvertimeHours+row.otherOvertimeHours,total=cash(lines.reduce((s,l)=>s+lineRawAmount(l,h),0));worked+=work;regular+=bill;overtime+=oh;siteEq+=lineDays(lines[0],h);otherEq+=lineDays(lines[1],h);revenue+=total;return {...row,workedDays:work,regularDays:bill,overtimeDays:quantity(oh/h),days:quantity(bill+oh/h),total};});return {workedDays:quantity(worked),regularDays:quantity(regular),overtimeHours:quantity(overtime),overtimeDays:quantity(overtime/h),days:quantity(regular+overtime/h),siteDays:quantity(siteEq),otherDays:quantity(otherEq),revenue:cash(revenue),months:monthly,hoursPerDay:h};}
export function monthlyWeights(c,scope='all'){const result=[];for(const row of c.monthlyRows||[]){const b=monthBounds(row.month,c);if(!b||!b.calendarDays)continue;const days=scope==='site'?row.siteWorkedDays:scope==='other'?row.otherWorkedDays:row.siteWorkedDays+row.otherWorkedDays;const allDays=row.siteWorkedDays+row.otherWorkedDays,weekendPart=Math.min(row.extraWorkDays||0,allDays)*(allDays?days/allDays:0),weekdayPart=days-weekendPart;for(let date=b.start;date<=b.end;date+=DAY){const weekend=[0,6].includes(new Date(date).getUTCDay());const weight=weekend?(b.weekends?weekendPart/b.weekends:0):(b.weekdays?weekdayPart/b.weekdays:0);if(weight>0)result.push({date:new Date(date).toISOString().slice(0,10),weight});}}return result.sort((a,b)=>a.date.localeCompare(b.date));}
const positive=n=>Number.isFinite(n)&&n>=0&&n<=1e10;
export function monthlyProblems(c,profile){
 const active=c.monthlyMode===true;
 if(c.monthlyMode!==undefined&&typeof c.monthlyMode!=='boolean')return ['Mode de saisie mensuelle invalide.'];
 if(c.monthlyRows===undefined&&!active)return [];
 if(!Array.isArray(c.monthlyRows)||c.monthlyRows.length>120||active&&!c.monthlyRows.length)return ['Ajoutez au moins un mois ou utilisez le calcul calendaire.'];
 const errors=[],seen=new Set(),ids=new Set();
 if(!Number.isFinite(hoursPerDay(c,profile))||hoursPerDay(c,profile)<=0||hoursPerDay(c,profile)>24)errors.push('La durée de journée doit être comprise entre 0 et 24 heures.');
 for(const r of c.monthlyRows){
  if(!r||typeof r.id!=='string'||!r.id||r.id.length>200||ids.has(r.id)||seen.has(r.month)){errors.push('Chaque mois doit être unique.');continue;}
  seen.add(r.month);ids.add(r.id);
  const b=monthBounds(r.month,c),fields=['extraWorkDays',...KINDS.flatMap(([k])=>[k+'WorkedDays',k+'Days',k+'Rate',k+'OvertimeHours',k+'OvertimeDayRate'])];
  if(!b||active&&!b.calendarDays||fields.some(k=>!positive(r[k]))){errors.push(`${r.month||'Mois'} : vérifiez les dates, jours, heures et tarifs.`);continue;}
  if(!active)continue;
  if(r.extraWorkDays>b.weekends+.000001||r.siteWorkedDays+r.otherWorkedDays>b.weekdays+r.extraWorkDays+.000001)errors.push(`${r.month} : ${b.weekdays} jours lundi-vendredi disponibles ; les week-ends sont exclus automatiquement. Déclarez explicitement les exceptions.`);
  for(const[k,label]of KINDS)if(r[k+'Days']>r[k+'WorkedDays']+.000001)errors.push(`${r.month} — ${label} : les jours facturés hors heures supplémentaires dépassent les jours travaillés saisis.`);
 }
 return [...new Set(errors)];
}
export function detailedInvoice(i){return Array.isArray(i.billingLines);}
export function invoiceLinesValid(i){if(i.hoursPerDay!==undefined&&(!positive(i.hoursPerDay)||i.hoursPerDay<=0||i.hoursPerDay>24))return false;if(i.sourceMonthlyRowId!==undefined&&(typeof i.sourceMonthlyRowId!=='string'||i.sourceMonthlyRowId.length>200))return false;if(i.billingLines===undefined)return true;return Array.isArray(i.billingLines)&&i.billingLines.length>0&&i.billingLines.length<=2&&new Set(i.billingLines.map(l=>l?.kind)).size===i.billingLines.length&&i.billingLines.every(l=>l&&['site','other'].includes(l.kind)&&['days','dayRate','overtimeHours','overtimeDayRate'].every(k=>positive(l[k])))&&positive(i.hoursPerDay)&&i.hoursPerDay>0&&i.hoursPerDay<=24;}
export function invoiceAmount(i){return detailedInvoice(i)?cash(i.billingLines.reduce((s,l)=>s+lineRawAmount(l,i.hoursPerDay),0)+i.extraHT):cash(i.days*i.dayRate+i.overtimeHours*i.hourRate+i.extraHT);}
export function invoiceDays(i){return quantity(detailedInvoice(i)?i.billingLines.reduce((s,l)=>s+lineDays(l,i.hoursPerDay),0):i.days+i.overtimeHours/(i.hoursPerDay||8));}
export function normalizeInvoice(i){if(!detailedInvoice(i))return i;const regular=i.billingLines.reduce((s,l)=>s+l.days,0),base=i.billingLines.reduce((s,l)=>s+l.days*l.dayRate,0);return {...i,days:quantity(regular),dayRate:regular?base/regular:0,overtimeHours:quantity(i.billingLines.reduce((s,l)=>s+l.overtimeHours,0)),hourRate:0};}
export function invoiceFromMonth(c,row,profile){const b=monthBounds(row.month,c),h=hoursPerDay(c,profile);return {consultantId:c.id,periodStart:new Date(b.start).toISOString().slice(0,10),periodEnd:new Date(b.end).toISOString().slice(0,10),hoursPerDay:h,billingLines:rowLines(row),extraHT:0,sourceMonthlyRowId:row.id};}
export function proposedRates(plan,c,profile){const target=plan.totalCost*(1+plan.markupPct/100),current=plan.revenue,scale=current>0?target/current:null,site=c.sellingDayRate||0,other=c.otherSellingRate??site;return {site:scale===null?plan.targetPrice:cash(site*scale),other:scale===null?plan.targetPrice:cash(other*scale),scale};}
export function applyProposedRates(c,rates){if(rates.site===null)return;c.sellingDayRate=rates.site;c.otherSellingRate=rates.other;if(c.monthlyMode){for(const row of c.monthlyRows){for(const[k]of KINDS){if(rates.scale!==null){row[k+'Rate']=cash(row[k+'Rate']*rates.scale);row[k+'OvertimeDayRate']=cash(row[k+'OvertimeDayRate']*rates.scale);}else{row[k+'Rate']=k==='site'?rates.site:rates.other;row[k+'OvertimeDayRate']=row[k+'Rate'];}}}}else if(rates.scale!==null)c.overtimeSellingRate=cash(c.overtimeSellingRate*rates.scale);}
