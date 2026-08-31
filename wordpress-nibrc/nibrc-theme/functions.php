<?php
/**
 * Theme NIBRC Iran - Functions
 * قالب سایت آینه‌ای NIBRC
 */

// === Prevent direct access ===
if (!defined('ABSPATH')) exit;

// === Constants ===
define('NIBRC_VERSION', '1.0.0');
define('NIBRC_DIR', get_template_directory());
define('NIBRC_URI', get_template_directory_uri());

// === Include modules ===
require_once NIBRC_DIR . '/inc/custom-post-types.php';
require_once NIBRC_DIR . '/inc/custom-taxonomies.php';
require_once NIBRC_DIR . '/inc/sync.php';
require_once NIBRC_DIR . '/inc/auth.php';

// === Theme Setup ===
function nibrc_setup() {
    add_theme_support('title-tag');
    add_theme_support('post-thumbnails');
    add_theme_support('html5', ['search-form', 'comment-form', 'gallery', 'caption']);
    add_theme_support('custom-logo', [
        'height'      => 80,
        'width'       => 250,
        'flex-height' => true,
        'flex-width'  => true,
    ]);
    
    register_nav_menus([
        'primary' => 'منوی اصلی',
        'footer'  => 'منوی فوتر',
    ]);
    
    // Image sizes
    add_image_size('nibrc-course', 600, 400, true);
    add_image_size('nibrc-article', 800, 450, true);
    add_image_size('nibrc-instructor', 300, 300, true);
}
add_action('after_setup_theme', 'nibrc_setup');

// === Enqueue Scripts & Styles ===
function nibrc_scripts() {
    // Google Fonts - Vazirmatn
    wp_enqueue_style(
        'nibrc-vazirmatn',
        'https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;600;700;800;900&display=swap',
        [],
        null
    );
    
    // Theme style
    wp_enqueue_style('nibrc-style', get_stylesheet_uri(), ['nibrc-vazirmatn'], NIBRC_VERSION);
    
    // Theme JS
    wp_enqueue_script(
        'nibrc-main',
        NIBRC_URI . '/js/main.js',
        [],
        NIBRC_VERSION,
        true
    );
    
    // Pass data to JS
    wp_localize_script('nibrc-main', 'nibrcData', [
        'ajaxUrl'    => admin_url('admin-ajax.php'),
        'nonce'      => wp_create_nonce('nibrc_nonce'),
        'restUrl'    => rest_url('nibrc/v1/'),
        'restNonce'  => wp_create_nonce('wp_rest'),
        'siteUrl'    => home_url(),
        'mainSiteUrl'=> get_option('nibrc_main_site_url', 'https://nibrc.ir'),
        'syncKey'    => get_option('nibrc_sync_key', ''),
        'isLoggedIn' => is_user_logged_in(),
        'currentUser'=> is_user_logged_in() ? [
            'id'   => get_current_user_id(),
            'name' => wp_get_current_user()->display_name,
            'email'=> wp_get_current_user()->user_email,
            'role' => wp_get_current_user()->roles[0] ?? '',
        ] : null,
    ]);
}
add_action('wp_enqueue_scripts', 'nibrc_scripts');

// === REST API Registration ===
function nibrc_register_rest_routes() {
    register_rest_route('nibrc/v1', '/auth/register', [
        'methods'  => 'POST',
        'callback' => 'nibrc_rest_register',
        'permission_callback' => '__return_true',
    ]);
    
    register_rest_route('nibrc/v1', '/auth/login', [
        'methods'  => 'POST',
        'callback' => 'nibrc_rest_login',
        'permission_callback' => '__return_true',
    ]);
    
    register_rest_route('nibrc/v1', '/auth/me', [
        'methods'  => 'GET',
        'callback' => 'nibrc_rest_me',
        'permission_callback' => function() {
            return is_user_logged_in();
        },
    ]);
    
    register_rest_route('nibrc/v1', '/sync/status', [
        'methods'  => 'GET',
        'callback' => 'nibrc_rest_sync_status',
        'permission_callback' => function() {
            return current_user_can('manage_options');
        },
    ]);
    
    register_rest_route('nibrc/v1', '/sync/trigger', [
        'methods'  => 'POST',
        'callback' => 'nibrc_rest_sync_trigger',
        'permission_callback' => function() {
            return current_user_can('manage_options');
        },
    ]);
    
    register_rest_route('nibrc/v1', '/content/(?P<type>[a-z]+)', [
        'methods'  => 'GET',
        'callback' => 'nibrc_rest_content',
        'permission_callback' => '__return_true',
        'args' => [
            'type' => [
                'sanitize_callback' => 'sanitize_text_field',
            ],
        ],
    ]);
    
    register_rest_route('nibrc/v1', '/dictionary', [
        'methods'  => 'GET',
        'callback' => 'nibrc_rest_dictionary',
        'permission_callback' => '__return_true',
    ]);
    
    register_rest_route('nibrc/v1', '/exams', [
        'methods'  => 'GET',
        'callback' => 'nibrc_rest_exams',
        'permission_callback' => '__return_true',
    ]);
    
    register_rest_route('nibrc/v1', '/offline/enroll', [
        'methods'  => 'POST',
        'callback' => 'nibrc_rest_offline_enroll',
        'permission_callback' => '__return_true',
    ]);
    
    register_rest_route('nibrc/v1', '/support/ticket', [
        'methods'  => 'POST',
        'callback' => 'nibrc_rest_support_ticket',
        'permission_callback' => '__return_true',
    ]);
}
add_action('rest_api_init', 'nibrc_register_rest_routes');

