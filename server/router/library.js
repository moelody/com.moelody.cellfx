const request = require('request');
const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const nedb = require('nedb');
const serverPaths = require('../lib/server-paths');
const { _ } = require('dnm-node-server-cep');
const mkdirp = require('mkdirp');
const crypto = require("crypto");
const promisesChain = require('promises-chain');
const AdmZip = require('adm-zip');
const rimraf = require("rimraf");

const ae_directory = CsInterface.getSystemPath(SystemPath.HOST_APPLICATION);
const ae_scripts_directory = path.normalize(path.dirname(ae_directory) + "/Scripts");
const ae_scripts_ui_directory = path.normalize(ae_scripts_directory + "/ScriptUI Panels");

const db_list = [];

const icon_folder_path = path.normalize(serverPaths.database + `/toolbar/icons`);
const ffx_folder_path = path.normalize(serverPaths.database + `/toolbar/ffx`);

const getDbName = (name) => {
  // Because of an old error, we need to keep .dev.db in production, and .test.db in dev...
  return `${name}.${window.is_production ? 'dev.db' : 'test.db'}`;
}

let db_folder = serverPaths.database;
if(!window.is_production) db_folder += "-dev";
db_folder += "/";

const db_name = getDbName("visual-expression-library");
const db_path = path.normalize(db_folder + db_name);
const db = new nedb({
  filename: db_path,
  autoload: true
});

const remote_db_name = getDbName("visual-expression-remote-library");
const remote_db_path = path.normalize(db_folder + remote_db_name);
const remote_db = new nedb({
  filename: remote_db_path,
  autoload: true
});

const toolbar_db_name = getDbName("mocode-toolbar");
const toolbar_db_projection_name = getDbName("mocode-toolbar-projections");
const toolbar_db_path = path.normalize(db_folder + 'toolbar/' + toolbar_db_name);
const toolbar_db = new nedb({
  filename: toolbar_db_path,
  autoload: true,
});

const toolbar_db_projection_path = path.normalize(db_folder + 'toolbar/' + toolbar_db_projection_name);
const toolbar_projection_db = new nedb({
  filename: toolbar_db_projection_path,
  autoload: true,
});


const toolbar_cep_ids = [
  "com.danim.mocode.toolbar",
  "com.danim.mocode.toolbar2",
  "com.danim.mocode.toolbar3",
];


const copyFile = (source, destination) => {
  source = path.normalize(source);
  destination = path.normalize(destination);

  return new Promise((resolve, reject) => {
    mkdirp(path.dirname(destination), err => {
      if(err) reject(err);
      else {
        const readStream = fs.createReadStream(source);
        const writeStream = fs.createWriteStream(destination);
        readStream.on("error", reject);
        writeStream.on("error", reject);
        writeStream.on("finish", resolve);
        readStream.pipe(writeStream);
      }
    });
  });
}

const getRelativePathFromDbFolder = (absolute_path) => {
  return path.relative(db_folder, absolute_path);
}

const getAbsolutePathFromDbFolder = (relative_path) => {
  return path.resolve(db_folder, relative_path);
}

const refreshToolbars = () => {
  return cleanToolbarDatabaseAndUpdateProjections(true);
}

const createItemProjection = (library, item, is_remote, unique_id) => {
  return {
    unique_id: unique_id,
    item_id: item._id,
    library_id: library._id,
    library_name: library.name,
    type: library.type,
    item_name: item.name,
    code: item.code,
    tags: item.tags,
    related_expressions: item.related_expressions,
    is_remote,
    include_id: item.is_include ? item.include_id : null,
    skip_include_cleaner: item.skip_include_cleaner,
    is_snippet: item.is_snippet,
    is_include: item.is_include,
    snippet_prefix: item.snippet_prefix,
    documentation: item.documentation,
  }
}

const getAllRemoteExpressions = () => {
  return new Promise((resolve, reject) => {
    remote_db.find({}, (err, docs) => {
      if (err) reject(err);
      else {
        const promises = [];
        docs.forEach((doc, doc_key) => {
          let { local_path } = doc;
          local_path = getAbsolutePathFromDbFolder(local_path);
          const newPromise = () => {
            return new Promise(remote_resolve => {
              getRemoteDatabaseContent(local_path).then(libraries => {
                const remote_projection = [];
                libraries.forEach((library, library_key) => {
                  const { expressions } = library;
                  expressions.forEach((item, item_key) => {
                    const unique_id = `${new Date().getTime()}-remote-${doc_key}-${library_key}-${item_key}`;
                    remote_projection.push(createItemProjection(library, item, true, unique_id))
                  });
                  remote_resolve(remote_projection);
                })
              }).catch(e => remote_resolve([]));
            });
          }
          promises.push(newPromise);
        });
        Promise.chain(promises).then(docs_projection => {
          const projections = [];
          docs_projection.forEach(doc => {
            doc.forEach(item => {
              projections.push(item);
            })
          })
          resolve(projections);
        })
      }
    })
  })
}

const getAllLocalExpressions = () => {
  return new Promise((resolve, reject) => {
    const projections = [];
    db.find({}, function (err, libraries) {
      if (err) reject(err);
      else {
        const get_items_promises = [];
        libraries.forEach((library, library_key) => {
          const getItemsPromise = () => {
            return new Promise((lib_resolve) => {
              getExpressionsInDatabase(library._id).then(items => {
                const all_items = [];
                items.forEach((item, item_key) => {
                  const unique_id = `${new Date().getTime()}-${library_key}-${item_key}`;
                  all_items.push(createItemProjection(library, item, false, unique_id));
                });
                lib_resolve(all_items);
              }).catch(e => lib_resolve([]));
            });
          }
          get_items_promises.push(getItemsPromise);
        })
        Promise.chain(get_items_promises).then(libs => {
          libs.forEach(lib => {
            lib.forEach(item => projections.push(item));
          });
          resolve(projections);
        }).catch(e => reject(e));
      }
    });
  })
}

const getAllExpressionsProjection = (send_event_to_toolbar = false) => {
  return new Promise((resolve, reject) => {
    const localPromise = getAllLocalExpressions();
    const remotePromise = getAllRemoteExpressions();
    Promise.all([localPromise, remotePromise]).then(projections => {
      const all_items = [];
      projections.forEach(projection => {
        projection.forEach(item => {
          all_items.push(item);
        })
      })
      if (send_event_to_toolbar) {
        const projections = _.clone(all_items);
        projections.forEach(item => {
          delete item.code;
          delete item.related_expressions;
        });
        toolbar_cep_ids.forEach(toolbar_cep_id => {
          CsEvent.send(is_production ? toolbar_cep_id : toolbar_cep_id + ".dev", {
            event_id: "library_has_been_updated",
            projections
          });
        })
      }
      resolve(all_items);
    }).catch(e => reject(e));
  });
}

