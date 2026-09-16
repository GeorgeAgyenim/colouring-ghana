// jest 26 (bundled with razzle 4) cannot resolve the `node:` module scheme
// used by pg-connection-string (via pg-promise 11). Map `node:process` here.
module.exports = process;
