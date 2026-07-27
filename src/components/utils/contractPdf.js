// src/components/utils/contractPdf.js
// Fonction partagee pour generer et ouvrir l'impression PDF d'un contrat.

export function generateContractPDF(contract, providerName = 'Prestataire', clientName = 'Client') {
  const contractHtml = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>Contrat ${contract.contract_number || 'EC'}</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 30px; color: #333; }
  h1 { text-align: center; text-transform: uppercase; font-size: 22px; }
  .subtitle { text-align: center; color: #666; margin-bottom: 30px; }
  .section { margin: 20px 0; }
  .section h2 { font-size: 15px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
  .row { display: flex; justify-content: space-between; margin: 8px 0; }
  .label { color: #666; font-size: 13px; }
  .value { font-weight: bold; font-size: 13px; }
  .financial { background: #f9f9f9; padding: 15px; border-radius: 5px; }
  .total { font-size: 18px; color: #FF6B35; font-weight: bold; }
  .legal { font-size: 11px; color: #555; background: #f5f5f5; padding: 15px; border-radius: 5px; white-space: pre-wrap; }
  .signatures { display: flex; justify-content: space-between; margin-top: 40px; }
  .sig-block { border-top: 2px solid #333; padding-top: 10px; width: 45%; }
  .footer { text-align: center; font-size: 10px; color: #999; margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <h1>${contract.title || 'Contrat pour Services'}</h1>
  <p class="subtitle">Entre <strong>${providerName}</strong> (Prestataire) et <strong>${clientName}</strong> (Client)</p>
  <div class="section">
    <h2>Informations Generales</h2>
    <div class="row"><span class="label">Numero de contrat:</span><span class="value">${contract.contract_number || 'N/A'}</span></div>
    <div class="row"><span class="label">Point focal:</span><span class="value">${contract.focal_point_name || 'N/A'}</span></div>
    <div class="row"><span class="label">Contact:</span><span class="value">${contract.focal_point_contact || 'N/A'}</span></div>
    <div class="row"><span class="label">Date de livraison:</span><span class="value">${contract.delivery_date || 'N/A'}</span></div>
    <div class="row"><span class="label">Adresse:</span><span class="value">${contract.delivery_address || 'N/A'}</span></div>
    <div class="row"><span class="label">Delai d'execution:</span><span class="value">${contract.execution_delay || 'N/A'}</span></div>
  </div>
  <div class="section">
    <h2>Details Financiers</h2>
    <div class="financial">
      <div class="row"><span class="label">Prix unitaire:</span><span class="value">${contract.negotiated_unit_price || 0} FCFA</span></div>
      <div class="row"><span class="label">Quantite:</span><span class="value">${contract.quantity || 1} ${contract.negotiated_unit_measure || ''}</span></div>
      <div class="row"><span class="label">Conditions de paiement:</span><span class="value">${contract.payment_terms || 'N/A'}</span></div>
      <div class="row" style="border-top:1px solid #ddd;padding-top:10px;margin-top:10px"><span class="label">MONTANT TOTAL:</span><span class="total">${contract.contract_amount || 0} FCFA</span></div>
    </div>
  </div>
  <div class="section">
    <h2>Conditions Legales</h2>
    <p class="legal">${contract.cancellation_terms || ''}</p>
    <p class="legal" style="margin-top:10px">${contract.commission_clause || ''}</p>
  </div>
  <div class="signatures">
    <div class="sig-block">
      <strong>Prestataire</strong>
      ${contract?.provider_signed_at ? `<p>Signe: ${contract.provider_signature_name || providerName}</p><p style="font-size:11px;color:#666">${new Date(contract.provider_signed_at).toLocaleDateString('fr-FR')}</p>` : '<p style="color:#999;font-style:italic">Non signe</p>'}
    </div>
    <div class="sig-block">
      <strong>Client</strong>
      ${contract?.client_signed_at ? `<p>Signe: ${contract.client_signature_name || clientName}</p><p style="font-size:11px;color:#666">${new Date(contract.client_signed_at).toLocaleDateString('fr-FR')}</p>` : '<p style="color:#999;font-style:italic">Non signe</p>'}
    </div>
  </div>
  <div class="footer">Statut: ${contract.status || 'N/A'} - Document genere par EventCrafter Marketplace</div>
</body>
</html>`;

  const printWindow = window.open('', '_blank');
  printWindow.document.write(contractHtml);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 500);
}
