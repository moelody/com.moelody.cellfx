const router = require("express").Router();
const fs = require("fs");
const path = require("path");
const serverPaths = require("../lib/server-paths");
const settings_path = path.normalize(
  serverPaths.extensionData + "/config/settings.json"
);

const initializeSettings = () => {
  return new Promise((resolve, reject) => {
    fs.readFile(
      path.resolve(__dirname, "../assets/default-settings.json"),
      "utf-8",
      (err, data) => {
        if (err) reject(err);
        else {
          const settings = JSON.parse(data);
          fs.writeFile(settings_path, data, "utf8", err => {
            if (err) console.error(err);
          });
          resolve(settings);
        }
      }
    );
  });
};

const getSettings = () => {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(settings_path)) {
      fs.readFile(settings_path, "utf-8", (err, data) => {
        if (err) reject(err);
        else {
          try {
            const settings = JSON.parse(data);
            resolve(settings);
          } catch (e) {
            reject(e);
          }
        }
      });
    } else reject("Settings file doesn't exist.");
  });
};

const updateSettings = settings => {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(settings_path)) {
      fs.writeFile(settings_path, JSON.stringify(settings), "utf8", err => {
        if (err) reject(err);
        else resolve(true);
      });
    } else reject("Settings file doesn't exist.");
  });
};

router.post("/settings/get", (req, res) => {
  const handleSuccess = settings => {
    res.status(200).send({ 
      status: "success", 
      settings, 
      paths: {
        "extensionData": path.normalize(serverPaths.extensionData),
        "appData": path.normalize(serverPaths.appData),
      } 
    });
  };
  getSettings()
    .then(settings => {
      handleSuccess(settings);
    })
    .catch(e => {
      console.error(e);
      initializeSettings()
        .then(settings => {
          handleSuccess(settings);
        })
        .catch(err => {
          console.error(err);
          res.status(500).send({ status: "error", error: err });
        });
    });
});

router.post("/settings/update", (req, res) => {
  const { settings } = req.body;
  updateSettings(settings)
    .then(() => {
      res.status(200).send({ status: "success", settings });
    })
    .catch(e => {
      res.status(500).send({ status: "error", error: e });
    });
});

module.exports = router;
