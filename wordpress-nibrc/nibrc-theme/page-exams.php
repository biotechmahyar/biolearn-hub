<?php
/**
 * Template Name: Exams
 * آزمون‌ها
 */
get_header(); ?>

<main class="nibrc-container" style="padding-top:40px;padding-bottom:60px;">
    <h1 class="nibrc-section-title">📝 آزمون‌ها</h1>
    <p class="nibrc-section-subtitle">آزمون‌های آنلاین علوم زیستی</p>
    
    <div id="exams-list">
        <?php
        $exams = get_posts([
            'post_type' => 'exam',
            'posts_per_page' => -1,
            'post_status' => 'publish',
        ]);
        
        if ($exams) :
        ?>
            <div class="nibrc-grid">
                <?php foreach ($exams as $exam) :
                    $duration = get_post_meta($exam->ID, '_nibrc_duration', true);
                    $pass_score = get_post_meta($exam->ID, '_nibrc_pass_score', true);
                ?>
                    <div class="nibrc-card">
                        <div class="nibrc-card-body">
                            <h3 class="nibrc-card-title"><?php echo esc_html($exam->post_title); ?></h3>
                            <p class="nibrc-card-excerpt"><?php echo wp_trim_words($exam->post_content, 20); ?></p>
                            <div class="nibrc-card-meta" style="margin-top:12px;">
                                <?php if ($duration) : ?><span>⏱ <?php echo esc_html($duration); ?> دقیقه</span><?php endif; ?>
                                <?php if ($pass_score) : ?><span>✅ نمره قبولی: <?php echo esc_html($pass_score); ?></span><?php endif; ?>
                            </div>
                            <button class="nibrc-btn nibrc-btn-primary" style="margin-top:16px;" onclick="startExam(<?php echo $exam->ID; ?>)">
                                شروع آزمون
                            </button>
                        </div>
                    </div>
                <?php endforeach; ?>
            </div>
        <?php else : ?>
            <div class="nibrc-empty">
                <div class="nibrc-empty-icon">📝</div>
                <h2>هنوز آزمونی اضافه نشده</h2>
            </div>
        <?php endif; ?>
    </div>
</main>

<script>
function startExam(examId) {
    if (!<?php echo is_user_logged_in() ? 'true' : 'false'; ?>) {
        window.location.href = '<?php echo home_url("/auth?returnTo=/exams"); ?>';
        return;
    }
    alert('آزمون به زودی فعال می‌شود!');
}
</script>

<?php get_footer(); ?>
