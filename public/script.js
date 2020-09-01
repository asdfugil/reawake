function convert(linkOrToken) {
  return linkOrToken
    .replace("https://glitch.com/edit/#!/join/",'')
    .replace("http://glitch.com/edit/#!/join/",'')
    .replace("/",'');
}
function addProject() {
  var token = convert(document.getElementById("project-code").value);
  if (token.length !== 36) return alert("Invalid token");
  fetch("./api/projects/" + token, { method: "PUT" }).then(res => {
    if (res.ok) alert("Project added");
    else res.json().then(text => text ? alert(text.message): res.statusText);
  });
}
function removeProject() {
  var token = convert(document.getElementById("project-code").value);
  if (token.length !== 36) return alert("Invalid token");
  fetch("./api/projects/" + token, { method: "DELETE" }).then(res => {
    if (res.ok) alert("Project removed");
    else res.json().then(text => text ? alert(text.message): res.statusText);
  });
}
function admin() {
  window.location.href = "/admin"
}
if (localStorage.getItem("key")) {
  const Adminkey = localStorage.getItem("key")
  fetch("/api/admin/login",{
    headers:{ authorization:Adminkey }
  }).then(res => {
    if (res.ok) document.getElementById("admin-panel").removeAttribute("style")
  })
}
fetch('./api/totalProjects').then(res => {
  res.text().then(count => {
    var powering = document.getElementById("project-count")
    powering.removeAttribute('hidden')
    powering.innerHTML = 'Keeping ' + count + ' projects online.'
  })
})
