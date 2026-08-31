<?php
/**
 * NIBRC Custom Post Types
 */

if (!defined('ABSPATH')) exit;

function nibrc_register_post_types() {

    // ──── Courses ────
    register_post_type('nibrc_course', [
        'labels' => [
            'name'               => 'دوره‌ها',
            'singular_name'      => 'دوره',
            'add_new_item'       => 'افزودن دوره',
            'edit_item'          => 'ویرایش دوره',
            'all_items'          => 'همه دوره‌ها',
            'search_items'       => 'جستجوی دوره',
        ],
        'public'       => true,
        'has_archive'  => true,
        'rewrite'      => ['slug' => 'courses'],
        'menu_icon'    => 'dashicons-welcome-learn-more',
        'supports'     => ['title','editor','thumbnail','excerpt','custom-fields'],
        'show_in_rest' => true,
    ]);

    // ──── Articles ────
    register_post_type('nibrc_article', [
        'labels' => [
            'name'               => 'مقالات',
            'singular_name'      => 'مقاله',
            'add_new_item'       => 'افزودن مقاله',
            'edit_item'          => 'ویرایش مقاله',
            'all_items'          => 'همه مقالات',
            'search_items'       => 'جستجوی مقاله',
        ],
        'public'       => true,
        'has_archive'  => true,
        'rewrite'      => ['slug' => 'articles'],
        'menu_icon'    => 'dashicons-media-text',
        'supports'     => ['title','editor','thumbnail','excerpt','custom-fields'],
        'show_in_rest' => true,
    ]);

    // ──── Instructors ────
    register_post_type('nibrc_instructor', [
        'labels' => [
            'name'               => 'اساتید',
            'singular_name'      => 'استاد',
            'add_new_item'       => 'افزودن استاد',
            'edit_item'          => 'ویرایش استاد',
            'all_items'          => 'همه اساتید',
            'search_items'       => 'جستجوی استاد',
        ],
        'public'       => true,
        'has_archive'  => true,
        'rewrite'      => ['slug' => 'instructors'],
        'menu_icon'    => 'dashicons-groups',
        'supports'     => ['title','editor','thumbnail','excerpt','custom-fields'],
        'show_in_rest' => true,
    ]);

    // ──── Products ────
    register_post_type('nibrc_product', [
        'labels' => [
            'name'               => 'محصولات',
            'singular_name'      => 'محصول',
            'add_new_item'       => 'افزودن محصول',
            'edit_item'          => 'ویرایش محصول',
            'all_items'          => 'همه محصولات',
            'search_items'       => 'جستجوی محصول',
        ],
        'public'       => true,
        'has_archive'  => true,
        'rewrite'      => ['slug' => 'products'],
        'menu_icon'    => 'dashicons-cart',
        'supports'     => ['title','editor','thumbnail','excerpt','custom-fields'],
        'show_in_rest' => true,
    ]);

    // ──── Workshops ────
    register_post_type('nibrc_workshop', [
        'labels' => [
            'name'               => 'کارگاه‌ها',
            'singular_name'      => 'کارگاه',
            'add_new_item'       => 'افزودن کارگاه',
            'edit_item'          => 'ویرایش کارگاه',
            'all_items'          => 'همه کارگاه‌ها',
            'search_items'       => 'جستجوی کارگاه',
        ],
        'public'       => true,
        'has_archive'  => true,
        'rewrite'      => ['slug' => 'workshops'],
        'menu_icon'    => 'dashicons-calendar-alt',
        'supports'     => ['title','editor','thumbnail','excerpt','custom-fields'],
        'show_in_rest' => true,
    ]);

    // ──── Dictionary Terms ────
    register_post_type('nibrc_dictionary', [
        'labels' => [
            'name'               => 'واژه‌نامه',
            'singular_name'      => 'واژه',
            'add_new_item'       => 'افزودن واژه',
            'edit_item'          => 'ویرایش واژه',
            'all_items'          => 'همه واژه‌ها',
            'search_items'       => 'جستجوی واژه',
        ],
        'public'       => true,
        'has_archive'  => true,
        'rewrite'      => ['slug' => 'dictionary'],
        'menu_icon'    => 'dashicons-book-alt',
        'supports'     => ['title','editor','thumbnail','custom-fields'],
        'show_in_rest' => true,
    ]);

    // ──── Exams ────
    register_post_type('nibrc_exam', [
        'labels' => [
            'name'               => 'آزمون‌ها',
            'singular_name'      => 'آزمون',
            'add_new_item'       => 'افزودن آزمون',
            'edit_item'          => 'ویرایش آزمون',
            'all_items'          => 'همه آزمون‌ها',
        ],
        'public'       => false,
        'show_ui'      => true,
        'menu_icon'    => 'dashicons-clipboard',
        'supports'     => ['title','editor','custom-fields'],
        'show_in_rest' => true,
    ]);

    // ──── Exams Plugin (table-based, see nibrc-exam plugin) ────
    // Exams are handled by the nibrc-exam plugin via custom DB tables.
}
add_action('init', 'nibrc_register_post_types');

/* ──── Flush rewrite rules on theme activation ──── */
function nibrc_rewrite_flush() {
    nibrc_register_post_types();
    flush_rewrite_rules();
}
add_action('after_switch_theme', 'nibrc_rewrite_flush');