// === REST Callbacks ===
function nibrc_rest_register($request) {
    $email = sanitize_email($request->get_param('email'));
    $password = $request->get_param('password');
    $name = sanitize_text_field($request->get_param('name'));
    
    if (!$email || !$password || !$name) {
        return new WP_REST_Response(['ok' => false, 'error' => 'فیلدهای الزامی پر نشده'], 400);
    }
    
    if (email_exists($email)) {
        return new WP_REST_Response(['ok' => false, 'error' => 'این ایمیل قبلاً ثبت‌نام شده'], 409);
    }
    
    $user_id = wp_create_user($email, $password, $email);
    
    if (is_wp_error($user_id)) {
        return new WP_REST_Response(['ok' => false, 'error' => $user_id->get_error_message()], 500);
    }
    
    wp_update_user([
        'ID'           => $user_id,
        'display_name' => $name,
        'role'         => 'subscriber',
    ]);
    
    // Store additional meta
    update_user_meta($user_id, 'display_name', $name);
    update_user_meta($user_id, 'registered_source', 'iran_site');
    
    // Auto login
    wp_set_current_user($user_id);
    wp_set_auth_cookie($user_id);
    
    return new WP_REST_Response([
        'ok'   => true,
        'data' => [
            'id'    => $user_id,
            'name'  => $name,
            'email' => $email,
            'role'  => 'subscriber',
        ],
    ], 200);
}

function nibrc_rest_login($request) {
    $email = sanitize_email($request->get_param('email'));
    $password = $request->get_param('password');
    
    if (!$email || !$password) {
        return new WP_REST_Response(['ok' => false, 'error' => 'ایمیل و رمز عبور الزامی است'], 400);
    }
    
    $user = wp_authenticate($email, $password);
    
    if (is_wp_error($user)) {
        return new WP_REST_Response(['ok' => false, 'error' => 'ایمیل یا رمز عبور اشتباه است'], 401);
    }
    
    wp_set_current_user($user->ID);
    wp_set_auth_cookie($user->ID);
    
    return new WP_REST_Response([
        'ok'   => true,
        'data' => [
            'id'    => $user->ID,
            'name'  => $user->display_name,
            'email' => $user->user_email,
            'role'  => $user->roles[0] ?? 'subscriber',
        ],
    ], 200);
}

function nibrc_rest_me($request) {
    $user = wp_get_current_user();
    
    return new WP_REST_Response([
        'ok'   => true,
        'data' => [
            'id'    => $user->ID,
            'name'  => $user->display_name,
            'email' => $user->user_email,
            'role'  => $user->roles[0] ?? 'subscriber',
        ],
    ], 200);
}

