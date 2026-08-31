<?php
/**
 * Plugin Name: NIBRC Sync
 * Description: همگام‌سازی خودکار داده‌ها از سایت اصلی NIBRC با قابلیت کار آفلاین
 * Version: 1.0.0
 * Author: NIBRC Team
 * Text Domain: nibrc-sync
 */

if (!defined('ABSPATH')) exit;

class Nibrc_Sync_Plugin {
    
    private static $instance = null;
    
    public static function instance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    public function __construct() {
        add_action('init', [$this, 'init']);
        add_action('admin_menu', [$this, 'admin_menu']);
        add_action('wp_ajax_nibrc_sync_now', [$this, 'ajax_sync']);
        add_action('wp_ajax_nibrc_push_changes', [$this, 'ajax_push']);
        add_action('nibrc_auto_sync', [$this, 'perform_sync']);
        
        // Register custom REST endpoints
        add_action('rest_api_init', [$this, 'register_routes']);
    }
    
    public function init() {
        // Schedule sync if not already scheduled
        if (!wp_next_scheduled('nibrc_auto_sync')) {
            $interval = get_option('nibrc_sync_interval', 1800);
            wp_schedule_event(time(), 'nibrc_sync_interval', 'nibrc_auto_sync');
        }
    }
    
    // === Admin Page ===
    public function admin_menu() {
        add_submenu_page(
            'options-general.php',
            'تنظیمات سینک NIBRC',
            'سینک NIBRC',
            'manage_options',
            'nibrc-sync-settings',
            [$this, 'settings_page']
        );
    }
    
    public function settings_page() {
        if (isset($_POST['nibrc_save_settings']) && check_admin_referer('nibrc_sync_settings')) {
            update_option('nibrc_main_site_url', esc_url_raw($_POST['main_site_url']));
            update_option('nibrc_sync_key', sanitize_text_field($_POST['sync_key']));
            update_option('nibrc_sync_interval', intval($_POST['sync_interval']));
            echo '<div class="notice notice-success"><p>تنظیمات ذخیره شد.</p></div>';
        }
        
        $main_url = get_option('nibrc_main_site_url', 'https://nibrc.ir');
        $sync_key = get_option('nibrc_sync_key', '');
        $interval = get_option('nibrc_sync_interval', 1800);
        $last_sync = get_option('nibrc_last_sync', 'هرگز');
        $sync_count = get_option('nibrc_sync_count', 0);
        $errors = get_option('nibrc_sync_errors', 0);
        
        $offline_enrollments = get_option('nibrc_offline_enrollments', []);
        $pending = count(array_filter($offline_enrollments, function($e) { return empty($e['synced']); }));
        ?>
        <div class="wrap">
            <h1>تنظیمات سینک NIBRC</h1>
            
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin:20px 0;">
                <div style="background:white;padding:20px;border-radius:8px;border:1px solid #ccd0d4;">
                    <div style="font-size:2rem;font-weight:700;color:#059669;"><?php echo $sync_count; ?></div>
                    <div style="color:#666;">سینک موفق</div>
                </div>
                <div style="background:white;padding:20px;border-radius:8px;border:1px solid #ccd0d4;">
                    <div style="font-size:2rem;font-weight:700;color:<?php echo $errors > 0 ? '#dc2626' : '#059669'; ?>;"><?php echo $errors; ?></div>
                    <div style="color:#666;">خطا</div>
                </div>
                <div style="background:white;padding:20px;border-radius:8px;border:1px solid #ccd0d4;">
                    <div style="font-size:2rem;font-weight:700;color:#f59e0b;"><?php echo $pending; ?></div>
                    <div style="color:#666;">تغییر آفلاین منتظر</div>
                </div>
            </div>
            
            <form method="post">
                <?php wp_nonce_field('nibrc_sync_settings'); ?>
                <table class="form-table">
                    <tr>
                        <th>آدرس سایت اصلی</th>
                        <td><input type="url" name="main_site_url" value="<?php echo esc_attr($main_url); ?>" class="regular-text" /></td>
                    </tr>
                    <tr>
                        <th>کلید سینک</th>
                        <td><input type="text" name="sync_key" value="<?php echo esc_attr($sync_key); ?>" class="regular-text" /></td>
                    </tr>
                    <tr>
                        <th>فاصله سینک (ثانیه)</th>
                        <td>
                            <select name="sync_interval">
                                <option value="300" <?php selected($interval, 300); ?>>هر ۵ دقیقه</option>
                                <option value="900" <?php selected($interval, 900); ?>>هر ۱۵ دقیقه</option>
                                <option value="1800" <?php selected($interval, 1800); ?>>هر ۳۰ دقیقه</option>
                                <option value="3600" <?php selected($interval, 3600); ?>>هر ۱ ساعت</option>
                            </select>
                        </td>
                    </tr>
                    <tr>
                        <th>آخرین سینک موفق</th>
                        <td><?php echo esc_html($last_sync); ?></td>
                    </tr>
                </table>
                <p class="submit">
                    <input type="submit" name="nibrc_save_settings" class="button-primary" value="ذخیره تنظیمات" />
                    <button type="button" class="button" onclick="nibrcSyncNow()">🔄 سینک فوری</button>
                    <button type="button" class="button" onclick="nibrcPushChanges()">📤 ارسال تغییرات آفلاین</button>
                </p>
            </form>
            
            <script>
            function nibrcSyncNow() {
                var btn = event.target;
                btn.disabled = true;
                btn.textContent = 'در حال سینک...';
                
                fetch('<?php echo admin_url("admin-ajax.php"); ?>', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                    body: 'action=nibrc_sync_now&_ajax_nonce=<?php echo wp_create_nonce("nibrc_nonce"); ?>'
                }).then(function(r) { return r.json(); }).then(function(res) {
                    alert(res.data?.message || 'سینک انجام شد');
                    location.reload();
                }).catch(function(e) {
                    alert('خطا: ' + e.message);
                    btn.disabled = false;
                    btn.textContent = '🔄 سینک فوری';
                });
            }
            
