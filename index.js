process.on('unhandledRejection', error => console.error(error));
const fs = require('fs')
const express = require('express');
const rateLimit = require('express-rate-limit');
const app = express()
let userInfo
const ConnectedProject = require('./ws.js')
const connectedProjects = new Map()
const update = isRegular => {
  fetch('https://api.glitch.com/boot?latestProjectOnly=false', {
    headers: {
      authorization: process.env.GLITCH_TOKEN
    }
  }).then(async res => {
    if (res.ok) userInfo = await res.json()
  });
};
const limiter = rateLimit({
  windowMs: 60000,
  max: 5, // limit each IP to 5 requests per windowMs
  message: '{"message":"Too many requests, please try again later"}'
});
app.use('/api',(req,res,next) => {
  res.set('Content-Type','application/json')
  next()
})
app.use('/api/projects',limiter)
app.get('/api/totalProjects',() => {
  res.send(userInfo.projects.length)
})
app.put('/api/projects/:invite',(req,res) => {
  const invite = req.params.invite;
  fetch('https://api.glitch.com/projects/' + invite + '/join', {
    method: 'POST',
    headers: {
      authorization: process.env.GLITCH_TOKEN
    }
  }).then(async response => {
    const text = await response.text();
    const projectInfo = JSON.parse(text);
    if (response.ok) {
      if (!connectedProjects.has(projectInfo.id)) {
        connectedProjects.set(projectInfo.id,new ConnectedProject(projectInfo.id))
        res.status(200).send('"OK"');
        update()
      } else res.status(204).end()
    } else res.status(response.status).send(text)
  })
})
update()
app.listen(3000)