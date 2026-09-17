/**
 * Genova Android wrapper — bootstrap logic
 * ----------------------------------------
 * The APK loads the real web app (the same Vite/React site) inside the
 * Capacitor WebView. Because the web app reads its Convex URL from
 * `import.meta.env.VITE_CONVEX_URL` at build time, the wrapper pre-seeds
 * that value into WebView localStorage BEFORE any site script runs, and
 * then navigates to the app entry route.
 */
(function () {
  "use strict";

  var status = document.getElementById("status");
  function setStatus(text, isError) {
    if (status) {
      status.textContent = text;
      if (isError) status.classList.add("error");
    }
  }

  function waitForCordova() {
    return new Promise(function (resolve) {
      if (!window.cordova) {
        resolve();
        return;
      }
      document.addEventListener("deviceready", function () { resolve(); }, false);
      setTimeout(resolve, 4000); // don't hang forever
    });
  }

  function originOf(url) {
    try {
      return new URL(url).origin;
    } catch (e) {
      return null;
    }
  }

  function normalizeConvexUrl(raw) {
    var url = (raw || "").trim();
    if (!url || url.indexOf("YOUR-DEPLOYMENT") !== -1) return null;
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    return url.replace(/\/+$/, "");
  }

  waitForCordova()
    .then(function () {
      setStatus("اتصال به سرور…");

      var convexUrl = normalizeConvexUrl(window.GENOVA_CONVEX_URL);

      if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.SplashScreen) {
        try { window.Capacitor.Plugins.SplashScreen.hide(); } catch (e) { /* noop */ }
      }

      if (!convexUrl) {
        setStatus(
          "آدرس Convex تنظیم نشده است. فایل www/convex-config.js را ویرایش کنید " +
          "یا هنگام Run کردن workflow مقدار convex_url را وارد کنید.",
          true
        );
        return;
      }

      // 1) Seed VITE_CONVEX_URL into WebView localStorage for the web app origin.
      //    Capacitor serves the bundled web assets from capacitor://localhost,
      //    so plain localStorage writes are visible to the app shell itself.
      //    For https:// origins the browser app reads the same key on first boot.
      try {
        window.localStorage.setItem("VITE_CONVEX_URL", convexUrl);
      } catch (e) { /* storage may be unavailable on first run */ }

      // 2) Navigate the WebView to the real web app auth page.
      //    The Convex URL is ALSO appended as a query param; the web app's
      //    bootstrap (see src/lib/apkBridge.ts in the site project) picks it up
      //    and overrides its bundled value — this is what makes one APK work
      //    with any Convex deployment without rebuilding.
      var origin = originOf(convexUrl) || "https://nibrc.ir";
      var target = origin + "/auth?apk=1&convexUrl=" + encodeURIComponent(convexUrl);
      setStatus("ورود به Genova…");
      window.location.replace(target);
    })
    .catch(function (err) {
      setStatus("خطا در راه‌اندازی: " + (err && err.message ? err.message : err), true);
    });
})();
