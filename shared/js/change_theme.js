SettingsListener.observe('theme.skin', 'skin-default', function(newSkin) {
  'use strict';
  var rSkin = /^skin\-\w+$/;

  if (typeof newSkin !== 'string' || newSkin.match(rSkin) === null) {
    console.error('Input argument is Not "skin-xxx".');
    return;
  }

  var body = document.body, cList = body.classList, list, i, len, skin;

  list = Array.prototype.slice.call(cList);
  for (i = 0, len = list.length; i < len; i++) {
    skin = list[i].match(rSkin);
    if (skin) {
      cList.remove(skin[0]);
    }
  }
  cList.add(newSkin);
});
