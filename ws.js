#!/usr/bin/env node
const { GLITCH_TOKEN } = process.env;
const fetch = require("node-fetch");
const WebSocket = require('ws')
let globalProjID
/**@param { WebSocket } wss */
const init = (id, callback)  => {
  id = globalProjID
  if (!id) throw new Error('No Project ID provided')
  let wss = new WebSocket(`wss://api.glitch.com/${id}/logs?authorization=${GLITCH_TOKEN}`)
  this.ws = wss
  wss.once('open', () => {
    wss.send('keep alive')
    setInterval(() => {
      if (ws.OPEN === 1) ws.send('keep alive')
    }, 30000)
  })
  wss.once('close', (code,reason) => {
    console.log(code)
    console.log(id)
    console.log('Reconnecting...')
    if (code !== 3000) init()
  })
  wss.once('unexpected-response', (_, res) => {
    if ([401, 403, 404, 503].includes(res.statusCode)) {
      if (callback) callback(id)
      return
    }
    console.log(this.id)
    res.on('data',chunk => process.stderr.write(chunk.toString('utf8')))
    init()
  })
  return wss
}
class ConnectedProject {
  constructor(project_id, _mode, callback) {
    /**@type { WebSocket } */
    globalProjID = project_id
    init.bind(this)(project_id,callback)
    this.id = project_id
  }
}
module.exports = ConnectedProject