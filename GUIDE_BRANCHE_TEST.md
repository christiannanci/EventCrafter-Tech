# Guide : modifier le site EventCrafter avec Base44

## Principe
- **main** = le site en ligne : https://www.eventcraftercm.com
- **base44-modifs** = la branche de test. On y fait les modifications pour les vérifier **sans toucher au site en ligne**.

## Étape 1 : demander une modification dans Base44
Ouvre le projet EventCrafter dans Base44 et écris ta demande dans le chat, en précisant la branche. Exemple :
> « Sur la branche base44-modifs, change le titre de la page d'accueil en ... »

Base44 enregistre la modification **uniquement** sur la branche de test.

## Étape 2 : vérifier sur le site de test
Attends 1 à 2 minutes, le temps que Vercel construise le site, puis ouvre :

**https://event-crafter-tech-git-base44-modifs-event-crafter-pro.vercel.app**

C'est toujours le même lien. Rafraîchis la page (Ctrl + F5) pour voir la dernière version.
- Si une page de connexion Vercel s'affiche, demande au propriétaire du compte Vercel un lien de partage. Il le crée depuis le projet, onglet Deployments, bouton **Share**.
- Si la modification ne convient pas, demande une correction dans le chat Base44 et vérifie de nouveau.

## Étape 3 : envoyer la modification sur le site principal
Quand tout est validé sur le site de test, écris dans le chat Base44 :
> « Fusionne la branche base44-modifs dans main »

Base44 envoie alors les modifications sur **main**. Vercel met à jour **www.eventcraftercm.com** automatiquement en 1 à 2 minutes. Vérifie ensuite sur le site en ligne.

Autre méthode, depuis GitHub : ouvre le dépôt, clique sur **Compare & pull request** pour la branche base44-modifs, puis sur **Create pull request** et enfin sur **Merge pull request**.

## Règles importantes
1. Précise **toujours** « sur la branche base44-modifs » dans tes demandes.
2. Ne fusionne dans main **qu'après** avoir vérifié le site de test.
3. Une modification à la fois : c'est plus facile à vérifier et à annuler.
4. En cas de problème après la fusion, demande dans le chat Base44 : « Annule la dernière fusion sur main ».
