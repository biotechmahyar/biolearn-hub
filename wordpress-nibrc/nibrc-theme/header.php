<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo('charset'); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>

<!-- Connection Status Bar -->
<div id="nibrc-status-bar" class="nibrc-status-bar nibrc-status-online">
    <span id="status-icon">🟢</span>
    <span id="status-text">اتصال برقرار — سایت آنلاین</span>
</div>

<!-- Header -->
<header class="nibrc-header">
    <div class="nibrc-header-inner">
        <!-- Logo -->
        <a href="<?php echo home_url(); ?>" class="nibrc-logo">
            <?php if (has_custom_logo()) : ?>
                <?php the_custom_logo(); ?>
            <?php else : ?>
                <span>🧬 NIBRC</span>
            <?php endif; ?>
        </a>
        
        <!-- Navigation -->
        <nav class="nibrc-nav">
            <a href="<?php echo home_url(); ?>" class="<?php echo is_front_page() ? 'active' : ''; ?>">خانه</a>
            <a href="<?php echo home_url('/courses'); ?>" class="<?php echo is_post_type_archive('course') || is_singular('course') ? 'active' : ''; ?>">دوره‌ها</a>
            <a href="<?php echo home_url('/articles'); ?>" class="<?php echo is_post_type_archive('article') || is_singular('article') ? 'active' : ''; ?>">مقالات</a>
            <a href="<?php echo home_url('/instructors'); ?>" class="<?php echo is_post_type_archive('instructor') || is_singular('instructor') ? 'active' : ''; ?>">اساتید</a>
            <a href="<?php echo home_url('/products'); ?>" class="<?php echo is_post_type_archive('product') || is_singular('product') ? 'active' : ''; ?>">محصولات</a>
            <a href="<?php echo home_url('/dictionary'); ?>" class="<?php echo is_page('dictionary') ? 'active' : ''; ?>">دیکشنری</a>
            <a href="<?php echo home_url('/exams'); ?>" class="<?php echo is_page('exams') ? 'active' : ''; ?>">آزمون‌ها</a>
        </nav>
        
        <!-- Auth Buttons -->
        <div class="nibrc-auth-buttons" id="auth-section">
            <?php if (is_user_logged_in()) : ?>
                <a href="<?php echo home_url('/dashboard'); ?>" class="nibrc-btn nibrc-btn-primary">داشبورد</a>
                <button onclick="nibrcLogout()" class="nibrc-btn nibrc-btn-ghost">خروج</button>
            <?php else : ?>
                <a href="<?php echo home_url('/auth'); ?>" class="nibrc-btn nibrc-btn-ghost">ورود</a>
                <a href="<?php echo home_url('/auth?tab=register'); ?>" class="nibrc-btn nibrc-btn-primary">ثبت‌نام</a>
            <?php endif; ?>
        </div>
    </div>
</header>
