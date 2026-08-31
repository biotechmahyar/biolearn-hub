<?php
/**
 * Sync System for NIBRC Iran Mirror
 * سیستم همگام‌سازی با سایت اصلی
 */

if (!defined('ABSPATH')) exit;

/**
 * Perform sync from main site
 */
function nibrc_perform_sync() {
    $main_url = get_option('nibrc_main_site_url', 'https://nibrc.ir');
    $sync_key = get_option('nibrc_sync_key', '');
    
    if (empty($main_url)) {
        return ['ok' => false, 'message' => 'آدرس سایت اصلی تنظیم نشده'];
    }
    
    $sync_url = rtrim($main_url, '/') . '/sync/data';
    
    $response = wp_remote_get($sync_url, [
        'timeout' => 30,
        'headers' => [
            'X-Sync-Key' => $sync_key,
            'Accept'     => 'application/json',
        ],
    ]);
    
    if (is_wp_error($response)) {
        $error_count = get_option('nibrc_sync_errors', 0);
        update_option('nibrc_sync_errors', $error_count + 1);
        return [
            'ok'      => false,
            'message' => 'خطا در اتصال به سایت اصلی: ' . $response->get_error_message(),
        ];
    }
    
    $code = wp_remote_retrieve_response_code($response);
    $body = wp_remote_retrieve_body($response);
    
    if ($code !== 200) {
        $error_count = get_option('nibrc_sync_errors', 0);
        update_option('nibrc_sync_errors', $error_count + 1);
        return [
            'ok'      => false,
            'message' => 'پاسخ سایت اصلی: HTTP ' . $code,
        ];
    }
    
    $data = json_decode($body, true);
    
    if (!$data || !isset($data['data'])) {
        return ['ok' => false, 'message' => 'فرمت پاسخ نامعتبر'];
    }
    
    $synced_counts = [];
    
    // Sync each content type
    $content_map = [
        'courses'     => 'course',
        'articles'    => 'article',
        'instructors' => 'instructor',
        'products'    => 'product',
        'workshops'   => 'workshop',
        'dictionary'  => 'dictionary_term',
        'exams'       => 'exam',
    ];
    
    foreach ($content_map as $key => $post_type) {
        if (isset($data['data'][$key]) && is_array($data['data'][$key])) {
            $synced_counts[$key] = nibrc_sync_content(
                $data['data'][$key],
                $post_type,
                $key
            );
        }
    }
    
    // Update sync metadata
    update_option('nibrc_last_sync', current_time('mysql'));
    $sync_count = get_option('nibrc_sync_count', 0);
    update_option('nibrc_sync_count', $sync_count + 1);
    update_option('nibrc_sync_errors', 0);
    
    return [
        'ok'       => true,
        'message'  => 'سینک با موفقیت انجام شد',
        'counts'   => $synced_counts,
        'timestamp'=> current_time('mysql'),
    ];
}

/**
 * Sync a content type from remote data
 */
function nibrc_sync_content($items, $post_type, $source_key) {
    if (!is_array($items)) return 0;
    
    $count = 0;
    $synced_ids = [];
    
    foreach ($items as $item) {
        $remote_id = $item['id'] ?? $item['_id'] ?? null;
        $title = $item['title'] ?? $item['name'] ?? '';
        $slug = $item['slug'] ?? '';
        
        if (!$title) continue;
        
        // Check if already synced by remote_id meta
        $existing = null;
        if ($remote_id) {
            $existing = get_posts([
                'post_type'   => $post_type,
                'meta_key'    => '_nibrc_remote_id',
                'meta_value'  => $remote_id,
                'numberposts' => 1,
                'post_status' => 'any',
            ]);
            $existing = !empty($existing) ? $existing[0] : null;
        }
        
        // Prepare post data
        $post_data = [
            'post_title'   => $title,
            'post_content' => $item['content'] ?? $item['description'] ?? '',
            'post_excerpt' => $item['excerpt'] ?? '',
            'post_status'  => 'publish',
            'post_type'    => $post_type,
            'post_name'    => $slug ?: sanitize_title($title),
        ];
        
        if ($existing) {
            // Update existing
            $post_data['ID'] = $existing->ID;
            wp_update_post($post_data);
            $post_id = $existing->ID;
        } else {
            // Create new
            $post_id = wp_insert_post($post_data);
        }
        
        if (is_wp_error($post_id)) continue;
        
        // Store remote ID
        if ($remote_id) {
            update_post_meta($post_id, '_nibrc_remote_id', $remote_id);
        }
        
        // Sync custom fields based on type
        nibrc_sync_meta($post_id, $item, $source_key);
        
        // Sync image
        if (!empty($item['image'])) {
            nibrc_sync_image($post_id, $item['image']);
        }
        
        $count++;
        $synced_ids[] = $post_id;
    }
    
    return $count;
}

/**
 * Sync custom meta fields
 */
