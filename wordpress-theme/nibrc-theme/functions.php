<?php
/**
 * Theme: NIBRC Iran
 * functions.php — Core theme functions
 */

define('NIBRC_VERSION', '1.0.0');
define('NIBRC_DIR', get_template_directory());
define('NIBRC_URI', get_template_directory_uri());

/* ============================================
   1. THEME SETUP
   ============================================ */
add_action('after_setup_theme', function() {
    add_theme_support('title-tag');
    add_theme_support('post-thumbnails');
    add_theme_support('custom-logo', array('height' => 80, 'width' => 250));
    add_theme_support('html5', array('search-form', 'comment-form', 'gallery', 'caption'));
    add_theme_support('editor-styles');

    register_nav_menus(array(
        'main'    => 'منوی اصلی',
        'footer'  => 'منوی فوتر',
        'mobile'  => 'منوی موبایل',
    ));

    add_image_size('nibrc-card', 600, 340, true);
    add_image_size('nibrc-hero', 1200, 600, true);
    add_image_size('nibrc-avatar', 200, 200, true);
});

/* ============================================
   2. ENQUEUE SCRIPTS & STYLES
   ============================================ */
add_action('wp_enqueue_scripts', function() {
    // Google Fonts — Vazirmatn
    wp_enqueue_style('nibrc-fonts', 'https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33/Vazirmatn-font-face.css', array(), '33');

    // Theme styles
    wp_enqueue_style('nibrc-style', get_stylesheet_uri(), array('nibrc-fonts'), NIBRC_VERSION);
    wp_enqueue_style('nibrc-main', NIBRC_URI . '/assets/css/main.css', array('nibrc-style'), NIBRC_VERSION);

    // Theme scripts
    wp_enqueue_script('nibrc-main', NIBRC_URI . '/assets/js/main.js', array(), NIBRC_VERSION, true);

    // Localize for AJAX
    wp_localize_script('nibrc-main', 'nibrcData', array(
        'ajaxUrl'   => admin_url('admin-ajax.php'),
        'restUrl'   => rest_url('nibrc/v1/'),
        'nonce'     => wp_create_nonce('nibrc_nonce'),
        'restNonce' => wp_create_nonce('wp_rest'),
        'siteUrl'   => home_url(),
        'isLoggedIn'=> is_user_logged_in(),
    ));
});

/* ============================================
   3. CUSTOM POST TYPES
   ============================================ */

// Courses
add_action('init', function() {
    register_post_type('course', array(
        'labels' => array(
            'name' => 'دوره‌ها', 'singular_name' => 'دوره',
            'add_new' => 'افزودن دوره', 'add_new_item' => 'افزودن دوره جدید',
            'edit_item' => 'ویرایش دوره', 'all_items' => 'همه دوره‌ها',
            'search_items' => 'جستجوی دوره', 'not_found' => 'دوره‌ای یافت نشد',
        ),
        'public' => true,
        'has_archive' => true,
        'rewrite' => array('slug' => 'courses'),
        'menu_icon' => 'dashicons-welcome-learn-more',
        'supports' => array('title', 'editor', 'thumbnail', 'excerpt', 'custom-fields'),
        'show_in_rest' => true,
    ));

    register_taxonomy('course_category', 'course', array(
        'labels' => array('name' => 'دسته‌بندی دوره‌ها', 'singular_name' => 'دسته'),
        'hierarchical' => true,
        'rewrite' => array('slug' => 'course-category'),
        'show_in_rest' => true,
    ));
});

// Articles
add_action('init', function() {
    register_post_type('article', array(
        'labels' => array(
            'name' => 'مقالات', 'singular_name' => 'مقاله',
            'add_new' => 'افزودن مقاله', 'add_new_item' => 'افزودن مقاله جدید',
            'edit_item' => 'ویرایش مقاله', 'all_items' => 'همه مقالات',
        ),
        'public' => true,
        'has_archive' => true,
        'rewrite' => array('slug' => 'articles'),
        'menu_icon' => 'dashicons-media-text',
        'supports' => array('title', 'editor', 'thumbnail', 'excerpt', 'custom-fields'),
        'show_in_rest' => true,
    ));

    register_taxonomy('article_category', 'article', array(
        'labels' => array('name' => 'دسته‌بندی مقالات', 'singular_name' => 'دسته'),
        'hierarchical' => true,
        'rewrite' => array('slug' => 'article-category'),
        'show_in_rest' => true,
    ));
});

// Instructors
add_action('init', function() {
    register_post_type('instructor', array(
        'labels' => array(
            'name' => 'اساتید', 'singular_name' => 'استاد',
            'add_new' => 'افزودن استاد', 'all_items' => 'همه اساتید',
        ),
        'public' => true,
        'has_archive' => true,
        'rewrite' => array('slug' => 'instructors'),
        'menu_icon' => 'dashicons-groups',
        'supports' => array('title', 'editor', 'thumbnail', 'custom-fields'),
        'show_in_rest' => true,
    ));
});

