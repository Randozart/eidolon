
var Module = (() => {
  var _scriptName = import.meta.url;
  
  return (
async function(moduleArg = {}) {
  var moduleRtn;

// include: shell.js
// The Module object: Our interface to the outside world. We import
// and export values on it. There are various ways Module can be used:
// 1. Not defined. We create it here
// 2. A function parameter, function(moduleArg) => Promise<Module>
// 3. pre-run appended it, var Module = {}; ..generated code..
// 4. External script tag defines var Module.
// We need to check if Module already exists (e.g. case 3 above).
// Substitution will be replaced with actual code on later stage of the build,
// this way Closure Compiler will not mangle it (e.g. case 4. above).
// Note that if you want to run closure, and also to use Module
// after the generated code, you will need to define   var Module = {};
// before the code. Then that object will be used in the code, and you
// can continue to use Module afterwards as well.
var Module = moduleArg;

// Set up the promise that indicates the Module is initialized
var readyPromiseResolve, readyPromiseReject;

var readyPromise = new Promise((resolve, reject) => {
  readyPromiseResolve = resolve;
  readyPromiseReject = reject;
});

// Determine the runtime environment we are in. You can customize this by
// setting the ENVIRONMENT setting at compile time (see settings.js).
// Attempt to auto-detect the environment
var ENVIRONMENT_IS_WEB = typeof window == "object";

var ENVIRONMENT_IS_WORKER = typeof WorkerGlobalScope != "undefined";

// N.b. Electron.js environment is simultaneously a NODE-environment, but
// also a web environment.
var ENVIRONMENT_IS_NODE = typeof process == "object" && typeof process.versions == "object" && typeof process.versions.node == "string" && process.type != "renderer";

if (ENVIRONMENT_IS_NODE) {
  // `require()` is no-op in an ESM module, use `createRequire()` to construct
  // the require()` function.  This is only necessary for multi-environment
  // builds, `-sENVIRONMENT=node` emits a static import declaration instead.
  // TODO: Swap all `require()`'s with `import()`'s?
  const {createRequire} = await import("module");
  let dirname = import.meta.url;
  if (dirname.startsWith("data:")) {
    dirname = "/";
  }
  /** @suppress{duplicate} */ var require = createRequire(dirname);
}

// --pre-jses are emitted after the Module integration code, so that they can
// refer to Module (if they choose; they can also define Module)
// include: /src/src/preamble.js
/*

Emglken preamble
================

Copyright (c) 2024 Dannii Willis
MIT licenced
https://github.com/curiousdannii/emglken

*/ // Make eslint happy
/* eslint no-unused-vars: "off" */ /* global callMain, Module */ let Dialog;

let GlkOte;

let glkote_event_data;

// eslint-disable-next-line prefer-const
let glkote_event_ready = () => {};

// Our main start function
// We depart from the Quixe standard in these ways:
// - `options.arguments` must be set in order to play a storyfile
// - no longer receives the storyfile - the Dialog library will handle loading it
Module["start"] = function(options) {
  Dialog = options.Dialog;
  if (!Dialog.async) {
    throw new Error("Emglken requires an async Dialog library");
  }
  GlkOte = options.GlkOte;
  options.accept = accept;
  callMain(options.arguments);
  GlkOte.init(options);
};

function accept(data) {
  if (glkote_event_data) {
    console.warn("Already have GlkOte event when next event arrives");
  }
  glkote_event_data = data;
  glkote_event_ready();
}

// Log output
//Module['print'] = console.log
// In single-file mode new URL constructor won't work
Module["locateFile"] = function(filename) {
  try {
    return new URL(filename, import.meta.url).href;
  } catch {
    return filename;
  }
};

// end include: /src/src/preamble.js
// Sometimes an existing Module object exists with properties
// meant to overwrite the default module functionality. Here
// we collect those properties and reapply _after_ we configure
// the current environment's defaults to avoid having to be so
// defensive during initialization.
var moduleOverrides = Object.assign({}, Module);

var arguments_ = [];

var thisProgram = "./this.program";

var quit_ = (status, toThrow) => {
  throw toThrow;
};

// `/` should be present at the end if `scriptDirectory` is not empty
var scriptDirectory = "";

function locateFile(path) {
  if (Module["locateFile"]) {
    return Module["locateFile"](path, scriptDirectory);
  }
  return scriptDirectory + path;
}

// Hooks that are implemented differently in different runtime environments.
var readAsync, readBinary;

if (ENVIRONMENT_IS_NODE) {
  // These modules will usually be used on Node.js. Load them eagerly to avoid
  // the complexity of lazy-loading.
  var fs = require("fs");
  var nodePath = require("path");
  // EXPORT_ES6 + ENVIRONMENT_IS_NODE always requires use of import.meta.url,
  // since there's no way getting the current absolute path of the module when
  // support for that is not available.
  if (!import.meta.url.startsWith("data:")) {
    scriptDirectory = nodePath.dirname(require("url").fileURLToPath(import.meta.url)) + "/";
  }
  // include: node_shell_read.js
  readBinary = filename => {
    // We need to re-wrap `file://` strings to URLs.
    filename = isFileURI(filename) ? new URL(filename) : filename;
    var ret = fs.readFileSync(filename);
    return ret;
  };
  readAsync = async (filename, binary = true) => {
    // See the comment in the `readBinary` function.
    filename = isFileURI(filename) ? new URL(filename) : filename;
    var ret = fs.readFileSync(filename, binary ? undefined : "utf8");
    return ret;
  };
  // end include: node_shell_read.js
  if (!Module["thisProgram"] && process.argv.length > 1) {
    thisProgram = process.argv[1].replace(/\\/g, "/");
  }
  arguments_ = process.argv.slice(2);
  // MODULARIZE will export the module in the proper place outside, we don't need to export here
  quit_ = (status, toThrow) => {
    process.exitCode = status;
    throw toThrow;
  };
} else // Note that this includes Node.js workers when relevant (pthreads is enabled).
// Node.js workers are detected as a combination of ENVIRONMENT_IS_WORKER and
// ENVIRONMENT_IS_NODE.
if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
  if (ENVIRONMENT_IS_WORKER) {
    // Check worker, not web, since window could be polyfilled
    scriptDirectory = self.location.href;
  } else if (typeof document != "undefined" && document.currentScript) {
    // web
    scriptDirectory = document.currentScript.src;
  }
  // When MODULARIZE, this JS may be executed later, after document.currentScript
  // is gone, so we saved it, and we use it here instead of any other info.
  if (_scriptName) {
    scriptDirectory = _scriptName;
  }
  // blob urls look like blob:http://site.com/etc/etc and we cannot infer anything from them.
  // otherwise, slice off the final part of the url to find the script directory.
  // if scriptDirectory does not contain a slash, lastIndexOf will return -1,
  // and scriptDirectory will correctly be replaced with an empty string.
  // If scriptDirectory contains a query (starting with ?) or a fragment (starting with #),
  // they are removed because they could contain a slash.
  if (scriptDirectory.startsWith("blob:")) {
    scriptDirectory = "";
  } else {
    scriptDirectory = scriptDirectory.substr(0, scriptDirectory.replace(/[?#].*/, "").lastIndexOf("/") + 1);
  }
  {
    // include: web_or_worker_shell_read.js
    readAsync = async url => {
      var response = await fetch(url, {
        credentials: "same-origin"
      });
      if (response.ok) {
        return response.arrayBuffer();
      }
      throw new Error(response.status + " : " + response.url);
    };
  }
} else // end include: web_or_worker_shell_read.js
{}

var out = console.log.bind(console);

var err = console.error.bind(console);

// Merge back in the overrides
Object.assign(Module, moduleOverrides);

// Free the object hierarchy contained in the overrides, this lets the GC
// reclaim data used.
moduleOverrides = null;

// Emit code to handle expected values on the Module object. This applies Module.x
// to the proper local x. This has two benefits: first, we only emit it if it is
// expected to arrive, and second, by using a local everywhere else that can be
// minified.
// perform assertions in shell.js after we set up out() and err(), as otherwise if an assertion fails it cannot print the message
// end include: shell.js
// include: preamble.js
// === Preamble library stuff ===
// Documentation for the public APIs defined in this file must be updated in:
//    site/source/docs/api_reference/preamble.js.rst
// A prebuilt local version of the documentation is available at:
//    site/build/text/docs/api_reference/preamble.js.txt
// You can also build docs locally as HTML or other formats in site/
// An online HTML version (which may be of a different version of Emscripten)
//    is up at http://kripken.github.io/emscripten-site/docs/api_reference/preamble.js.html
var wasmBinary = Module["wasmBinary"];

// Wasm globals
var wasmMemory;

//========================================
// Runtime essentials
//========================================
// whether we are quitting the application. no code should run after this.
// set in exit() and abort()
var ABORT = false;

// set by exit() and abort().  Passed to 'onExit' handler.
// NOTE: This is also used as the process return code code in shell environments
// but only when noExitRuntime is false.
var EXITSTATUS;

// Memory management
var /** @type {!Int8Array} */ HEAP8, /** @type {!Uint8Array} */ HEAPU8, /** @type {!Int16Array} */ HEAP16, /** @type {!Uint16Array} */ HEAPU16, /** @type {!Int32Array} */ HEAP32, /** @type {!Uint32Array} */ HEAPU32, /** @type {!Float32Array} */ HEAPF32, /** @type {!Float64Array} */ HEAPF64;

// include: runtime_shared.js
function updateMemoryViews() {
  var b = wasmMemory.buffer;
  HEAP8 = new Int8Array(b);
  HEAP16 = new Int16Array(b);
  HEAPU8 = new Uint8Array(b);
  HEAPU16 = new Uint16Array(b);
  HEAP32 = new Int32Array(b);
  HEAPU32 = new Uint32Array(b);
  HEAPF32 = new Float32Array(b);
  HEAPF64 = new Float64Array(b);
}

// end include: runtime_shared.js
// include: runtime_stack_check.js
// end include: runtime_stack_check.js
var __ATPRERUN__ = [];

// functions called before the runtime is initialized
var __ATINIT__ = [];

// functions called during startup
var __ATMAIN__ = [];

// functions called when main() is to be run
var __ATEXIT__ = [];

// functions called during shutdown
var __ATPOSTRUN__ = [];

// functions called after the main() is called
var runtimeInitialized = false;

var runtimeExited = false;

function preRun() {
  callRuntimeCallbacks(__ATPRERUN__);
}

function initRuntime() {
  runtimeInitialized = true;
  callRuntimeCallbacks(__ATINIT__);
}

function preMain() {
  callRuntimeCallbacks(__ATMAIN__);
}

function exitRuntime() {
  ___funcs_on_exit();
  // Native atexit() functions
  callRuntimeCallbacks(__ATEXIT__);
  flush_NO_FILESYSTEM();
  runtimeExited = true;
}

function postRun() {
  callRuntimeCallbacks(__ATPOSTRUN__);
}

function addOnInit(cb) {
  __ATINIT__.unshift(cb);
}

// include: runtime_math.js
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/imul
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/fround
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/clz32
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/trunc
// end include: runtime_math.js
// A counter of dependencies for calling run(). If we need to
// do asynchronous work before running, increment this and
// decrement it. Incrementing must happen in a place like
// Module.preRun (used by emcc to add file preloading).
// Note that you can add dependencies in preRun, even though
// it happens right before run - run will be postponed until
// the dependencies are met.
var runDependencies = 0;

var dependenciesFulfilled = null;

function addRunDependency(id) {
  runDependencies++;
}

function removeRunDependency(id) {
  runDependencies--;
  if (runDependencies == 0) {
    if (dependenciesFulfilled) {
      var callback = dependenciesFulfilled;
      dependenciesFulfilled = null;
      callback();
    }
  }
}

/** @param {string|number=} what */ function abort(what) {
  what = "Aborted(" + what + ")";
  // TODO(sbc): Should we remove printing and leave it up to whoever
  // catches the exception?
  err(what);
  ABORT = true;
  what += ". Build with -sASSERTIONS for more info.";
  // Use a wasm runtime error, because a JS error might be seen as a foreign
  // exception, which means we'd run destructors on it. We need the error to
  // simply make the program stop.
  // FIXME This approach does not work in Wasm EH because it currently does not assume
  // all RuntimeErrors are from traps; it decides whether a RuntimeError is from
  // a trap or not based on a hidden field within the object. So at the moment
  // we don't have a way of throwing a wasm trap from JS. TODO Make a JS API that
  // allows this in the wasm spec.
  // Suppress closure compiler warning here. Closure compiler's builtin extern
  // definition for WebAssembly.RuntimeError claims it takes no arguments even
  // though it can.
  // TODO(https://github.com/google/closure-compiler/pull/3913): Remove if/when upstream closure gets fixed.
  /** @suppress {checkTypes} */ var e = new WebAssembly.RuntimeError(what);
  readyPromiseReject(e);
  // Throw the error whether or not MODULARIZE is set because abort is used
  // in code paths apart from instantiation where an exception is expected
  // to be thrown when abort is called.
  throw e;
}

// include: memoryprofiler.js
// end include: memoryprofiler.js
// include: URIUtils.js
// Prefix of data URIs emitted by SINGLE_FILE and related options.
var dataURIPrefix = "data:application/octet-stream;base64,";

/**
 * Indicates whether filename is a base64 data URI.
 * @noinline
 */ var isDataURI = filename => filename.startsWith(dataURIPrefix);

/**
 * Indicates whether filename is delivered via file protocol (as opposed to http/https)
 * @noinline
 */ var isFileURI = filename => filename.startsWith("file://");

// end include: URIUtils.js
// include: runtime_exceptions.js
// end include: runtime_exceptions.js
function findWasmBinary() {
  if (Module["locateFile"]) {
    var f = "bocfel.wasm";
    if (!isDataURI(f)) {
      return locateFile(f);
    }
    return f;
  }
  // Use bundler-friendly `new URL(..., import.meta.url)` pattern; works in browsers too.
  return new URL("bocfel.wasm", import.meta.url).href;
}

var wasmBinaryFile;

function getBinarySync(file) {
  if (file == wasmBinaryFile && wasmBinary) {
    return new Uint8Array(wasmBinary);
  }
  if (readBinary) {
    return readBinary(file);
  }
  throw "both async and sync fetching of the wasm failed";
}

async function getWasmBinary(binaryFile) {
  // If we don't have the binary yet, load it asynchronously using readAsync.
  if (!wasmBinary) {
    // Fetch the binary using readAsync
    try {
      var response = await readAsync(binaryFile);
      return new Uint8Array(response);
    } catch {}
  }
  // Otherwise, getBinarySync should be able to get it synchronously
  return getBinarySync(binaryFile);
}

async function instantiateArrayBuffer(binaryFile, imports) {
  try {
    var binary = await getWasmBinary(binaryFile);
    var instance = await WebAssembly.instantiate(binary, imports);
    return instance;
  } catch (reason) {
    err(`failed to asynchronously prepare wasm: ${reason}`);
    abort(reason);
  }
}

async function instantiateAsync(binary, binaryFile, imports) {
  if (!binary && typeof WebAssembly.instantiateStreaming == "function" && !isDataURI(binaryFile) && // Avoid instantiateStreaming() on Node.js environment for now, as while
  // Node.js v18.1.0 implements it, it does not have a full fetch()
  // implementation yet.
  // Reference:
  //   https://github.com/emscripten-core/emscripten/pull/16917
  !ENVIRONMENT_IS_NODE && typeof fetch == "function") {
    try {
      var response = fetch(binaryFile, {
        credentials: "same-origin"
      });
      var instantiationResult = await WebAssembly.instantiateStreaming(response, imports);
      return instantiationResult;
    } catch (reason) {
      // We expect the most common failure cause to be a bad MIME type for the binary,
      // in which case falling back to ArrayBuffer instantiation should work.
      err(`wasm streaming compile failed: ${reason}`);
      err("falling back to ArrayBuffer instantiation");
    }
  }
  return instantiateArrayBuffer(binaryFile, imports);
}

function getWasmImports() {
  // prepare imports
  return {
    "a": wasmImports
  };
}

// Create the wasm instance.
// Receives the wasm imports, returns the exports.
async function createWasm() {
  // Load the wasm module and create an instance of using native support in the JS engine.
  // handle a generated wasm instance, receiving its exports and
  // performing other necessary setup
  /** @param {WebAssembly.Module=} module*/ function receiveInstance(instance, module) {
    wasmExports = instance.exports;
    wasmExports = Asyncify.instrumentWasmExports(wasmExports);
    wasmMemory = wasmExports["pa"];
    updateMemoryViews();
    wasmTable = wasmExports["va"];
    addOnInit(wasmExports["qa"]);
    removeRunDependency("wasm-instantiate");
    return wasmExports;
  }
  // wait for the pthread pool (if any)
  addRunDependency("wasm-instantiate");
  // Prefer streaming instantiation if available.
  function receiveInstantiationResult(result) {
    // 'result' is a ResultObject object which has both the module and instance.
    // receiveInstance() will swap in the exports (to Module.asm) so they can be called
    // TODO: Due to Closure regression https://github.com/google/closure-compiler/issues/3193, the above line no longer optimizes out down to the following line.
    // When the regression is fixed, can restore the above PTHREADS-enabled path.
    receiveInstance(result["instance"]);
  }
  var info = getWasmImports();
  wasmBinaryFile ??= findWasmBinary();
  try {
    var result = await instantiateAsync(wasmBinary, wasmBinaryFile, info);
    receiveInstantiationResult(result);
    return result;
  } catch (e) {
    // If instantiation fails, reject the module ready promise.
    readyPromiseReject(e);
    return;
  }
}

// Globals used by JS i64 conversions (see makeSetValue)
var tempDouble;

var tempI64;

// include: runtime_debug.js
// end include: runtime_debug.js
// === Body ===
// end include: preamble.js
class ExitStatus {
  name="ExitStatus";
  constructor(status) {
    this.message = `Program terminated with exit(${status})`;
    this.status = status;
  }
}

var callRuntimeCallbacks = callbacks => {
  while (callbacks.length > 0) {
    // Pass the module as the first argument.
    callbacks.shift()(Module);
  }
};

var stackRestore = val => __emscripten_stack_restore(val);

var stackSave = () => _emscripten_stack_get_current();

var ___call_sighandler = (fp, sig) => (a1 => dynCall_vi(fp, a1))(sig);

var exceptionCaught = [];

var uncaughtExceptionCount = 0;

var ___cxa_begin_catch = ptr => {
  var info = new ExceptionInfo(ptr);
  if (!info.get_caught()) {
    info.set_caught(true);
    uncaughtExceptionCount--;
  }
  info.set_rethrown(false);
  exceptionCaught.push(info);
  ___cxa_increment_exception_refcount(ptr);
  return ___cxa_get_exception_ptr(ptr);
};

var exceptionLast = 0;

var ___cxa_end_catch = () => {
  // Clear state flag.
  _setThrew(0, 0);
  // Call destructor if one is registered then clear it.
  var info = exceptionCaught.pop();
  ___cxa_decrement_exception_refcount(info.excPtr);
  exceptionLast = 0;
};

// XXX in decRef?
class ExceptionInfo {
  // excPtr - Thrown object pointer to wrap. Metadata pointer is calculated from it.
  constructor(excPtr) {
    this.excPtr = excPtr;
    this.ptr = excPtr - 24;
  }
  set_type(type) {
    HEAPU32[(((this.ptr) + (4)) >> 2)] = type;
  }
  get_type() {
    return HEAPU32[(((this.ptr) + (4)) >> 2)];
  }
  set_destructor(destructor) {
    HEAPU32[(((this.ptr) + (8)) >> 2)] = destructor;
  }
  get_destructor() {
    return HEAPU32[(((this.ptr) + (8)) >> 2)];
  }
  set_caught(caught) {
    caught = caught ? 1 : 0;
    HEAP8[(this.ptr) + (12)] = caught;
  }
  get_caught() {
    return HEAP8[(this.ptr) + (12)] != 0;
  }
  set_rethrown(rethrown) {
    rethrown = rethrown ? 1 : 0;
    HEAP8[(this.ptr) + (13)] = rethrown;
  }
  get_rethrown() {
    return HEAP8[(this.ptr) + (13)] != 0;
  }
  // Initialize native structure fields. Should be called once after allocated.
  init(type, destructor) {
    this.set_adjusted_ptr(0);
    this.set_type(type);
    this.set_destructor(destructor);
  }
  set_adjusted_ptr(adjustedPtr) {
    HEAPU32[(((this.ptr) + (16)) >> 2)] = adjustedPtr;
  }
  get_adjusted_ptr() {
    return HEAPU32[(((this.ptr) + (16)) >> 2)];
  }
}

var ___resumeException = ptr => {
  if (!exceptionLast) {
    exceptionLast = ptr;
  }
  throw exceptionLast;
};

var setTempRet0 = val => __emscripten_tempret_set(val);

var findMatchingCatch = args => {
  var thrown = exceptionLast;
  if (!thrown) {
    // just pass through the null ptr
    setTempRet0(0);
    return 0;
  }
  var info = new ExceptionInfo(thrown);
  info.set_adjusted_ptr(thrown);
  var thrownType = info.get_type();
  if (!thrownType) {
    // just pass through the thrown ptr
    setTempRet0(0);
    return thrown;
  }
  // can_catch receives a **, add indirection
  // The different catch blocks are denoted by different types.
  // Due to inheritance, those types may not precisely match the
  // type of the thrown object. Find one which matches, and
  // return the type of the catch block which should be called.
  for (var caughtType of args) {
    if (caughtType === 0 || caughtType === thrownType) {
      // Catch all clause matched or exactly the same type is caught
      break;
    }
    var adjusted_ptr_addr = info.ptr + 16;
    if (___cxa_can_catch(caughtType, thrownType, adjusted_ptr_addr)) {
      setTempRet0(caughtType);
      return thrown;
    }
  }
  setTempRet0(thrownType);
  return thrown;
};

var ___cxa_find_matching_catch_2 = () => findMatchingCatch([]);

var ___cxa_find_matching_catch_3 = arg0 => findMatchingCatch([ arg0 ]);

var ___cxa_find_matching_catch_4 = (arg0, arg1) => findMatchingCatch([ arg0, arg1 ]);

var ___cxa_find_matching_catch_5 = (arg0, arg1, arg2) => findMatchingCatch([ arg0, arg1, arg2 ]);

var ___cxa_find_matching_catch_6 = (arg0, arg1, arg2, arg3) => findMatchingCatch([ arg0, arg1, arg2, arg3 ]);

var ___cxa_find_matching_catch_7 = (arg0, arg1, arg2, arg3, arg4) => findMatchingCatch([ arg0, arg1, arg2, arg3, arg4 ]);

var ___cxa_rethrow = () => {
  var info = exceptionCaught.pop();
  if (!info) {
    abort("no exception to throw");
  }
  var ptr = info.excPtr;
  if (!info.get_rethrown()) {
    // Only pop if the corresponding push was through rethrow_primary_exception
    exceptionCaught.push(info);
    info.set_rethrown(true);
    info.set_caught(false);
    uncaughtExceptionCount++;
  }
  exceptionLast = ptr;
  throw exceptionLast;
};

var ___cxa_throw = (ptr, type, destructor) => {
  var info = new ExceptionInfo(ptr);
  // Initialize ExceptionInfo content after it was allocated in __cxa_allocate_exception.
  info.init(type, destructor);
  exceptionLast = ptr;
  uncaughtExceptionCount++;
  throw exceptionLast;
};

var ___cxa_uncaught_exceptions = () => uncaughtExceptionCount;

var UTF8Decoder = new TextDecoder;

/**
     * Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the
     * emscripten HEAP, returns a copy of that string as a Javascript String object.
     *
     * @param {number} ptr
     * @param {number=} maxBytesToRead - An optional length that specifies the
     *   maximum number of bytes to read. You can omit this parameter to scan the
     *   string until the first 0 byte. If maxBytesToRead is passed, and the string
     *   at [ptr, ptr+maxBytesToReadr[ contains a null byte in the middle, then the
     *   string will cut short at that byte index (i.e. maxBytesToRead will not
     *   produce a string of exact length [ptr, ptr+maxBytesToRead[) N.B. mixing
     *   frequent uses of UTF8ToString() with and without maxBytesToRead may throw
     *   JS JIT optimizations off, so it is worth to consider consistently using one
     * @return {string}
     */ var UTF8ToString = (ptr, maxBytesToRead) => {
  if (!ptr) return "";
  var maxPtr = ptr + maxBytesToRead;
  for (var end = ptr; !(end >= maxPtr) && HEAPU8[end]; ) ++end;
  return UTF8Decoder.decode(HEAPU8.subarray(ptr, end));
};

var SYSCALLS = {
  varargs: undefined,
  getStr(ptr) {
    var ret = UTF8ToString(ptr);
    return ret;
  }
};

function ___syscall_fcntl64(fd, cmd, varargs) {
  SYSCALLS.varargs = varargs;
  return 0;
}

var lengthBytesUTF8 = str => {
  var len = 0;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code
    // unit, not a Unicode code point of the character! So decode
    // UTF16->UTF32->UTF8.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var c = str.charCodeAt(i);
    // possibly a lead surrogate
    if (c <= 127) {
      len++;
    } else if (c <= 2047) {
      len += 2;
    } else if (c >= 55296 && c <= 57343) {
      len += 4;
      ++i;
    } else {
      len += 3;
    }
  }
  return len;
};

var stringToUTF8Array = (str, heap, outIdx, maxBytesToWrite) => {
  // Parameter maxBytesToWrite is not optional. Negative values, 0, null,
  // undefined and false each don't write out any bytes.
  if (!(maxBytesToWrite > 0)) return 0;
  var startIdx = outIdx;
  var endIdx = outIdx + maxBytesToWrite - 1;
  // -1 for string null terminator.
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code
    // unit, not a Unicode code point of the character! So decode
    // UTF16->UTF32->UTF8.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    // For UTF8 byte structure, see http://en.wikipedia.org/wiki/UTF-8#Description
    // and https://www.ietf.org/rfc/rfc2279.txt
    // and https://tools.ietf.org/html/rfc3629
    var u = str.charCodeAt(i);
    // possibly a lead surrogate
    if (u >= 55296 && u <= 57343) {
      var u1 = str.charCodeAt(++i);
      u = 65536 + ((u & 1023) << 10) | (u1 & 1023);
    }
    if (u <= 127) {
      if (outIdx >= endIdx) break;
      heap[outIdx++] = u;
    } else if (u <= 2047) {
      if (outIdx + 1 >= endIdx) break;
      heap[outIdx++] = 192 | (u >> 6);
      heap[outIdx++] = 128 | (u & 63);
    } else if (u <= 65535) {
      if (outIdx + 2 >= endIdx) break;
      heap[outIdx++] = 224 | (u >> 12);
      heap[outIdx++] = 128 | ((u >> 6) & 63);
      heap[outIdx++] = 128 | (u & 63);
    } else {
      if (outIdx + 3 >= endIdx) break;
      heap[outIdx++] = 240 | (u >> 18);
      heap[outIdx++] = 128 | ((u >> 12) & 63);
      heap[outIdx++] = 128 | ((u >> 6) & 63);
      heap[outIdx++] = 128 | (u & 63);
    }
  }
  // Null-terminate the pointer to the buffer.
  heap[outIdx] = 0;
  return outIdx - startIdx;
};

var stringToUTF8 = (str, outPtr, maxBytesToWrite) => stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite);

var ___syscall_getcwd = (buf, size) => {};

function ___syscall_ioctl(fd, op, varargs) {
  SYSCALLS.varargs = varargs;
  return 0;
}

function ___syscall_openat(dirfd, path, flags, varargs) {
  SYSCALLS.varargs = varargs;
}

var __abort_js = () => abort("");

var __emscripten_memcpy_js = (dest, src, num) => HEAPU8.copyWithin(dest, src, src + num);

var runtimeKeepaliveCounter = 0;

var __emscripten_runtime_keepalive_clear = () => {
  runtimeKeepaliveCounter = 0;
};

var isLeapYear = year => year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);

var MONTH_DAYS_LEAP_CUMULATIVE = [ 0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335 ];

var MONTH_DAYS_REGULAR_CUMULATIVE = [ 0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334 ];

var ydayFromDate = date => {
  var leap = isLeapYear(date.getFullYear());
  var monthDaysCumulative = (leap ? MONTH_DAYS_LEAP_CUMULATIVE : MONTH_DAYS_REGULAR_CUMULATIVE);
  var yday = monthDaysCumulative[date.getMonth()] + date.getDate() - 1;
  // -1 since it's days since Jan 1
  return yday;
};

var convertI32PairToI53Checked = (lo, hi) => ((hi + 2097152) >>> 0 < 4194305 - !!lo) ? (lo >>> 0) + hi * 4294967296 : NaN;

function __localtime_js(time_low, time_high, tmPtr) {
  var time = convertI32PairToI53Checked(time_low, time_high);
  var date = new Date(time * 1e3);
  HEAP32[((tmPtr) >> 2)] = date.getSeconds();
  HEAP32[(((tmPtr) + (4)) >> 2)] = date.getMinutes();
  HEAP32[(((tmPtr) + (8)) >> 2)] = date.getHours();
  HEAP32[(((tmPtr) + (12)) >> 2)] = date.getDate();
  HEAP32[(((tmPtr) + (16)) >> 2)] = date.getMonth();
  HEAP32[(((tmPtr) + (20)) >> 2)] = date.getFullYear() - 1900;
  HEAP32[(((tmPtr) + (24)) >> 2)] = date.getDay();
  var yday = ydayFromDate(date) | 0;
  HEAP32[(((tmPtr) + (28)) >> 2)] = yday;
  HEAP32[(((tmPtr) + (36)) >> 2)] = -(date.getTimezoneOffset() * 60);
  // Attention: DST is in December in South, and some regions don't have DST at all.
  var start = new Date(date.getFullYear(), 0, 1);
  var summerOffset = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
  var winterOffset = start.getTimezoneOffset();
  var dst = (summerOffset != winterOffset && date.getTimezoneOffset() == Math.min(winterOffset, summerOffset)) | 0;
  HEAP32[(((tmPtr) + (32)) >> 2)] = dst;
}

var timers = {};

var handleException = e => {
  // Certain exception types we do not treat as errors since they are used for
  // internal control flow.
  // 1. ExitStatus, which is thrown by exit()
  // 2. "unwind", which is thrown by emscripten_unwind_to_js_event_loop() and others
  //    that wish to return to JS event loop.
  if (e instanceof ExitStatus || e == "unwind") {
    return EXITSTATUS;
  }
  quit_(1, e);
};

var keepRuntimeAlive = () => runtimeKeepaliveCounter > 0;

var _proc_exit = code => {
  EXITSTATUS = code;
  if (!keepRuntimeAlive()) {
    ABORT = true;
  }
  quit_(code, new ExitStatus(code));
};

/** @suppress {duplicate } */ /** @param {boolean|number=} implicit */ var exitJS = (status, implicit) => {
  EXITSTATUS = status;
  if (!keepRuntimeAlive()) {
    exitRuntime();
  }
  _proc_exit(status);
};

var _exit = exitJS;

var maybeExit = () => {
  if (runtimeExited) {
    return;
  }
  if (!keepRuntimeAlive()) {
    try {
      _exit(EXITSTATUS);
    } catch (e) {
      handleException(e);
    }
  }
};

var callUserCallback = func => {
  if (runtimeExited || ABORT) {
    return;
  }
  try {
    func();
    maybeExit();
  } catch (e) {
    handleException(e);
  }
};

var _emscripten_get_now = () => performance.now();

var __setitimer_js = (which, timeout_ms) => {
  // First, clear any existing timer.
  if (timers[which]) {
    clearTimeout(timers[which].id);
    delete timers[which];
  }
  // A timeout of zero simply cancels the current timeout so we have nothing
  // more to do.
  if (!timeout_ms) return 0;
  var id = setTimeout(() => {
    delete timers[which];
    callUserCallback(() => __emscripten_timeout(which, _emscripten_get_now()));
  }, timeout_ms);
  timers[which] = {
    id,
    timeout_ms
  };
  return 0;
};

var __tzset_js = (timezone, daylight, std_name, dst_name) => {
  // TODO: Use (malleable) environment variables instead of system settings.
  var currentYear = (new Date).getFullYear();
  var winter = new Date(currentYear, 0, 1);
  var summer = new Date(currentYear, 6, 1);
  var winterOffset = winter.getTimezoneOffset();
  var summerOffset = summer.getTimezoneOffset();
  // Local standard timezone offset. Local standard time is not adjusted for
  // daylight savings.  This code uses the fact that getTimezoneOffset returns
  // a greater value during Standard Time versus Daylight Saving Time (DST).
  // Thus it determines the expected output during Standard Time, and it
  // compares whether the output of the given date the same (Standard) or less
  // (DST).
  var stdTimezoneOffset = Math.max(winterOffset, summerOffset);
  // timezone is specified as seconds west of UTC ("The external variable
  // `timezone` shall be set to the difference, in seconds, between
  // Coordinated Universal Time (UTC) and local standard time."), the same
  // as returned by stdTimezoneOffset.
  // See http://pubs.opengroup.org/onlinepubs/009695399/functions/tzset.html
  HEAPU32[((timezone) >> 2)] = stdTimezoneOffset * 60;
  HEAP32[((daylight) >> 2)] = Number(winterOffset != summerOffset);
  var extractZone = timezoneOffset => {
    // Why inverse sign?
    // Read here https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/getTimezoneOffset
    var sign = timezoneOffset >= 0 ? "-" : "+";
    var absOffset = Math.abs(timezoneOffset);
    var hours = String(Math.floor(absOffset / 60)).padStart(2, "0");
    var minutes = String(absOffset % 60).padStart(2, "0");
    return `UTC${sign}${hours}${minutes}`;
  };
  var winterName = extractZone(winterOffset);
  var summerName = extractZone(summerOffset);
  if (summerOffset < winterOffset) {
    // Northern hemisphere
    stringToUTF8(winterName, std_name, 17);
    stringToUTF8(summerName, dst_name, 17);
  } else {
    stringToUTF8(winterName, dst_name, 17);
    stringToUTF8(summerName, std_name, 17);
  }
};

var _emscripten_date_now = () => Date.now();

var nowIsMonotonic = 1;

var checkWasiClock = clock_id => clock_id >= 0 && clock_id <= 3;

function _clock_time_get(clk_id, ignored_precision_low, ignored_precision_high, ptime) {
  var ignored_precision = convertI32PairToI53Checked(ignored_precision_low, ignored_precision_high);
  if (!checkWasiClock(clk_id)) {
    return 28;
  }
  var now;
  // all wasi clocks but realtime are monotonic
  if (clk_id === 0) {
    now = _emscripten_date_now();
  } else if (nowIsMonotonic) {
    now = _emscripten_get_now();
  } else {
    return 52;
  }
  // "now" is in ms, and wasi times are in ns.
  var nsec = Math.round(now * 1e3 * 1e3);
  (tempI64 = [ nsec >>> 0, (tempDouble = nsec, (+(Math.abs(tempDouble))) >= 1 ? (tempDouble > 0 ? (+(Math.floor((tempDouble) / 4294967296))) >>> 0 : (~~((+(Math.ceil((tempDouble - +(((~~(tempDouble))) >>> 0)) / 4294967296))))) >>> 0) : 0) ], 
  HEAP32[((ptime) >> 2)] = tempI64[0], HEAP32[(((ptime) + (4)) >> 2)] = tempI64[1]);
  return 0;
}

function writeBuffer(buffer, data) {
  const ptr = _malloc(data.length);
  HEAP8.set(data, ptr);
  HEAP32[((buffer) >> 2)] = ptr;
  HEAP32[(((buffer) + (4)) >> 2)] = data.length;
}

function writeBufferJSON(buffer, data) {
  const json = JSON.stringify(data);
  writeBuffer(buffer, encoder.encode(json));
}

var _emglken_file_delete = function emglken_file_delete(path_ptr, path_len) {
  return Asyncify.handleAsync(async () => {
    const path = UTF8ToString(path_ptr, path_len);
    await Dialog.delete(path);
  });
};

_emglken_file_delete.isAsync = true;

var _emglken_file_exists = function emglken_file_exists(path_ptr, path_len) {
  return Asyncify.handleAsync(async () => {
    const path = UTF8ToString(path_ptr, path_len);
    return Dialog.exists(path);
  });
};

_emglken_file_exists.isAsync = true;

var _emglken_file_flush = function emglken_file_flush() {
  return Asyncify.handleAsync(async () => {
    await Dialog.write(emglken_files);
    emglken_files = {};
  });
};

_emglken_file_flush.isAsync = true;

var _emglken_file_read = function emglken_file_read(path_ptr, path_len, buffer) {
  return Asyncify.handleAsync(async () => {
    const path = UTF8ToString(path_ptr, path_len);
    const data = await Dialog.read(path);
    if (data) {
      writeBuffer(buffer, data);
      return true;
    }
    return false;
  });
};

_emglken_file_read.isAsync = true;

function _emglken_file_write_buffer(path_ptr, path_len, buf_ptr, buf_len) {
  const path = UTF8ToString(path_ptr, path_len);
  const data = HEAP8.subarray(buf_ptr, buf_ptr + buf_len);
  emglken_files[path] = data;
}

function _emglken_get_dirs(buffer) {
  const dirs = Dialog.get_dirs();
  writeBufferJSON(buffer, dirs);
}

var _emglken_get_glkote_event = function emglken_get_glkote_event(buffer) {
  return Asyncify.handleAsync(async () => {
    if (!glkote_event_data) {
      await new Promise(resolve => {
        glkote_event_ready = resolve;
      });
    }
    writeBufferJSON(buffer, glkote_event_data);
    glkote_event_data = null;
  });
};

_emglken_get_glkote_event.isAsync = true;

function _emglken_send_glkote_update(update_ptr, update_len) {
  const obj = JSON.parse(UTF8ToString(update_ptr, update_len));
  GlkOte.update(obj);
}

function _emglken_set_storyfile_dir(path_ptr, path_len, buffer) {
  const path = UTF8ToString(path_ptr, path_len);
  const dirs = Dialog.set_storyfile_dir(path);
  writeBufferJSON(buffer, dirs);
}

var getHeapMax = () => // Stay one Wasm page short of 4GB: while e.g. Chrome is able to allocate
// full 4GB Wasm memories, the size will wrap back to 0 bytes in Wasm side
// for any code that deals with heap sizes, which would require special
// casing all heap size related code to treat 0 specially.
2147483648;

var alignMemory = (size, alignment) => Math.ceil(size / alignment) * alignment;

var growMemory = size => {
  var b = wasmMemory.buffer;
  var pages = ((size - b.byteLength + 65535) / 65536) | 0;
  try {
    // round size grow request up to wasm page size (fixed 64KB per spec)
    wasmMemory.grow(pages);
    // .grow() takes a delta compared to the previous size
    updateMemoryViews();
    return 1;
  } /*success*/ catch (e) {}
};

// implicit 0 return to save code size (caller will cast "undefined" into 0
// anyhow)
var _emscripten_resize_heap = requestedSize => {
  var oldSize = HEAPU8.length;
  // With CAN_ADDRESS_2GB or MEMORY64, pointers are already unsigned.
  requestedSize >>>= 0;
  // With multithreaded builds, races can happen (another thread might increase the size
  // in between), so return a failure, and let the caller retry.
  // Memory resize rules:
  // 1.  Always increase heap size to at least the requested size, rounded up
  //     to next page multiple.
  // 2a. If MEMORY_GROWTH_LINEAR_STEP == -1, excessively resize the heap
  //     geometrically: increase the heap size according to
  //     MEMORY_GROWTH_GEOMETRIC_STEP factor (default +20%), At most
  //     overreserve by MEMORY_GROWTH_GEOMETRIC_CAP bytes (default 96MB).
  // 2b. If MEMORY_GROWTH_LINEAR_STEP != -1, excessively resize the heap
  //     linearly: increase the heap size by at least
  //     MEMORY_GROWTH_LINEAR_STEP bytes.
  // 3.  Max size for the heap is capped at 2048MB-WASM_PAGE_SIZE, or by
  //     MAXIMUM_MEMORY, or by ASAN limit, depending on which is smallest
  // 4.  If we were unable to allocate as much memory, it may be due to
  //     over-eager decision to excessively reserve due to (3) above.
  //     Hence if an allocation fails, cut down on the amount of excess
  //     growth, in an attempt to succeed to perform a smaller allocation.
  // A limit is set for how much we can grow. We should not exceed that
  // (the wasm binary specifies it, so if we tried, we'd fail anyhow).
  var maxHeapSize = getHeapMax();
  if (requestedSize > maxHeapSize) {
    return false;
  }
  // Loop through potential heap size increases. If we attempt a too eager
  // reservation that fails, cut down on the attempted size and reserve a
  // smaller bump instead. (max 3 times, chosen somewhat arbitrarily)
  for (var cutDown = 1; cutDown <= 4; cutDown *= 2) {
    var overGrownHeapSize = oldSize * (1 + .2 / cutDown);
    // ensure geometric growth
    // but limit overreserving (default to capping at +96MB overgrowth at most)
    overGrownHeapSize = Math.min(overGrownHeapSize, requestedSize + 100663296);
    var newSize = Math.min(maxHeapSize, alignMemory(Math.max(requestedSize, overGrownHeapSize), 65536));
    var replacement = growMemory(newSize);
    if (replacement) {
      return true;
    }
  }
  return false;
};

var ENV = {};

var getExecutableName = () => thisProgram || "./this.program";

var getEnvStrings = () => {
  if (!getEnvStrings.strings) {
    // Default values.
    // Browser language detection #8751
    var lang = ((typeof navigator == "object" && navigator.languages && navigator.languages[0]) || "C").replace("-", "_") + ".UTF-8";
    var env = {
      "USER": "web_user",
      "LOGNAME": "web_user",
      "PATH": "/",
      "PWD": "/",
      "HOME": "/home/web_user",
      "LANG": lang,
      "_": getExecutableName()
    };
    // Apply the user-provided values, if any.
    for (var x in ENV) {
      // x is a key in ENV; if ENV[x] is undefined, that means it was
      // explicitly set to be so. We allow user code to do that to
      // force variables with default values to remain unset.
      if (ENV[x] === undefined) delete env[x]; else env[x] = ENV[x];
    }
    var strings = [];
    for (var x in env) {
      strings.push(`${x}=${env[x]}`);
    }
    getEnvStrings.strings = strings;
  }
  return getEnvStrings.strings;
};

var stringToAscii = (str, buffer) => {
  for (var i = 0; i < str.length; ++i) {
    HEAP8[buffer++] = str.charCodeAt(i);
  }
  // Null-terminate the string
  HEAP8[buffer] = 0;
};

var _environ_get = (__environ, environ_buf) => {
  var bufSize = 0;
  getEnvStrings().forEach((string, i) => {
    var ptr = environ_buf + bufSize;
    HEAPU32[(((__environ) + (i * 4)) >> 2)] = ptr;
    stringToAscii(string, ptr);
    bufSize += string.length + 1;
  });
  return 0;
};

var _environ_sizes_get = (penviron_count, penviron_buf_size) => {
  var strings = getEnvStrings();
  HEAPU32[((penviron_count) >> 2)] = strings.length;
  var bufSize = 0;
  strings.forEach(string => bufSize += string.length + 1);
  HEAPU32[((penviron_buf_size) >> 2)] = bufSize;
  return 0;
};

var _fd_close = fd => 52;

var _fd_read = (fd, iov, iovcnt, pnum) => 52;

function _fd_seek(fd, offset_low, offset_high, whence, newOffset) {
  var offset = convertI32PairToI53Checked(offset_low, offset_high);
  return 70;
}

var printCharBuffers = [ null, [], [] ];

/**
     * Given a pointer 'idx' to a null-terminated UTF8-encoded string in the given
     * array that contains uint8 values, returns a copy of that string as a
     * Javascript String object.
     * heapOrArray is either a regular array, or a JavaScript typed array view.
     * @param {number=} idx
     * @param {number=} maxBytesToRead
     * @return {string}
     */ var UTF8ArrayToString = (heapOrArray, idx = 0, maxBytesToRead = NaN) => {
  var endIdx = idx + maxBytesToRead;
  var endPtr = idx;
  // TextDecoder needs to know the byte length in advance, it doesn't stop on
  // null terminator by itself.  Also, use the length info to avoid running tiny
  // strings through TextDecoder, since .subarray() allocates garbage.
  // (As a tiny code save trick, compare endPtr against endIdx using a negation,
  // so that undefined/NaN means Infinity)
  while (heapOrArray[endPtr] && !(endPtr >= endIdx)) ++endPtr;
  return UTF8Decoder.decode(heapOrArray.buffer ? heapOrArray.subarray(idx, endPtr) : new Uint8Array(heapOrArray.slice(idx, endPtr)));
};

var printChar = (stream, curr) => {
  var buffer = printCharBuffers[stream];
  if (curr === 0 || curr === 10) {
    (stream === 1 ? out : err)(UTF8ArrayToString(buffer));
    buffer.length = 0;
  } else {
    buffer.push(curr);
  }
};

var flush_NO_FILESYSTEM = () => {
  // flush anything remaining in the buffers during shutdown
  _fflush(0);
  if (printCharBuffers[1].length) printChar(1, 10);
  if (printCharBuffers[2].length) printChar(2, 10);
};

var _fd_write = (fd, iov, iovcnt, pnum) => {
  // hack to support printf in SYSCALLS_REQUIRE_FILESYSTEM=0
  var num = 0;
  for (var i = 0; i < iovcnt; i++) {
    var ptr = HEAPU32[((iov) >> 2)];
    var len = HEAPU32[(((iov) + (4)) >> 2)];
    iov += 8;
    for (var j = 0; j < len; j++) {
      printChar(fd, HEAPU8[ptr + j]);
    }
    num += len;
  }
  HEAPU32[((pnum) >> 2)] = num;
  return 0;
};

var _llvm_eh_typeid_for = type => type;

var initRandomFill = () => {
  if (typeof crypto == "object" && typeof crypto["getRandomValues"] == "function") {
    // for modern web browsers
    return view => crypto.getRandomValues(view);
  } else if (ENVIRONMENT_IS_NODE) {
    // for nodejs with or without crypto support included
    try {
      var crypto_module = require("crypto");
      var randomFillSync = crypto_module["randomFillSync"];
      if (randomFillSync) {
        // nodejs with LTS crypto support
        return view => crypto_module["randomFillSync"](view);
      }
      // very old nodejs with the original crypto API
      var randomBytes = crypto_module["randomBytes"];
      return view => (view.set(randomBytes(view.byteLength)), // Return the original view to match modern native implementations.
      view);
    } catch (e) {}
  }
  // we couldn't find a proper implementation, as Math.random() is not suitable for /dev/random, see emscripten-core/emscripten/pull/7096
  abort("initRandomDevice");
};

var randomFill = view => (randomFill = initRandomFill())(view);

var _random_get = (buffer, size) => {
  randomFill(HEAPU8.subarray(buffer, buffer + size));
  return 0;
};

var stackAlloc = sz => __emscripten_stack_alloc(sz);

var stringToUTF8OnStack = str => {
  var size = lengthBytesUTF8(str) + 1;
  var ret = stackAlloc(size);
  stringToUTF8(str, ret, size);
  return ret;
};

/** @type {WebAssembly.Table} */ var wasmTable;

var runAndAbortIfError = func => {
  try {
    return func();
  } catch (e) {
    abort(e);
  }
};

var runtimeKeepalivePush = () => {
  runtimeKeepaliveCounter += 1;
};

var runtimeKeepalivePop = () => {
  runtimeKeepaliveCounter -= 1;
};

var Asyncify = {
  instrumentWasmImports(imports) {
    var importPattern = /^(invoke_.*|__asyncjs__.*)$/;
    for (let [x, original] of Object.entries(imports)) {
      if (typeof original == "function") {
        let isAsyncifyImport = original.isAsync || importPattern.test(x);
      }
    }
  },
  instrumentWasmExports(exports) {
    var ret = {};
    for (let [x, original] of Object.entries(exports)) {
      if (typeof original == "function") {
        ret[x] = (...args) => {
          Asyncify.exportCallStack.push(x);
          try {
            return original(...args);
          } finally {
            if (!ABORT) {
              var y = Asyncify.exportCallStack.pop();
              Asyncify.maybeStopUnwind();
            }
          }
        };
      } else {
        ret[x] = original;
      }
    }
    return ret;
  },
  State: {
    Normal: 0,
    Unwinding: 1,
    Rewinding: 2,
    Disabled: 3
  },
  state: 0,
  StackSize: 8192,
  currData: null,
  handleSleepReturnValue: 0,
  exportCallStack: [],
  callStackNameToId: {},
  callStackIdToName: {},
  callStackId: 0,
  asyncPromiseHandlers: null,
  sleepCallbacks: [],
  getCallStackId(funcName) {
    var id = Asyncify.callStackNameToId[funcName];
    if (id === undefined) {
      id = Asyncify.callStackId++;
      Asyncify.callStackNameToId[funcName] = id;
      Asyncify.callStackIdToName[id] = funcName;
    }
    return id;
  },
  maybeStopUnwind() {
    if (Asyncify.currData && Asyncify.state === Asyncify.State.Unwinding && Asyncify.exportCallStack.length === 0) {
      // We just finished unwinding.
      // Be sure to set the state before calling any other functions to avoid
      // possible infinite recursion here (For example in debug pthread builds
      // the dbg() function itself can call back into WebAssembly to get the
      // current pthread_self() pointer).
      Asyncify.state = Asyncify.State.Normal;
      runtimeKeepalivePush();
      // Keep the runtime alive so that a re-wind can be done later.
      runAndAbortIfError(_asyncify_stop_unwind);
      if (typeof Fibers != "undefined") {
        Fibers.trampoline();
      }
    }
  },
  whenDone() {
    return new Promise((resolve, reject) => {
      Asyncify.asyncPromiseHandlers = {
        resolve,
        reject
      };
    });
  },
  allocateData() {
    // An asyncify data structure has three fields:
    //  0  current stack pos
    //  4  max stack pos
    //  8  id of function at bottom of the call stack (callStackIdToName[id] == name of js function)
    // The Asyncify ABI only interprets the first two fields, the rest is for the runtime.
    // We also embed a stack in the same memory region here, right next to the structure.
    // This struct is also defined as asyncify_data_t in emscripten/fiber.h
    var ptr = _malloc(12 + Asyncify.StackSize);
    Asyncify.setDataHeader(ptr, ptr + 12, Asyncify.StackSize);
    Asyncify.setDataRewindFunc(ptr);
    return ptr;
  },
  setDataHeader(ptr, stack, stackSize) {
    HEAPU32[((ptr) >> 2)] = stack;
    HEAPU32[(((ptr) + (4)) >> 2)] = stack + stackSize;
  },
  setDataRewindFunc(ptr) {
    var bottomOfCallStack = Asyncify.exportCallStack[0];
    var rewindId = Asyncify.getCallStackId(bottomOfCallStack);
    HEAP32[(((ptr) + (8)) >> 2)] = rewindId;
  },
  getDataRewindFuncName(ptr) {
    var id = HEAP32[(((ptr) + (8)) >> 2)];
    var name = Asyncify.callStackIdToName[id];
    return name;
  },
  getDataRewindFunc(name) {
    var func = wasmExports[name];
    return func;
  },
  doRewind(ptr) {
    var name = Asyncify.getDataRewindFuncName(ptr);
    var func = Asyncify.getDataRewindFunc(name);
    // Once we have rewound and the stack we no longer need to artificially
    // keep the runtime alive.
    runtimeKeepalivePop();
    return func();
  },
  handleSleep(startAsync) {
    if (ABORT) return;
    if (Asyncify.state === Asyncify.State.Normal) {
      // Prepare to sleep. Call startAsync, and see what happens:
      // if the code decided to call our callback synchronously,
      // then no async operation was in fact begun, and we don't
      // need to do anything.
      var reachedCallback = false;
      var reachedAfterCallback = false;
      startAsync((handleSleepReturnValue = 0) => {
        if (ABORT) return;
        Asyncify.handleSleepReturnValue = handleSleepReturnValue;
        reachedCallback = true;
        if (!reachedAfterCallback) {
          // We are happening synchronously, so no need for async.
          return;
        }
        Asyncify.state = Asyncify.State.Rewinding;
        runAndAbortIfError(() => _asyncify_start_rewind(Asyncify.currData));
        if (typeof MainLoop != "undefined" && MainLoop.func) {
          MainLoop.resume();
        }
        var asyncWasmReturnValue, isError = false;
        try {
          asyncWasmReturnValue = Asyncify.doRewind(Asyncify.currData);
        } catch (err) {
          asyncWasmReturnValue = err;
          isError = true;
        }
        // Track whether the return value was handled by any promise handlers.
        var handled = false;
        if (!Asyncify.currData) {
          // All asynchronous execution has finished.
          // `asyncWasmReturnValue` now contains the final
          // return value of the exported async WASM function.
          // Note: `asyncWasmReturnValue` is distinct from
          // `Asyncify.handleSleepReturnValue`.
          // `Asyncify.handleSleepReturnValue` contains the return
          // value of the last C function to have executed
          // `Asyncify.handleSleep()`, where as `asyncWasmReturnValue`
          // contains the return value of the exported WASM function
          // that may have called C functions that
          // call `Asyncify.handleSleep()`.
          var asyncPromiseHandlers = Asyncify.asyncPromiseHandlers;
          if (asyncPromiseHandlers) {
            Asyncify.asyncPromiseHandlers = null;
            (isError ? asyncPromiseHandlers.reject : asyncPromiseHandlers.resolve)(asyncWasmReturnValue);
            handled = true;
          }
        }
        if (isError && !handled) {
          // If there was an error and it was not handled by now, we have no choice but to
          // rethrow that error into the global scope where it can be caught only by
          // `onerror` or `onunhandledpromiserejection`.
          throw asyncWasmReturnValue;
        }
      });
      reachedAfterCallback = true;
      if (!reachedCallback) {
        // A true async operation was begun; start a sleep.
        Asyncify.state = Asyncify.State.Unwinding;
        // TODO: reuse, don't alloc/free every sleep
        Asyncify.currData = Asyncify.allocateData();
        if (typeof MainLoop != "undefined" && MainLoop.func) {
          MainLoop.pause();
        }
        runAndAbortIfError(() => _asyncify_start_unwind(Asyncify.currData));
      }
    } else if (Asyncify.state === Asyncify.State.Rewinding) {
      // Stop a resume.
      Asyncify.state = Asyncify.State.Normal;
      runAndAbortIfError(_asyncify_stop_rewind);
      _free(Asyncify.currData);
      Asyncify.currData = null;
      // Call all sleep callbacks now that the sleep-resume is all done.
      Asyncify.sleepCallbacks.forEach(callUserCallback);
    } else {
      abort(`invalid state: ${Asyncify.state}`);
    }
    return Asyncify.handleSleepReturnValue;
  },
  handleAsync(startAsync) {
    return Asyncify.handleSleep(wakeUp => {
      // TODO: add error handling as a second param when handleSleep implements it.
      startAsync().then(wakeUp);
    });
  }
};

let emglken_files = {};

const encoder = new TextEncoder;

var wasmImports = {
  /** @export */ oa: ___call_sighandler,
  /** @export */ l: ___cxa_begin_catch,
  /** @export */ r: ___cxa_end_catch,
  /** @export */ a: ___cxa_find_matching_catch_2,
  /** @export */ i: ___cxa_find_matching_catch_3,
  /** @export */ p: ___cxa_find_matching_catch_4,
  /** @export */ v: ___cxa_find_matching_catch_5,
  /** @export */ y: ___cxa_find_matching_catch_6,
  /** @export */ na: ___cxa_find_matching_catch_7,
  /** @export */ I: ___cxa_rethrow,
  /** @export */ q: ___cxa_throw,
  /** @export */ ma: ___cxa_uncaught_exceptions,
  /** @export */ f: ___resumeException,
  /** @export */ H: ___syscall_fcntl64,
  /** @export */ la: ___syscall_getcwd,
  /** @export */ ka: ___syscall_ioctl,
  /** @export */ ja: ___syscall_openat,
  /** @export */ da: __abort_js,
  /** @export */ ca: __emscripten_memcpy_js,
  /** @export */ ba: __emscripten_runtime_keepalive_clear,
  /** @export */ N: __localtime_js,
  /** @export */ aa: __setitimer_js,
  /** @export */ $: __tzset_js,
  /** @export */ P: _clock_time_get,
  /** @export */ _: _emglken_file_delete,
  /** @export */ Z: _emglken_file_exists,
  /** @export */ Y: _emglken_file_flush,
  /** @export */ X: _emglken_file_read,
  /** @export */ W: _emglken_file_write_buffer,
  /** @export */ V: _emglken_get_dirs,
  /** @export */ U: _emglken_get_glkote_event,
  /** @export */ T: _emglken_send_glkote_update,
  /** @export */ S: _emglken_set_storyfile_dir,
  /** @export */ R: _emscripten_resize_heap,
  /** @export */ ia: _environ_get,
  /** @export */ ha: _environ_sizes_get,
  /** @export */ Q: _exit,
  /** @export */ G: _fd_close,
  /** @export */ ga: _fd_read,
  /** @export */ O: _fd_seek,
  /** @export */ D: _fd_write,
  /** @export */ F: invoke_diii,
  /** @export */ E: invoke_fiii,
  /** @export */ t: invoke_i,
  /** @export */ b: invoke_ii,
  /** @export */ e: invoke_iii,
  /** @export */ j: invoke_iiii,
  /** @export */ s: invoke_iiiii,
  /** @export */ u: invoke_iiiiii,
  /** @export */ w: invoke_iiiiiii,
  /** @export */ C: invoke_iiiiiiii,
  /** @export */ B: invoke_iiiiiiiiiiii,
  /** @export */ M: invoke_iijj,
  /** @export */ L: invoke_j,
  /** @export */ K: invoke_jiiii,
  /** @export */ h: invoke_v,
  /** @export */ c: invoke_vi,
  /** @export */ d: invoke_vii,
  /** @export */ g: invoke_viii,
  /** @export */ o: invoke_viiii,
  /** @export */ k: invoke_viiiii,
  /** @export */ n: invoke_viiiiii,
  /** @export */ x: invoke_viiiiiii,
  /** @export */ z: invoke_viiiiiiiiii,
  /** @export */ A: invoke_viiiiiiiiiiiiiii,
  /** @export */ J: invoke_vijii,
  /** @export */ m: _llvm_eh_typeid_for,
  /** @export */ fa: _proc_exit,
  /** @export */ ea: _random_get
};

var wasmExports;

createWasm();

var ___wasm_call_ctors = () => (___wasm_call_ctors = wasmExports["qa"])();

var _fflush = a0 => (_fflush = wasmExports["ra"])(a0);

var _free = a0 => (_free = wasmExports["sa"])(a0);

var _malloc = a0 => (_malloc = wasmExports["ta"])(a0);

var _main = Module["_main"] = (a0, a1) => (_main = Module["_main"] = wasmExports["ua"])(a0, a1);

var ___funcs_on_exit = () => (___funcs_on_exit = wasmExports["wa"])();

var __emscripten_timeout = (a0, a1) => (__emscripten_timeout = wasmExports["xa"])(a0, a1);

var _setThrew = Module["_setThrew"] = (a0, a1) => (_setThrew = Module["_setThrew"] = wasmExports["ya"])(a0, a1);

var __emscripten_tempret_set = a0 => (__emscripten_tempret_set = wasmExports["za"])(a0);

var __emscripten_stack_restore = a0 => (__emscripten_stack_restore = wasmExports["Aa"])(a0);

var __emscripten_stack_alloc = a0 => (__emscripten_stack_alloc = wasmExports["Ba"])(a0);

var _emscripten_stack_get_current = () => (_emscripten_stack_get_current = wasmExports["Ca"])();

var ___cxa_decrement_exception_refcount = a0 => (___cxa_decrement_exception_refcount = wasmExports["Da"])(a0);

var ___cxa_increment_exception_refcount = a0 => (___cxa_increment_exception_refcount = wasmExports["Ea"])(a0);

var ___cxa_can_catch = (a0, a1, a2) => (___cxa_can_catch = wasmExports["Fa"])(a0, a1, a2);

var ___cxa_get_exception_ptr = a0 => (___cxa_get_exception_ptr = wasmExports["Ga"])(a0);

var dynCall_vi = Module["dynCall_vi"] = (a0, a1) => (dynCall_vi = Module["dynCall_vi"] = wasmExports["Ha"])(a0, a1);

var dynCall_iii = Module["dynCall_iii"] = (a0, a1, a2) => (dynCall_iii = Module["dynCall_iii"] = wasmExports["Ia"])(a0, a1, a2);

var dynCall_viiiii = Module["dynCall_viiiii"] = (a0, a1, a2, a3, a4, a5) => (dynCall_viiiii = Module["dynCall_viiiii"] = wasmExports["Ja"])(a0, a1, a2, a3, a4, a5);

var dynCall_viii = Module["dynCall_viii"] = (a0, a1, a2, a3) => (dynCall_viii = Module["dynCall_viii"] = wasmExports["Ka"])(a0, a1, a2, a3);

var dynCall_vii = Module["dynCall_vii"] = (a0, a1, a2) => (dynCall_vii = Module["dynCall_vii"] = wasmExports["La"])(a0, a1, a2);

var dynCall_ii = Module["dynCall_ii"] = (a0, a1) => (dynCall_ii = Module["dynCall_ii"] = wasmExports["Ma"])(a0, a1);

var dynCall_viiii = Module["dynCall_viiii"] = (a0, a1, a2, a3, a4) => (dynCall_viiii = Module["dynCall_viiii"] = wasmExports["Na"])(a0, a1, a2, a3, a4);

var dynCall_viiiiii = Module["dynCall_viiiiii"] = (a0, a1, a2, a3, a4, a5, a6) => (dynCall_viiiiii = Module["dynCall_viiiiii"] = wasmExports["Oa"])(a0, a1, a2, a3, a4, a5, a6);

var dynCall_v = Module["dynCall_v"] = a0 => (dynCall_v = Module["dynCall_v"] = wasmExports["Pa"])(a0);

var dynCall_iiii = Module["dynCall_iiii"] = (a0, a1, a2, a3) => (dynCall_iiii = Module["dynCall_iiii"] = wasmExports["Qa"])(a0, a1, a2, a3);

var dynCall_iijj = Module["dynCall_iijj"] = (a0, a1, a2, a3, a4, a5) => (dynCall_iijj = Module["dynCall_iijj"] = wasmExports["Ra"])(a0, a1, a2, a3, a4, a5);

var dynCall_viiiiiii = Module["dynCall_viiiiiii"] = (a0, a1, a2, a3, a4, a5, a6, a7) => (dynCall_viiiiiii = Module["dynCall_viiiiiii"] = wasmExports["Sa"])(a0, a1, a2, a3, a4, a5, a6, a7);

var dynCall_i = Module["dynCall_i"] = a0 => (dynCall_i = Module["dynCall_i"] = wasmExports["Ta"])(a0);

var dynCall_iiiiii = Module["dynCall_iiiiii"] = (a0, a1, a2, a3, a4, a5) => (dynCall_iiiiii = Module["dynCall_iiiiii"] = wasmExports["Ua"])(a0, a1, a2, a3, a4, a5);

var dynCall_iiiii = Module["dynCall_iiiii"] = (a0, a1, a2, a3, a4) => (dynCall_iiiii = Module["dynCall_iiiii"] = wasmExports["Va"])(a0, a1, a2, a3, a4);

var dynCall_iiiiiii = Module["dynCall_iiiiiii"] = (a0, a1, a2, a3, a4, a5, a6) => (dynCall_iiiiiii = Module["dynCall_iiiiiii"] = wasmExports["Wa"])(a0, a1, a2, a3, a4, a5, a6);

var dynCall_vijii = Module["dynCall_vijii"] = (a0, a1, a2, a3, a4, a5) => (dynCall_vijii = Module["dynCall_vijii"] = wasmExports["Xa"])(a0, a1, a2, a3, a4, a5);

var dynCall_iiiiiiii = Module["dynCall_iiiiiiii"] = (a0, a1, a2, a3, a4, a5, a6, a7) => (dynCall_iiiiiiii = Module["dynCall_iiiiiiii"] = wasmExports["Ya"])(a0, a1, a2, a3, a4, a5, a6, a7);

var dynCall_j = Module["dynCall_j"] = a0 => (dynCall_j = Module["dynCall_j"] = wasmExports["Za"])(a0);

var dynCall_jiiii = Module["dynCall_jiiii"] = (a0, a1, a2, a3, a4) => (dynCall_jiiii = Module["dynCall_jiiii"] = wasmExports["_a"])(a0, a1, a2, a3, a4);

var dynCall_fiii = Module["dynCall_fiii"] = (a0, a1, a2, a3) => (dynCall_fiii = Module["dynCall_fiii"] = wasmExports["$a"])(a0, a1, a2, a3);

var dynCall_diii = Module["dynCall_diii"] = (a0, a1, a2, a3) => (dynCall_diii = Module["dynCall_diii"] = wasmExports["ab"])(a0, a1, a2, a3);

var dynCall_iiiiiiiiiiii = Module["dynCall_iiiiiiiiiiii"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11) => (dynCall_iiiiiiiiiiii = Module["dynCall_iiiiiiiiiiii"] = wasmExports["bb"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11);

var dynCall_viiiiiiiiii = Module["dynCall_viiiiiiiiii"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10) => (dynCall_viiiiiiiiii = Module["dynCall_viiiiiiiiii"] = wasmExports["cb"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10);

var dynCall_viiiiiiiiiiiiiii = Module["dynCall_viiiiiiiiiiiiiii"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, a14, a15) => (dynCall_viiiiiiiiiiiiiii = Module["dynCall_viiiiiiiiiiiiiii"] = wasmExports["db"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, a14, a15);

var _asyncify_start_unwind = a0 => (_asyncify_start_unwind = wasmExports["eb"])(a0);

var _asyncify_stop_unwind = () => (_asyncify_stop_unwind = wasmExports["fb"])();

var _asyncify_start_rewind = a0 => (_asyncify_start_rewind = wasmExports["gb"])(a0);

var _asyncify_stop_rewind = () => (_asyncify_stop_rewind = wasmExports["hb"])();

function invoke_vi(index, a1) {
  var sp = stackSave();
  try {
    dynCall_vi(index, a1);
  } catch (e) {
    stackRestore(sp);
    if (e !== e + 0) throw e;
    _setThrew(1, 0);
  }
}

function invoke_viiiii(index, a1, a2, a3, a4, a5) {
  var sp = stackSave();
  try {
    dynCall_viiiii(index, a1, a2, a3, a4, a5);
  } catch (e) {
    stackRestore(sp);
    if (e !== e + 0) throw e;
    _setThrew(1, 0);
  }
}

function invoke_viii(index, a1, a2, a3) {
  var sp = stackSave();
  try {
    dynCall_viii(index, a1, a2, a3);
  } catch (e) {
    stackRestore(sp);
    if (e !== e + 0) throw e;
    _setThrew(1, 0);
  }
}

function invoke_vii(index, a1, a2) {
  var sp = stackSave();
  try {
    dynCall_vii(index, a1, a2);
  } catch (e) {
    stackRestore(sp);
    if (e !== e + 0) throw e;
    _setThrew(1, 0);
  }
}

function invoke_iii(index, a1, a2) {
  var sp = stackSave();
  try {
    return dynCall_iii(index, a1, a2);
  } catch (e) {
    stackRestore(sp);
    if (e !== e + 0) throw e;
    _setThrew(1, 0);
  }
}

function invoke_ii(index, a1) {
  var sp = stackSave();
  try {
    return dynCall_ii(index, a1);
  } catch (e) {
    stackRestore(sp);
    if (e !== e + 0) throw e;
    _setThrew(1, 0);
  }
}

function invoke_viiii(index, a1, a2, a3, a4) {
  var sp = stackSave();
  try {
    dynCall_viiii(index, a1, a2, a3, a4);
  } catch (e) {
    stackRestore(sp);
    if (e !== e + 0) throw e;
    _setThrew(1, 0);
  }
}

function invoke_viiiiii(index, a1, a2, a3, a4, a5, a6) {
  var sp = stackSave();
  try {
    dynCall_viiiiii(index, a1, a2, a3, a4, a5, a6);
  } catch (e) {
    stackRestore(sp);
    if (e !== e + 0) throw e;
    _setThrew(1, 0);
  }
}

function invoke_v(index) {
  var sp = stackSave();
  try {
    dynCall_v(index);
  } catch (e) {
    stackRestore(sp);
    if (e !== e + 0) throw e;
    _setThrew(1, 0);
  }
}

function invoke_iiii(index, a1, a2, a3) {
  var sp = stackSave();
  try {
    return dynCall_iiii(index, a1, a2, a3);
  } catch (e) {
    stackRestore(sp);
    if (e !== e + 0) throw e;
    _setThrew(1, 0);
  }
}

function invoke_viiiiiii(index, a1, a2, a3, a4, a5, a6, a7) {
  var sp = stackSave();
  try {
    dynCall_viiiiiii(index, a1, a2, a3, a4, a5, a6, a7);
  } catch (e) {
    stackRestore(sp);
    if (e !== e + 0) throw e;
    _setThrew(1, 0);
  }
}

function invoke_i(index) {
  var sp = stackSave();
  try {
    return dynCall_i(index);
  } catch (e) {
    stackRestore(sp);
    if (e !== e + 0) throw e;
    _setThrew(1, 0);
  }
}

function invoke_iiiiii(index, a1, a2, a3, a4, a5) {
  var sp = stackSave();
  try {
    return dynCall_iiiiii(index, a1, a2, a3, a4, a5);
  } catch (e) {
    stackRestore(sp);
    if (e !== e + 0) throw e;
    _setThrew(1, 0);
  }
}

function invoke_iiiii(index, a1, a2, a3, a4) {
  var sp = stackSave();
  try {
    return dynCall_iiiii(index, a1, a2, a3, a4);
  } catch (e) {
    stackRestore(sp);
    if (e !== e + 0) throw e;
    _setThrew(1, 0);
  }
}

function invoke_iiiiiii(index, a1, a2, a3, a4, a5, a6) {
  var sp = stackSave();
  try {
    return dynCall_iiiiiii(index, a1, a2, a3, a4, a5, a6);
  } catch (e) {
    stackRestore(sp);
    if (e !== e + 0) throw e;
    _setThrew(1, 0);
  }
}

function invoke_iiiiiiii(index, a1, a2, a3, a4, a5, a6, a7) {
  var sp = stackSave();
  try {
    return dynCall_iiiiiiii(index, a1, a2, a3, a4, a5, a6, a7);
  } catch (e) {
    stackRestore(sp);
    if (e !== e + 0) throw e;
    _setThrew(1, 0);
  }
}

function invoke_fiii(index, a1, a2, a3) {
  var sp = stackSave();
  try {
    return dynCall_fiii(index, a1, a2, a3);
  } catch (e) {
    stackRestore(sp);
    if (e !== e + 0) throw e;
    _setThrew(1, 0);
  }
}

function invoke_diii(index, a1, a2, a3) {
  var sp = stackSave();
  try {
    return dynCall_diii(index, a1, a2, a3);
  } catch (e) {
    stackRestore(sp);
    if (e !== e + 0) throw e;
    _setThrew(1, 0);
  }
}

function invoke_iiiiiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11) {
  var sp = stackSave();
  try {
    return dynCall_iiiiiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11);
  } catch (e) {
    stackRestore(sp);
    if (e !== e + 0) throw e;
    _setThrew(1, 0);
  }
}

function invoke_viiiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10) {
  var sp = stackSave();
  try {
    dynCall_viiiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10);
  } catch (e) {
    stackRestore(sp);
    if (e !== e + 0) throw e;
    _setThrew(1, 0);
  }
}

function invoke_viiiiiiiiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, a14, a15) {
  var sp = stackSave();
  try {
    dynCall_viiiiiiiiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, a14, a15);
  } catch (e) {
    stackRestore(sp);
    if (e !== e + 0) throw e;
    _setThrew(1, 0);
  }
}