function nibrc_rest_content($request) {
    $type = $request->get_param('type');
    
    $type_map = [
        'courses'     => 'course',
        'articles'    => 'article',
        'instructors' => 'instructor',
        'products'    => 'product',
        'workshops'   => 'workshop',
        'categories'  => 'category',
    ];
    
    $post_type = $type_map[$type] ?? null;
    
    if (!$post_type) {
        return new WP_REST_Response(['ok' => false, 'error' => 'نوع محتوا نامعتبر'], 400);
    }
    
    $posts = get_posts([
        'post_type'      => $post_type,
        'posts_per_page' => -1,
        'post_status'    => 'publish',
        'orderby'        => 'date',
        'order'          => 'DESC',
    ]);
    
    $data = array_map(function($post) {
        $item = [
            'id'          => $post->ID,
            'title'       => $post->post_title,
            'slug'        => $post->post_name,
            'excerpt'     => wp_trim_words($post->post_excerpt ?: $post->post_content, 30),
            'content'     => apply_filters('the_content', $post->post_content),
            'image'       => get_the_post_thumbnail_url($post->ID, 'medium') ?: '',
            'date'        => $post->post_date,
            'modified'    => $post->post_modified,
        ];
        
        // Add custom fields based on post type
        if ($post->post_type === 'course') {
            $item['price'] = get_post_meta($post->ID, '_nibrc_price', true);
            $item['packages'] = get_post_meta($post->ID, '_nibrc_packages', true);
            $item['instructor'] = get_post_meta($post->ID, '_nibrc_instructor', true);
            $item['duration'] = get_post_meta($post->ID, '_nibrc_duration', true);
            $item['level'] = get_post_meta($post->ID, '_nibrc_level', true);
            $item['lessons'] = get_post_meta($post->ID, '_nibrc_lessons', true);
        } elseif ($post->post_type === 'instructor') {
            $item['bio'] = get_post_meta($post->ID, '_nibrc_bio', true);
            $item['specialty'] = get_post_meta($post->ID, '_nibrc_specialty', true);
        } elseif ($post->post_type === 'product') {
            $item['price'] = get_post_meta($post->ID, '_nibrc_price', true);
            $item['type'] = get_post_meta($post->ID, '_nibrc_product_type', true);
        } elseif ($post->post_type === 'workshop') {
            $item['date'] = get_post_meta($post->ID, '_nibrc_workshop_date', true);
            $item['time'] = get_post_meta($post->ID, '_nibrc_workshop_time', true);
            $item['capacity'] = get_post_meta($post->ID, '_nibrc_capacity', true);
        }
        
        return $item;
    }, $posts);
    
    return new WP_REST_Response(['ok' => true, 'data' => $data], 200);
}

function nibrc_rest_dictionary($request) {
    $search = sanitize_text_field($request->get_param('q') ?? '');
    
    $args = [
        'post_type'      => 'dictionary_term',
        'posts_per_page' => -1,
        'post_status'    => 'publish',
    ];
    
    if ($search) {
        $args['s'] = $search;
    }
    
    $posts = get_posts($args);
    
    $data = array_map(function($post) {
        return [
            'id'          => $post->ID,
            'term'        => $post->post_title,
            'definition'  => apply_filters('the_content', $post->post_content),
            'latin'       => get_post_meta($post->ID, '_nibrc_latin', true),
            'category'    => get_post_meta($post->ID, '_nibrc_category', true),
            'habitat'     => get_post_meta($post->ID, '_nibrc_habitat', true),
            'oxygen'      => get_post_meta($post->ID, '_nibrc_oxygen', true),
            'diseases'    => get_post_meta($post->ID, '_nibrc_diseases', true),
        ];
    }, $posts);
    
    return new WP_REST_Response(['ok' => true, 'data' => $data], 200);
}

function nibrc_rest_exams($request) {
    $posts = get_posts([
        'post_type'      => 'exam',
        'posts_per_page' => -1,
        'post_status'    => 'publish',
    ]);
    
    $data = array_map(function($post) {
        return [
            'id'          => $post->ID,
            'title'       => $post->post_title,
            'description' => apply_filters('the_content', $post->post_content),
            'duration'    => get_post_meta($post->ID, '_nibrc_duration', true),
            'questions'   => get_post_meta($post->ID, '_nibrc_questions', true),
            'pass_score'  => get_post_meta($post->ID, '_nibrc_pass_score', true),
        ];
    }, $posts);
    
    return new WP_REST_Response(['ok' => true, 'data' => $data], 200);
}

function nibrc_rest_sync_status($request) {
    $last_sync = get_option('nibrc_last_sync', null);
    $sync_count = get_option('nibrc_sync_count', 0);
    $sync_errors = get_option('nibrc_sync_errors', 0);
    
    return new WP_REST_Response([
        'ok'   => true,
        'data' => [
            'last_sync'  => $last_sync,
            'sync_count' => $sync_count,
            'errors'     => $sync_errors,
            'main_site'  => get_option('nibrc_main_site_url', 'https://nibrc.ir'),
        ],
    ], 200);
}

function nibrc_rest_sync_trigger($request) {
    $result = nibrc_perform_sync();
    return new WP_REST_Response($result, $result['ok'] ? 200 : 500);
}