            function nibrcPushChanges() {
                fetch('<?php echo admin_url("admin-ajax.php"); ?>', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                    body: 'action=nibrc_push_changes&_ajax_nonce=<?php echo wp_create_nonce("nibrc_nonce"); ?>'
                }).then(function(r) { return r.json(); }).then(function(res) {
                    alert(res.data?.message || 'انجام شد');
                    location.reload();
                });
            }
            </script>
            
            <h2 style="margin-top:30px;">راهنمای نصب</h2>
            <div style="background:white;padding:20px;border-radius:8px;border:1px solid #ccd0d4;line-height:2;">
                <ol>
                    <li>آدرس سایت اصلی (<code>https://nibrc.ir</code>) را وارد کنید</li>
                    <li>کلید سینک را از تنظیمات سایت اصلی بگیرید</li>
                    <li>فاصله سینک را تنظیم کنید (پیشنهاد: ۳۰ دقیقه)</li>
                    <li>ذخیره کنید و سینک فوری را بزنید</li>
                </ol>
            </div>
        </div>
        <?php
    }
    
    // === Sync Logic ===
    public function perform_sync() {
        $main_url = get_option('nibrc_main_site_url', 'https://nibrc.ir');
        $sync_key = get_option('nibrc_sync_key', '');
        
        if (empty($main_url)) {
            return ['ok' => false, 'message' => 'آدرس سایت اصلی تنظیم نشده'];
        }
        
        $response = wp_remote_get(rtrim($main_url, '/') . '/sync/data', [
            'timeout' => 60,
            'headers' => [
                'X-Sync-Key' => $sync_key,
                'Accept'     => 'application/json',
            ],
        ]);
        
        if (is_wp_error($response)) {
            $this->log_error($response->get_error_message());
            return ['ok' => false, 'message' => $response->get_error_message()];
        }
        
        $code = wp_remote_retrieve_response_code($response);
        $body = wp_remote_retrieve_body($response);
        
        if ($code !== 200) {
            $this->log_error('HTTP ' . $code);
            return ['ok' => false, 'message' => 'HTTP ' . $code];
        }
        
        $data = json_decode($body, true);
        
        if (!$data || !isset($data['data'])) {
            return ['ok' => false, 'message' => 'فرمت پاسخ نامعتبر'];
        }
        
        $counts = $this->sync_content_types($data['data']);
        
        update_option('nibrc_last_sync', current_time('mysql'));
        $count = get_option('nibrc_sync_count', 0);
        update_option('nibrc_sync_count', $count + 1);
        update_option('nibrc_sync_errors', 0);
        
        return ['ok' => true, 'message' => 'سینک موفق', 'counts' => $counts];
    }
    
    private function sync_content_types($data) {
        $map = [
            'courses'     => 'course',
            'articles'    => 'article',
            'instructors' => 'instructor',
            'products'    => 'product',
            'workshops'   => 'workshop',
            'dictionary'  => 'dictionary_term',
            'exams'       => 'exam',
        ];
        
        $counts = [];
        
        foreach ($map as $key => $post_type) {
            if (isset($data[$key]) && is_array($data[$key])) {
                $counts[$key] = $this->sync_items($data[$key], $post_type);
            }
        }
        
        return $counts;
    }
    
    private function sync_items($items, $post_type) {
        $count = 0;
        
        foreach ($items as $item) {
            $remote_id = $item['id'] ?? $item['_id'] ?? null;
            $title = $item['title'] ?? $item['name'] ?? '';
            
            if (!$title) continue;
            
            // Find existing by remote_id
            $existing = null;
            if ($remote_id) {
                $found = get_posts([
                    'post_type'   => $post_type,
                    'meta_key'    => '_nibrc_remote_id',
                    'meta_value'  => $remote_id,
                    'numberposts' => 1,
                    'post_status' => 'any',
                ]);
                $existing = !empty($found) ? $found[0] : null;
            }
            
            $post_data = [
                'post_title'   => $title,
                'post_content' => $item['content'] ?? $item['description'] ?? '',
                'post_excerpt' => $item['excerpt'] ?? '',
                'post_status'  => 'publish',
                'post_type'    => $post_type,
                'post_name'    => $item['slug'] ?? sanitize_title($title),
            ];
            
            if ($existing) {
                $post_data['ID'] = $existing->ID;
                wp_update_post($post_data);
                $post_id = $existing->ID;
            } else {
                $post_id = wp_insert_post($post_data);
            }
            
            if (is_wp_error($post_id)) continue;
            
            // Save remote ID
            if ($remote_id) {
                update_post_meta($post_id, '_nibrc_remote_id', $remote_id);
            }
            
            // Save meta fields
            $meta_fields = [
                'price' => '_nibrc_price', 'duration' => '_nibrc_duration',
                'level' => '_nibrc_level', 'lessons' => '_nibrc_lessons',
                'packages' => '_nibrc_packages', 'bio' => '_nibrc_bio',
                'specialty' => '_nibrc_specialty', 'type' => '_nibrc_product_type',
                'date' => '_nibrc_workshop_date', 'time' => '_nibrc_workshop_time',
                'capacity' => '_nibrc_capacity', 'latin' => '_nibrc_latin',
                'habitat' => '_nibrc_habitat', 'oxygen' => '_nibrc_oxygen',
                'diseases' => '_nibrc_diseases', 'pass_score' => '_nibrc_pass_score',
                'questions' => '_nibrc_questions',
            ];
            
            foreach ($meta_fields as $remote_key => $meta_key) {
                if (isset($item[$remote_key]) && $item[$remote_key] !== null) {
                    $val = is_array($item[$remote_key]) ? json_encode($item[$remote_key]) : $item[$remote_key];
                    update_post_meta($post_id, $meta_key, $val);
                }
            }
            
            $count++;
        }
        
        return $count;
    }
    
    // === Push Offline Changes ===
    public function push_offline_changes() {
        $main_url = get_option('nibrc_main_site_url', 'https://nibrc.ir');
        $sync_key = get_option('nibrc_sync_key', '');
        
        $enrollments = get_option('nibrc_offline_enrollments', []);
        $pending = array_values(array_filter($enrollments, function($e) { return empty($e['synced']); }));
        
        if (empty($pending)) {
            return ['ok' => true, 'message' => 'تغییراتی برای ارسال وجود ندارد'];
        }
        
        $response = wp_remote_post(rtrim($main_url, '/') . '/sync/push', [
            'timeout' => 30,
            'headers' => [
                'X-Sync-Key'  => $sync_key,
                'Content-Type'=> 'application/json',
            ],
            'body' => json_encode(['enrollments' => $pending]),
        ]);
        
        if (is_wp_error($response)) {
            return ['ok' => false, 'message' => $response->get_error_message()];
        }
        
        $code = wp_remote_retrieve_response_code($response);
        
        if ($code === 200) {
            foreach ($enrollments as &$e) { $e['synced'] = true; }
            update_option('nibrc_offline_enrollments', $enrollments);
            return ['ok' => true, 'message' => 'تغییرات ارسال شد'];
        }
        
        return ['ok' => false, 'message' => 'خطا: HTTP ' . $code];
    }
    
    // === AJAX Handlers ===
    public function ajax_sync() {
        check_ajax_referer('nibrc_nonce');
        if (!current_user_can('manage_options')) wp_send_json_error(['message' => 'دسترسی ندارید']);
        
        $result = $this->perform_sync();
        wp_send_json($result);
    }
    
    public function ajax_push() {
        check_ajax_referer('nibrc_nonce');
        if (!current_user_can('manage_options')) wp_send_json_error(['message' => 'دسترسی ندارید']);
        
        $result = $this->push_offline_changes();
        wp_send_json($result);
    }
    
    // === REST API Routes ===
    public function register_routes() {
        register_rest_route('nibrc/v1', '/sync/status', [
            'methods'  => 'GET',
            'callback' => function() {
                return new WP_REST_Response([
                    'ok'   => true,
                    'data' => [
                        'last_sync'  => get_option('nibrc_last_sync', null),
                        'sync_count' => get_option('nibrc_sync_count', 0),
                        'errors'     => get_option('nibrc_sync_errors', 0),
                    ],
                ]);
            },
            'permission_callback' => function() {
                return current_user_can('manage_options');
            },
        ]);
        
        register_rest_route('nibrc/v1', '/offline/enroll', [
            'methods'  => 'POST',
            'callback' => function($request) {
                $course_id = intval($request->get_param('course_id'));
                $email = sanitize_email($request->get_param('email'));
                
                if (!$course_id || !$email) {
                    return new WP_REST_Response(['ok' => false, 'error' => 'فیلدهای الزامی پر نشده'], 400);
                }
                
                $enrollments = get_option('nibrc_offline_enrollments', []);
                $enrollments[] = [
                    'course_id' => $course_id,
                    'email'     => $email,
                    'name'      => sanitize_text_field($request->get_param('name')),
                    'date'      => current_time('mysql'),
                    'synced'    => false,
                ];
                update_option('nibrc_offline_enrollments', $enrollments);
                
                return new WP_REST_Response(['ok' => true, 'data' => ['message' => 'ثبت‌نام انجام شد', 'offline' => true]]);
            },
            'permission_callback' => '__return_true',
        ]);
    }
    
    private function log_error($msg) {
        $errors = get_option('nibrc_sync_errors', 0);
        update_option('nibrc_sync_errors', $errors + 1);
        error_log('[NIBRC Sync] ' . $msg);
    }
}

// Register cron interval
add_filter('cron_schedules', function($schedules) {
    $schedules['nibrc_sync_interval'] = [
        'interval' => get_option('nibrc_sync_interval', 1800),
        'display'  => 'NIBRC Sync',
    ];
    return $schedules;
});

// Initialize
Nibrc_Sync_Plugin::instance();
