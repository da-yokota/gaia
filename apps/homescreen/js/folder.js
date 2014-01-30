'use strict';

var Folder = function Folder(params, cb) {
  GridItem.call(this, params);

  this.iconable = false;
  this.type = GridItemsFactory.TYPE.FOLDER;
  this.hideFromGrid = !!params.hideFromGrid;
  this.providerId = params.provider_id || params.id;
  this.holdApps = params.holdApps;
};

Folder.prototype = {
  __proto__: GridItem.prototype,

  launch: function sc_launch() {
    var features = this.getFeatures();
    // Enriching features...
    features.id = this.id;

    window.dispatchEvent(new CustomEvent('folderlaunch', {
      'detail': features
    }));
  }
};

var FolderManager = (function() {
  var dragElem, folderElem, range;
  var sx, sy;
  var uuidBlob = new Blob();
  var state; // none/pending/done

  function _setMark(elem) {
    elem.classList.add('hover');
  }

  function _unsetMark(elem) {
    elem.classList.remove('hover');
  }

  function _calcRange(elem) {
    var rect = elem.getBoundingClientRect();
    range = {left: rect.left + 15, right: rect.right - 15,
      top: rect.top + 20, bottom: rect.bottom - 20};
    console.log('range: left=' + range.left + 'right=' + range.right +
      'top=' + range.top + 'bottom=' + range.bottom);
  }

  function _isRange(x, y) {
    if (x > range.left && x < range.right &&
        y > range.top && y < range.bottom) {
      return true;
    } else {
      return false;
    }
  }

  function _isUnRange(x, y) {
    if (x < range.left || x > range.right ||
        y < range.top || y > range.bottom) {
      return true;
    } else {
      return false;
    }
  }

  function _isCollection(elem) {
    if (!elem || elem.dataset.isCollection) {
      return true;
    } else {
      return false;
    }
  }

  function _isFolder(elem) {
    if (!elem || elem.dataset.isFolder) {
      return true;
    } else {
      return false;
    }
  }

  function _clearState() {
    state = 'none';
    range = folderElem = null;
  }

  function _generateUUID() {
    var url = window.URL.createObjectURL(uuidBlob),
    id = url.replace('blob:', '');
    window.URL.revokeObjectURL(url);
    return id;
  }

  function _startMarkFolder(elem) {
    switch (state) {
    case 'none':
      if (elem === dragElem) {
        console.log('elem is same as dragElem');
        return;
      }
      // This timing is pending to mark folder.
      _calcRange(elem);
      state = 'pending';
      console.log('state=none, set pending');
      break;
    case 'done':
      // The folder is already marked and unmark.
      _unsetMark(folderElem);
      _clearState();
      console.log('state=done, set none');
      break;
    default:
      console.log('state=' + state);
      break;
    }
  }

  function _updateMarkFolder(elem, x, y) {
    switch (state) {
    case 'pending':
      if (_isRange(x, y)) {
        _setMark(elem);
        folderElem = elem;
        state = 'done';
        console.log('state=pending, set done x=' + x + ' y=' + y);
        return true;
      } else {
        _clearState();
        console.log('state=pending, set none x=' + x + ' y=' + y);
        return false;
      }
    case 'done':
      if (_isUnRange(x, y)) {
        _unsetMark(folderElem);
        _clearState();
        console.log('state=done, set none x=' + x + ' y=' + y);
      } else {
        console.log('state=done, donot set none x=' + x + ' y=' + y);
      }
      return false;
    default:
      _clearState();
      console.log('state=' + state);
      break;
    }
  }

  function _makeFolder(callback) {
    if (state !== 'done') {
      console.log('state is not done');
      return false;
    }
    var dragIcon = GridManager.getIcon(dragElem.dataset);
    var folderIcon = GridManager.getIcon(folderElem.dataset);
    var rect = folderElem.getBoundingClientRect(),
        centerX = rect.left + rect.width / 2,
        centerY = rect.top + rect.height / 2;

    dragIcon.onDragStop(function() {
      // Set flag for these icons in a folder and not showing on pages.

      if (_isFolder(folderElem)) {
         // Add the app in a folder
        dragIcon.descriptor.inFolder = true;
        folderIcon.getDescriptor().holdApps.push(dragIcon.descriptor);
        dragIcon.remove();
      } else {
       // Make a folder
        var uuid = _generateUUID();
        dragIcon.descriptor.inFolder = true;
        folderIcon.descriptor.inFolder = true;
        var holdApps = [dragIcon.descriptor, folderIcon.descriptor];
        var params = {
          'id': uuid,
          'bookmarkURL': uuid,
          'name': 'Folder',
          'icon': '',
          'iconable': false,
          'type': GridItemsFactory.TYPE.FOLDER,
          'holdApps': holdApps
        };
        var folder = GridItemsFactory.create(params);
        // Prepare params for install a folder
        var pageHelper = GridManager.pageHelper;
        var pageNumber = pageHelper.getCurrentPageNumber();
        var page = pageHelper.getCurrent();
        var iconIndex = page.getIconIndex(folderElem);
        var gridPosition = {page: pageNumber, index: iconIndex};
        // Remove icons node that is in folder from HTML
        dragIcon.remove();
        folderIcon.remove();
        // Append a folder
        GridManager.installAt(folder, pageNumber, gridPosition);
      }
      callback();
    }, centerX - sx, centerY - sy, 0);
    return true;
  }

  return {
    init: function(elem, x, y) {
      if (!_isCollection(elem) || !_isFolder(elem)) {
        dragElem = elem;
        sx = x, sy = y;
        _clearState();
        console.log('init elem=' + elem.textContent);
      } else {
        state = '';
        console.log('elem is collection or folder');
      }
    },
    startMarkFolder: _startMarkFolder,
    updateMarkFolder: _updateMarkFolder,
    makeFolder: _makeFolder
  };
})();

