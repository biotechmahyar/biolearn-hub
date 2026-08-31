<?php
/**
 * Custom Post Types for NIBRC
 * ثبت انواع محتوای سفارشی
 */

if (!defined('ABSPATH')) exit;

function nibrc_register_post_types() {
    
    // === دوره‌ها (Courses) ===
    register_post_type('course', [
        'labels' => [
            'name'          => 'دوره‌ها',
            'singular_name' => 'دوره',
            'add_new_item'  => 'افزودن دوره جدید',
            'edit_item'     => 'ویرایش دوره',
            'view_item'     => 'مشاهده دوره',
            'search_items'  => 'جستجوی دوره‌ها',
            'menu_name'     => 'دوره‌ها',
        ],
        'public'       => true,
        'has_archive'  => true,
        'rewrite'      => ['slug' => 'courses'],
        'menu_icon'    => 'dashicons-welcome-learn-more',
        'supports'     => ['title', 'editor', 'thumbnail', 'excerpt', 'custom-fields'],
        'show_in_rest' => true,
    ]);
    
    // === مقالات (Articles) ===
    register_post_type('article', [
        'labels' => [
            'name'          => 'مقالات',
            'singular_name' => 'مقاله',
            'add_new_item'  => 'افزودن مقاله جدید',
            'edit_item'     => 'ویرایش مقاله',
            'menu_name'     => 'مقالات',
        ],
        'public'       => true,
        'has_archive'  => true,
        'rewrite'      => ['slug' => 'articles'],
        'menu_icon'    => 'dashicons-admin-post',
        'supports'     => ['title', 'editor', 'thumbnail', 'excerpt'],
        'show_in_rest' => true,
    ]);
    
    // === اساتید (Instructors) ===
    register_post_type('instructor', [
        'labels' => [
            'name'          => 'اساتید',
            'singular_name' => 'استاد',
            'add_new_item'  => 'افزودن استاد جدید',
            'edit_item'     => 'ویرایش استاد',
            'menu_name'     => 'اساتید',
        ],
        'public'       => true,
        'has_archive'  => true,
        'rewrite'      => ['slug' => 'instructors'],
        'menu_icon'    => 'dashicons-businessperson',
        'supports'     => ['title', 'editor', 'thumbnail'],
        'show_in_rest' => true,
    ]);
    
    // === محصولات (Products) ===
    register_post_type('product', [
        'labels' => [
            'name'          => 'محصولات',
            'singular_name' => 'محصول',
            'add_new_item'  => 'افزودن محصول جدید',
            'edit_item'     => 'ویرایش محصول',
            'menu_name'     => 'محصولات',
        ],
        'public'       => true,
        'has_archive'  => true,
        'rewrite'      => ['slug' => 'products'],
        'menu_icon'    => 'dashicons-cart',
        'supports'     => ['title', 'editor', 'thumbnail', 'excerpt'],
        'show_in_rest' => true,
    ]);
    
    // === کارگاه‌ها (Workshops) ===
    register_post_type('workshop', [
        'labels' => [
            'name'          => 'کارگاه‌ها',
            'singular_name' => 'کارگاه',
            'add_new_item'  => 'افزودن کارگاه جدید',
            'edit_item'     => 'ویرایش کارگاه',
            'menu_name'     => 'کارگاه‌ها',
        ],
        'public'       => true,
        'has_archive'  => true,
        'rewrite'      => ['slug' => 'workshops'],
        'menu_icon'    => 'dashicons-calendar-alt',
        'supports'     => ['title', 'editor', 'thumbnail'],
        'show_in_rest' => true,
    ]);
    
    // === دیکشنری (Dictionary Terms) ===
    register_post_type('dictionary_term', [
        'labels' => [
            'name'          => 'دیکشنری',
            'singular_name' => 'اصطلاح',
            'add_new_item'  => 'افزودن اصطلاح جدید',
            'edit_item'     => 'ویرایش اصطلاح',
            'menu_name'     => 'دیکشنری',
        ],
        'public'       => true,
        'has_archive'  => true,
        'rewrite'      => ['slug' => 'dictionary'],
        'menu_icon'    => 'dashicons-book-alt',
        'supports'     => ['title', 'editor'],
        'show_in_rest' => true,
    ]);
    
    // === آزمون‌ها (Exams) ===
    register_post_type('exam', [
        'labels' => [
            'name'          => 'آزمون‌ها',
            'singular_name' => 'آزمون',
            'add_new_item'  => 'افزودن آزمون جدید',
            'edit_item'     => 'ویرایش آزمون',
            'menu_name'     => 'آزمون‌ها',
        ],
        'public'       => true,
        'has_archive'  => true,
        'rewrite'      => ['slug' => 'exams'],
        'menu_icon'    => 'dashicons-clipboard',
        'supports'     => ['title', 'editor'],
        'show_in_rest' => true,
    ]);
    
    // === آزمون سفارشی (Custom Fields for Course) ===
    // Price, packages, instructor, duration, level, lessons
    // These are stored as post_meta via ACF or manual metaboxes
    
    // === Custom Meta Boxes ===
    add_action('add_meta_boxes', 'nibrc_add_meta_boxes');
}
add_action('init', 'nibrc_register_post_types');

