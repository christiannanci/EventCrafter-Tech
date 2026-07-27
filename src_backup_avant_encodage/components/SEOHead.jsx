import { useEffect } from 'react';

export default function SEOHead({ 
  title = "EventCrafter - Organisation d'Événements au Cameroun",
  description = "Plateforme N°1 d'organisation d'événements au Cameroun. Trouvez les meilleurs prestataires à Douala, Yaoundé, Bafoussam pour mariages, anniversaires, événements corporate.",
  keywords = "organisation événement Cameroun, prestataire mariage Douala, traiteur Yaoundé, photographe Bafoussam, DJ Cameroun, décorateur événement, planificateur mariage",
  ogImage = "/og-image.jpg",
  url = "https://eventcrafter.cm",
  type = "website"
}) {
  useEffect(() => {
    // Update title
    document.title = title;
    
    // Update or create meta tags
    const updateMeta = (name, content, isProperty = false) => {
      const attribute = isProperty ? 'property' : 'name';
      let element = document.querySelector(`meta[${attribute}="${name}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, name);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // Update or create link tags
    const updateLink = (rel, href) => {
      let element = document.querySelector(`link[rel="${rel}"]`);
      if (!element) {
        element = document.createElement('link');
        element.setAttribute('rel', rel);
        document.head.appendChild(element);
      }
      element.setAttribute('href', href);
    };

    // Standard meta tags
    updateMeta('description', description);
    updateMeta('keywords', keywords);
    updateMeta('robots', 'index, follow');
    updateMeta('googlebot', 'index, follow');
    
    // Canonical URL
    updateLink('canonical', url);
    
    // Hreflang for multi-language
    updateLink('alternate', `${url}?lang=fr`);
    
    // Open Graph
    updateMeta('og:title', title, true);
    updateMeta('og:description', description, true);
    updateMeta('og:image', ogImage, true);
    updateMeta('og:url', url, true);
    updateMeta('og:type', type, true);
    updateMeta('og:locale', 'fr_CM', true);
    updateMeta('og:locale:alternate', 'en_CM', true);
    
    // Twitter Card
    updateMeta('twitter:card', 'summary_large_image');
    updateMeta('twitter:title', title);
    updateMeta('twitter:description', description);
    updateMeta('twitter:image', ogImage);
    
    // Geo tags for local SEO
    updateMeta('geo.region', 'CM');
    updateMeta('geo.placename', 'Cameroun');
    updateMeta('geo.position', '3.848;11.502');
    updateMeta('ICBM', '3.848, 11.502');
    
    // Mobile optimization
    updateMeta('format-detection', 'telephone=yes');
    updateMeta('apple-mobile-web-app-capable', 'yes');
  }, [title, description, keywords, ogImage, url, type]);

  return null;
}

// Structured Data Generator for Services
export function generateServiceSchema(service, vendor) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": service.title,
    "description": service.description,
    "provider": {
      "@type": "LocalBusiness",
      "name": vendor?.business_name || "EventCrafter Vendor",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": service.city || "Douala",
        "addressRegion": service.region || "Littoral",
        "addressCountry": "CM"
      },
      "geo": service.gps_latitude && service.gps_longitude ? {
        "@type": "GeoCoordinates",
        "latitude": service.gps_latitude,
        "longitude": service.gps_longitude
      } : undefined,
      "telephone": vendor?.phone
    },
    "areaServed": {
      "@type": "Country",
      "name": "Cameroun"
    },
    "priceRange": service.price_min ? `À partir de ${service.price_min} FCFA` : undefined,
    "image": service.image_url,
    "category": service.category
  };
}

// Structured Data for Organization
export function generateOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "EventCrafter",
    "url": "https://eventcrafter.cm",
    "logo": "https://eventcrafter.cm/logo.png",
    "description": "Plateforme de mise en relation pour l'organisation d'événements au Cameroun",
    "address": {
      "@type": "PostalAddress",
      "addressCountry": "CM",
      "addressRegion": "Littoral"
    },
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": "+237-670-93-43-78",
      "contactType": "customer service",
      "areaServed": "CM",
      "availableLanguage": ["French", "English"]
    },
    "sameAs": [
      "https://facebook.com/eventcrafter",
      "https://instagram.com/eventcrafter"
    ]
  };
}

export function StructuredData({ data }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}