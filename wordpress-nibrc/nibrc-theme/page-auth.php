<?php
/**
 * Template Name: Auth Page
 * صفحه ورود و ثبت‌نام
 */
get_header(); ?>

<main class="nibrc-container" style="padding-top:60px;padding-bottom:60px;">
    <div style="max-width:450px;margin:0 auto;">
        <div style="text-align:center;margin-bottom:32px;">
            <h1 style="font-size:1.8rem;font-weight:800;">🧬 NIBRC</h1>
            <p style="color:var(--nibrc-text-muted);">پلتفرم تخصصی علوم زیستی</p>
        </div>
        
        <!-- Tabs -->
        <div style="display:flex;gap:0;margin-bottom:24px;background:var(--nibrc-border);border-radius:var(--nibrc-radius);padding:4px;">
            <button id="tab-login" onclick="showTab('login')" style="flex:1;padding:10px;border:none;border-radius:8px;font-family:var(--nibrc-font);font-weight:600;cursor:pointer;background:white;box-shadow:var(--nibrc-shadow);">ورود</button>
            <button id="tab-register" onclick="showTab('register')" style="flex:1;padding:10px;border:none;border-radius:8px;font-family:var(--nibrc-font);font-weight:600;cursor:pointer;background:transparent;color:var(--nibrc-text-muted);">ثبت‌نام</button>
        </div>
        
        <!-- Login Form -->
        <div id="form-login">
            <div class="nibrc-form">
                <div id="login-error" style="display:none;background:#fef2f2;color:#dc2626;padding:12px;border-radius:8px;margin-bottom:16px;font-size:0.9rem;"></div>
                
                <div class="nibrc-form-group">
                    <label for="login-email">ایمیل</label>
                    <input type="email" id="login-email" class="nibrc-form-input" placeholder="example@email.com" autocomplete="email">
                </div>
                
                <div class="nibrc-form-group">
                    <label for="login-password">رمز عبور</label>
                    <input type="password" id="login-password" class="nibrc-form-input" placeholder="رمز عبور" autocomplete="current-password">
                </div>
                
                <button onclick="doLogin()" class="nibrc-btn nibrc-btn-primary" style="width:100%;padding:14px;">
                    ورود
                </button>
            </div>
        </div>
        
        <!-- Register Form -->
        <div id="form-register" style="display:none;">
            <div class="nibrc-form">
                <div id="register-error" style="display:none;background:#fef2f2;color:#dc2626;padding:12px;border-radius:8px;margin-bottom:16px;font-size:0.9rem;"></div>
                
                <div class="nibrc-form-group">
                    <label for="register-name">نام و نام خانوادگی</label>
                    <input type="text" id="register-name" class="nibrc-form-input" placeholder="نام کامل">
                </div>
                
                <div class="nibrc-form-group">
                    <label for="register-email">ایمیل</label>
                    <input type="email" id="register-email" class="nibrc-form-input" placeholder="example@email.com">
                </div>
                
                <div class="nibrc-form-group">
                    <label for="register-password">رمز عبور</label>
                    <input type="password" id="register-password" class="nibrc-form-input" placeholder="حداقل ۸ کاراکتر">
                </div>
                
                <button onclick="doRegister()" class="nibrc-btn nibrc-btn-primary" style="width:100%;padding:14px;">
                    ثبت‌نام
                </button>
            </div>
        </div>
    </div>
</main>

<script>
function showTab(tab) {
    document.getElementById('form-login').style.display = tab === 'login' ? 'block' : 'none';
    document.getElementById('form-register').style.display = tab === 'register' ? 'block' : 'none';
    
    document.getElementById('tab-login').style.background = tab === 'login' ? 'white' : 'transparent';
    document.getElementById('tab-login').style.color = tab === 'login' ? 'var(--nibrc-text)' : 'var(--nibrc-text-muted)';
    document.getElementById('tab-login').style.boxShadow = tab === 'login' ? 'var(--nibrc-shadow)' : 'none';
    
    document.getElementById('tab-register').style.background = tab === 'register' ? 'white' : 'transparent';
    document.getElementById('tab-register').style.color = tab === 'register' ? 'var(--nibrc-text)' : 'var(--nibrc-text-muted)';
    document.getElementById('tab-register').style.boxShadow = tab === 'register' ? 'var(--nibrc-shadow)' : 'none';
}

// Check URL for register tab
if (new URLSearchParams(window.location.search).get('tab') === 'register') {
    showTab('register');
}

// Check if already logged in
if (localStorage.getItem('nibrc_token')) {
    window.location.href = '<?php echo home_url("/dashboard"); ?>';
}

function showError(id, msg) {
    var el = document.getElementById(id);
    el.textContent = msg;
    el.style.display = 'block';
}

function doLogin() {
    var email = document.getElementById('login-email').value;
    var password = document.getElementById('login-password').value;
    
    if (!email || !password) {
        showError('login-error', 'لطفاً ایمیل و رمز عبور را وارد کنید');
        return;
    }
    
    fetch('<?php echo admin_url("admin-ajax.php"); ?>', {
        method: 'POST',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: 'action=nibrc_login&_ajax_nonce=<?php echo wp_create_nonce("nibrc_nonce"); ?>&email=' + encodeURIComponent(email) + '&password=' + encodeURIComponent(password)
    }).then(function(r) { return r.json(); }).then(function(res) {
        if (res.success) {
            localStorage.setItem('nibrc_token', res.data.token);
            localStorage.setItem('nibrc_user', JSON.stringify(res.data.user));
            
            var params = new URLSearchParams(window.location.search);
            var redirect = params.get('returnTo') || '<?php echo home_url("/dashboard"); ?>';
            window.location.href = redirect;
        } else {
            showError('login-error', res.data?.message || 'خطا در ورود');
        }
    }).catch(function(e) {
        showError('login-error', 'خطا در اتصال به سرور');
    });
}

function doRegister() {
    var name = document.getElementById('register-name').value;
    var email = document.getElementById('register-email').value;
    var password = document.getElementById('register-password').value;
    
    if (!name || !email || !password) {
        showError('register-error', 'لطفاً تمام فیلدها را پر کنید');
        return;
    }
    
    if (password.length < 6) {
        showError('register-error', 'رمز عبور باید حداقل ۶ کاراکتر باشد');
        return;
    }
    
    fetch('<?php echo admin_url("admin-ajax.php"); ?>', {
        method: 'POST',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: 'action=nibrc_register&_ajax_nonce=<?php echo wp_create_nonce("nibrc_nonce"); ?>&name=' + encodeURIComponent(name) + '&email=' + encodeURIComponent(email) + '&password=' + encodeURIComponent(password)
    }).then(function(r) { return r.json(); }).then(function(res) {
        if (res.success) {
            localStorage.setItem('nibrc_token', res.data.token);
            localStorage.setItem('nibrc_user', JSON.stringify(res.data.user));
            window.location.href = '<?php echo home_url("/dashboard"); ?>';
        } else {
            showError('register-error', res.data?.message || 'خطا در ثبت‌نام');
        }
    }).catch(function(e) {
        showError('register-error', 'خطا در اتصال به سرور');
    });
}

// Enter key support
document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        if (document.getElementById('form-login').style.display !== 'none') {
            doLogin();
        } else {
            doRegister();
        }
    }
});
</script>

<?php get_footer(); ?>
