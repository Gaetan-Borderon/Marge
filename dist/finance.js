export const CATEGORIES = {
  flights: 'Billets d’avion', lodging: 'Logement', taxes: 'Taxes',
  contractors: 'Prestataires', salaries: 'Salaires', other: 'Autres frais'
};
const round = n => Math.round((n + Number.EPSILON) * 100) / 100;
const sum = values => round(values.reduce((total, n) => total + n, 0));
const amountValid = n => Number.isFinite(n) && n >= 0 && n <= 1e8;

export function validProject(p) {
  if (!p || p.version !== 2 || typeof p.name !== 'string' || !Number.isInteger(p.months) || p.months < 1 || p.months > 60 || !amountValid(p.investment)) return false;
  if (!Array.isArray(p.revenues) || !Array.isArray(p.expenses) || p.revenues.length > 100 || p.expenses.length > 100) return false;
  const ids = p.revenues.map(r => r.id);
  if (new Set(ids).size !== ids.length || new Set(p.expenses.map(e => e.id)).size !== p.expenses.length) return false;
  return p.revenues.every(r => typeof r.id === 'string' && typeof r.name === 'string' && ['service','product'].includes(r.kind) && amountValid(r.quantity) && r.quantity <= 1e7 && amountValid(r.price) && ['once','monthly'].includes(r.frequency)) &&
    p.expenses.every(e => typeof e.id === 'string' && typeof e.name === 'string' && Object.hasOwn(CATEGORIES,e.category) && ['amount','percent'].includes(e.calculation) && amountValid(e.quantity) && e.quantity <= 1e7 && amountValid(e.price) && amountValid(e.rate) && e.rate <= 100 && ['once','monthly'].includes(e.frequency) && typeof e.variable === 'boolean' && (e.serviceId === '' || ids.includes(e.serviceId)));
}

export function migrateProject(p) {
  if (validProject(p)) return structuredClone(p);
  if (!p || !['service','product'].includes(p.mode) || typeof p.name !== 'string' || !['price','quantity','variable','fixed','investment'].every(k => amountValid(p[k])) || p.quantity > 1e7 || !Number.isInteger(p.months) || p.months < 1 || p.months > 60) return null;
  return {version:2,name:p.name,months:p.months,investment:p.investment,
    revenues:[{id:'legacy-revenue',name:p.mode==='service'?'Service principal':'Vente de produits',kind:p.mode,quantity:p.quantity,price:p.price,frequency:'monthly'}],
    expenses:[
      {id:'legacy-variable',name:'Coûts directs',category:'other',calculation:'amount',quantity:p.quantity,price:p.variable,rate:0,frequency:'monthly',variable:true,serviceId:'legacy-revenue'},
      {id:'legacy-fixed',name:'Charges fixes',category:'other',calculation:'amount',quantity:1,price:p.fixed,rate:0,frequency:'monthly',variable:false,serviceId:''}
    ]};
}

export function calculate(p, factor = 1) {
  const revenues = p.revenues.map(line => {
    const quantity = round(line.quantity * factor);
    return {...line,quantity,total:round(quantity * line.price * (line.frequency === 'monthly' ? p.months : 1))};
  });
  const revenue = sum(revenues.map(line => line.total));
  const expenses = p.expenses.map(line => {
    const baseRevenue = line.serviceId ? revenues.find(r => r.id === line.serviceId)?.total || 0 : revenue;
    const total = line.calculation === 'percent' ? round(baseRevenue * line.rate / 100) : round(line.quantity * line.price * (line.frequency === 'monthly' ? p.months : 1) * (line.variable ? factor : 1));
    return {...line,total};
  });
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
  return {revenues,expenses,revenue,expenseTotal,totalCosts,total,variableCosts,fixedCosts,threshold,services,commonCosts,categories,monthly:round(total/p.months),margin:revenue>0?total/revenue*100:null};
}
