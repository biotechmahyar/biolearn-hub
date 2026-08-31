<?php
/**
 * NIBRC Iran Mirror — functions.php
 */

if (!defined('ABSPATH')) exit;

/* ───────── 1. Includes ───────── */
require_once get_template_directory() . '/inc/custom-post-types.php';
require_once get_template_directory() . '/inc/custom-taxonomies.php';
require_once get_template_directory() . '/inc/sync.php';
require_once get_template_directory() . '/inc/auth.php';
require_once get_template_directory() . '/inc/rest-api.php';

/* ───────── 2. Theme Setup ───────── */
function nibrc_setup() {
    add_theme_support('title-tag');
    add_theme_support('post-thumbnails');
    add_theme_support('html5', ['search-form', 'comment-form', 'gallery', 'caption']);
    add_theme_support('custom-logo', [
        'height'      => 60,
        'width'       => 200,
        'flex-height' => true,
        'flex-width'  => true,
    ]);

    register_nav_menus([
        'primary' => 'منوی اصلی',
        'footer'  => 'منوی فوتر',
    ]);

    // RTL support
    add_theme_support('automatic-feed-links');
}
add_action('after_setup_theme', 'nibrc_setup');

/* ───────── 3. Scripts & Styles ───────── */
function nibrc_scripts() {
    // Google Fonts — Vazirmatn
    wp_enqueue_style('nibrc-fonts',
        'https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;600;700;800;900&display=swap',
        [], null
    );

    // Theme style
    wp_enqueue_style('nibrc-main', get_stylesheet_uri(), ['nibrc-fonts'], '1.0.0');

    // Main JS
    wp_enqueue_script('nibrc-main-js',
        get_template_directory_uri() . '/js/main.js',
        [], '1.0.0', true
    );

    // Localize for AJAX + sync
    wp_localize_script('nibrc-main-js', 'nibrcData', [
        'ajaxUrl'    => admin_url('admin-ajax.php'),
        'nonce'      => wp_create_nonce('nibrc_nonce'),
        'restUrl'    => rest_url('nibrc/v1/'),
        'restNonce'  => wp_create_nonce('wp_rest'),
        'siteUrl'    => home_url(),
        'mainSiteUrl'=> get_option('nibrc_main_site_url', 'https://nibrc.ir'),
        'syncKey'    => get_option('nibrc_sync_key', ''),
        'isLoggedIn' => is_user_logged_in(),
        'currentUser'=> nibrc_get_current_user_json(),
    ]);
}
add_action('wp_enqueue_scripts', 'nibrc_scripts');

/* ───────── 4. Helper: Current User JSON ───────── */
function nibrc_get_current_user_json() {
    if (!is_user_logged_in()) return null;
    $user = wp_get_current_user();
    return [
        'id'    => $user->ID,
        'name'  => $user->display_name,
        'email' => $user->user_email,
        'role'  => $user->roles[0] ?? 'subscriber',
        'avatar'=> get_avatar_url($user->ID, ['size' => 96]),
    ];
}

/* ───────── 5. Excerpt length ───────── */
function nibrc_excerpt_length($length) {
    return 25;
}
add_filter('excerpt_length', 'nibrc_excerpt_length');

function nibrc_excerpt_more($more) {
    return '…';
}
add_filter('excerpt_more', 'nibrc_excerpt_more');

/* ───────── 6. Admin Menu: Sync Settings ───────── */
function nibrc_admin_menu() {
    add_menu_page(
        'تنظیمات سینک NIBRC',
        'سینک NIBRC',
        'manage_options',
        'nibrc-sync',
        'nibrc_sync_settings_page',
        'dashicons-update',
        30
    );
}
add_action('admin_menu', 'nibrc_admin_menu');

function nibrc_sync_settings_page() {
    if (isset($_POST['nibrc_save_sync']) && check_admin_referer('nibrc_sync_nonce')) {
        update_option('nibrc_main_site_url', sanitize_url($_POST['main_site_url']));
        update_option('nibrc_sync_key', sanitize_text_field($_POST['sync_key']));
        update_option('nibrc_sync_enabled', isset($_POST['sync_enabled']) ? '1' : '0');
        echo '<div class="notice notice-success"><p>تنظیمات ذخیره شد.</p></div>';
    }
    $main_url = get_option('nibrc_main_site_url', 'https://nibrc.ir');
    $sync_key = get_option('nibrc_sync_key', '');
    $enabled  = get_option('nibrc_sync_enabled', '0');
    ?>
    <div class="wrap">
        <h1>تنظیمات سینک NIBRC</h1>
        <form method="post">
            <?php wp_nonce_field('nibrc_sync_nonce'); ?>
            <table class="form-table">
                <tr>
                    <th><label for="main_site_url">آدرس سایت اصلی</label></th>
                    <td><input type="url" id="main_site_url" name="main_site_url"
                               value="<?php echo esc_attr($main_url); ?>" class="regular-text" /></td>
                </tr>
                <tr>
                    <th><label for="sync_key">کلید سینک</label></th>
                    <td><input type="text" id="sync_key" name="sync_key"
                               value="<?php echo esc_attr($sync_key); ?>" class="regular-text" /></td>
                </tr>
                <tr>
                    <th><label for="sync_enabled">فعال‌سازی سینک خودکار</label></th>
                    <td><input type="checkbox" id="sync_enabled" name="sync_enabled" value="1"
                               <?php checked($enabled, '1'); ?> /></td>
                </tr>
            </table>
            <p class="submit">
                <button type="submit" name="nibrc_save_sync" class="button button-primary">ذخیره</button>
                <button type="button" class="button" onclick="if(confirm('سینک اجباری انجام شود؟')) {
                    fetch('<?php echo admin_url('admin-ajax.php'); ?>', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                        body: 'action=nibrc_force_sync&_wpnonce=<?php echo wp_create_nonce('nibrc_nonce'); ?>'
                    }).then(r=>r.json()).then(d=>alert(d.message||'انجام شد')).catch(e=>alert('خطا'));
                }">سینک اجباری</button>
            </p>
        </form>
        <hr>
        <h2>وضعیت سینک</h2>
        <?php
        $last_sync = get_option('nibrc_last_sync_time', 'هرگز');
        $sync_count = get_option('nibrc_sync_count', 0);
        echo "<p>آخرین سینک: <strong>{$last_sync}</strong></p>";
        echo "<p>تعداد کل سینک‌ها: <strong>{$sync_count}</strong></p>";
        ?>
    </div>
    <?php
}

/* ───────── 7. AJAX: Force Sync ───────── */
function nibrc_force_sync_handler() {
    check_ajax_referer('nibrc_nonce');
    if (!current_user_can('manage_options')) {
        wp_send_json_error(['message' => 'دسترسی ندارید']);
    }
    $result = nibrc_run_sync();
    wp_send_json($result);
}
add_action('wp_ajax_nibrc_force_sync', 'nibrc_force_sync_handler');
