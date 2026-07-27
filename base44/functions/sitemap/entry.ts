import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Fetch all services for sitemap
        const services = await base44.asServiceRole.entities.Service.list('-updated_date', 1000);
        
        const baseUrl = 'https://eventcrafter.cm';
        
        // Generate XML sitemap
        const urls = [
            { loc: baseUrl, priority: '1.0', changefreq: 'daily' },
            { loc: `${baseUrl}/Marketplace`, priority: '0.9', changefreq: 'daily' },
            { loc: `${baseUrl}/About`, priority: '0.8', changefreq: 'monthly' },
            { loc: `${baseUrl}/PostRequest`, priority: '0.8', changefreq: 'weekly' },
            { loc: `${baseUrl}/Inspiration`, priority: '0.7', changefreq: 'weekly' },
            { loc: `${baseUrl}/Tools`, priority: '0.7', changefreq: 'weekly' },
            { loc: `${baseUrl}/Pricing`, priority: '0.7', changefreq: 'monthly' },
            { loc: `${baseUrl}/FAQ`, priority: '0.6', changefreq: 'monthly' },
            { loc: `${baseUrl}/Support`, priority: '0.6', changefreq: 'monthly' },
        ];
        
        // Add all services
        services.forEach(service => {
            if (service.slug) {
                urls.push({
                    loc: `${baseUrl}/ServiceDetails?slug=${service.slug}`,
                    priority: '0.8',
                    changefreq: 'weekly',
                    lastmod: service.updated_date || service.created_date
                });
            }
        });
        
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url>
    <loc>${url.loc}</loc>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
    ${url.lastmod ? `<lastmod>${new Date(url.lastmod).toISOString()}</lastmod>` : ''}
  </url>`).join('\n')}
</urlset>`;
        
        return new Response(xml, {
            status: 200,
            headers: {
                'Content-Type': 'application/xml',
                'Cache-Control': 'public, max-age=3600'
            }
        });
    } catch (error) {
        console.error('Sitemap error:', error);
        return new Response('Error generating sitemap', { status: 500 });
    }
});