// Products
add_action('init', function() {
    register_post_type('product', array(
        'labels' => array(
            'name' => 'محصولات', 'singular_name' => 'محصول',
            'add_new' => 'افزودن محصول', 'all_items' => 'همه محصولات',
        ),
        'public' => true,
        'has_archive' => true,
        'rewrite' => array('slug' => 'products'),
        'menu_icon' => 'dashicons-cart',
        'supports' => array('title', 'editor', 'thumbnail', 'excerpt', 'custom-fields'),
        'show_in_rest' => true,
    ));
});

// Workshops
add_action('init', function() {
    register_post_type('workshop', array(
        'labels' => array(
            'name' => 'کارگاه‌ها', 'singular_name' => 'کارگاه',
            'add_new' => 'افزودن کارگاه', 'all_items' => 'همه کارگاه‌ها',
        ),
        'public' => true,
        'has_archive' => true,
        'rewrite' => array('slug' => 'workshops'),
        'menu_icon' => 'dashicons-welcome-view-site',
        'supports' => array('title', 'editor', 'thumbnail', 'excerpt', 'custom-fields'),
        'show_in_rest' => true,
    ));
});

// Dictionary Terms
add_action('init', function() {
    register_post_type('dictionary', array(
        'labels' => array(
            'name' => 'دیکشنری', 'singular_name' => 'واژه',
            'add_new' => 'افزودن واژه', 'all_items' => 'همه واژه‌ها',
        ),
        'public' => true,
        'has_archive' => true,
        'rewrite' => array('slug' => 'dictionary'),
        'menu_icon' => 'dashicons-book-alt',
        'supports' => array('title', 'editor', 'custom-fields'),
        'show_in_rest' => true,
    ));
});

/* ============================================
   4. CUSTOM META BOXES (ACF-like with native WP)
   ============================================ */

// Course meta boxes
add_action('add_meta_boxes', function() {
    add_meta_box('course_details', 'جزئیات دوره', function($post) {
        wp_nonce_field('nibrc_course_meta', 'nibrc_course_nonce');
        $price = get_post_meta($post->ID, '_course_price', true);
        $level = get_post_meta($post->ID, '_course_level', true);
        $duration = get_post_meta($post->ID, '_course_duration', true);
        $instructor_id = get_post_meta($post->ID, '_instructor_id', true);
        $slug = get_post_meta($post->ID, '_course_slug', true);
        ?>
        <table class="form-table">
            <tr><th>شناسه یکتا (slug)</th><td><input type="text" name="course_slug" value="<?php echo esc_attr($slug); ?>" class="regular-text" /></td></tr>
            <tr><th>قیمت (تومان)</th><td><input type="number" name="course_price" value="<?php echo esc_attr($price); ?>" class="regular-text" /></td></tr>
            <tr><th>سطح دوره</th><td>
                <select name="course_level">
                    <?php
                    $levels = array('مبتدی', 'متوسط', 'پیشرفته', 'تخصّصی');
                    foreach ($levels as $l) {
                        echo '<option value="' . $l . '" ' . selected($level, $l) . '>' . $l . '</option>';
                    }
                    ?>
                </select>
            </td></tr>
            <tr><th>مدّت زمان</th><td><input type="text" name="course_duration" value="<?php echo esc_attr($duration); ?>" class="regular-text" placeholder="مثلاً: ۴۰ ساعت" /></td></tr>
            <tr><th>استاد</th><td>
                <select name="course_instructor">
                    <option value="">— انتخاب استاد —</option>
                    <?php
                    $instructors = get_posts(array('post_type' => 'instructor', 'numberposts' => -1));
                    foreach ($instructors as $inst) {
                        echo '<option value="' . $inst->ID . '" ' . selected($instructor_id, $inst->ID) . '>' . $inst->post_title . '</option>';
                    }
                    ?>
                </select>
            </td></tr>
            <tr><th>وضعیت</th><td>
                <select name="course_status">
                    <?php
                    $statuses = array('پیش‌نویس' => 'draft', 'منتشر' => 'publish', 'آرشیو' => 'archive');
                    $current = get_post_meta($post->ID, '_course_status_val', true) ?: 'draft';
                    foreach ($statuses as $label => $val) {
                        echo '<option value="' . $val . '" ' . selected($current, $val) . '>' . $label . '</option>';
                    }
                    ?>
                </select>
            </td></tr>
        </table>
        <?php
    }, 'course', 'normal', 'high');
});

add_action('save_post_course', function($post_id) {
    if (!isset($_POST['nibrc_course_nonce']) || !wp_verify_nonce($_POST['nibrc_course_nonce'], 'nibrc_course_meta')) return;
    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) return;
    if (!current_user_can('edit_post', $post_id)) return;

    $fields = array(
        'course_slug' => '_course_slug',
        'course_price' => '_course_price',
        'course_level' => '_course_level',
        'course_duration' => '_course_duration',
        'course_instructor' => '_instructor_id',
        'course_status' => '_course_status_val',
    );
    foreach ($fields as $input => $meta) {
        if (isset($_POST[$input])) {
            update_post_meta($post_id, $meta, sanitize_text_field($_POST[$input]));
        }
    }
});

