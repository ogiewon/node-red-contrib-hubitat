/* eslint-disable global-require */
module.exports = function HubitatModeSetterModule(RED) {
  const fetch = require('node-fetch');

  // All possible HE event values: https://github.com/fblackburn1/node-red-contrib-hubitat/pull/9#issuecomment-602258248
  // Conveniant to pass the event value directly in the message property
  function convertAlarmState(value) {
    switch (value) {
      case 'stay':
      case 'armHome':
      case 'armedHome':
      case 'armhome':
      case 'armedhome':
        return 'armHome';
      case 'away':
      case 'armaway':
      case 'armAway':
      case 'armedaway':
      case 'armedAway':
        return 'armAway';
      case 'night':
      case 'armnight':
      case 'armNight':
      case 'armednight':
      case 'armedNight':
        return 'armNight';
      case 'off':
      case 'disarm':
      case 'disarmed':
        return 'disarm';
      case 'disarmAll':
      case 'disarmall':
      case 'allDisarmed':
      case 'alldisarmed':
        return 'disarmAll';
      case 'cancelAlerts':
        return 'cancelAlerts';
      default:
        return 'invalid';
    }
  }

  function HubitatModeSetterNode(config) {
    RED.nodes.createNode(this, config);

    this.hubitat = RED.nodes.getNode(config.server);
    this.name = config.name;
    this.state = config.state;
    const node = this;

    if (!node.hubitat) {
      node.error('Hubitat server not configured');
      return;
    }

    node.on('input', async (msg, send, done) => {
      node.status({ fill: 'blue', shape: 'dot', text: 'requesting' });

      const rawState = msg.state || node.state;
      if (!rawState) {
        node.status({ fill: 'red', shape: 'ring', text: 'undefined state' });
        done('undefined hsm');
        return;
      }

      const state = convertAlarmState(rawState);
      if (state === 'invalid') {
        node.status({ fill: 'red', shape: node.shape, text: 'invalid state' });
        done('invalid state');
        return;
      }

      const url = `${node.hubitat.baseUrl}/hsm/${state}?access_token=${node.hubitat.token}`;
      const options = { method: 'GET' };

      try {
        const response = await fetch(url, options);
        if (response.status >= 400) {
          node.status({ fill: 'red', shape: 'ring', text: 'response error' });
          done(await response.text());
          return;
        }
        const output = { ...msg, response: await response.json() };
        node.status({});
        send(output);
        done();
      } catch (err) {
        node.status({ fill: 'red', shape: 'ring', text: err.code });
        done(err);
      }
    });
  }

  RED.nodes.registerType('hubitat hsm-setter', HubitatModeSetterNode);
};
