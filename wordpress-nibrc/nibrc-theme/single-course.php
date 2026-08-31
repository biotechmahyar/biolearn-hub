<?php get_header(); ?>

<?php while (have_posts()) : the_post(); ?>
<main class="nibrc-container" style="padding-top:40px;padding-bottom:60px;">
    <div style="max-width:800px;margin:0 auto;">
        <?php if (has_post_thumbnail()) : ?>
            <?php the_post_thumbnail('large', ['style' => 'width:100%;border-radius:var(--nibrc-radius);margin-bottom:24px;']); ?>
        <?php endif; ?>
        
        <h1 style="font-size:2rem;font-weight:800;margin-bottom:16px;"><?php the_title(); ?></h1>
        
        <?php
        $price = get_post_meta(get_the_ID(), '_nibrc_price', true);
        $instructor_id = get_post_meta(get_the_ID(), '_nibrc_instructor', true);
        $duration = get_post_meta(get_the_ID(), '_nibrc_duration', true);
        $level = get_post_meta(get_the_ID(), '_nibrc_level', true);
        $lessons = get_post_meta(get_the_ID(), '_nibrc_lessons', true);
        $level_text = ['beginner' => 'مبتدی', 'intermediate' => 'متوسط', 'advanced' => 'پیشرفته'][$level] ?? '';
        ?>
        
        <div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:24px;">
            <?php if ($instructor_id) : ?>
                <span class="nibrc-badge">👨‍🏫 <?php echo esc_html(get_the_title($instructor_id)); ?></span>
            <?php endif; ?>
            <?php if ($duration) : ?>
                <span class="nibrc-badge">⏱ <?php echo esc_html($duration); ?></span>
            <?php endif; ?>
            <?php if ($level_text) : ?>
                <span class="nibrc-badge"><?php echo esc_html($level_text); ?></span>
            <?php endif; ?>
            <?php if ($lessons) : ?>
                <span class="nibrc-badge">📝 <?php echo esc_html($lessons); ?> جلسه</span>
            <?php endif; ?>
        </div>
        
        <?php if ($price) : ?>
            <div style="background:var(--nibrc-primary-light);padding:20px;border-radius:var(--nibrc-radius);margin-bottom:24px;display:flex;align-items:center;justify-content:space-between;">
                <div>
                    <div style="font-size:0.9rem;color:var(--nibrc-text-muted);">قیمت دوره</div>
                    <div style="font-size:1.5rem;font-weight:800;color:var(--nibrc-primary);"><?php echo number_format($price); ?> تومان</div>
                </div>
                <button class="nibrc-btn nibrc-btn-primary" onclick="nibrcEnroll(<?php echo get_the_ID(); ?>)">
                    ثبت‌نام در دوره
                </button>
            </div>
        <?php endif; ?>
        
        <div class="nibrc-card-body" style="padding:0;">
            <div style="line-height:2;font-size:1.05rem;">
                <?php the_content(); ?>
            </div>
        </div>
    </div>
</main>
<?php endwhile; ?>

<script>
function nibrcEnroll(courseId) {
    if (!<?php echo is_user_logged_in() ? 'true' : 'false'; ?>) {
        window.location.href = '<?php echo home_url("/auth?returnTo=" . urlencode(get_permalink())); ?>';
        return;
    }
    alert('ثبت‌نام با موفقیت انجام شد!');
}
</script>

<?php get_footer(); ?>
