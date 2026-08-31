<?php
/**
 * Custom Taxonomies for NIBRC
 */

if (!defined('ABSPATH')) exit;

function nibrc_register_taxonomies() {
    
    // === دسته‌بندی دوره‌ها ===
    register_taxonomy('course_category', ['course'], [
        'labels' => [
            'name'          => 'دسته‌بندی دوره‌ها',
            'singular_name' => 'دسته‌بندی',
            'search_items'  => 'جستجوی دسته‌بندی‌ها',
            'all_items'     => 'همه دسته‌بندی‌ها',
            'edit_item'     => 'ویرایش دسته‌بندی',
            'add_new_item'  => 'افزودن دسته‌بندی جدید',
        ],
        'hierarchical' => true,
        'public'       => true,
        'rewrite'      => ['slug' => 'course-category'],
        'show_in_rest' => true,
    ]);
    
    // === دسته‌بندی مقالات ===
    register_taxonomy('article_category', ['article'], [
        'labels' => [
            'name'          => 'دسته‌بندی مقالات',
            'singular_name' => 'دسته‌بندی',
            'search_items'  => 'جستجوی دسته‌بندی‌ها',
            'all_items'     => 'همه دسته‌بندی‌ها',
            'edit_item'     => 'ویرایش دسته‌بندی',
            'add_new_item'  => 'افزودن دسته‌بندی جدید',
        ],
        'hierarchical' => true,
        'public'       => true,
        'rewrite'      => ['slug' => 'article-category'],
        'show_in_rest' => true,
    ]);
    
    // === برچسب‌ها (Tags) ===
    register_taxonomy('nibrc_tag', ['course', 'article', 'workshop'], [
        'labels' => [
            'name'          => 'برچسب‌ها',
            'singular_name' => 'برچسب',
            'search_items'  => 'جستجوی برچسب‌ها',
            'add_new_item'  => 'افزودن برچسب جدید',
        ],
        'hierarchical' => false,
        'public'       => true,
        'rewrite'      => ['slug' => 'tag'],
        'show_in_rest' => true,
    ]);
}
add_action('init', 'nibrc_register_taxonomies');