function nibrc_rest_offline_enroll($request) {
    $course_id = intval($request->get_param('course_id'));
    $user_email = sanitize_email($request->get_param('email'));
    $user_name = sanitize_text_field($request->get_param('name'));
    
    if (!$course_id || !$user_email) {
        return new WP_REST_Response(['ok' => false, 'error' => 'فیلدهای الزامی پر نشده'], 400);
    }
    
    // Store offline enrollment
    $enrollment_data = [
        'course_id'  => $course_id,
        'email'      => $user_email,
        'name'       => $user_name,
        'date'       => current_time('mysql'),
        'synced'     => false,
    ];
    
    $enrollments = get_option('nibrc_offline_enrollments', []);
    $enrollments[] = $enrollment_data;
    update_option('nibrc_offline_enrollments', $enrollments);
    
    // If user is logged in, also create WP enrollment
    if (is_user_logged_in()) {
        $user_id = get_current_user_id();
        update_user_meta($user_id, 'nibrc_enrolled_' . $course_id, true);
    }
    
    return new WP_REST_Response([
        'ok'   => true,
        'data' => [
            'message' => 'ثبت‌نام با موفقیت انجام شد',
            'offline' => true,
        ],
    ], 200);
}

function nibrc_rest_support_ticket($request) {
    $subject = sanitize_text_field($request->get_param('subject'));
    $message = sanitize_textarea_field($request->get_param('message'));
    $email = sanitize_email($request->get_param('email'));
    
    if (!$subject || !$message) {
        return new WP_REST_Response(['ok' => false, 'error' => 'موضوع و پیام الزامی است'], 400);
    }
    
    $ticket_data = [
        'subject'  => $subject,
        'message'  => $message,
        'email'    => $email,
        'user_id'  => is_user_logged_in() ? get_current_user_id() : 0,
        'date'     => current_time('mysql'),
        'status'   => 'open',
        'synced'   => false,
    ];
    
    $tickets = get_option('nibrc_support_tickets', []);
    $tickets[] = $ticket_data;
    update_option('nibrc_support_tickets', $tickets);
    
    return new WP_REST_Response([
        'ok'   => true,
        'data' => ['message' => 'تیکت شما ثبت شد'],
    ], 200);
}

// === Widget Areas ===
function nibrc_widgets_init() {
    register_sidebar([
        'name'          => 'سایدبار',
        'id'            => 'sidebar-1',
        'before_widget' => '<div class="widget %2$s">',
        'after_widget'  => '</div>',
        'before_title'  => '<h3 class="widget-title">',
        'after_title'   => '</h3>',
    ]);
}
add_action('widgets_init', 'nibrc_widgets_init');

// === Admin Menu for Sync Settings ===
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
        update_option('nibrc_main_site_url', esc_url_raw($_POST['main_site_url']));
        update_option('nibrc_sync_key', sanitize_text_field($_POST['sync_key']));
        update_option('nibrc_sync_interval', intval($_POST['sync_interval']));
        echo '<div class="notice notice-success"><p>تنظیمات ذخیره شد.</p></div>';
    }
    
    $main_url = get_option('nibrc_main_site_url', 'https://nibrc.ir');
    $sync_key = get_option('nibrc_sync_key', '');
    $interval = get_option('nibrc_sync_interval', 1800);
    $last_sync = get_option('nibrc_last_sync', 'هرگز');
    ?>
    <div class="wrap">
        <h1>تنظیمات سینک NIBRC</h1>
        <form method="post">
            <?php wp_nonce_field('nibrc_sync_nonce'); ?>
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
                    <td><input type="number" name="sync_interval" value="<?php echo esc_attr($interval); ?>" min="300" /></td>
                </tr>
                <tr>
                    <th>آخرین سینک</th>
                    <td><?php echo esc_html($last_sync); ?></td>
                </tr>
            </table>
            <p class="submit">
                <input type="submit" name="nibrc_save_sync" class="button-primary" value="ذخیره تنظیمات" />
                <button type="button" class="button" onclick="nibrcManualSync()">سینک دستی</button>
            </p>
        </form>
        <script>
        function nibrcManualSync() {
            fetch('<?php echo admin_url("admin-ajax.php"); ?>', {
                method: 'POST',
                headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                body: 'action=nibrc_manual_sync&_ajax_nonce=<?php echo wp_create_nonce("nibrc_nonce"); ?>'
            }).then(r => r.json()).then(d => {
                alert(d.data?.message || 'سینک انجام شد');
                location.reload();
            }).catch(e => alert('خطا: ' + e.message));
        }
        </script>
    </div>
    <?php
}

// === AJAX handler for manual sync ===
function nibrc_manual_sync_handler() {
    check_ajax_referer('nibrc_nonce');
    
    if (!current_user_can('manage_options')) {
        wp_send_json_error(['message' => 'دسترسی ندارید']);
    }
    
    $result = nibrc_perform_sync();
    wp_send_json($result);
}
add_action('wp_ajax_nibrc_manual_sync', 'nibrc_manual_sync_handler');
