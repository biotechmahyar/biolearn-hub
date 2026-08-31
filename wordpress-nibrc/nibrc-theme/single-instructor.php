<?php get_header(); ?>

<?php while (have_posts()) : the_post(); ?>
<main class="nibrc-container" style="padding-top:40px;padding-bottom:60px;">
    <div style="max-width:800px;margin:0 auto;">
        <div style="display:flex;gap:24px;align-items:flex-start;margin-bottom:32px;">
            <?php if (has_post_thumbnail()) : ?>
                <?php the_post_thumbnail('nibrc-instructor', ['style' => 'width:160px;height:160px;border-radius:50%;object-fit:cover;flex-shrink:0;']); ?>
            <?php else : ?>
                <div style="width:160px;height:160px;border-radius:50%;background:var(--nibrc-primary-light);display:flex;align-items:center;justify-content:center;font-size:4rem;flex-shrink:0;">👤</div>
            <?php endif; ?>
            
            <div>
                <h1 style="font-size:1.8rem;font-weight:800;margin-bottom:8px;"><?php the_title(); ?></h1>
                <?php $specialty = get_post_meta(get_the_ID(), '_nibrc_specialty', true); ?>
                <?php if ($specialty) : ?>
                    <span class="nibrc-badge"><?php echo esc_html($specialty); ?></span>
                <?php endif; ?>
            </div>
        </div>
        
        <?php $bio = get_post_meta(get_the_ID(), '_nibrc_bio', true); ?>
        <?php if ($bio) : ?>
            <div style="background:var(--nibrc-surface);padding:24px;border-radius:var(--nibrc-radius);box-shadow:var(--nibrc-shadow);margin-bottom:32px;">
                <h3 style="margin-bottom:12px;">درباره استاد</h3>
                <p style="line-height:2;color:var(--nibrc-text-muted);"><?php echo esc_html($bio); ?></p>
            </div>
        <?php endif; ?>
        
        <div style="line-height:2;"><?php the_content(); ?></div>
    </div>
</main>
<?php endwhile; ?>

<?php get_footer(); ?>