// Article meta
add_action('add_meta_boxes', function() {
    add_meta_box('article_details', 'جزئیات مقاله', function($post) {
        wp_nonce_field('nibrc_article_meta', 'nibrc_article_nonce');
        $author_name = get_post_meta($post->ID, '_article_author_name', true);
        $reading_time = get_post_meta($post->ID, '_article_reading_time', true);
        ?>
        <table class="form-table">
            <tr><th>نام نویسنده</th><td><input type="text" name="article_author_name" value="<?php echo esc_attr($author_name); ?>" class="regular-text" /></td></tr>
            <tr><th>زمان مطالعه</th><td><input type="text" name="article_reading_time" value="<?php echo esc_attr($reading_time); ?>" class="regular-text" placeholder="مثلاً: ۸ دقیقه" /></td></tr>
        </table>
        <?php
    }, 'article', 'normal', 'high');
});

add_action('save_post_article', function($post_id) {
    if (!isset($_POST['nibrc_article_nonce']) || !wp_verify_nonce($_POST['nibrc_article_nonce'], 'nibrc_article_meta')) return;
    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) return;
    if (isset($_POST['article_author_name'])) update_post_meta($post_id, '_article_author_name', sanitize_text_field($_POST['article_author_name']));
    if (isset($_POST['article_reading_time'])) update_post_meta($post_id, '_article_reading_time', sanitize_text_field($_POST['article_reading_time']));
});

// Dictionary meta
add_action('add_meta_boxes', function() {
    add_meta_box('dict_details', 'جزئیات واژه', function($post) {
        wp_nonce_field('nibrc_dict_meta', 'nibrc_dict_nonce');
        $latin = get_post_meta($post->ID, '_dict_latin', true);
        $category = get_post_meta($post->ID, '_dict_category', true);
        $habitat = get_post_meta($post->ID, '_dict_habitat', true);
        $diseases = get_post_meta($post->ID, '_dict_diseases', true);
        ?>
        <table class="form-table">
            <tr><th>نام لاتین</th><td><input type="text" name="dict_latin" value="<?php echo esc_attr($latin); ?>" class="regular-text" /></td></tr>
            <tr><th>دسته‌بندی</th><td><input type="text" name="dict_category" value="<?php echo esc_attr($category); ?>" class="regular-text" placeholder="مثلاً: باکتری‌شناسی" /></td></tr>
            <tr><th>زیستگاه</th><td><input type="text" name="dict_habitat" value="<?php echo esc_attr($habitat); ?>" class="regular-text" /></td></tr>
            <tr><th>بیماری‌ها</th><td><textarea name="dict_diseases" rows="3" class="large-text"><?php echo esc_textarea($diseases); ?></textarea></td></tr>
        </table>
        <?php
    }, 'dictionary', 'normal', 'high');
});

add_action('save_post_dictionary', function($post_id) {
    if (!isset($_POST['nibrc_dict_nonce']) || !wp_verify_nonce($_POST['nibrc_dict_nonce'], 'nibrc_dict_meta')) return;
    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) return;
    $fields = array('dict_latin' => '_dict_latin', 'dict_category' => '_dict_category', 'dict_habitat' => '_dict_habitat', 'dict_diseases' => '_dict_diseases');
    foreach ($fields as $input => $meta) {
        if (isset($_POST[$input])) update_post_meta($post_id, $meta, sanitize_text_field($_POST[$input]));
    }
});

/* ============================================
   5. CUSTOM REST API ENDPOINTS
   ============================================ */

