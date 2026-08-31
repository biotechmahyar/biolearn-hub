<?php
/**
 * Authentication System for NIBRC Iran
 * سیستم احراز هویت محلی
 */

if (!defined('ABSPATH')) exit;

/**
 * Simple JWT implementation (no external library needed)
 */
class Nibrc_JWT {
    
    private static $secret = '';
    
    private static function get_secret() {
        if (empty(self::$secret)) {
            self::$secret = defined('NIBRC_JWT_SECRET') ? NIBRC_JWT_SECRET : get_option('nibrc_jwt_secret', '');
            if (empty(self::$secret)) {
                self::$secret = wp_generate_password(64, false);
                update_option('nibrc_jwt_secret', self::$secret);
            }
        }
        return self::$secret;
    }
    
    public static function encode($payload) {
        $header = self::base64url_encode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
        $payload['iat'] = time();
        $payload['exp'] = time() + (7 * DAY_IN_SECONDS); // 7 days
        $payload_encoded = self::base64url_encode(json_encode($payload));
        $signature = self::base64url_encode(
            hash_hmac('sha256', "$header.$payload_encoded", self::get_secret(), true)
        );
        return "$header.$payload_encoded.$signature";
    }
    
    public static function decode($token) {
        $parts = explode('.', $token);
        if (count($parts) !== 3) return false;
        
        [$header, $payload, $signature] = $parts;
        
        $expected = self::base64url_encode(
            hash_hmac('sha256', "$header.$payload", self::get_secret(), true)
        );
        
        if (!hash_equals($expected, $signature)) return false;
        
        $data = json_decode(self::base64url_decode($payload), true);
        
        if (!$data || !isset($data['exp']) || $data['exp'] < time()) return false;
        
        return $data;
    }
    
    private static function base64url_encode($data) {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }
    
    private static function base64url_decode($data) {
        return base64_decode(strtr($data, '-_', '+/') . str_repeat('=', 3 - (3 + strlen($data)) % 4));
    }
}

/**
 * Create JWT for user
 */
function nibrc_create_token($user_id) {
    $user = get_userdata($user_id);
    if (!$user) return null;
    
    return Nibrc_JWT::encode([
        'user_id' => $user_id,
        'email'   => $user->user_email,
        'name'    => $user->display_name,
        'role'    => $user->roles[0] ?? 'subscriber',
    ]);
}

/**
 * Verify JWT token
 */
function nibrc_verify_token($token) {
    return Nibrc_JWT::decode($token);
}

/**
 * Get current user from JWT
 */
function nibrc_get_user_from_token($token) {
    $data = nibrc_verify_token($token);
    if (!$data || !isset($data['user_id'])) return null;
    
    return get_userdata($data['user_id']);
}

/**
 * REST API: Login with email/password, return JWT
 */
function nibrc_api_login($request) {
    $email = sanitize_email($request->get_param('email'));
    $password = $request->get_param('password');
    
    if (!$email || !$password) {
        return new WP_REST_Response([
            'ok'    => false,
            'error' => 'ایمیل و رمز عبور الزامی است',
        ], 400);
    }
    
    $user = wp_authenticate($email, $password);
    
    if (is_wp_error($user)) {
        return new WP_REST_Response([
            'ok'    => false,
            'error' => 'ایمیل یا رمز عبور اشتباه است',
        ], 401);
    }
    
    $token = nibrc_create_token($user->ID);
    
    return new WP_REST_Response([
        'ok'   => true,
        'data' => [
            'token' => $token,
            'user'  => [
                'id'    => $user->ID,
                'name'  => $user->display_name,
                'email' => $user->user_email,
                'role'  => $user->roles[0] ?? 'subscriber',
            ],
        ],
    ], 200);
}

/**
 * AJAX: Handle login from frontend
 */
function nibrc_ajax_login() {
    check_ajax_referer('nibrc_nonce');
    
    $email = sanitize_email($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';
    
    $user = wp_authenticate($email, $password);
    
    if (is_wp_error($user)) {
        wp_send_json_error(['message' => 'ایمیل یا رمز عبور اشتباه است']);
    }
    
    wp_set_current_user($user->ID);
    wp_set_auth_cookie($user->ID, true);
    
    $token = nibrc_create_token($user->ID);
    
    wp_send_json_success([
        'token' => $token,
        'user'  => [
            'id'    => $user->ID,
            'name'  => $user->display_name,
            'email' => $user->user_email,
            'role'  => $user->roles[0] ?? 'subscriber',
        ],
    ]);
}
add_action('wp_ajax_nibrc_login', 'nibrc_ajax_login');
add_action('wp_ajax_nopriv_nibrc_login', 'nibrc_ajax_login');

/**
 * AJAX: Handle registration
 */
function nibrc_ajax_register() {
    check_ajax_referer('nibrc_nonce');
    
    $email = sanitize_email($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';
    $name = sanitize_text_field($_POST['name'] ?? '');
    
    if (!$email || !$password || !$name) {
        wp_send_json_error(['message' => 'فیلدهای الزامی پر نشده']);
    }
    
    if (email_exists($email)) {
        wp_send_json_error(['message' => 'این ایمیل قبلاً ثبت‌نام شده']);
    }
    
    $user_id = wp_create_user($email, $password, $email);
    
    if (is_wp_error($user_id)) {
        wp_send_json_error(['message' => $user_id->get_error_message()]);
    }
    
    wp_update_user([
        'ID'           => $user_id,
        'display_name' => $name,
        'role'         => 'subscriber',
    ]);
    
    update_user_meta($user_id, 'registered_source', 'iran_site');
    
    // Auto login
    wp_set_current_user($user_id);
    wp_set_auth_cookie($user_id, true);
    
    $token = nibrc_create_token($user_id);
    
    wp_send_json_success([
        'token' => $token,
        'user'  => [
            'id'    => $user_id,
            'name'  => $name,
            'email' => $email,
            'role'  => 'subscriber',
        ],
    ]);
}
add_action('wp_ajax_nibrc_register', 'nibrc_ajax_register');
add_action('wp_ajax_nopriv_nibrc_register', 'nibrc_ajax_register');

/**
 * AJAX: Logout
 */
function nibrc_ajax_logout() {
    check_ajax_referer('nibrc_nonce');
    
    wp_logout();
    wp_send_json_success(['message' => 'با موفقیت خارج شدید']);
}
add_action('wp_ajax_nibrc_logout', 'nibrc_ajax_logout');

/**
 * AJAX: Get current user
 */
function nibrc_ajax_me() {
    check_ajax_referer('nibrc_nonce');
    
    if (!is_user_logged_in()) {
        wp_send_json_error(['message' => 'ورود نکرده‌اید']);
    }
    
    $user = wp_get_current_user();
    
    wp_send_json_success([
        'id'    => $user->ID,
        'name'  => $user->display_name,
        'email' => $user->user_email,
        'role'  => $user->roles[0] ?? 'subscriber',
    ]);
}
add_action('wp_ajax_nibrc_me', 'nibrc_ajax_me');
add_action('wp_ajax_nopriv_nibrc_me', 'nibrc_ajax_me');

/**
 * Check if user is admin/instructor
 */
function nibrc_is_admin($user_id = null) {
    $user_id = $user_id ?: get_current_user_id();
    $user = get_userdata($user_id);
    return $user && in_array('administrator', (array) $user->roles);
}

function nibrc_is_instructor($user_id = null) {
    $user_id = $user_id ?: get_current_user_id();
    $user = get_userdata($user_id);
    return $user && in_array('instructor', (array) $user->roles);
}
