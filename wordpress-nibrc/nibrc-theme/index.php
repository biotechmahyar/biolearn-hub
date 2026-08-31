<?php get_header(); ?>

<main class="nibrc-container" style="padding-top: 40px; padding-bottom: 40px;">
    <?php if (have_posts()) : ?>
        <h1 class="nibrc-section-title"><?php the_archive_title(); ?></h1>
        <div class="nibrc-section-subtitle"><?php the_archive_description(); ?></div>
        
        <div class="nibrc-grid">
            <?php while (have_posts()) : the_post(); ?>
                <a href="<?php the_permalink(); ?>" class="nibrc-card">
                    <?php if (has_post_thumbnail()) : ?>
                        <?php the_post_thumbnail('nibrc-course', ['class' => 'nibrc-card-image']); ?>
                    <?php else : ?>
                        <div class="nibrc-card-image" style="display:flex;align-items:center;justify-content:center;font-size:3rem;color:var(--nibrc-primary);">📚</div>
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
        
        <div style="text-align:center;margin-top:40px;">
            <?php the_posts_pagination(); ?>
        </div>
    <?php else : ?>
        <div class="nibrc-empty">
            <div class="nibrc-empty-icon">📭</div>
            <h2>محتوایی یافت نشد</h2>
        </div>
    <?php endif; ?>
</main>

<?php get_footer(); ?>
