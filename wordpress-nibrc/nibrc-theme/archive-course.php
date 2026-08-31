<?php get_header(); ?>

<main class="nibrc-container" style="padding-top:40px;padding-bottom:60px;">
    <h1 class="nibrc-section-title">📋 دوره‌ها</h1>
    <p class="nibrc-section-subtitle">تمام دوره‌های تخصصی علوم زیستی</p>
    
    <?php if (have_posts()) : ?>
        <div class="nibrc-grid">
            <?php while (have_posts()) : the_post();
                $price = get_post_meta(get_the_ID(), '_nibrc_price', true);
                $instructor_id = get_post_meta(get_the_ID(), '_nibrc_instructor', true);
                $duration = get_post_meta(get_the_ID(), '_nibrc_duration', true);
                $level = get_post_meta(get_the_ID(), '_nibrc_level', true);
                $level_text = ['beginner' => 'مبتدی', 'intermediate' => 'متوسط', 'advanced' => 'پیشرفته'][$level] ?? '';
            ?>
                <a href="<?php the_permalink(); ?>" class="nibrc-card">
                    <?php if (has_post_thumbnail()) : ?>
                        <?php the_post_thumbnail('nibrc-course', ['class' => 'nibrc-card-image']); ?>
                    <?php else : ?>
                        <div class="nibrc-card-image" style="display:flex;align-items:center;justify-content:center;font-size:3rem;background:var(--nibrc-primary-light);color:var(--nibrc-primary);">🧫</div>
                    <?php endif; ?>
                    <div class="nibrc-card-body">
                        <h3 class="nibrc-card-title"><?php the_title(); ?></h3>
                        <p class="nibrc-card-excerpt"><?php echo wp_trim_words(get_the_excerpt(), 20); ?></p>
                        <div class="nibrc-card-meta">
                            <?php if ($instructor_id) : ?><span>👨‍🏫 <?php echo esc_html(get_the_title($instructor_id)); ?></span><?php endif; ?>
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
            <?php endwhile; ?>
        </div>
    <?php else : ?>
        <div class="nibrc-empty">
            <div class="nibrc-empty-icon">📚</div>
            <h2>هنوز دوره‌ای اضافه نشده</h2>
        </div>
    <?php endif; ?>
</main>

<?php get_footer(); ?>
