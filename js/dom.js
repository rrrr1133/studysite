export function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}

export function navigate(route) {
  location.hash = route;
}

export function parseRoute() {
  const hash = location.hash || "#/home";
  const parts = hash.replace(/^#\//, "").split("/").filter(Boolean);
  return { name: parts[0] || "home", params: parts.slice(1) };
}
