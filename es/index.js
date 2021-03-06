"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getResolver = getResolver;
exports.default = exports.createHypnsDid = void 0;

var _document = _interopRequireWildcard(require("./document"));

var _utils = require("./utils");

var _errors = require("./utils/errors");

var _hypns = _interopRequireDefault(require("hypns"));

var _events = _interopRequireDefault(require("events.once"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function () { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

// polyfill for nodejs events.once in the browser
class HypnsDid {
  constructor(node) {
    _defineProperty(this, "assertInstance", hypnsInstance => {
      if (!hypnsInstance.writable || typeof hypnsInstance.publish !== 'function') throw new _errors.UnavailableHypnsInstance();
      return this.getDid(hypnsInstance);
    });

    _defineProperty(this, "create", async (hypnsInstance, operations) => {
      this.assertInstance(hypnsInstance);
      const did = this.getDid(hypnsInstance);

      if (!hypnsInstance.latest) {
        // if it fails to read, we are allowed to create it
        const document = (0, _document.default)(did);
        operations(document);
        return await this.publish(hypnsInstance, document.getContent());
      } // if it reads successfully, DID Doc exists already, we need to throw IllegalCreate


      throw new _errors.IllegalCreate();
    });

    _defineProperty(this, "update", async (hypnsInstance, operations) => {
      try {
        this.assertInstance(hypnsInstance);
        const did = this.getDid(hypnsInstance);
        const content = hypnsInstance.latest.didDoc;
        const document = (0, _document.default)(did, content);
        operations(document);
        return await this.publish(hypnsInstance, document.getContent());
      } catch (error) {
        throw new _errors.UnavailableHypnsInstance();
      }
    });

    _defineProperty(this, "publish", async (hypnsInstance, content) => {
      try {
        process.nextTick(async () => {
          hypnsInstance.publish({
            didDoc: content
          });
        });
        await (0, _events.default)(hypnsInstance, 'update'); // wait until the multifeed it up to date before returning

        return content;
      } catch (error) {
        console.error(error);
        throw new _errors.UnavailableHypnsInstance();
      }
    });

    _defineProperty(this, "resolve", async did => {
      const {
        identifier: publicKey
      } = (0, _utils.parseDid)(did);
      var copy;

      try {
        copy = await this.node.open({
          keypair: {
            publicKey
          }
        }); // , temp: true

        copy.on('error', error => {
          console.error('\nCopy error in Hypns resolve\n', error); // JSON.stringify(error, null, 2)
        });

        try {
          // const update = once(copy, 'update') // wait for the content to be updated from the remote peer
          await copy.ready();

          if (!copy.latest) {
            await (0, _events.default)(copy, 'update'); // PUSHED TO USERLAND, they can decide how long to wait for a node to resolve
            // const timer = new Promise(function(resolve, reject) {
            //     setTimeout(() => resolve('timeout'), RESOLVE_TIMEOUT);
            // });
            // const result = await Promise.race([timer, update])
            // if (!result) throw new Error('No result') // did not resolve a DID doc from this did
            // if (result === 'timeout') throw new Error('Timeout error') // did not resolve a DID doc from this did
            // clearInterval(show);
          }
        } catch (error) {
          console.error('await update error', error);
        }

        if (!copy.latest) throw new Error('No latest result');
        if (!copy.latest.didDoc) throw new Error('No DID Doc property');
        const content = copy.latest.didDoc;
        (0, _document.assertDocument)(content);
        return content;
      } catch (err) {
        console.log('resolve Error: ', err);

        if (err.code === 'INVALID_DOCUMENT') {
          throw err;
        }

        throw new _errors.InvalidDid(did, `Unable to resolve document with DID: ${did}`, {
          originalError: err.message
        });
      } finally {
        await copy.close();
      }
    });

    _defineProperty(this, "getDid", hypnsInstance => {
      return `did:hypns:${hypnsInstance.publicKey}`;
    });

    if (node) {
      this.node = node;
    } else {
      this.node = new _hypns.default({
        persist: false
      });
    }
  }

}

const createHypnsDid = (node = false) => {
  return new HypnsDid(node);
}; // https://github.com/decentralized-identity/did-resolver


exports.createHypnsDid = createHypnsDid;

function getResolver(opts = {}) {
  const HypnsDid = createHypnsDid();

  async function resolve(did, parsed, didResolver) {
    // console.log({parsed})
    // {
    // method: 'mymethod', 
    // id: 'abcdefg', 
    // did: 'did:mymethod:abcdefg/some/path#fragment=123', 
    // path: '/some/path', 
    // fragment: 'fragment=123'
    // }
    const didDoc = await HypnsDid.resolve(did); // lookup doc
    // If you need to lookup another did as part of resolving this did document, the primary DIDResolver object is passed in as well
    // const parentDID = await didResolver.resolve(...)

    return didDoc;
  }

  return {
    hypns: resolve
  };
}

var _default = createHypnsDid;
exports.default = _default;