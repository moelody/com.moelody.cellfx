const router = require('express').Router();
const semicolonize = require('semicolonize');
const UglifyJS = require("uglify-js");
const serverPaths = require('../lib/server-paths');
const fs = require("fs");

router.post('/editor/fix-semicolons', (req, res) => {
    let { code } = req.body;
    const ignore = () => {
        res.status(500).send({ status: "warning" });
    }
    if (code) {
        try {
            code = semicolonize(code);
            if (code) res.status(200).send({ status: "success", code });
            else ignore();
        } catch (e) {
            res.status(500).send({ status: "error", error: e });
        }
    } else ignore();
});

router.post('/editor/autosave', (req, res) => {
    const handleError = (e = null) => {
        res.status(500).send({ status: "error", error: e ? e.toString : null });
    }
    const { code, hash } = req.body;
    if (code && hash) {
        const backup_dir = serverPaths.backup + "/code";
        fs.readdir(backup_dir, (err, files) => {
            if (err) handleError(err);
            else {
                if (files.length >= 10) {
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
                    const oldest = items[items.length - 1];
                    fs.unlink(backup_dir + "/" + oldest.file, (err) => {
                        if (err) console.error(err);
                    });
                }
                const file_path = backup_dir + "/" + hash + ".txt";
                fs.writeFile(file_path, code, 'utf8', (err) => {
                    if (err) handleError(err);
                    else res.status(200).send({ status: "success", file: file_path });
                });
            }
        });
    } else handleError();
});

router.post('/editor/minify', (req, res) => {
    let { code, deep_obfuscate } = req.body;
    const success = code => {
        res.status(200).send({ status: "success", code });
    }
    if (!code) success("");
    else {
        const options = {
            mangle: {
                reserved: ["dnm"],
                toplevel: true,
            },
            compress: {
                conditionals: false,
                expression: true,
                keep_infinity: true,
                side_effects: false,
            }
        };
        const minify = UglifyJS.minify(code, options);
        if (minify.error) res.status(500).send({ status: "error", error: minify.error })
        else {
            success(minify.code);
            /*
            if(deep_obfuscate === true) {
                try {
                    const obfuscationResult = JavaScriptObfuscator.obfuscate(
                        minify.code,
                        {
                            compact: true,
                            deadCodeInjection: true,
                            stringArray: true,
                            transformObjectKeys: true,
                            renameGlobals: true,
                            unicodeEscapeSequence: true,
                        }
                    );
                    const obfuscated_code = obfuscationResult.getObfuscatedCode();
                    success(obfuscated_code);
                } catch(e) {
                    res.status(500).send({ status: "error", error: e })
                }
            } else success(minify.code);
            */
        }
    }
})

module.exports = router;
