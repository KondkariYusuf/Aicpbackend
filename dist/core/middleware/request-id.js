"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.attachRequestId = void 0;
const node_crypto_1 = require("node:crypto");
const attachRequestId = (req, res, next) => {
    const maybePinoId = req.id;
    const requestId = maybePinoId ?? (0, node_crypto_1.randomUUID)();
    req.requestId = requestId;
    res.setHeader("x-request-id", requestId);
    next();
};
exports.attachRequestId = attachRequestId;
