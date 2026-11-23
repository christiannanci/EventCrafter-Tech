// Applique les petites modifications aux 4 fichiers existants du projet :
//   src/pages/Login.jsx, src/pages/ProfileSelection.jsx, src/pages/Inspiration.jsx, src/App.jsx
//
// Usage (depuis la racine du projet) :   node apply-patch.mjs [dossier-du-projet]
//
// - Sans risque : si une seule ligne attendue est introuvable, RIEN n'est modifié.
// - Peut être relancé : les fichiers déjà modifiés sont ignorés.
// - Les fins de ligne (CRLF/LF) et l'indentation sont conservées.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || '.');

const PATCHES = [
  {
    file: 'src/pages/Login.jsx',
    marker: "config/recruitment",
    ops: [
      { find: "import PhoneInput, { isValidPhone, toE164 } from '@/components/PhoneInput';", where: 'after',
        lines: ["import { captureRecruitmentParams } from '@/config/recruitment';"] },
      { find: "const [isRegister, setIsRegister] = useState(false);", where: 'replace',
        lines: ["const [isRegister, setIsRegister] = useState(() => new URLSearchParams(window.location.search).get('mode') === 'register');"] },
      { find: "const navigate = useNavigate();", where: 'after',
        lines: ["// Lien venant d'un article (?role=vendor&categories=…) : on garde le choix jusqu'à la création du profil",
                "React.useEffect(() => { captureRecruitmentParams(window.location.search); }, []);"] },
    ],
  },
  {
    file: 'src/pages/ProfileSelection.jsx',
    marker: "config/recruitment",
    ops: [
      { find: 'import { useToast } from "@/components/ui/use-toast";', where: 'after',
        lines: ["import PendingVendorCategories from '@/components/articles/PendingVendorCategories';",
                "import { getPendingRole, getPendingCategories, clearPending } from '@/config/recruitment';"] },
      { find: "// Sinon, continuer avec la sélection", where: 'after',
        lines: ["// Arrivée depuis un article « prestataire » : on ouvre directement le formulaire prestataire",
                "if (getPendingRole() === 'vendor') { setSelectedType('vendor'); setStep(2); }"] },
      { find: 'toast({ title: "Profil Vendeur créé !", description: "Commencez à lister vos services" });', where: 'before',
        lines: ["// Catégories venant de l'article : enregistrées avec le compte (aucune colonne à ajouter en base)",
                "try {",
                "  const cats = getPendingCategories();",
                "  if (cats.length) await supabase.auth.updateUser({ data: { vendor_categories: cats } });",
                "} catch (e) { console.warn('vendor_categories', e); }",
                "clearPending();"] },
      { find: '<div className="flex gap-3 mt-6">', where: 'before',
        lines: ["{selectedType === 'vendor' && (",
                "  <div className=\"mt-4\"><PendingVendorCategories /></div>",
                ")}"] },
    ],
  },
  {
    file: 'src/pages/Inspiration.jsx',
    marker: "ArticleCards",
    ops: [
      { find: "import { useLanguage } from '@/components/LanguageContext';", where: 'after',
        lines: ["import ArticleCards from '@/components/articles/ArticleCards';"] },
      { find: "{/* Grid */}", where: 'before',
        lines: ["{/* Les 25 articles : chaque carte ouvre /articles/article-NN */}",
                "<ArticleCards filter={filter} />"] },
    ],
  },
  {
    file: 'src/App.jsx',
    marker: "ArticlePage",
    ops: [
      { find: "import PaymentReturn from './pages/PaymentReturn';", where: 'after',
        lines: ["import ArticlePage from './pages/ArticlePage';", "import Waitlist from './pages/Waitlist';"] },
      { find: '<Route path="*" element={<PageNotFound />} />', where: 'before',
        lines: ['<Route',
                '  path="/articles/:slug"',
                '  element={',
                '    <LayoutWrapper currentPageName="Inspiration">',
                '      <ArticlePage />',
                '    </LayoutWrapper>',
                '  }',
                '/>',
                '<Route',
                '  path="/liste-attente"',
                '  element={',
                '    <LayoutWrapper currentPageName="Waitlist">',
                '      <Waitlist />',
                '    </LayoutWrapper>',
                '  }',
                '/>'] },
    ],
  },
];

const results = [];
let failed = false;

for (const p of PATCHES) {
  const full = path.join(root, p.file);
  if (!fs.existsSync(full)) { console.error(`✗ Fichier introuvable : ${p.file}`); failed = true; continue; }
  let text = fs.readFileSync(full, 'utf8');
  if (text.includes(p.marker)) { results.push({ full, skip: true, file: p.file }); continue; }
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const lines = text.split(/\r?\n/);
  let ok = true;
  for (const op of p.ops) {
    const hits = lines.map((l, i) => (l.trim() === op.find ? i : -1)).filter((i) => i >= 0);
    if (hits.length !== 1) {
      console.error(`✗ ${p.file} : ligne attendue trouvée ${hits.length} fois (il en faut 1) :\n    ${op.find}`);
      ok = false; failed = true; break;
    }
    const i = hits[0];
    const indent = lines[i].match(/^\s*/)[0];
    const add = op.lines.map((l) => (l ? indent + l : l));
    if (op.where === 'after') lines.splice(i + 1, 0, ...add);
    else if (op.where === 'before') lines.splice(i, 0, ...add);
    else lines.splice(i, 1, ...add);
  }
  if (ok) results.push({ full, file: p.file, text: lines.join(eol) });
}

if (failed) {
  console.error('\nAucun fichier modifié. Envoyez-moi le message ci-dessus pour que j\'adapte le script.');
  process.exit(1);
}
for (const r of results) {
  if (r.skip) { console.log(`= ${r.file} : déjà modifié, ignoré`); continue; }
  fs.writeFileSync(r.full, r.text, 'utf8');
  console.log(`✓ ${r.file}`);
}
console.log('\nTerminé. Vérifiez avec : git diff');
