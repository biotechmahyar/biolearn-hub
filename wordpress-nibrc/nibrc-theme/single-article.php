<?php get_header(); ?>

<?php while (have_posts()) : the_post(); ?>
<main class="nibrc-container" style="padding-top:40px;padding-bottom:60px;">
    <article style="max-width:800px;margin:0 auto;">
        <?php if (has_post_thumbnail()) : ?>
            <?php the_post_thumbnail('nibrc-article', ['style' => 'width:100%;border-radius:var(--nibrc-radius);margin-bottom:24px;']); ?>
        <?php endif; ?>
        
        <h1 style="font-size:2rem;font-weight:800;margin-bottom:8px;"><?php the_title(); ?></h1>
        
        <div class="nibrc-card-meta" style="margin-bottom:24px;">
            <span>📅 <?php echo get_the_date(); ?></span>
            <?php
            $cats = get_the_category();
            if ($cats) :
            ?>
                <span>📁 <?php echo esc_html($cats[0]->name); ?></span>
            <?php endif; ?>
        </div>
        
        <div style="line-height:2;font-size:1.05rem;">
            <?php the_content(); ?>
        </div>
    </article>
</main>
<?php endwhile; ?>

<?php get_footer(); ?>
