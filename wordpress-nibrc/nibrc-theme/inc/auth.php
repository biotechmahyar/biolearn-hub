<?php
/**
 * NIBRC Local Authentication — register, login, JWT, profile
 */

if (!defined('ABSPATH')) exit;

/* ───────── REST API: Register ───────── */
function nibrc_rest_register(WP_REST_Request $request) {
    $email    = sanitize_email($request->get_param('email'));
    $password = $request->get_param('password');
    $name     = sanitize_text_field($request->get_param('name') ?? '');

    if (empty($email) || empty($password)) {
        return new WP_REST_Response(['ok' => false, 'error' => 'ایمیل و رمز عبور الزامی است'], 400);
    }

    if (email_exists($email)) {
        return new WP_REST_Response(['ok' => false, 'error' => 'ایمیل قبلاً ثبت شده'], 409);
    }

    $user_id = wp_create_user($email, $password, $email);
    if (is_wp_error($user_id)) {
        return new WP_REST_Response(['ok' => false, 'error' => $user_id->get_error_message()], 500);
    }

    wp_update_user([
        'ID'           => $user_id,
        'display_name' => $name ?: $email,
        'role'         => 'subscriber',
    ]);

    // Generate JWT
    $token = nibrc_generate_jwt($user_id);

    return new WP_REST_Response([
        'ok'   => true,
        'data' => [
            'user'  => nibrc_user_json($user_id),
            'token' => $token,
        ],
    ], 201);
}

/* ───────── REST API: Login ───────── */
function nibrc_rest_login(WP_REST_Request $request) {
    $email    = sanitize_email($request->get_param('email'));
    $password = $request->get_param('password');

    if (empty($email) || empty($password)) {
        return new WP_REST_Response(['ok' => false, 'error' => 'ایمیل و رمز عبور الزامی است'], 400);
    }

    $user = wp_authenticate($email, $password);
    if (is_wp_error($user)) {
        return new WP_REST_Response(['ok' => false, 'error' => 'ایمیل یا رمز عبور اشتباه است'], 401);
    }

    $token = nibrc_generate_jwt($user->ID);

    return new WP_REST_Response([
        'ok'   => true,
        'data' => [
            'user'  => nibrc_user_json($user->ID),
            'token' => $token,
        ],
    ]);
}

/* ───────── REST API: Get Current User ───────── */
function nibrc_rest_me(WP_REST_Request $request) {
    $user_id = nibrc_get_user_from_jwt($request);
    if (!$user_id) {
        return new WP_REST_Response(['ok' => false, 'error' => 'Unauthorized'], 401);
    }
    return new WP_REST_Response([
        'ok'   => true,
        'data' => nibrc_user_json($user_id),
    ]);
}

/* ───────── REST API: Update Profile ───────── */
function nibrc_rest_update_profile(WP_REST_Request $request) {
    $user_id = nibrc_get_user_from_jwt($request);
    if (!$user_id) {
        return new WP_REST_Response(['ok' => false, 'error' => 'Unauthorized'], 401);
    }

    $updates = [];
    if ($name = $request->get_param('name')) {
        $updates['display_name'] = sanitize_text_field($name);
    }
    if ($phone = $request->get_param('phone')) {
        update_user_meta($user_id, 'phone', sanitize_text_field($phone));
    }
    if ($university = $request->get_param('university')) {
        update_user_meta($user_id, 'university', sanitize_text_field($university));
    }
    if ($field = $request->get_param('field')) {
        update_user_meta($user_id, 'field', sanitize_text_field($field));
    }

    if (!empty($updates)) {
        $updates['ID'] = $user_id;
        wp_update_user($updates);
    }

    return new WP_REST_Response([
        'ok'   => true,
        'data' => nibrc_user_json($user_id),
    ]);
}

/* ───────── JWT Helpers (Simple HMAC-based JWT) ───────── */
function nibrc_generate_jwt($user_id) {
    $secret = nibrc_get_jwt_secret();
    $header = nibrc_base64url(json_encode(['typ' => 'JWT', 'alg' => 'HS256']));
    $payload = nibrc_base64url(json_encode([
        'sub' => $user_id,
        'iat' => time(),
        'exp' => time() + (7 * DAY_IN_SECONDS), // 7 days
    ]));
    $signature = nibrc_base64url(hash_hmac('sha256', "{$header}.{$payload}", $secret, true));
    return "{$header}.{$payload}.{$signature}";
}

function nibrc_validate_jwt($token) {
    $secret = nibrc_get_jwt_secret();
    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;

    [$header, $payload, $signature] = $parts;
    $expected = nibrc_base64url(hash_hmac('sha256', "{$header}.{$payload}", $secret, true));

    if (!hash_equals($expected, $signature)) return null;

    $data = json_decode(base64_decode(strtr($payload, '-_', '+/')), true);
    if (!$data || empty($data['sub'])) return null;
    if (!empty($data['exp']) && $data['exp'] < time()) return null;

    return (int) $data['sub'];
}

function nibrc_get_jwt_secret() {
    $secret = get_option('nibrc_jwt_secret', '');
    if (empty($secret)) {
        $secret = wp_generate_password(64, false);
        update_option('nibrc_jwt_secret', $secret);
    }
    return $secret;
}

function nibrc_base64url($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

/* ───────── Extract User from JWT in Request ───────── */
function nibrc_get_user_from_jwt($request) {
    $auth = $request->get_header('Authorization');
    if (empty($auth) || !preg_match('/Bearer\s+(.+)/i', $auth, $m)) {
        return null;
    }
    return nibrc_validate_jwt($m[1]);
}

/* ───────── User JSON Helper ───────── */
function nibrc_user_json($user_id) {
    $user = get_userdata($user_id);
    if (!$user) return null;
    return [
        'id'        => $user->ID,
        'name'      => $user->display_name,
        'email'     => $user->user_email,
        'role'      => $user->roles[0] ?? 'subscriber',
        'avatar'    => get_avatar_url($user->ID, ['size' => 96]),
        'phone'     => get_user_meta($user_id, 'phone', true),
        'university'=> get_user_meta($user_id, 'university', true),
        'field'     => get_user_meta($user_id, 'field', true),
        'created_at'=> $user->user_registered,
    ];
}

/* ───────── Enqueue JWT auth AJAX ───────── */
function nibrc_auth_local_script() {
    wp_localize_script('nibrc-main-js', 'nibrcAuth', [
        'isLoggedIn' => is_user_logged_in(),
        'currentUser'=> nibrc_get_current_user_json(),
    ]);
}
add_action('wp_enqueue_scripts', 'nibrc_auth_local_script');