function nibrc_sync_meta($post_id, $item, $source_key) {
    $meta_map = [
        'courses' => [
            'price'      => '_nibrc_price',
            'duration'   => '_nibrc_duration',
            'level'      => '_nibrc_level',
            'lessons'    => '_nibrc_lessons',
            'packages'   => '_nibrc_packages',
            'instructor' => '_nibrc_instructor',
        ],
        'instructors' => [
            'bio'       => '_nibrc_bio',
            'specialty' => '_nibrc_specialty',
        ],
        'products' => [
            'price' => '_nibrc_price',
            'type'  => '_nibrc_product_type',
        ],
        'workshops' => [
            'date'     => '_nibrc_workshop_date',
            'time'     => '_nibrc_workshop_time',
            'capacity' => '_nibrc_capacity',
        ],
        'dictionary' => [
            'latin'    => '_nibrc_latin',
            'category' => '_nibrc_category',
            'habitat'  => '_nibrc_habitat',
            'oxygen'   => '_nibrc_oxygen',
            'diseases' => '_nibrc_diseases',
        ],
        'exams' => [
            'duration'   => '_nibrc_duration',
            'pass_score' => '_nibrc_pass_score',
            'questions'  => '_nibrc_questions',
        ],
    ];
    
    $fields = $meta_map[$source_key] ?? [];
    
    foreach ($fields as $remote_key => $meta_key) {
        if (isset($item[$remote_key]) && $item[$remote_key] !== null) {
            $value = $item[$remote_key];
            if (is_array($value)) {
                $value = json_encode($value);
            }
            update_post_meta($post_id, $meta_key, $value);
        }
    }
}

/**
 * Sync image from URL
 */
function nibrc_sync_image($post_id, $image_url) {
    if (empty($image_url)) return;
    
    require_once(ABSPATH . 'wp-admin/includes/media.php');
    require_once(ABSPATH . 'wp-admin/includes/file.php');
    require_once(ABSPATH . 'wp-admin/includes/image.php');
    
    $attach_id = media_sideload_image($image_url, $post_id, '', 'id');
    
    if (!is_wp_error($attach_id)) {
        set_post_thumbnail($post_id, $attach_id);
    }
}

/**
 * Get sync status
 */
function nibrc_get_sync_status() {
    return [
        'last_sync'  => get_option('nibrc_last_sync', null),
        'sync_count' => get_option('nibrc_sync_count', 0),
        'errors'     => get_option('nibrc_sync_errors', 0),
        'main_site'  => get_option('nibrc_main_site_url', 'https://nibrc.ir'),
    ];
}

/**
 * Push offline changes to main site
 */
function nibrc_push_offline_changes() {
    $main_url = get_option('nibrc_main_site_url', 'https://nibrc.ir');
    $sync_key = get_option('nibrc_sync_key', '');
    
    $push_url = rtrim($main_url, '/') . '/sync/push';
    
    // Gather offline enrollments
    $enrollments = get_option('nibrc_offline_enrollments', []);
    $pending = array_filter($enrollments, function($e) { return empty($e['synced']); });
    
    // Gather offline tickets
    $tickets = get_option('nibrc_support_tickets', []);
    $pending_tickets = array_filter($tickets, function($t) { return empty($t['synced']); });
    
    if (empty($pending) && empty($pending_tickets)) {
        return ['ok' => true, 'message' => 'تغییرات آفلاینی برای ارسال وجود ندارد'];
    }
    
    $payload = json_encode([
        'enrollments' => array_values($pending),
        'tickets'     => array_values($pending_tickets),
    ]);
    
    $response = wp_remote_post($push_url, [
        'timeout' => 30,
        'headers' => [
            'X-Sync-Key'  => $sync_key,
            'Content-Type'=> 'application/json',
        ],
        'body' => $payload,
    ]);
    
    if (is_wp_error($response)) {
        return ['ok' => false, 'message' => $response->get_error_message()];
    }
    
    $code = wp_remote_retrieve_response_code($response);
    
    if ($code === 200) {
        // Mark as synced
        foreach ($enrollments as &$e) { $e['synced'] = true; }
        update_option('nibrc_offline_enrollments', $enrollments);
        
        foreach ($tickets as &$t) { $t['synced'] = true; }
        update_option('nibrc_support_tickets', $tickets);
        
        return ['ok' => true, 'message' => 'تغییرات با موفقیت ارسال شد'];
    }
    
    return ['ok' => false, 'message' => 'خطا در ارسال: HTTP ' . $code];
}

/**
 * Schedule sync using WP-Cron
 */
function nibrc_schedule_sync() {
    if (!wp_next_scheduled('nibrc_cron_sync')) {
        $interval = get_option('nibrc_sync_interval', 1800);
        wp_schedule_event(time(), 'nibrc_sync_interval', 'nibrc_cron_sync');
    }
}
add_action('init', 'nibrc_schedule_sync');

function nibrc_cron_sync_handler() {
    nibrc_perform_sync();
}
add_action('nibrc_cron_sync', 'nibrc_cron_sync_handler');

// Register custom cron interval
function nibrc_cron_schedules($schedules) {
    $schedules['nibrc_sync_interval'] = [
        'interval' => get_option('nibrc_sync_interval', 1800),
        'display'  => 'هر ' . (get_option('nibrc_sync_interval', 1800) / 60) . ' دقیقه',
    ];
    return $schedules;
}
add_filter('cron_schedules', 'nibrc_cron_schedules');