const cleanToolbarDatabaseAndUpdateProjections = (send_event_to_toolbar = false) => {
  return new Promise((resolve, reject) => {
    getAllExpressionsProjection(send_event_to_toolbar).then(library_projections => {
      toolbar_db.find({}, function (err, docs) {
        if (err) reject(err);
        else {
          const allPromises = [];
          const projections = [];
          const all_icons = [];
          const all_ffx = [];
          let error_server = false;
          docs.forEach((doc) => {
            const toolbarPromise = () => new Promise((resolve) => {
              const allItemsPromises = [];
              const toolbar_items = _.get(doc, "items") || [];
              toolbar_items.forEach((_item, item_index) => {
                const itemPromise = new Promise((item_resolve) => {
                  const item = _.clone(_item);
                  if (!item.behaviour) item.behaviour = "library";
                  const { is_remote, library_id, item_id, type, behaviour, jsx_path, unique_id, ffx_path, icon } = item;
                  if (!unique_id) {
                    item.unique_id = generateUniqueIdForToolbarItem(docs);
                  }
                  if (icon) {
                    item.icon = path.normalize(icon_folder_path + "/" + icon);
                    if (!fs.existsSync(item.icon)) delete item.icon;
                    else all_icons.push(icon);
                  }
                  if (ffx_path) {
                    item.ffx_path = path.normalize(ffx_folder_path + "/" + ffx_path);
                    all_ffx.push(ffx_path);
                  }
                  item.index = item_index;
                  if (behaviour === "library") {
                    const exp = _.find(library_projections, { is_remote: is_remote || false, library_id, item_id, type });
                    if (exp) {
                      const { code, related_expressions, item_name } = exp;
                      item.item_name = item_name;
                      const item_in_projection = _.clone(item);
                      item_in_projection.code = code;
                      if (related_expressions) item_in_projection.related_expressions = related_expressions;
                      projections.push(item_in_projection);
                      item_resolve(item);
                    } else item_resolve(null);
                  } else if (behaviour === "jsx" || behaviour === "effect" || (behaviour === "ffx" && fs.existsSync(item.ffx_path))) {
                    if(behaviour === "jsx") {
                      const script_name = path.basename(jsx_path);
                      const path_in_script = path.normalize(ae_scripts_directory + "/" + script_name);
                      if(fs.existsSync(path_in_script)) item.jsx_path = path_in_script;
                      else {
                        const path_in_script_ui = path.normalize(ae_scripts_ui_directory + "/" + script_name);
                        if(fs.existsSync(path_in_script_ui)) item.jsx_path = path_in_script_ui;
                      }
                    }
                    projections.push(item);
                    item_resolve(item);
                  } else item_resolve(null);
                });
                allItemsPromises.push(itemPromise);
              })
              Promise.all(allItemsPromises).then((cleaned_items) => {
                cleaned_items = cleaned_items.filter(e => e);
                cleaned_items.sort((a, b) => {
                  return a.index - b.index;
                });
                const cleaned_toolbar = doc;
                cleaned_toolbar.items = cleaned_items;
                resolve(cleaned_toolbar)
              });
            })
            allPromises.push(toolbarPromise);
          })
          Promise.chain(allPromises).then(toolbars => {
            toolbars.sort((a, b) => {
              return a.index - b.index;
            });
            toolbar_projection_db.remove({}, { multi: true }, (err) => {
              if (err) reject(err);
              else {
                toolbar_projection_db.insert(projections, (err) => {
                  if (err) reject(err);
                  else {
                    if (send_event_to_toolbar === true) {
                      toolbar_cep_ids.forEach(toolbar_cep_id => {
                        CsEvent.send(is_production ? toolbar_cep_id : toolbar_cep_id + ".dev", {
                          event_id: "toolbars_have_been_updated",
                          toolbars
                        });
                      });                      
                    }
                    //Clean useless files
                    if (error_server === false) {
                      const search_array = [
                        {
                          folder: icon_folder_path,
                          names: all_icons
                        },
                        {
                          folder: ffx_folder_path,
                          names: all_ffx
                        }
                      ];
                      search_array.forEach(search => {
                        const { folder, names } = search;
                        if(fs.existsSync(folder)) {
                          fs.readdir(folder, (err, files) => {
                            if (err) console.error(err);
                            else {
                              files.forEach(file => {
                                if (names.indexOf(file) === -1) {
                                  fs.unlink(path.normalize(folder + "/" + file), (err) => console.error(err));
                                }
                              });
                            }
                          });
                        }
                      })
                    }
                    resolve({ toolbars, library_projections })
                  };
                })
              }
            });
          });
        }
      })
    }).catch(e => reject(e));
  })
}

const generateUniqueIdForToolbarItem = (toolbars) => {
  let id = null;
  while (id === null) {
    id = crypto.randomBytes(16).toString("hex");
    for (let i = 0; i < toolbars.length; i++) {
      const items = toolbars[i].items;
      for (let n = 0; n < items.length; n++) {
        const unique_id = items[n].unique_id;
        if (unique_id && id === unique_id) id = null;
      }
    }
  }
  return id;
}

const createId = (name) => {
  return _.sanitizeFilename(name + "-" + new Date().getTime()).replace(/ /g, "-");
}

const loadDb = (db_path) => {
  db_path = getAbsolutePathFromDbFolder(db_path);
  return new Promise((resolve, reject) => {
    const db = new nedb({
      filename: db_path
    });
    const db_in_list = _.find(db_list, { path: db_path });
    if (db_in_list === null) {
      console.log("DB not found, load it: ", db_path, db_list);
      db.loadDatabase(err => {
        if (err) {
          console.error("Can't load db " + db_path, err);
          reject(err);
        }
        else {
          db_list.push({
            path: db_path,
            db
          })
          resolve(db);
        }
      });
    } else resolve(db_in_list.db)
  })
}

const getRemoteSubLibrariesProjection = () => {
  return new Promise((resolve, reject) => {
    remote_db.find({}, (err, docs) => {
      if (err) reject(err);
      else {
        const projections = [];
        docs.forEach(doc => {
          const { _id, sub_libraries, url, name } = doc;
          let { local_path } = doc;
          local_path = getAbsolutePathFromDbFolder(local_path);
          if (_id && local_path && sub_libraries && sub_libraries.length > 0) {
            projections.push({ _id, sub_libraries, local_path, url, name });
          }
        });
        resolve(projections);
      }
    })
  })
}

const getRemoteDatabaseContent = (path) => {
  return new Promise((resolve, reject) => {
    fs.readFile(path, (err, data) => {
      if (err) reject(err);
      else {
        try {
          const content = JSON.parse(data);
          resolve(content);
        } catch (e) { reject(e) }
      }
    });
  })
}

const getExpressionDatabase = (db_id, type = null) => {
  const request = {
    _id: db_id
  };
  if (type) request.type = type;
  return new Promise((resolve, reject) => {
    db.findOne(request, function (err, doc) {
      if (err) reject({ status: 500, message: err });
      else if (!doc) reject({ status: 404, message: "database_not_found" });
      else {
        // Update old absolute paths
        if(path.isAbsolute(doc.path)) {
          db.update({ _id: doc._id }, { $set: { path: getRelativePathFromDbFolder(doc.path) } }, { multi: false }, (err) => {
            if(err) console.error(err);
          });
        } else {
          doc.path = getAbsolutePathFromDbFolder(doc.path);
        }
        resolve(doc);
      }
    });
  })
}


