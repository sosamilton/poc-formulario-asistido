#!/usr/bin/env node
// seed.js — formio OSS 4.6.0 (standalone)

const FORMIO_URL  = (process.env.FORMIO_URL   || 'http://formio:3001').replace(/\/$/, '');
const EMAIL       = process.env.ROOT_EMAIL    || 'admin@example.com';
const PASSWORD    = process.env.ROOT_PASSWORD || 'CHANGEME';
const ADMIN_KEY   = process.env.ADMIN_KEY     || '';

const resource = require('./IIBB.json');
const form     = require('./iibbsimple.json');

function clean(json) {
  const { _id, owner, created, modified, machineName, access, submissionAccess, ...rest } = json;
  return rest;
}

function authHeaders(token) {
  const h = { 'Content-Type': 'application/json' };
  if (token)     h['x-jwt-token'] = token;
  if (ADMIN_KEY) h['x-admin-key'] = ADMIN_KEY;
  return h;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function waitForFormio(retries = 24, delayMs = 5000) {
  for (let i = 1; i <= retries; i++) {
    try {
      const r = await fetch(`${FORMIO_URL}/current`);
      if (r.status < 500) return;
    } catch { }
    console.log(`[${i}/${retries}] Esperando formio...`);
    await sleep(delayMs);
  }
  throw new Error('Formio no respondió a tiempo.');
}

async function login() {
  const r = await fetch(`${FORMIO_URL}/user/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: { email: EMAIL, password: PASSWORD } }),
  });
  const body = await r.text();
  if (!r.ok) throw new Error(`Login fallido (${r.status}): ${body}`);
  const token = r.headers.get('x-jwt-token');
  if (!token) throw new Error(`No se recibió x-jwt-token. Body: ${body.slice(0, 300)}`);
  return token;
}

async function getOrCreateForm(token, data) {
  const payload = clean(data);

  const list = await fetch(`${FORMIO_URL}/form?name=${payload.name}&limit=1`, {
    headers: authHeaders(token),
  });
  if (list.ok) {
    const forms = await list.json();
    const existing = Array.isArray(forms) && forms.find(f => f.name === payload.name);
    if (existing) {
      console.log(`  ↳ "${payload.name}" ya existe (${existing._id}), se omite`);
      return existing;
    }
  }

  const r = await fetch(`${FORMIO_URL}/form`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  const body = await r.text();
  if (!r.ok) throw new Error(`Crear "${payload.name}" fallido (${r.status}): ${body}`);
  return JSON.parse(body);
}

async function main() {
  console.log('=== Formio Seed ===');
  console.log(`URL:       ${FORMIO_URL}`);
  console.log(`ADMIN_KEY: ${ADMIN_KEY ? '✓ configurada' : '✗ no configurada (puede fallar)'}`);

  await waitForFormio();
  console.log('✓ Formio disponible');

  const token = await login();
  console.log('✓ Login OK');

  const res = await getOrCreateForm(token, resource);
  console.log(`✓ Resource: ${res.name} → /${res.path}`);

  const frm = await getOrCreateForm(token, form);
  console.log(`✓ Form:     ${frm.name} → /${frm.path}`);

  console.log('\n=== Seed completado ✓ ===');
  console.log(`\nEndpoints:`);
  console.log(`  Resource: ${FORMIO_URL}/${res.path}`);
  console.log(`  Form:     ${FORMIO_URL}/${frm.path}`);
}

main().catch(err => {
  console.error('\n✗ Error en seed:', err.message);
  process.exit(1);
});