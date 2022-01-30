class _ {

  _checkObjectWithRequest(object, request) {
    if(!this.isArray(object)) return false;
    for (const key in request) {
      if (object[key] !== request[key]) {
        return false;
      }
    }
    return true;
  }

  get(object, ...indexes) {
    if (indexes.length === 1 && this.isArray(indexes[0])) {
      indexes = indexes[0];
    }
    if (this.isArray(object)) {
      if (indexes.length > 0) {
        let search_object = object;
        for (let i = 0; i < indexes.length; i++) {
          if (this.isArray(search_object) && typeof search_object[indexes[i]] !== 'undefined') {
            search_object = search_object[indexes[i]];
          } else {
            return null;
          }
        }
        return search_object;
      }
      if (this.isObject(indexes) && !this.isObject(object)) {
        const found_entries = [];
        for (let i = 0; i < object.length; i++) {
          if (this._checkObjectWithRequest(object[i], indexes) === true) found_entries.push(object[i]);
        }
        return found_entries;
      }
    }
    return null;
  }

  last(arr) {
    return arr[arr.length - 1];
  }

  //Same as this.get(array, request) but return jsut one element, or null
  find(array, request, exclude_index = []) {
    const index = this.findIndex(array, request, exclude_index);
    if(index !== -1) return array[index];
    return null;
  }

  findIndex(array, request, exclude_index = []) {
    for (let i = 0; i < array.length; i++) {
      if(exclude_index.indexOf(i) === -1) {
        if (this._checkObjectWithRequest(array[i], request) === true) return i;
      }
    }
    return -1;
  }

  set(object, new_value, indexes) {
    if (this.isArray(object)) {
      const l = indexes.length;
      for (let i = 0; i < l - 1; i++) {
        const n = indexes[i];
        if (typeof object[n] !== 'undefined') {
          object = object[n];
        } else {
          object[n] = {};
          object = object[n];
        }
      }
      object[indexes[l - 1]] = new_value;
    }
  }

  add(object, ...indexes) {
    for (let i = 0; i < indexes.length; i++) {
      object.push(indexes[i]);
    }
  }

  addArray(object, indexes) {
    for (let i = 0; i < indexes.length; i++) {
      this.add(object, indexes[i]);
    }
  }

  // [{id:1, desc:"ok"}, {id:55, desc:"no"}, {id:1, desc:"yes"}] with search {id:1, desc:"ok"} return 1
  count(array, search) {
    if(this.isObject(search)) {
      return this.get(array, search).length;
    } else {
      let count = 0;
      array.forEach(el => {
        if(el === search) count ++;
      });
      return count;
    }
  }

  merge(obj1, obj2, erase = true) {
    for (const key in obj2) {
      if (erase === true || typeof obj1[key] === 'undefined') obj1[key] = obj2[key];
    }
    return obj1;
  }

  cloneAndAdd(object, ...indexes) {
    const new_arr = this.clone(object);
    this.add(new_arr, ...indexes);
    return new_arr;
  }

  clone(object) {
    return JSON.parse(JSON.stringify(object));
  } 

  insert(array, insertKey, ...values) {
    array.splice(insertKey, 0, ...values);
  }

  shift(arr, from, to) {
    const extract = arr.splice(from, 1) [0];
    arr.splice(to, 0, extract);
  }

  isArray(object) {
    if (object === null || (typeof object !== 'object' && typeof object !== 'array'))  {
      return false;
    }
    return true;
  }

  isObject(object) {
    if (this.isArray(object) === true && typeof object.length === 'undefined') return true;
    return false;
  }

  transferKeysToArray(array, search_key) {
    const new_array = [];
    for (let i = 0; i < array.length; i++) {
      new_array.push(this.get(array[i], search_key));
    }
    return new_array;
  }

  //Find value recursively by key
  findByKey(object, searchKey) {
    if (this.isArray(object)) {
      for (const key in object) {
        if (key === searchKey) return object[key];
        if (this.isArray(object[key])) {
          const newSearch = this.findByKey(object[key], searchKey);
          if (newSearch) return newSearch;
        }
      }
    }
    return null;
  }

  //find key recursively by value
  findKeyByValue(object, value) {
    if (this.isArray(object)) {
      for (const key in object) {
        if (object[key] === value) return key;
        if (this.isArray(object[key])) {
          const newSearch = this.findKeyByValue(object[key], value);
          if (newSearch) return newSearch;
        }
      }
    }
  }

  removeByValue(array, value) {
    const index = array.indexOf(value);
    if (index > -1) {
      array.splice(index, 1);
    }
  }

  removeByIndex(array, key) {
    if (array.length >= key + 1) array.splice(key, 1);
  }

  cloneAndRemoveByKey(array, removeKey) {
    const new_arr = array.filter((item, index) => index !== removeKey);
    return new_arr;
  }

  reverse(arr) {
    const new_arr = [];
    for (let i = arr.length - 1; i >= 0; i--) {
        new_arr.push(arr[i]);
    }
    return new_arr;
  }

  //Return true if installed >= require, otherwise false
  compareVersions(installed, required) {
    const a = installed.split('.');
    const b = required.split('.');
    for(let i=0; i<a.length; i++) {
      if (a[i] > b[i]) return true;
      if (a[i] < b[i]) return false;
    }
    return true;
  }

  sanitizeFilename(str) {
    const caracters = {
      'à': 'a',
      'á': 'a',
      'â': 'a',
      'ä': 'a',
      '@': 'at',
      'è': 'e',
      'é': 'e',
      'ê': 'e',
      'ë': 'e',
      '€': 'euro',
      'ì': 'i',
      'í': 'i',
      'î': 'i',
      'ï': 'i',
      'ò': 'o',
      'ó': 'o',
      'ô': 'o',
      'ö': 'o',
      'ù': 'u',
      'ú': 'u',
      'û': 'u',
      'ü': 'u',
      'µ': 'u',
      'œ': 'oe',
    };
    for (const key in caracters) {
      const regex = new RegExp(key, 'gi');
      str = str.replace(regex, caracters[key]);
    }
    return str.replace(/[^\w\s\b._\b]/gi, '-').replace(/\-{2,}/g, '-');
  }

  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  log(msg, log) {
    console.group(msg);
    console.log(log);
    console.groupEnd();
  }

  truncate(str, max, type = 'middle') {
    if (typeof str !== 'string') return str;
    let new_str = str;
    if (str.length > max + 5) {
      const delta = type === 'middle' ? max / 2 : max;
      const str_begin = str.substring(0, delta);
      const str_end = str.substring(str.length - delta, str.length);
      if (type === 'middle') new_str = `${str_begin}[...]${str_end}`;
      else if (type === 'begin') new_str = `[...]${str_end}`;
      else new_str = `${str_begin}[...]`;
    }
    return new_str;
  }

  unfocus() {
    const tmp = document.createElement('input');
    document.body.appendChild(tmp);
    tmp.focus();
    document.body.removeChild(tmp);
  }
}

module.exports = new _();
  