var FolderViewer = (function() {
  var folderElem, headerElem, titleElem, closeElem, contentElem, appsElem;
  var folderIcon;
  var isTouch = 'ontouchstart' in window;
  var touchstart = isTouch ? 'touchstart' : 'mousedown';
  var touchmove = isTouch ? 'touchmove' : 'mousemove';
  var touchend = isTouch ? 'touchend' : 'mouseup';
  window.addEventListener('folderlaunch', handleEvent);

  function prepareElements() {
    folderElem = document.getElementById('folder');
    headerElem = folderElem.getElementsByClassName('header')[0];
    titleElem = folderElem.getElementsByClassName('title')[0];
    closeElem = folderElem.getElementsByClassName('close')[0];
    contentElem = folderElem.getElementsByClassName('content')[0];
    appsElem = contentElem.querySelector('.apps-wrapper .static');
    contentElem.addEventListener(touchstart, handleEvent);
  }

  //
  // This func deletes icon which user selected to remove from folder view.
  // This does
  // - delete icon from folder object.
  // - delete icon from folder view.
  // - update flag(holding or not) of icon.
  // - move icon to homescreen.
  //
  function moveAppToHome(moveElem) {
    var page, i;
    var pageHelper = GridManager.pageHelper;
    var icons = folderIcon.descriptor.holdApps;
    var moveIcon = GridManager.getIcon(moveElem.dataset);

    // Get icon by refering to parentNode of removeIcon Element.
    // parentNode.dataset has "manifestURL" and "name" property.
    // icon.innerHTML should be :
    // <img src="blob:205dfb4a-XXXXX
    // data-manifest-u-r-l="app://template.gaiamobile.org/manifest.webapp"
    // data-is-icon="true" style="width: 64px; height: 64px;" class="icon">
    // <span class="remove"> </span>
    // <span class="labelWrapper"><span>Template</span></span>"
    if (moveIcon.app && moveIcon.descriptor) {

      //delete icon from folder object
      for (i = 0; i < icons.length; i++) {
        //Match descriptor of icon and moveIcon.
        if (icons[i].manifestURL === moveIcon.descriptor.manifestURL) {
          icons[i].inFolder = false;
          icons.splice(i, 1);

          //Remove folder icon if no app contains.
          if (icons.length === 0) {
            removeFolderFromHome(folderIcon.descriptor.bookmarkURL);
          }
          break;
        }
      }
      // move app to homescreen
      var pagesNum = pageHelper.getTotalPagesNumber();
      for (i = 1; i <= pagesNum; i++) {
        page = pageHelper.getPage(parseInt(i, 10));
        if (!page) {
          console.log(' ---> page is null or undefined');
        } else if (page.hasEmptySlot()) {
          page.appendIcon(moveIcon);
          break;
        }
        // no empty page so that new page will be added with icon.
        if (i === pagesNum) {
          pageHelper.addPage([moveIcon]);
        }
      }

      // delete icon from folder view.
      moveElem.parentNode.removeChild(moveElem);

      // save state of homescreen
      GridManager.markDirtyState();
    }
    return;
  }

  function removeFolderFromHome(url) {
    var folderElem = getFolderElemByURL(url);
    folderElem.parentNode.removeChild(folderElem);
    return;
  }

  function handleEvent(evt) {
    var target = evt.target;
    switch (evt.type) {
    case touchstart:
      contentElem.addEventListener(touchmove, handleEvent, true);
      contentElem.addEventListener(touchend, handleEvent);
      contentElem.addEventListener('contextmenu', handleEvent);
      break;

    case touchmove:
      break;

    case touchend:
      if (Homescreen.isInEditMode()) {
        if (target.classList.contains('remove')) {
          moveAppToHome(target.parentNode);
          Homescreen.setMode('normal');
        }
      } else {
        var icon = GridManager.getIcon(evt.target.dataset);
        if (icon) {
          icon.app.launch();
        }
      }
      break;

    case 'contextmenu': // long press
      if ('isIcon' in target.dataset) {
        Homescreen.setMode('edit');
      } else {
        Homescreen.setMode('normal');
      }
      break;

    case 'hashchange': // push homebutton
      if (Homescreen.isInEditMode()) {
        Homescreen.setMode('normal');
      } else {
        hideUI();
      }
      break;

    case 'folderlaunch':
      LazyLoader.load(
        ['style/folder.css', document.getElementById('folder-page')],
        function() { doFolderLaunch(evt); });
    }
  }

  function setTitle(title) {
    titleElem.innerHTML = '<span>' + title + '</span>';
  }

  function setApps(apps) {
    var length = apps.length, i, app, temp = [], li, image, url;
    var wrapper, label, removeButton;
    var loadFinish = function() {
      for (var i = 0; i < length; i++) {
        window.URL.revokeObjectURL(temp[i].url);
        temp[i].li.dataset.loaded = 'true';
      }
    };

    for (i = 0; i < length; i++) {
      app = apps[i];
      li = document.createElement('li');
      url = window.URL.createObjectURL(app.renderedIcon);
      image = new Image();
      temp[i] = {li: li, url: url};

      li.id = app.manifestURL;
      li.dataset.name = app.name;
      li.dataset.manifestURL = app.manifestURL;
      if (app.entry_point) {
        li.dataset.entry_point = app.entry_point;
      }

      image.className = 'icon';
      image.style.width = '64px'; // TODO: size configuration is needed.
      image.style.height = '64px';// TODO: size configuration is needed.
      image.dataset.isIcon = true;
      image.dataset.manifestURL = app.manifestURL;
      if (app.entry_point) {
        image.dataset.entry_point = app.entry_point;
      }
      image.src = url;
      if (i === length - 1) {
        image.onload = image.onerror = loadFinish;
      }

      removeButton = document.createElement('span');
      removeButton.className = 'remove';
      label = document.createElement('span');
      label.textContent = app.name;
      wrapper = document.createElement('span');
      wrapper.className = 'labelWrapper';
      wrapper.appendChild(label);

      li.appendChild(image);
      li.appendChild(removeButton);
      li.appendChild(wrapper);
      appsElem.appendChild(li);
    }
  }

  function clearApps() {
    for (var i = appsElem.childNodes.length - 1; i >= 0; i--) {
      appsElem.removeChild(appsElem.childNodes[i]);
    }
  }

  function doFolderLaunch(evt) {
    folderIcon = GridManager.getIconForBookmark(evt.detail.id);
    var descriptor = folderIcon.descriptor;
    prepareElements();
    setTitle(descriptor.name);
    clearApps();
    setApps(descriptor.holdApps);

    closeElem.addEventListener('click', hideUI);
    titleElem.addEventListener('click', Rename.start);
    window.addEventListener('hashchange', handleEvent);
    showUI();
  }

  var Rename = {
    isRenaming: false, oldName: '',

    start: function() {
      if (Rename.isRenaming) {
        return;
      }
      var title = titleElem.querySelector('span').textContent,
      elInput, elDone;

      folderElem.classList.add('editting_name');
      titleElem.innerHTML = '<input type = "text" ' +
        'autocorrect="off" ' +
        'x-inputmode="verbatim" />' +
        '<b class="done"></b>';

      elInput = titleElem.querySelector('input');
      elDone = titleElem.querySelector('.done');

      elInput.focus();
      Rename.oldName = elInput.value = title;

      elInput.addEventListener('blur', Rename.cancel);
      elInput.addEventListener('keyup', Rename.onKeyUp);
      elDone.addEventListener(touchstart, Rename.save);
      titleElem.removeEventListener('click', Rename.start);
      Rename.isRenaming = true;
    },

    onKeyUp: function(e) {
      if (e.keyCode === 13) {
        Rename.save();
      }
    },

    save: function(e) {
      e && e.preventDefault();
      Rename.done(true);
    },

    cancel: function() {
      Rename.done(false);
    },

    done: function(shouldSave) {
      if (!Rename.isRenaming) {
        return;
      }
      var elInput = titleElem.querySelector('input'),
          elDone = titleElem.querySelector('.done'),
          newName = elInput.value,
          nameChanged = newName && newName !== Rename.oldName;

      elInput.removeEventListener('blur', Rename.cancel);
      elInput.removeEventListener('keyup', Rename.onKeyUp);
      elDone.removeEventListener(touchstart, Rename.save);
      elInput.blur();
      if (shouldSave && nameChanged) {
        setTitle(newName);
        setFolderNameOnHome(folderIcon.descriptor.bookmarkURL, newName);
      } else {
        setTitle(Rename.oldName);
      }
      Rename.isRenaming = false;
      window.setTimeout(function() {
        titleElem.addEventListener('click', Rename.start);
      }, 0);
    }
  };

  function showUI() {
    folderElem.style.display = 'block';
    window.setTimeout(function() {
      headerElem.addEventListener('transitionend', function end(evt) {
        evt.target.removeEventListener('transitionend', end);
        document.dispatchEvent(new CustomEvent('folderopened'));
      });
      //Avoid to open contextmenu for wallpaer.
      folderElem.addEventListener('contextmenu', noop);
      folderElem.classList.add('visible');
    }, 0);
  }

  function hideUI() {
    Homescreen.setMode('normal');
    headerElem.addEventListener('transitionend', function end(evt) {
      evt.target.removeEventListener('transitionend', end);
      folderElem.style.display = 'none';
    });
    folderElem.classList.remove('visible');
    folderElem.removeEventListener('contextmenu', noop);
    closeElem.removeEventListener('click', hideUI);
    titleElem.removeEventListener('click', Rename.start);
    window.removeEventListener('hashchange', handleEvent);
  }

  function getFolderElemByURL(url) {
    var query =
      '.icon[data-is-folder="true"][data-bookmark-u-r-l="' + url + '"]';
    return document.querySelector(query);
  }

  function setFolderNameOnHome(url, name) {
    var folderElemOnHome = getFolderElemByURL(url);
    var nameElem = folderElemOnHome.querySelector('span.labelWrapper > span');
    nameElem.innerHTML = name;
    var descriptor = folderIcon.descriptor;
    descriptor.name = descriptor.localizedName = name;
    // save state of homescreen
    GridManager.markDirtyState();
  }

  function noop(evt) {
    evt.stopPropagation();
  }
})();

