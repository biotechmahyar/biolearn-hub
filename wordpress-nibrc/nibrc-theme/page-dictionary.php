<?php
/**
 * Template Name: Dictionary
 * دیکشنری تخصصی
 */
get_header(); ?>

<main class="nibrc-container" style="padding-top:40px;padding-bottom:60px;">
    <div style="text-align:center;margin-bottom:32px;">
        <h1 class="nibrc-section-title">📖 دیکشنری تخصصی علوم زیستی</h1>
        <p class="nibrc-section-subtitle">جستجوی اصطلاحات تخصصی میکروبیولوژی و بیوتکنولوژی</p>
    </div>
    
    <!-- Search Box -->
    <div class="nibrc-search-box">
        <input type="text" id="dict-search" class="nibrc-form-input" placeholder="جستجوی اصطلاح... (مثلاً: باکتری، آنزیم، DNA)" oninput="searchDictionary(this.value)" style="padding-right:16px;">
    </div>
    
    <!-- Results -->
    <div id="dict-results" style="max-width:800px;margin:0 auto;">
        <div class="nibrc-empty">
            <div class="nibrc-empty-icon">🔍</div>
            <p>عبارتی را جستجو کنید</p>
        </div>
    </div>
    
    <!-- All Terms -->
    <div id="dict-all" style="max-width:800px;margin:0 auto;">
        <?php
        $terms = get_posts([
            'post_type' => 'dictionary_term',
            'posts_per_page' => -1,
            'post_status' => 'publish',
            'orderby' => 'title',
            'order' => 'ASC',
        ]);
        
        if ($terms) :
        ?>
            <h2 style="font-size:1.2rem;font-weight:700;margin-bottom:16px;color:var(--nibrc-text-muted);">همه اصطلاحات (<?php echo count($terms); ?>)</h2>
            
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(350px,1fr));gap:16px;">
                <?php foreach ($terms as $term) :
                    $latin = get_post_meta($term->ID, '_nibrc_latin', true);
                    $category = get_post_meta($term->ID, '_nibrc_category', true);
                ?>
                    <div class="nibrc-card" style="cursor:pointer;" onclick="toggleTerm(this)">
                        <div class="nibrc-card-body" style="padding:16px;">
                            <div style="display:flex;justify-content:space-between;align-items:center;">
                                <div>
                                    <h3 style="font-weight:700;margin-bottom:2px;"><?php echo esc_html($term->post_title); ?></h3>
                                    <?php if ($latin) : ?>
                                        <div style="font-size:0.85rem;color:var(--nibrc-text-muted);font-style:italic;"><?php echo esc_html($latin); ?></div>
                                    <?php endif; ?>
                                </div>
                                <?php if ($category) : ?>
                                    <span class="nibrc-badge"><?php echo esc_html($category); ?></span>
                                <?php endif; ?>
                            </div>
                            <div class="term-detail" style="display:none;margin-top:12px;padding-top:12px;border-top:1px solid var(--nibrc-border);line-height:2;">
                                <?php echo apply_filters('the_content', $term->post_content); ?>
                                <?php
                                $habitat = get_post_meta($term->ID, '_nibrc_habitat', true);
                                $oxygen = get_post_meta($term->ID, '_nibrc_oxygen', true);
                                ?>
                                <?php if ($habitat) : ?>
                                    <p><strong>زیستگاه:</strong> <?php echo esc_html($habitat); ?></p>
                                <?php endif; ?>
                                <?php if ($oxygen) : ?>
                                    <p><strong>اکسیژن:</strong> <?php echo esc_html($oxygen); ?></p>
                                <?php endif; ?>
                            </div>
                        </div>
                    </div>
                <?php endforeach; ?>
            </div>
        <?php else : ?>
            <div class="nibrc-empty">
                <div class="nibrc-empty-icon">📖</div>
                <p>هنوز اصطلاحی اضافه نشده</p>
            </div>
        <?php endif; ?>
    </div>
</main>

<script>
var searchTimeout;

function searchDictionary(query) {
    clearTimeout(searchTimeout);
    
    if (!query || query.length < 2) {
        document.getElementById('dict-results').innerHTML = '';
        document.getElementById('dict-all').style.display = 'block';
        return;
    }
    
    document.getElementById('dict-all').style.display = 'none';
    
    searchTimeout = setTimeout(function() {
        fetch('<?php echo rest_url("nibrc/v1/dictionary?q="); ?>' + encodeURIComponent(query), {
            headers: {'X-WP-Nonce': '<?php echo wp_create_nonce("wp_rest"); ?>'}
        })
        .then(function(r) { return r.json(); })
        .then(function(res) {
            if (res.ok && res.data.length > 0) {
                var html = '<h2 style="font-size:1.2rem;font-weight:700;margin-bottom:16px;color:var(--nibrc-text-muted);">نتایج جستجو (' + res.data.length + ')</h2>';
                html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(350px,1fr));gap:16px;">';
                
                res.data.forEach(function(item) {
                    html += '<div class="nibrc-card">';
                    html += '<div class="nibrc-card-body" style="padding:16px;">';
                    html += '<h3 style="font-weight:700;">' + item.term + '</h3>';
                    if (item.latin) html += '<div style="font-size:0.85rem;color:var(--nibrc-text-muted);font-style:italic;">' + item.latin + '</div>';
                    if (item.definition) html += '<p style="margin-top:8px;line-height:1.8;font-size:0.9rem;">' + item.definition + '</p>';
                    html += '</div></div>';
                });
                
                html += '</div>';
                document.getElementById('dict-results').innerHTML = html;
            } else {
                document.getElementById('dict-results').innerHTML = '<div class="nibrc-empty"><div class="nibrc-empty-icon">🔍</div><p>نتیجه‌ای یافت نشد</p></div>';
            }
        })
        .catch(function() {
            document.getElementById('dict-results').innerHTML = '<div class="nibrc-empty"><p>خطا در جستجو</p></div>';
        });
    }, 300);
}

function toggleTerm(el) {
    var detail = el.querySelector('.term-detail');
    if (detail) {
        detail.style.display = detail.style.display === 'none' ? 'block' : 'none';
    }
}
</script>

<?php get_footer(); ?>
