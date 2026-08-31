/**
 * NIBRC Iran - Main JavaScript
 * آفلاین/آنلاین، احراز هویت، سینک
 */

(function() {
    'use strict';
    
    // === Connection Monitor ===
    var statusChecked = false;
    
    function checkConnection() {
        var bar = document.getElementById('nibrc-status-bar');
        var icon = document.getElementById('status-icon');
        var text = document.getElementById('status-text');
        
        if (!bar) return;
        
        if (navigator.onLine) {
            bar.className = 'nibrc-status-bar nibrc-status-online';
            if (icon) icon.textContent = '🟢';
            if (text) text.textContent = 'اتصال برقرار — سایت آنلاین';
        } else {
            bar.className = 'nibrc-status-bar nibrc-status-offline';
            if (icon) icon.textContent = '🟡';
            if (text) text.textContent = 'اتصال قطع — حالت آفلاین — اطلاعات محلی نمایش داده می‌شود';
        }
    }
    
    window.addEventListener('online', function() {
        checkConnection();
        // Try to push offline changes
        pushOfflineChanges();
    });
    
    window.addEventListener('offline', checkConnection);
    checkConnection();
    
    // === Auth Check ===
    function isLoggedIn() {
        return localStorage.getItem('nibrc_token') !== null;
    }
    
    function getUser() {
        try {
            return JSON.parse(localStorage.getItem('nibrc_user'));
        } catch(e) {
            return null;
        }
    }
    
    function setAuth(token, user) {
        localStorage.setItem('nibrc_token', token);
        localStorage.setItem('nibrc_user', JSON.stringify(user));
    }
    
    function clearAuth() {
        localStorage.removeItem('nibrc_token');
        localStorage.removeItem('nibrc_user');
    }
    
    // Expose globally
    window.nibrcAuth = {
        isLoggedIn: isLoggedIn,
        getUser: getUser,
        setAuth: setAuth,
        clearAuth: clearAuth
    };
    
    // === Offline Queue ===
    function getOfflineQueue() {
        try {
            return JSON.parse(localStorage.getItem('nibrc_offline_queue') || '[]');
        } catch(e) {
            return [];
        }
    }
    
    function addToOfflineQueue(action) {
        var queue = getOfflineQueue();
        queue.push({
            action: action.type,
            data: action.data,
            timestamp: new Date().toISOString()
        });
        localStorage.setItem('nibrc_offline_queue', JSON.stringify(queue));
    }
    
    function pushOfflineChanges() {
        var queue = getOfflineQueue();
        if (queue.length === 0) return;
        
        // Try to sync each item
        var newQueue = [];
        var nonce = window.nibrcData ? window.nibrcData.nonce : '';
        
        queue.forEach(function(item) {
            var url = window.nibrcData ? window.nibrcData.ajaxUrl : '/wp-admin/admin-ajax.php';
            
            fetch(url, {
                method: 'POST',
                headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                body: 'action=nibrc_sync_offline&_ajax_nonce=' + nonce + '&data=' + encodeURIComponent(JSON.stringify(item))
            }).then(function(r) { return r.json(); }).then(function(res) {
                if (!res.success) {
                    newQueue.push(item); // Keep failed items
                }
            }).catch(function() {
                newQueue.push(item); // Keep on network error
            });
        });
        
        localStorage.setItem('nibrc_offline_queue', JSON.stringify(newQueue));
    }
    
    window.nibrcOffline = {
        add: addToOfflineQueue,
        push: pushOfflineChanges,
        queue: getOfflineQueue
    };
    
    // === Expose logout globally ===
    window.nibrcLogout = function() {
        if (confirm('آیا می‌خواهید خارج شوید؟')) {
            clearAuth();
            // Also clear WP cookies
            var url = window.nibrcData ? window.nibrcData.ajaxUrl : '/wp-admin/admin-ajax.php';
            var nonce = window.nibrcData ? window.nibrcData.nonce : '';
            fetch(url, {
                method: 'POST',
                headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                body: 'action=nibrc_logout&_ajax_nonce=' + nonce
            }).then(function() {
                window.location.href = window.nibrcData ? window.nibrcData.siteUrl : '/';
            });
        }
    };
    
    // === Auto-sync on page load ===
    if (navigator.onLine && window.nibrcData && window.nibrcData.syncKey) {
        // Only try sync if we have a sync key
        setTimeout(function() {
            pushOfflineChanges();
        }, 5000);
    }
    
})();