function nibrc_add_meta_boxes() {
    // Course meta box
    add_meta_box(
        'nibrc_course_details',
        'جزئیات دوره',
        'nibrc_course_meta_box',
        'course',
        'normal',
        'high'
    );
    
    // Instructor meta box
    add_meta_box(
        'nibrc_instructor_details',
        'جزئیات استاد',
        'nibrc_instructor_meta_box',
        'instructor',
        'normal',
        'high'
    );
    
    // Product meta box
    add_meta_box(
        'nibrc_product_details',
        'جزئیات محصول',
        'nibrc_product_meta_box',
        'product',
        'normal',
        'high'
    );
    
    // Workshop meta box
    add_meta_box(
        'nibrc_workshop_details',
        'جزئیات کارگاه',
        'nibrc_workshop_meta_box',
        'workshop',
        'normal',
        'high'
    );
    
    // Dictionary meta box
    add_meta_box(
        'nibrc_dictionary_details',
        'جزئیات اصطلاح',
        'nibrc_dictionary_meta_box',
        'dictionary_term',
        'normal',
        'high'
    );
    
    // Exam meta box
    add_meta_box(
        'nibrc_exam_details',
        'جزئیات آزمون',
        'nibrc_exam_meta_box',
        'exam',
        'normal',
        'high'
    );
}

// === Course Meta Box ===
function nibrc_course_meta_box($post) {
    wp_nonce_field('nibrc_course_nonce', 'nibrc_course_nonce');
    ?>
    <table class="form-table">
        <tr>
            <th><label for="nibrc_price">قیمت (تومان)</label></th>
            <td><input type="number" id="nibrc_price" name="nibrc_price" value="<?php echo esc_attr(get_post_meta($post->ID, '_nibrc_price', true)); ?>" class="regular-text" /></td>
        </tr>
        <tr>
            <th><label for="nibrc_instructor">استاد</label></th>
            <td>
                <select id="nibrc_instructor" name="nibrc_instructor" class="regular-text">
                    <option value="">انتخاب استاد</option>
                    <?php
                    $instructors = get_posts(['post_type' => 'instructor', 'posts_per_page' => -1]);
                    $current = get_post_meta($post->ID, '_nibrc_instructor', true);
                    foreach ($instructors as $inst) {
                        echo '<option value="' . esc_attr($inst->ID) . '"' . selected($current, $inst->ID, false) . '>' . esc_html($inst->post_title) . '</option>';
                    }
                    ?>
                </select>
            </td>
        </tr>
        <tr>
            <th><label for="nibrc_duration">مدت دوره</label></th>
            <td><input type="text" id="nibrc_duration" name="nibrc_duration" value="<?php echo esc_attr(get_post_meta($post->ID, '_nibrc_duration', true)); ?>" placeholder="مثلاً ۱۲ ساعت" class="regular-text" /></td>
        </tr>
        <tr>
            <th><label for="nibrc_level">سطح</label></th>
            <td>
                <select id="nibrc_level" name="nibrc_level">
                    <option value="beginner" <?php selected(get_post_meta($post->ID, '_nibrc_level', true), 'beginner'); ?>>مبتدی</option>
                    <option value="intermediate" <?php selected(get_post_meta($post->ID, '_nibrc_level', true), 'intermediate'); ?>>متوسط</option>
                    <option value="advanced" <?php selected(get_post_meta($post->ID, '_nibrc_level', true), 'advanced'); ?>>پیشرفته</option>
                </select>
            </td>
        </tr>
        <tr>
            <th><label for="nibrc_lessons">تعداد جلسات</label></th>
            <td><input type="number" id="nibrc_lessons" name="nibrc_lessons" value="<?php echo esc_attr(get_post_meta($post->ID, '_nibrc_lessons', true)); ?>" class="small-text" /></td>
        </tr>
        <tr>
            <th><label for="nibrc_packages">پکیج‌ها (JSON)</label></th>
            <td><textarea id="nibrc_packages" name="nibrc_packages" rows="4" class="large-text" placeholder='[{"name":"اقتصادی","price":500000},{"name":"پایه","price":800000}]'><?php echo esc_textarea(get_post_meta($post->ID, '_nibrc_packages', true)); ?></textarea></td>
        </tr>
    </table>
    <?php
}

