"use strict";
/**
 * AgentAuth Protocol v0.1
 * Authentication and identity for autonomous AI agents
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.VERSION = exports.verifyDelegation = exports.createDelegation = exports.AATToken = exports.AgentIdentity = void 0;
var identity_1 = require("./identity");
Object.defineProperty(exports, "AgentIdentity", { enumerable: true, get: function () { return identity_1.AgentIdentity; } });
var token_1 = require("./token");
Object.defineProperty(exports, "AATToken", { enumerable: true, get: function () { return token_1.AATToken; } });
var delegation_1 = require("./delegation");
Object.defineProperty(exports, "createDelegation", { enumerable: true, get: function () { return delegation_1.createDelegation; } });
Object.defineProperty(exports, "verifyDelegation", { enumerable: true, get: function () { return delegation_1.verifyDelegation; } });
// Version
exports.VERSION = '0.1.0';