add_action('rest_api_init', function() {
    $ns = 'nibrc/v1';

    // GET /nibrc/v1/courses
    register_rest_route($ns, '/courses', array(
        'methods'  => 'GET',
        'callback' => function($req) {
            $cat = $req->get_param('category');
            $page = max(1, intval($req->get_param('page') ?: 1));
            $per_page = min(50, max(1, intval($req->get_param('per_page') ?: 12)));
            $args = array(
                'post_type' => 'course',
                'post_status' => 'publish',
                'posts_per_page' => $per_page,
                'paged' => $page,
            );
            if ($cat) $args['tax_query'] = array(array('taxonomy' => 'course_category', 'field' => 'slug', 'terms' => $cat));
            $q = new WP_Query($args);
            $courses = array();
            foreach ($q->posts as $p) {
                $courses[] = nibrc_serialize_course($p);
            }
            return new WP_REST_Response(array('ok' => true, 'data' => $courses, 'total' => $q->found_posts), 200);
        },
        'permission_callback' => '__return_true',
    ));

    // GET /nibrc/v1/courses/{slug}
    register_rest_route($ns, '/courses/(?P<slug>[a-z0-9\-]+)', array(
        'methods'  => 'GET',
        'callback' => function($req) {
            $posts = get_posts(array('post_type' => 'course', 'name' => $req['slug'], 'numberposts' => 1));
            if (empty($posts)) return new WP_REST_Response(array('ok' => false, 'error' => 'دوره یافت نشد'), 404);
            return new WP_REST_Response(array('ok' => true, 'data' => nibrc_serialize_course($posts[0], true)), 200);
        },
        'permission_callback' => '__return_true',
    ));

    // GET /nibrc/v1/articles
    register_rest_route($ns, '/articles', array(
        'methods'  => 'GET',
        'callback' => function($req) {
            $page = max(1, intval($req->get_param('page') ?: 1));
            $per_page = min(50, max(1, intval($req->get_param('per_page') ?: 12)));
            $q = new WP_Query(array('post_type' => 'article', 'post_status' => 'publish', 'posts_per_page' => $per_page, 'paged' => $page));
            $articles = array();
            foreach ($q->posts as $p) $articles[] = nibrc_serialize_article($p);
            return new WP_REST_Response(array('ok' => true, 'data' => $articles, 'total' => $q->found_posts), 200);
        },
        'permission_callback' => '__return_true',
    ));

    // GET /nibrc/v1/articles/{slug}
    register_rest_route($ns, '/articles/(?P<slug>[a-z0-9\-]+)', array(
        'methods'  => 'GET',
        'callback' => function($req) {
            $posts = get_posts(array('post_type' => 'article', 'name' => $req['slug'], 'numberposts' => 1));
            if (empty($posts)) return new WP_REST_Response(array('ok' => false, 'error' => 'مقاله یافت نشد'), 404);
            return new WP_REST_Response(array('ok' => true, 'data' => nibrc_serialize_article($posts[0], true)), 200);
        },
        'permission_callback' => '__return_true',
    ));

    // GET /nibrc/v1/instructors
    register_rest_route($ns, '/instructors', array(
        'methods'  => 'GET',
        'callback' => function() {
            $q = new WP_Query(array('post_type' => 'instructor', 'post_status' => 'publish', 'numberposts' => -1));
            $list = array();
            foreach ($q->posts as $p) $list[] = nibrc_serialize_instructor($p);
            return new WP_REST_Response(array('ok' => true, 'data' => $list), 200);
        },
        'permission_callback' => '__return_true',
    ));

    // GET /nibrc/v1/products
    register_rest_route($ns, '/products', array(
        'methods'  => 'GET',
        'callback' => function() {
            $q = new WP_Query(array('post_type' => 'product', 'post_status' => 'publish', 'numberposts' => -1));
            $list = array();
            foreach ($q->posts as $p) $list[] = nibrc_serialize_product($p);
            return new WP_REST_Response(array('ok' => true, 'data' => $list), 200);
        },
        'permission_callback' => '__return_true',
    ));

    // GET /nibrc/v1/workshops
    register_rest_route($ns, '/workshops', array(
        'methods'  => 'GET',
        'callback' => function() {
            $q = new WP_Query(array('post_type' => 'workshop', 'post_status' => 'publish', 'numberposts' => -1));
            $list = array();
            foreach ($q->posts as $p) $list[] = nibrc_serialize_workshop($p);
            return new WP_REST_Response(array('ok' => true, 'data' => $list), 200);
        },
        'permission_callback' => '__return_true',
    ));

    // GET /nibrc/v1/dictionary
    register_rest_route($ns, '/dictionary', array(
        'methods'  => 'GET',
        'callback' => function($req) {
            $search = $req->get_param('q');
            $args = array('post_type' => 'dictionary', 'post_status' => 'publish', 'numberposts' => 50);
            if ($search) $args['s'] = $search;
            $q = new WP_Query($args);
            $terms = array();
            foreach ($q->posts as $p) $terms[] = nibrc_serialize_dict($p);
            return new WP_REST_Response(array('ok' => true, 'data' => $terms), 200);
        },
        'permission_callback' => '__return_true',
    ));

    // GET /nibrc/v1/stats
    register_rest_route($ns, '/stats', array(
        'methods'  => 'GET',
        'callback' => function() {
            return new WP_REST_Response(array(
                'ok' => true,
                'data' => array(
                    'courses'   => wp_count_posts('course')->publish,
                    'articles'  => wp_count_posts('article')->publish,
                    'instructors' => wp_count_posts('instructor')->publish,
                    'products'  => wp_count_posts('product')->publish,
                    'workshops' => wp_count_posts('workshop')->publish,
                    'dictionary'=> wp_count_posts('dictionary')->publish,
                    'users'     => count_users()['total_users'],
                ),
            ), 200);
        },
        'permission_callback' => '__return_true',
    ));

    // POST /nibrc/v1/enroll — user enrollment
    register_rest_route($ns, '/enroll', array(
        'methods'  => 'POST',
        'callback' => function($req) {
            if (!is_user_logged_in()) return new WP_REST_Response(array('ok' => false, 'error' => 'لاگین نیستید'), 401);
            $course_id = intval($req->get_param('course_id'));
            if (!$course_id) return new WP_REST_Response(array('ok' => false, 'error' => 'شناسه دوره لازم است'), 400);
            global $wpdb;
            $table = $wpdb->prefix . 'nibrc_enrollments';
            $exists = $wpdb->get_var($wpdb->prepare("SELECT id FROM {$table} WHERE user_id=%d AND course_id=%d", get_current_user_id(), $course_id));
            if ($exists) return new WP_REST_Response(array('ok' => false, 'error' => 'قبلاً ثبت‌نام کردید'), 409);
            $wpdb->insert($table, array('user_id' => get_current_user_id(), 'course_id' => $course_id, 'status' => 'pending', 'created_at' => current_time('mysql')));
            return new WP_REST_Response(array('ok' => true, 'message' => 'ثبت‌نام انجام شد'), 201);
        },
        'permission_callback' => '__return_true',
    ));

    // POST /nibrc/v1/ticket — support ticket
    register_rest_route($ns, '/ticket', array(
        'methods'  => 'POST',
        'callback' => function($req) {
            if (!is_user_logged_in()) return new WP_REST_Response(array('ok' => false, 'error' => 'لاگین نیستید'), 401);
            $subject = sanitize_text_field($req->get_param('subject'));
            $body = sanitize_textarea_field($req->get_param('body'));
            $category = sanitize_text_field($req->get_param('category'));
            if (!$subject || !$body) return new WP_REST_Response(array('ok' => false, 'error' => 'موضوع و متن لازم است'), 400);
            global $wpdb;
            $wpdb->insert($wpdb->prefix . 'nibrc_tickets', array(
                'user_id' => get_current_user_id(),
                'subject' => $subject,
                'body' => $body,
                'category' => $category,
                'status' => 'open',
                'created_at' => current_time('mysql'),
            ));
            return new WP_REST_Response(array('ok' => true, 'message' => 'تیکت ثبت شد'), 201);
        },
        'permission_callback' => '__return_true',
    ));

    // POST /nibrc/v1/auth/login
    register_rest_route($ns, '/auth/login', array(
        'methods'  => 'POST',
        'callback' => function($req) {
            $email = sanitize_email($req->get_param('email'));
            $password = $req->get_param('password');
            $user = wp_authenticate($email, $password);
            if (is_wp_error($user)) {
                return new WP_REST_Response(array('ok' => false, 'error' => 'ایمیل یا رمز عبور اشتباه است'), 401);
            }
            wp_set_current_user($user->ID);
            $token = nibrc_generate_jwt($user);
            return new WP_REST_Response(array(
                'ok' => true,
                'data' => array(
                    'token' => $token,
                    'user' => array(
                        'id' => $user->ID,
                        'name' => $user->display_name,
                        'email' => $user->user_email,
                        'role' => nibrc_get_user_role($user),
                    ),
                ),
            ), 200);
        },
        'permission_callback' => '__return_true',
    ));

    // POST /nibrc/v1/auth/register
    register_rest_route($ns, '/auth/register', array(
        'methods'  => 'POST',
        'callback' => function($req) {
            $name = sanitize_text_field($req->get_param('name'));
            $email = sanitize_email($req->get_param('email'));
            $password = $req->get_param('password');
            if (!$name || !$email || !$password) {
                return new WP_REST_Response(array('ok' => false, 'error' => 'همه فیلدها لازم است'), 400);
            }
            if (email_exists($email)) {
                return new WP_REST_Response(array('ok' => false, 'error' => 'این ایمیل قبلاً ثبت شده'), 409);
            }
            $user_id = wp_create_user($email, $password, $email);
            if (is_wp_error($user_id)) {
                return new WP_REST_Response(array('ok' => false, 'error' => 'خطا در ثبت‌نام'), 500);
            }
            wp_update_user(array('ID' => $user_id, 'display_name' => $name));
            wp_set_current_user($user_id);
            $user = get_userdata($user_id);
            $token = nibrc_generate_jwt($user);
            return new WP_REST_Response(array(
                'ok' => true,
                'data' => array(
                    'token' => $token,
                    'user' => array('id' => $user_id, 'name' => $name, 'email' => $email, 'role' => 'student'),
                ),
            ), 201);
        },
        'permission_callback' => '__return_true',
    ));

    // GET /nibrc/v1/auth/me
    register_rest_route($ns, '/auth/me', array(
        'methods'  => 'GET',
        'callback' => function() {
            if (!is_user_logged_in()) return new WP_REST_Response(array('ok' => false, 'error' => 'لاگین نیستید'), 401);
            $user = wp_get_current_user();
            return new WP_REST_Response(array(
                'ok' => true,
                'data' => array(
                    'id' => $user->ID,
                    'name' => $user->display_name,
                    'email' => $user->user_email,
                    'role' => nibrc_get_user_role($user),
                ),
            ), 200);
        },
        'permission_callback' => '__return_true',
    ));

    // POST /nibrc/v1/sync/data — main site pushes data here
    register_rest_route($ns, '/sync/data', array(
        'methods'  => 'POST',
        'callback' => function($req) {
            $key = $req->get_header('X-Sync-Key');
            $expected = get_option('nibrc_sync_key', '');
            if (!$expected || $key !== $expected) {
                return new WP_REST_Response(array('ok' => false, 'error' => 'کلید نامعتبر'), 403);
            }
            $data = $req->get_json_params();
            if (!$data) return new WP_REST_Response(array('ok' => false, 'error' => 'داده‌ای ارسال نشد'), 400);

            // Upsert courses
            if (!empty($data['courses'])) {
                nibrc_upsert_posts('course', $data['courses']);
            }
            if (!empty($data['articles'])) {
                nibrc_upsert_posts('article', $data['articles']);
            }
            if (!empty($data['instructors'])) {
                nibrc_upsert_posts('instructor', $data['instructors']);
            }
            if (!empty($data['products'])) {
                nibrc_upsert_posts('product', $data['products']);
            }
            if (!empty($data['workshops'])) {
                nibrc_upsert_posts('workshop', $data['workshops']);
            }
            if (!empty($data['dictionary'])) {
                nibrc_upsert_posts('dictionary', $data['dictionary']);
            }

            update_option('nibrc_last_sync', current_time('mysql'));
            return new WP_REST_Response(array('ok' => true, 'message' => 'سینک انجام شد', 'synced_at' => current_time('mysql')), 200);
        },
        'permission_callback' => '__return_true',
    ));
});

