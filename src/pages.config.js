/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import { lazy } from 'react';
const About = lazy(() => import('./pages/About'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminGeo = lazy(() => import('./pages/AdminGeo'));
const AdminMigration = lazy(() => import('./pages/AdminMigration'));
const AdminPayouts = lazy(() => import('./pages/AdminPayouts'));
const AdminServiceTypes = lazy(() => import('./pages/AdminServiceTypes'));
const BudgetTool = lazy(() => import('./pages/BudgetTool'));
const Chat = lazy(() => import('./pages/Chat'));
const ClientDashboard = lazy(() => import('./pages/ClientDashboard'));
const FAQ = lazy(() => import('./pages/FAQ'));
const GuestManager = lazy(() => import('./pages/GuestManager'));
const Home = lazy(() => import('./pages/Home'));
const Inspiration = lazy(() => import('./pages/Inspiration'));
const LegalNotice = lazy(() => import('./pages/LegalNotice'));
const Marketplace = lazy(() => import('./pages/Marketplace'));
const PostRequest = lazy(() => import('./pages/PostRequest'));
const Pricing = lazy(() => import('./pages/Pricing'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const ProfileSelection = lazy(() => import('./pages/ProfileSelection'));
const SEOCameroun = lazy(() => import('./pages/SEOCameroun'));
const ServiceDetails = lazy(() => import('./pages/ServiceDetails'));
const SubscriptionCheckout = lazy(() => import('./pages/SubscriptionCheckout'));
const Support = lazy(() => import('./pages/Support'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const Tools = lazy(() => import('./pages/Tools'));
const VendorDashboard = lazy(() => import('./pages/VendorDashboard'));
const VendorOnboarding = lazy(() => import('./pages/VendorOnboarding'));
const VendorProfile = lazy(() => import('./pages/VendorProfile'));
const Login = lazy(() => import('./pages/Login'));
import __Layout from './Layout.jsx';


export const PAGES = {
    "About": About,
    "AdminDashboard": AdminDashboard,
    "AdminGeo": AdminGeo,
    "AdminMigration": AdminMigration,
    "AdminPayouts": AdminPayouts,
    "AdminServiceTypes": AdminServiceTypes,
    "BudgetTool": BudgetTool,
    "Chat": Chat,
    "ClientDashboard": ClientDashboard,
    "FAQ": FAQ,
    "GuestManager": GuestManager,
    "Home": Home,
    "Inspiration": Inspiration,
    "LegalNotice": LegalNotice,
    "Marketplace": Marketplace,
    "PostRequest": PostRequest,
    "Pricing": Pricing,
    "PrivacyPolicy": PrivacyPolicy,
    "ProfileSelection": ProfileSelection,
    "SEOCameroun": SEOCameroun,
    "ServiceDetails": ServiceDetails,
    "SubscriptionCheckout": SubscriptionCheckout,
    "Support": Support,
    "TermsOfService": TermsOfService,
    "Tools": Tools,
    "VendorDashboard": VendorDashboard,
    "VendorOnboarding": VendorOnboarding,
    "VendorProfile": VendorProfile,
    "Login": Login,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};