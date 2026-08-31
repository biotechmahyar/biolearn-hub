<?php get_header(); ?>

<!-- Hero Section -->
<section class="nibrc-hero">
    <div class="nibrc-container">
        <h1>🧬 پلتفرم تخصصی علوم زیستی</h1>
        <p>دوره‌های تخصصی میکروبیولوژی و بیوتکنولوژی با بهترین اساتید — از مبتدی تا پیشرفته</p>
        <div class="nibrc-hero-actions">
            <a href="<?php echo home_url('/courses'); ?>" class="nibrc-btn" style="background:white;color:var(--nibrc-primary);font-weight:700;">
                مشاهده دوره‌ها →
            </a>
            <a href="<?php echo home_url('/auth?tab=register'); ?>" class="nibrc-btn" style="background:rgba(255,255,255,0.15);color:white;border:2px solid rgba(255,255,255,0.3);">
                ثبت‌نام رایگان
            </a>
        </div>
    </div>
</section>

<!-- Stats -->
<?php
$course_count = wp_count_posts('course')->publish ?? 0;
$article_count = wp_count_posts('article')->publish ?? 0;
$instructor_count = wp_count_posts('instructor')->publish ?? 0;
$student_count = count(get_users(['role' => 'subscriber'])) ?? 0;
?>
<section class="nibrc-stats">
    <div class="nibrc-stat">
        <div class="nibrc-stat-number"><?php echo $course_count; ?></div>
        <div class="nibrc-stat-label">دوره تخصصی</div>
    </div>
    <div class="nibrc-stat">
        <div class="nibrc-stat-number"><?php echo $article_count; ?></div>
        <div class="nibrc-stat-label">مقاله علمی</div>
    </div>
    <div class="nibrc-stat">
        <div class="nibrc-stat-number"><?php echo $instructor_count; ?></div>
        <div class="nibrc-stat-label">استاد مجرب</div>
    </div>
    <div class="nibrc-stat">
        <div class="nibrc-stat-number"><?php echo $student_count; ?>+</div>
        <div class="nibrc-stat-label">دانشجو</div>
    </div>
</section>

<!-- Featured Courses -->
<?php
$courses = get_posts([
    'post_type' => 'course',
    'posts_per_page' => 6,
    'post_status' => 'publish',
    'orderby' => 'date',
    'order' => 'DESC',
]);

if ($courses) :
?>
<section class="nibrc-section">
    <h2 class="nibrc-section-title">📚 دوره‌های ویژه</h2>
    <p class="nibrc-section-subtitle">جدیدترین دوره‌های تخصصی علوم زیستی</p>
    
    <div class="nibrc-grid">
        <?php foreach ($courses as $course) :
            $price = get_post_meta($course->ID, '_nibrc_price', true);
            $instructor_id = get_post_meta($course->ID, '_nibrc_instructor', true);
            $instructor_name = $instructor_id ? get_the_title($instructor_id) : '';
            $duration = get_post_meta($course->ID, '_nibrc_duration', true);
            $level = get_post_meta($course->ID, '_nibrc_level', true);
            $level_text = ['beginner' => 'مبتدی', 'intermediate' => 'متوسط', 'advanced' => 'پیشرفته'][$level] ?? '';
        ?>
            <a href="<?php echo get_permalink($course->ID); ?>" class="nibrc-card">
                <?php if (has_post_thumbnail($course->ID)) : ?>
                    <?php echo get_the_post_thumbnail($course->ID, 'nibrc-course', ['class' => 'nibrc-card-image']); ?>
                <?php else : ?>
                    <div class="nibrc-card-image" style="display:flex;align-items:center;justify-content:center;font-size:3rem;background:var(--nibrc-primary-light);color:var(--nibrc-primary);">🧫</div>
                <?php endif; ?>
                <div class="nibrc-card-body">
                    <h3 class="nibrc-card-title"><?php echo esc_html($course->post_title); ?></h3>
                    <p class="nibrc-card-excerpt"><?php echo wp_trim_words($course->post_excerpt ?: $course->post_content, 20); ?></p>
                    <div class="nibrc-card-meta">
                        <?php if ($instructor_name) : ?><span>👨‍🏫 <?php echo esc_html($instructor_name); ?></span><?php endif; ?>
                        <?php if ($duration) : ?><span>⏱ <?php echo esc_html($duration); ?></span><?php endif; ?>
                        <?php if ($level_text) : ?><span class="nibrc-badge"><?php echo esc_html($level_text); ?></span><?php endif; ?>
                    </div>
                    <?php if ($price) : ?>
                        <div style="margin-top:12px;">
                            <span class="nibrc-badge nibrc-badge-price"><?php echo number_format($price); ?> تومان</span>
                        </div>
                    <?php endif; ?>
                </div>
            </a>
        <?php endforeach; ?>
    </div>
    
    <div style="text-align:center;margin-top:32px;">
        <a href="<?php echo home_url('/courses'); ?>" class="nibrc-btn nibrc-btn-outline">مشاهده همه دوره‌ها</a>
    </div>
