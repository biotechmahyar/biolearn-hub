<?php
/**
 * Template Name: Dashboard
 * داشبورد کاربر
 */
get_header(); 

// Check if logged in
if (!is_user_logged_in()) {
    wp_redirect(home_url('/auth?returnTo=' . urlencode($_SERVER['REQUEST_URI'])));
    exit;
}

$user = wp_get_current_user();
?>

<div class="nibrc-dashboard">
    <!-- Sidebar -->
    <aside class="nibrc-sidebar">
        <div style="text-align:center;padding-bottom:20px;border-bottom:1px solid var(--nibrc-border);margin-bottom:16px;">
            <div style="width:64px;height:64px;border-radius:50%;background:var(--nibrc-primary-light);display:flex;align-items:center;justify-content:center;font-size:1.5rem;margin:0 auto 8px;color:var(--nibrc-primary);font-weight:700;">
                <?php echo mb_substr($user->display_name, 0, 1); ?>
            </div>
            <div style="font-weight:700;"><?php echo esc_html($user->display_name); ?></div>
            <div style="font-size:0.85rem;color:var(--nibrc-text-muted);"><?php echo esc_html($user->user_email); ?></div>
        </div>
        
        <nav>
            <a href="#profile" class="active" onclick="showSection('profile')">👤 پروفایل</a>
            <a href="#courses" onclick="showSection('courses')">📚 دوره‌های من</a>
            <a href="#exams" onclick="showSection('exams')">📝 آزمون‌ها</a>
            <a href="#bookmarks" onclick="showSection('bookmarks')">⭐ نشانک‌ها</a>
            <a href="#support" onclick="showSection('support')">💬 پشتیبانی</a>
            <?php if (nibrc_is_admin()) : ?>
                <a href="<?php echo admin_url(); ?>" style="color:var(--nibrc-accent);">⚙️ مدیریت</a>
            <?php endif; ?>
            <a href="#" onclick="nibrcLogout()" style="color:#dc2626;">🚪 خروج</a>
        </nav>
    </aside>
    
    <!-- Main Content -->
    <main class="nibrc-main-content">
        <!-- Profile Section -->
        <div id="section-profile" class="dashboard-section">
            <h2 style="font-size:1.5rem;font-weight:800;margin-bottom:24px;">پروفایل من</h2>
            
            <div class="nibrc-card" style="max-width:500px;">
                <div class="nibrc-card-body">
                    <div class="nibrc-form-group">
                        <label>نام</label>
                        <input type="text" id="profile-name" class="nibrc-form-input" value="<?php echo esc_attr($user->display_name); ?>">
                    </div>
                    <div class="nibrc-form-group">
                        <label>ایمیل</label>
                        <input type="email" class="nibrc-form-input" value="<?php echo esc_attr($user->user_email); ?>" disabled style="opacity:0.6;">
                    </div>
                    <div class="nibrc-form-group">
                        <label>رشته تحصیلی</label>
                        <input type="text" id="profile-field" class="nibrc-form-input" value="<?php echo esc_attr(get_user_meta($user->ID, 'field_of_study', true)); ?>" placeholder="مثلاً میکروبیولوژی">
                    </div>
                    <div class="nibrc-form-group">
                        <label>دانشگاه</label>
                        <input type="text" id="profile-university" class="nibrc-form-input" value="<?php echo esc_attr(get_user_meta($user->ID, 'university', true)); ?>" placeholder="مثلاً دانشگاه تهران">
                    </div>
                    <button onclick="saveProfile()" class="nibrc-btn nibrc-btn-primary">ذخیره تغییرات</button>
                </div>
            </div>
        </div>
        
        <!-- Courses Section -->
        <div id="section-courses" class="dashboard-section" style="display:none;">
            <h2 style="font-size:1.5rem;font-weight:800;margin-bottom:24px;">📚 دوره‌های من</h2>
            <div id="my-courses-list">
                <div class="nibrc-empty">
                    <div class="nibrc-empty-icon">📚</div>
                    <p>هنوز در دوره‌ای ثبت‌نام نکرده‌اید.</p>
                    <a href="<?php echo home_url('/courses'); ?>" class="nibrc-btn nibrc-btn-primary" style="margin-top:16px;">مشاهده دوره‌ها</a>
                </div>
            </div>
        </div>
        
        <!-- Exams Section -->
        <div id="section-exams" class="dashboard-section" style="display:none;">
            <h2 style="font-size:1.5rem;font-weight:800;margin-bottom:24px;">📝 آزمون‌ها</h2>
            <div id="my-exams-list">
                <div class="nibrc-empty">
                    <div class="nibrc-empty-icon">📝</div>
                    <p>هنوز آزمونی ثبت نشده.</p>
                    <a href="<?php echo home_url('/exams'); ?>" class="nibrc-btn nibrc-btn-primary" style="margin-top:16px;">مشاهده آزمون‌ها</a>
                </div>
            </div>
        </div>
        
        <!-- Bookmarks Section -->
        <div id="section-bookmarks" class="dashboard-section" style="display:none;">
            <h2 style="font-size:1.5rem;font-weight:800;margin-bottom:24px;">⭐ نشانک‌ها</h2>
            <div class="nibrc-empty">
                <div class="nibrc-empty-icon">⭐</div>
                <p>هنوز نشانکی اضافه نکرده‌اید.</p>
            </div>
        </div>
        
        <!-- Support Section -->
        <div id="section-support" class="dashboard-section" style="display:none;">
            <h2 style="font-size:1.5rem;font-weight:800;margin-bottom:24px;">💬 پشتیبانی</h2>
            
            <div class="nibrc-card" style="max-width:600px;">
                <div class="nibrc-card-body">
                    <h3 style="margin-bottom:16px;">ارسال تیکت جدید</h3>
                    <div class="nibrc-form-group">
                        <label>موضوع</label>
                        <input type="text" id="ticket-subject" class="nibrc-form-input" placeholder="موضوع تیکت">
                    </div>
                    <div class="nibrc-form-group">
                        <label>پیام</label>
                        <textarea id="ticket-message" class="nibrc-form-input" rows="5" placeholder="توضیح مشکل خود را بنویسید..."></textarea>
                    </div>
                    <button onclick="submitTicket()" class="nibrc-btn nibrc-btn-primary">ارسال تیکت</button>
                </div>
            </div>
        </div>
    </main>
