// ETA = NOW
// THIS DOES NOT PING THE URL
// DELETE https://api.glitch.com/v1/projects/:project-id/user/:user-id
// POST https://api.glitch.com/projects/:invite-code/join
(async () => {
  process.on('unhandledRejection', error => console.error(error));
  const fs = require('fs')
  const express = require('express');
  const rateLimit = require('express-rate-limit');
  const limiter = rateLimit({
    windowMs: 60000,
    max: 5, // limit each IP to 5 requests per windowMs
    message: '{"message":"Too many requests, please try again later"}'
  });
    const adminLimiter = rateLimit({
    windowMs: 60000,
    max: 100, // limit each IP to 100 requests per windowMs
    message: '"Too many requests, please try again later"'
  });
  const { spawn } = require('child_process');
  const children = new Map();
  const app = express();
  const fetch = require('node-fetch');
  app.enable("trust proxy")
  const listener = app.listen(3000, () => {
    console.log('Your app is listening on port ' + listener.address().port);
  });
  const WebSocket = require('ws');
  function noop() { }
  const wss = new WebSocket.Server({
    server: listener, path: '/api/gateway'
  });
  wss.on('connection', function connection(ws) {
    let pingTimeout = setTimeout(() => {
      ws.terminate()
    }, 30000)
    ws.on('message', msg => {
      const data = JSON.parse(msg)
      if (data.type === 'ping') {
        clearTimeout(pingTimeout)
        pingTimeout = setTimeout(() => {
          ws.terminate()
        }, 30000)
        ws.send(JSON.stringify({ type: "pong" }))
      }
    })
  });
  wss.on('close', function close() {
    clearInterval(interval);
  });
  let userInfo = await fetch(
    'https://api.glitch.com/boot?latestProjectOnly=false',
    {
      headers: {
        authorization: process.env.GLITCH_TOKEN
      }
    }
  ).then(res => {
    if (res.ok) return res.json();
    else process.exit(1);
  });
  const update = isRegular => {
    fetch('https://api.glitch.com/boot?latestProjectOnly=false', {
      headers: {
        authorization: process.env.GLITCH_TOKEN
      }
    }).then(async res => {
      if (res.ok) userInfo = await res.json();
      userInfo.projects.length
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: "PROJECT_COUNT", payload: userInfo.projects.length }));
        }
      })
    });
  };
  function spawnChild(projectInfo, isInital) {
    const child = spawn('exec node ./ws.js ' + projectInfo.id, [], { stdio: 'inherit', shell: true })
    children.set(projectInfo.id, child);
    if (!isInital) update();
    child.once('exit', (code, signal) => {
      if (signal || code !== 0) {
        children.delete(projectInfo.id)
      } else {
        spawnChild(projectInfo)
      }
    })
  }
  userInfo.projects.forEach(projectInfo => {
    spawnChild(projectInfo, true)
  })
  // make all the files in 'public' available
  // https://expressjs.com/en/starter/static-files.html
  app.use(express.static('public'));
  // https://expressjs.com/en/starter/basic-routing.html
  app.get('/', (request, response) => {
    response.sendFile(__dirname + '/views/index.html');
  });
  app.get('/admin', (req, res) => {
    res.sendFile(__dirname + '/views/admin.html');
  })
  app.use('/api', (req, res, next) => {
    res.set('Content-Type', 'application/json');
    next();
  });
  app.use('/admin/',adminLimiter)
  app.use('/api/admin', (req, res, next) => {
    if (req.headers.authorization !== process.env.ADMIN_KEY) return res.status(401).send('"Missing or incorrect admin key."')
    next()
  })
  app.get('/api/admin/dashboard', async (req, res) => {
    await update()
    res.json(userInfo)
  })
  app.get('/api/admin/login', (req, res) => {
    res.send('"OK"')
  })
  app.delete('/api/admin/projects/ws', (req, res) => {
    children.forEach(child => {
      child.kill('SIGINT')
    })
    res.send('"OK"')
  })
  app.put('/api/admin/projects/ws', (req, res) => {
    userInfo.projects.forEach(project => {
      if (!children.has(project.id) || children.get(project.id).exitCode || children.get(project.id).killed) {
        spawnChild(project)
      }
    })
    res.status(200).send('"OK"')
  })
  app.delete('/api/admin/projects/:project_id/ws', (req, res) => {
    const id = req.params.id
    const child = children.get(id)
    if (child || child.exitCode || child.killed) {
      return res.status(204)
    } else {
      child.kill('SIGINT')
      res.status(200).send('"OK"')
    }
  })
  app.put('/api/admin/projects/:project_id/ws', (req, res) => {
    const id = req.params.id
    const child = children.get(id)
    if (!child || child.exitCode || child.killed) {
      spawnChild({ id })
      res.status(200).send('"OK"')
    } else res.status(204)
  })
  app.delete('/api/admin/projects/:id', (req, res) => {
    fetch(`https://api.glitch.com/v1/projects/${req.params.id}/users/${userInfo.user.id}`, { method: "DELETE", headers: { authorization: userInfo.user.persistentToken } }).then(async response => {
      res.status(response.status).send(await response.text())
      update()
    })
  })
  app.use('/api/projects/', limiter);
  app.use('/api', express.json());
  app.get('/api/totalProjects', (req, res) => {
    res.send(userInfo.projects.length.toString());
  });
  app.put('/api/projects/:invite', async (req, res) => {
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
        if (projectInfo.id) {
          spawnChild(projectInfo)
          res.status(200).send('"OK"');
          update()
        } else res.status(204).end()
      } else res.status(response.status).send(text)
    })
  })
  app.delete('/api/projects/:invite', async (req, res) => {
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
      const delInfo = JSON.parse(text);
      const child = children.get(delInfo.id);
      if (child) process.kill(child.pid, 'SIGINT');
      children.delete(delInfo.id);
    }
  });
  app.use(function(err, req, res, next) {
    console.error(err);
    res.status(500).send('"Internal Server Error"');
  });
  setInterval(() => update(true), 900000);
  setInterval(async () => {
    const res = await fetch('https://glitchuptime.nickchan4.repl.co/');
    if (!res.ok) throw new Error(res.statusText);
  }, 60000)
})();
