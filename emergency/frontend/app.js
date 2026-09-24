(() => {
  "use strict";

  const TOKEN_KEY = "genova-emergency-admin-token";
  const USER_KEY = "genova-emergency-admin-user";
  const $ = (id) => document.getElementById(id);
  let token = sessionStorage.getItem(TOKEN_KEY) || "";
  let currentUser = sessionStorage.getItem(USER_KEY) || "";
  let artifacts = [];

  const tableLabels = {
    emergency_users: "کاربران",
    emergency_auth_accounts: "حساب‌های Auth",
    emergency_auth_sessions: "نشست‌ها",
    emergency_auth_tokens: "توکن‌ها",
    emergency_auth_keys: "کلیدهای امضا",
    emergency_profiles: "پروفایل‌ها",
    emergency_roles: "نقش‌ها",
    emergency_user_roles: "تخصیص نقش‌ها",
    emergency_content_categories: "دسته‌ها",
    emergency_courses: "دوره‌ها",
    emergency_course_sections: "بخش‌ها",
    emergency_lessons: "درس‌ها",
    emergency_enrollments: "ثبت‌نام‌ها",
    emergency_lesson_progress: "پیشرفت‌ها",
    emergency_study_plans: "برنامه‌های مطالعه",
    emergency_learning_events: "رویدادهای یادگیری",
    emergency_assessments: "آزمون‌ها",
    emergency_assessment_questions: "پرسش‌ها",
    emergency_assessment_options: "گزینه‌ها",
    emergency_assessment_attempts: "تلاش‌ها",
    emergency_assessment_responses: "پاسخ‌ها",
    emergency_runtime_settings: "تنظیمات Runtime",
    emergency_bots: "ربات‌ها",
    emergency_bot_commands: "دستورهای ربات",
    emergency_bot_user_links: "اتصال ربات",
    emergency_payment_gateways: "درگاه‌ها",
    emergency_payment_transactions: "تراکنش‌ها",
    emergency_payment_status_history: "تاریخچه پرداخت",
    emergency_audit_events: "رویدادهای ممیزی"
  };

  function setConnection(online, label) {
    const element = $("connectionStatus");
    element.classList.toggle("online", online);
    element.querySelector("span").textContent = label;
  }

  function toast(message, error = false) {
    const element = $("toast");
    element.textContent = message;
    element.classList.toggle("error", error);
    element.classList.add("show");
    window.setTimeout(() => element.classList.remove("show"), 3200);
  }

  async function api(path, options = {}) {
    const response = await fetch(path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {})
      }
    });
    if (response.status === 401) {
      clearSession();
      throw new Error("نشست مدیریتی منقضی یا نامعتبر است.");
    }
    const payload = response.status === 204 ? null : await response.json();
    if (!response.ok) {
      const detail = payload && payload.detail;
      if (Array.isArray(detail)) throw new Error(detail.join("، "));
      throw new Error(detail || "درخواست با خطا مواجه شد.");
    }
    return payload;
  }

  function clearSession() {
    token = "";
    currentUser = "";
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    $("loginView").classList.remove("hidden");
    $("dashboardView").classList.add("hidden");
    setConnection(false, "ورود لازم است");
  }

  function showDashboard() {
    $("loginView").classList.add("hidden");
    $("dashboardView").classList.remove("hidden");
    $("identifier").value = currentUser;
    const now = new Date().toISOString().replace(/[-:]/g, "").slice(0, 13);
    $("artifactName").placeholder = `backup-${now}`;
  }

  function setButtonBusy(button, busy, busyLabel) {
    if (!button) return;
    if (busy) {
      button.dataset.label = button.textContent;
      button.textContent = busyLabel || "در حال پردازش…";
    } else if (button.dataset.label) {
      button.textContent = button.dataset.label;
    }
    button.disabled = busy;
  }

  function renderInventory(counts) {
    const inventory = $("inventory");
    inventory.replaceChildren();
    Object.entries(counts).forEach(([table, count]) => {
      const row = document.createElement("div");
      row.className = "inventory-item";
      const label = document.createElement("span");
      label.textContent = tableLabels[table] || table;
      const value = document.createElement("b");
      value.textContent = Number(count).toLocaleString("fa-IR");
      row.append(label, value);
      inventory.appendChild(row);
    });
  }

  function selectedArtifact() {
    return artifacts.find((item) => item.name === $("artifactSelect").value) || null;
  }

  function renderArtifacts(preserve = true) {
    const select = $("artifactSelect");
    const previous = preserve ? select.value : "";
    select.replaceChildren();
    if (!artifacts.length) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "هنوز artifactی وجود ندارد";
      select.appendChild(option);
    } else {
      artifacts.forEach((item) => {
        const option = document.createElement("option");
        option.value = item.name;
        option.textContent = `${item.valid ? "●" : "!"} ${item.name}${item.containsSecrets ? " · secrets" : ""}`;
        select.appendChild(option);
      });
      if (artifacts.some((item) => item.name === previous)) select.value = previous;
      else select.dispatchEvent(new Event("change"));
    }
    $("artifactCount").textContent = artifacts.length.toLocaleString("fa-IR");
  }

  function renderOperations(overview) {
    const telemetry = overview.telemetry || {};
    const backups = overview.backups || {};
    const readiness = overview.readiness || {};
    $("healthValue").textContent = readiness.status === "ready" ? "آماده و پایدار" : "نیازمند بررسی";
    $("readinessTag").textContent = String(readiness.status || "unknown").toUpperCase();
    $("readinessTag").style.color = readiness.status === "ready" ? "var(--mint)" : "var(--danger)";
    $("requestsHour").textContent = Number(telemetry.requestsLastHour || 0).toLocaleString("fa-IR");
    $("averageDuration").textContent = `${Number(telemetry.averageDurationMs || 0).toLocaleString("fa-IR")} ms`;
    $("maxDuration").textContent = `${Number(telemetry.maxDurationMs || 0).toLocaleString("fa-IR")} ms`;
    $("errorCount").textContent = Number((telemetry.recentErrors || []).length).toLocaleString("fa-IR");
    $("backupSummary").textContent = backups.latest
      ? `${backups.count} backup · آخرین: ${backups.latest.name}`
      : `${backups.count || 0} backup · هنوز backupی ساخته نشده`;
    $("telemetryOutput").textContent = JSON.stringify({
      privacy: telemetry.privacy,
      routes: telemetry.routes,
      recentErrors: telemetry.recentErrors
    }, null, 2);
  }

  async function loadOverview() {
    const overview = await api("/api/admin/emergency/overview");
    const counts = overview.databaseCounts || {};
    $("userCount").textContent = Number(counts.emergency_users || 0).toLocaleString("fa-IR");
    $("courseCount").textContent = Number(counts.emergency_courses || 0).toLocaleString("fa-IR");
    renderInventory(counts);
    renderOperations(overview);
    if (overview.latestImport) {
      $("artifactMeta").textContent = `آخرین بازیابی: ${overview.latestImport.snapshot_id}`;
    }
  }

  async function loadArtifacts(preserve = true) {
    artifacts = await api("/api/admin/snapshots");
    renderArtifacts(preserve);
  }

  async function refreshAll() {
    const button = $("refreshButton");
    setButtonBusy(button, true, "…");
    try {
      await Promise.all([loadOverview(), loadArtifacts()]);
      setConnection(true, "متصل · مستقل");
    } catch (error) {
      toast(error.message, true);
    } finally {
      setButtonBusy(button, false);
    }
  }

  async function validateSelected() {
    const artifact = selectedArtifact();
    if (!artifact) return toast("ابتدا یک artifact انتخاب کنید.", true);
    const button = $("validateButton");
    setButtonBusy(button, true);
    $("diagnosticsOutput").textContent = "Validating manifest, checksum, section counts and record IDs…";
    try {
      const report = await api(`/api/admin/snapshots/${encodeURIComponent(artifact.name)}/validate`, { method: "POST" });
      $("validationState").textContent = report.valid ? "Artifact معتبر است" : "Artifact نامعتبر است";
      $("validationState").style.color = report.valid ? "var(--mint)" : "var(--danger)";
      $("artifactMeta").textContent = report.manifest
        ? `${report.manifest.snapshot_id} · v${report.manifest.contract_version} · ${report.manifest.source_version}`
        : artifact.name;
      $("diagnosticsOutput").textContent = JSON.stringify(report, null, 2);
      toast(report.valid ? "اعتبارسنجی کامل شد." : "گزارش اعتبارسنجی دارای خطاست.", !report.valid);
    } catch (error) {
      $("validationState").textContent = "اعتبارسنجی ناموفق";
      $("diagnosticsOutput").textContent = error.message;
      toast(error.message, true);
    } finally {
      setButtonBusy(button, false);
    }
  }

  async function importSelected() {
    const artifact = selectedArtifact();
    if (!artifact) return toast("ابتدا یک artifact انتخاب کنید.", true);
    if (!window.confirm(`Snapshot «${artifact.name}» به‌صورت تراکنشی وارد شود؟`)) return;
    const button = $("importButton");
    setButtonBusy(button, true, "در حال بازیابی…");
    try {
      const result = await api(`/api/admin/snapshots/${encodeURIComponent(artifact.name)}/import`, {
        method: "POST",
        body: JSON.stringify({ allowOlderRecovery: $("olderRecovery").checked })
      });
      $("diagnosticsOutput").textContent = JSON.stringify(result, null, 2);
      $("validationState").textContent = result.replayed ? "Replay idempotent؛ تغییری اعمال نشد" : "بازیابی با موفقیت اعمال شد";
      $("validationState").style.color = "var(--mint)";
      toast(result.replayed ? "Snapshot قبلاً اعمال شده بود." : "Snapshot بازیابی شد.");
      await refreshAll();
    } catch (error) {
      toast(error.message, true);
    } finally {
      setButtonBusy(button, false);
    }
  }

  $("loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = event.submitter;
    const message = $("loginMessage");
    message.textContent = "";
    setButtonBusy(button, true, "در حال بررسی…");
    try {
      const result = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ identifier: $("identifier").value, password: $("password").value })
      });
      token = result.accessToken;
      currentUser = result.user.username || result.user.email || result.user.id;
      sessionStorage.setItem(TOKEN_KEY, token);
      sessionStorage.setItem(USER_KEY, currentUser);
      $("password").value = "";
      showDashboard();
      await refreshAll();
    } catch (error) {
      message.textContent = error.message;
    } finally {
      setButtonBusy(button, false);
    }
  });

  $("logoutButton").addEventListener("click", async () => {
    try { await api("/api/auth/logout", { method: "POST" }); } catch (_) { /* local logout still applies */ }
    clearSession();
  });
  $("refreshButton").addEventListener("click", refreshAll);
  $("reloadInventory").addEventListener("click", () => refreshAll());
  $("backupButton").addEventListener("click", async () => {
    const button = $("backupButton");
    setButtonBusy(button, true, "در حال backup…");
    try {
      const result = await api("/api/admin/backups", { method: "POST" });
      toast(`Backup ساخته شد: ${result.name}`);
      await refreshAll();
    } catch (error) {
      toast(error.message, true);
    } finally {
      setButtonBusy(button, false);
    }
  });
  $("pruneButton").addEventListener("click", async () => {
    if (!window.confirm("داده‌های خارج از retention حذف شوند؟ آخرین artifactها و backupها بر اساس تنظیمات حفظ می‌شوند.")) return;
    const button = $("pruneButton");
    setButtonBusy(button, true, "در حال پاک‌سازی…");
    try {
      const result = await api("/api/admin/maintenance/prune", {
        method: "POST",
        body: JSON.stringify({ telemetryDays: 30, artifactDays: 30, artifactKeep: 14, backupDays: 30 })
      });
      $("telemetryOutput").textContent = JSON.stringify(result, null, 2);
      toast("Retention اجرا شد.");
      await refreshAll();
    } catch (error) {
      toast(error.message, true);
    } finally {
      setButtonBusy(button, false);
    }
  });
  $("validateButton").addEventListener("click", validateSelected);
  $("importButton").addEventListener("click", importSelected);
  $("artifactSelect").addEventListener("change", validateSelected);
  $("exportButton").addEventListener("click", async () => {
    const name = $("artifactName").value.trim();
    const includeSecrets = $("includeSecrets").checked;
    const message = $("exportMessage");
    if (!name) return (message.textContent = "نام artifact را وارد کنید.");
    if (includeSecrets && !window.confirm("این artifact شامل secretهای خام خواهد بود. ادامه می‌دهید؟")) return;
    const button = $("exportButton");
    setButtonBusy(button, true, "در حال ساخت…");
    message.textContent = "";
    try {
      const result = await api("/api/admin/snapshots/export", {
        method: "POST",
        body: JSON.stringify({ artifactName: name, includeSecrets, sourceVersion: "emergency-0.8.0" })
      });
      message.style.color = "var(--mint)";
      message.textContent = "Artifact ساخته شد؛ secretها در پاسخ HTTP نمایش داده نشده‌اند.";
      $("artifactName").value = "";
      await loadArtifacts(false);
      $("artifactSelect").value = result.name;
      await validateSelected();
    } catch (error) {
      message.style.color = "var(--danger)";
      message.textContent = error.message;
    } finally {
      setButtonBusy(button, false);
    }
  });

  if (token) {
    showDashboard();
    refreshAll();
  } else {
    setConnection(false, "ورود لازم است");
  }
})();