function invoke_iijj(index, a1, a2, a3, a4, a5) {
  var sp = stackSave();
  try {
    return dynCall_iijj(index, a1, a2, a3, a4, a5);
  } catch (e) {
    stackRestore(sp);
    if (e !== e + 0) throw e;
    _setThrew(1, 0);
  }
}

function invoke_vijii(index, a1, a2, a3, a4, a5) {
  var sp = stackSave();
  try {
    dynCall_vijii(index, a1, a2, a3, a4, a5);
  } catch (e) {
    stackRestore(sp);
    if (e !== e + 0) throw e;
    _setThrew(1, 0);
  }
}

function invoke_j(index) {
  var sp = stackSave();
  try {
    return dynCall_j(index);
  } catch (e) {
    stackRestore(sp);
    if (e !== e + 0) throw e;
    _setThrew(1, 0);
  }
}

function invoke_jiiii(index, a1, a2, a3, a4) {
  var sp = stackSave();
  try {
    return dynCall_jiiii(index, a1, a2, a3, a4);
  } catch (e) {
    stackRestore(sp);
    if (e !== e + 0) throw e;
    _setThrew(1, 0);
  }
}

// include: postamble.js
// === Auto-generated postamble setup entry stuff ===
var calledRun;

dependenciesFulfilled = function runCaller() {
  // If run has never been called, and we should call run (INVOKE_RUN is true, and Module.noInitialRun is not false)
  if (!calledRun) run();
  if (!calledRun) dependenciesFulfilled = runCaller;
};

