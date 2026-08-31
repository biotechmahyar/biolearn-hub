<?php
/**
 * NIBRC Sync System — one-way pull from main site + push offline changes
 */

if (!defined('ABSPATH')) exit;

/* ───────── WP-Cron: Auto Sync Every 30 Minutes ───────── */
function nibrc_schedule_sync() {
    if (!wp_next_scheduled('nibrc_cron_sync')) {
        wp_schedule_event(time(), 'thirty_minutes', 'nibrc_cron_sync');
    }
}
add_action('init', 'nibrc_schedule_sync');

// Register the interval
function nibrc_sync_interval($schedules) {
    $schedules['thirty_minutes'] = [
        'interval' => 1800,
        'display'  => 'هر ۳۰ دقیقه',
    ];
    return $schedules;
}
add_filter('cron_schedules', 'nibrc_sync_interval');

add_action('nibrc_cron_sync', 'nibrc_run_sync');

/* ───────── Main Sync Function ───────── */
function nibrc_run_sync() {
    $main_url = get_option('nibrc_main_site_url', '');
    $sync_key = get_option('nibrc_sync_key', '');

    if (empty($main_url) || empty($sync_key)) {
        return ['ok' => false, 'message' => 'تنظیمات سینک ناقص است'];
    }

    $response = wp_remote_post($main_url . '/api/sync/data', [
        'timeout' => 60,
        'headers' => [
            'Content-Type'  => 'application/json',
            'X-Sync-Key'    => $sync_key,
        ],
        'body' => json_encode(['since' => get_option('nibrc_last_sync_time', '')]),
    ]);

    if (is_wp_error($response)) {
        nibrc_log_sync('error', $response->get_error_message());
        return ['ok' => false, 'message' => $response->get_error_message()];
    }

    $code = wp_remote_retrieve_response_code($response);
    if ($code !== 200) {
        nibrc_log_sync('error', "HTTP {$code}");
        return ['ok' => false, 'message' => "HTTP {$code}"];
    }

    $body = json_decode(wp_remote_retrieve_body($response), true);
    if (!$body || empty($body['data'])) {
        nibrc_log_sync('error', 'پاسخ خالی');
        return ['ok' => false, 'message' => 'پاسخ خالی'];
    }

    $counts = nibrc_upsert_data($body['data']);

    update_option('nibrc_last_sync_time', current_time('mysql'));
    $total = get_option('nibrc_sync_count', 0);
    update_option('nibrc_sync_count', $total + 1);

    nibrc_log_sync('success', json_encode($counts));
    return ['ok' => true, 'message' => 'سینک موفق', 'counts' => $counts];
}

/* ───────── Upsert Data into WordPress ───────── */
function nibrc_upsert_data($data) {
    $counts = [];

    $mappings = [
        'courses'     => 'nibrc_course',
        'articles'    => 'nibrc_article',
        'instructors' => 'nibrc_instructor',
        'products'    => 'nibrc_product',
        'workshops'   => 'nibrc_workshop',
        'dictionary'  => 'nibrc_dictionary',
    ];

    foreach ($mappings as $key => $post_type) {
        if (empty($data[$key])) continue;
        $count = 0;
        foreach ($data[$key] as $item) {
            $remote_id = $item['id'] ?? $item['_id'] ?? '';
            if (empty($remote_id)) continue;

            // Check if already synced
            $existing = get_posts([
                'post_type'   => $post_type,
                'meta_key'    => '_nibrc_remote_id',
                'meta_value'  => $remote_id,
                'numberposts' => 1,
                'post_status' => 'any',
            ]);

            $post_data = [
                'post_title'   => $item['title'] ?? '',
                'post_content' => $item['content'] ?? $item['description'] ?? '',
                'post_excerpt' => $item['excerpt'] ?? '',
                'post_status'  => 'publish',
                'post_type'    => $post_type,
                'meta_input'   => [
                    '_nibrc_remote_id'  => $remote_id,
                    '_nibrc_synced_at'  => current_time('mysql'),
                ],
            ];

            // Map custom fields
            $custom_fields = nibrc_get_custom_field_mapping($key, $item);
            $post_data['meta_input'] = array_merge($post_data['meta_input'], $custom_fields);

            if (!empty($existing)) {
                $post_data['ID'] = $existing[0]->ID;
                wp_update_post($post_data);
            } else {
                wp_insert_post($post_data);
            }
            $count++;
        }
        $counts[$key] = $count;
    }

    // Sync categories
    if (!empty($data['categories'])) {
        foreach ($data['categories'] as $cat) {
            nibrc_sync_category($cat);
        }
        $counts['categories'] = count($data['categories']);
    }

    return $counts;
}