</section>
<?php endif; ?>

<!-- Latest Articles -->
<?php
$articles = get_posts([
    'post_type' => 'article',
    'posts_per_page' => 3,
    'post_status' => 'publish',
    'orderby' => 'date',
    'order' => 'DESC',
]);

if ($articles) :
?>
<section class="nibrc-section" style="background:var(--nibrc-surface);max-width:100%;padding:60px calc((100% - 1200px) / 2 + 20px);">
    <div class="nibrc-container" style="max-width:1200px;margin:0 auto;">
        <h2 class="nibrc-section-title">📝 جدیدترین مقالات</h2>
        <p class="nibrc-section-subtitle">مقالات تخصصی علوم زیستی</p>
        
        <div class="nibrc-grid">
            <?php foreach ($articles as $article) : ?>
                <a href="<?php echo get_permalink($article->ID); ?>" class="nibrc-card">
                    <?php if (has_post_thumbnail($article->ID)) : ?>
                        <?php echo get_the_post_thumbnail($article->ID, 'nibrc-article', ['class' => 'nibrc-card-image']); ?>
                    <?php else : ?>
                        <div class="nibrc-card-image" style="display:flex;align-items:center;justify-content:center;font-size:3rem;background:#f1f5f9;color:var(--nibrc-secondary);">📄</div>
                    <?php endif; ?>
                    <div class="nibrc-card-body">
                        <h3 class="nibrc-card-title"><?php echo esc_html($article->post_title); ?></h3>
                        <p class="nibrc-card-excerpt"><?php echo wp_trim_words($article->post_excerpt ?: $article->post_content, 20); ?></p>
                        <div class="nibrc-card-meta">
                            <span>📅 <?php echo get_the_date('Y/m/d', $article->ID); ?></span>
                        </div>
                    </div>
                </a>
            <?php endforeach; ?>
        </div>
    </div>
</section>
<?php endif; ?>

<!-- Instructors -->
<?php
$instructors = get_posts([
    'post_type' => 'instructor',
    'posts_per_page' => 4,
    'post_status' => 'publish',
]);

if ($instructors) :
?>
<section class="nibrc-section">
    <h2 class="nibrc-section-title">👨‍🏫 اساتید مجرب</h2>
    <p class="nibrc-section-subtitle">تیم متخصص ما در علوم زیستی</p>
    
    <div class="nibrc-grid" style="grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));">
        <?php foreach ($instructors as $inst) :
            $specialty = get_post_meta($inst->ID, '_nibrc_specialty', true);
        ?>
            <a href="<?php echo get_permalink($inst->ID); ?>" class="nibrc-card" style="text-align:center;">
                <?php if (has_post_thumbnail($inst->ID)) : ?>
                    <?php echo get_the_post_thumbnail($inst->ID, 'nibrc-instructor', ['class' => 'nibrc-card-image', 'style' => 'border-radius:50%;width:120px;height:120px;margin:20px auto;object-fit:cover;']); ?>
                <?php else : ?>
                    <div style="width:120px;height:120px;border-radius:50%;background:var(--nibrc-primary-light);display:flex;align-items:center;justify-content:center;font-size:3rem;margin:20px auto;">👤</div>
                <?php endif; ?>
                <div class="nibrc-card-body">
                    <h3 class="nibrc-card-title"><?php echo esc_html($inst->post_title); ?></h3>
                    <?php if ($specialty) : ?>
                        <p class="nibrc-card-excerpt"><?php echo esc_html($specialty); ?></p>
                    <?php endif; ?>
                </div>
            </a>
        <?php endforeach; ?>
    </div>
</section>
<?php endif; ?>

<!-- CTA Section -->
<section class="nibrc-hero" style="padding:60px 20px;">
    <div class="nibrc-container">
        <h2 style="font-size:1.8rem;font-weight:800;margin-bottom:12px;">همین الان شروع کنید</h2>
        <p style="opacity:0.9;max-width:600px;margin:0 auto 24px;font-size:1.05rem;">
            به جامعه هزاران دانشجوی علوم زیستی بپیوندید و مسیر یادگیری رو شروع کنید.
        </p>
        <div class="nibrc-hero-actions">
            <a href="<?php echo home_url('/auth?tab=register'); ?>" class="nibrc-btn" style="background:white;color:var(--nibrc-primary);font-weight:700;">
                ثبت‌نام رایگان
            </a>
            <a href="<?php echo home_url('/courses'); ?>" class="nibrc-btn" style="background:rgba(255,255,255,0.15);color:white;border:2px solid rgba(255,255,255,0.3);">
                مشاهده دوره‌ها
            </a>
        </div>
    </div>
</section>

<?php get_footer(); ?>