/* ============================================
   6. SERIALIZATION HELPERS
   ============================================ */

function nibrc_serialize_course($post, $full = false) {
    $data = array(
        'id' => $post->ID,
        'title' => $post->post_title,
        'slug' => $post->post_name,
        'excerpt' => $post->post_excerpt,
        'description' => $full ? $post->post_content : wp_trim_words($post->post_content, 30),
        'image' => get_the_post_thumbnail_url($post->ID, 'nibrc-card') ?: '',
        'price' => intval(get_post_meta($post->ID, '_course_price', true)),
        'level' => get_post_meta($post->ID, '_course_level', true),
        'duration' => get_post_meta($post->ID, '_course_duration', true),
        'instructor' => nibrc_get_instructor_name(get_post_meta($post->ID, '_instructor_id', true)),
        'createdAt' => $post->post_date,
    );
    if ($full) {
        $data['content'] = $post->post_content;
        $cats = get_the_terms($post->ID, 'course_category');
        $data['categories'] = $cats ? array_map(fn($c) => array('name' => $c->name, 'slug' => $c->slug), $cats) : array();
    }
    return $data;
}

function nibrc_serialize_article($post, $full = false) {
    $data = array(
        'id' => $post->ID,
        'title' => $post->post_title,
        'slug' => $post->post_name,
        'excerpt' => $post->post_excerpt,
        'description' => $full ? $post->post_content : wp_trim_words($post->post_content, 30),
        'image' => get_the_post_thumbnail_url($post->ID, 'nibrc-card') ?: '',
        'author' => get_post_meta($post->ID, '_article_author_name', true) ?: get_the_author_meta('display_name', $post->post_author),
        'readingTime' => get_post_meta($post->ID, '_article_reading_time', true),
        'createdAt' => $post->post_date,
    );
    if ($full) $data['content'] = $post->post_content;
    return $data;
}

