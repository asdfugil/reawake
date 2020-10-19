
const client = new WebSocket('wss://glitchuptime.nickchan4.repl.co/api/gateway');
client.addEventListener('open', heartbeat)
client.addEventListener('open', () => {
  console.log(client.readyState)
  client.pingTimeout = setTimeout(() => {
    console.log(3)
    client.close(1,"Ping timeout")
  }, 30000)
})
function heartbeat() {
  client.send(JSON.stringify({ type: "ping" }))
}
const pingInterval = setInterval(() => {
  if (client.readyState === 1) heartbeat()
}, 5000)
client.addEventListener('close', function clear() {
  clearInterval(pingInterval)
});
client.addEventListener('message', event => {
  const data = JSON.parse(event.data)
  if (data.type === "PROJECT_COUNT") {
   if (document.getElementById("logout")) document.getElementById("project-count").innerHTML = `Project count: ${data.payload}`
   else
    document.getElementById("project-count").innerHTML = `Keeping ${data.payload} projects online.`
  } else if (data.type === 'pong') {
    clearTimeout(client.pingTimeout)
    client.pingTimeout = setTimeout(() => {
      client.close()
    }, 30000)
  }
})
