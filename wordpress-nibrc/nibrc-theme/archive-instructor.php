<?php get_header(); ?>

<main class="nibrc-container" style="padding-top:40px;padding-bottom:60px;">
    <h1 class="nibrc-section-title">👨‍🏫 اساتید</h1>
    <p class="nibrc-section-subtitle">تیم متخصص علوم زیستی</p>
    
    <?php if (have_posts()) : ?>
        <div class="nibrc-grid" style="grid-template-columns:repeat(auto-fill,minmax(280px,1fr));">
            <?php while (have_posts()) : the_post();
                $specialty = get_post_meta(get_the_ID(), '_nibrc_specialty', true);
            ?>
                <a href="<?php the_permalink(); ?>" class="nibrc-card" style="text-align:center;">
                    <?php if (has_post_thumbnail()) : ?>
                        <?php the_post_thumbnail('nibrc-instructor', ['class' => 'nibrc-card-image', 'style' => 'border-radius:50%;width:120px;height:120px;margin:20px auto;object-fit:cover;']); ?>
                    <?php else : ?>
                        <div style="width:120px;height:120px;border-radius:50%;background:var(--nibrc-primary-light);display:flex;align-items:center;justify-content:center;font-size:3rem;margin:20px auto;">👤</div>
                    <?php endif; ?>
                    <div class="nibrc-card-body">
                        <h3 class="nibrc-card-title"><?php the_title(); ?></h3>
                        <?php if ($specialty) : ?>
                            <p class="nibrc-card-excerpt"><?php echo esc_html($specialty); ?></p>
                        <?php endif; ?>
                    </div>
                </a>
            <?php endwhile; ?>
        </div>
    <?php else : ?>
        <div class="nibrc-empty">
            <div class="nibrc-empty-icon">👨‍🏫</div>
            <h2>هنوز استادی اضافه نشده</h2>
        </div>
    <?php endif; ?>
</main>

<?php get_footer(); ?>
