<?php get_header(); ?>

<?php while (have_posts()) : the_post(); ?>
<main class="nibrc-container" style="padding-top:40px;padding-bottom:60px;">
    <div style="max-width:800px;margin:0 auto;">
        <div style="display:flex;gap:24px;flex-wrap:wrap;">
            <?php if (has_post_thumbnail()) : ?>
                <div style="flex:1;min-width:300px;">
                    <?php the_post_thumbnail('large', ['style' => 'width:100%;border-radius:var(--nibrc-radius);']); ?>
                </div>
            <?php endif; ?>
            
            <div style="flex:1;min-width:300px;">
                <h1 style="font-size:2rem;font-weight:800;margin-bottom:16px;"><?php the_title(); ?></h1>
                
                <?php
                $price = get_post_meta(get_the_ID(), '_nibrc_price', true);
                $type = get_post_meta(get_the_ID(), '_nibrc_product_type', true);
                $type_labels = ['flashcard' => 'فلش‌کارت', 'booklet' => 'کتابچه', 'poster' => 'پوستر', 'other' => 'سایر'];
                ?>
                
                <?php if ($type && isset($type_labels[$type])) : ?>
                    <span class="nibrc-badge" style="margin-bottom:12px;"><?php echo esc_html($type_labels[$type]); ?></span>
                <?php endif; ?>
                
                <?php if ($price) : ?>
                    <div style="font-size:1.5rem;font-weight:800;color:var(--nibrc-primary);margin:16px 0;">
                        <?php echo number_format($price); ?> تومان
                    </div>
                <?php endif; ?>
                
                <div style="line-height:2;margin:20px 0;">
                    <?php the_content(); ?>
                </div>
                
                <button class="nibrc-btn nibrc-btn-primary" style="padding:14px 40px;">
                    خرید محصول
                </button>
            </div>
        </div>
    </div>
</main>
<?php endwhile; ?>

<?php get_footer(); ?>