// try this again later, after new deps are fulfilled
function callMain(args = []) {
  var entryFunction = _main;
  args.unshift(thisProgram);
  var argc = args.length;
  var argv = stackAlloc((argc + 1) * 4);
  var argv_ptr = argv;
  args.forEach(arg => {
    HEAPU32[((argv_ptr) >> 2)] = stringToUTF8OnStack(arg);
    argv_ptr += 4;
  });
  HEAPU32[((argv_ptr) >> 2)] = 0;
  try {
    var ret = entryFunction(argc, argv);
    // if we're not running an evented main loop, it's time to exit
    exitJS(ret, /* implicit = */ true);
    return ret;
  } catch (e) {
    return handleException(e);
  }
}

function run(args = arguments_) {
  if (runDependencies > 0) {
    return;
  }
  preRun();
  // a preRun added a dependency, run will be called later
  if (runDependencies > 0) {
    return;
  }
  function doRun() {
    // run may have just been called through dependencies being fulfilled just in this very frame,
    // or while the async setStatus time below was happening
    if (calledRun) return;
    calledRun = true;
    Module["calledRun"] = true;
    if (ABORT) return;
    initRuntime();
    preMain();
    readyPromiseResolve(Module);
    if (shouldRunNow) callMain(args);
    postRun();
  }
  {
    doRun();
  }
}

// shouldRunNow refers to calling main(), not run().
var shouldRunNow = false;

run();

// end include: postamble.js
// include: postamble_modularize.js
// In MODULARIZE mode we wrap the generated code in a factory function
// and return either the Module itself, or a promise of the module.
// We assign to the `moduleRtn` global here and configure closure to see
// this as and extern so it won't get minified.
moduleRtn = readyPromise;


  return moduleRtn;
}
);
})();
export default Module;
