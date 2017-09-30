/******/ (function(modules) { // webpackBootstrap
/******/ 	function hotDisposeChunk(chunkId) {
/******/ 		delete installedChunks[chunkId];
/******/ 	}
/******/ 	var parentHotUpdateCallback = this["webpackHotUpdate"];
/******/ 	this["webpackHotUpdate"] = 
/******/ 	function webpackHotUpdateCallback(chunkId, moreModules) { // eslint-disable-line no-unused-vars
/******/ 		hotAddUpdateChunk(chunkId, moreModules);
/******/ 		if(parentHotUpdateCallback) parentHotUpdateCallback(chunkId, moreModules);
/******/ 	} ;
/******/ 	
/******/ 	function hotDownloadUpdateChunk(chunkId) { // eslint-disable-line no-unused-vars
/******/ 		var head = document.getElementsByTagName("head")[0];
/******/ 		var script = document.createElement("script");
/******/ 		script.type = "text/javascript";
/******/ 		script.charset = "utf-8";
/******/ 		script.src = __webpack_require__.p + "" + chunkId + "." + hotCurrentHash + ".hot-update.js";
/******/ 		head.appendChild(script);
/******/ 	}
/******/ 	
/******/ 	function hotDownloadManifest() { // eslint-disable-line no-unused-vars
/******/ 		return new Promise(function(resolve, reject) {
/******/ 			if(typeof XMLHttpRequest === "undefined")
/******/ 				return reject(new Error("No browser support"));
/******/ 			try {
/******/ 				var request = new XMLHttpRequest();
/******/ 				var requestPath = __webpack_require__.p + "" + hotCurrentHash + ".hot-update.json";
/******/ 				request.open("GET", requestPath, true);
/******/ 				request.timeout = 10000;
/******/ 				request.send(null);
/******/ 			} catch(err) {
/******/ 				return reject(err);
/******/ 			}
/******/ 			request.onreadystatechange = function() {
/******/ 				if(request.readyState !== 4) return;
/******/ 				if(request.status === 0) {
/******/ 					// timeout
/******/ 					reject(new Error("Manifest request to " + requestPath + " timed out."));
/******/ 				} else if(request.status === 404) {
/******/ 					// no update available
/******/ 					resolve();
/******/ 				} else if(request.status !== 200 && request.status !== 304) {
/******/ 					// other failure
/******/ 					reject(new Error("Manifest request to " + requestPath + " failed."));
/******/ 				} else {
/******/ 					// success
/******/ 					try {
/******/ 						var update = JSON.parse(request.responseText);
/******/ 					} catch(e) {
/******/ 						reject(e);
/******/ 						return;
/******/ 					}
/******/ 					resolve(update);
/******/ 				}
/******/ 			};
/******/ 		});
/******/ 	}
/******/
/******/ 	
/******/ 	
/******/ 	var hotApplyOnUpdate = true;
/******/ 	var hotCurrentHash = "8532e5fed6cfed2ac51e"; // eslint-disable-line no-unused-vars
/******/ 	var hotCurrentModuleData = {};
/******/ 	var hotCurrentChildModule; // eslint-disable-line no-unused-vars
/******/ 	var hotCurrentParents = []; // eslint-disable-line no-unused-vars
/******/ 	var hotCurrentParentsTemp = []; // eslint-disable-line no-unused-vars
/******/ 	
/******/ 	function hotCreateRequire(moduleId) { // eslint-disable-line no-unused-vars
/******/ 		var me = installedModules[moduleId];
/******/ 		if(!me) return __webpack_require__;
/******/ 		var fn = function(request) {
/******/ 			if(me.hot.active) {
/******/ 				if(installedModules[request]) {
/******/ 					if(installedModules[request].parents.indexOf(moduleId) < 0)
/******/ 						installedModules[request].parents.push(moduleId);
/******/ 				} else {
/******/ 					hotCurrentParents = [moduleId];
/******/ 					hotCurrentChildModule = request;
/******/ 				}
/******/ 				if(me.children.indexOf(request) < 0)
/******/ 					me.children.push(request);
/******/ 			} else {
/******/ 				console.warn("[HMR] unexpected require(" + request + ") from disposed module " + moduleId);
/******/ 				hotCurrentParents = [];
/******/ 			}
/******/ 			return __webpack_require__(request);
/******/ 		};
/******/ 		var ObjectFactory = function ObjectFactory(name) {
/******/ 			return {
/******/ 				configurable: true,
/******/ 				enumerable: true,
/******/ 				get: function() {
/******/ 					return __webpack_require__[name];
/******/ 				},
/******/ 				set: function(value) {
/******/ 					__webpack_require__[name] = value;
/******/ 				}
/******/ 			};
/******/ 		};
/******/ 		for(var name in __webpack_require__) {
/******/ 			if(Object.prototype.hasOwnProperty.call(__webpack_require__, name) && name !== "e") {
/******/ 				Object.defineProperty(fn, name, ObjectFactory(name));
/******/ 			}
/******/ 		}
/******/ 		fn.e = function(chunkId) {
/******/ 			if(hotStatus === "ready")
/******/ 				hotSetStatus("prepare");
/******/ 			hotChunksLoading++;
/******/ 			return __webpack_require__.e(chunkId).then(finishChunkLoading, function(err) {
/******/ 				finishChunkLoading();
/******/ 				throw err;
/******/ 			});
/******/ 	
/******/ 			function finishChunkLoading() {
/******/ 				hotChunksLoading--;
/******/ 				if(hotStatus === "prepare") {
/******/ 					if(!hotWaitingFilesMap[chunkId]) {
/******/ 						hotEnsureUpdateChunk(chunkId);
/******/ 					}
/******/ 					if(hotChunksLoading === 0 && hotWaitingFiles === 0) {
/******/ 						hotUpdateDownloaded();
/******/ 					}
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 		return fn;
/******/ 	}
/******/ 	
/******/ 	function hotCreateModule(moduleId) { // eslint-disable-line no-unused-vars
/******/ 		var hot = {
/******/ 			// private stuff
/******/ 			_acceptedDependencies: {},
/******/ 			_declinedDependencies: {},
/******/ 			_selfAccepted: false,
/******/ 			_selfDeclined: false,
/******/ 			_disposeHandlers: [],
/******/ 			_main: hotCurrentChildModule !== moduleId,
/******/ 	
/******/ 			// Module API
/******/ 			active: true,
/******/ 			accept: function(dep, callback) {
/******/ 				if(typeof dep === "undefined")
/******/ 					hot._selfAccepted = true;
/******/ 				else if(typeof dep === "function")
/******/ 					hot._selfAccepted = dep;
/******/ 				else if(typeof dep === "object")
/******/ 					for(var i = 0; i < dep.length; i++)
/******/ 						hot._acceptedDependencies[dep[i]] = callback || function() {};
/******/ 				else
/******/ 					hot._acceptedDependencies[dep] = callback || function() {};
/******/ 			},
/******/ 			decline: function(dep) {
/******/ 				if(typeof dep === "undefined")
/******/ 					hot._selfDeclined = true;
/******/ 				else if(typeof dep === "object")
/******/ 					for(var i = 0; i < dep.length; i++)
/******/ 						hot._declinedDependencies[dep[i]] = true;
/******/ 				else
/******/ 					hot._declinedDependencies[dep] = true;
/******/ 			},
/******/ 			dispose: function(callback) {
/******/ 				hot._disposeHandlers.push(callback);
/******/ 			},
/******/ 			addDisposeHandler: function(callback) {
/******/ 				hot._disposeHandlers.push(callback);
/******/ 			},
/******/ 			removeDisposeHandler: function(callback) {
/******/ 				var idx = hot._disposeHandlers.indexOf(callback);
/******/ 				if(idx >= 0) hot._disposeHandlers.splice(idx, 1);
/******/ 			},
/******/ 	
/******/ 			// Management API
/******/ 			check: hotCheck,
/******/ 			apply: hotApply,
/******/ 			status: function(l) {
/******/ 				if(!l) return hotStatus;
/******/ 				hotStatusHandlers.push(l);
/******/ 			},
/******/ 			addStatusHandler: function(l) {
/******/ 				hotStatusHandlers.push(l);
/******/ 			},
/******/ 			removeStatusHandler: function(l) {
/******/ 				var idx = hotStatusHandlers.indexOf(l);
/******/ 				if(idx >= 0) hotStatusHandlers.splice(idx, 1);
/******/ 			},
/******/ 	
/******/ 			//inherit from previous dispose call
/******/ 			data: hotCurrentModuleData[moduleId]
/******/ 		};
/******/ 		hotCurrentChildModule = undefined;
/******/ 		return hot;
/******/ 	}
/******/ 	
/******/ 	var hotStatusHandlers = [];
/******/ 	var hotStatus = "idle";
/******/ 	
/******/ 	function hotSetStatus(newStatus) {
/******/ 		hotStatus = newStatus;
/******/ 		for(var i = 0; i < hotStatusHandlers.length; i++)
/******/ 			hotStatusHandlers[i].call(null, newStatus);
/******/ 	}
/******/ 	
/******/ 	// while downloading
/******/ 	var hotWaitingFiles = 0;
/******/ 	var hotChunksLoading = 0;
/******/ 	var hotWaitingFilesMap = {};
/******/ 	var hotRequestedFilesMap = {};
/******/ 	var hotAvailableFilesMap = {};
/******/ 	var hotDeferred;
/******/ 	
/******/ 	// The update info
/******/ 	var hotUpdate, hotUpdateNewHash;
/******/ 	
/******/ 	function toModuleId(id) {
/******/ 		var isNumber = (+id) + "" === id;
/******/ 		return isNumber ? +id : id;
/******/ 	}
/******/ 	
/******/ 	function hotCheck(apply) {
/******/ 		if(hotStatus !== "idle") throw new Error("check() is only allowed in idle status");
/******/ 		hotApplyOnUpdate = apply;
/******/ 		hotSetStatus("check");
/******/ 		return hotDownloadManifest().then(function(update) {
/******/ 			if(!update) {
/******/ 				hotSetStatus("idle");
/******/ 				return null;
/******/ 			}
/******/ 			hotRequestedFilesMap = {};
/******/ 			hotWaitingFilesMap = {};
/******/ 			hotAvailableFilesMap = update.c;
/******/ 			hotUpdateNewHash = update.h;
/******/ 	
/******/ 			hotSetStatus("prepare");
/******/ 			var promise = new Promise(function(resolve, reject) {
/******/ 				hotDeferred = {
/******/ 					resolve: resolve,
/******/ 					reject: reject
/******/ 				};
/******/ 			});
/******/ 			hotUpdate = {};
/******/ 			var chunkId = 0;
/******/ 			{ // eslint-disable-line no-lone-blocks
/******/ 				/*globals chunkId */
/******/ 				hotEnsureUpdateChunk(chunkId);
/******/ 			}
/******/ 			if(hotStatus === "prepare" && hotChunksLoading === 0 && hotWaitingFiles === 0) {
/******/ 				hotUpdateDownloaded();
/******/ 			}
/******/ 			return promise;
/******/ 		});
/******/ 	}
/******/ 	
/******/ 	function hotAddUpdateChunk(chunkId, moreModules) { // eslint-disable-line no-unused-vars
/******/ 		if(!hotAvailableFilesMap[chunkId] || !hotRequestedFilesMap[chunkId])
/******/ 			return;
/******/ 		hotRequestedFilesMap[chunkId] = false;
/******/ 		for(var moduleId in moreModules) {
/******/ 			if(Object.prototype.hasOwnProperty.call(moreModules, moduleId)) {
/******/ 				hotUpdate[moduleId] = moreModules[moduleId];
/******/ 			}
/******/ 		}
/******/ 		if(--hotWaitingFiles === 0 && hotChunksLoading === 0) {
/******/ 			hotUpdateDownloaded();
/******/ 		}
/******/ 	}
/******/ 	
/******/ 	function hotEnsureUpdateChunk(chunkId) {
/******/ 		if(!hotAvailableFilesMap[chunkId]) {
/******/ 			hotWaitingFilesMap[chunkId] = true;
/******/ 		} else {
/******/ 			hotRequestedFilesMap[chunkId] = true;
/******/ 			hotWaitingFiles++;
/******/ 			hotDownloadUpdateChunk(chunkId);
/******/ 		}
/******/ 	}
/******/ 	
/******/ 	function hotUpdateDownloaded() {
/******/ 		hotSetStatus("ready");
/******/ 		var deferred = hotDeferred;
/******/ 		hotDeferred = null;
/******/ 		if(!deferred) return;
/******/ 		if(hotApplyOnUpdate) {
/******/ 			hotApply(hotApplyOnUpdate).then(function(result) {
/******/ 				deferred.resolve(result);
/******/ 			}, function(err) {
/******/ 				deferred.reject(err);
/******/ 			});
/******/ 		} else {
/******/ 			var outdatedModules = [];
/******/ 			for(var id in hotUpdate) {
/******/ 				if(Object.prototype.hasOwnProperty.call(hotUpdate, id)) {
/******/ 					outdatedModules.push(toModuleId(id));
/******/ 				}
/******/ 			}
/******/ 			deferred.resolve(outdatedModules);
/******/ 		}
/******/ 	}
/******/ 	
/******/ 	function hotApply(options) {
/******/ 		if(hotStatus !== "ready") throw new Error("apply() is only allowed in ready status");
/******/ 		options = options || {};
/******/ 	
/******/ 		var cb;
/******/ 		var i;
/******/ 		var j;
/******/ 		var module;
/******/ 		var moduleId;
/******/ 	
/******/ 		function getAffectedStuff(updateModuleId) {
/******/ 			var outdatedModules = [updateModuleId];
/******/ 			var outdatedDependencies = {};
/******/ 	
/******/ 			var queue = outdatedModules.slice().map(function(id) {
/******/ 				return {
/******/ 					chain: [id],
/******/ 					id: id
/******/ 				};
/******/ 			});
/******/ 			while(queue.length > 0) {
/******/ 				var queueItem = queue.pop();
/******/ 				var moduleId = queueItem.id;
/******/ 				var chain = queueItem.chain;
/******/ 				module = installedModules[moduleId];
/******/ 				if(!module || module.hot._selfAccepted)
/******/ 					continue;
/******/ 				if(module.hot._selfDeclined) {
/******/ 					return {
/******/ 						type: "self-declined",
/******/ 						chain: chain,
/******/ 						moduleId: moduleId
/******/ 					};
/******/ 				}
/******/ 				if(module.hot._main) {
/******/ 					return {
/******/ 						type: "unaccepted",
/******/ 						chain: chain,
/******/ 						moduleId: moduleId
/******/ 					};
/******/ 				}
/******/ 				for(var i = 0; i < module.parents.length; i++) {
/******/ 					var parentId = module.parents[i];
/******/ 					var parent = installedModules[parentId];
/******/ 					if(!parent) continue;
/******/ 					if(parent.hot._declinedDependencies[moduleId]) {
/******/ 						return {
/******/ 							type: "declined",
/******/ 							chain: chain.concat([parentId]),
/******/ 							moduleId: moduleId,
/******/ 							parentId: parentId
/******/ 						};
/******/ 					}
/******/ 					if(outdatedModules.indexOf(parentId) >= 0) continue;
/******/ 					if(parent.hot._acceptedDependencies[moduleId]) {
/******/ 						if(!outdatedDependencies[parentId])
/******/ 							outdatedDependencies[parentId] = [];
/******/ 						addAllToSet(outdatedDependencies[parentId], [moduleId]);
/******/ 						continue;
/******/ 					}
/******/ 					delete outdatedDependencies[parentId];
/******/ 					outdatedModules.push(parentId);
/******/ 					queue.push({
/******/ 						chain: chain.concat([parentId]),
/******/ 						id: parentId
/******/ 					});
/******/ 				}
/******/ 			}
/******/ 	
/******/ 			return {
/******/ 				type: "accepted",
/******/ 				moduleId: updateModuleId,
/******/ 				outdatedModules: outdatedModules,
/******/ 				outdatedDependencies: outdatedDependencies
/******/ 			};
/******/ 		}
/******/ 	
/******/ 		function addAllToSet(a, b) {
/******/ 			for(var i = 0; i < b.length; i++) {
/******/ 				var item = b[i];
/******/ 				if(a.indexOf(item) < 0)
/******/ 					a.push(item);
/******/ 			}
/******/ 		}
/******/ 	
/******/ 		// at begin all updates modules are outdated
/******/ 		// the "outdated" status can propagate to parents if they don't accept the children
/******/ 		var outdatedDependencies = {};
/******/ 		var outdatedModules = [];
/******/ 		var appliedUpdate = {};
/******/ 	
/******/ 		var warnUnexpectedRequire = function warnUnexpectedRequire() {
/******/ 			console.warn("[HMR] unexpected require(" + result.moduleId + ") to disposed module");
/******/ 		};
/******/ 	
/******/ 		for(var id in hotUpdate) {
/******/ 			if(Object.prototype.hasOwnProperty.call(hotUpdate, id)) {
/******/ 				moduleId = toModuleId(id);
/******/ 				var result;
/******/ 				if(hotUpdate[id]) {
/******/ 					result = getAffectedStuff(moduleId);
/******/ 				} else {
/******/ 					result = {
/******/ 						type: "disposed",
/******/ 						moduleId: id
/******/ 					};
/******/ 				}
/******/ 				var abortError = false;
/******/ 				var doApply = false;
/******/ 				var doDispose = false;
/******/ 				var chainInfo = "";
/******/ 				if(result.chain) {
/******/ 					chainInfo = "\nUpdate propagation: " + result.chain.join(" -> ");
/******/ 				}
/******/ 				switch(result.type) {
/******/ 					case "self-declined":
/******/ 						if(options.onDeclined)
/******/ 							options.onDeclined(result);
/******/ 						if(!options.ignoreDeclined)
/******/ 							abortError = new Error("Aborted because of self decline: " + result.moduleId + chainInfo);
/******/ 						break;
/******/ 					case "declined":
/******/ 						if(options.onDeclined)
/******/ 							options.onDeclined(result);
/******/ 						if(!options.ignoreDeclined)
/******/ 							abortError = new Error("Aborted because of declined dependency: " + result.moduleId + " in " + result.parentId + chainInfo);
/******/ 						break;
/******/ 					case "unaccepted":
/******/ 						if(options.onUnaccepted)
/******/ 							options.onUnaccepted(result);
/******/ 						if(!options.ignoreUnaccepted)
/******/ 							abortError = new Error("Aborted because " + moduleId + " is not accepted" + chainInfo);
/******/ 						break;
/******/ 					case "accepted":
/******/ 						if(options.onAccepted)
/******/ 							options.onAccepted(result);
/******/ 						doApply = true;
/******/ 						break;
/******/ 					case "disposed":
/******/ 						if(options.onDisposed)
/******/ 							options.onDisposed(result);
/******/ 						doDispose = true;
/******/ 						break;
/******/ 					default:
/******/ 						throw new Error("Unexception type " + result.type);
/******/ 				}
/******/ 				if(abortError) {
/******/ 					hotSetStatus("abort");
/******/ 					return Promise.reject(abortError);
/******/ 				}
/******/ 				if(doApply) {
/******/ 					appliedUpdate[moduleId] = hotUpdate[moduleId];
/******/ 					addAllToSet(outdatedModules, result.outdatedModules);
/******/ 					for(moduleId in result.outdatedDependencies) {
/******/ 						if(Object.prototype.hasOwnProperty.call(result.outdatedDependencies, moduleId)) {
/******/ 							if(!outdatedDependencies[moduleId])
/******/ 								outdatedDependencies[moduleId] = [];
/******/ 							addAllToSet(outdatedDependencies[moduleId], result.outdatedDependencies[moduleId]);
/******/ 						}
/******/ 					}
/******/ 				}
/******/ 				if(doDispose) {
/******/ 					addAllToSet(outdatedModules, [result.moduleId]);
/******/ 					appliedUpdate[moduleId] = warnUnexpectedRequire;
/******/ 				}
/******/ 			}
/******/ 		}
/******/ 	
/******/ 		// Store self accepted outdated modules to require them later by the module system
/******/ 		var outdatedSelfAcceptedModules = [];
/******/ 		for(i = 0; i < outdatedModules.length; i++) {
/******/ 			moduleId = outdatedModules[i];
/******/ 			if(installedModules[moduleId] && installedModules[moduleId].hot._selfAccepted)
/******/ 				outdatedSelfAcceptedModules.push({
/******/ 					module: moduleId,
/******/ 					errorHandler: installedModules[moduleId].hot._selfAccepted
/******/ 				});
/******/ 		}
/******/ 	
/******/ 		// Now in "dispose" phase
/******/ 		hotSetStatus("dispose");
/******/ 		Object.keys(hotAvailableFilesMap).forEach(function(chunkId) {
/******/ 			if(hotAvailableFilesMap[chunkId] === false) {
/******/ 				hotDisposeChunk(chunkId);
/******/ 			}
/******/ 		});
/******/ 	
/******/ 		var idx;
/******/ 		var queue = outdatedModules.slice();
/******/ 		while(queue.length > 0) {
/******/ 			moduleId = queue.pop();
/******/ 			module = installedModules[moduleId];
/******/ 			if(!module) continue;
/******/ 	
/******/ 			var data = {};
/******/ 	
/******/ 			// Call dispose handlers
/******/ 			var disposeHandlers = module.hot._disposeHandlers;
/******/ 			for(j = 0; j < disposeHandlers.length; j++) {
/******/ 				cb = disposeHandlers[j];
/******/ 				cb(data);
/******/ 			}
/******/ 			hotCurrentModuleData[moduleId] = data;
/******/ 	
/******/ 			// disable module (this disables requires from this module)
/******/ 			module.hot.active = false;
/******/ 	
/******/ 			// remove module from cache
/******/ 			delete installedModules[moduleId];
/******/ 	
/******/ 			// remove "parents" references from all children
/******/ 			for(j = 0; j < module.children.length; j++) {
/******/ 				var child = installedModules[module.children[j]];
/******/ 				if(!child) continue;
/******/ 				idx = child.parents.indexOf(moduleId);
/******/ 				if(idx >= 0) {
/******/ 					child.parents.splice(idx, 1);
/******/ 				}
/******/ 			}
/******/ 		}
/******/ 	
/******/ 		// remove outdated dependency from module children
/******/ 		var dependency;
/******/ 		var moduleOutdatedDependencies;
/******/ 		for(moduleId in outdatedDependencies) {
/******/ 			if(Object.prototype.hasOwnProperty.call(outdatedDependencies, moduleId)) {
/******/ 				module = installedModules[moduleId];
/******/ 				if(module) {
/******/ 					moduleOutdatedDependencies = outdatedDependencies[moduleId];
/******/ 					for(j = 0; j < moduleOutdatedDependencies.length; j++) {
/******/ 						dependency = moduleOutdatedDependencies[j];
/******/ 						idx = module.children.indexOf(dependency);
/******/ 						if(idx >= 0) module.children.splice(idx, 1);
/******/ 					}
/******/ 				}
/******/ 			}
/******/ 		}
/******/ 	
/******/ 		// Not in "apply" phase
/******/ 		hotSetStatus("apply");
/******/ 	
/******/ 		hotCurrentHash = hotUpdateNewHash;
/******/ 	
/******/ 		// insert new code
/******/ 		for(moduleId in appliedUpdate) {
/******/ 			if(Object.prototype.hasOwnProperty.call(appliedUpdate, moduleId)) {
/******/ 				modules[moduleId] = appliedUpdate[moduleId];
/******/ 			}
/******/ 		}
/******/ 	
/******/ 		// call accept handlers
/******/ 		var error = null;
/******/ 		for(moduleId in outdatedDependencies) {
/******/ 			if(Object.prototype.hasOwnProperty.call(outdatedDependencies, moduleId)) {
/******/ 				module = installedModules[moduleId];
/******/ 				moduleOutdatedDependencies = outdatedDependencies[moduleId];
/******/ 				var callbacks = [];
/******/ 				for(i = 0; i < moduleOutdatedDependencies.length; i++) {
/******/ 					dependency = moduleOutdatedDependencies[i];
/******/ 					cb = module.hot._acceptedDependencies[dependency];
/******/ 					if(callbacks.indexOf(cb) >= 0) continue;
/******/ 					callbacks.push(cb);
/******/ 				}
/******/ 				for(i = 0; i < callbacks.length; i++) {
/******/ 					cb = callbacks[i];
/******/ 					try {
/******/ 						cb(moduleOutdatedDependencies);
/******/ 					} catch(err) {
/******/ 						if(options.onErrored) {
/******/ 							options.onErrored({
/******/ 								type: "accept-errored",
/******/ 								moduleId: moduleId,
/******/ 								dependencyId: moduleOutdatedDependencies[i],
/******/ 								error: err
/******/ 							});
/******/ 						}
/******/ 						if(!options.ignoreErrored) {
/******/ 							if(!error)
/******/ 								error = err;
/******/ 						}
/******/ 					}
/******/ 				}
/******/ 			}
/******/ 		}
/******/ 	
/******/ 		// Load self accepted modules
/******/ 		for(i = 0; i < outdatedSelfAcceptedModules.length; i++) {
/******/ 			var item = outdatedSelfAcceptedModules[i];
/******/ 			moduleId = item.module;
/******/ 			hotCurrentParents = [moduleId];
/******/ 			try {
/******/ 				__webpack_require__(moduleId);
/******/ 			} catch(err) {
/******/ 				if(typeof item.errorHandler === "function") {
/******/ 					try {
/******/ 						item.errorHandler(err);
/******/ 					} catch(err2) {
/******/ 						if(options.onErrored) {
/******/ 							options.onErrored({
/******/ 								type: "self-accept-error-handler-errored",
/******/ 								moduleId: moduleId,
/******/ 								error: err2,
/******/ 								orginalError: err
/******/ 							});
/******/ 						}
/******/ 						if(!options.ignoreErrored) {
/******/ 							if(!error)
/******/ 								error = err2;
/******/ 						}
/******/ 						if(!error)
/******/ 							error = err;
/******/ 					}
/******/ 				} else {
/******/ 					if(options.onErrored) {
/******/ 						options.onErrored({
/******/ 							type: "self-accept-errored",
/******/ 							moduleId: moduleId,
/******/ 							error: err
/******/ 						});
/******/ 					}
/******/ 					if(!options.ignoreErrored) {
/******/ 						if(!error)
/******/ 							error = err;
/******/ 					}
/******/ 				}
/******/ 			}
/******/ 		}
/******/ 	
/******/ 		// handle errors in accept handlers and self accepted module load
/******/ 		if(error) {
/******/ 			hotSetStatus("fail");
/******/ 			return Promise.reject(error);
/******/ 		}
/******/ 	
/******/ 		hotSetStatus("idle");
/******/ 		return new Promise(function(resolve) {
/******/ 			resolve(outdatedModules);
/******/ 		});
/******/ 	}
/******/
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {},
/******/ 			hot: hotCreateModule(moduleId),
/******/ 			parents: (hotCurrentParentsTemp = hotCurrentParents, hotCurrentParents = [], hotCurrentParentsTemp),
/******/ 			children: []
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, hotCreateRequire(moduleId));
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// identity function for calling harmony imports with the correct context
/******/ 	__webpack_require__.i = function(value) { return value; };
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "/assets/";
/******/
/******/ 	// __webpack_hash__
/******/ 	__webpack_require__.h = function() { return hotCurrentHash; };
/******/
/******/ 	// Load entry module and return exports
/******/ 	return hotCreateRequire(2)(__webpack_require__.s = 2);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("Object.defineProperty(__webpack_exports__, \"__esModule\", { value: true });\n/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__musicdb_js__ = __webpack_require__(1);\n/*jshint esversion: 6 */\n/*globals Vue, navigator, window, setTimeout, MediaMetadata, console, fetch, URL, document, confirm, alert, MusicDB, NoSleep, Worker */\n\n\n// (function () {\n\"use strict\";\n\nvar pages = {\n  front: \"front\",\n  play: \"play\"\n};\n\nVue.component('audio-player', {\n  template: '#audio-player-template',\n  mounted: function () {\n    this.decoded = {};\n    this.pauseCount = 0;\n    this.$refs.audio.src = \"./empty.mp3\";\n    this.$refs.audio.addEventListener('ended', e => this.$emit('ended'));\n    // try to setup media session controls.\n    if ('mediaSession' in navigator) {\n      log(\"setup controls\");\n      navigator.mediaSession.setActionHandler('pause', _ => {\n        this.pauseCount += 1;\n        setTimeout(_ => {\n          this.pauseCount = 0;\n        }, 5000);\n        log('> User clicked \"Pause\" icon', this.pauseCount);\n        log(this.$refs.audio.paused);\n        if (this.pauseCount > 3) {\n          log(\"cheat code, playing another album\");\n        }\n        if (this.$refs.audio.paused) {\n          this.$refs.audio.play();\n        } else {\n          this.$refs.audio.pause();\n        }\n      });\n\n      navigator.mediaSession.setActionHandler('nexttrack', _ => {\n        log('> User clicked \"Next Track\" icon. mmmh');\n        this.$parent.playNext();\n      });\n\n      navigator.mediaSession.setActionHandler('previoustrack', function () {\n        log('> User clicked \"Previous Track\" icon. '); // TODO\n      });\n    }\n  },\n  computed: {\n    playHack: function () {\n      if (this.currentItem) {\n        var component = this;\n        this.$refs.audio.src = this.currentItem.item_url;\n        this.$refs.audio.play().then(_ => {\n          if ('mediaSession' in navigator) {\n            this.$parent.musicdb.getAlbumCoverUrl({ id: this.currentItem.album_id }).then(cover_url => {\n              log(\"cover_url\", cover_url);\n              navigator.mediaSession.metadata = new MediaMetadata({\n                title: this.currentItem.title,\n                artist: this.currentItem.artist,\n                album: this.currentItem.album,\n                artwork: [{ src: cover_url,\n                  sizes: '96x96',\n                  type: 'image/png' }, { src: cover_url,\n                  sizes: '128x128',\n                  type: 'image/png' }, { src: cover_url,\n                  sizes: '192x192',\n                  type: 'image/png' }, { src: cover_url,\n                  sizes: '256x256',\n                  type: 'image/png' }, { src: cover_url,\n                  sizes: '384x384',\n                  type: 'image/png' }, { src: cover_url,\n                  sizes: '512x512',\n                  type: 'image/png' }]\n              });\n            });\n          }\n        });\n        this.$refs.audio.addEventListener('error', function (e) {\n          /* We cannot play this source, it must be a FLAC.\n             Let's try to convert it.\n          */\n          if (component.decoded[component.currentItem.item_url]) {\n            /* we could not convert */\n            console.error(\"already failed\");\n            return;\n          }\n          // XXX do not keep all failed, just not to retry failed forever ...\n          component.decoded[component.currentItem.item_url] = 1;\n\n          fetch(component.currentItem.item_url).then(response => response.arrayBuffer()).then(function (buffer) {\n            var outData = {},\n                fileData = {},\n                item_url = component.currentItem.id;\n            outData[item_url + \".wav\"] = { \"MIME\": \"audio/wav\" };\n            fileData[item_url + \".flac\"] = new Uint8Array(buffer);\n            console.log(component.currentItem, outData, fileData);\n\n            app.worker.postMessage({\n              command: 'encode',\n              args: [\"-d\", item_url + \".flac\"],\n              outData: outData,\n              fileData: fileData });\n            app.worker.onmessage = function (e) {\n              var fileName, blob, url;\n              if (e.data.reply == \"done\") {\n                for (fileName in e.data.values) {\n                  blob = e.data.values[fileName].blob;\n                  if (false) {\n                    URL.revokeObjectURL(component.url);\n                  }\n                  // Are we still playing same song or was it changed ?\n                  if (fileName === component.currentItem.id + \".wav\") {\n                    component.url = URL.createObjectURL(blob);\n                    component.$refs.audio.src = component.url;\n                    component.$refs.audio.play();\n                  }\n                }\n              } else {\n                //console.log(e);\n              }\n            };\n          }, console.error);\n        });\n      }\n    }\n  },\n  props: [\"currentItem\"]\n});\n\n// app Vue instance\nvar app = new Vue({\n  data: {\n    beets_url: '',\n    playlist: [],\n    random_albums: [],\n    current_item: null,\n    musicdb: null,\n    current_page: null,\n    loading: false,\n    current_title: \"ahah\",\n    debugzone: \"\"\n  },\n  watch: {\n    beets_url: function (beets_url) {\n      if (beets_url) {\n        this.musicdb = new __WEBPACK_IMPORTED_MODULE_0__musicdb_js__[\"a\" /* MusicDB */](beets_url);\n      }\n    },\n    current_item: function (current_item) {\n      document.title = current_item.title + \" ⚡ \" + current_item.artist;\n    },\n    current_page: function (current_page) {\n      console.log(\"current page\", current_page);\n      // XXX\n      if (current_page == 'front') {\n        this.current_page = null;\n        return this.get4RandomAlbums();\n      }\n      if (current_page == 'updateDb') {\n        alert(\"update db start\");\n        return this.updateDb();\n      }\n      if (current_page == 'play') {}\n    }\n  },\n\n  methods: {\n    get4RandomAlbums: function () {\n      var vue = this,\n          db = this.musicdb;\n      if (db) {\n        Promise.all([db.getRandomAlbum(), db.getRandomAlbum(), db.getRandomAlbum(), db.getRandomAlbum()]).then(function (albums) {\n          vue.random_albums = albums;\n        });\n      }\n    },\n    playSong: function (song) {\n      this.current_item = song;\n    },\n    route_playAlbum: function (album) {\n      window.location.hash = \"album/\" + album.id;\n    },\n    playAlbum: function (album_id) {\n      var vue = this;\n      this.current_page = \"playing.\" + album_id;\n      this.musicdb.getItemsFromAlbum(album_id).then(function (items) {\n        vue.playlist = items;\n        vue.current_item = items[0];\n      });\n    },\n    playNext: function () {\n      for (var i = 0; i < this.playlist.length - 1; i++) {\n        if (this.current_item.id == this.playlist[i].id) {\n          this.current_item = this.playlist[i + 1];\n          return;\n        }\n      }\n    },\n    updateDb: function () {\n      if (confirm(\"update db\")) {\n        this.loading = true;\n        this.musicdb.loadDatabase().then(function () {\n          this.loading = false;alert('fini');\n        }).catch(function (e) {\n          console.error(\"Failed loading database !\", e);\n          alert(\"loading failed \" + e);\n        });\n      }\n    }\n  }\n});\n\n// mount\napp.$mount(\".player\");\n\n// On chrome mobile we can only start playing in an event handler.\n// https://bugs.chromium.org/p/chromium/issues/detail?id=138132\ndocument.body.addEventListener('click', function (event) {\n  document.getElementById(\"audio_player\").play();\n\n  if ('wakeLock' in navigator) {\n    navigator.wakeLock.request(\"system\").then(function successFunction() {\n      // success\n      log('cool wakelock');\n    }, function errorFunction() {\n      // error\n      log(\"wake lock refused\");\n    });\n  } else {\n    var noSleep = new NoSleep();\n    noSleep.enable();\n  }\n});\n\napp.beets_url = 'https://coralgarden.my.to/beet/api'; // XXX TODO make this configurabel\n//app.beets_url = 'https://coralgarden.hacked.jp/beet/api'; // XXX TODO save this\n\napp.worker = new Worker('worker/EmsWorkerProxy.js');\n\n// handle routing\nfunction onHashChange() {\n  var page = window.location.hash.replace(/#\\/?/, '');\n  console.log(\"onHashChange\", page);\n  if (page.indexOf('album') === 0) {\n    console.log(\"ok\", page.split(\"/\"));\n    try {\n      app.playAlbum(parseInt(page.split(\"/\")[1], 10));\n    } catch (e) {\n      console.error(e);\n    }\n  } else {\n    if (pages[page]) {\n      console.log(\"page\", page);\n      app.current_page = page;\n      window.location.hash = '';\n    } else {\n      app.current_page = 'front';\n    }\n    // app.current_page = page\n  }\n}\nwindow.addEventListener('hashchange', onHashChange);\nsetTimeout(onHashChange, 1);\n\nfunction log() {\n  var line = Array.prototype.slice.call(arguments).map(function (argument) {\n    return typeof argument === 'string' ? argument : JSON.stringify(argument);\n  }).join(' ');\n\n  document.querySelector('#log').textContent += line + '\\n';\n  console.log(Array.prototype.slice.call(arguments));\n}\n\nif ('serviceWorker' in navigator) {\n  window.addEventListener('load', function () {\n    navigator.serviceWorker.register('./sw.js').then(function (registration) {\n      // Registration was successful\n      log('ServiceWorker registration successful with scope: ', registration.scope);\n    }, function (err) {\n      // registration failed :(\n      log('ServiceWorker registration failed: ', err);\n    });\n  });\n  log(\"çà marche\");\n}\nlog(\"bonjour !\");\n\n// })();\n\n//////////////////\n// WEBPACK FOOTER\n// ./public/js/app.js\n// module id = 0\n// module chunks = 0\n\n//# sourceURL=webpack:///./public/js/app.js?");

/***/ }),
/* 1 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, \"a\", function() { return MusicDB; });\n/*jshint esversion: 6 */\n/*globals window, fetch, console, _ */\n//(function () {\n\n\nfunction MusicDB(url) {\n  // this.beets_url = \"http://\" + host + \":\" + port;\n  this.beets_url = url;\n\n  this.db_version = 49;\n  this.db_name = \"beets\";\n}\n\n// helper method to open a database and make a promise.\n// callback is called with db, resolve, reject\nvar openDatabase = function (musicdb, callback) {\n  return new Promise(function (resolve, reject) {\n    var request = window.indexedDB.open(musicdb.db_name, musicdb.db_version);\n\n    request.onerror = reject;\n\n    request.onupgradeneeded = function (event) {\n      var objectStore,\n          db = event.target.result;\n\n      if (db.objectStoreNames.contains(\"items\")) {\n        db.deleteObjectStore(\"items\");\n      }\n      if (db.objectStoreNames.contains(\"albums\")) {\n        db.deleteObjectStore(\"albums\");\n      }\n      if (db.objectStoreNames.contains(\"artists\")) {\n        db.deleteObjectStore(\"artists\");\n      }\n      if (!db.objectStoreNames.contains(\"items\")) {\n        objectStore = db.createObjectStore(\"items\", { keyPath: \"__id\", autoIncrement: true });\n        objectStore.createIndex(\"id\", \"id\", { unique: false }); // XXX ??? see 1704 \n        objectStore.createIndex(\"album\", \"album\", { unique: false });\n        objectStore.createIndex(\"album_id\", \"album_id\", { unique: false });\n        objectStore.createIndex(\"albumartist\", \"albumartist\", { unique: false });\n      }\n      if (!db.objectStoreNames.contains(\"albums\")) {\n        objectStore = db.createObjectStore(\"albums\", { keyPath: \"__id\", autoIncrement: true });\n        objectStore.createIndex(\"id\", \"id\", { unique: false }); // XXX ??? see 1704 \n        objectStore.createIndex(\"album\", \"album\", { unique: false });\n        objectStore.createIndex(\"albumartist\", \"albumartist\", { unique: false });\n      }\n    };\n\n    request.onsuccess = function (event) {\n      callback(event.target.result, resolve, reject);\n    };\n  });\n};\n\nMusicDB.prototype.getItemsFromAlbum = function (albumId) {\n  var musicdb = this;\n  return openDatabase(this, function (db, resolve, reject) {\n    var albumStore = db.transaction(\"items\", \"readonly\").objectStore(\"items\");\n    var req = albumStore.index(\"album_id\").openCursor(albumId),\n        itemList = [];\n    req.onerror = reject;\n    req.onsuccess = function (e) {\n      try {\n        var cursor = e.target.result;\n        if (cursor) {\n          musicdb.getItemSrcUrl(cursor.value).then(function (url) {\n            cursor.value.item_url = url;\n            itemList.push(cursor.value);\n          });\n          return cursor.continue();\n        }\n        resolve(_.sortBy(itemList, [\"track\"]).reverse());\n      } catch (error) {\n        reject(error);\n      }\n    };\n  });\n};\n\n// return URL for cover image data\nMusicDB.prototype.getAlbumCoverUrl = function (album) {\n  var musicdb = this;\n  return new Promise(function (resolve, reject) {\n    return resolve(musicdb.beets_url + \"/album/\" + album.id + \"/art\");\n  });\n};\n\n// return URL for audio source data\nMusicDB.prototype.getItemSrcUrl = function (item) {\n  var musicdb = this;\n  return new Promise(function (resolve, reject) {\n    resolve(musicdb.beets_url + \"/item/\" + item.id + \"/file\");\n  });\n};\n\nMusicDB.prototype.loadDatabase = function () {\n  console.log(this);\n  return this.newLoadDatabase();\n};\nMusicDB.prototype.newloadDatabase = function () {\n  console.log(\"new loadDb\");\n  var musicdb = this;\n};\n\n// populate the database TODO: progress callback ?\nMusicDB.prototype.oldloadDatabase = function () {\n  console.log(\"loadDb\");\n  var musicdb = this;\n  // utility for fetch\n  function getJson(response) {\n    return response.json();\n  }\n  // insert data in storeName, junk by junk\n  function populateStore(storeName, data) {\n    return openDatabase(musicdb, function (db, resolve, reject) {\n      function insertNext(i, store) {\n        if (i === 0) {\n          return resolve(null);\n        }\n        var req = store.add(data[i]);\n        req.onsuccess = function (evt) {\n          try {\n            if (i % 300 === 0) {\n              // start a new transaction.\n              console.log(\"Insertion in \" + storeName + \" successful\", i);\n              insertNext(i - 1, db.transaction(storeName, \"readwrite\").objectStore(storeName));\n            } else {\n              insertNext(i - 1, store);\n            }\n          } catch (e) {\n            reject(e);\n          }\n        };\n        req.onerror = function (e) {\n          reject(new Error(\"Error inserting \" + JSON.stringify(data[i]) + \"\\nerror: \" + e.target.error));\n        };\n      }\n      // start inserting\n      insertNext(data.length - 1, db.transaction(storeName, \"readwrite\").objectStore(storeName));\n    });\n  }\n\n  return openDatabase(this, function (db, resolve, reject) {\n    var tx = db.transaction(['items', /* 'artists', */'albums'], 'readwrite');\n    tx.onerror = reject;\n    tx.oncomplete = resolve;\n    function clearObjectStore(storeName) {\n      return new Promise(function (resolve_, reject_) {\n        var clearTransaction = tx.objectStore(storeName).clear();\n        clearTransaction.onerror = reject_;\n        clearTransaction.onsuccess = resolve_;\n      });\n    }\n    return Promise.all([clearObjectStore('items'),\n    // clearObjectStore('artists'),\n    clearObjectStore('albums')]).then(resolve);\n  }).then(function () {\n    return Promise.all([fetch(musicdb.beets_url + \"/album/\").then(getJson).then(function (result) {\n      return populateStore(\"albums\", result.albums);\n    }), fetch(musicdb.beets_url + \"/item/\").then(getJson).then(function (result) {\n      return populateStore(\"items\", result.items);\n    })]);\n  });\n};\n\nMusicDB.prototype.countAlbums = function () {\n  return openDatabase(this, function (db, resolve, reject) {\n    var albumStore = db.transaction(\"albums\", \"readonly\").objectStore(\"albums\");\n    var req = albumStore.count();\n    req.onsuccess = function () {\n      resolve(this.result);\n    };\n    req.onerror = function (e) {\n      reject(e);\n    };\n  });\n};\n\n// return a random album from the music db\nMusicDB.prototype.getRandomAlbum = function () {\n  var musicdb = this;\n  function getRandomInt(min, max) {\n    return Math.floor(Math.random() * (max - min + 1)) + min;\n  }\n\n  return this.countAlbums().then(function (albumCount) {\n    return openDatabase(musicdb, function (db, resolve, reject) {\n      var albumStore = db.transaction(\"albums\", \"readonly\").objectStore(\"albums\");\n      var req = albumStore.openCursor();\n      var alreadyAdvanced = false;\n\n      req.onsuccess = function (e) {\n        try {\n          var cursor = e.target.result;\n          if (!alreadyAdvanced) {\n            var advance = getRandomInt(0, albumCount - 1);\n            alreadyAdvanced = true;\n            if (advance > 0) {\n              return cursor.advance(advance);\n            }\n          }\n          if (cursor) {\n            return musicdb.getAlbumCoverUrl(cursor.value).then(function (cover_url) {\n              cursor.value.cover_url = cover_url;\n              return resolve(cursor.value);\n            });\n          }\n          reject(\"Error counting albums\");\n        } catch (error) {\n          reject(error);\n        }\n      };\n      req.onerror = reject;\n    });\n  });\n};\n\n//module.exports = MusicDB;\n\n\n//})();\n\n//////////////////\n// WEBPACK FOOTER\n// ./public/js/musicdb.js\n// module id = 1\n// module chunks = 0\n\n//# sourceURL=webpack:///./public/js/musicdb.js?");

/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

eval("module.exports = __webpack_require__(0);\n\n\n//////////////////\n// WEBPACK FOOTER\n// multi ./public/js/app.js\n// module id = 2\n// module chunks = 0\n\n//# sourceURL=webpack:///multi_./public/js/app.js?");

/***/ })
/******/ ]);