function nibrc_serialize_instructor($post) {
    return array(
        'id' => $post->ID,
        'name' => $post->post_title,
        'slug' => $post->post_name,
        'bio' => $post->post_excerpt,
        'avatar' => get_the_post_thumbnail_url($post->ID, 'nibrc-avatar') ?: '',
        'specialty' => get_post_meta($post->ID, '_instructor_specialty', true),
    );
}

function nibrc_serialize_product($post) {
    return array(
        'id' => $post->ID,
        'title' => $post->post_title,
        'slug' => $post->post_name,
        'excerpt' => $post->post_excerpt,
        'image' => get_the_post_thumbnail_url($post->ID, 'nibrc-card') ?: '',
        'price' => intval(get_post_meta($post->ID, '_product_price', true)),
        'type' => get_post_meta($post->ID, '_product_type', true),
    );
}

function nibrc_serialize_workshop($post) {
    return array(
        'id' => $post->ID,
        'title' => $post->post_title,
        'slug' => $post->post_name,
        'excerpt' => $post->post_excerpt,
        'image' => get_the_post_thumbnail_url($post->ID, 'nibrc-card') ?: '',
        'date' => get_post_meta($post->ID, '_workshop_date', true),
        'time' => get_post_meta($post->ID, '_workshop_time', true),
    );
}

function nibrc_serialize_dict($post) {
    return array(
        'id' => $post->ID,
        'term' => $post->post_title,
        'definition' => $post->post_content,
        'latin' => get_post_meta($post->ID, '_dict_latin', true),
        'category' => get_post_meta($post->ID, '_dict_category', true),
        'habitat' => get_post_meta($post->ID, '_dict_habitat', true),
        'diseases' => get_post_meta($post->ID, '_dict_diseases', true),
    );
}

