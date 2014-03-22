/**
 * Forward messages from LockScreen.
 */

(function(exports) {
'use strict';
var LockScreenProxy = function() {
//  this.publish('secure-modeon');
  window.addEventListener('iac-lockscreencomms', this);
  var iacsendtest = document.getElementById('iacsend-test');
  iacsendtest.addEventListener('click', this.iacsend);
};
LockScreenProxy.prototype.handleEvent = function(evt) {
  console.log('>> lockscreen channel message: ', evt.detail);
  var message = evt.detail;
  switch (message.type) {
    case 'unlock':
      this.publish('will-unlock');
      break;
    case 'invoke-secureapp':
      this.publish('secure-launchapp', {
        appURL: message.url,
        appManifestURL: message.manifestUrl
      });
      break;
  }
};

LockScreenProxy.prototype.publish = function(type, detail) {
  var evt = new CustomEvent(type, {detail: detail});
  window.dispatchEvent(evt);
  console.log('>> proxy forwared: ', evt.type);
};

LockScreenProxy.prototype.iacsend = function() {
  navigator.mozApps.getSelf().onsuccess = function(evt) {
    console.log('getself onsuccess');
    var own = evt.target.result;
    if(!own) {
      console.log('getself error');
      return;
    }
    own.connect('lockscreencommsreverse').then(function(ports) {
      console.log('get ports');
      ports.forEach(function(port) {
        console.log('port in loop');
        port.postMessage({'type': 'sendfromlockscreen'});
      });
    });
  };
};

exports.lockScreenProxy = new LockScreenProxy();
})(window);
