'use strict';

module.exports = {
    routes: [
        {
            method: "POST",
            path: "/games/populate",
            handler: "customgame.populate",
            config: {
                policies: []
            },
        },
    ],
};