const getExpressionInRemoteDatabase = (library_id, expression_id, type = null, remote_projections = null) => {
  const getProjection = () => {
    return new Promise((resolve, reject) => {
      if (!remote_projections) {
        getRemoteSubLibrariesProjection().then(projections => resolve(projections)).catch(e => reject(e));
      } else resolve(remote_projections);
    })
  }
  return new Promise((resolve, reject) => {
    getProjection().then(remote_projections => {
      let path = null;
      for (let i = 0; i < remote_projections.length; i++) {
        const { sub_libraries, local_path } = remote_projections[i];
        if (sub_libraries.indexOf(library_id) !== -1) {
          path = local_path;
          break;
        }
      }
      if (path) {
        getRemoteDatabaseContent(path).then(libraries => {
          const request = { _id: library_id };
          if (type) request.type = type;
          const remote_library = _.find(libraries, request);
          if (remote_library) {
            const { expressions } = remote_library;
            const expression = _.find(expressions, { _id: expression_id });
            if (expression) resolve(expression);
            else reject({ status: 404, message: "expression_not_found" })
          } else reject({ status: 404, message: "library_not_found" })
        }).catch(e => reject({ status: 500, message: "database_unreadable" }));
      } else reject({ status: 404, message: "database_not_found" })
    }).catch(e => reject({ status: 500, message: e }))
  })
}

const getExpressionInDatabase = (db_id, expression = null, type = null) => {
  return new Promise((resolve, reject) => {
    getExpressionsInDatabase(db_id, expression, type).then(exp => {
      resolve(exp[0]);
    }).catch(e => reject(e));
  })
}

const getExpressionsInDatabase = (db_id, expression = null, type = null) => {
  return new Promise((resolve, reject) => {
    getExpressionDatabase(db_id, type).then(db_infos => {
      loadDb(db_infos.path).then(exp_db => {
        if (expression) {
          exp_db.findOne(expression, (err, doc) => {
            if (err) reject({ status: 500, message: err })
            else if (!doc) reject({ status: 404, message: "expression_not_found" });
            else resolve([doc]);
          });
        } else {
          exp_db.find({}, (err, docs) => {
            if (err) reject({ status: 500, message: err })
            else resolve(docs);
          });
        }
      }).catch(e => reject({ status: 500, message: e }))
    }).catch(e => reject({ status: e.status, message: e.message }))
  })
}

const loadDbWithId = (db_id) => {
  return new Promise((resolve, reject) => {
    getExpressionDatabase(db_id).then(db_infos => {
      loadDb(db_infos.path).then(exp_db => resolve(exp_db)).catch(e => reject(e));
    }).catch(e => reject(e));
  })
}

const createLibrary = (library, expressions = null) => {
  return new Promise((resolve, reject) => {
    library.path = getRelativePathFromDbFolder(path.normalize(db_folder + library._id + ".db"));
    db.insert(library, (err, newEntry) => {
      if (err) reject({ status: 500, message: err });
      else {
        if (expressions === null) resolve(newEntry);
        else {
          //Create expression db
          loadDb(library.path).then(exp_db => {
            const exp_promises = [];
            expressions.forEach(expression => {
              const exp_promise = new Promise((resolve, reject) => {
                exp_db.insert(expression, (err, newEntry) => {
                  if (err || !newEntry) reject({ status: 500, message: err });
                  else resolve(newEntry);
                });
              });
              exp_promises.push(exp_promise);
            })
            Promise.all(exp_promises).then(() => {
              resolve(newEntry);
            }).catch(e => reject(e));
          }).catch(e => reject(e));
        }
      }
    });
  })
}

const createExpressionInLibrary = (library_id, expression, send_event_to_toolbar = true) => {
  return new Promise((resolve, reject) => {
    const handleError = (status, message) => {
      reject({ status, message });
    }
    const formated_expression = format_expression_object(expression);
    if (formated_expression.name && library_id) {
      formated_expression.creation_date = new Date().getTime();
      formated_expression.last_update = formated_expression.creation_date;
      formated_expression._id = createId(formated_expression.name);
      getExpressionDatabase(library_id).then(db_infos => {
        loadDb(db_infos.path).then(exp_db => {
          exp_db.insert(formated_expression, (err, newEntry) => {
            if (err || !newEntry) handleError(500, err);
            else {
              getAllExpressionsProjection(send_event_to_toolbar);
              resolve(newEntry);
            }
          });
        }).catch(e => handleError(500, e))
      }).catch(e => handleError(e.status, e.message))
    } else {
      handleError(400, "Bad request");
    }
  })
}

const format_expression_object = expression => {
  const new_expression = {};
  const accepted_keys = ["_id", "code", "name", "documentation", "property_types", "tags", "snippet_prefix", "is_snippet", "include_id", "skip_include_cleaner", "is_include", "related_expressions"];
  accepted_keys.forEach(key => {
    if (typeof expression[key] !== "undefined") {
      new_expression[key] = expression[key]
    }
  })
  return new_expression;
}

const checkIfRemoteLibraryIsValid = url => {
  return new Promise((resolve, reject) => {
    request(url, function (error, response, body) {
      if (error || response.statusCode !== 200) {
        reject("We can't connect to remote file");
        if (error) console.error(error);
      }
      else {
        try {
          const content = JSON.parse(body);
          let library_is_empty = true;
          if (content.length > 0) {
            content.forEach(lib => {
              const { _id, name, expressions } = lib;
              if (_id && name && expressions && expressions.length > 0) {
                expressions.forEach(exp => {
                  const { code, _id, name } = exp;
                  if (code && _id && name) library_is_empty = false;
                })
              }
            })
          }
          if (library_is_empty) {
            reject("Remote library is empty");
          } else resolve(content);
        } catch (e) { reject("Remote file is not a valid library") }
      }
    });
  })
}

const registerRemote = (name, url, _id = null, default_content = null) => {
  return new Promise((resolve) => {
    if (!name || !url) {
      resolve({
        status: 400,
        body: { message: "Bad Request" }
      });
    }
    else {
      if (_id === null) _id = createId("remote-" + name);
      const _resolve = (newEntry) => {
        resolve({
          status: 200,
          body: { status: "success", _id: newEntry._id }
        });
      }

      remote_db.findOne({ _id }, (err, doc) => {
        if (doc) _resolve(doc);
        else {
          remote_db.findOne({ url }, (err, doc) => {
            if (doc) _resolve(doc);
            else {
              const local_path = getRelativePathFromDbFolder(path.normalize(db_folder + "/remote/" + _id + ".json"));

              const checkPromise = () => {
                if (default_content !== null) {
                  return new Promise((resolve, reject) => {
                    const content = JSON.stringify(default_content);
                    mkdirp(path.dirname(local_path), (err) => {
                      if(err) reject(err);
                      else {
                        fs.writeFile(local_path, content, 'utf8', (err) => {
                          if (err) reject(err);
                          else resolve(true);
                        });
                      }
                    });
                  })
                } else return checkIfRemoteLibraryIsValid(url);
              }

              checkPromise().then(() => {
                const new_remote = {
                  _id,
                  name,
                  url,
                  local_path,
                  creation_date: new Date().getTime()
                }
                remote_db.insert(new_remote, (err, newEntry) => {
                  if (err) {
                    resolve({
                      status: 500,
                      body: { message: err }
                    });
                  }
                  else _resolve(newEntry);
                });
              }).catch(e => {
                resolve({
                  status: 500,
                  body: { message: e }
                });
              })
            }
          });
        }
      });
    }
  })
}

