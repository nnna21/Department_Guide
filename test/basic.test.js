'use strict';
/**
 * Basic integration tests for the Department Guide API.
 * Run with: node test/basic.test.js
 */

const http = require('http');
const assert = require('assert');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.status || res.statusCode, headers: res.headers, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) {
      const payload = JSON.stringify(body);
      req.setHeader('Content-Type', 'application/json');
      req.setHeader('Content-Length', Buffer.byteLength(payload));
      req.write(payload);
    }
    req.end();
  });
}

const BASE = { hostname: '127.0.0.1', port: 3999 };

function get(path, cookie = '') {
  return request({ ...BASE, path, method: 'GET', headers: { Cookie: cookie } });
}

function post(path, body, cookie = '') {
  return request({ ...BASE, path, method: 'POST', headers: { Cookie: cookie } }, body);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

let passed = 0; let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✅  ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌  ${name}`);
    console.error(`       ${err.message}`);
    failed++;
  }
}

async function run() {
  // Start the server on a test port
  process.env.PORT = '3999';
  // Isolate database
  process.env.NODE_ENV = 'test';

  const app = require('../server');

  // Give the server a moment to initialise
  await new Promise(r => setTimeout(r, 300));

  console.log('\nDepartment Guide — Basic API Tests\n');

  // ── Captive portal ──────────────────────────────────────────────────────────
  await test('GET /generate_204 redirects to /', async () => {
    const res = await get('/generate_204');
    assert.strictEqual(res.status, 302);
    assert.ok(res.headers.location.endsWith('/'));
  });

  await test('GET /hotspot-detect.html redirects to /', async () => {
    const res = await get('/hotspot-detect.html');
    assert.strictEqual(res.status, 302);
  });

  // ── Auth ────────────────────────────────────────────────────────────────────
  await test('GET /api/auth/me returns loggedIn:false when unauthenticated', async () => {
    const res = await get('/api/auth/me');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.loggedIn, false);
  });

  await test('POST /api/auth/login rejects wrong password', async () => {
    const res = await post('/api/auth/login', { email: 'admin@department.local', password: 'wrong' });
    assert.strictEqual(res.status, 401);
  });

  let adminCookie = '';
  await test('POST /api/auth/login succeeds with correct credentials', async () => {
    const res = await post('/api/auth/login', { email: 'admin@department.local', password: 'admin123' });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.role, 'admin');
    adminCookie = res.headers['set-cookie']?.[0]?.split(';')[0] || '';
    assert.ok(adminCookie, 'Expected a session cookie');
  });

  await test('GET /api/auth/me returns loggedIn:true after login', async () => {
    const res = await get('/api/auth/me', adminCookie);
    assert.strictEqual(res.body.loggedIn, true);
    assert.strictEqual(res.body.role, 'admin');
  });

  // ── Notices ─────────────────────────────────────────────────────────────────
  await test('GET /api/notices returns array', async () => {
    const res = await get('/api/notices');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body));
  });

  let noticeId;
  await test('POST /api/notices creates a notice (admin)', async () => {
    const res = await post('/api/notices', { title: 'Test Notice', body: 'Test body', priority: 'normal' }, adminCookie);
    assert.strictEqual(res.status, 201);
    assert.ok(res.body.id);
    noticeId = res.body.id;
  });

  await test('POST /api/notices returns 403 for unauthenticated', async () => {
    const res = await post('/api/notices', { title: 'X', body: 'Y', priority: 'normal' });
    assert.strictEqual(res.status, 403);
  });

  // ── Schedule ────────────────────────────────────────────────────────────────
  await test('GET /api/schedule returns array', async () => {
    const res = await get('/api/schedule');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body));
  });

  await test('GET /api/schedule?day=Monday filters correctly', async () => {
    const res = await get('/api/schedule?day=Monday');
    assert.strictEqual(res.status, 200);
    res.body.forEach(c => assert.strictEqual(c.day_of_week, 'Monday'));
  });

  // ── Professors ──────────────────────────────────────────────────────────────
  await test('GET /api/professors returns array', async () => {
    const res = await get('/api/professors');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body));
    assert.ok(res.body.length >= 1);
  });

  await test('Professor objects do not expose password field', async () => {
    const res = await get('/api/professors');
    res.body.forEach(p => assert.strictEqual(p.password, undefined));
  });

  // ── Files ───────────────────────────────────────────────────────────────────
  await test('GET /api/files returns array', async () => {
    const res = await get('/api/files');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body));
  });

  await test('POST /api/files returns 401 when not logged in', async () => {
    const res = await request({ ...BASE, path: '/api/files', method: 'POST', headers: {} });
    assert.ok([401, 400].includes(res.status));
  });

  // ── Applications ─────────────────────────────────────────────────────────────
  await test('POST /api/applications rejects missing fields', async () => {
    const res = await post('/api/applications', { applicant_name: 'Test' });
    assert.strictEqual(res.status, 400);
  });

  let appId;
  await test('POST /api/applications creates application', async () => {
    const res = await post('/api/applications', {
      applicant_name:  'Jane Student',
      applicant_email: 'jane@example.com',
      type:            'certificate',
      subject:         'Request certificate',
      body:            'I need a completion certificate.'
    });
    assert.strictEqual(res.status, 201);
    assert.ok(res.body.id);
    appId = res.body.id;
  });

  await test('GET /api/applications?email= returns matching applications', async () => {
    const res = await get('/api/applications?email=jane@example.com');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.some(a => a.id === appId));
  });

  // ── Complaints ───────────────────────────────────────────────────────────────
  await test('POST /api/complaints rejects invalid category', async () => {
    const res = await post('/api/complaints', {
      reporter_name:  'Bob',
      reporter_email: 'bob@example.com',
      category:       'invalid_cat',
      subject:        'Issue',
      description:    'details'
    });
    assert.strictEqual(res.status, 400);
  });

  let complaintId;
  await test('POST /api/complaints creates complaint', async () => {
    const res = await post('/api/complaints', {
      reporter_name:  'Bob Reporter',
      reporter_email: 'bob@example.com',
      category:       'academic',
      subject:        'Grading issue',
      description:    'My grade seems incorrect.'
    });
    assert.strictEqual(res.status, 201);
    assert.ok(res.body.id);
    complaintId = res.body.id;
  });

  // ── Summary ──────────────────────────────────────────────────────────────────
  console.log(`\n  ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => { console.error(err); process.exit(1); });
