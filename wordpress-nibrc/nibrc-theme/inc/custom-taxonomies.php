<?php
/**
 * NIBRC Custom Taxonomies
 */

if (!defined('ABSPATH')) exit;

function nibrc_register_taxonomies() {

    // ──── Category (shared across courses & articles) ────
    register_taxonomy('nibrc_category', ['nibrc_course', 'nibrc_article'], [
        'labels' => [
            'name'          => 'دسته‌بندی‌ها',
            'singular_name' => 'دسته‌بندی',
            'add_new_item'  => 'افزودن دسته‌بندی',
        ],
        'public'       => true,
        'hierarchical' => true,
        'rewrite'      => ['slug' => 'category'],
        'show_in_rest' => true,
    ]);

    // ──── Course Level ────
    register_taxonomy('nibrc_level', ['nibrc_course'], [
        'labels' => [
            'name'          => 'سطح دوره',
            'singular_name' => 'سطح',
        ],
        'public'       => true,
        'hierarchical' => true,
        'rewrite'      => ['slug' => 'level'],
        'show_in_rest' => true,
    ]);
}
add_action('init', 'nibrc_register_taxonomies');
