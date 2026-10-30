/*
 * Publication : publish.php pour un hébergement OVH (ou tout hébergement PHP), et publication par l'API Git de GitHub.
 * Aucun secret n'est écrit dans le projet ni dans publish.php (seulement l'empreinte SHA-256 du jeton).
 */
import { walk } from './tree.js';
import { __ } from './ui-i18n.js';

export const PUBLISH_VERSION = '4';

const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
const bytes = v => (typeof v === 'string' ? new TextEncoder().encode(v) : v);

export async function sha256Hex(text) {
  return hex(await globalThis.crypto.subtle.digest('SHA-256', bytes(text)));
}

export function newToken() {
  const b = new Uint8Array(32);
  globalThis.crypto.getRandomValues(b);
  return hex(b);
}

/* \x22 et \x27 : guillemets écrits en code pour que l'extraction des textes (tools/i18n.mjs) ne les prenne pas pour des chaînes */
const EMAIL = /^[^@\s<>\x22\x27,;]+@[^@\s<>\x22\x27,;]+\.[a-z]{2,}$/i;

/* Formulaires dont publish.php relaie les messages : identifiant → adresse */
export function formsConfig(site) {
  const out = {};
  const roots = [...site.pages.map(p => p.root), ...Object.values(site.components || {}).map(c => c.node), site.layout?.header, site.layout?.footer].filter(Boolean);
  for (const r of roots) walk(r, n => {
    if (n.type === 'form' && EMAIL.test(n.props?.email || '') && !/^https:\/\//i.test(n.props?.action || '')) out[n.id] = n.props.email;
    return true;
  });
  return out;
}

export function buildPublishPhp({ tokenHash }) {
  if (!/^[0-9a-f]{64}$/.test(String(tokenHash))) throw new Error(__('Empreinte du jeton invalide.'));
  return PHP_TEMPLATE.replace('__TOKEN_HASH__', tokenHash).replace('__VERSION__', PUBLISH_VERSION);
}

const PHP_TEMPLATE = String.raw`<?php
/*
 * Atelier – publication du site, formulaires de contact, signalisation de la collaboration.
 * Fichier généré par l'éditeur Atelier : déposez-le une fois à la racine du site (FTP).
 * Il contient seulement l'empreinte SHA-256 du jeton de publication, jamais le jeton.
 * Journal : atelier-data/log-AAAA-MM.php (illisible depuis le web), lisible dans l'éditeur (🐞 Journal) avec le jeton.
 */
declare(strict_types=1);

const ATELIER_VERSION = '__VERSION__';
const TOKEN_SHA256 = '__TOKEN_HASH__';
const MAX_ZIP = 80 * 1024 * 1024;
const MAX_FILE = 20 * 1024 * 1024;
const MAX_FILES = 4000;
const ALLOWED = ['html', 'css', 'js', 'xml', 'txt', 'webp', 'jpg', 'jpeg', 'png', 'gif', 'avif', 'ico', 'json', 'ics'];
const RATE_MAX = 5;
const RATE_WINDOW = 3600;
const GUARD = "<?php http_response_code(404); exit; ?>\n";
/* Niveau écrit dans le fichier du journal : 'debug' (tout), 'info' (par défaut), 'warn', 'error' */
const LOG_LEVEL = 'info';
const LOG_MAX = 2 * 1024 * 1024;
const LVL = ['debug' => 20, 'info' => 30, 'warn' => 40, 'error' => 50];

$ROOT = __DIR__;
$DATA = $ROOT . '/atelier-data';
$REQ = ['id' => bin2hex(random_bytes(4)), 't0' => microtime(true), 'trace' => [], 'debug' => isset($_GET['atelier_debug']), 'done' => false, 'writing' => false, 'route' => 'status'];

/* ---------- Journal ---------- */
function mask_mail(string $m): string {
  $at = strpos($m, '@');
  return $at === false ? '[adresse]' : mb_substr($m, 0, min(2, $at)) . '…' . substr($m, $at);
}

function alog(string $lvl, string $ev, string $msg, array $data = []): void {
  global $REQ, $DATA;
  $now = microtime(true);
  $e = ['t' => gmdate('Y-m-d\TH:i:s', (int) $now) . sprintf('.%03dZ', (int) (($now - floor($now)) * 1000)), 'req' => $REQ['id'], 'lvl' => $lvl, 'ev' => $ev, 'msg' => $msg, 'ms' => round(($now - $REQ['t0']) * 1000, 1)];
  if ($data) $e['data'] = $data;
  if ($REQ['debug']) $REQ['trace'][] = $e;
  if ((LVL[$lvl] ?? 30) >= 40) error_log('[Atelier ' . $REQ['id'] . '] ' . $ev . ' ' . $msg);
  if ((LVL[$lvl] ?? 30) < (LVL[LOG_LEVEL] ?? 30) || $REQ['writing']) return;
  $REQ['writing'] = true;
  try {
    if (!is_dir($DATA)) @mkdir($DATA, 0750, true);
    if (!is_file($DATA . '/.htaccess')) @file_put_contents($DATA . '/.htaccess', "Require all denied\nDeny from all\n");
    $f = $DATA . '/log-' . gmdate('Y-m') . '.php';
    if (is_file($f) && filesize($f) > LOG_MAX) @rename($f, substr($f, 0, -4) . '.old.php');
    if (!is_file($f)) @file_put_contents($f, GUARD, LOCK_EX);
    $line = json_encode($e, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
    if (@file_put_contents($f, $line . "\n", FILE_APPEND | LOCK_EX) === false) error_log('[Atelier ' . $REQ['id'] . '] journal impossible à écrire dans atelier-data');
  } catch (Throwable $t) {
    error_log('[Atelier] journal impossible : ' . $t->getMessage());
  } finally { $REQ['writing'] = false; }
}

function req_end(int $code): void {
  global $REQ;
  if ($REQ['done']) return;
  $REQ['done'] = true;
  $quiet = ($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST' || $REQ['route'] === 'signal';
  $lvl = $code >= 500 ? 'error' : ($code >= 400 ? 'warn' : ($quiet ? 'debug' : 'info'));
  alog($lvl, 'php.req.end', 'Réponse ' . $code . ' (' . $REQ['route'] . ')', ['status' => $code, 'route' => $REQ['route'], 'mem_kb' => (int) (memory_get_peak_usage() / 1024)]);
}

set_error_handler(function (int $no, string $str, string $file = '', int $line = 0): bool {
  if (!(error_reporting() & $no)) return true;
  alog('warn', 'php.warning', $str, ['type' => $no, 'line' => $line, 'file' => basename($file)]);
  return true;
});

set_exception_handler(function (Throwable $t): void {
  global $REQ;
  alog('error', 'php.exception', get_class($t) . ' : ' . $t->getMessage(), ['line' => $t->getLine(), 'file' => basename($t->getFile())]);
  if (!headers_sent()) out(500, ['ok' => false, 'error' => 'Erreur interne de publish.php (référence ' . $REQ['id'] . ' dans le journal du serveur).']);
});

register_shutdown_function(function (): void {
  global $REQ;
  $e = error_get_last();
  if (!$e || !in_array($e['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR, E_USER_ERROR], true)) return;
  alog('error', 'php.fatal', $e['message'], ['line' => $e['line'], 'file' => basename($e['file'])]);
  if (!headers_sent()) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    header('X-Atelier-Request: ' . $REQ['id']);
    echo json_encode(['ok' => false, 'error' => 'Erreur fatale de publish.php (référence ' . $REQ['id'] . ') : ' . $e['message'], 'req' => $REQ['id']], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  }
  req_end(500);
});

function cors(): void {
  global $REQ;
  header('Access-Control-Allow-Origin: *');
  header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
  header('Access-Control-Allow-Headers: X-Atelier-Token, Content-Type, Accept');
  header('Access-Control-Expose-Headers: X-Atelier-Request');
  header('Access-Control-Max-Age: 600');
  header('X-Atelier-Request: ' . $REQ['id']);
}

function out(int $code, array $body): void {
  global $REQ;
  req_end($code);
  if ($REQ['debug']) $body['_trace'] = $REQ['trace'];
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');
  header('Cache-Control: no-store');
  header('X-Content-Type-Options: nosniff');
  echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
  exit;
}

function ensure_data(string $dir): void {
  if (!is_dir($dir) && !mkdir($dir, 0750, true)) { alog('error', 'php.data-fail', 'Impossible de créer le dossier atelier-data (droits d’écriture ?)'); out(500, ['ok' => false, 'error' => 'Le dossier atelier-data ne peut pas être créé : vérifiez les droits d’écriture de l’hébergement.']); }
  if (!is_file($dir . '/.htaccess')) file_put_contents($dir . '/.htaccess', "Require all denied\nDeny from all\n");
  if (!is_file($dir . '/index.html')) file_put_contents($dir . '/index.html', '');
}

function read_private(string $file): array {
  if (!is_file($file)) return [];
  $raw = (string) file_get_contents($file);
  $nl = strpos($raw, "\n");
  $v = json_decode($nl === false ? '' : substr($raw, $nl + 1), true);
  if (!is_array($v)) { alog('warn', 'php.data-corrupt', 'Fichier privé illisible, ignoré : ' . basename($file)); return []; }
  return $v;
}

function write_private(string $file, array $value): void {
  $tmp = $file . '.' . bin2hex(random_bytes(4)) . '.tmp';
  if (file_put_contents($tmp, GUARD . json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)) === false || !rename($tmp, $file)) {
    alog('error', 'php.write-fail', 'Écriture impossible : ' . basename($file) . ' (disque plein ou droits ?)');
    @unlink($tmp);
  }
}

function check_path(string $p): ?string {
  if ($p === '' || strlen($p) > 200) return 'nom invalide';
  if ($p[0] === '/' || $p[0] === '\\' || preg_match('#^[A-Za-z]:#', $p)) return 'chemin absolu';
  if (strpos($p, '\\') !== false || strpos($p, "\0") !== false) return 'caractère interdit';
  $segs = explode('/', $p);
  foreach ($segs as $seg) {
    if ($seg === '' || $seg === '.' || $seg === '..') return 'chemin interdit';
    if ($seg[0] === '.') return 'fichier caché';
    if (!preg_match('/^[A-Za-z0-9._-]+$/', $seg)) return 'caractères non autorisés';
  }
  if ($segs[0] === 'atelier-data') return 'dossier réservé';
  if (preg_match('/\.(php\d?|phtml|phar|pht|cgi|pl|py|sh|htaccess|htpasswd|ini)(\.|$)/i', $p)) return 'fichier exécutable';
  $ext = strtolower(pathinfo($p, PATHINFO_EXTENSION));
  if (!in_array($ext, ALLOWED, true)) return 'extension .' . $ext . ' non autorisée';
  return null;
}

function rm_empty_parents(string $root, string $rel): void {
  $d = dirname($rel);
  while ($d !== '.' && $d !== '' && $d !== '/') {
    $abs = $root . '/' . $d;
    if (!is_dir($abs) || count(scandir($abs)) > 2) break;
    @rmdir($abs);
    $d = dirname($d);
  }
}

function clean_line(string $s, int $max): string {
  $s = preg_replace('/[\x00-\x1F\x7F]+/u', ' ', $s) ?? '';
  return trim(mb_substr($s, 0, $max));
}

function token_given(): bool {
  return (string) ($_SERVER['HTTP_X_ATELIER_TOKEN'] ?? ($_POST['token'] ?? '')) !== '';
}

function token_ok(): bool {
  $tok = (string) ($_SERVER['HTTP_X_ATELIER_TOKEN'] ?? ($_POST['token'] ?? ''));
  return $tok !== '' && hash_equals(TOKEN_SHA256, hash('sha256', $tok));
}

function ini_bytes(string $v): int {
  $v = trim($v);
  $n = (int) $v;
  $u = strtolower(substr($v, -1));
  return $u === 'g' ? $n * 1073741824 : ($u === 'm' ? $n * 1048576 : ($u === 'k' ? $n * 1024 : $n));
}

/* ---------- Statut, diagnostic (avec le jeton) et journal du serveur ---------- */
function status(string $root, string $data): void {
  $st = ['atelier' => true, 'version' => ATELIER_VERSION, 'php' => PHP_VERSION, 'zip' => class_exists('ZipArchive'), 'signal' => true, 'log' => true, 'req' => $GLOBALS['REQ']['id']];
  if (token_ok()) {
    $files = array_map('basename', glob($data . '/log-*.php') ?: []);
    $st['diag'] = [
      'upload_max_filesize' => (string) ini_get('upload_max_filesize'), 'post_max_size' => (string) ini_get('post_max_size'),
      'memory_limit' => (string) ini_get('memory_limit'), 'max_execution_time' => (int) ini_get('max_execution_time'),
      'mail' => function_exists('mail'), 'data_writable' => is_dir($data) ? is_writable($data) : is_writable($root), 'root_writable' => is_writable($root),
      'log_level' => LOG_LEVEL, 'log_files' => $files, 'sapi' => PHP_SAPI, 'time' => gmdate('c'), 'timezone' => date_default_timezone_get(),
      'disk_free_mb' => ($f = @disk_free_space($root)) !== false ? (int) ($f / 1048576) : null, 'extensions' => ['mbstring' => extension_loaded('mbstring'), 'json' => extension_loaded('json'), 'zip' => extension_loaded('zip')]
    ];
    $limit = min(ini_bytes($st['diag']['upload_max_filesize']) ?: PHP_INT_MAX, ini_bytes($st['diag']['post_max_size']) ?: PHP_INT_MAX);
    alog($limit < 8 * 1048576 ? 'warn' : 'info', 'php.diag', 'Diagnostic de l’hébergement demandé' . ($limit < 8 * 1048576 ? ' : limite d’envoi basse (' . (int) ($limit / 1048576) . ' Mo)' : ''), ['upload_max' => $st['diag']['upload_max_filesize'], 'post_max' => $st['diag']['post_max_size'], 'data_writable' => $st['diag']['data_writable'], 'zip' => $st['zip'], 'mail' => $st['diag']['mail']]);
  } elseif (token_given()) alog('warn', 'php.diag.denied', 'Diagnostic refusé : jeton faux');
  alog('debug', 'php.status', 'Statut demandé (test de connexion)', ['version' => ATELIER_VERSION, 'zip' => $st['zip'], 'diag' => isset($st['diag'])]);
  out(200, $st);
}

function read_logs(string $data): void {
  if (!token_ok()) { alog('warn', 'php.logs.denied', 'Lecture du journal refusée : jeton ' . (token_given() ? 'faux' : 'absent')); sleep(1); out(401, ['ok' => false, 'error' => 'Jeton de publication refusé.']); }
  $n = max(1, min(2000, (int) ($_GET['logs'] ?? 200)));
  $files = glob($data . '/log-*.php') ?: [];
  usort($files, fn($a, $b) => filemtime($b) <=> filemtime($a) ?: strcmp($b, $a));
  $lines = [];
  foreach ($files as $f) {
    $rows = file($f, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
    array_shift($rows);
    for ($i = count($rows) - 1; $i >= 0 && count($lines) < $n; $i--) { $v = json_decode($rows[$i], true); if (is_array($v)) $lines[] = $v; }
    if (count($lines) >= $n) break;
  }
  alog('info', 'php.logs.read', 'Journal du serveur lu depuis l’éditeur', ['lines' => count($lines), 'files' => count($files)]);
  out(200, ['ok' => true, 'lines' => array_reverse($lines), 'files' => array_map('basename', $files)]);
}

/* ---------- Publication ---------- */
function publish(string $root, string $data): void {
  $GLOBALS['REQ']['route'] = 'publish';
  if (!token_ok()) { alog('warn', 'php.publish.denied', 'Publication refusée : jeton ' . (token_given() ? 'faux' : 'absent')); sleep(1); out(401, ['ok' => false, 'error' => 'Jeton de publication refusé.']); }
  if (!class_exists('ZipArchive')) { alog('error', 'php.publish.nozip', 'Extension PHP zip absente sur cet hébergement'); out(500, ['ok' => false, 'error' => 'Extension PHP zip absente sur cet hébergement.']); }
  $f = $_FILES['site'] ?? null;
  if (!$f || ($f['error'] ?? 1) !== UPLOAD_ERR_OK) {
    $codes = [UPLOAD_ERR_INI_SIZE => 'upload_max_filesize dépassé', UPLOAD_ERR_FORM_SIZE => 'taille du formulaire dépassée', UPLOAD_ERR_PARTIAL => 'envoi interrompu', UPLOAD_ERR_NO_FILE => 'aucun fichier', UPLOAD_ERR_NO_TMP_DIR => 'dossier temporaire absent', UPLOAD_ERR_CANT_WRITE => 'écriture du fichier temporaire impossible'];
    $why = $f ? ($codes[$f['error']] ?? ('code ' . $f['error'])) : (empty($_POST) && (int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 0 ? 'post_max_size dépassé' : 'champ « site » absent');
    alog('warn', 'php.publish.nofile', 'Fichier du site manquant : ' . $why, ['content_length' => (int) ($_SERVER['CONTENT_LENGTH'] ?? 0), 'upload_max' => (string) ini_get('upload_max_filesize'), 'post_max' => (string) ini_get('post_max_size')]);
    out(400, ['ok' => false, 'error' => 'Fichier du site manquant (' . $why . ' ; vérifiez upload_max_filesize et post_max_size).']);
  }
  alog('info', 'php.publish.start', 'Paquet reçu', ['kb' => (int) ($f['size'] / 1024)]);
  if ($f['size'] > MAX_ZIP) { alog('warn', 'php.publish.too-big', 'Site trop volumineux', ['kb' => (int) ($f['size'] / 1024)]); out(413, ['ok' => false, 'error' => 'Site trop volumineux.']); }
  $zip = new ZipArchive();
  if (($zr = $zip->open($f['tmp_name'])) !== true) { alog('warn', 'php.publish.bad-zip', 'Archive illisible', ['code' => $zr]); out(400, ['ok' => false, 'error' => 'Archive illisible.']); }
  $entries = [];
  $rejected = [];
  for ($i = 0; $i < $zip->numFiles; $i++) {
    $st = $zip->statIndex($i);
    $name = (string) $st['name'];
    if (substr($name, -1) === '/') continue;
    $err = check_path($name);
    if ($err === null && $st['size'] > MAX_FILE) $err = 'fichier trop volumineux';
    if ($err !== null) $rejected[] = $name . ' : ' . $err;
    else $entries[$name] = $i;
  }
  if (count($entries) > MAX_FILES) $rejected[] = 'trop de fichiers';
  if ($rejected) { alog('warn', 'php.publish.rejected', 'Paquet refusé : ' . count($rejected) . ' fichier(s) non autorisé(s), rien n’est publié', ['rejected' => array_slice($rejected, 0, 20)]); out(400, ['ok' => false, 'error' => 'Paquet refusé : rien n’a été publié.', 'rejected' => $rejected]); }
  alog('debug', 'php.publish.checked', 'Paquet vérifié', ['files' => count($entries)]);

  ensure_data($data);
  $stage = $data . '/stage-' . bin2hex(random_bytes(6));
  mkdir($stage, 0750);
  foreach ($entries as $name => $i) {
    $content = $zip->getFromIndex($i);
    if ($content === false) { alog('error', 'php.publish.read-fail', 'Lecture impossible dans l’archive : ' . $name); out(500, ['ok' => false, 'error' => 'Lecture impossible : ' . $name]); }
    $dest = $stage . '/' . $name;
    if (!is_dir(dirname($dest))) mkdir(dirname($dest), 0755, true);
    if (file_put_contents($dest, $content) === false) { alog('error', 'php.publish.write-fail', 'Écriture impossible (disque plein ?) : ' . $name); out(500, ['ok' => false, 'error' => 'Écriture impossible sur l’hébergement : ' . $name]); }
  }
  $zip->close();
  alog('debug', 'php.publish.staged', 'Fichiers préparés à part', ['files' => count($entries)]);
  $moved = 0;
  foreach (array_keys($entries) as $name) {
    $dest = $root . '/' . $name;
    if (!is_dir(dirname($dest))) mkdir(dirname($dest), 0755, true);
    if (rename($stage . '/' . $name, $dest)) $moved++;
    else alog('error', 'php.publish.move-fail', 'Mise en place impossible : ' . $name);
  }
  $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($stage, FilesystemIterator::SKIP_DOTS), RecursiveIteratorIterator::CHILD_FIRST);
  foreach ($it as $p) { $p->isDir() ? @rmdir($p->getPathname()) : @unlink($p->getPathname()); }
  @rmdir($stage);

  $old = read_private($data . '/manifest.php')['files'] ?? [];
  $new = array_keys($entries);
  $removed = 0;
  foreach (array_diff($old, $new) as $rel) {
    if (!is_string($rel) || check_path($rel) !== null) continue;
    $abs = $root . '/' . $rel;
    if (is_file($abs) && strpos((string) realpath($abs), (string) realpath($root)) === 0) { unlink($abs); $removed++; rm_empty_parents($root, $rel); }
  }
  write_private($data . '/manifest.php', ['files' => array_values($new), 'at' => gmdate('c')]);

  $formsCount = null;
  if (isset($_POST['forms'])) {
    $forms = json_decode((string) $_POST['forms'], true);
    $clean = [];
    if (is_array($forms)) foreach ($forms as $id => $mail) {
      if (count($clean) >= 100) break;
      if (is_string($id) && preg_match('/^[A-Za-z0-9_-]{1,40}$/', $id) && is_string($mail) && filter_var($mail, FILTER_VALIDATE_EMAIL)) $clean[$id] = $mail;
    }
    write_private($data . '/forms.php', $clean);
    $formsCount = count($clean);
    if (is_array($forms) && count($forms) !== count($clean)) alog('warn', 'php.publish.forms-skipped', (count($forms) - count($clean)) . ' formulaire(s) ignoré(s) : adresse e-mail invalide');
  }
  alog($moved === count($new) ? 'info' : 'error', 'php.publish.ok', 'Site publié', ['written' => count($new), 'moved' => $moved, 'removed' => $removed, 'forms' => $formsCount]);
  out(200, ['ok' => true, 'written' => count($new), 'removed' => $removed, 'at' => gmdate('c'), 'req' => $GLOBALS['REQ']['id']]);
}

/* ---------- Formulaire de contact ---------- */
function contact(string $data): void {
  $GLOBALS['REQ']['route'] = 'contact';
  $json = strpos((string) ($_SERVER['HTTP_ACCEPT'] ?? ''), 'application/json') !== false;
  $back = (string) ($_POST['_back'] ?? '');
  if (!preg_match('#^[A-Za-z0-9/._-]*$#', $back) || strpos($back, '..') !== false || $back === '' || $back[0] === '/') $back = './';
  $finish = function (int $code, bool $ok, string $msg) use ($json, $back): void {
    if ($json) out($code, ['ok' => $ok, 'message' => $msg]);
    req_end(303);
    http_response_code(303);
    header('Location: ' . $back . '?form=' . ($ok ? 'ok' : 'error'));
    exit;
  };
  $id = (string) ($_POST['_form'] ?? '');
  $forms = read_private($data . '/forms.php');
  $to = $forms[$id] ?? null;
  if (!is_string($to) || !filter_var($to, FILTER_VALIDATE_EMAIL)) { alog('warn', 'php.contact.unknown', 'Formulaire inconnu (republiez le site depuis l’éditeur)', ['form' => clean_line($id, 40), 'known' => count($forms)]); $finish(404, false, 'Formulaire inconnu.'); }
  alog('debug', 'php.contact.start', 'Message de contact reçu', ['form' => $id, 'to' => mask_mail($to), 'fields' => count($_POST), 'json' => $json]);
  if (trim((string) ($_POST['website'] ?? '')) !== '') { alog('info', 'php.contact.bot', 'Robot détecté (champ piège rempli) : rien n’est envoyé', ['form' => $id]); $finish(200, true, 'Merci.'); }

  $lines = [];
  $reply = '';
  foreach ($_POST as $k => $v) {
    if (!is_string($k) || !is_string($v) || $k === '' || $k[0] === '_' || $k === 'website' || $k === 'token') continue;
    $v = trim(mb_substr(str_replace("\r", '', $v), 0, 5000));
    if ($v === '') continue;
    $label = clean_line(str_replace('_', ' ', $k), 80);
    $lines[] = $label . " :\n" . $v . "\n";
    if ($reply === '' && filter_var($v, FILTER_VALIDATE_EMAIL)) $reply = $v;
  }
  if (!$lines) { alog('info', 'php.contact.empty', 'Message vide refusé', ['form' => $id]); $finish(422, false, 'Le message est vide.'); }

  ensure_data($data);
  $ipKey = hash('sha256', (string) ($_SERVER['REMOTE_ADDR'] ?? '?'));
  $now = time();
  $rate = read_private($data . '/rate.php');
  foreach ($rate as $k => $list) { $rate[$k] = array_values(array_filter((array) $list, fn($t) => is_int($t) && $t > $now - RATE_WINDOW)); if (!$rate[$k]) unset($rate[$k]); }
  if (count($rate[$ipKey] ?? []) >= RATE_MAX) { alog('warn', 'php.contact.rate', 'Trop de messages depuis la même adresse (5 par heure)', ['form' => $id, 'who' => substr($ipKey, 0, 10)]); $finish(429, false, 'Trop de messages envoyés. Réessayez dans une heure.'); }
  $rate[$ipKey][] = $now;
  write_private($data . '/rate.php', $rate);

  $host = preg_replace('/[^a-z0-9.-]/i', '', explode(':', (string) ($_SERVER['HTTP_HOST'] ?? 'localhost'))[0]) ?: 'localhost';
  $host = preg_replace('/^www\./i', '', $host);
  $subject = clean_line((string) ($_POST['_subject'] ?? 'Message depuis le site'), 120);
  $headers = 'From: Site <noreply@' . $host . ">\r\n" . ($reply !== '' ? 'Reply-To: ' . $reply . "\r\n" : '') . "MIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\nX-Mailer: Atelier";
  $body = implode("\n", $lines) . "\n— Envoyé depuis le formulaire du site " . $host . ' le ' . gmdate('d/m/Y H:i') . " (UTC).\n";
  $encoded = '=?UTF-8?B?' . base64_encode($subject) . '?=';
  $log = getenv('ATELIER_MAIL_LOG');
  if ($log) { file_put_contents($log, json_encode(['to' => $to, 'subject' => $subject, 'headers' => $headers, 'body' => $body], JSON_UNESCAPED_UNICODE) . "\n", FILE_APPEND); $sent = true; }
  else $sent = mail($to, $encoded, $body, $headers);
  if ($sent) alog('info', 'php.contact.sent', 'E-mail remis au serveur d’envoi de l’hébergement', ['form' => $id, 'to' => mask_mail($to), 'from' => 'noreply@' . $host, 'fields' => count($lines), 'reply_to' => $reply !== '']);
  else alog('error', 'php.contact.mail-fail', 'mail() a échoué : l’hébergement refuse l’envoi (fonction mail désactivée, quota ou adresse d’expéditeur)', ['form' => $id, 'to' => mask_mail($to), 'from' => 'noreply@' . $host]);
  $sent ? $finish(200, true, 'Merci, votre message a été envoyé.') : $finish(500, false, 'L’envoi a échoué. Réessayez plus tard.');
}

/* ---------- Signalisation de la collaboration : boîte aux lettres de messages chiffrés (le serveur ne peut pas les lire) ---------- */
const SIGNAL_TTL = 900;
const SIGNAL_KEEP = 200;
const SIGNAL_SIZE = 65536;
const SIGNAL_ROOMS = 100;

function signal_check(string $room, string $peer): void {
  if (!preg_match('/^[0-9a-f]{64}$/', $room) || !preg_match('/^[A-Za-z0-9_-]{1,32}$/', $peer)) { alog('warn', 'php.signal.invalid', 'Message de signalisation invalide (salle ou participant)', ['room_len' => strlen($room), 'peer' => clean_line($peer, 40)]); out(400, ['ok' => false, 'error' => 'Message de signalisation invalide.']); }
}

function signal_clean(string $data): void {
  foreach (glob($data . '/signal-*.php') ?: [] as $f) if (filemtime($f) < time() - SIGNAL_TTL) { @unlink($f); alog('debug', 'php.signal.expired', 'Salle expirée effacée', ['room' => substr(basename($f), 7, 8)]); }
}

function signal_post(string $data): void {
  $GLOBALS['REQ']['route'] = 'signal';
  $raw = (string) file_get_contents('php://input', false, null, 0, SIGNAL_SIZE + 2048);
  if (strlen($raw) > SIGNAL_SIZE + 1024) { alog('warn', 'php.signal.too-big', 'Message de signalisation trop grand', ['bytes' => strlen($raw)]); out(413, ['ok' => false, 'error' => 'Message trop grand.']); }
  $m = json_decode($raw, true);
  if (!is_array($m)) { alog('warn', 'php.signal.invalid', 'Message de signalisation illisible (JSON)'); out(400, ['ok' => false, 'error' => 'Message de signalisation invalide.']); }
  $room = (string) ($m['signal'] ?? '');
  $from = (string) ($m['from'] ?? '');
  $to = (string) ($m['to'] ?? '');
  $d = (string) ($m['data'] ?? '');
  signal_check($room, $from);
  if ($to !== '*' && !preg_match('/^[A-Za-z0-9_-]{1,32}$/', $to)) { alog('warn', 'php.signal.invalid', 'Destinataire invalide'); out(400, ['ok' => false, 'error' => 'Destinataire invalide.']); }
  if (strlen($d) > SIGNAL_SIZE) { alog('warn', 'php.signal.too-big', 'Message de signalisation trop grand', ['bytes' => strlen($d)]); out(413, ['ok' => false, 'error' => 'Message trop grand.']); }
  if ($d === '' || !preg_match('#^[A-Za-z0-9_+/=-]+$#', $d)) { alog('warn', 'php.signal.invalid', 'Données de signalisation pas en base64'); out(400, ['ok' => false, 'error' => 'Données attendues en base64.']); }
  ensure_data($data);
  $lock = fopen($data . '/signal.lock', 'c');
  flock($lock, LOCK_EX);
  signal_clean($data);
  $file = $data . '/signal-' . $room . '.php';
  if (!is_file($file) && count(glob($data . '/signal-*.php') ?: []) >= SIGNAL_ROOMS) { flock($lock, LOCK_UN); alog('warn', 'php.signal.full', 'Trop de salles de collaboration ouvertes (100)'); out(429, ['ok' => false, 'error' => 'Trop de sessions en cours, réessayez plus tard.']); }
  $box = read_private($file);
  $n = (int) ($box['n'] ?? 0) + 1;
  $msgs = array_slice(array_merge((array) ($box['m'] ?? []), [['id' => $n, 'from' => $from, 'to' => $to, 'data' => $d]]), -SIGNAL_KEEP);
  write_private($file, ['n' => $n, 'm' => $msgs]);
  flock($lock, LOCK_UN);
  alog('debug', 'php.signal.post', 'Message chiffré déposé', ['room' => substr($room, 0, 8), 'from' => $from, 'to' => $to, 'bytes' => strlen($d), 'id' => $n, 'new_room' => $n === 1]);
  out(200, ['ok' => true, 'id' => $n]);
}

function signal_get(string $data): void {
  $GLOBALS['REQ']['route'] = 'signal';
  $room = (string) ($_GET['signal'] ?? '');
  $peer = (string) ($_GET['peer'] ?? '');
  $after = (int) ($_GET['after'] ?? 0);
  signal_check($room, $peer);
  $box = read_private($data . '/signal-' . $room . '.php');
  $msgs = array_values(array_filter((array) ($box['m'] ?? []), fn($x) => is_array($x) && ($x['to'] === $peer || $x['to'] === '*') && $x['from'] !== $peer && $x['id'] > $after));
  alog('debug', 'php.signal.get', count($msgs) ? count($msgs) . ' message(s) relevé(s)' : 'Aucun nouveau message', ['room' => substr($room, 0, 8), 'peer' => $peer, 'after' => $after, 'count' => count($msgs), 'last' => (int) ($box['n'] ?? 0)]);
  out(200, ['ok' => true, 'messages' => $msgs, 'last' => (int) ($box['n'] ?? 0)]);
}

cors();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
alog('debug', 'php.req.start', $method . ' reçu', ['method' => $method, 'who' => substr(hash('sha256', TOKEN_SHA256 . ($_SERVER['REMOTE_ADDR'] ?? '?')), 0, 10), 'bytes' => (int) ($_SERVER['CONTENT_LENGTH'] ?? 0), 'ua' => clean_line((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 90), 'origin' => clean_line((string) ($_SERVER['HTTP_ORIGIN'] ?? ''), 90)]);
if (getenv('ATELIER_TEST_FAULT') && isset($_GET['atelier_fault'])) {
  if ($_GET['atelier_fault'] === 'warning') { $x = []; $y = $x['absent']; out(200, ['ok' => true]); }
  throw new RuntimeException('panne de test');
}
if ($method === 'OPTIONS') { req_end(204); http_response_code(204); exit; }
if ($method === 'GET' && isset($_GET['signal'])) signal_get($DATA);
if ($method === 'GET' && isset($_GET['logs'])) { $REQ['route'] = 'logs'; read_logs($DATA); }
if ($method === 'GET') status($ROOT, $DATA);
if ($method !== 'POST') { alog('warn', 'php.method', 'Méthode non autorisée : ' . clean_line($method, 10)); out(405, ['ok' => false, 'error' => 'Méthode non autorisée.']); }
if (stripos((string) ($_SERVER['CONTENT_TYPE'] ?? ''), 'application/json') !== false) signal_post($DATA);
if (isset($_POST['_form'])) contact($DATA);
publish($ROOT, $DATA);
`;

/* ---------- GitHub ---------- */
export async function gitBlobSha(data) {
  const b = bytes(data);
  const head = new TextEncoder().encode(`blob ${b.length}\0`);
  const all = new Uint8Array(head.length + b.length);
  all.set(head);
  all.set(b, head.length);
  return hex(await globalThis.crypto.subtle.digest('SHA-1', all));
}

const norm = d => String(d || '').replace(/^\/+|\/+$/g, '');

/* existing : arbre récursif du dépôt ; files : chemin → empreinte ; dir : dossier du site dans le dépôt */
export function planGitTree(existing, files, dir) {
  const prefix = norm(dir) ? `${norm(dir)}/` : '';
  const inDir = p => !prefix || p.startsWith(prefix);
  const blobs = existing.filter(e => e.type === 'blob');
  const known = new Set(blobs.map(e => e.sha));
  const byPath = new Map(blobs.map(e => [e.path, e.sha]));
  const tree = blobs.filter(e => !inDir(e.path)).map(e => ({ path: e.path, mode: e.mode, type: 'blob', sha: e.sha }));
  const upload = [];
  let unchanged = 0;
  for (const [path, sha] of files) {
    tree.push({ path, mode: '100644', type: 'blob', sha });
    if (byPath.get(path) === sha) unchanged++;
    else if (!known.has(sha)) upload.push(path);
  }
  const removed = blobs.filter(e => inDir(e.path) && !files.has(e.path)).map(e => e.path);
  return { tree, upload, removed, unchanged };
}

const b64 = b => {
  let s = '';
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(s);
};

export async function publishGitHub({ token, owner, repo, branch = 'main', dir = '', files, message = __('Publication depuis Atelier'), fetch: f = globalThis.fetch, onProgress }) {
  if (!token) throw new Error(__('Indiquez un jeton GitHub (accès en écriture au contenu du dépôt).'));
  const ok = v => /^[A-Za-z0-9_.-]{1,100}$/.test(v || '') && !/^\.+$/.test(v);
  if (!ok(owner) || !ok(repo)) throw new Error(__('Nom de dépôt invalide (propriétaire/dépôt).'));
  if (!/^[A-Za-z0-9._/-]{1,100}$/.test(branch) || branch.includes('..')) throw new Error(__('Nom de branche invalide.'));
  if (norm(dir) && !/^[A-Za-z0-9._/-]+$/.test(norm(dir))) throw new Error(__('Dossier invalide.'));
  const api = `https://api.github.com/repos/${owner}/${repo}`;
  const call = async (path, opts = {}) => {
    const r = await f(api + path, { ...opts, headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(opts.body ? { 'Content-Type': 'application/json' } : {}) } });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) {
      if (r.status === 401 || r.status === 403) throw new Error(__('GitHub refuse le jeton : vérifiez qu’il donne accès en écriture au contenu de ce dépôt.'));
      if (r.status === 409 || /empty/i.test(body.message || '')) throw new Error(__('Le dépôt est vide : créez-y d’abord un fichier (par exemple README), puis publiez.'));
      if (r.status === 404) throw new Error(__('Introuvable sur GitHub (dépôt ou branche « {branch} ») : {message}', { branch, message: body.message || '' }));
      throw new Error(`GitHub : ${body.message || r.status}`);
    }
    return body;
  };
  const prefix = norm(dir) ? `${norm(dir)}/` : '';
  const ref = await call(`/git/ref/heads/${branch}`);
  const parent = ref.object.sha;
  const commit = await call(`/git/commits/${parent}`);
  const current = await call(`/git/trees/${commit.tree.sha}?recursive=1`);
  if (current.truncated) throw new Error(__('Dépôt trop grand pour une publication automatique.'));
  const shas = new Map();
  const data = new Map();
  for (const [name, content] of files) {
    const b = bytes(content);
    shas.set(prefix + name, await gitBlobSha(b));
    data.set(prefix + name, b);
  }
  const plan = planGitTree(current.tree || [], shas, dir);
  let n = 0;
  for (const path of plan.upload) {
    const blob = await call('/git/blobs', { method: 'POST', body: JSON.stringify({ content: b64(data.get(path)), encoding: 'base64' }) });
    if (blob.sha && blob.sha !== shas.get(path)) plan.tree.find(e => e.path === path).sha = blob.sha;
    onProgress?.({ done: ++n, total: plan.upload.length });
  }
  const tree = await call('/git/trees', { method: 'POST', body: JSON.stringify({ tree: plan.tree }) });
  const created = await call('/git/commits', { method: 'POST', body: JSON.stringify({ message, tree: tree.sha, parents: [parent] }) });
  await call(`/git/refs/heads/${branch}`, { method: 'PATCH', body: JSON.stringify({ sha: created.sha, force: false }) });
  return { commit: created.sha, uploaded: plan.upload.length, removed: plan.removed.length, unchanged: plan.unchanged };
}

/* Fichiers acceptés par la version de publish.php installée (la version 1 refuse les .ics) */
export function filesForServer(files, version) {
  const v = Number(version) || 1;
  const out = new Map();
  const skipped = [];
  for (const [k, val] of files) {
    if (v < 2 && /\.ics$/i.test(k)) skipped.push(k);
    else out.set(k, val);
  }
  return { files: out, skipped };
}
