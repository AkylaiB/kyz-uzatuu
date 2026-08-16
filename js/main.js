/**
 * Wedding invitation — entry point
 */
(function initWeddingInvitation() {
  "use strict";

  document.documentElement.classList.add("js");

  var app = window.WeddingInvitation;

  if (!app) {
    return;
  }

  if (typeof app.initIntro === "function") {
    app.initIntro();
  }

  if (typeof app.initReveal === "function") {
    app.initReveal();
  }

  if (typeof app.initWishes === "function") {
    app.initWishes();
  }
})();
