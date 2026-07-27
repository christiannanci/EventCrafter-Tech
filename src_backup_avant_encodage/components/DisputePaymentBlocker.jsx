import { base44 } from '@/api/apiClient';

/**
 * BLACKLISTE AUTOMATIQUE
 * Bloque tous les paiements sortants vers un prestataire ayant un litige ouvert
 */
export async function blockVendorPayments(vendorId) {
  // Bloquer toutes les transactions en attente
  const transactions = await base44.entities.Transaction.list();
  const vendorTransactions = transactions.filter(
    tx => tx.to_user_id === vendorId && tx.status === 'escrow_held'
  );

  for (const tx of vendorTransactions) {
    await base44.entities.Transaction.update(tx.id, {
      status: 'blocked',
      description: tx.description + ' [BLOQUÉ - LITIGE EN COURS]'
    });
  }

  return vendorTransactions.length;
}

/**
 * Débloquer les paiements après résolution
 */
export async function unblockVendorPayments(vendorId) {
  const transactions = await base44.entities.Transaction.list();
  const blockedTransactions = transactions.filter(
    tx => tx.to_user_id === vendorId && tx.status === 'blocked'
  );

  for (const tx of blockedTransactions) {
    await base44.entities.Transaction.update(tx.id, {
      status: 'escrow_held',
      description: tx.description.replace(' [BLOQUÉ - LITIGE EN COURS]', '')
    });
  }

  return blockedTransactions.length;
}

/**
 * Vérifier si un prestataire a des paiements bloqués
 */
export async function hasBlockedPayments(vendorId) {
  const transactions = await base44.entities.Transaction.list();
  return transactions.some(
    tx => tx.to_user_id === vendorId && tx.status === 'blocked'
  );
}