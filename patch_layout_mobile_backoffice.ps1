$f = "src\Layout.jsx"
$content = [System.IO.File]::ReadAllText((Resolve-Path $f), [System.Text.Encoding]::UTF8)
$original = $content

$anchor = @'
               {user ? (
                <>
                  {hasVendorProfile && (
                    <Link 
                      to={createPageUrl('VendorDashboard')}
'@

$fixed = @'
               {user ? (
                <>
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
'@

if ($content -notmatch [regex]::Escape($anchor)) {
    Write-Host "ANCRE INTROUVABLE - verifier manuellement." -ForegroundColor Red
} else {
    $content = $content.Replace($anchor, $fixed)
    [System.IO.File]::WriteAllText((Resolve-Path $f), $content, [System.Text.UTF8Encoding]::new($false))
    Write-Host "Lien Back Office ajoute au menu mobile." -ForegroundColor Green
}

Select-String -Path $f -Pattern "backOffice"