// === Instructor Meta Box ===
function nibrc_instructor_meta_box($post) {
    wp_nonce_field('nibrc_instructor_nonce', 'nibrc_instructor_nonce');
    ?>
    <table class="form-table">
        <tr>
            <th><label for="nibrc_bio">بیوگرافی</label></th>
            <td><textarea id="nibrc_bio" name="nibrc_bio" rows="4" class="large-text"><?php echo esc_textarea(get_post_meta($post->ID, '_nibrc_bio', true)); ?></textarea></td>
        </tr>
        <tr>
            <th><label for="nibrc_specialty">تخصص</label></th>
            <td><input type="text" id="nibrc_specialty" name="nibrc_specialty" value="<?php echo esc_attr(get_post_meta($post->ID, '_nibrc_specialty', true)); ?>" class="regular-text" /></td>
        </tr>
    </table>
    <?php
}

// === Product Meta Box ===
function nibrc_product_meta_box($post) {
    wp_nonce_field('nibrc_product_nonce', 'nibrc_product_nonce');
    ?>
    <table class="form-table">
        <tr>
            <th><label for="nibrc_price">قیمت (تومان)</label></th>
            <td><input type="number" id="nibrc_price" name="nibrc_price" value="<?php echo esc_attr(get_post_meta($post->ID, '_nibrc_price', true)); ?>" class="regular-text" /></td>
        </tr>
        <tr>
            <th><label for="nibrc_product_type">نوع محصول</label></th>
            <td>
                <select id="nibrc_product_type" name="nibrc_product_type">
                    <option value="flashcard" <?php selected(get_post_meta($post->ID, '_nibrc_product_type', true), 'flashcard'); ?>>فلش‌کارت</option>
                    <option value="booklet" <?php selected(get_post_meta($post->ID, '_nibrc_product_type', true), 'booklet'); ?>>کتابچه</option>
                    <option value="poster" <?php selected(get_post_meta($post->ID, '_nibrc_product_type', true), 'poster'); ?>>پوستر</option>
                    <option value="other" <?php selected(get_post_meta($post->ID, '_nibrc_product_type', true), 'other'); ?>>سایر</option>
                </select>
            </td>
        </tr>
    </table>
    <?php
}

// === Workshop Meta Box ===
function nibrc_workshop_meta_box($post) {
    wp_nonce_field('nibrc_workshop_nonce', 'nibrc_workshop_nonce');
    ?>
    <table class="form-table">
        <tr>
            <th><label for="nibrc_workshop_date">تاریخ</label></th>
            <td><input type="date" id="nibrc_workshop_date" name="nibrc_workshop_date" value="<?php echo esc_attr(get_post_meta($post->ID, '_nibrc_workshop_date', true)); ?>" /></td>
        </tr>
        <tr>
            <th><label for="nibrc_workshop_time">ساعت</label></th>
            <td><input type="time" id="nibrc_workshop_time" name="nibrc_workshop_time" value="<?php echo esc_attr(get_post_meta($post->ID, '_nibrc_workshop_time', true)); ?>" /></td>
        </tr>
        <tr>
            <th><label for="nibrc_capacity">ظرفیت</label></th>
            <td><input type="number" id="nibrc_capacity" name="nibrc_capacity" value="<?php echo esc_attr(get_post_meta($post->ID, '_nibrc_capacity', true)); ?>" class="small-text" /></td>
        </tr>
    </table>
    <?php
}

