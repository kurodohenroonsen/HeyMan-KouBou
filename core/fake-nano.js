/*
 * Faux Gemini Nano pour les tests (unitaires, de bout en bout, et l’auto-test en console) du banc d’essai.
 * Fonctions autonomes (sans import) : les tests de bout en bout les injectent dans la page avec fn.toString().
 *   goodNano() : répond juste à chaque cas du banc d'essai ; badNano() : réponses vides, fausses ou en erreur.
 */
export function goodNano() {
  const status = { prompt: 'available', multimodal: 'available', summarizer: 'available', rewriter: 'unavailable', writer: 'unavailable', proofreader: 'unavailable', translator: 'available', detector: 'available' };
  return {
    status,
    has: { prompt: true, multimodal: true, summarizer: true, translator: true },
    calls: [],
    async prompt(req) {
      const keys = Object.keys(req.schema?.properties || {});
      this.calls.push({ api: 'prompt', keys });
      const sys = String(req.system || '');
      const user = String(req.user || '');
      const j = o => JSON.stringify(o);
      if (keys.includes('actions')) {
        const q = (user.match(/Demande : ([\s\S]*)$/) || [])[1]?.toLowerCase() || '';
        if (/faq/.test(q)) return j({ summary: 'J’ajoute une FAQ sur l’adhésion.', actions: [{ action: 'add_faq', title: 'Adhérer au MAB', questions: [{ q: 'Qui peut adhérer ?', a: 'Tout média associatif.' }, { q: 'Combien ça coûte ?', a: 'C’est gratuit la première année.' }, { q: 'Comment faire ?', a: 'Écrivez-nous.' }] }] });
        if (/titres/.test(q)) return j({ summary: 'Titres en rouge.', actions: [{ action: 'style', target: 'headings', property: 'color', value: 'rouge' }] });
        if (/page/.test(q) && !/supprime/.test(q)) return j({ summary: 'Je crée la page.', actions: [{ action: 'add_page', title: 'Notre radio', sections: [{ template: 'hero', title: 'Notre radio' }, { template: 'contact' }] }] });
        return j({ summary: 'Ce n’est pas possible avec les actions disponibles.', actions: [] });
      }
      if (keys.includes('date_year_shown')) return j({ title: 'Nuit des radios libres', date: 'Samedi 14 décembre', date_year_shown: false, time: '20h30', endDate: '', endDate_year_shown: false, endTime: '', place: 'Maison du Peuple', address: 'Bruxelles', image: '', description: 'Entrée libre.', status: '', link: 'mediaslibres.be' });
      if (keys.includes('items')) return j({ items: [
        { name: 'Radio Panik', intro: 'Radio associative bruxelloise.', type: 'radio', city: 'Bruxelles', website: 'radiopanik.org' },
        { name: 'Zin TV', intro: 'Télévision participative.', type: 'Télévision', city: 'Bruxelles', website: 'https://zintv.org' },
        { name: 'Médor', intro: 'Magazine d’enquête.', type: 'presse', city: 'Namur', website: 'medor.coop' }
      ] });
      if (keys.includes('corrections')) {
        const list = [['alternatif', 'alternatifs'], ['se réunisse', 'se réunissent'], [' a Bruxelles', ' à Bruxelles']].filter(([o]) => user.includes(o));
        return j({ corrections: list.map(([original, replacement]) => ({ original, replacement })) });
      }
      if (keys.includes('alt')) return j({ alt: 'Un cercle rouge sur un fond bleu', decorative: false });
      if (keys.includes('keywords')) return j({ keywords: ['médias alternatifs', 'radio associative', 'fédération des médias', 'Médias alternatifs'] });
      if (keys.includes('description')) return j({ description: 'Le MAB fédère les médias alternatifs belges : radios, télés et sites associatifs partagent matériel, techniciens et diffusion.' });
      if (keys.includes('excerpt')) return j({ excerpt: 'Le MAB part à la rencontre des habitants dans les maisons de quartier.' });
      if (keys.includes('titles')) return j({ titles: ['Le MAB en tournée dans les quartiers', 'Les médias libres sur la route', 'Une tournée pour rencontrer les habitants'] });
      if (keys.includes('points')) return j({ points: ['Raccourcir le titre de l’accueil.', 'Ajouter le logo manquant.'] });
      if (keys.includes('tasks')) { const ids = [...user.matchAll(/(cm_[A-Za-z0-9_-]+)/g)].map(m => m[1]); return j({ tasks: ids.map(id => ({ id, task: 'Corriger ce point' })) }); }
      if (keys.includes('title')) return j({ title: 'MAB – Fédération des médias alternatifs belges' });
      if (keys.includes('anchor')) return j({ anchor: 'Voir l’agenda du MAB' });
      if (keys.includes('text')) {
        if (/Raccourcis/.test(sys)) return j({ text: 'Le MAB réunit les médias alternatifs belges pour partager leurs moyens.' });
        if (/langage clair/.test(sys)) return j({ text: 'Le MAB réunit des médias. Ils partagent du matériel. Chaque média reste libre.' });
        if (/formel/.test(sys)) return j({ text: 'La fédération MAB rassemble les médias alternatifs de Belgique afin de mutualiser leurs ressources.' });
        if (/chaleureux/.test(sys)) return j({ text: 'Bienvenue au MAB : ensemble, les médias libres partagent tout ce qui les fait grandir !' });
        return j({ text: 'Le MAB réunit les médias alternatifs belges. Ils partagent matériel, techniciens et diffusion, et chaque rédaction garde son indépendance.' });
      }
      return '{}';
    },
    async summarize(req) {
      this.calls.push({ api: 'summarizer', type: req.type });
      if (req.type === 'teaser') return 'Le MAB part à la rencontre des habitants dans les maisons de quartier.';
      if (req.type === 'key-points') return '- Raccourcir le titre de l’accueil.\n- Ajouter le logo manquant.\n- Vérifier la date du festival.';
      return 'Le MAB fédère les médias alternatifs belges : radios, télés et sites associatifs partagent matériel, techniciens et diffusion.';
    },
    async translate(req) { this.calls.push({ api: 'translator', to: req.to }); return `[${req.to}] ${req.text}`; }
  };
}

export function badNano() {
  return {
    status: { prompt: 'available', multimodal: 'unavailable', summarizer: 'unavailable', rewriter: 'unavailable', writer: 'unavailable', proofreader: 'unavailable', translator: 'unavailable', detector: 'unavailable' },
    has: { prompt: true, multimodal: false, summarizer: false, translator: false },
    calls: 0,
    async prompt(req) {
      this.calls++;
      const keys = Object.keys(req.schema?.properties || {});
      if (keys.includes('actions')) return JSON.stringify({ summary: '', actions: [{ action: 'delete_pages' }] });
      if (keys.includes('text')) return JSON.stringify({ text: String(req.user || '').replace(/^Texte :\n/, '') + ' Et encore une phrase de plus pour faire long.' });
      if (keys.includes('description')) return JSON.stringify({ description: 'Court.' });
      if (keys.includes('corrections')) return JSON.stringify({ corrections: [{ original: 'introuvable', replacement: 'x' }] });
      if (keys.includes('keywords')) return 'pas du JSON';
      if (keys.includes('items')) return JSON.stringify({ items: [{ name: '', intro: '', website: 'javascript:alert(1)' }] });
      throw new Error('panne simulée du modèle');
    }
  };
}
