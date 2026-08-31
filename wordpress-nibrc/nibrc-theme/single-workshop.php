<?php get_header(); ?>

<?php while (have_posts()) : the_post(); ?>
<main class="nibrc-container" style="padding-top:40px;padding-bottom:60px;">
    <div style="max-width:800px;margin:0 auto;">
        <?php if (has_post_thumbnail()) : ?>
            <?php the_post_thumbnail('large', ['style' => 'width:100%;border-radius:var(--nibrc-radius);margin-bottom:24px;']); ?>
        <?php endif; ?>
        
        <h1 style="font-size:2rem;font-weight:800;margin-bottom:16px;"><?php the_title(); ?></h1>
        
        <?php
        $ws_date = get_post_meta(get_the_ID(), '_nibrc_workshop_date', true);
        $ws_time = get_post_meta(get_the_ID(), '_nibrc_workshop_time', true);
        $capacity = get_post_meta(get_the_ID(), '_nibrc_capacity', true);
        ?>
        
        <div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:24px;">
            <?php if ($ws_date) : ?><span class="nibrc-badge">📅 <?php echo esc_html($ws_date); ?></span><?php endif; ?>
            <?php if ($ws_time) : ?><span class="nibrc-badge">🕐 <?php echo esc_html($ws_time); ?></span><?php endif; ?>
            <?php if ($capacity) : ?><span class="nibrc-badge">👥 ظرفیت: <?php echo esc_html($capacity); ?></span><?php endif; ?>
        </div>
        
        <div style="line-height:2;font-size:1.05rem;">
            <?php the_content(); ?>
        </div>
        
        <div style="margin-top:32px;">
            <button class="nibrc-btn nibrc-btn-primary" onclick="registerWorkshop(<?php echo get_the_ID(); ?>)">
                ثبت‌نام در کارگاه
            </button>
        </div>
    </div>
</main>
<?php endwhile; ?>

<script>
function registerWorkshop(id) {
    if (!<?php echo is_user_logged_in() ? 'true' : 'false'; ?>) {
        window.location.href = '<?php echo home_url("/auth?returnTo=" . urlencode(get_permalink())); ?>';
        return;
    }
    alert('ثبت‌نام با موفقیت انجام شد!');
}
</script>

<?php get_footer(); ?>
