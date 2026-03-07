#!/usr/bin/env node
// test-overlay.js
// Sends a sequence of events to the local relay ws://localhost:3333 and
// prompts the user after each one to confirm that the overlay displayed
// correctly.  Failures are logged at the end.

import WebSocket from 'ws';
import readline from 'readline';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

// spawn the bot relay (npm start) in a subprocess; returns the ChildProcess
function startBot() {
  console.log('starting bot relay (npm start) ...');
  const proc = spawn('npm', ['start'], { cwd: path.resolve(process.cwd(), 'bot'), stdio: 'inherit' });
  proc.on('exit', (code) => console.log(`bot relay exited with code ${code}`));
  return proc;
}

function stopBot(proc) {
  if (!proc || proc.killed) return;
  console.log('stopping bot relay');
  proc.kill();
}

// start a minimal static file server serving the overlay/ directory
function startStaticServer(port = 8000) {
  const root = path.resolve(process.cwd(), 'overlay');
  const server = http.createServer((req, res) => {
    let filePath = path.join(root, req.url === '/' ? 'chrome.html' : req.url);
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        return res.end('Not found');
      }

      // Minimal MIME-type mapping so modules/css/scripts load correctly
      const ext = path.extname(filePath).toLowerCase();
      const types = {
        '.html': 'text/html',
        '.js':   'text/javascript',
        '.mjs':  'text/javascript',
        '.css':  'text/css',
        '.png':  'image/png',
        '.jpg':  'image/jpeg',
        '.svg':  'image/svg+xml',
        '.json': 'application/json',
      };
      const type = types[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': type });
      res.end(data);
    });
  });
  return new Promise((resolve, reject) => {
    server.listen(port, () => resolve(server));
    server.on('error', reject);
  });
}

async function stopServer(server) {
  return new Promise((resolve) => server.close(() => resolve()));
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
function ask(question) {
  return new Promise(resolve => rl.question(question, ans => resolve(ans.trim().toLowerCase())));
}

const tests = [
  {name:'chat-normal', payload:{type:'chat', username:'alice', message:'hello world'}},
  {name:'chat-link',   payload:{type:'chat', username:'bob',   message:'check this https://example.com'}},
  {name:'chat-bot',    payload:{type:'chat', username:'bot',   message:'bot reply', isBotReply:true}},
  {name:'follow',      payload:{type:'follow', username:'Tester'}},
  {name:'subscribe',   payload:{type:'subscribe', username:'SubBot', tier:1}},
  {name:'tip',         payload:{type:'tip', username:'Generous', amount:5}},
  {name:'shoutout',    payload:{type:'shoutout', username:'Streamer'}},
  {name:'dadjoke-one', payload:{type:'dadjoke', username:'JokeFan', joke:'A pun walks into a bar.'}},
  {name:'dadjoke-setup', payload:{type:'dadjoke', username:'Setup', setup:'Why chicken cross road?', punchline:'To get to the other side.'}},
  {name:'layout-no-boss', payload:{type:'layout', name:'no-boss'}},
  {name:'layout-full', payload:{type:'layout', name:'full'}},
  {name:'color',       payload:{type:'color', hex:'#ff1493'}},
  {name:'ticker',      payload:{type:'ticker_update', text:'Test ticker item'}},
  {name:'spotify-on',  payload:{type:'spotify', playing:true, title:'Test Track', artist:'Artist', art:'', duration:180, progress:30}},
  {name:'spotify-off', payload:{type:'spotify', playing:false}},
];

async function run() {
  // spawn bot relay so tests can run without manual startup
  const botProc = startBot();

  // bring up the overlay server so the pages load in the browser
  const server = await startStaticServer(8000);
  console.log('static server running at http://localhost:8000');

  console.log('connecting to relay ws://localhost:3333 ...');

  // sometimes the bot relay takes a moment to start and listen; retry until we can connect
  async function waitForRelay(url = 'ws://localhost:3333', timeout = 5000) {
    const start = Date.now();
    while (true) {
      try {
        await new Promise((res, rej) => {
          const tmp = new WebSocket(url);
          tmp.on('open', () => {
            tmp.close();
            res();
          });
          tmp.on('error', rej);
        });
        return;
      } catch (err) {
        if (Date.now() - start > timeout) {
          throw new Error(`relay did not become available within ${timeout}ms`);
        }
        await new Promise(r => setTimeout(r, 200));
      }
    }
  }

  await waitForRelay();
  const ws = new WebSocket('ws://localhost:3333');
  await new Promise(res => ws.on('open', res));
  console.log('connected');

  const failures = [];
  for (const t of tests) {
    console.log(`\n==> sending test ${t.name}`);
    ws.send(JSON.stringify(t.payload));
    const ans = await ask(`Did the overlay handle "${t.name}" correctly? (y/n/q=quit) `);
    if (ans === 'q') break;
    if (ans !== 'y') failures.push(t.name);
  }

  console.log('\nTest sequence complete.');
  if (failures.length) {
    console.log('Failures:', failures.join(', '));
  } else {
    console.log('All tests passed.');
  }
  rl.close();
  ws.close();

  await stopServer(server);
  console.log('static server stopped');

  stopBot(botProc);
}

run().catch(err => {
  console.error('error during test:', err);
  process.exit(1);
});
