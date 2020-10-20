#!/usr/bin/env node
const { GLITCH_TOKEN } = process.env;
const fetch = require("node-fetch");
const WebSocket = require('ws')
class ConnectedProject {
  constructor(project_id,_mode) {
    const ws = new WebSocket(`wss://api.glitch.com/${project_id}/logs?authorization=${GLITCH_TOKEN}`)
    ws.once('open',() => {
      setInterval(() => {
        if (ws.OPEN === 1) ws.send('keep alive')
      },30000)
    })
    /**@type { WebSocket } */
    this.ws = ws
    this.id = project_id
  }
}
module.exports = ConnectedProject