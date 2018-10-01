(function(self) {
  "use strict";
  if (self.AbortController) {
    return;
  }

  class AbortController {
    constructor() {
      this.signal = { aborted: false };
    }
    abort() {
      this.signal.aborted = true;
    }
  }

  self.AbortController = AbortController;
})(typeof global !== "undefined" ? global : this);