/* ───────── Custom Field Mapping ───────── */
function nibrc_get_custom_field_mapping($type, $item) {
    $fields = [];

    switch ($type) {
        case 'courses':
            $fields['_nibrc_price']       = $item['price'] ?? '';
            $fields['_nibrc_slug']        = $item['slug'] ?? '';
            $fields['_nibrc_instructor']  = $item['instructorName'] ?? '';
            $fields['_nibrc_lessons']     = json_encode($item['lessons'] ?? []);
            $fields['_nibrc_resources']   = json_encode($item['resources'] ?? []);
            $fields['_nibrc_packages']    = json_encode($item['packages'] ?? []);
            $fields['_nibrc_is_free']     = $item['isFree'] ?? '0';
            break;

        case 'articles':
            $fields['_nibrc_author']  = $item['author'] ?? '';
            $fields['_nibrc_views']   = $item['views'] ?? 0;
            break;

        case 'instructors':
            $fields['_nibrc_email']       = $item['email'] ?? '';
            $fields['_nibrc_specialty']   = $item['specialty'] ?? '';
            $fields['_nibrc_bio']         = $item['bio'] ?? '';
            $fields['_nibrc_courses']     = json_encode($item['courseIds'] ?? []);
            break;

        case 'products':
            $fields['_nibrc_price']  = $item['price'] ?? '';
            $fields['_nibrc_type']   = $item['type'] ?? '';
            $fields['_nibrc_stock']  = $item['stock'] ?? '';
            break;

        case 'workshops':
            $fields['_nibrc_date']      = $item['date'] ?? '';
            $fields['_nibrc_time']      = $item['time'] ?? '';
            $fields['_nibrc_location']  = $item['location'] ?? '';
            $fields['_nibrc_capacity']  = $item['capacity'] ?? '';
            break;

        case 'dictionary':
            $fields['_nibrc_en_name']   = $item['englishName'] ?? '';
            $fields['_nibrc_latin']     = $item['latinName'] ?? '';
            $fields['_nibrc_category']  = $item['category'] ?? '';
            $fields['_nibrc_habitat']   = $item['habitat'] ?? '';
            break;
    }

    return $fields;
}

/* ───────── Category Sync ───────── */
function nibrc_sync_category($cat) {
    $term = term_exists($cat['name'], 'nibrc_category');
    if (!$term) {
        $term = wp_insert_term($cat['name'], 'nibrc_category', [
            'slug' => $cat['slug'] ?? sanitize_title($cat['name']),
        ]);
    }
}

/* ───────── Push Offline Changes ───────── */
function nibrc_push_offline_changes() {
    global $wpdb;

    $table = $wpdb->prefix . 'nibrc_offline_queue';
    if ($wpdb->get_var("SHOW TABLES LIKE '{$table}'") !== $table) {
        return ['ok' => false, 'message' => 'جدول صف وجود ندارد'];
    }

    $pending = $wpdb->get_results("SELECT * FROM {$table} WHERE status = 'pending' ORDER BY created_at ASC LIMIT 50", ARRAY_A);
    if (empty($pending)) {
        return ['ok' => true, 'message' => 'تغییری برای ارسال نیست', 'pushed' => 0];
    }

    $main_url = get_option('nibrc_main_site_url', '');
    $sync_key = get_option('nibrc_sync_key', '');

    $changes = array_map(function($row) {
        return [
            'type'       => $row['change_type'],
            'table'      => $row['data_table'],
            'record_id'  => $row['record_id'],
            'data'       => json_decode($row['data_json'], true),
            'created_at' => $row['created_at'],
        ];
    }, $pending);

    $response = wp_remote_post($main_url . '/api/sync/push', [
        'timeout' => 60,
        'headers' => [
            'Content-Type'  => 'application/json',
            'X-Sync-Key'    => $sync_key,
        ],
        'body' => json_encode(['changes' => $changes]),
    ]);

    if (is_wp_error($response)) {
        return ['ok' => false, 'message' => $response->get_error_message()];
    }

    $code = wp_remote_retrieve_response_code($response);
    if ($code !== 200) {
        return ['ok' => false, 'message' => "HTTP {$code}"];
    }

    // Mark as pushed
    $ids = array_column($pending, 'id');
    $placeholders = implode(',', array_fill(0, count($ids), '%d'));
    $wpdb->query($wpdb->prepare(
        "UPDATE {$table} SET status = 'pushed', pushed_at = %s WHERE id IN ({$placeholders})",
        array_merge([current_time('mysql')], $ids)
    ));

    return ['ok' => true, 'message' => count($pending) . ' تغییر ارسال شد', 'pushed' => count($pending)];
}

/* ───────── Logging ───────── */
function nibrc_log_sync($level, $message) {
    $log_file = WP_CONTENT_DIR . '/nibrc-sync.log';
    $line = '[' . date('Y-m-d H:i:s') . '] [' . strtoupper($level) . '] ' . $message . PHP_EOL;
    file_put_contents($log_file, $line, FILE_APPEND | LOCK_EX);
}

/* ───────── Create offline queue table on activation ───────── */
function nibrc_create_sync_tables() {
    global $wpdb;
    $table = $wpdb->prefix . 'nibrc_offline_queue';
    $charset = $wpdb->get_charset_collate();

    $sql = "CREATE TABLE IF NOT EXISTS {$table} (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        change_type VARCHAR(20) NOT NULL DEFAULT 'create',
        data_table VARCHAR(100) NOT NULL,
        record_id VARCHAR(100) NOT NULL,
        data_json LONGTEXT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        pushed_at DATETIME DEFAULT NULL,
        PRIMARY KEY (id),
        KEY idx_status (status),
        KEY idx_table (data_table)
    ) {$charset};";

    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    dbDelta($sql);
}
register_activation_hook(__DIR__, 'nibrc_create_sync_tables');
