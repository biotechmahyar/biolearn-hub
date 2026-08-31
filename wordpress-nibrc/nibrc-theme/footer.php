<!-- Footer -->
<footer class="nibrc-footer">
    <div class="nibrc-footer-grid">
        <!-- About -->
        <div>
            <h4>🧬 NIBRC</h4>
            <p style="font-size:0.9rem;line-height:1.8;margin-top:8px;">
                پلتفرم تخصصی علوم زیستی — دوره‌ها، مقالات، آزمون‌ها و ابزارهای آموزشی برای دانشجویان میکروبیولوژی و بیوتکنولوژی.
            </p>
        </div>
        
        <!-- Links -->
        <div>
            <h4>لینک‌های مفید</h4>
            <a href="<?php echo home_url('/courses'); ?>">دوره‌ها</a>
            <a href="<?php echo home_url('/articles'); ?>">مقالات</a>
            <a href="<?php echo home_url('/products'); ?>">محصولات آموزشی</a>
            <a href="<?php echo home_url('/workshops'); ?>">کارگاه‌ها</a>
            <a href="<?php echo home_url('/dictionary'); ?>">دیکشنری تخصصی</a>
        </div>
        
        <!-- Support -->
        <div>
            <h4>پشتیبانی</h4>
            <a href="<?php echo home_url('/dashboard/support'); ?>">ارسال تیکت</a>
            <a href="<?php echo home_url('/rules'); ?>">قوانین</a>
            <a href="#">تماس با ما</a>
            <a href="#">درباره ما</a>
        </div>
        
        <!-- Contact -->
        <div>
            <h4>ارتباط با ما</h4>
            <p style="font-size:0.9rem;line-height:2;">
                📧 info@nibrc.ir<br>
                📱 @nibrc_team<br>
                🌐 <a href="https://nibrc.ir" style="color:#94a3b8;">nibrc.ir</a>
            </p>
        </div>
    </div>
    
    <div class="nibrc-footer-bottom">
        <p>© <?php echo date('Y'); ?> NIBRC — تمامی حقوق محفوظ است.</p>
        <p style="margin-top:4px;font-size:0.8rem;opacity:0.7;">
            سایت ایران — اتصال خودکار با سایت اصلی
        </p>
    </div>
</footer>

<?php wp_footer(); ?>

<script>
// === Connection Status Monitor ===
(function() {
    const statusBar = document.getElementById('nibrc-status-bar');
    const statusIcon = document.getElementById('status-icon');
    const statusText = document.getElementById('status-text');
    
    function updateStatus() {
        if (navigator.onLine) {
            statusBar.className = 'nibrc-status-bar nibrc-status-online';
            statusIcon.textContent = '🟢';
            statusText.textContent = 'اتصال برقرار — سایت آنلاین';
        } else {
            statusBar.className = 'nibrc-status-bar nibrc-status-offline';
            statusIcon.textContent = '🟡';
            statusText.textContent = 'اتصال قطع — حالت آفلاین — اطلاعات محلی نمایش داده می‌شود';
        }
    }
    
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    updateStatus();
})();

// === Logout Function ===
function nibrcLogout() {
    if (confirm('آیا می‌خواهید خارج شوید؟')) {
        fetch('<?php echo admin_url("admin-ajax.php"); ?>', {
            method: 'POST',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            body: 'action=nibrc_logout&_ajax_nonce=<?php echo wp_create_nonce("nibrc_nonce"); ?>'
        }).then(function() {
            localStorage.removeItem('nibrc_token');
            localStorage.removeItem('nibrc_user');
            window.location.href = '<?php echo home_url(); ?>';
        });
    }
}
</script>

</body>
</html>
