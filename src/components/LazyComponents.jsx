import { lazy } from 'react';

/**
 * Lazy loading des composants lourds pour améliorer le temps de chargement initial
 */

// Dashboard components (loaded on demand)
export const VendorDashboard = lazy(() => import('@/pages/VendorDashboard'));
export const ClientDashboard = lazy(() => import('@/pages/ClientDashboard'));
export const AdminDashboard = lazy(() => import('@/pages/AdminDashboard'));

// Heavy components
export const Marketplace = lazy(() => import('@/pages/Marketplace'));
export const ServiceDetails = lazy(() => import('@/pages/ServiceDetails'));
export const Chat = lazy(() => import('@/pages/Chat'));

// Tools
export const BudgetTool = lazy(() => import('@/pages/BudgetTool'));
export const GuestManager = lazy(() => import('@/pages/GuestManager'));