</div>

<script>
// Section navigation
function showSection(name) {
    document.querySelectorAll('.dashboard-section').forEach(function(el) {
        el.style.display = 'none';
    });
    document.getElementById('section-' + name).style.display = 'block';
    
    document.querySelectorAll('.nibrc-sidebar a').forEach(function(a) {
        a.classList.remove('active');
    });
    event.target.classList.add('active');
}

// Check hash for initial section
var hash = window.location.hash.replace('#', '');
if (hash && document.getElementById('section-' + hash)) {
    showSection(hash);
}

function saveProfile() {
    var data = new FormData();
    data.append('action', 'nibrc_update_profile');
    data.append('_ajax_nonce', '<?php echo wp_create_nonce("nibrc_nonce"); ?>');
    data.append('name', document.getElementById('profile-name').value);
    data.append('field_of_study', document.getElementById('profile-field').value);
    data.append('university', document.getElementById('profile-university').value);
    
    fetch('<?php echo admin_url("admin-ajax.php"); ?>', {
        method: 'POST',
        body: data
    }).then(function(r) { return r.json(); }).then(function(res) {
        if (res.success) {
            alert('پروفایل ذخیره شد');
        } else {
            alert('خطا: ' + (res.data?.message || 'خطای ناشناخته'));
        }
    });
}

function submitTicket() {
    var subject = document.getElementById('ticket-subject').value;
    var message = document.getElementById('ticket-message').value;
    
    if (!subject || !message) {
        alert('لطفاً موضوع و پیام را وارد کنید');
        return;
    }
    
    fetch('<?php echo admin_url("admin-ajax.php"); ?>', {
        method: 'POST',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: 'action=nibrc_submit_ticket&_ajax_nonce=<?php echo wp_create_nonce("nibrc_nonce"); ?>&subject=' + encodeURIComponent(subject) + '&message=' + encodeURIComponent(message)
    }).then(function(r) { return r.json(); }).then(function(res) {
        if (res.success) {
            alert('تیکت ارسال شد');
            document.getElementById('ticket-subject').value = '';
            document.getElementById('ticket-message').value = '';
        } else {
            alert('خطا: ' + (res.data?.message || 'خطای ناشناخته'));
        }
    });
}
</script>

<?php get_footer(); ?>
