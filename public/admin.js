let key = localStorage.getItem("key")
function login() {
  const enteredKey = document.getElementById("admin-key").value
  if (!enteredKey) return alert('Please enter a key.')
  fetch('/api/admin/login', {
    headers: { authorization: enteredKey }
  }).then(res => {
    if (res.ok) {
      try { //safari private mode
        localStorage.setItem("key", enteredKey)
      } catch (error) {
        console.error(error)
      }
      key = enteredKey
      loadDashboard()
    } else {
      res.json().then(text => alert(text))
    }
  })
}
async function feedback(msg, res) {
  if (res.ok) alert(msg)
  else {
    const errMsg = await res.json()
    alert(errMsg)
  }
}
function main_page () {
  window.location.href = "/"
}
function leave(id) {
  return fetch(`/api/admin/projects/${id}`, {
    method: 'DELETE', headers: {
      authorization: key
    }
  }).then(res => {
    feedback('Left project', res)
    return res.ok
  })
}
function disconnect(id) {
  fetch(`/api/admin/projects/${id}/ws`, {
    method: 'DELETE', headers: {
      authorization: key
    }
  }).then(res => feedback('Disconnected', res))
}
function connect(id) {
  fetch(`/api/admin/projects/${id}/ws`, {
    method: 'PUT', headers: {
      authorization: key
    }
  }).then(res => feedback('Connected', res))
}
function logout() {
  key = undefined
  document.getElementById("project-list").innerHTML = "<tr><th>Project name</th><th>Tools</th></tr>"
  localStorage.removeItem("key")
  showLogin()
}
function showLogin() {
  document.getElementById("dashboard").setAttribute("hidden", "")
  document.getElementById('admin-login').removeAttribute('hidden')
  document.getElementById("logout").setAttribute("style", "display:none")
}
function connectAll() {
  fetch('/api/admin/projects/ws', { method: 'PUT', headers: { authorization: key } }).then(res => feedback('Connected all', res))
}
function disconnectAll() {
  fetch('/api/admin/projects/ws', { method: 'DELETE', headers: { authorization: key } }).then(res => feedback('Disconnected all', res))
}
async function loadDashboard() {
  const userInfo = await fetch('/api/admin/dashboard', { headers: { authorization: key } }).then(res => res.json())
  document.getElementById("project-count").innerHTML = `Project count: ${userInfo.projects.length}`
  document.getElementById("admin-login").setAttribute("hidden", "")
  document.getElementById("logout").removeAttribute("style")
  document.getElementById('dashboard').removeAttribute('hidden')
  const table = document.getElementById("project-list")
  userInfo.projects.forEach(project => {
    const projectRow = table.insertRow()
    const nameHolder = projectRow.insertCell(0)
   // const idHolder = projectRow.insertCell(1)
    const toolsHolder = projectRow.insertCell(1)
    nameHolder.innerHTML = project.domain
    //idHolder.innerHTML = project.id
    const console = document.createElement("a")
    console.setAttribute("href", `https://api.glitch.com/${project.domain}/console/` + userInfo.user.persistentToken)
    console.setAttribute("target", "_blank")
    const consoleButton = document.createElement("button")
    consoleButton.setAttribute("class","console-button")
    consoleButton.appendChild(document.createTextNode("Console"))
    console.appendChild(consoleButton)
    const invite = document.createElement("a")
    invite.setAttribute("href", `https://glitch.com/edit/#!/join/` + project.inviteToken)
    invite.setAttribute("target", "_blank")
        const inviteButton = document.createElement("button")
    inviteButton.setAttribute("class","invite-button")
    inviteButton.appendChild(document.createTextNode("Invite"))
    invite.appendChild(inviteButton)
    const connectButton = document.createElement("button")
    connectButton.addEventListener("click", () => connect(project.id))
    connectButton.appendChild(document.createTextNode("Connect"))
    connectButton.setAttribute("style", "background-color: #00ffaa")
    const disconnectButton = document.createElement("button")
    disconnectButton.addEventListener("click", () => disconnect(project.id))
    disconnectButton.appendChild(document.createTextNode("Disconnect"))
    disconnectButton.setAttribute("style", "background-color: #ffbb00")
        const leaveButton = document.createElement("button")
    leaveButton.addEventListener("click", () => {
      leave(project.id)
      .then(ok => {
        if (ok) projectRow.remove()
      })
      })
    leaveButton.appendChild(document.createTextNode("Leave"))
    leaveButton.setAttribute("style", "background-color: #ff0000")
        const download = document.createElement("a")
    download.setAttribute("href", `https://api.glitch.com/project/download?authorization=` + userInfo.user.persistentToken + '&projectId=' + project.id)
    download.setAttribute("target", "_blank")
        const downloadButton = document.createElement("button")
    downloadButton.setAttribute("class","download-button")
    downloadButton.appendChild(document.createTextNode("Download"))
    download.appendChild(downloadButton)
    toolsHolder.append(invite)
    toolsHolder.append(console)
    toolsHolder.append(download)
    toolsHolder.append(connectButton)
    toolsHolder.append(disconnectButton)
    toolsHolder.append(leaveButton)
  })
}
if (!key) {
  showLogin()
} else {
  fetch('/api/admin/login', {
    headers: { authorization: key }
  }).then(res => res.ok)
  .catch(error => {
    alert(error.message)
  })
  .then(keyIsValid => {
    if (!keyIsValid) showLogin()
    else loadDashboard()
  })
}
