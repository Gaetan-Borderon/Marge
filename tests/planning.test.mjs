import assert from 'node:assert/strict';
import test from 'node:test';
import {calculate, validProject, migrateProject} from '../dist/finance.js';
import {dateNumber, weekdaysBetween, projectPeriod, calculateCostModel, consultantDays, consultantProblems, newCostModel} from '../dist/planning.js';
const project = () => ({version:3,name:'Planning',startDate:'2026-01-01',months:1,investment:0,consultants:[],defaultCostModel:null,revenues:[],expenses:[]});
const consultant = (id,extra={}) => ({id,name:id,startDate:'2026-01-05',endDate:'2026-01-16',sellingDayRate:1000,purchaseDayRate:300,offDays:0,extraDays:0,overtimeHours:0,overtimeSellingRate:0,overtimePurchaseRate:0,costModel:null,...extra});
const line = (id,extra={}) => ({id,name:id,category:'other',amount:10,currency:'USD',basis:'day',quantity:1,referenceDays:1,enabled:true,taxed:true,buffered:true,...extra});
function model(){return {...newCostModel('m'),name:'Destination',usdPerEur:1.25,useBudgetFx:true,budgetEurPerUsd:1,vatRate:10,safetyMode:'included',safetyRate:10,lines:[line('local'),line('travel',{category:'flights',currency:'EUR',amount:100,quantity:2,basis:'amortized',referenceDays:20,taxed:false,buffered:false}),line('setup',{currency:'EUR',amount:50,basis:'once',taxed:false,buffered:false})]};}

test('Dates civiles inclusives, week-ends, année bissextile et changement d’heure',()=>{
 assert.equal(weekdaysBetween(dateNumber('2026-01-05'),dateNumber('2026-01-16')),10);
 assert.equal(weekdaysBetween(dateNumber('2026-01-10'),dateNumber('2026-01-11')),0);
 assert.equal(weekdaysBetween(dateNumber('2024-02-28'),dateNumber('2024-03-01')),3);
 assert.equal(weekdaysBetween(dateNumber('2026-03-27'),dateNumber('2026-03-30')),2);
 assert.ok(Number.isNaN(dateNumber('2026-02-30')));
 assert.equal(projectPeriod(project()).endDate,'2026-01-31');
});

test('Deux consultants avec arrivées décalées et tarifs différents',()=>{
 const p=project();p.consultants=[consultant('A'),consultant('B',{startDate:'2026-01-12',endDate:'2026-01-30',sellingDayRate:800,purchaseDayRate:200})];
 assert.equal(validProject(p),true);const r=calculate(p);
 assert.deepEqual(r.consultants.map(c=>c.workedDays),[10,15]);
 assert.equal(r.revenue,22000);assert.equal(r.totalCosts,6000);assert.equal(r.total,16000);
});

test('Absences, week-ends travaillés et overtime vendu et acheté séparément',()=>{
 const p=project();p.consultants=[consultant('A',{offDays:1,extraDays:1,overtimeHours:10,overtimeSellingRate:150,overtimePurchaseRate:50})];
 const r=calculate(p);assert.equal(r.consultants[0].workedDays,10);assert.equal(r.revenue,11500);assert.equal(r.totalCosts,3500);assert.equal(r.total,8000);
 assert.ok(consultantProblems({...p.consultants[0],offDays:11},p).length);
 assert.ok(consultantProblems({...p.consultants[0],extraDays:3},p).length);
 assert.ok(consultantProblems({...p.consultants[0],endDate:'2026-01-01'},p).length);
});

test('La période du projet limite les jours et exclut les frais des consultants absents',()=>{
 const p=project();p.consultants=[consultant('A',{startDate:'2025-12-01',endDate:'2026-01-09'}),consultant('B',{startDate:'2026-02-01',endDate:'2026-03-01',costModel:model()})];
 assert.equal(consultantDays(p.consultants[0],p).workedDays,7);
 const r=calculate(p);assert.equal(r.consultants[1].workedDays,0);assert.equal(r.consultants[1].local.total,0);assert.equal(r.totalCosts,2100);
});

test('Le taux budgétaire remplace le taux de référence, sans doubler la sécurité incluse',()=>{
 const m=model();let r=calculateCostModel(m,10);
 assert.equal(r.base,250);assert.equal(r.vat,10);assert.equal(r.safety,0);assert.equal(r.total,260);
 m.useBudgetFx=false;r=calculateCostModel(m,10);assert.equal(r.total,238);
 m.safetyMode='add';r=calculateCostModel(m,10);assert.equal(r.safety,8.8);assert.equal(r.total,246.8);
});

test('Coûts répartis, ponctuels, postes désactivés et rapprochement des arrondis',()=>{
 const m=model();m.lines.push(line('fraction',{amount:.333333,currency:'EUR'}));
 const result=calculateCostModel(m,17);assert.equal(result.lines.reduce((s,l)=>s+Math.round(l.total*100),0),Math.round(result.total*100));
 m.lines[1].enabled=false;assert.equal(calculateCostModel(m,10).lines.some(l=>l.id==='travel'),false);
 const noDays=calculateCostModel(m,0);assert.equal(noDays.total,50);
});

test('Scénarios : journées et frais journaliers variables, frais ponctuels fixes',()=>{
 const p=project();p.consultants=[consultant('A',{costModel:model()})];
 const r=calculate(p,1.2);assert.equal(r.consultants[0].workedDays,12);assert.equal(r.consultants[0].local.total,302);assert.equal(r.consultants[0].pay,3600);
 assert.equal(r.expenses.find(e=>e.name.includes('setup')).variable,false);
 assert.equal(r.expenses.find(e=>e.name.includes('setup')).total,50);
});

test('Une taxe rattachée au consultant utilise son CA et les coûts communs restent uniques',()=>{
 const p=project();p.investment=100;p.consultants=[consultant('A',{costModel:model()})];p.expenses=[{id:'tax',name:'Taxe',category:'taxes',calculation:'percent',quantity:1,price:0,rate:5,frequency:'once',variable:false,serviceId:'A'}];
 const r=calculate(p);assert.equal(r.ordinaryExpenses[0].total,500);assert.equal(r.services[0].directCosts,3760);assert.equal(r.commonCosts,100);
 assert.equal(Math.round((r.services.reduce((s,c)=>s+c.contribution,0)-r.commonCosts)*100),Math.round(r.total*100));
 assert.equal(Math.round(r.categories.reduce((s,c)=>s+c.total,0)*100),Math.round(r.totalCosts*100));
});

test('Migration v2 sans changement des totaux et copies de modèles indépendantes',()=>{
 const old={version:2,name:'Ancien',months:12,investment:100,revenues:[{id:'a',name:'Service',kind:'service',quantity:2,price:100,frequency:'monthly'}],expenses:[]};
 const migrated=migrateProject(old,'2026-01-01');assert.equal(migrated.version,3);assert.equal(calculate(migrated).total,calculate(old).total);assert.equal(migrated.consultants.length,0);
 const p=project(),m=model();p.defaultCostModel=structuredClone(m);p.consultants=[consultant('A',{costModel:structuredClone(m)})];m.lines[0].amount=1000;assert.equal(p.consultants[0].costModel.lines[0].amount,10);
 assert.equal(validProject({...p,startDate:'invalide'}),false);
});
