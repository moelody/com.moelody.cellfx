const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const mkdirp = require('mkdirp');
const rimraf = require('rimraf');
const serverPaths = require('./lib/server-paths');
const AdmZip = require('adm-zip');

const autoBackup = () => {
  const backup_dir = serverPaths.backup + "/db";
  const backup_zip = path.normalize(`${backup_dir}/database_${new Date().getTime()}.zip`);
  fs.readdir(backup_dir, (err, files) => {
    if (err) console.error(err);
    else {
      let create_backup = true;
      let backup_to_delete = null;
      if (files.length > 0) {
        const items = [];
        files.forEach((file) => {
          const stats = fs.statSync(backup_dir + "/" + file);
          if (stats.isFile()) {
            const { birthtime } = stats;
            items.push({ "file": file, "timestamp": birthtime.getTime(), "date": birthtime });
          }
        });
        items.sort(function (a, b) {
          return b.timestamp - a.timestamp;
        })
        const newest = items[0];
        const oldest = items[items.length - 1];
        const datesAreOnSameDay = (first, second) => (
          first.getFullYear() === second.getFullYear() &&
          first.getMonth() === second.getMonth() &&
          first.getDate() === second.getDate()
        )
        if (datesAreOnSameDay(newest.date, new Date())) create_backup = false;
        else {
          if (files.length >= 10) backup_to_delete = backup_dir + "/" + oldest.file;
        }
      }
      if (create_backup) {
        const zip = new AdmZip();
        zip.addLocalFolder(serverPaths.database);
        zip.writeZip(backup_zip, (err) => {
          if (err) console.error(err);
        });
      }
      if (backup_to_delete !== null) {
        fs.unlink(backup_to_delete, (err) => {
          if (err) console.error(err)
        });
      }
    }
  });

}

mkdirp(serverPaths.temp, (err) => {
  if (err) console.error(err);
  mkdirp(serverPaths.config, (error) => {
    if (error) console.error(error);
    mkdirp(serverPaths.backup + "/db", (error) => {
      if (error) console.error(error);
      mkdirp(serverPaths.backup + "/code", (error) => {
        if (error) console.error(error);
        rimraf(serverPaths.temp + "/**/*", (err) => {
          if (err) console.error(err);
        });

        autoBackup();

        router.use(require('./router/library'));
        router.use(require('./router/editor'));
        router.use(require('./router/settings'));
      });
    });
  });
});

module.exports = router;
