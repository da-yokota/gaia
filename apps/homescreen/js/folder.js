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