router.post('/library/toolbar/refresh', (req, res) => {
  refreshToolbars().then(result => {
    const { toolbars } = result;
    res.status(200).send({ status: "success", toolbars })
  }).catch(e => res.status(500).send({ message: e }))
});

router.post('/library/toolbar/get-all', (req, res) => {
  cleanToolbarDatabaseAndUpdateProjections().then(result => {
    const { toolbars, library_projections } = result;
    res.status(200).send({ status: "success", toolbars, library_projections })
  }).catch(e => res.status(500).send({ message: e }))
});

router.post('/library/toolbar/get', (req, res) => {
  const { search } = req.body;
  toolbar_projection_db.findOne(search, (err, doc) => {
    if (err) res.status(500).send({ message: err });
    else if (!doc) res.status(404).send({ message: "item_not_found" });
    else {
      res.status(200).send({ status: "success", item: doc });
    }
  });
});

router.post('/library/toolbar/update', (req, res) => {
  const toolbar_db_bak_path = toolbar_db_path + ".bak";
  const handleError = (e, restore = true) => {
    if (restore) {
      copyFile(toolbar_db_bak_path, toolbar_db_path).catch(e => console.error(e));
    }
    res.status(500).send({ message: e });
  }
  const { toolbars } = req.body;
  if (toolbars) {
    copyFile(toolbar_db_path, toolbar_db_bak_path).then(() => {
      toolbar_db.remove({}, { multi: true }, (err) => {
        if (err) handleError(err);
        else {
          const promises = [];
          toolbars.forEach((toolbar, index) => {
            toolbar.index = index;
            const insertToolbar = new Promise((resolve, reject) => {
              const { items } = toolbar;
              items.forEach(item => {
                const { icon, ffx_path } = item;
                if (icon) {
                  item.icon = path.relative(icon_folder_path, item.icon);
                }
                if (ffx_path) {
                  item.ffx_path = path.relative(ffx_folder_path, item.ffx_path);
                }
              })
              toolbar_db.insert(toolbar, (err) => {
                if (err) reject(err);
                else resolve(true);
              });
            });
            promises.push(insertToolbar);
          });
          Promise.all(promises).then(() => {
            cleanToolbarDatabaseAndUpdateProjections(true).then(result => {
              const { toolbars } = result;
              res.status(200).send({ status: "success", toolbars })
            }).catch(e => handleError(e, true));
          }).catch(e => handleError(e, true));
        }
      });
    }).catch(e => handleError(e, false))

  } else handleError("Bad Request");
});

router.post('/library/get', (req, res) => {
  const { database_id } = req.body;
  if (!database_id) res.status(400).send({ message: "Bad Request" });
  else {
    getExpressionDatabase(database_id).then(db_infos => {
      res.status(200).send({ status: "success", db_infos });
    }).catch(e => res.status(e.status).send({ message: e.message }))
  }
});

router.post('/library/rename', (req, res) => {
  const { _id, rename, is_remote } = req.body;
  if (!_id || !rename) res.status(400).send({ message: "Bad Request" });
  else {
    const target_db = is_remote ? remote_db : db;
    target_db.update({ _id }, { $set: { name: rename } }, { multi: false }, function (err, numReplaced) {
      if (err) res.status(500).send({ message: err });
      else if (numReplaced > 0) res.status(200).send({ status: "success" });
      else res.status(404).send({ message: "library_not_found" });
    });
  }
});

router.post('/library/delete', (req, res) => {
  const { _id, is_remote } = req.body;
  if (!_id) res.status(400).send({ message: "Bad Request" });
  else {
    if (!is_remote) {
      getExpressionDatabase(_id).then(db_infos => {
        db.remove({ _id }, { multi: false }, function (err, numRemoved) {
          if (err) res.status(500).send({ message: err });
          else {
            fs.unlink(db_infos.path, (err) => {
              if (err) res.status(500).send({ message: err });
              else {
                refreshToolbars();
                res.status(200).send({ status: "success" });
              }
            });
          }
        });
      }).catch(e => res.status(e.status).send({ message: e.message }))
    } else {
      remote_db.findOne({ _id }, function (err, doc) {
        if (err) res.status(500).send({ message: err });
        else if (!doc) res.status(404).send({ message: `Remote library ${_id} not found` });
        else {
          let { local_path } = doc;
          local_path = getAbsolutePathFromDbFolder(local_path);
          remote_db.remove({ _id }, { multi: false }, function (err, numRemoved) {
            if (err) res.status(500).send({ message: err });
            else {
              fs.unlink(local_path, (err) => {
                if (err) res.status(500).send({ message: err });
                else {
                  refreshToolbars();
                  res.status(200).send({ status: "success" });
                }
              });
            }
          });
        }
      })
    }
  }
});

router.post('/library/get-all', (req, res) => {
  db.find({}, function (err, docs) {
    if (err) res.status(500).send({ message: err });
    else res.status(200).send({ status: "success", libraries: docs })
  });
});

router.post('/library/get-all-remote', (req, res) => {
  remote_db.find({}, function (err, docs) {
    if (err) res.status(500).send({ message: err });
    else {
      const remote_promises = [];
      docs.forEach(remote => {
        const new_promise = new Promise((resolve, reject) => {
          const { url, name, _id } = remote;
          let { local_path } = remote;
          // Update old absolute paths
          if(path.isAbsolute(local_path)) {
            remote_db.update({ _id: remote._id }, { $set: { local_path: getRelativePathFromDbFolder(local_path) } }, { multi: false }, (err) => {
              if(err) console.error(err);
            });
          } else {
            local_path = getAbsolutePathFromDbFolder(local_path);
          }
          const remote_item = { _id, url, name, is_online: true };
          const getLibraryContent = new Promise((resolve, reject) => {
            request(url, function (error, response, body) {
              let content = null;
              if (error) console.error(error);
              if (!error && response.statusCode === 200) {
                try {
                  content = JSON.parse(body);
                  content.forEach(library => {
                    library._id = "remote-" + library._id;
                    library.expressions.forEach(exp => {
                      exp._id = "remote-" + exp._id;
                    })
                  });
                } catch (e) { reject(e) }
                if (content !== null) {
                  mkdirp(path.dirname(local_path), (err) => {
                    fs.writeFile(local_path, JSON.stringify(content), 'utf8', (err) => {
                      if (err) console.error(err);
                    });
                  });
                  resolve(content);
                }
              }
              if (content === null) {
                remote_item.is_online = false;
                getRemoteDatabaseContent(local_path).then(content => {
                  resolve(content);
                }).catch(e => reject(e));
              }
            });
          })
          getLibraryContent.then(content => {

            const sub_libraries = [];

            remote_item.libraries = content.map(library => {

              if (library.expressions && library.name && library._id) {

                sub_libraries.push(library._id);

                const library_item = {
                  name: library.name,
                  _id: library._id,
                  type: library.type || "expression"
                }

                library_item.expressions = library.expressions.map(exp => {
                  if (exp._id && exp.name && exp.code) {
                    exp = format_expression_object(exp);
                    delete exp.snippet_prefix;
                    delete exp.is_snippet;
                    delete exp.include_id;
                    delete exp.is_include;
                    return exp;
                  } else return null;
                })

                library_item.expressions = library_item.expressions.filter(exp => exp !== null);
                if (library_item.expressions.length > 0) return library_item;
                else return null;

              } else return null;

            })

            remote_db.update({ _id: remote._id }, { $set: { sub_libraries } }, {}, (err) => {
              if (err) console.error(err);
            });

            remote_item.libraries = remote_item.libraries.filter(lib => lib !== null);

            if (remote_item.libraries.length > 0) resolve(remote_item);
            else resolve(null);

          }).catch(e => {
            resolve(null);
            console.error(e)
          });
        });
        remote_promises.push(new_promise);
      })

      Promise.all(remote_promises).then(result => {
        const remotes = result.filter(remote => remote !== null);
        res.status(200).send({ status: "success", remotes });
      })

    }
  });
});

