/**
 * Intro — play shell-open video, freeze the last pearl frame, show invitation copy
 */
(function createIntroScene() {
  "use strict";

  var IntroState = Object.freeze({
    CLOSED: "CLOSED",
    PLAYING: "PLAYING",
    ENDED: "ENDED",
  });

  var root = window.WeddingInvitation || {};
  window.WeddingInvitation = root;

  function prefersReducedMotion() {
    if (typeof root.prefersReducedMotion === "function") {
      return root.prefersReducedMotion();
    }

    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function initIntro() {
    var intro = document.getElementById("intro");
    var trigger = intro && intro.querySelector(".intro__trigger");
    var video = intro && intro.querySelector(".intro__video");
    var text = intro && intro.querySelector(".intro__text");
    var invitation = document.getElementById("invitation");
    var skipLink = document.querySelector(".skip-link");
    var music = document.getElementById("intro-music");
    var musicToggle = document.querySelector(".music-toggle");

    if (!intro || !trigger || !video || !text || !invitation) {
      return;
    }

    var finished = false;
    var endWatchTimer = 0;
    var safetyTimer = 0;

    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    video.playsInline = true;
    video.muted = true;

    function syncMusicButton() {
      if (!musicToggle || !music) {
        return;
      }

      musicToggle.hidden = false;
      musicToggle.setAttribute("aria-pressed", music.paused ? "false" : "true");
      musicToggle.setAttribute(
        "aria-label",
        music.paused ? "Включить музыку" : "Выключить музыку"
      );
    }

    function startMusic() {
      if (!music) {
        return;
      }

      music.volume = 0.48;
      var playAttempt = music.play();

      if (playAttempt && typeof playAttempt.catch === "function") {
        playAttempt.catch(function () {
          syncMusicButton();
        });
      }

      syncMusicButton();
    }

    if (musicToggle && music) {
      musicToggle.addEventListener("click", function () {
        if (music.paused) {
          startMusic();
        } else {
          music.pause();
          syncMusicButton();
        }
      });

      music.addEventListener("play", syncMusicButton);
      music.addEventListener("pause", syncMusicButton);
    }

    function clearTimers() {
      window.clearInterval(endWatchTimer);
      window.clearTimeout(safetyTimer);
      endWatchTimer = 0;
      safetyTimer = 0;
    }

    function hasFiniteDuration() {
      return isFinite(video.duration) && video.duration > 0;
    }

    function isNearEnd() {
      if (!hasFiniteDuration()) {
        return Boolean(video.ended);
      }

      return video.ended || video.currentTime >= video.duration - 0.35;
    }

    function showFirstFrame() {
      if (intro.dataset.state !== IntroState.CLOSED) {
        return;
      }

      if (!hasFiniteDuration() || video.readyState < 1) {
        return;
      }

      try {
        if (video.currentTime < 0.01) {
          video.currentTime = 0.001;
        }
      } catch (error) {
        /* Seeking can fail before metadata is ready. */
      }
    }

    video.addEventListener("loadeddata", showFirstFrame);
    video.addEventListener("loadedmetadata", showFirstFrame);

    if (video.readyState >= 1) {
      showFirstFrame();
    }

    function freezeLastFrame() {
      if (!hasFiniteDuration()) {
        try {
          video.pause();
        } catch (error) {
          /* ignore */
        }
        return;
      }

      try {
        video.pause();
        /* Avoid seeking on iOS right at the absolute end — it can blank the frame. */
        var target = Math.max(0, video.duration - 0.12);
        if (Math.abs(video.currentTime - target) > 0.2) {
          video.currentTime = target;
        }
      } catch (error) {
        /* Seeking can fail on mobile. */
      }
    }

    function scheduleAutoScroll() {
      if (prefersReducedMotion()) {
        return;
      }

      var cancelled = false;
      var timer = 0;

      function stopListening() {
        window.removeEventListener("wheel", onUserScroll);
        window.removeEventListener("touchstart", onUserScroll);
        window.removeEventListener("pointerdown", onUserScroll);
        window.removeEventListener("keydown", onKey);
      }

      function cancelAutoScroll() {
        if (cancelled) {
          return;
        }

        cancelled = true;
        window.clearTimeout(timer);
        stopListening();
      }

      function onUserScroll(event) {
        if (
          event.target &&
          event.target.closest &&
          event.target.closest(".music-toggle")
        ) {
          return;
        }

        cancelAutoScroll();
      }

      function onKey(event) {
        if (
          event.key === "ArrowDown" ||
          event.key === "ArrowUp" ||
          event.key === "PageDown" ||
          event.key === "PageUp" ||
          event.key === "Home" ||
          event.key === "End" ||
          event.key === " "
        ) {
          cancelAutoScroll();
        }
      }

      window.addEventListener("wheel", onUserScroll, { passive: true });
      window.addEventListener("touchstart", onUserScroll, { passive: true });
      window.addEventListener("pointerdown", onUserScroll, { passive: true });
      window.addEventListener("keydown", onKey);

      timer = window.setTimeout(function () {
        if (cancelled) {
          return;
        }

        var target = document.querySelector(".details-scene");

        if (!target) {
          cancelAutoScroll();
          return;
        }

        var top = target.getBoundingClientRect().top + window.pageYOffset - 8;

        window.scrollTo({
          top: Math.max(0, top),
          behavior: "smooth",
        });

        stopListening();
      }, 2800);
    }

    function showInvitation() {
      if (finished) {
        return;
      }

      finished = true;
      clearTimers();
      intro.dataset.state = IntroState.ENDED;
      document.body.dataset.scene = "invitation";
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
      text.setAttribute("aria-hidden", "false");
      invitation.setAttribute("aria-hidden", "false");
      trigger.disabled = true;
      trigger.setAttribute("aria-disabled", "true");
      trigger.setAttribute("tabindex", "-1");
      freezeLastFrame();
      scheduleAutoScroll();
    }

    function jumpToEnd(thenShow) {
      function finishJump() {
        video.removeEventListener("seeked", finishJump);
        freezeLastFrame();
        if (thenShow) {
          showInvitation();
        }
      }

      if (!hasFiniteDuration()) {
        video.addEventListener(
          "loadedmetadata",
          function onMeta() {
            video.removeEventListener("loadedmetadata", onMeta);
            jumpToEnd(thenShow);
          },
          { once: true }
        );
        window.setTimeout(function () {
          if (!finished && thenShow) {
            showInvitation();
          }
        }, 1200);
        return;
      }

      video.addEventListener("seeked", finishJump);
      try {
        video.currentTime = Math.max(0, video.duration - 0.12);
      } catch (error) {
        finishJump();
      }

      window.setTimeout(function () {
        if (!finished && thenShow) {
          finishJump();
        }
      }, 800);
    }

    function watchForEnd() {
      if (finished) {
        clearTimers();
        return;
      }

      if (isNearEnd()) {
        showInvitation();
      }
    }

    function playIntro() {
      if (intro.dataset.state !== IntroState.CLOSED) {
        return;
      }

      startMusic();
      trigger.disabled = true;
      trigger.setAttribute("aria-disabled", "true");
      document.body.style.overflow = "hidden";

      if (prefersReducedMotion()) {
        intro.dataset.state = IntroState.PLAYING;
        jumpToEnd(true);
        return;
      }

      clearTimers();

      function startWatchers() {
        endWatchTimer = window.setInterval(watchForEnd, 200);
        safetyTimer = window.setTimeout(function () {
          if (!finished) {
            showInvitation();
          }
        }, hasFiniteDuration() ? Math.ceil(video.duration * 1000) + 2000 : 10000);
      }

      function beginPlayback() {
        if (
          finished ||
          intro.dataset.state === IntroState.PLAYING ||
          intro.dataset.state === IntroState.ENDED
        ) {
          return;
        }

        intro.dataset.state = IntroState.PLAYING;
        startWatchers();

        var playAttempt = video.play();

        if (playAttempt && typeof playAttempt.then === "function") {
          playAttempt.catch(function () {
            jumpToEnd(true);
          });
        }
      }

      /* Wait until the first frame is ready — large files otherwise blank out. */
      if (video.readyState >= 2) {
        beginPlayback();
      } else {
        video.addEventListener("canplay", beginPlayback, { once: true });
        video.load();
        window.setTimeout(function () {
          if (!finished && intro.dataset.state === IntroState.CLOSED) {
            beginPlayback();
          }
        }, 2500);
      }
    }

    video.addEventListener("timeupdate", watchForEnd);
    video.addEventListener("ended", showInvitation);
    video.addEventListener("pause", function () {
      if (intro.dataset.state === IntroState.PLAYING && isNearEnd()) {
        showInvitation();
      }
    });

    trigger.addEventListener("click", playIntro);
    trigger.addEventListener("touchend", function (event) {
      /* Some mobile browsers swallow the synthetic click after touch. */
      if (intro.dataset.state !== IntroState.CLOSED) {
        return;
      }

      event.preventDefault();
      playIntro();
    });

    if (skipLink) {
      skipLink.addEventListener("click", function (event) {
        event.preventDefault();
        startMusic();
        jumpToEnd(true);
        text.setAttribute("tabindex", "-1");
        window.requestAnimationFrame(function () {
          text.focus({ preventScroll: true });
        });
      });
    }
  }

  root.IntroState = IntroState;
  root.initIntro = initIntro;
})();