function nibrc_get_instructor_name($id) {
    if (!$id) return '';
    $post = get_post($id);
    return $post ? $post->post_title : '';
}

function nibrc_get_user_role($user) {
    if ($user->has_cap('manage_options')) return 'admin';
    if (in_array('instructor', (array) $user->roles)) return 'instructor';
    return 'student';
}

/* ============================================
   7. SIMPLE JWT (no external library)
   ============================================ */

function nibrc_generate_jwt($user) {
    $secret = defined('NIBRC_JWT_SECRET') ? NIBRC_JWT_SECRET : (get_option('nibrc_jwt_secret') ?: wp_salt('auth'));
    $header = nibrc_jwt_base64url(json_encode(array('typ' => 'JWT', 'alg' => 'HS256')));
    $payload = nibrc_jwt_base64url(json_encode(array(
        'sub' => $user->ID,
        'email' => $user->user_email,
        'role' => nibrc_get_user_role($user),
        'iat' => time(),
        'exp' => time() + (7 * DAY_IN_SECONDS),
    )));
    $sig = nibrc_jwt_base64url(hash_hmac('sha256', "$header.$payload", $secret, true));
    return "$header.$payload.$sig";
}

function nibrc_jwt_base64url($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

/* ============================================
   8. SYNC UPSERT HELPER
   ============================================ */

function nibrc_upsert_posts($post_type, $items) {
    foreach ($items as $item) {
        $remote_id = intval($item['id'] ?? 0);
        $title = sanitize_text_field($item['title'] ?? '');
        $slug = sanitize_title($item['slug'] ?? $title);
        $content = wp_kses_post($item['content'] ?? $item['description'] ?? '');
        $excerpt = sanitize_text_field($item['excerpt'] ?? '');

        // Find existing post by remote_id meta
        $existing = get_posts(array(
            'post_type' => $post_type,
            'meta_query' => array(array('key' => '_remote_id', 'value' => $remote_id)),
            'numberposts' => 1,
            'post_status' => 'any',
        ));

        if (!empty($existing)) {
            wp_update_post(array('ID' => $existing[0]->ID, 'post_title' => $title, 'post_content' => $content, 'post_excerpt' => $excerpt, 'post_status' => 'publish'));
            update_post_meta($existing[0]->ID, '_synced_at', current_time('mysql'));
        } else {
            $new_id = wp_insert_post(array('post_type' => $post_type, 'post_title' => $title, 'post_name' => $slug, 'post_content' => $content, 'post_excerpt' => $excerpt, 'post_status' => 'publish'));
            if ($new_id && !is_wp_error($new_id)) {
                update_post_meta($new_id, '_remote_id', $remote_id);
                update_post_meta($new_id, '_synced_at', current_time('mysql'));
                // Copy extra meta
                $meta_map = array(
                    'course' => array('_course_price', '_course_level', '_course_duration'),
                    'article' => array('_article_author_name', '_article_reading_time'),
                    'dictionary' => array('_dict_latin', '_dict_category', '_dict_habitat', '_dict_diseases'),
                    'product' => array('_product_price', '_product_type'),
                    'workshop' => array('_workshop_date', '_workshop_time'),
                );
                if (!empty($meta_map[$post_type])) {
                    foreach ($meta_map[$post_type] as $m) {
                        $key = str_replace('_', '', substr($m, 1));
                        if (isset($item[$key])) update_post_meta($new_id, $m, sanitize_text_field($item[$key]));
                    }
                }
            }
        }
    }
}

/* ============================================
   9. SETUP CUSTOM TABLES ON ACTIVATION
   ============================================ */

register_activation_hook(__FILE__, function() {
    global $wpdb;
    $charset = $wpdb->get_charset_collate();

    // Enrollments
    $wpdb->query("CREATE TABLE IF NOT EXISTS {$wpdb->prefix}nibrc_enrollments (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL,
        course_id BIGINT UNSIGNED NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        KEY user_id (user_id),
        KEY course_id (course_id)
    ) {$charset}");

    // Tickets
    $wpdb->query("CREATE TABLE IF NOT EXISTS {$wpdb->prefix}nibrc_tickets (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL,
        subject VARCHAR(255) NOT NULL,
        body TEXT NOT NULL,
        category VARCHAR(50) DEFAULT 'general',
        status VARCHAR(20) DEFAULT 'open',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        KEY user_id (user_id)
    ) {$charset}");

    // Offline payments
    $wpdb->query("CREATE TABLE IF NOT EXISTS {$wpdb->prefix}nibrc_offline_payments (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL,
        course_id BIGINT UNSIGNED,
        amount BIGINT UNSIGNED NOT NULL,
        receipt_url VARCHAR(500),
        status VARCHAR(20) DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        KEY user_id (user_id)
    ) {$charset}");

    // Exams
    $wpdb->query("CREATE TABLE IF NOT EXISTS {$wpdb->prefix}nibrc_exams (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        course_id BIGINT UNSIGNED,
        time_limit INT DEFAULT 60,
        pass_score INT DEFAULT 60,
        status VARCHAR(20) DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) {$charset}");

    // Exam questions
    $wpdb->query("CREATE TABLE IF NOT EXISTS {$wpdb->prefix}nibrc_exam_questions (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        exam_id BIGINT UNSIGNED NOT NULL,
        question TEXT NOT NULL,
        options JSON NOT NULL,
        correct_answer INT NOT NULL,
        points INT DEFAULT 1,
        KEY exam_id (exam_id)
    ) {$charset}");

    // Exam attempts
    $wpdb->query("CREATE TABLE IF NOT EXISTS {$wpdb->prefix}nibrc_exam_attempts (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL,
        exam_id BIGINT UNSIGNED NOT NULL,
        answers JSON,
        score INT DEFAULT 0,
        total_points INT DEFAULT 0,
        started_at DATETIME,
        completed_at DATETIME,
        KEY user_id (user_id),
        KEY exam_id (exam_id)
    ) {$charset}");

    // Daily quiz
    $wpdb->query("CREATE TABLE IF NOT EXISTS {$wpdb->prefix}nibrc_daily_quiz (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        question TEXT NOT NULL,
        options JSON NOT NULL,
        correct_answer INT NOT NULL,
        explanation TEXT,
        quiz_date DATE NOT NULL,
        UNIQUE KEY quiz_date (quiz_date)
    ) {$charset}");

    // Flashcards
    $wpdb->query("CREATE TABLE IF NOT EXISTS {$wpdb->prefix}nibrc_flashcards (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL,
        front TEXT NOT NULL,
        back TEXT NOT NULL,
        category VARCHAR(100),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        KEY user_id (user_id)
    ) {$charset}");

    // Bookmarks
    $wpdb->query("CREATE TABLE IF NOT EXISTS {$wpdb->prefix}nibrc_bookmarks (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL,
        post_id BIGINT UNSIGNED NOT NULL,
        post_type VARCHAR(50) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_bookmark (user_id, post_id)
    ) {$charset}");

    // Announcements
    $wpdb->query("CREATE TABLE IF NOT EXISTS {$wpdb->prefix}nibrc_announcements (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        body TEXT NOT NULL,
        target_role VARCHAR(50) DEFAULT 'all',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) {$charset}");

    // Sync log
    $wpdb->query("CREATE TABLE IF NOT EXISTS {$wpdb->prefix}nibrc_sync_log (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        direction VARCHAR(10) NOT NULL,
        status VARCHAR(20) NOT NULL,
        message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) {$charset}");

    // Offline changes queue
    $wpdb->query("CREATE TABLE IF NOT EXISTS {$wpdb->prefix}nibrc_offline_queue (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        action_type VARCHAR(50) NOT NULL,
        payload JSON NOT NULL,
        synced TINYINT DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) {$charset}");

    // Site options
    add_option('nibrc_sync_key', wp_generate_password(32, false));
    add_option('nibrc_main_site_url', 'https://nibrc.ir');
    add_option('nibrc_last_sync', '');
    add_option('nibrc_jwt_secret', wp_generate_password(64, false));
});

/* ============================================
   10. WIDGET AREAS
   ============================================ */
add_action('widgets_init', function() {
    register_sidebar(array('name' => 'سایدبار اصلی', 'id' => 'sidebar-main', 'before_widget' => '<div class="nibrc-widget">', 'after_widget' => '</div>', 'before_title' => '<h3 class="nibrc-widget-title">', 'after_title' => '</h3>'));
    register_sidebar(array('name' => 'فوتر ستون اول', 'id' => 'footer-1'));
    register_sidebar(array('name' => 'فوتر ستون دوم', 'id' => 'footer-2'));
    register_sidebar(array('name' => 'فوتر ستون سوم', 'id' => 'footer-3'));
});

/* ============================================
   11. CUSTOM LOGIN LOGO
   ============================================ */
add_action('login_enqueue_scripts', function() {
    echo '<style>#login h1 a { background-image: url(' . NIBRC_URI . '/assets/images/logo.png); background-size: contain; width: 200px; height: 60px; }</style>';
});
add_filter('login_headerurl', function() { return home_url(); });
add_filter('login_headertext', function() { return 'NIBRC'; });

/* ============================================
   12. PAGINATION HELPER
   ============================================ */
function nibrc_pagination($query = null) {
    global $wp_query;
    $q = $query ?: $wp_query;
    if ($q->max_num_pages <= 1) return;
    echo '<div class="nibrc-pagination">';
    echo paginate_links(array(
        'total' => $q->max_num_pages,
        'current' => max(1, get_query_var('paged')),
        'prev_text' => '&laquo; قبلی',
        'next_text' => 'بعدی &raquo;',
    ));
    echo '</div>';
}
