import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { createPageUrl } from './utils';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CalendarHeart, 
  Search, 
  Menu, 
  X,
  LayoutDashboard,
  Globe,
  Shield,
  MessageSquare
} from "lucide-react";
import { base44 } from "@/api/apiClient";
import { LanguageProvider, useLanguage } from '@/components/LanguageContext';
import { LocationProvider, useLocationContext } from '@/components/LocationContext';
import { CurrencyProvider } from '@/components/CurrencyContext';
import { UserProvider } from '@/components/UserContext';
import QueryProvider from '@/components/QueryProvider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import NotificationBell from '@/components/NotificationBell';
import CartIconNav from '@/components/CartIconNav';
import CurrencySelector from '@/components/CurrencySelector';
import ScrollToTop from '@/components/ScrollToTop';
import PlatformRatingButton from '@/components/PlatformRatingButton';
import PlatformRatingDialog from '@/components/PlatformRatingDialog';
import ErrorBoundary from '@/components/ErrorBoundary';
import MobileBottomNav from '@/components/MobileBottomNav';
import FloatingAIAssistant from '@/components/FloatingAIAssistant';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

function LayoutContent({ children }) {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [ratingDialogOpen, setRatingDialogOpen] = React.useState(false);
  const [user, setUser] = React.useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const isRootPage = location.pathname === '/';
  const [hasVendorProfile, setHasVendorProfile] = React.useState(false);
  const [hasClientProfile, setHasClientProfile] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const { t, language, setLanguage } = useLanguage();
  const { selectedCountry, setSelectedCountry, countries } = useLocationContext();

  React.useEffect(() => {
    let mounted = true;
    
    const checkUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        
        if (!mounted) return;
        
        setUser(currentUser);

        const [vendorProfiles, clientProfiles] = await Promise.all([
          base44.entities.VendorProfile.filter({ user_id: currentUser.id }),
          base44.entities.ClientProfile.filter({ user_id: currentUser.id })
        ]);
        
        if (!mounted) return;
        
        setHasVendorProfile(vendorProfiles.length > 0);
        setHasClientProfile(clientProfiles.length > 0);

        // Bloque la connexion si le compte vendeur a ete suspendu par l'admin
        if (vendorProfiles.length > 0 && vendorProfiles[0].account_suspended === true) {
          await base44.auth.logout();
          alert("Votre compte a ete suspendu par l'administration. Contactez le support pour plus d'informations.");
          window.location.href = '/';
          return;
        }

        import('@/components/RealtimeNotificationSystem').then(({ realtimeNotifications }) => {
          if (mounted) realtimeNotifications.initialize(currentUser.id, currentUser.role);
        }).catch(() => {});
      } catch (e) {
        if (!mounted) return;
        setUser(null);
        setHasVendorProfile(false);
        setHasClientProfile(false);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };
    checkUser();

    return () => {
      mounted = false;
    };
  }, []);

  const handleLogout = async () => {
    await base44.auth.logout();
    window.location.href = '/';
  };

  const navLinks = React.useMemo(() => [
    { name: t("nav.marketplace"), path: "/Marketplace", icon: Search },
    { name: t("nav.inspiration"), path: "/Inspiration", icon: null },
    { name: t("nav.tools"), path: "/Tools", icon: null },
    { name: t("nav.postRequest"), path: "/PostRequest", icon: null },
  ], [t]);

  const languages = [
    { code: 'en', label: 'English' },
    { code: 'fr', label: 'Francais' },
  ];

  return (
    <div className="min-h-screen bg-[#F9F7F3] font-['Inter'] text-[#2C2C2C] flex flex-col">
      <Toaster />
      <SonnerToaster />
      <ScrollToTop />
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-[#F4C542]/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group">
              <span className="text-2xl font-['Poppins'] font-bold tracking-tight text-[#2C2C2C]">
                Event<span className="text-[#FF6B35] relative">
                  Crafter
                  <span className="absolute -top-1 -right-2 text-[#F4C542] text-xs">*</span>
                </span>
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link 
                  key={link.path}
                  to={createPageUrl(link.path.replace('/', ''))}
                  className={`text-sm font-medium transition-colors hover:text-[#FF6B35] ${
                    location.pathname === link.path ? 'text-[#FF6B35]' : 'text-[#2C2C2C]'
                  }`}
                >
                  {link.name}
                </Link>
                ))}

              {user ? (
                <div className="flex items-center gap-3">
                  <PlatformRatingButton user={user} />
                  <CurrencySelector />
                  <CartIconNav />
                  <NotificationBell user={user} />

                  {(user.role === 'admin' || (user.staff_role && user.staff_role !== 'none')) && (
                      <Link to={createPageUrl('AdminDashboard')}>
                          <Button variant="ghost" className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-100">
                              <Shield className="w-4 h-4 mr-2" />
                              {t('layout.backOffice')}
                          </Button>
                      </Link>
                  )}

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="text-sm text-stone-600 font-medium px-3 py-1.5 bg-stone-100 rounded-full hover:bg-stone-200">
                        <span className="mr-2">{user.full_name || user.email}</span>
                        {hasVendorProfile && hasClientProfile && (
                          <>
                            <Badge className="bg-purple-500 text-white text-[10px] px-1.5 py-0 mr-1">{t('layout.vendorBadge')}</Badge>
                            <Badge className="bg-blue-500 text-white text-[10px] px-1.5 py-0">{t('layout.clientBadge')}</Badge>
                          </>
                        )}
                        {hasVendorProfile && !hasClientProfile && (
                          <Badge className="bg-purple-500 text-white text-[10px] px-1.5 py-0">{t('layout.vendorBadge')}</Badge>
                        )}
                        {!hasVendorProfile && hasClientProfile && (
                          <Badge className="bg-blue-500 text-white text-[10px] px-1.5 py-0">{t('layout.clientBadge')}</Badge>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      {hasVendorProfile && (
                        <DropdownMenuItem asChild>
                          <Link to={createPageUrl('VendorDashboard')} className="cursor-pointer">
                            <LayoutDashboard className="w-4 h-4 mr-2" />
                            {t('layout.vendorDashboard')}
                          </Link>
                        </DropdownMenuItem>
                      )}
                      {hasVendorProfile && (
                        <DropdownMenuItem asChild>
                          <Link to={createPageUrl('VendorProfile')} className="cursor-pointer">
                            <LayoutDashboard className="w-4 h-4 mr-2" />
                            {t('layout.myProfile')}
                          </Link>
                        </DropdownMenuItem>
                      )}
                      {hasClientProfile && (
                        <DropdownMenuItem asChild>
                          <Link to={createPageUrl('ClientDashboard')} className="cursor-pointer">
                            <LayoutDashboard className="w-4 h-4 mr-2" />
                            {t('layout.clientDashboard')}
                          </Link>
                        </DropdownMenuItem>
                      )}
                      {hasClientProfile && (
                        <DropdownMenuItem asChild>
                          <Link to={createPageUrl('ClientDashboard') + '?tab=client_profile'} className="cursor-pointer">
                            <LayoutDashboard className="w-4 h-4 mr-2" />
                            {t('layout.myProfile')}
                          </Link>
                        </DropdownMenuItem>
                      )}
                      {(hasVendorProfile || hasClientProfile) && <div className="border-t my-1" />}

                      {countries.length > 0 && (
                        <div className="px-2 py-2">
                          <p className="text-xs text-stone-500 mb-2">{t('layout.country')}</p>
                          <Select value={selectedCountry || ''} onValueChange={setSelectedCountry}>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder={t('layout.selectCountry')} />
                            </SelectTrigger>
                            <SelectContent>
                              {countries.map((c) => (
                                <SelectItem key={c.code} value={c.code}>
                                  {c.name} ({c.code})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div className="px-2 py-2 border-t">
                        <p className="text-xs text-stone-500 mb-2">{t('layout.language')}</p>
                        {languages.map((lang) => (
                          <DropdownMenuItem 
                            key={lang.code} 
                            onClick={() => setLanguage(lang.code)}
                            className={language === lang.code ? "bg-[#FFF0E8] text-[#FF6B35] font-medium" : ""}
                          >
                            <Globe className="w-4 h-4 mr-2" />
                            {lang.label}
                          </DropdownMenuItem>
                        ))}
                      </div>

                      <DropdownMenuItem onClick={handleLogout} className="border-t text-red-600 focus:text-red-600">
                        {t("nav.logout")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <CurrencySelector />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-stone-600">
                        <Globe className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {languages.map((lang) => (
                        <DropdownMenuItem
                          key={lang.code}
                          onClick={() => setLanguage(lang.code)}
                          className={language === lang.code ? "bg-[#FFF0E8] text-[#FF6B35] font-medium" : ""}
                        >
                          <Globe className="w-4 h-4 mr-2" />
                          {lang.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <CartIconNav />
                  <Button variant="ghost" onClick={() => window.location.href = "/Login"} className="text-[#2C2C2C] hover:text-[#FF6B35]">
                    {t("nav.signIn")}
                  </Button>
                  <Button onClick={() => window.location.href = "/Login"} className="bg-[#FF6B35] hover:bg-[#e05a2b] text-white rounded-full px-6 font-medium shadow-md hover:shadow-lg transition-all">
                    {t("nav.joinPlanner")}
                  </Button>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center gap-4">
               {/* Language Switcher Mobile */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-stone-600">
                    <Globe className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {languages.map((lang) => (
                    <DropdownMenuItem 
                      key={lang.code} 
                      onClick={() => setLanguage(lang.code)}
                      className={language === lang.code ? "bg-rose-50 text-rose-600 font-medium" : ""}
                    >
                      {lang.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label={isMenuOpen ? t('layout.closeMenu') : t('layout.openMenu')}
                aria-expanded={isMenuOpen}
                className="text-stone-600 hover:text-rose-600 focus:outline-none min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
            {isMenuOpen && (
              <div className="md:hidden bg-white border-b border-[#F4C542]/20 animate-in slide-in-from-top-5">
                <div className="px-4 pt-2 pb-6 space-y-2">
                  {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={createPageUrl(link.path.replace('/', ''))}
                  className="block px-3 py-3 text-base font-medium text-[#2C2C2C] hover:text-[#FF6B35] hover:bg-[#FFF0E8] rounded-md"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.name}
                </Link>
              ))}
               {user ? (
                <>
                  <div className="px-3 py-3 flex items-center justify-between">
                    <span className="text-sm font-medium text-stone-500">Notifications</span>
                    <NotificationBell user={user} />
                  </div>
                  {(user.role === 'admin' || (user.staff_role && user.staff_role !== 'none')) && (
                    <Link
                      to={createPageUrl('AdminDashboard')}
                      className="flex items-center gap-2 px-3 py-3 text-base font-medium text-rose-600 hover:bg-rose-50 rounded-md"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Shield className="w-4 h-4" />
                      {t('layout.backOffice')}
                    </Link>
                  )}
                  {hasVendorProfile && (
                    <Link 
                      to={createPageUrl('VendorDashboard')}
                      className="flex items-center gap-2 px-3 py-3 text-base font-medium text-[#2C2C2C] hover:text-[#FF6B35] hover:bg-[#FFF0E8] rounded-md"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      {t('layout.vendorDashboard')}
                    </Link>
                  )}
                  {hasVendorProfile && (
                    <Link 
                      to={createPageUrl('VendorProfile')}
                      className="flex items-center gap-2 px-3 py-3 text-base font-medium text-[#2C2C2C] hover:text-[#FF6B35] hover:bg-[#FFF0E8] rounded-md"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      {t('layout.myProfile')}
                    </Link>
                  )}
                  {hasClientProfile && (
                    <Link 
                      to={createPageUrl('ClientDashboard')}
                      className="flex items-center gap-2 px-3 py-3 text-base font-medium text-[#2C2C2C] hover:text-[#FF6B35] hover:bg-[#FFF0E8] rounded-md"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      {t('layout.clientDashboard')}
                    </Link>
                  )}
                  {hasClientProfile && (
                    <Link 
                      to={createPageUrl('ClientDashboard') + '?tab=client_profile'}
                      className="flex items-center gap-2 px-3 py-3 text-base font-medium text-[#2C2C2C] hover:text-[#FF6B35] hover:bg-[#FFF0E8] rounded-md"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      {t('layout.myProfile')}
                    </Link>
                  )}
                  <button
                    onClick={() => { setIsMenuOpen(false); setRatingDialogOpen(true); }}
                    className="flex items-center gap-2 w-full text-left px-3 py-3 text-base font-medium text-[#2C2C2C] hover:text-[#FF6B35] hover:bg-[#FFF0E8] rounded-md"
                  >
                    <MessageSquare className="w-4 h-4" />
                    {t('rating.dialogTitle')}
                  </button>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-3 py-3 text-base font-medium text-[#2C2C2C] hover:text-[#FF6B35] hover:bg-[#FFF0E8] rounded-md"
                  >
                    {t("nav.logout")}
                  </button>
                </>
               ) : (
                <div className="pt-4 flex flex-col gap-3">
                  <Button onClick={() => window.location.href = "/Login"} variant="outline" className="w-full justify-center">
                     {t("nav.signIn")}
                  </Button>
                  <Button onClick={() => window.location.href = "/Login"} className="w-full justify-center bg-[#FF6B35] hover:bg-[#e05a2b] text-white">
                     {t("nav.joinPlanner")}
                  </Button>
                </div>
               )}
            </div>
          </div>
        )}
      {user && <PlatformRatingDialog open={ratingDialogOpen} onOpenChange={setRatingDialogOpen} user={user} />}
      </nav>

      {/* Main Content */}
      <main className="flex-grow pb-16 md:pb-0">
        {/* Back button for non-root pages */}
        {!isRootPage && (
          <div className="bg-white border-b border-stone-100 px-4 py-2 md:hidden">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 text-sm text-stone-600 hover:text-[#FF6B35] transition-colors select-none"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
              {t('layout.back')}
            </button>
          </div>
        )}
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -18 }}
            transition={{ duration: 0.18, ease: 'easeInOut' }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav user={user} hasVendorProfile={hasVendorProfile} hasClientProfile={hasClientProfile} />

      {/* Assistant IA flottant */}
      <FloatingAIAssistant />

      {/* Footer */}
      <footer className="bg-white border-t border-stone-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl font-['Poppins'] font-bold tracking-tight text-[#2C2C2C]">
                  Event<span className="text-[#FF6B35]">Crafter</span>
                </span>
              </div>
              <p className="text-stone-500 max-w-sm">
                {t('layout.tagline')}
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-[#2C2C2C] mb-4">{t('layout.platformHeading')}</h3>
              <ul className="space-y-2 text-stone-500">
                <li><Link to={createPageUrl("Marketplace")} className="hover:text-[#FF6B35]">{t("nav.marketplace")}</Link></li>
                <li><Link to={createPageUrl("About")} className="hover:text-[#FF6B35]">{t("nav.howItWorks")}</Link></li>
                <li><Link to={createPageUrl("FAQ")} className="hover:text-[#FF6B35]">FAQ</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-[#2C2C2C] mb-4">{t('layout.supportHeading')}</h3>
              <ul className="space-y-2 text-stone-500">
                <li><Link to={createPageUrl("Support")} className="hover:text-[#FF6B35]">{t('layout.helpCenter')}</Link></li>
                <li><a href="https://wa.me/237670934378" target="_blank" rel="noopener noreferrer" className="hover:text-[#FF6B35]">WhatsApp</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-[#2C2C2C] mb-4">{t('layout.legalHeading')}</h3>
              <ul className="space-y-2 text-stone-500">
                <li><Link to={createPageUrl("TermsOfService")} className="hover:text-[#FF6B35]">{t('layout.cgu')}</Link></li>
                <li><Link to={createPageUrl("PrivacyPolicy")} className="hover:text-[#FF6B35]">{t('layout.confidentiality')}</Link></li>
                <li><Link to={createPageUrl("LegalNotice")} className="hover:text-[#FF6B35]">{t('layout.legalNotice')}</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-[#2C2C2C] mb-4">{t('layout.contactsHeading')}</h3>
              <ul className="space-y-2 text-stone-500">
                <li>founder@eventcraftercm.com</li>
                <li>hello@eventcraftercm.com</li>
                <li>support@eventcraftercm.com</li>
                <li>vendor@eventcraftercm.com</li>
                <li className="mt-3 pt-3 border-t border-stone-200">+237 670 93 43 78</li>
                <li>+237 690 17 31 93</li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-stone-100 text-center text-stone-400 text-sm">
          <p className="mb-2">{t('about.legalInfo')}</p>
          (c) 2026 {t('layout.copyright')}
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function Layout({ children }) {
  return (
    <ErrorBoundary>
      <QueryProvider>
        <UserProvider>
          <CurrencyProvider>
            <LanguageProvider>
              <LocationProvider>
                <LayoutContent>{children}</LayoutContent>
              </LocationProvider>
            </LanguageProvider>
          </CurrencyProvider>
        </UserProvider>
      </QueryProvider>
    </ErrorBoundary>
  );
}
