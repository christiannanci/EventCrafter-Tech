$replacements = @{
"src\components\admin\ContractMonitoring.jsx" = @(
    @('donn�es', 'donnees'), @('tr�sorerie', 'tresorerie'), @('inactivit�', 'inactivite'),
    @('termin�s', 'termines'), @('cl�turer', 'cloturer'), @('Mettre � jour', 'Mettre a jour'),
    @('Lib�rer', 'Liberer'), @('Cl�tur�', 'Cloture'), @('a �t�', 'a ete'), @('marqu�', 'marque'),
    @('termin�', 'termine'), @('cl�tur�', 'cloture'), @('proc�der', 'proceder'), @('r�servation', 'reservation'),
    @('s�curiser', 'securiser'), @('�v�nement', 'evenement'), @('envoy�', 'envoye'), @('notifi�', 'notifie'),
    @('Contr�le', 'Controle'), @('M�triques', 'Metriques'), @('Pay�es', 'Payees'), @('G�n�r�e', 'Generee'),
    @('pay�s', 'payes'), @('n�cessitent', 'necessitent'), @('R�f�rence', 'Reference'), @('R�essayer', 'Reessayer'),
    @('lib�rera', 'liberera'), @('v�rifi�', 'verifie'), @('Cl�ture', 'Cloture'), @('cl�ture', 'cloture')
),
"src\components\admin\PaymentProofValidation.jsx" = @(
    @('Valid�', 'Valide'), @('Pr�t � d�marrer', 'Pret a demarrer'), @('re�u et valid�', 'recu et valide'),
    @('apr�s', 'apres'), @('rejet�e', 'rejetee'),
    @('sp�cifi�e', 'specifiee'), @('�t�', 'ete'), @('�quipe', 'equipe'), @('Rejet�', 'Rejete'),
    @('approuv�', 'approuve'), @('trait�', 'traite'), @('notifi�', 'notifie'), @('R�ouvert', 'Reouvert'),
    @('r�examen', 'reexamen'), @('Approuv�', 'Approuve'), @('M�thode', 'Methode'), @('T�l�phone', 'Telephone'),
    @('d�tails', 'details'), @('envoy� �', 'envoye a'), @('R�examiner', 'Reexaminer')
),
"src\components\admin\VerificationRequests.jsx" = @(
    @('pi�ce', 'piece'), @('r�sidence', 'residence'), @('�lectricit�', 'electricite'), @('v�rification', 'verification'),
    @('exig�es', 'exigees'), @('envoy�es', 'envoyees'), @('v�rifi�', 'verifie'), @('F�licitations', 'Felicitations'),
    @('�t�', 'ete'), @('b�n�ficiez', 'beneficiez'), @('Acc�der �', 'Acceder a'), @('attribu�', 'attribue'),
    @('refus�e', 'refusee'), @('corrig�s', 'corriges'), @('rejet�e', 'rejetee'), @('V�rification', 'Verification'),
    @('G�rer', 'Gerer'), @('R�pondre', 'Repondre'), @('v�rifier', 'verifier'), @('V�rifier', 'Verifier'),
    @('V�rifi�', 'Verifie')
),
"src\pages\ProfileSelection.jsx" = @(
    @('Cr�er votre catalogue', 'Creer votre catalogue'), @('G�rer vos contrats', 'Gerer vos contrats'),
    @('Cr�er votre profil', 'Creer votre profil'), @('Compl�tez', 'Completez'), @('Pr�nom', 'Prenom'),
    @('T�l�phone', 'Telephone'), @('Yaound�', 'Yaounde'), @('Cr�ation', 'Creation'), @('Cr�er mon profil', 'Creer mon profil')
),
"src\pages\Support.jsx" = @(
    @('Cr�er un ticket', 'Creer un ticket'), @('T�l�phone', 'Telephone'),
    @('Cat�gorie', 'Categorie'), @('Non connect�', 'Non connecte'), @('envoy�e', 'envoyee'),
    @('r�pondra', 'repondra'), @('R�essayez', 'Reessayez'), @('Re�ue', 'Recue'),
    @('instantan�', 'instantane'), @('R�ponse', 'Reponse'), @('Probl�me', 'Probleme'), @('R�servation', 'Reservation'),
    @('cat�gorie', 'categorie'), @('D�crivez bri�vement', 'Decrivez brievement'),
    @('probl�me', 'probleme'), @('D�taill�', 'Detaille'), @('d�tail', 'detail'), @('peut-�tre', 'peut-etre'),
    @('r�ponse', 'reponse'), @('Retour �', 'Retour a'), @('l� pour vous', 'la pour vous')
),
"src\pages\VendorDashboard.jsx" = @(
    @('?? Dossiers', 'Dossiers'), @('?? Catalogue', 'Catalogue'), @('?? Prospects', 'Prospects'),
    @('?? Croissance', 'Croissance'), @('?? Calendrier', 'Calendrier'), @('?? Param�tres', 'Parametres'),
    @('�tes-vous s�r', 'Etes-vous sur'), @('supprim� avec succ�s', 'supprime avec succes'),
    @('�chec de suppression', 'Echec de suppression'), @('�tre supprim�', 'etre supprime'),
    @('R�essayer', 'Reessayer'), @('illimit�es', 'illimitees'), @('Am�liorer', 'Ameliorer'),
    @('Cr�er une Offre', 'Creer une Offre'), @('Cr�er', 'Creer'), @('Cat�gorie', 'Categorie'),
    @('cat�gorie', 'categorie'), @('Sp�cialit�s', 'Specialites'), @('�v�nements Support�s', 'evenements Supportes'),
    @('Disponibilit�', 'Disponibilite'), @('R�gion', 'Region'), @('D�partement', 'Departement'),
    @('Adresse pr�cise', 'Adresse precise'), @('T�l�chargement', 'Telechargement'), @('T�l�charger', 'Telecharger'),
    @('t�l�charg�e', 'telechargee'), @('Vid�o de Pr�sentation', 'Video de Presentation'), @('vid�o', 'video'),
    @('Description G�n�rale', 'Description Generale'), @('Pr�sentez', 'Presentez'), @('D�tails', 'Details'),
    @('D�taillez', 'Detaillez'), @('Pr�requis', 'Prerequis'), @('re�ues', 'recues'), @('re�u', 'recu'),
    @('Nouvelle R�servation', 'Nouvelle Reservation'), @('n�gocier', 'negocier'), @('r�serv�', 'reserve'),
    @('optimis�e', 'optimisee'), @('r�duit', 'reduit'), @('�chec du t�l�chargement', 'Echec du telechargement'),
    @('�tre t�l�charg�e', 'etre telechargee'), @('V�rifiez', 'Verifiez'), @('�chou�e', 'echouee'),
    @('modifi� avec succ�s', 'modifie avec succes'), @('cr�� avec succ�s', 'cree avec succes'),
    @('�tre sauvegard�', 'etre sauvegarde'), @('Lib�r�s', 'Liberes'), @('lib�r�s', 'liberes'),
    @('mis � jour', 'mis a jour'), @('Premi�re Offre', 'Premiere Offre'),
    @('r�pertori�', 'repertorie'), @('utilis�es', 'utilisees'), @('Cr�dits', 'Credits')
),
"src\Layout.jsx" = @(
    @('Parall�liser', 'Paralleliser'), @('requ�tes', 'requetes'), @('arri�re-plan', 'arriere-plan'),
    @('Fran�ais', 'Francais'), @('S�lectionner', 'Selectionner'), @('L�gal', 'Legal'),
    @('Confidentialit�', 'Confidentialite'), @('l�gales', 'legales'), @('� 2026', 'Copyright 2026')
)
}

foreach ($file in $replacements.Keys) {
    if (-not (Test-Path $file)) { Write-Host "INTROUVABLE: $file"; continue }
    $content = Get-Content $file -Raw -Encoding UTF8
    foreach ($pair in $replacements[$file]) {
        $content = $content.Replace($pair[0], $pair[1])
    }
    [System.IO.File]::WriteAllText($file, $content, [System.Text.UTF8Encoding]::new($false))
    Write-Host "Corrige: $file"
}