// === Dictionary Meta Box ===
function nibrc_dictionary_meta_box($post) {
    wp_nonce_field('nibrc_dictionary_nonce', 'nibrc_dictionary_nonce');
    ?>
    <table class="form-table">
        <tr>
            <th><label for="nibrc_latin">نام لاتین</label></th>
            <td><input type="text" id="nibrc_latin" name="nibrc_latin" value="<?php echo esc_attr(get_post_meta($post->ID, '_nibrc_latin', true)); ?>" class="regular-text" /></td>
        </tr>
        <tr>
            <th><label for="nibrc_category">دسته‌بندی</label></th>
            <td><input type="text" id="nibrc_category" name="nibrc_category" value="<?php echo esc_attr(get_post_meta($post->ID, '_nibrc_category', true)); ?>" class="regular-text" /></td>
        </tr>
        <tr>
            <th><label for="nibrc_habitat">زیستگاه</label></th>
            <td><input type="text" id="nibrc_habitat" name="nibrc_habitat" value="<?php echo esc_attr(get_post_meta($post->ID, '_nibrc_habitat', true)); ?>" class="regular-text" /></td>
        </tr>
        <tr>
            <th><label for="nibrc_oxygen">نیاز اکسیژن</label></th>
            <td><input type="text" id="nibrc_oxygen" name="nibrc_oxygen" value="<?php echo esc_attr(get_post_meta($post->ID, '_nibrc_oxygen', true)); ?>" class="regular-text" /></td>
        </tr>
        <tr>
            <th><label for="nibrc_diseases">بیماری‌ها (JSON)</label></th>
            <td><textarea id="nibrc_diseases" name="nibrc_diseases" rows="3" class="large-text">["بیماری ۱","بیماری ۲"]</textarea></td>
        </tr>
    </table>
    <?php
}

// === Exam Meta Box ===
function nibrc_exam_meta_box($post) {
    wp_nonce_field('nibrc_exam_nonce', 'nibrc_exam_nonce');
    ?>
    <table class="form-table">
        <tr>
            <th><label for="nibrc_duration">مدت (دقیقه)</label></th>
            <td><input type="number" id="nibrc_duration" name="nibrc_duration" value="<?php echo esc_attr(get_post_meta($post->ID, '_nibrc_duration', true)); ?>" class="small-text" /></td>
        </tr>
        <tr>
            <th><label for="nibrc_pass_score">نمره قبولی</label></th>
            <td><input type="number" id="nibrc_pass_score" name="nibrc_pass_score" value="<?php echo esc_attr(get_post_meta($post->ID, '_nibrc_pass_score', true)); ?>" class="small-text" /></td>
        </tr>
        <tr>
            <th><label for="nibrc_questions">سوالات (JSON)</label></th>
            <td><textarea id="nibrc_questions" name="nibrc_questions" rows="8" class="large-text" placeholder='[{"q":"سوال","options":["الف","ب","ج","د"],"answer":0}]'><?php echo esc_textarea(get_post_meta($post->ID, '_nibrc_questions', true)); ?></textarea></td>
        </tr>
    </table>
    <?php
}

// === Save Meta Boxes ===
function nibrc_save_post_meta($post_id) {
    // Verify nonces
    if (isset($_POST['nibrc_course_nonce']) && !wp_verify_nonce($_POST['nibrc_course_nonce'], 'nibrc_course_nonce')) return;
    if (isset($_POST['nibrc_instructor_nonce']) && !wp_verify_nonce($_POST['nibrc_instructor_nonce'], 'nibrc_instructor_nonce')) return;
    if (isset($_POST['nibrc_product_nonce']) && !wp_verify_nonce($_POST['nibrc_product_nonce'], 'nibrc_product_nonce')) return;
    if (isset($_POST['nibrc_workshop_nonce']) && !wp_verify_nonce($_POST['nibrc_workshop_nonce'], 'nibrc_workshop_nonce')) return;
    if (isset($_POST['nibrc_dictionary_nonce']) && !wp_verify_nonce($_POST['nibrc_dictionary_nonce'], 'nibrc_dictionary_nonce')) return;
    if (isset($_POST['nibrc_exam_nonce']) && !wp_verify_nonce($_POST['nibrc_exam_nonce'], 'nibrc_exam_nonce')) return;
    
    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) return;
    if (!current_user_can('edit_post', $post_id)) return;
    
    // Save all meta fields
    $meta_fields = [
        '_nibrc_price', '_nibrc_instructor', '_nibrc_duration', '_nibrc_level',
        '_nibrc_lessons', '_nibrc_packages', '_nibrc_bio', '_nibrc_specialty',
        '_nibrc_product_type', '_nibrc_workshop_date', '_nibrc_workshop_time',
        '_nibrc_capacity', '_nibrc_latin', '_nibrc_category', '_nibrc_habitat',
        '_nibrc_oxygen', '_nibrc_diseases', '_nibrc_pass_score', '_nibrc_questions',
    ];
    
    foreach ($meta_fields as $field) {
        $key = str_replace('_nibrc_', 'nibrc_', $field);
        if (isset($_POST[$key])) {
            update_post_meta($post_id, $field, sanitize_text_field($_POST[$key]));
        }
    }
}
add_action('save_post', 'nibrc_save_post_meta');
