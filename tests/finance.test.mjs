import assert from 'node:assert/strict';
import test from 'node:test';
import { calculate, migrateProject, validProject } from '../dist/finance.js';

const blank = { version: 2, name: 'Projet', months: 12, investment: 0, revenues: [], expenses: [] };
const expense = (id, extra = {}) => ({
  id, name: id, category: 'other', calculation: 'amount',
  quantity: 1, price: 0, rate: 0, frequency: 'monthly',
  variable: false, serviceId: '', ...extra
});
const project = {
  version: 2, name: 'Projet multi-services', months: 6, investment: 1000,
  revenues: [
    { id: 'a', name: 'Conseil', kind: 'service', quantity: 2, price: 1000, frequency: 'monthly' },
    { id: 'b', name: 'Formation', kind: 'service', quantity: 1, price: 500, frequency: 'monthly' },
    { id: 'c', name: 'Livrable', kind: 'product', quantity: 1, price: 200, frequency: 'once' }
  ],
  expenses: [
    expense('avion', { category: 'flights', quantity: 2, price: 300, frequency: 'once', serviceId: 'b' }),
    expense('logement', { category: 'lodging', quantity: 3, price: 100, serviceId: 'b' }),
    expense('prestataires', { category: 'contractors', quantity: 2, price: 100, variable: true, serviceId: 'a' }),
    expense('salaires', { category: 'salaries', price: 1000 }),
    expense('taxeGlobale', { category: 'taxes', calculation: 'percent', rate: 2 }),
    expense('taxeService', { category: 'taxes', calculation: 'percent', rate: 10, serviceId: 'b' })
  ]
};

test('Plusieurs services, frais ponctuels et mensuels : résultat global', () => {
  assert.equal(validProject(project), true);
  const result = calculate(project);
  assert.equal(result.revenue, 15200);
  assert.equal(result.expenseTotal, 10204);
  assert.equal(result.totalCosts, 11204);
  assert.equal(result.total, 3996);
  assert.equal(result.monthly, 666);
  assert.equal(result.variableCosts, 1804);
  assert.equal(result.fixedCosts, 9400);
  assert.ok(result.threshold > 10665 && result.threshold < 10666);
});

test('Contributions et coûts communs se réconcilient avec le résultat', () => {
  const result = calculate(project);
  const formation = result.services.find(service => service.id === 'b');
  assert.equal(formation.directCosts, 2700);
  assert.equal(formation.contribution, 300);
  assert.equal(result.commonCosts, 7304);
  assert.equal(result.services.reduce((total, service) => total + service.contribution, 0) - result.commonCosts, result.total);
  assert.equal(result.categories.reduce((total, category) => total + category.total, 0), result.totalCosts);
});

test('Les scénarios font varier les revenus, les coûts variables et les taxes', () => {
  const result = calculate(project, 1.2);
  assert.equal(result.revenue, 18240);
  assert.equal(result.expenses.find(line => line.id === 'avion').total, 600);
  assert.equal(result.expenses.find(line => line.id === 'prestataires').total, 1440);
  assert.equal(result.expenses.find(line => line.id === 'taxeGlobale').total, 364.8);
  assert.equal(result.expenses.find(line => line.id === 'taxeService').total, 360);
});

test('La conversion du premier modèle conserve le résultat et les revenus', () => {
  const legacy = { mode: 'service', name: 'Ancien', price: 1200, quantity: 5, variable: 250, fixed: 1500, investment: 8000, months: 12 };
  const migrated = migrateProject(legacy);
  assert.equal(validProject(migrated), true);
  assert.equal(calculate(migrated).total, 31000);
  assert.equal(calculate(migrated).revenue, 72000);
  assert.equal(migrateProject({ ...legacy, mode: 'inconnu' }), null);
});

test('Absence de revenus, taux de coûts de 100 % et arrondis', () => {
  assert.equal(calculate(blank).total, 0);
  assert.equal(calculate(blank).margin, null);
  assert.equal(calculate(blank).threshold, null);
  assert.equal(calculate({ ...blank, investment: 100 }).total, -100);
  assert.equal(calculate({ ...project, expenses: [expense('taxe', { calculation: 'percent', rate: 100 })] }).threshold, null);
  const decimal = { ...blank, months: 1, revenues: [{ id: 'decimal', name: 'Décimal', kind: 'service', quantity: 3, price: 0.1, frequency: 'monthly' }] };
  assert.equal(calculate(decimal).revenue, 0.3);
});

test('Les durées invalides, coûts négatifs et rattachements orphelins sont refusés', () => {
  assert.equal(validProject({ ...project, months: 0 }), false);
  assert.equal(validProject({ ...project, expenses: [expense('invalide', { price: -1 })] }), false);
  assert.equal(validProject({ ...project, expenses: [expense('orphelin', { serviceId: 'absent' })] }), false);
  assert.equal(validProject({ ...project, revenues: [project.revenues[0], project.revenues[0]] }), false);
});