function getOrCreateLibrary(name, _id = null, type = null) {
  return new Promise((resolve, reject) => {
    if (_id === null) _id = createId(name);
    getExpressionDatabase(_id, type).then((lib) => resolve(lib)).catch(() => {
      const new_db = {
        _id,
        name,
        type: type || 'expression',
        creation_date: new Date().getTime()
      }
      createLibrary(new_db).then(lib => resolve(lib)).catch(e => reject(e));
    })
  })
}

router.post('/library/create', (req, res) => {
  const { name, type } = req.body;
  if (!name) res.send(400).send({ message: "Bad Request" });
  else {
    getOrCreateLibrary(name, null, type).then(library => {
      res.status(200).send({ status: "success", library });
    }).catch(e => {
      res.status(e.status).send({ message: e.message });
    });
  }
});

router.post('/library/register-remote', (req, res) => {
  const { name, url } = req.body;
  registerRemote(name, url).then(result => {
    res.status(result.status).send(result.body);
  })
});

router.post('/library/expression/get', (req, res) => {
  const badRequest = () => res.status(400).send({ message: "Bad Request" });
  const { database_id, expression, type, is_remote } = req.body;
  if (!database_id || !expression) badRequest();
  else {
    const { _id } = expression;
    if (is_remote && !_id) badRequest();
    else {
      const promise = is_remote ? getExpressionInRemoteDatabase(database_id, _id, type) : getExpressionInDatabase(database_id, expression, type);
      promise.then(expression => {
        res.status(200).send({ status: "success", expression });
      }).catch(e => res.status(e.status).send({ message: e.message }))
    }
  }
})

router.post('/library/expression/delete', (req, res) => {
  const { database_id, expression_id } = req.body;
  if (!database_id || !expression_id) res.status(400).send({ message: "Bad Request" });
  else {
    getExpressionDatabase(database_id).then(db_infos => {
      loadDb(db_infos.path).then(exp_db => {
        exp_db.remove({ _id: expression_id }, {}, (err, numRemoved) => {
          if (err) res.status(500).send({ message: err });
          else if (numRemoved >= 1) {
            refreshToolbars();
            res.status(200).send({ status: "success" });
          }
          else res.status(404).send({ message: `${expression_id} not found in library ${database_id}` });
        });
      }).catch(e => res.status(500).send({ message: e }))
    }).catch(e => res.status(e.status).send({ message: e.message }))
  }
});

router.post('/library/expression/get-all', (req, res) => {
  const { database_id } = req.body;
  if (!database_id) res.status(400).send({ message: "Bad Request" });
  else {
    getExpressionsInDatabase(database_id).then(expressions => {
      expressions.forEach(exp => {
        delete exp.code
      });
      res.status(200).send({ status: "success", expressions });
    }).catch(e => res.status(e.status).send({ message: e.message }))
  }
})

router.post('/library/expression/create', (req, res) => {
  const {
    expression, database_id
  } = req.body;
  createExpressionInLibrary(database_id, expression).then(expression => {
    res.status(200).send({ status: "success", expression });
  }).catch(e => {
    if (_.isObject(e) && e.status) res.status(e.status).send({ message: e.message });
    else res.status(500).send({ message: e })
  })
});

router.post('/library/expression/duplicate', (req, res) => {
  const {
    source, destination
  } = req.body;
  const { library_id, is_remote, type, item_id } = source;
  const getPromise = is_remote ? getExpressionInRemoteDatabase(library_id, item_id, type) : getExpressionInDatabase(library_id, { _id: item_id }, type);
  getPromise.then(expression => {
    expression.name = destination.name;
    return createExpressionInLibrary(destination.library_id, expression).then(new_expression => {
      res.status(200).send({ status: "success", expression: new_expression });
    })
  }).catch(e => {
    if (_.isObject(e) && e.status) res.status(e.status).send({ message: e.message });
    else res.status(500).send({ message: e })
  })
});

router.post('/library/expression/update', (req, res) => {
  const {
    expression, database_id
  } = req.body;
  const formated_expression = format_expression_object(expression);
  if (formated_expression._id && database_id) {
    formated_expression.last_update = new Date().getTime();
    getExpressionDatabase(database_id).then(db_infos => {
      loadDb(db_infos.path).then(exp_db => {
        exp_db.update({ _id: formated_expression._id }, formated_expression, {}, (err, numReplaced) => {
          if (err) res.status(500).send({ message: err });
          else if (numReplaced >= 1) {
            refreshToolbars();
            res.status(200).send({ status: "success", expression: formated_expression });
          }
          else res.status(404).send({ message: `${formated_expression._id} not found in library ${database_id}` });
        });
      }).catch(e => res.status(500).send({ message: e }))
    }).catch(e => res.status(e.status).send({ message: e.message }))
  } else {
    res.status(400).send({ message: "Bad request" });
  }
});

router.post('/library/snippet/get-all', (req, res) => {
  const { types } = req.body;
  const get_snippets = types.indexOf("snippet") !== -1;
  const get_includes = types.indexOf("include") !== -1;
  const snippets = [];

  const addExpressionToSnippetsIfNeeded = (exp) => {
    if (!_.find(snippets, { _id: exp.item_id }) && ((get_snippets === true && exp.is_snippet === true && typeof exp.snippet_prefix === "string" && exp.snippet_prefix !== "") || (get_includes === true && exp.is_include === true && typeof exp.include_id === "string" && exp.include_id !== ""))) {
      snippets.push({
        _id: exp.item_id,
        code: exp.code,
        prefix: exp.snippet_prefix,
        include_id: exp.include_id,
        category: exp.library_name,
        documentation: exp.documentation,
        name: exp.item_name,
        tags: exp.tags,
        type: exp.type,
        skip_include_cleaner: exp.skip_include_cleaner,
        is_snippet: exp.is_snippet === true,
        is_include: exp.is_include === true,
      })
    }
  }

  getAllExpressionsProjection().then(projection => {
    projection.forEach(exp => addExpressionToSnippetsIfNeeded(exp));
    res.status(200).send({ status: "success", snippets });
  }).catch(e => {
    console.error(e);
    res.status(e.status).send({ message: e.message })
  })
});

