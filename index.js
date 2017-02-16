"use strict";
var t0 = Date.now();
if (process.env.NODE_ENV === "dev") {
    // Load local env variables
    require("./env");
}

const express = require("express"),
    bodyParser = require('body-parser'),
    xhub = require('express-x-hub'),
    Controller = require("./lib/controller");

function logArgs() {
    var args = arguments;
    process.nextTick(function() {
        console.log.apply(console, args);
    });
}

const controller = new Controller();

var app = express();
app.use(xhub({ algorithm: 'sha1', secret: process.env.GITHUB_SECRET }));

app.post('/github-hook', function (req, res, next) {
    if (process.env.NODE_ENV != 'production' || req.isXHubValid()) {
        res.send(new Date().toISOString());
        var payload = req.body;
        if (payload.pull_request) {
            logArgs(`${ payload.pull_request.base.repo.full_name }#${ payload.number }: ${ payload.action }`);
            switch(payload.action) {
                case "opened":
                case "edited":
                case "reopened":
                case "synchronize":
                    controller.handlePullRequest(payload).then(logArgs, logArgs);
            }
        } else {
            logArgs("Unknown request", JSON.stringify(payload, null, 4));
        }
    } else {
        logArgs("Unverified request", req);
    }
    next();
});

app.post('/validate-config', bodyParser.urlencoded({ extended: false }), function (req, res, next) {
    controller.getUrl(req.body).then(url => res.redirect(url), err => res.status(400).send(err)).then(next, next);
});

var port = process.env.PORT || 5000;
app.listen(port, function() {
    console.log("Express server listening on port %d in %s mode", port, app.settings.env);
    console.log("App started in", (Date.now() - t0) + "ms.");
});
