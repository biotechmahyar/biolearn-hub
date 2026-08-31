<?php
/**
 * header.php — NIBRC Theme Header
 */
?>
<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo('charset'); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>

<!-- Header -->
<header class="nibrc-header">
    <div class="nibrc-container">
        <div class="nibrc-header-inner">
            <!-- Logo -->
            <a href="<?php echo home_url(); ?>" class="nibrc-logo">
                <?php if (has_custom_logo()): ?>
                    <?php the_custom_logo(); ?>
                <?php else: ?>
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="14" stroke="currentColor" stroke-width="2"/><path d="M10 16c0-3.3 2.7-6 6-6s6 2.7 6 6-2.7 6-6 6" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="16" cy="16" r="2" fill="currentColor"/></svg>
                    <span><?php bloginfo('name'); ?></span>
                <?php endif; ?>
            </a>

            <!-- Navigation -->
            <nav class="nibrc-nav">
                <?php
                if (has_nav_menu('main')) {
                    wp_nav_menu(array(
                        'theme_location' => 'main',
                        'container' => false,
                        'items_wrap' => '%3$s',
                        'fallback_cb' => function() {
                            $defaults = array(
                                'courses' => 'دوره‌ها',
                                'articles' => 'مقالات',
                                'instructors' => 'اساتید',
                                'products' => 'محصولات',
                                'workshops' => 'کارگاه‌ها',
                                'dictionary' => 'دیکشنری',
                            );
                            foreach ($defaults as $slug => $label) {
                                $url = get_post_type_archive_link($slug) ?: home_url("/{$slug}");
                                $class = is_post_type_archive($slug) ? 'active' : '';
                                echo "<a href=\"{$url}\" class=\"{$class}\">{$label}</a>";
                            }
                        },
                    ));
                } else {
                    $defaults = array(
                        'courses' => 'دوره‌ها',
                        'articles' => 'مقالات',
                        'instructors' => 'اساتید',
                        'products' => 'محصولات',
                        'workshops' => 'کارگاه‌ها',
                        'dictionary' => 'دیکشنری',
                    );
                    foreach ($defaults as $slug => $label) {
                        $url = get_post_type_archive_link($slug) ?: home_url("/{$slug}");
                        $class = is_post_type_archive($slug) ? 'active' : '';
                        echo "<a href=\"{$url}\" class=\"{$class}\">{$label}</a>";
                    }
                }
                ?>
            </nav>

            <!-- Actions -->
            <div class="nibrc-header-actions">
                <?php if (is_user_logged_in()): ?>
                    <?php
                    $user = wp_get_current_user();
                    $dashboard_url = home_url('/dashboard');
                    if (in_array('instructor', (array) $user->roles)) {
                        $dashboard_url = home_url('/instructor-panel');
                    } elseif ($user->has_cap('manage_options')) {
                        $dashboard_url = home_url('/wp-admin');
                    }
                    ?>
                    <a href="<?php echo $dashboard_url; ?>" class="nibrc-btn nibrc-btn-primary nibrc-btn-sm">پنل کاربری</a>
                <?php else: ?>
                    <a href="<?php echo home_url('/login'); ?>" class="nibrc-btn nibrc-btn-outline nibrc-btn-sm">ورود</a>
                    <a href="<?php echo home_url('/register'); ?>" class="nibrc-btn nibrc-btn-primary nibrc-btn-sm">ثبت‌نام</a>
                <?php endif; ?>
            </div>
        </div>
    </div>
</header>

<main class="nibrc-main">