router.post('/library/tags/get-all', (req, res) => {
  db.find({}, function (err, docs) {
    if (err) res.status(500).send({ message: err });
    else {
      const tag_promises = [];
      const tags = {
        expression: [],
        script: []
      };
      docs.forEach(library => {
        const tag_promise = new Promise((resolve, reject) => {
          getExpressionsInDatabase(library._id).then(expressions => {
            expressions.forEach(exp => {
              if (exp.tags && exp.tags.length) {
                exp.tags.forEach(tag => tags[library.type].push(tag));
              }
            })
            resolve(true);
          }).catch(e => resolve(false))
        })
        tag_promises.push(tag_promise);
      });
      Promise.all(tag_promises).then(() => {
        const formated_tags = {
          expression: [],
          script: []
        };
        for (const type in tags) {
          const tags_count = {};
          tags[type].forEach(tag => {
            if (tags_count[tag]) tags_count[tag]++;
            else tags_count[tag] = 1;
          })
          for (const key in tags_count) {
            formated_tags[type].push({
              label: key,
              quantity: tags_count[key]
            })
          }
        }
        res.status(200).send({ status: "success", tags: formated_tags });
      })
    }
  });
});

router.post('/library/export', (req, res) => {
  const { output, libraries } = req.body;
  if (libraries && output) {
    const db_exports = [];
    const db_promises = [];
    libraries.forEach(library_id => {
      const get_db_promise = new Promise((resolve, reject) => {
        getExpressionDatabase(library_id).then(db_infos => {
          getExpressionsInDatabase(library_id).then(expressions => {
            delete db_infos.path;
            db_infos.expressions = expressions;
            db_exports.push(db_infos);
            resolve(db_infos);
          }).catch(e => reject(e.message));
        }).catch(e => reject(e));
      });
      db_promises.push(get_db_promise);
    })
    Promise.all(db_promises).then(() => {
      const output_path = path.normalize(output);
      fs.writeFile(output_path, JSON.stringify(db_exports), 'utf8', (err) => {
        if (err) res.status(500).send({ message: e })
        else {
          res.status(200).send({
            status: "success",
            output: output_path
          });
        }
      });
    }).catch(e => {
      res.status(500).send({ message: e })
    })
  } else res.status(400).send({ message: "Bad request" });
})

router.post('/library/import', (req, res) => {
  const { data, force_erase } = req.body;
  if (data) {
    update_libraries_promises = [];
    data.forEach(library => {
      const new_library_promise = new Promise((resolve, reject) => {
        getExpressionsInDatabase(library._id).then(docs => {
          loadDbWithId(library._id).then(exp_db => {
            const { expressions } = library;
            const update_expressions_promises = [];
            expressions.forEach(expression => {
              let update_expression = true;
              if (!force_erase) {
                const expression_in_local_db = _.find(docs, { _id: expression._id });
                if (expression_in_local_db) {
                  //If expression already exists and is newer, don't update it
                  if (expression_in_local_db.last_update >= expression.last_update) update_expression = false;
                }
              }
              if (update_expression === true) {
                const new_expression_update = new Promise((resolve, reject) => {
                  exp_db.update({ _id: expression._id }, expression, { upsert: true }, (err, numReplaced) => {
                    if (err) reject(err);
                    resolve(numReplaced);
                  });
                });
                update_expressions_promises.push(new_expression_update);
              }
            })
            Promise.all(update_expressions_promises).then(() => {
              resolve(true);
            }).catch(e => reject(e));
          }).catch(e => reject(e));
        }).catch(e => {
          if (e.status === 404) {
            //Library doesn't exist, so create it
            const new_library = {
              _id: library._id,
              name: library.name,
              type: library.type,
              creation_date: library.date
            }
            createLibrary(new_library, library.expressions).then(() => {
              resolve(true);
            }).catch(e => reject(e));
          } else reject(e);
        });
      });
      update_libraries_promises.push(new_library_promise);
    })
    Promise.all(update_libraries_promises).then(() => {
      res.status(200).send({ status: "success" });
    }).catch(e => {
      console.error(e);
      res.status(e.status || 500).send({ message: e.message || "Server error" });
    })
  } else res.status(400).send({ message: "Bad request" });
})

router.post('/library/activate-default-remote-libraries', (req, res) => {
  const activation_file_path = serverPaths.config + "/activated-remote-libraries.json";
  const getConfig = new Promise((resolve, reject) => {
    if (fs.existsSync(activation_file_path)) {
      fs.readFile(activation_file_path, (err, data) => {
        if (err) {
          console.error(err);
          reject(err);
        }
        else resolve(JSON.parse(data));
      });
    } else {
      fs.writeFile(activation_file_path, JSON.stringify([]), 'utf8', (err) => {
        if (err) {
          console.error(err);
          reject(err);
        }
        else resolve([]);
      })
    }
  });
  getConfig.then(config => {
    const register_promises = [];
    const remote_libraries = [
      {
        id: "demo",
        name: "MoCode Library",
        url: "https://raw.githubusercontent.com/devdanim/dnm-mocode-libraries/master/dnm-mocode-library-demo.json"
      }
    ];
    remote_libraries.forEach(remote => {
      if (config.indexOf(remote.id) === -1) {
        const new_promise = new Promise(resolve => {
          registerRemote(remote.name, remote.url).then(result => {
            if (result.status === 200) {
              resolve(remote.id)
            } else resolve(null);
          })
        });
        register_promises.push(new_promise);
      }
    });
    Promise.all(register_promises).then(results => {
      results.forEach(id => {
        if (id !== null) config.push(id);
      })
      fs.writeFile(activation_file_path, JSON.stringify(config), 'utf8', (err) => {
        res.status(200).send({ status: "success" })
      })
    }).catch(e => {
      res.status(500).send({ message: e });
    })
  }).catch(e => {
    res.status(500).send({ message: e });
  })
});

