process.on('unhandledRejection', error => console.error(error));
require('dotenv').config()
const fs = require('fs')
const fetch = require('node-fetch')
const express = require('express');
const rateLimit = require('express-rate-limit');
const app = express()
let userInfo
const ConnectedProject = require('./ws.js');
const connectedProjects = new Map()
const update = init => {
  fetch('https://api.glitch.com/boot?latestProjectOnly=false', {
    headers: {
      authorization: process.env.GLITCH_TOKEN
    }
  }).then(async res => {
    if (res.ok) userInfo = await res.json()
    if (init) {
      for (const project of userInfo.projects) {
        connectedProjects.set(project.id,new ConnectedProject(project.id))
      }
    }
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
app.delete('/app/projects/:invite',async (req,res) => {
  const { invite } = req.params
  const response = await fetch(
    'https://api.glitch.com/projects/' + invite + '/join',
    {
      method: 'POST',
      headers: {
        authorization: process.env.GLITCH_TOKEN
      }
    }
  );
  const text = await response.text();
  const delInfo = JSON.parse(text);
  /**@type { ConnectedProject } */
  const delWS = connectedProjects.get(delInfo.id);
  delWS.ws.close(1)
  if (delWS) connectedProjects.delete(delInfo.id)
  if (!response.ok) return res.status(response.status).send(text);
  else {
    const projectInfo = JSON.parse(text);
    const delResponse = await fetch(
      'https://api.glitch.com/v1/projects/' +
      projectInfo.id +
      '/users/' +
      userInfo.user.id.toString(),
      {
        method: 'DELETE',
        headers: {
          authorization: process.env.GLITCH_TOKEN
        }
      }
    );
    const text2 = await delResponse.text();
    res.send(`"${text2}"`);
    update();
  }
})
update(true)
app.listen(3000)