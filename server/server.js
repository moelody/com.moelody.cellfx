const { runServer, is_cep_context } = require('dnm-node-server-cep');

const run = () => {
  const debug = false;
  runServer("com.danim.mocode.node", require('./router'), debug);
}

if(!is_cep_context) run();

module.exports = run;