<?php get_header(); ?>

<main class="nibrc-container" style="padding-top:40px;padding-bottom:60px;">
    <h1 class="nibrc-section-title">🎯 کارگاه‌ها</h1>
    <p class="nibrc-section-subtitle">کارگاه‌های آموزشی و تخصصی</p>
    
    <?php if (have_posts()) : ?>
        <div class="nibrc-grid">
            <?php while (have_posts()) : the_post();
                $ws_date = get_post_meta(get_the_ID(), '_nibrc_workshop_date', true);
                $ws_time = get_post_meta(get_the_ID(), '_nibrc_workshop_time', true);
                $capacity = get_post_meta(get_the_ID(), '_nibrc_capacity', true);
            ?>
                <a href="<?php the_permalink(); ?>" class="nibrc-card">
                    <?php if (has_post_thumbnail()) : ?>
                        <?php the_post_thumbnail('medium', ['class' => 'nibrc-card-image']); ?>
                    <?php else : ?>
                        <div class="nibrc-card-image" style="display:flex;align-items:center;justify-content:center;font-size:3rem;background:#ede9fe;color:#7c3aed;">🎯</div>
                    <?php endif; ?>
                    <div class="nibrc-card-body">
                        <h3 class="nibrc-card-title"><?php the_title(); ?></h3>
                        <p class="nibrc-card-excerpt"><?php echo wp_trim_words(get_the_excerpt(), 15); ?></p>
                        <div class="nibrc-card-meta">
                            <?php if ($ws_date) : ?><span>📅 <?php echo esc_html($ws_date); ?></span><?php endif; ?>
                            <?php if ($ws_time) : ?><span>🕐 <?php echo esc_html($ws_time); ?></span><?php endif; ?>
                            <?php if ($capacity) : ?><span>👥 ظرفیت: <?php echo esc_html($capacity); ?></span><?php endif; ?>
                        </div>
                    </div>
                </a>
            <?php endwhile; ?>
        </div>
    <?php else : ?>
        <div class="nibrc-empty">
            <div class="nibrc-empty-icon">🎯</div>
            <h2>هنوز کارگاهی اضافه نشده</h2>
        </div>
    <?php endif; ?>
</main>

<?php get_footer(); ?>
