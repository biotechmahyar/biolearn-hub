<?php
/**
 * NIBRC REST API Routes — versioned under /nibrc/v1/
 */

if (!defined('ABSPATH')) exit;

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
        'permission_callback' => '__return_true',
    ]);

    register_rest_route('nibrc/v1', '/auth/profile', [
        'methods'  => 'POST',
        'callback' => 'nibrc_rest_update_profile',
        'permission_callback' => '__return_true',
    ]);

    // ──── Content Endpoints (Public) ────
    register_rest_route('nibrc/v1', '/content/courses', [
        'methods'  => 'GET',
        'callback' => 'nibrc_rest_courses',
        'permission_callback' => '__return_true',
    ]);

    register_rest_route('nibrc/v1', '/content/courses/(?P<slug>[a-z0-9-]+)', [
        'methods'  => 'GET',
        'callback' => 'nibrc_rest_course_detail',
        'permission_callback' => '__return_true',
    ]);

    register_rest_route('nibrc/v1', '/content/articles', [
        'methods'  => 'GET',
        'callback' => 'nibrc_rest_articles',
        'permission_callback' => '__return_true',
    ]);

    register_rest_route('nibrc/v1', '/content/instructors', [
        'methods'  => 'GET',
        'callback' => 'nibrc_rest_instructors',
        'permission_callback' => '__return_true',
    ]);

    register_rest_route('nibrc/v1', '/content/products', [
        'methods'  => 'GET',
        'callback' => 'nibrc_rest_products',
        'permission_callback' => '__return_true',
    ]);

    register_rest_route('nibrc/v1', '/content/workshops', [
        'methods'  => 'GET',
        'callback' => 'nibrc_rest_workshops',
        'permission_callback' => '__return_true',
    ]);

    register_rest_route('nibrc/v1', '/content/dictionary', [
        'methods'  => 'GET',
        'callback' => 'nibrc_rest_dictionary',
        'permission_callback' => '__return_true',
    ]);

    // ──── Enrollment (authenticated) ────
    register_rest_route('nibrc/v1', '/enroll', [
        'methods'  => 'POST',
        'callback' => 'nibrc_rest_enroll',
        'permission_callback' => '__return_true',
    ]);

    register_rest_route('nibrc/v1', '/enroll/my', [
        'methods'  => 'GET',
        'callback' => 'nibrc_rest_my_enrollments',
        'permission_callback' => '__return_true',
    ]);

    // ──── Offline Queue ────
    register_rest_route('nibrc/v1', '/offline/queue', [
        'methods'  => 'POST',
        'callback' => 'nibrc_rest_add_to_queue',
        'permission_callback' => '__return_true',
    ]);

    register_rest_route('nibrc/v1', '/offline/queue', [
        'methods'  => 'GET',
        'callback' => 'nibrc_rest_get_queue',
        'permission_callback' => '__return_true',
    ]);
}
add_action('rest_api_init', 'nibrc_register_rest_routes');

/* ──── Content Callbacks ──── */
function nibrc_rest_courses($request) {
    $posts = get_posts([
        'post_type'   => 'nibrc_course',
        'numberposts' => 50,
        'post_status' => 'publish',
        'orderby'     => 'date',
        'order'       => 'DESC',
    ]);
    return new WP_REST_Response([
        'ok'   => true,
        'data' => array_map('nibrc_post_to_json', $posts),
    ]);
}

function nibrc_rest_course_detail($request) {
    $slug = $request->get_param('slug');
    $posts = get_posts([
        'post_type'   => 'nibrc_course',
        'name'        => $slug,
        'numberposts' => 1,
        'post_status' => 'publish',
    ]);
    if (empty($posts)) {
        return new WP_REST_Response(['ok' => false, 'error' => 'دوره یافت نشد'], 404);
    }
    $post = $posts[0];
    $data = nibrc_post_to_json($post);
    $data['lessons']      = json_decode(get_post_meta($post->ID, '_nibrc_lessons', true) ?: '[]', true);
    $data['resources']    = json_decode(get_post_meta($post->ID, '_nibrc_resources', true) ?: '[]', true);
    $data['packages']     = json_decode(get_post_meta($post->ID, '_nibrc_packages', true) ?: '[]', true);
    return new WP_REST_Response(['ok' => true, 'data' => $data]);
}

function nibrc_rest_articles($request) {
    $posts = get_posts([
        'post_type'   => 'nibrc_article',
        'numberposts' => 50,
        'post_status' => 'publish',
        'orderby'     => 'date',
        'order'       => 'DESC',
    ]);
    return new WP_REST_Response([
        'ok'   => true,
        'data' => array_map('nibrc_post_to_json', $posts),
    ]);
}

function nibrc_rest_instructors($request) {
    $posts = get_posts([
        'post_type'   => 'nibrc_instructor',
        'numberposts' => 50,
        'post_status' => 'publish',
    ]);
    return new WP_REST_Response([
        'ok'   => true,
        'data' => array_map('nibrc_post_to_json', $posts),
    ]);
}

function nibrc_rest_products($request) {
    $posts = get_posts([
        'post_type'   => 'nibrc_product',
        'numberposts' => 50,
        'post_status' => 'publish',
    ]);
    return new WP_REST_Response([
        'ok'   => true,
        'data' => array_map('nibrc_post_to_json', $posts),
    ]);
}

function nibrc_rest_workshops($request) {
    $posts = get_posts([
        'post_type'   => 'nibrc_workshop',
        'numberposts' => 50,
        'post_status' => 'publish',
    ]);
    return new WP_REST_Response([
        'ok'   => true,
        'data' => array_map('nibrc_post_to_json', $posts),
    ]);
}

