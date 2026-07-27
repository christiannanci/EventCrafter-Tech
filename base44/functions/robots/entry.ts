Deno.serve(async (req) => {
    const baseUrl = 'https://eventcrafter.cm';
    
    const robotsTxt = `# EventCrafter - Robots.txt
User-agent: *
Allow: /
Disallow: /AdminDashboard
Disallow: /ClientDashboard
Disallow: /VendorDashboard
Disallow: /VendorProfile
Disallow: /Chat
Disallow: /api/
Disallow: /*?*sessionId=*

# Sitemap
Sitemap: ${baseUrl}/api/sitemap

# Crawl-delay pour être gentil avec le serveur
Crawl-delay: 1

# Googlebot spécifique
User-agent: Googlebot
Allow: /
Disallow: /AdminDashboard
Disallow: /ClientDashboard
Disallow: /VendorDashboard

# Bingbot
User-agent: Bingbot
Allow: /
Disallow: /AdminDashboard
Disallow: /ClientDashboard
Disallow: /VendorDashboard
`;

    return new Response(robotsTxt, {
        status: 200,
        headers: {
            'Content-Type': 'text/plain',
            'Cache-Control': 'public, max-age=86400'
        }
    });
});