const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const portfinder = require('portfinder');
const is_cep_context = typeof window === "undefined" ? false : true;
const CustomCSEvent = require('./src/CustomCSEvent');
const _ = require('./src/node-dnm-utilities');
const crypto = require('crypto');
const fs = require('fs');

//Attach multiple elements to window
function attachToWindow(extension_id, server) {
  if (is_cep_context) {
  
    window.CsInterface = new CSInterface();
    window.CsEvent = new CustomCSEvent(CsInterface);
    window.is_production =
      CsEvent.extension_id === extension_id
        ? true
        : false;
    window.server = server;
  
    //Create close server function
    window.close = function() {
      server.close();
      CsInterface.closeExtension();
    };
  
    //Add listener for dev use only : On manual reload (without close and restart application), server automatically close and reload
    CsEvent.addEventListener((event) => {
      if (event.data === "reload") {
        close();
        location.reload();
      }
    });
  
  }
}

const runServer = (extension_id, router, debug = false, ssl = null, send_node_port = true, basePort = 3010) => {
  return new Promise((resolve, reject) => {
    let server;
    if(ssl !== null) {
      const key = fs.readFileSync(ssl.key, 'utf8'), cert = fs.readFileSync(ssl.cert, 'utf8');
      server = require("https").createServer({ key, cert }, app);
    } else {
      server = require("http").createServer(app);
    }
  
    attachToWindow(extension_id, server);
  
    portfinder.basePort = basePort;
    portfinder.getPortPromise()
      .then((port) => {
  
        crypto.randomBytes(48, (err, buffer) => {
          if(err) console.error(err);
          const auth_key = err ? new Date().getTime() : buffer.toString('hex');
          
          if(is_cep_context && send_node_port) {
            CsEvent.addEventListener((event) => {
              const data = event.data;
              if(typeof data === "object") {
                if(data.id === "get_node_port") {
                  CsEvent.send(data.extension_id, {
                    id: "send_node_port",
                    port,
                    auth_key,
                    ssl: ssl !== null
                  });
                }
              }
            });
          }
    
          const server_name = is_cep_context ? CsEvent.extension_id : extension_id + " dev server";
    
          /* Start the server */
          server.listen(port, 'localhost');
          console.log(`${server_name} is listening on port: ${port}`);
          if(debug) {
            server.on('clientError', (err) => {
              console.log("clientError", err);
            });
            server.on('connect', (req) => {
              console.log("Connect", console.log(req));
            });
            server.on('close', () => {
              console.log("Server close");
            });
          }
    
          /* Middlewares */
          app.use(bodyParser.urlencoded({ extended: true, limit: '500mb' }));
          app.use(bodyParser.json({ limit: '500mb' }));

          app.use(function(req, res, next) {
            res.header("Cache-Control", "private, no-cache, no-store, must-revalidate");
            res.header("Expires", "-1");
            res.header("Pragma", "no-cache");
            next();
          });
  
          // Check temporary API key
          app.use(function (req, res, next) {
            if(auth_key) {
              if (!req.header('X-Auth-Key')) {
                res.status(401).send({
                  success: false,
                  message: 'Please provide the auth key.',
                });
                return false;
              } else if (req.header('X-Auth-Key') !== auth_key) {
                res.status(403).send({
                  success: false,
                  message: 'Bad auth key.',
                });
                return false;
              } 
            }
            next();
          });
  
          // Routers
          app.use("/", router);
    
          app.get("/", (req, res) => {
            res.status(200).send(server_name + " is running.");
          });
  
          resolve({ port, auth_key, server });
        });
  
  
      }).catch((err) => { 
        console.error(err);
        reject(err);
      });
  })
  
};

module.exports = { runServer, is_cep_context, _ };