function importToolbarFromZip(_ids, zip_path, erase_toolbars = false, erase_items = false) {
  return new Promise((resolve, reject) => {
    let warnings = [];
    const temp_folder = path.normalize(serverPaths.temp + "/archive_" + new Date().getTime());
    const zip = new AdmZip(path.normalize(zip_path));
    zip.extractAllToAsync(temp_folder, true, (err) => {
      if (err) reject(err);
      else {
        fs.readFile(path.normalize(temp_folder + "/manifest.json"), "utf-8", (err, data) => {
          if (err) reject(err);
          else {
            const manifest = JSON.parse(data);
            const { toolbars, dependencies } = manifest;
            const toolbars_to_install = [];
            toolbars.forEach(toolbar => {
              if (_ids.indexOf(toolbar._id) !== -1) toolbars_to_install.push(toolbar);
            })

            const { ffx, icons, remote_libraries } = dependencies;
            const preinstall_promises = [];
            const createPreinstallPromise = (_promise) => {
              const promise = new Promise((resolve) => {
                _promise().then(resolve).catch(e => {
                  warnings.push(e.toString);
                  resolve(false);
                })
              });
              preinstall_promises.push(promise);
            }
            if (ffx) {
              ffx.forEach(file => {
                createPreinstallPromise(() => copyFile(temp_folder + "/ffx/" + file, ffx_folder_path + "/" + file));
              })
            }
            if (icons) {
              icons.forEach(file => {
                createPreinstallPromise(() => copyFile(temp_folder + "/icons/" + file, icon_folder_path + "/" + file));
              })
            }
            if (remote_libraries) {
              const remote_lib_to_install = [];
              const sub_libraries = [];
              remote_libraries.forEach((remote) => {
                remote.content.forEach(lib => sub_libraries.push({ _id: remote._id, sub_library_id: lib._id }));
              });
              toolbars_to_install.forEach((toolbar) => {
                toolbar.items.forEach((item) => {
                  const { is_remote, library_id } = item;
                  if (is_remote) {
                    const remote = _.find(sub_libraries, { sub_library_id: library_id });
                    if (remote) {
                      if (remote_lib_to_install.indexOf(remote._id) === -1) {
                        remote_lib_to_install.push(remote._id);
                      }
                    }
                  }
                });
              });
              remote_lib_to_install.forEach(remote_id => {
                const remote = _.find(remote_libraries, { _id: remote_id });
                const { url, name, _id, content } = remote;
                createPreinstallPromise(() => registerRemote(name, url, _id, content));
              })
            }
            Promise.all(preinstall_promises).then(install_results => {
              toolbar_db.find({}, (err, toolbar_docs) => {
                if (err) reject(err);
                else {
                  const items_to_install = [];
                  toolbars_to_install.forEach(toolbar => {
                    let install_toolbar = true;
                    const doc_index = _.findIndex(toolbar_docs, { _id: toolbar._id });
                    if (doc_index !== -1) {
                      if (erase_toolbars === true) toolbar_docs[doc_index] = toolbar;
                      else install_toolbar = false;
                    } else toolbar_docs.push(toolbar);
                    if (install_toolbar === true) {
                      toolbar.items.forEach(item => {
                        const { behaviour, is_remote } = item;
                        if (behaviour === "library" && !is_remote) {
                          const { library_id, item_id, type, library_name } = item;
                          const new_item = { library_id, item_id, type, library_name };
                          if (!_.find(items_to_install, new_item)) {
                            items_to_install.push(new_item);
                          }
                        }
                      })
                    }
                  });

                  //items_to_install
                  const install_items_promises = [];
                  items_to_install.forEach(item_infos => {
                    const { library_id, item_id, type, library_name } = item_infos;
                    const item = _.find(dependencies.items, { library_id, item_id, type });
                    if (item) {
                      const newInstall = () => {
                        return new Promise((resolve) => {
                          getOrCreateLibrary(library_name, library_id, type).then(lib => {
                            loadDb(lib.path).then(exp_db => {
                              exp_db.findOne({ _id: item_id }, (err, doc) => {
                                if (err) {
                                  warnings.push(err);
                                  resolve(false);
                                } else {
                                  if (!doc || erase_items === true) {
                                    const insert = () => {
                                      exp_db.insert(item.document, (err, newEntry) => {
                                        if (err || !newEntry) {
                                          warnings.push(err || `Can't create item ${item_id}`);
                                          resolve(false);
                                        }
                                        else resolve(true);
                                      })
                                    }
                                    if (doc) {
                                      exp_db.remove({ _id: item_id }, {}, (err) => {
                                        if (err) {
                                          warnings.push(err);
                                          resolve(false);
                                        } else insert();
                                      });
                                    } else insert();
                                  } else resolve(false);
                                }
                              });
                            }).catch(e => {
                              warnings.push(e);
                              resolve(false);
                            })
                          }).catch(e => {
                            warnings.push(e.message);
                            resolve(false);
                          });
                        })
                      }
                      install_items_promises.push(newInstall);
                    }
                  });

                  Promise.chain(install_items_promises).then(() => {
                    toolbar_db.remove({}, { multi: true }, (err) => {
                      if (err) reject(err);
                      else {
                        const create_toolbars_promise = [];
                        toolbar_docs.forEach(doc => {
                          const toolbar_promise = () => new Promise((resolve) => {
                            toolbar_db.insert(doc, (err) => {
                              if (err) warnings.push(err);
                              resolve(err ? true : false);
                            });
                          });
                          create_toolbars_promise.push(toolbar_promise);
                        });
                        Promise.chain(create_toolbars_promise).then(() => {
                          cleanToolbarDatabaseAndUpdateProjections(true);
                          resolve(warnings);
                        }).catch(e => reject(e));
                      }
                    });
                  }).catch(e => {
                    reject(e);
                  })
                }
              })
            }).catch(e => reject(e));
          }
        })
      }
    })
  });
}

