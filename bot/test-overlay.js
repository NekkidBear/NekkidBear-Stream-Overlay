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
      res.writeHead(200);
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
  // bring up the overlay server so the pages load in the browser
  const server = await startStaticServer(8000);
  console.log('static server running at http://localhost:8000');

  console.log('connecting to relay ws://localhost:3333 ...');
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
}

run().catch(err => {
  console.error('error during test:', err);
  process.exit(1);
});
