<?php get_header(); ?>

<main class="nibrc-container" style="padding-top:40px;padding-bottom:60px;">
    <h1 class="nibrc-section-title">🛒 محصولات آموزشی</h1>
    <p class="nibrc-section-subtitle">فلش‌کارت، کتابچه، پوستر و سایر محصولات</p>
    
    <?php if (have_posts()) : ?>
        <div class="nibrc-grid">
            <?php while (have_posts()) : the_post();
                $price = get_post_meta(get_the_ID(), '_nibrc_price', true);
                $type = get_post_meta(get_the_ID(), '_nibrc_product_type', true);
                $type_labels = ['flashcard' => 'فلش‌کارت', 'booklet' => 'کتابچه', 'poster' => 'پوستر', 'other' => 'سایر'];
            ?>
                <a href="<?php the_permalink(); ?>" class="nibrc-card">
                    <?php if (has_post_thumbnail()) : ?>
                        <?php the_post_thumbnail('medium', ['class' => 'nibrc-card-image']); ?>
                    <?php else : ?>
                        <div class="nibrc-card-image" style="display:flex;align-items:center;justify-content:center;font-size:3rem;background:#fef3c7;color:#92400e;">📦</div>
                    <?php endif; ?>
                    <div class="nibrc-card-body">
                        <?php if ($type && isset($type_labels[$type])) : ?>
                            <span class="nibrc-badge" style="margin-bottom:8px;"><?php echo esc_html($type_labels[$type]); ?></span>
                        <?php endif; ?>
                        <h3 class="nibrc-card-title"><?php the_title(); ?></h3>
                        <p class="nibrc-card-excerpt"><?php echo wp_trim_words(get_the_excerpt(), 15); ?></p>
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
            <div class="nibrc-empty-icon">📦</div>
            <h2>هنوز محصولی اضافه نشده</h2>
        </div>
    <?php endif; ?>
</main>

<?php get_footer(); ?>