function findRequiresInCode(code) {
  const regex = /(\n|)(require\(("|')((?!\)).+?)("|')\)(\s*|);)/g;
  const includes = [];
  const matches = [];
  let match;
  while (match = regex.exec(code)) {
    const { index } = match;
    if (match[1] === '\n' || index === 0) matches.push(match);
  }
  for (let i = 0; i < matches.length; i++) {
    const new_match = matches[i];
    const include_id = new_match[4];
    if (include_id && includes.indexOf(include_id) === -1) includes.push(include_id);
  }
  return includes;
}

function getRequiredIncludesFromCodes(codes) {
  return new Promise((resolve, reject) => {
    getAllLocalExpressions().then(items => {
      const _getRequiredIncludesFromCodes = (codes, all_includes = []) => {
        const new_includes = [];
        codes.forEach(code => {
          const includes = findRequiresInCode(code);
          includes.forEach(include_id => {
            if (all_includes.indexOf(include_id) === -1) {
              all_includes.push(include_id);
              new_includes.push(include_id);
            }
          });
        });
        if (new_includes.length > 0) {
          const _codes = [];
          new_includes.forEach(include_id => {
            const item = _.find(items, { include_id });
            if (item) _codes.push(item.code);
          })
          if (_codes.length > 0) all_includes = _getRequiredIncludesFromCodes(_codes, all_includes);
        }
        return all_includes;
      }
      const all_includes = _getRequiredIncludesFromCodes(codes);
      const all_items = [];
      const promises = [];
      all_includes.forEach(include_id => {
        const new_promise = () => new Promise((resolve, reject) => {
          const item = _.find(items, { include_id });
          if (item) {
            const { item_id, type, library_id } = item;
            getExpressionInDatabase(library_id, { _id: item_id }, type).then(document => {
              all_items.push({
                item_id,
                type,
                library_id,
                document
              });
              resolve(item);
            }).catch(() => resolve(null));
          } else resolve(null);
        });
        promises.push(new_promise);
      })
      Promise.chain(promises).then(() => {
        resolve(all_items);
      }).catch(e => reject(e));
    })
  })
}

function createToolbarExportObject(_ids, destination) {
  destination = path.normalize(destination);
  const createExportArchive = (export_object) => {
    const temp_folder = path.normalize(serverPaths.temp + "/archive_" + new Date().getTime());
    return new Promise((resolve, reject) => {
      mkdirp(path.normalize(temp_folder + "/ffx"), (err) => {
        if (err) reject(err);
        else {
          mkdirp(path.normalize(temp_folder + "/icons"), (err) => {
            if (err) reject(err);
            else {
              const copy_promises = [];
              const { ffx, icons } = export_object.dependencies;
              ffx.forEach(ffx_file => {
                copy_promises.push(
                  new Promise((resolve) => {
                    copyFile(ffx_folder_path + "/" + ffx_file, temp_folder + "/ffx/" + ffx_file).then(res => resolve(res)).catch(e => {
                      console.error(e);
                      resolve(null);
                    })
                  })
                );
              });
              icons.forEach(icon_file => {
                copy_promises.push(
                  new Promise((resolve) => {
                    copyFile(icon_folder_path + "/" + icon_file, temp_folder + "/icons/" + icon_file).then(res => {
                      resolve('icons');
                    }).catch(e => {
                      console.error(e);
                      resolve(null);
                    })
                  })
                );
              });
              copy_promises.push(
                new Promise((resolve, reject) => {
                  const manifest = path.normalize(temp_folder + "/manifest.json");
                  fs.writeFile(manifest, JSON.stringify(export_object), 'utf8', (err) => {
                    if (err) reject(err);
                    else resolve('manifest.json');
                  });
                })
              );
              console.log(copy_promises);
              Promise.all(copy_promises).then((result) => {
                const zip = new AdmZip();
                zip.addLocalFolder(temp_folder);
                zip.writeZip(destination, (err) => {
                  if (err) reject(err);
                  else resolve(destination);
                });
              }).catch(e => reject(e));
            }
          })
        }
      })
    }).finally(() => {
      rimraf(temp_folder, (err) => {
        if (err) console.error(err);
      });
    })
  }
  return new Promise((resolve, reject) => {
    const export_object = {
      toolbars: [],
      dependencies: {
        ffx: [],
        icons: [],
        remote_libraries: [],
        items: [],
        includes: []
      }
    };
    getRemoteSubLibrariesProjection().then(remote_projections => {
      const promises = [];
      _ids.forEach(_id => {
        const toolbar_promise = () => new Promise((resolve, reject) => {
          toolbar_db.findOne({ _id }, (err, doc) => {
            if (err) reject(err);
            else if (!doc) reject(`Toolbar ${_id} not found.`);
            else {
              delete doc.index;
              const { items } = doc;
              const items_promises = [];
              items.forEach(item => {
                const new_promise = () => new Promise((resolve) => {
                  let kept = true;
                  const { behaviour, icon } = item;
                  if (icon) {
                    const absolute_icon_path = path.normalize(icon_folder_path + "/" + icon);
                    if (fs.existsSync(absolute_icon_path)) export_object.dependencies.icons.push(icon);
                  }
                  if (behaviour === "library") {
                    const { is_remote, type, item_id, library_id } = item;
                    const new_document = { is_remote, type, item_id, library_id };
                    if (!_.find(export_object.dependencies.items, new_document)) {
                      if (is_remote) {
                        //const document = await getExpressionInRemoteDatabase(library_id, item_id, type, remote_projections);
                        let remote_in_projections = null;
                        for (let i = 0; i < remote_projections.length; i++) {
                          const { sub_libraries } = remote_projections[i];
                          let { local_path } = remote_projections[i];
                          local_path = getAbsolutePathFromDbFolder(local_path);
                          if (sub_libraries.indexOf(library_id) !== -1) {
                            if (fs.existsSync(local_path)) remote_in_projections = remote_projections[i];
                            break;
                          }
                        }
                        if (remote_in_projections) {
                          const content = fs.readFileSync(remote_in_projections.local_path, "utf-8");
                          if (content) {
                            export_object.dependencies.remote_libraries.push({
                              _id: remote_in_projections._id,
                              url: remote_in_projections.url,
                              name: remote_in_projections.name,
                              content: JSON.parse(content)
                            })
                          } else kept = false;
                        } else kept = false;
                        resolve(kept ? item : null);
                      } else {
                        getExpressionInDatabase(library_id, { _id: item_id }, type).then(document => {
                          export_object.dependencies.items.push({
                            ...new_document,
                            document
                          });
                          resolve(item);
                        }).catch(() => resolve(null));
                      }
                    } else resolve(null);
                  } else {
                    if (behaviour === "ffx") {
                      const { ffx_path } = item;
                      const absolute_ffx_path = path.normalize(ffx_folder_path + "/" + ffx_path);
                      if (!fs.existsSync(absolute_ffx_path)) kept = false;
                      else export_object.dependencies.ffx.push(ffx_path);
                    }
                    resolve(kept ? item : null);
                  }
                });
                items_promises.push(new_promise);
              });
              Promise.chain(items_promises).then(_items => {
                const kept_items = [];
                _items.forEach(item => {
                  if (item !== null) kept_items.push(item);
                })
                doc.items = kept_items;
                resolve(doc);
              }).catch(e => reject(e));
            }
          });
        });
        promises.push(toolbar_promise);
      });
      Promise.chain(promises).then((toolbars) => {
        export_object.toolbars = toolbars;
        getRequiredIncludesFromCodes(export_object.dependencies.items.map(item => (item.document.code))).then((includes) => {
          export_object.dependencies.includes = includes;
          createExportArchive(export_object).then((archive) => {
            resolve(archive);
          }).catch(e => reject(e));
        }).catch(e => reject(e));
      }).catch(e => reject(e));
    }).catch(e => reject(e));
  })
}

router.post('/library/export/toolbar', (req, res) => {
  const { toolbar_ids, output } = req.body;
  createToolbarExportObject(toolbar_ids, output).then(destination => {
    res.status(200).send({ status: "success", destination });
  }).catch(e => {
    res.status(500).send({ status: "error", error: e.toString() });
  })
});

router.post('/library/import/toolbar/open', (req, res) => {
  const { input } = req.body;
  const handleError = (err) => {
    res.status(500).send({ status: "error", message: err.toString() });
  }
  if (fs.existsSync(input)) {
    var zip = new AdmZip(input);
    const manifest_file = zip.readAsText("manifest.json");
    if (!manifest_file) handleError(`Export file is corrupted: Can't find manifest in ${input}`);
    else {
      try {
        const manifest = JSON.parse(manifest_file);
        res.status(200).send({ status: "success", manifest });
      } catch (e) { handleError(`Export file is corrupted: ${e.toString}`) }
    }
  } else handleError(`Export file ${input} doesn't exist.`)
})

router.post('/library/import/toolbar/save', (req, res) => {
  const { toolbar_ids, zip_path, erase_toolbars, erase_items } = req.body;
  importToolbarFromZip(toolbar_ids, zip_path, erase_toolbars, erase_items).then((warnings) => {
    res.status(200).send({ status: "success", warnings });
  }).catch(e => {
    res.status(500).send({ status: "error", error: e.toString() });
  })
});

module.exports = router;