function nibrc_rest_dictionary($request) {
    $search = $request->get_param('q') ?? '';
    $args = [
        'post_type'   => 'nibrc_dictionary',
        'numberposts' => 100,
        'post_status' => 'publish',
    ];
    if ($search) {
        $args['s'] = $search;
    }
    $posts = get_posts($args);
    return new WP_REST_Response([
        'ok'   => true,
        'data' => array_map('nibrc_post_to_json', $posts),
    ]);
}

/* ──── Post to JSON converter ──── */
function nibrc_post_to_json($post) {
    return [
        'id'          => $post->ID,
        'title'       => $post->post_title,
        'slug'        => $post->post_name,
        'excerpt'     => $post->post_excerpt,
        'content'     => apply_filters('the_content', $post->post_content),
        'thumbnail'   => get_the_post_thumbnail_url($post->ID, 'medium') ?: '',
        'price'       => get_post_meta($post->ID, '_nibrc_price', true),
        'created_at'  => $post->post_date,
        'updated_at'  => $post->post_modified,
        'remote_id'   => get_post_meta($post->ID, '_nibrc_remote_id', true),
    ];
}

/* ──── Enrollment ──── */
function nibrc_rest_enroll($request) {
    $user_id = nibrc_get_user_from_jwt($request);
    if (!$user_id) {
        return new WP_REST_Response(['ok' => false, 'error' => 'وارد شوید'], 401);
    }

    $course_id = intval($request->get_param('course_id'));
    if (!$course_id) {
        return new WP_REST_Response(['ok' => false, 'error' => 'شناسه دوره الزامی است'], 400);
    }

    // Check duplicate
    global $wpdb;
    $table = $wpdb->prefix . 'nibrc_enrollments';
    $exists = $wpdb->get_var($wpdb->prepare(
        "SELECT id FROM {$table} WHERE user_id = %d AND course_id = %d",
        $user_id, $course_id
    ));

    if ($exists) {
        return new WP_REST_Response(['ok' => false, 'error' => 'قبلاً ثبت‌نام شده'], 409);
    }

    $wpdb->insert($table, [
        'user_id'    => $user_id,
        'course_id'  => $course_id,
        'status'     => 'active',
        'created_at' => current_time('mysql'),
    ]);

    // Add to offline queue for push sync
    nibrc_add_to_offline_queue('enroll', 'enrollments', $wpdb->insert_id, [
        'user_id'   => $user_id,
        'course_id' => $course_id,
    ]);

    return new WP_REST_Response(['ok' => true, 'message' => 'ثبت‌نام موفق']);
}

function nibrc_rest_my_enrollments($request) {
    $user_id = nibrc_get_user_from_jwt($request);
    if (!$user_id) {
        return new WP_REST_Response(['ok' => false, 'error' => 'وارد شوید'], 401);
    }

    global $wpdb;
    $table = $wpdb->prefix . 'nibrc_enrollments';
    $rows = $wpdb->get_results($wpdb->prepare(
        "SELECT * FROM {$table} WHERE user_id = %d ORDER BY created_at DESC",
        $user_id
    ), ARRAY_A);

    return new WP_REST_Response(['ok' => true, 'data' => $rows]);
}

/* ──── Offline Queue API ──── */
function nibrc_rest_add_to_queue($request) {
    $user_id = nibrc_get_user_from_jwt($request);
    if (!$user_id) {
        return new WP_REST_Response(['ok' => false, 'error' => 'وارد شوید'], 401);
    }

    $type      = sanitize_text_field($request->get_param('type'));
    $table     = sanitize_text_field($request->get_param('table'));
    $record_id = sanitize_text_field($request->get_param('record_id'));
    $data      = $request->get_param('data');

    nibrc_add_to_offline_queue($type, $table, $record_id, $data);

    return new WP_REST_Response(['ok' => true, 'message' => 'در صف ذخیره شد']);
}

function nibrc_rest_get_queue($request) {
    $user_id = nibrc_get_user_from_jwt($request);
    if (!$user_id) {
        return new WP_REST_Response(['ok' => false, 'error' => 'وارد شوید'], 401);
    }

    global $wpdb;
    $table = $wpdb->prefix . 'nibrc_offline_queue';
    $rows = $wpdb->get_results(
        "SELECT * FROM {$table} WHERE status = 'pending' ORDER BY created_at DESC LIMIT 100",
        ARRAY_A
    );

    return new WP_REST_Response(['ok' => true, 'data' => $rows]);
}

/* ──── Helper: Add to offline queue ──── */
function nibrc_add_to_offline_queue($type, $table_name, $record_id, $data) {
    global $wpdb;
    $queue_table = $wpdb->prefix . 'nibrc_offline_queue';

    // Create table if not exists
    if ($wpdb->get_var("SHOW TABLES LIKE '{$queue_table}'") !== $queue_table) {
        nibrc_create_sync_tables();
    }

    $wpdb->insert($queue_table, [
        'change_type' => $type,
        'data_table'  => $table_name,
        'record_id'   => $record_id,
        'data_json'   => json_encode($data),
        'status'      => 'pending',
        'created_at'  => current_time('mysql'),
    ]);
}

/* ──── Create enrollment table on activation ──── */
function nibrc_create_enrollment_table() {
    global $wpdb;
    $table = $wpdb->prefix . 'nibrc_enrollments';
    $charset = $wpdb->get_charset_collate();

    $sql = "CREATE TABLE IF NOT EXISTS {$table} (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id BIGINT UNSIGNED NOT NULL,
        course_id BIGINT UNSIGNED NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_user (user_id),
        KEY idx_course (course_id)
    ) {$charset};";

    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    dbDelta($sql);
}
register_activation_hook(__DIR__, 'nibrc_create_enrollment_table');
