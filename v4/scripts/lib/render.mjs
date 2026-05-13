function resolvePath(data, path) {
  const parts = path.split('.');
  let cur = data;
  for (const p of parts) {
    if (cur == null || !(p in cur)) {
      throw new Error(`missing key: ${path}`);
    }
    cur = cur[p];
  }
  return cur;
}

function renderEach(template, data) {
  const eachRe = /\{\{#each\s+([\w.]+)\}\}([\s\S]*?)\{\{\/each\}\}/g;
  return template.replace(eachRe, (_match, listPath, inner) => {
    const list = resolvePath(data, listPath);
    if (!Array.isArray(list)) {
      throw new Error(`{{#each ${listPath}}} target is not an array`);
    }
    return list.map((item, index) => {
      // Provide @index1 (1-based index) as a virtual key on each item
      const itemWithMeta = Object.assign(Object.create(null), item, { '@index1': index + 1 });
      return render(inner, itemWithMeta);
    }).join('');
  });
}

export function render(template, data) {
  let out = renderEach(template, data);
  const simpleRe = /\{\{\s*([\w.@]+)\s*\}\}/g;
  out = out.replace(simpleRe, (_match, path) => {
    // Handle dot-notation access into arrays (e.g. late.table_rows.0.label)
    if (path.includes('.')) {
      return String(resolvePath(data, path));
    }
    // Handle special meta keys like @index1
    if (path.startsWith('@')) {
      if (path in data) return String(data[path]);
      throw new Error(`missing key: ${path}`);
    }
    if (!(path in data)) {
      throw new Error(`missing key: ${path}`);
    }
    return String(data[path]);
  });
  return out;
}
