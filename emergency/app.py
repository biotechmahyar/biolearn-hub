from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
STATIC = ROOT / "static"

PAGE = r'''<!doctype html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Genova | مرکز یادگیری علوم زیستی</title>
  <link rel="stylesheet" href="/static/style.css">
</head>
<body>
  <div class="app-shell">
    <aside class="sidebar" id="sidebar">
      <div class="brand"><div class="brand-mark">G</div><div><strong>GENOVA</strong><span>BIOLOGY LEARNING</span></div></div>
      <div class="workspace-label">فضای یادگیری من</div>
      <nav>
        <a class="nav-item active" href="#dashboard"><span class="icon">⌂</span>داشبورد</a>
        <a class="nav-item" href="#courses"><span class="icon">▣</span>دوره‌های من</a>
        <a class="nav-item" href="#tests"><span class="icon">◈</span>آزمون‌ها</a>
        <a class="nav-item" href="#library"><span class="icon">▤</span>کتابخانه</a>
        <a class="nav-item" href="#progress"><span class="icon">⌁</span>پیشرفت من</a>
        <a class="nav-item" href="#community"><span class="icon">◎</span>جامعه علمی</a>
      </nav>
      <div class="sidebar-bottom">
        <div class="offline-card"><span class="pulse"></span><div><b>حالت آفلاین</b><small>همه‌چیز روی این دستگاه</small></div></div>
        <a class="nav-item" href="#settings"><span class="icon">⚙</span>تنظیمات</a>
        <div class="user-mini"><div class="avatar">م</div><div><b>مهمان آفلاین</b><small>نسخه نمایشی</small></div><span>⋮</span></div>
      </div>
    </aside>

    <main class="main-content">
      <header class="topbar">
        <button class="menu-btn" id="menuBtn" aria-label="منو">☰</button>
        <div class="search"><span>⌕</span><input placeholder="جست‌وجو در دوره‌ها، آزمون‌ها و منابع..."><kbd>⌘ K</kbd></div>
        <div class="top-actions"><button class="icon-btn" title="اعلان‌ها">♢<i></i></button><button class="icon-btn" title="پیام‌ها">▱<i></i></button><button class="help-btn">؟ <span>راهنما</span></button></div>
      </header>

      <div class="page-wrap" id="dashboard">
        <section class="welcome-row"><div><div class="eyebrow"><span class="live-dot"></span>سه‌شنبه، ۲۵ شهریور ۱۴۰۴</div><h1>سلام، آماده‌ای شروع کنی؟ <span>✦</span></h1><p>مسیر امروزت را بساز؛ قدم‌های کوچک، پیشرفت بزرگ.</p></div><button class="outline-btn" id="focusBtn">◎ تمرکز امروز <b>۲۵</b></button></section>
        <section class="hero-grid">
          <div class="hero-card"><div class="hero-copy"><span class="tag">مسیر پیشنهادی امروز</span><h2>میکروبیولوژی<br><em>از صفر تا امتحان</em></h2><p>با یک جلسه کوتاه، مفاهیم پایه را مرور کن و آماده‌ی آزمون بعدی شو.</p><div class="hero-actions"><button class="primary-btn" data-toast="جلسه شروع شد">شروع جلسه <span>←</span></button><button class="text-btn" data-toast="اطلاعات دوره به‌زودی">مشاهده جزئیات</button></div></div><div class="hero-visual"><div class="orbit orbit-a"></div><div class="orbit orbit-b"></div><div class="dna">⌬</div><div class="visual-label"><span>۰۱</span><small>مسیر فعال</small></div></div></div>
          <div class="progress-card"><div class="card-head"><div><span class="eyebrow">پیشرفت هفته</span><h3>ریتم یادگیری</h3></div><span class="week-badge">۴ هفته</span></div><div class="ring-wrap"><div class="ring"><div><b>۶۸٪</b><small>هدف امروز</small></div></div><div class="ring-copy"><p><strong>۳۲ دقیقه</strong> از ۴۵ دقیقه</p><div class="bar"><i style="width:68%"></i></div><small>۱۳ دقیقه تا هدف امروز</small></div></div><div class="streak"><span>🔥</span><div><b>۶ روز متوالی</b><small>عالی پیش می‌روی!</small></div><span class="streak-arrow">‹</span></div></div>
        </section>
        <section class="section-head" id="courses"><div><span class="eyebrow">مسیرهای آموزشی</span><h2>از کجا شروع کنیم؟</h2></div><a href="#all-courses">مشاهده همه <span>←</span></a></section>
        <section class="course-grid">
          <article class="course-card mint"><div class="course-art"><span class="course-number">۰۱</span><div class="art-icon">♧</div><span class="course-tag">پایه</span></div><div class="course-body"><span class="course-type">MICROBIOLOGY</span><h3>میکروبیولوژی عمومی</h3><p>از مبانی تا آمادگی امتحان</p><div class="course-meta"><span>◷ ۶ جلسه</span><span>▣ ۱۲ ساعت</span></div><div class="course-bottom"><div class="mini-progress"><i style="width:24%"></i></div><small>۲۴٪</small><button data-toast="دوره به مسیر شما اضافه شد">＋</button></div></div></article>
          <article class="course-card lilac"><div class="course-art"><span class="course-number">۰۲</span><div class="art-icon">⌬</div><span class="course-tag">تخصصی</span></div><div class="course-body"><span class="course-type">MOLECULAR BIOLOGY</span><h3>زیست‌شناسی مولکولی</h3><p>ساختار، عملکرد و تحلیل DNA</p><div class="course-meta"><span>◷ ۸ جلسه</span><span>▣ ۱۸ ساعت</span></div><div class="course-bottom"><div class="mini-progress"><i style="width:0%"></i></div><small>شروع نشده</small><button data-toast="دوره به مسیر شما اضافه شد">＋</button></div></div></article>
          <article class="course-card peach"><div class="course-art"><span class="course-number">۰۳</span><div class="art-icon">◌</div><span class="course-tag">مهارتی</span></div><div class="course-body"><span class="course-type">BIOINFORMATICS</span><h3>بیوانفورماتیک کاربردی</h3><p>داده‌های زیستی را هوشمندانه بخوان</p><div class="course-meta"><span>◷ ۵ جلسه</span><span>▣ ۱۰ ساعت</span></div><div class="course-bottom"><div class="mini-progress"><i style="width:0%"></i></div><small>شروع نشده</small><button data-toast="دوره به مسیر شما اضافه شد">＋</button></div></div></article>
        </section>
        <section class="bottom-grid"><div class="activity-card"><div class="card-head"><div><span class="eyebrow">ادامه مسیر</span><h3>فعالیت‌های اخیر</h3></div><a href="#activity">همه</a></div><div class="activity-row"><div class="activity-icon green">✓</div><div><b>مقدمه‌ای بر سلول‌های میکروبی</b><small>میکروبیولوژی عمومی · ۲ روز پیش</small></div><span class="activity-check">تکمیل شده</span></div><div class="activity-row"><div class="activity-icon yellow">◈</div><div><b>آزمونک پایه ژنتیک</b><small>آزمون تشخیصی · ۱۲ دقیقه</small></div><span class="activity-progress">۶۰٪</span></div></div><div class="daily-card"><div class="daily-orb">◉</div><span class="eyebrow">چالش روزانه</span><h3>آزمونک امروز</h3><p>۵ سؤال کوتاه برای گرم‌کردن ذهن</p><button data-toast="آزمون روزانه آماده است">شروع آزمون <span>←</span></button></div></section>
      </div>
      <footer><span>GENOVA <b>•</b> مرکز یادگیری علوم زیستی</span><span>نسخه آفلاین نمایشی · بدون داده سایت</span></footer>
    </main>
  </div>
  <div class="toast" id="toast"></div>
  <script src="/static/app.js"></script>
</body>
</html>'''

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        path = urlparse(self.path).path
        if path in ("/", "/dashboard"):
            body, content_type = PAGE.encode('utf-8'), "text/html; charset=utf-8"
        elif path == "/static/style.css":
            body, content_type = (STATIC / "style.css").read_bytes(), "text/css; charset=utf-8"
        elif path == "/static/app.js":
            body, content_type = (STATIC / "app.js").read_bytes(), "text/javascript; charset=utf-8"
        else:
            self.send_error(404)
            return
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        self.wfile.write(body)
    def log_message(self, format, *args):
        print("[offline] " + format % args)

if __name__ == "__main__":
    host, port = "127.0.0.1", 8765
    print(f"Genova offline UI: http://{host}:{port}")
    print("Press Ctrl+C to stop")
    try:
        ThreadingHTTPServer((host, port), Handler).serve_forever()
    except KeyboardInterrupt:
        print("\nStopped")

