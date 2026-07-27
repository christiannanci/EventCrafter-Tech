import React from 'react';
import { useLanguage } from '@/components/LanguageContext';

export default function About() {
  const { t } = useLanguage();

  return (
    <div className="bg-white min-h-screen font-['Inter']">
      {/* How It Works Section */}
      <div className="container mx-auto px-4 py-20 max-w-4xl">
        <h1 className="text-4xl font-bold text-stone-900 mb-6 text-center font-['Poppins']">{t('nav.howItWorks')}</h1>
        <p className="text-xl text-stone-500 text-center mb-16">{t('about.howItWorksSubtitle')}</p>
        
        <div className="space-y-20">
          <div className="flex flex-col md:flex-row items-center gap-10">
            <div className="flex-1">
              <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-4 text-xl font-bold">1</div>
              <h2 className="text-2xl font-bold text-stone-900 mb-4">{t('about.discover')}</h2>
              <p className="text-stone-600 leading-relaxed">
                {t('about.discoverDesc')}
              </p>
            </div>
            <div className="flex-1">
               <img src="https://images.unsplash.com/photo-1505932794465-147d1f1b2c97?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" className="rounded-2xl shadow-lg" alt="Search" />
            </div>
          </div>

          <div className="flex flex-col md:flex-row-reverse items-center gap-10">
            <div className="flex-1">
              <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-4 text-xl font-bold">2</div>
              <h2 className="text-2xl font-bold text-stone-900 mb-4">{t('about.connect')}</h2>
              <p className="text-stone-600 leading-relaxed">
                {t('about.connectDesc')}
              </p>
            </div>
            <div className="flex-1">
               <img src="https://images.unsplash.com/photo-1556761175-5973dc0f32e7?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" className="rounded-2xl shadow-lg" alt="Connect" />
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-10">
            <div className="flex-1">
              <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-4 text-xl font-bold">3</div>
              <h2 className="text-2xl font-bold text-stone-900 mb-4">{t('about.book')}</h2>
              <p className="text-stone-600 leading-relaxed">
                {t('about.bookDesc')}
              </p>
            </div>
            <div className="flex-1">
               <img src="https://images.unsplash.com/photo-1519741497674-611481863552?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" className="rounded-2xl shadow-lg" alt="Celebrate" />
            </div>
          </div>
        </div>
      </div>

      {/* Who We Are Section */}
      <section className="bg-stone-50 py-20">
        <div className="container mx-auto px-4 max-w-4xl text-center">
            <h2 className="text-3xl font-bold text-stone-900 mb-8 font-['Poppins']">{t('about.whoWeAre')}</h2>
            <p className="text-lg text-stone-600 mb-12 leading-relaxed max-w-2xl mx-auto">
                {t('about.whoWeAreDesc')}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 text-left">
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-stone-100">
                    <h3 className="text-xl font-bold text-rose-600 mb-4">{t('about.missionTitle')}</h3>
                    <p className="text-stone-600">
                        {t('about.missionDesc')}
                    </p>
                </div>
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-stone-100">
                    <h3 className="text-xl font-bold text-rose-600 mb-4">{t('about.teamTitle')}</h3>
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-stone-200 rounded-full overflow-hidden">
                             {/* Placeholder for Founder Image */}
                             <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80" alt="Founder" className="w-full h-full object-cover" />
                        </div>
                        <div>
                            <div className="font-bold text-stone-900">{t('about.founderName')}</div>
                            <div className="text-sm text-stone-500">{t('about.founderRole')}</div>
                        </div>
                    </div>
                    <p className="mt-4 text-stone-600 text-sm">
                        {t('about.founderBio')}
                    </p>
                </div>
            </div>
        </div>
      </section>
    </div>
  );
}