#!/usr/bin/env node
// YOU MUST RUN chmod 777 ws.js after editing
const WSClient = require("websocket").client;
const { GLITCH_TOKEN } = process.env;
const fetch = require("node-fetch");
const { connection } = require("websocket");
async function reconnect(w) {
  console.error(w ? "Connect failed" : "Connection Closed " + ` (${project.domain})`);
  console.log("Reconnecting...");
  const newWsInfo = await fetch(`https://api.glitch.com/${process.argv[2]}/console/${GLITCH_TOKEN}/socket.io/?EIO=3&transport=polling`)
    .then(response => response.text())
    .then(raw => raw.replace('96:0', '').replace('2:40', ''))
    .then(json => {
      if (json === 'Failed to start terminal') {
        console.log('Failed to start terminal')
        reconnect(1)
        return
      }
      return JSON.parse(json)
    })
  if (!newWsInfo) return
  client.connect(
    `wss://api.glitch.com/${process.argv[2]}/console/${GLITCH_TOKEN}/socket.io/?EIO=3&transport=websocket&sid=${newWsInfo.sid}`, undefined, {
      'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.97 Safari/537.36'
    });
}
const client = new WSClient();
fetch(`https://api.glitch.com/${process.argv[2]}/console/${GLITCH_TOKEN}/socket.io/?EIO=3&transport=polling`)
  .then(response => response.text())
  .then(raw => raw.replace('96:0', '').replace('2:40', ''))
  .then(json => {
    if (json === 'Failed to start terminal') {
      console.log('Failed to start terminal')
      reconnect(1)
      return
    }
    return JSON.parse(json)
  }).then(wsInfo => {
    if (!wsInfo) return
    client.on("connectFailed", function(error) {
      console.error("Connect Error: " + error.toString());
      if ((error.toString().split(' ').some(x => ['400', '401', '403', '404']))) process.exit(1)
    })
    client.on("connect", connection => {
      console.log("WebSocket Client Connected " + ` (${process.argv[2]})`);
      connection.send('2probe')
      connection.on("close", reconnect);
      connection.on("message", function(message) {
        if (message.type === "utf8") {
          if (message.utf8Data === '3probe') {
            connection.send('5')
          }
        }
      });
      setInterval(() => {
        if (connection.connected) {
          connection.sendUTF('2');
        }
      }, wsInfo.pingInterval);
    });
    client.connect(`wss://api.glitch.com/${process.argv[2]}/console/${GLITCH_TOKEN}/socket.io/?EIO=3&transport=websocket&sid=${wsInfo.sid}`);
  })