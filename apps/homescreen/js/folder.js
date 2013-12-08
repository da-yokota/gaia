'use strict';

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
    updateMarkFolder: _updateMarkFolder
  };
})();
