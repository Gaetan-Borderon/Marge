import {cents as round, sumMoney as sum, positiveAmount as amountValid, dateNumber, todayISO, validCostModel, consultantProblems, calculateConsultant} from './planning.js?v=3';
export {validCostModel, consultantProblems, projectPeriod, consultantDays, calculateCostModel, modelExchangeRate, newCostModel, todayISO} from './planning.js?v=3';
export const CATEGORIES = {
  flights: 'Billets d’avion', lodging: 'Logement', taxes: 'Taxes',
  contractors: 'Prestataires', salaries: 'Salaires', other: 'Autres frais'
};
export function validProject(p) {
  if (!p || ![2,3].includes(p.version) || typeof p.name !== 'string' || !Number.isInteger(p.months) || p.months < 1 || p.months > 60 || !amountValid(p.investment)) return false;
  if (!Array.isArray(p.revenues) || !Array.isArray(p.expenses) || p.revenues.length > 100 || p.expenses.length > 100) return false;
  const consultants = p.version === 3 ? p.consultants : [];
  if (p.version === 3 && (!Number.isFinite(dateNumber(p.startDate)) || !Array.isArray(consultants) || consultants.length > 100 || (p.defaultCostModel !== null && !validCostModel(p.defaultCostModel)))) return false;
  const ids = [...p.revenues.map(r => r?.id), ...consultants.map(c => c?.id)];
  if (new Set(ids).size !== ids.length || new Set(p.expenses.map(e => e?.id)).size !== p.expenses.length) return false;
  if (consultants.some(c => consultantProblems(c,p).length)) return false;
  return p.revenues.every(r => r && typeof r.id === 'string' && typeof r.name === 'string' && ['service','product'].includes(r.kind) && amountValid(r.quantity) && r.quantity <= 1e7 && amountValid(r.price) && ['once','monthly'].includes(r.frequency)) &&
    p.expenses.every(e => e && typeof e.id === 'string' && typeof e.name === 'string' && Object.hasOwn(CATEGORIES,e.category) && ['amount','percent'].includes(e.calculation) && amountValid(e.quantity) && e.quantity <= 1e7 && amountValid(e.price) && amountValid(e.rate) && e.rate <= 100 && ['once','monthly'].includes(e.frequency) && typeof e.variable === 'boolean' && (e.serviceId === '' || ids.includes(e.serviceId)));
}
export function migrateProject(p, startDate = todayISO()) {
  if (p?.version === 3) return validProject(p) ? structuredClone(p) : null;
  if (validProject(p)) return {...structuredClone(p),version:3,startDate,consultants:[],defaultCostModel:null};
  if (!p || !['service','product'].includes(p.mode) || typeof p.name !== 'string' || !['price','quantity','variable','fixed','investment'].every(k => amountValid(p[k])) || p.quantity > 1e7 || !Number.isInteger(p.months) || p.months < 1 || p.months > 60) return null;
  return {version:3,name:p.name,months:p.months,investment:p.investment,startDate,consultants:[],defaultCostModel:null,
    revenues:[{id:'legacy-revenue',name:p.mode==='service'?'Service principal':'Vente de produits',kind:p.mode,quantity:p.quantity,price:p.price,frequency:'monthly'}],
    expenses:[
      {id:'legacy-variable',name:'Coûts directs',category:'other',calculation:'amount',quantity:p.quantity,price:p.variable,rate:0,frequency:'monthly',variable:true,serviceId:'legacy-revenue'},
      {id:'legacy-fixed',name:'Charges fixes',category:'other',calculation:'amount',quantity:1,price:p.fixed,rate:0,frequency:'monthly',variable:false,serviceId:''}
    ]};
}
export function calculate(p, factor = 1) {
  const consultants = (p.consultants || []).map(c => calculateConsultant(c,p,factor));
  const ordinaryRevenues = p.revenues.map(line => {
    const quantity = round(line.quantity * factor);
    return {...line,quantity,total:round(quantity * line.price * (line.frequency === 'monthly' ? p.months : 1))};
  });
  const revenues = [...ordinaryRevenues,...consultants.map(c=>({id:c.id,name:c.name,kind:'consultant',quantity:c.workedDays,price:c.sellingDayRate,frequency:'planning',total:c.revenue}))];
  const revenue = sum(revenues.map(line => line.total));
  const ordinaryExpenses = p.expenses.map(line => {
    const baseRevenue = line.serviceId ? revenues.find(r => r.id === line.serviceId)?.total || 0 : revenue;
    const total = line.calculation === 'percent' ? round(baseRevenue * line.rate / 100) : round(line.quantity * line.price * (line.frequency === 'monthly' ? p.months : 1) * (line.variable ? factor : 1));
    return {...line,total};
  });
  const expenses = [...ordinaryExpenses,...consultants.flatMap(c=>c.expenses)];
  const expenseTotal = sum(expenses.map(line => line.total));
  const totalCosts = sum([expenseTotal,p.investment]);
  const total = round(revenue - totalCosts);
  const variableCosts = sum(expenses.filter(e => e.variable || e.calculation === 'percent').map(e => e.total));
  const fixedCosts = sum([p.investment,...expenses.filter(e => !e.variable && e.calculation !== 'percent').map(e => e.total)]);
  const contributionRate = revenue > 0 ? 1 - variableCosts / revenue : null;
  const threshold = contributionRate !== null && contributionRate > 0 ? Math.ceil(fixedCosts / contributionRate * 100 - 1e-7) / 100 : null;
  const services = revenues.map(r => {
    const directCosts = sum(expenses.filter(e => e.serviceId === r.id).map(e => e.total));
    return {...r,directCosts,contribution:round(r.total-directCosts)};
  });
  const commonCosts = sum([p.investment,...expenses.filter(e => !e.serviceId).map(e => e.total)]);
  const categories = Object.entries(CATEGORIES).map(([id,name]) => ({id,name,total:sum(expenses.filter(e => e.category===id).map(e => e.total))}));
  if(p.investment > 0) categories.push({id:'investment',name:'Mise initiale',total:p.investment});
  return {revenues,ordinaryRevenues,expenses,ordinaryExpenses,consultants,revenue,expenseTotal,totalCosts,total,variableCosts,fixedCosts,threshold,services,commonCosts,categories,monthly:round(total/p.months),margin:revenue>0?total/revenue*100:null};
}
