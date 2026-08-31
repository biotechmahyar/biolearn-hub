<?php get_header(); ?>

<main class="nibrc-container" style="padding-top:40px;padding-bottom:60px;">
    <h1 class="nibrc-section-title">📝 مقالات</h1>
    <p class="nibrc-section-subtitle">مقالات تخصصی علوم زیستی</p>
    
    <?php if (have_posts()) : ?>
        <div class="nibrc-grid">
            <?php while (have_posts()) : the_post(); ?>
                <a href="<?php the_permalink(); ?>" class="nibrc-card">
                    <?php if (has_post_thumbnail()) : ?>
                        <?php the_post_thumbnail('nibrc-article', ['class' => 'nibrc-card-image']); ?>
                    <?php else : ?>
                        <div class="nibrc-card-image" style="display:flex;align-items:center;justify-content:center;font-size:3rem;background:#f1f5f9;color:var(--nibrc-secondary);">📄</div>
                    <?php endif; ?>
                    <div class="nibrc-card-body">
                        <h3 class="nibrc-card-title"><?php the_title(); ?></h3>
                        <p class="nibrc-card-excerpt"><?php echo wp_trim_words(get_the_excerpt(), 20); ?></p>
                        <div class="nibrc-card-meta">
                            <span>📅 <?php echo get_the_date(); ?></span>
                        </div>
                    </div>
                </a>
            <?php endwhile; ?>
        </div>
    <?php else : ?>
        <div class="nibrc-empty">
            <div class="nibrc-empty-icon">📝</div>
            <h2>هنوز مقاله‌ای اضافه نشده</h2>
        </div>
    <?php endif; ?>
</main>

<?php get_footer(); ?>
