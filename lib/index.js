"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getDid = void 0;

var _document = _interopRequireWildcard(require("./document"));

var _utils = require("./utils");

var _errors = require("./utils/errors");

var _events = _interopRequireDefault(require("events.once"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function _getRequireWildcardCache() { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

// polyfill for nodejs events.once in the browser
var HyPNS = require('hypns');

class HyperId {
  constructor() {
    var _this = this;

    _defineProperty(this, "create", /*#__PURE__*/function () {
      var _ref = _asyncToGenerator(function* (hypnsInstance, operations) {
        yield assertInstance(hypnsInstance);
        var did = yield getDid(hypnsInstance);

        if (!hypnsInstance.latest) {
          // if it fails to read, we are allowed to create it
          var document = (0, _document.default)(did);
          operations(document);
          return yield _this.publish(hypnsInstance, document.getContent());
        } // if it reads successfully, DID Doc exists already, we need to throw IllegalCreate


        throw new _errors.IllegalCreate();
      });

      return function (_x, _x2) {
        return _ref.apply(this, arguments);
      };
    }());

    _defineProperty(this, "update", /*#__PURE__*/function () {
      var _ref2 = _asyncToGenerator(function* (hypnsInstance, operations) {
        try {
          yield assertInstance(hypnsInstance);
          var did = yield getDid(hypnsInstance);
          var content = hypnsInstance.latest.didDoc;
          var document = (0, _document.default)(did, content);
          operations(document);
          return yield _this.publish(hypnsInstance, document.getContent());
        } catch (error) {
          throw new _errors.UnavailableHypnsInstance();
        }
      });

      return function (_x3, _x4) {
        return _ref2.apply(this, arguments);
      };
    }());

    _defineProperty(this, "publish", /*#__PURE__*/function () {
      var _ref3 = _asyncToGenerator(function* (hypnsInstance, content) {
        try {
          yield hypnsInstance.publish({
            didDoc: content
          });
          return content;
        } catch (error) {
          console.error(error);
          throw new _errors.UnavailableHypnsInstance();
        }
      });

      return function (_x5, _x6) {
        return _ref3.apply(this, arguments);
      };
    }());

    _defineProperty(this, "resolve", /*#__PURE__*/function () {
      var _ref4 = _asyncToGenerator(function* (did) {
        var peerNode = new HyPNS({
          persist: false
        });
        var {
          identifier: publicKey
        } = (0, _utils.parseDid)(did);

        try {
          // not self, get a copy of the hypnsInstance
          var copy = yield peerNode.open({
            keypair: {
              publicKey
            }
          }); // copy.network.networker.on('peer-add', (val) => { console.log('peer-add', val) })
          // if (!copy.writable || !copy.latest || !copy.latest.didDoc)

          yield (0, _events.default)(copy.beacon, 'update'); // wait for the content to be updated from the remote peer

          var content = copy.latest.didDoc;
          (0, _document.assertDocument)(content);
          return content;
        } catch (err) {
          console.log('resolve Error: ', err);

          if (err.code === 'INVALID_DOCUMENT') {
            throw err;
          }

          throw new _errors.InvalidDid(did, "Unable to resolve document with DID: ".concat(did), {
            originalError: err.message
          });
        } finally {
          yield peerNode.close();
        }
      });

      return function (_x7) {
        return _ref4.apply(this, arguments);
      };
    }());
  }

}

var assertInstance = /*#__PURE__*/function () {
  var _ref5 = _asyncToGenerator(function* (hypnsInstance) {
    try {
      yield hypnsInstance.ready;
    } catch (error) {
      throw new _errors.UnavailableHypnsInstance();
    }

    if (!hypnsInstance.writable) throw new _errors.UnavailableHypnsInstance();
    return yield getDid(hypnsInstance);
  });

  return function assertInstance(_x8) {
    return _ref5.apply(this, arguments);
  };
}();

var getDid = /*#__PURE__*/function () {
  var _ref6 = _asyncToGenerator(function* (hypnsInstance) {
    try {
      yield hypnsInstance.ready;
    } catch (error) {
      throw new _errors.UnavailableHypnsInstance();
    }

    return "did:hyper:".concat(hypnsInstance.publicKey);
  });

  return function getDid(_x9) {
    return _ref6.apply(this, arguments);
  };
}();

exports.getDid = getDid;

var hyperDid = () => {
  return new HyperId();
}; // export default hyperDid


module.exports = hyperDid; // module.exports = { createDidHyper, getDid }