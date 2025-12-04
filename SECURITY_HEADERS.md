# Security headers configuration for various hosting platforms

## For Vercel (vercel.json)
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=()"
        },
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' unpkg.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none';"
        }
      ]
    }
  ]
}
```

## For Netlify (_headers)
```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  X-XSS-Protection: 1; mode=block
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' unpkg.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none';
  
# Cache static assets
/assets/*
  Cache-Control: public, max-age=31536000, immutable

# Cache images
/images/*
  Cache-Control: public, max-age=31536000, immutable
```

## For Apache (.htaccess)
```apache
# Security Headers
<IfModule mod_headers.c>
  Header set X-Content-Type-Options "nosniff"
  Header set X-Frame-Options "DENY"
  Header set X-XSS-Protection "1; mode=block"
  Header set Referrer-Policy "strict-origin-when-cross-origin"
  Header set Permissions-Policy "camera=(), microphone=(), geolocation=()"
  Header set Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' unpkg.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none';"
</IfModule>

# Enable Compression
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
</IfModule>

# Browser Caching
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/jpg "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/webp "access plus 1 year"
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
  ExpiresByType application/wasm "access plus 1 year"
</IfModule>

# Prevent DDoS attacks - Rate Limiting (requires mod_evasive or mod_qos)
# Note: This is basic protection. For serious DDoS, use Cloudflare or similar CDN
```

## For Nginx (nginx.conf)
```nginx
# Security headers
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' unpkg.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none';" always;

# Rate limiting - Basic DDoS protection
limit_req_zone $binary_remote_addr zone=general:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=api:10m rate=5r/s;

location / {
    limit_req zone=general burst=20 nodelay;
}

# Cache static assets
location ~* \.(js|css|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# Gzip compression
gzip on;
gzip_vary on;
gzip_min_length 1000;
gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml+rss;
```

## Using Cloudflare (Recommended for DDoS Protection)
1. Add your domain to Cloudflare
2. Enable:
   - DDoS Protection (automatic)
   - Rate Limiting Rules
   - Bot Fight Mode
   - Cache Everything
   - Auto Minify (JS, CSS, HTML)
   - Brotli compression
   - HTTP/3 (QUIC)
3. Set Security Level to "Medium" or "High"
4. Enable "Under Attack Mode" if experiencing DDoS
